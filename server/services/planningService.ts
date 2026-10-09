import Database from 'better-sqlite3';
import { db } from '../db/connection.ts';

export interface PlanningParams {
  budgetLimit: number;
  crewCount: number;
  hoursPerCrew: number;
  department?: string;
  category?: string;
  createdByUserId?: string;
}

export interface PlanItemResult {
  complaintId: string;
  reference: string;
  title: string;
  category: string;
  priority: string;
  priorityScore: number;
  estimatedCost: number;
  estimatedHours: number;
  assignedCrew?: string;
  status: 'selected' | 'deferred';
  deferralReason?: string;
}

export interface MaintenancePlanResult {
  planId: string;
  createdAt: string;
  budgetLimit: number;
  crewCount: number;
  totalCapacityHours: number;
  totalCost: number;
  totalHoursUsed: number;
  budgetUtilizationPct: number;
  capacityUtilizationPct: number;
  selectedCount: number;
  deferredCount: number;
  selectedItems: PlanItemResult[];
  deferredItems: PlanItemResult[];
  baselineComparison: {
    strategy: 'FIFO (First-Reported First-Served)';
    fifoSelectedCount: number;
    fifoTotalCost: number;
    fifoAveragePriority: number;
    heuristicAveragePriority: number;
    priorityImprovementPct: number;
  };
}

const CATEGORY_RESOURCE_PROFILE: Record<string, { baseCost: number; baseHours: number }> = {
  water_supply: { baseCost: 2800, baseHours: 24 },
  road_damage: { baseCost: 2000, baseHours: 18 },
  drainage: { baseCost: 1500, baseHours: 14 },
  public_safety: { baseCost: 1200, baseHours: 10 },
  waste_management: { baseCost: 650, baseHours: 6 },
  streetlights: { baseCost: 450, baseHours: 4 },
};

const PRIORITY_MULTIPLIERS: Record<string, number> = {
  Critical: 1.3,
  High: 1.1,
  Medium: 1.0,
  Low: 0.8,
};

export class PlanningService {
  constructor(private database: Database.Database = db) {}

  public estimateResources(complaint: any): { cost: number; hours: number } {
    const profile = CATEGORY_RESOURCE_PROFILE[complaint.category] || { baseCost: 1000, baseHours: 10 };
    const mult = PRIORITY_MULTIPLIERS[complaint.priority] || 1.0;
    const cost = Math.round(profile.baseCost * mult);
    const hours = Math.round(profile.baseHours * mult * 10) / 10;
    return { cost, hours };
  }

