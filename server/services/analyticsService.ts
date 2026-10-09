import Database from 'better-sqlite3';
import { db } from '../db/connection.ts';

const CATEGORY_LABELS: Record<string, string> = {
  road_damage: 'Road & Pavement Damage',
  waste_management: 'Waste Management & Sanitation',
  drainage: 'Drainage & Stormwater',
  streetlights: 'Streetlights & Electrical',
  water_supply: 'Water Supply & Pipelines',
  public_safety: 'Public Safety Infrastructure',
};

export class AnalyticsService {
  constructor(private database: Database.Database = db) {}

  public getMunicipalAnalytics() {
    const complaints = this.database.prepare('SELECT * FROM complaints').all() as any[];
    const total = complaints.length;

    const resolved = complaints.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length;
    const inProgress = complaints.filter((c) => c.status === 'In Progress' || c.status === 'Scheduled' || c.status === 'Approved/prioritised').length;
    const acknowledged = complaints.filter((c) => c.status === 'Acknowledged' || c.status === 'Under review').length;
    const submitted = complaints.filter((c) => c.status === 'Submitted' || c.status === 'Pending review').length;
    const rejected = complaints.filter((c) => c.status === 'Rejected').length;

    // Average resolution time in hours
    const resolvedItems = complaints.filter((c) => (c.status === 'Resolved' || c.status === 'Closed') && c.resolved_at);
    let totalResolutionHours = 0;
    resolvedItems.forEach((c) => {
      const start = new Date(c.created_at).getTime();
      const end = new Date(c.resolved_at).getTime();
      totalResolutionHours += Math.max(0, (end - start) / (1000 * 60 * 60));
    });

    const avgResolutionHours =
      resolvedItems.length > 0 ? Math.round((totalResolutionHours / resolvedItems.length) * 10) / 10 : 0;

    // Overdue count based on SLA hours
    const now = Date.now();
    const overdueCount = complaints.filter((c) => {
      if (c.status === 'Resolved' || c.status === 'Closed' || c.status === 'Rejected') return false;
      const hoursOpen = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
      return hoursOpen > (c.sla_hours || 72);
    }).length;

    // Category breakdown
    const categoryCounts: Record<string, { total: number; resolved: number; inProgress: number }> = {};
    Object.keys(CATEGORY_LABELS).forEach((cat) => {
      categoryCounts[cat] = { total: 0, resolved: 0, inProgress: 0 };
    });

    complaints.forEach((c) => {
      if (!categoryCounts[c.category]) {
        categoryCounts[c.category] = { total: 0, resolved: 0, inProgress: 0 };
      }
      categoryCounts[c.category].total += 1;
      if (c.status === 'Resolved' || c.status === 'Closed') categoryCounts[c.category].resolved += 1;
      if (c.status === 'In Progress' || c.status === 'Scheduled') categoryCounts[c.category].inProgress += 1;
    });

    // Locality breakdown
    const localityCounts: Record<string, number> = {};
    complaints.forEach((c) => {
      const loc = c.locality || 'Metro District';
      localityCounts[loc] = (localityCounts[loc] || 0) + 1;
    });

    const topAreas = Object.entries(localityCounts)
      .map(([locality, count]) => ({ locality, count }))
      .sort((a, b) => b.count - a.count);

    // Department performance
    const departments = this.database.prepare('SELECT name FROM departments').all() as { name: string }[];
    const departmentPerformance = departments.map((d) => {
      const deptComplaints = complaints.filter((c) => c.assigned_department === d.name);
      const deptResolved = deptComplaints.filter((c) => c.status === 'Resolved' || c.status === 'Closed').length;
      const deptActive = deptComplaints.filter(
        (c) => c.status === 'In Progress' || c.status === 'Acknowledged' || c.status === 'Submitted' || c.status === 'Stalled'
      ).length;
      const rate = deptComplaints.length > 0 ? Math.round((deptResolved / deptComplaints.length) * 100) : 0;
      return {
        department: d.name,
        total: deptComplaints.length,
        resolved: deptResolved,
        active: deptActive,
        resolutionRate: rate,
      };
    });

    return {
      summary: {
        total,
        resolved,
        inProgress,
        acknowledged,
        submitted,
        rejected,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgResolutionHours,
        overdueCount,
      },
      categories: Object.entries(categoryCounts).map(([cat, stats]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        total: stats.total,
        resolved: stats.resolved,
        inProgress: stats.inProgress,
      })),
      topAreas,
      departmentPerformance,
    };
  }

  public getAccountabilityAnalytics() {
    const escalations = this.database.prepare('SELECT * FROM escalations').all() as any[];
    const complaints = this.database.prepare('SELECT * FROM complaints').all() as any[];

    const stalledCount = complaints.filter((c) => c.status === 'Stalled').length;
    const blockedCount = complaints.filter((c) => c.is_blocked === 1).length;
    const escalatedCount = complaints.filter((c) => c.status === 'Escalated for higher-level review').length;

    const escalationsByLevel = {
      level1: escalations.filter((e) => e.escalation_level === 1).length,
      level2: escalations.filter((e) => e.escalation_level === 2).length,
      level3: escalations.filter((e) => e.escalation_level === 3).length,
    };

    const escalationsByStatus = {
      pendingReview: escalations.filter((e) => e.escalation_status === 'PENDING_REVIEW').length,
      assigned: escalations.filter((e) => e.escalation_status === 'ASSIGNED').length,
      underReview: escalations.filter((e) => e.escalation_status === 'UNDER_REVIEW').length,
      actionRequired: escalations.filter((e) => e.escalation_status === 'ACTION_REQUIRED').length,
      returnedToPanchayat: escalations.filter((e) => e.escalation_status === 'RETURNED_TO_PANCHAYAT').length,
      closed: escalations.filter((e) => e.escalation_status === 'CLOSED').length,
    };

    return {
      stalledComplaints: stalledCount,
      blockedComplaints: blockedCount,
      escalatedComplaints: escalatedCount,
      totalEscalationsRecorded: escalations.length,
      escalationsByLevel,
      escalationsByStatus,
      recentEscalations: escalations.slice(-10).reverse(),
    };
  }
}

export const analyticsService = new AnalyticsService();