  public generatePlan(params: PlanningParams): MaintenancePlanResult {
    const budgetLimit = Math.max(1000, params.budgetLimit);
    const crewCount = Math.max(1, params.crewCount);
    const hoursPerCrew = Math.max(10, params.hoursPerCrew);
    const totalCapacityHours = crewCount * hoursPerCrew;

    let query = `
      SELECT * FROM complaints
      WHERE status IN ('Acknowledged', 'In Progress', 'Approved/prioritised', 'Scheduled', 'Stalled')
    `;
    const queryParams: any[] = [];

    if (params.department && params.department !== 'all') {
      query += ' AND assigned_department = ?';
      queryParams.push(params.department);
    }
    if (params.category && params.category !== 'all') {
      query += ' AND category = ?';
      queryParams.push(params.category);
    }

    const rawCandidates = this.database.prepare(query).all(...queryParams) as any[];

    // Calculate cost and hours for candidates
    const candidates = rawCandidates.map((c) => {
      const { cost, hours } = this.estimateResources(c);
      const score = c.priority_score || 50;
      return {
        ...c,
        estimatedCost: cost,
        estimatedHours: hours,
        priorityScore: score,
        costEfficiency: score / cost,
      };
    });

    // 1. Deterministic Greedy Heuristic: Sort by priorityScore desc, then costEfficiency desc
    const sortedForGreedy = [...candidates].sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return b.costEfficiency - a.costEfficiency;
    });

    let remBudget = budgetLimit;
    let remHours = totalCapacityHours;
    let totalCost = 0;
    let totalHours = 0;

    const selectedItems: PlanItemResult[] = [];
    const deferredItems: PlanItemResult[] = [];

    let crewIdx = 0;

    for (const item of sortedForGreedy) {
      if (item.estimatedCost <= remBudget && item.estimatedHours <= remHours) {
        crewIdx = (crewIdx % crewCount) + 1;
        selectedItems.push({
          complaintId: item.id,
          reference: item.reference,
          title: item.title,
          category: item.category,
          priority: item.priority,
          priorityScore: item.priorityScore,
          estimatedCost: item.estimatedCost,
          estimatedHours: item.estimatedHours,
          assignedCrew: `Maintenance Crew #${crewIdx}`,
          status: 'selected',
        });
        remBudget -= item.estimatedCost;
        remHours -= item.estimatedHours;
        totalCost += item.estimatedCost;
        totalHours += item.estimatedHours;
      } else {
        let reason = '';
        if (item.estimatedCost > remBudget && item.estimatedHours > remHours) {
          reason = `Exceeds both remaining budget ($${remBudget} left) and crew capacity (${remHours.toFixed(1)}h left).`;
        } else if (item.estimatedCost > remBudget) {
          reason = `Budget constraint: Requires $${item.estimatedCost}, but only $${remBudget} remaining in allocation.`;
        } else {
          reason = `Capacity constraint: Requires ${item.estimatedHours}h, but only ${remHours.toFixed(1)}h remaining across ${crewCount} crews.`;
        }

        deferredItems.push({
          complaintId: item.id,
          reference: item.reference,
          title: item.title,
          category: item.category,
          priority: item.priority,
          priorityScore: item.priorityScore,
          estimatedCost: item.estimatedCost,
          estimatedHours: item.estimatedHours,
          status: 'deferred',
          deferralReason: reason,
        });
      }
    }

    // 2. Baseline Comparison: First-Reported First-Served (FIFO)
    const sortedForFifo = [...candidates].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let fifoRemBudget = budgetLimit;
    let fifoRemHours = totalCapacityHours;
    let fifoTotalCost = 0;
    let fifoSelectedCount = 0;
    let fifoTotalPriority = 0;

    for (const item of sortedForFifo) {
      if (item.estimatedCost <= fifoRemBudget && item.estimatedHours <= fifoRemHours) {
        fifoRemBudget -= item.estimatedCost;
        fifoRemHours -= item.estimatedHours;
        fifoTotalCost += item.estimatedCost;
        fifoSelectedCount++;
        fifoTotalPriority += item.priorityScore;
      }
    }

    const fifoAvgPriority = fifoSelectedCount > 0 ? Math.round((fifoTotalPriority / fifoSelectedCount) * 10) / 10 : 0;
    const greedyTotalPriority = selectedItems.reduce((acc, i) => acc + i.priorityScore, 0);
    const greedyAvgPriority = selectedItems.length > 0 ? Math.round((greedyTotalPriority / selectedItems.length) * 10) / 10 : 0;
    const priorityDiff = fifoAvgPriority > 0 ? Math.round(((greedyAvgPriority - fifoAvgPriority) / fifoAvgPriority) * 100) : 0;

    const planId = `plan-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Persist plan in SQL
    const tx = this.database.transaction(() => {
      this.database
        .prepare(
          `INSERT INTO maintenance_plans (
            id, created_by, budget_limit, crew_limit, hours_limit, total_cost,
            total_hours_used, crew_allocated, heuristic_used, comparison_fifo_cost,
            comparison_fifo_issues, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          planId,
          params.createdByUserId || 'user-official-2',
          budgetLimit,
          crewCount,
          totalCapacityHours,
          totalCost,
          totalHours,
          crewCount,
          'Priority-Greedy-Knapsack',
          fifoTotalCost,
          fifoSelectedCount,
          now
        );

      const insertItem = this.database.prepare(`
        INSERT INTO maintenance_plan_items (
          id, plan_id, complaint_id, priority_score, estimated_cost,
          estimated_hours, assigned_crew, status, deferral_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const s of selectedItems) {
        const itemId = `pi-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        insertItem.run(
          itemId,
          planId,
          s.complaintId,
          s.priorityScore,
          s.estimatedCost,
          s.estimatedHours,
          s.assignedCrew || null,
          'selected',
          null
        );
      }

      for (const d of deferredItems) {
        const itemId = `pi-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        insertItem.run(
          itemId,
          planId,
          d.complaintId,
          d.priorityScore,
          d.estimatedCost,
          d.estimatedHours,
          null,
          'deferred',
          d.deferralReason || null
        );
      }
    });

    tx();

    return {
      planId,
      createdAt: now,
      budgetLimit,
      crewCount,
      totalCapacityHours,
      totalCost,
      totalHoursUsed: Math.round(totalHours * 10) / 10,
      budgetUtilizationPct: Math.round((totalCost / budgetLimit) * 1000) / 10,
      capacityUtilizationPct: Math.round((totalHours / totalCapacityHours) * 1000) / 10,
      selectedCount: selectedItems.length,
      deferredCount: deferredItems.length,
      selectedItems,
      deferredItems,
      baselineComparison: {
        strategy: 'FIFO (First-Reported First-Served)',
        fifoSelectedCount,
        fifoTotalCost,
        fifoAveragePriority: fifoAvgPriority,
        heuristicAveragePriority: greedyAvgPriority,
        priorityImprovementPct: priorityDiff,
      },
    };
  }

  public getPlanById(planId: string) {
    const plan = this.database
      .prepare('SELECT * FROM maintenance_plans WHERE id = ?')
      .get(planId) as any;

    if (!plan) return null;

    const items = this.database
      .prepare(
        `SELECT pi.*, c.reference, c.title, c.category, c.priority
         FROM maintenance_plan_items pi
         JOIN complaints c ON pi.complaint_id = c.id
         WHERE pi.plan_id = ?`
      )
      .all(planId) as any[];

    return {
      plan,
      items,
    };
  }
}

export const planningService = new PlanningService();
