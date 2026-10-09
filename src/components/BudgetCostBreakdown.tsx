import React, { useState } from 'react';
import {
  IndianRupee,
  TrendingUp,
  PieChart,
  HardHat,
  CheckCircle2,
  Clock,
  Ban,
  Building,
  Layers,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { Complaint } from '../types';

interface BudgetCostBreakdownProps {
  complaints: Complaint[];
  role?: 'municipality' | 'district';
  title?: string;
  subtitle?: string;
}

export const CATEGORY_META: Record<string, { label: string; baseCost: number }> = {
  road_damage: { label: 'Roads & Pavement', baseCost: 2000 },
  waste_management: { label: 'Sanitation & Waste', baseCost: 650 },
  drainage: { label: 'Drainage & Stormwater', baseCost: 1500 },
  streetlights: { label: 'Streetlights & Electrical', baseCost: 450 },
  water_supply: { label: 'Water Supply & Pipelines', baseCost: 2800 },
  public_safety: { label: 'Public Safety Infrastructure', baseCost: 1200 },
  other: { label: 'Other Civic Works', baseCost: 1000 },
};

const PRIORITY_FACTORS: Record<string, number> = {
  Critical: 1.3,
  High: 1.1,
  Medium: 1.0,
  Low: 0.8,
};

export const STANDARD_DEPARTMENTS = [
  'Public Works & Roads',
  'Sanitation & Waste Management',
  'Drainage & Flood Control',
  'Electrical & Street Lighting',
  'Water Supply & Sanitation Board',
  'Public Safety & Urban Infrastructure',
  'General Municipal Administration & Public Services',
];

export function calculateEstimatedCost(category: string, priority: string): number {
  const base = CATEGORY_META[category]?.baseCost || 1000;
  const factor = PRIORITY_FACTORS[priority] || 1.0;
  return Math.round(base * factor);
}

export const BudgetCostBreakdown: React.FC<BudgetCostBreakdownProps> = ({
  complaints,
  role = 'municipality',
  title = 'Municipal Budget & Repair Cost Breakdown',
  subtitle = 'Comprehensive financial accounting of approved repair budgets, estimated unit costs, and department allocations.',
}) => {
  const [activeTab, setActiveTab] = useState<'department' | 'category' | 'lifecycle'>('department');

  // Overall calculations
  let totalApprovedBudget = 0;
  let totalEstimatedCost = 0;
  let resolvedSpentBudget = 0;
  let inProgressCommittedBudget = 0;
  let districtEmergencyBudget = 0;
  let rejectedEstimatedSavings = 0;
  let budgetedReportsCount = 0;

  complaints.forEach((c) => {
    const budgetVal = Number(c.budget) || 0;
    const estCost = calculateEstimatedCost(c.category, c.priority);

    totalApprovedBudget += budgetVal;
    totalEstimatedCost += estCost;

    if (budgetVal > 0) {
      budgetedReportsCount += 1;
    }

    if (c.status === 'Resolved') {
      resolvedSpentBudget += budgetVal > 0 ? budgetVal : estCost;
    } else if (c.status === 'In Progress') {
      inProgressCommittedBudget += budgetVal > 0 ? budgetVal : estCost;
    } else if (c.status === 'Rejected') {
      rejectedEstimatedSavings += estCost;
    }

    if (c.isEscalatedDistrict || c.districtActionNotes || (c.daysUnacknowledged && c.daysUnacknowledged >= 14)) {
      if (budgetVal > 0) {
        districtEmergencyBudget += budgetVal;
      }
    }
  });

  const avgBudgetPerWorkOrder =
    budgetedReportsCount > 0 ? Math.round(totalApprovedBudget / budgetedReportsCount) : 0;
  const avgEstimatedCost =
    complaints.length > 0 ? Math.round(totalEstimatedCost / complaints.length) : 0;
  const budgetVariance = totalApprovedBudget - totalEstimatedCost;

  // Department Breakdown
  const deptList = Array.from(
    new Set([
      ...STANDARD_DEPARTMENTS,
      ...complaints.map((c) => c.assignedDepartment).filter(Boolean),
    ])
  );

  const deptMetrics = deptList.map((dept) => {
    const deptComplaints = complaints.filter((c) => c.assignedDepartment === dept);
    const approvedBudget = deptComplaints.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);
    const estimatedCost = deptComplaints.reduce(
      (acc, c) => acc + calculateEstimatedCost(c.category, c.priority),
      0
    );
    const resolvedCount = deptComplaints.filter((c) => c.status === 'Resolved').length;
    const inProgressCount = deptComplaints.filter((c) => c.status === 'In Progress').length;
    const rejectedCount = deptComplaints.filter((c) => c.status === 'Rejected').length;
    const budgetShare =
      totalApprovedBudget > 0 ? Math.round((approvedBudget / totalApprovedBudget) * 100) : 0;

    return {
      department: dept,
      totalCount: deptComplaints.length,
      approvedBudget,
      estimatedCost,
      resolvedCount,
      inProgressCount,
      rejectedCount,
      budgetShare,
      avgCostPerIssue:
        deptComplaints.length > 0 ? Math.round(estimatedCost / deptComplaints.length) : 0,
    };
  });

  // Category Breakdown
  const categoryKeys = Object.keys(CATEGORY_META);
  const categoryMetrics = categoryKeys.map((catKey) => {
    const catComplaints = complaints.filter((c) => c.category === catKey);
    const approvedBudget = catComplaints.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);
    const estimatedCost = catComplaints.reduce(
      (acc, c) => acc + calculateEstimatedCost(c.category, c.priority),
      0
    );
    const shareOfBudget =
      totalApprovedBudget > 0 ? Math.round((approvedBudget / totalApprovedBudget) * 100) : 0;

    return {
      category: catKey,
      label: CATEGORY_META[catKey]?.label || catKey,
      totalCount: catComplaints.length,
      approvedBudget,
      estimatedCost,
      shareOfBudget,
      resolvedCount: catComplaints.filter((c) => c.status === 'Resolved').length,
      inProgressCount: catComplaints.filter((c) => c.status === 'In Progress').length,
    };
  });

  return (
    <div className="syntrix-card bg-white p-6 border border-slate-200 rounded-2xl space-y-6 shadow-2xs">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg text-white ${
                role === 'district' ? 'bg-purple-700' : 'bg-indigo-600'
              }`}
            >
              <IndianRupee className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Internal Governance Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('department')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'department'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Department
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('category')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'category'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Category
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lifecycle')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'lifecycle'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lifecycle Commitment
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Approved Budget */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Approved Repair Budget</span>
            <IndianRupee className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ₹{totalApprovedBudget.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Across {budgetedReportsCount} budgeted work orders
          </div>
        </div>

        {/* Estimated Total Cost */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Estimated Total Cost</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            ₹{totalEstimatedCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Benchmark unit costs (avg ₹{avgEstimatedCost}/issue)
          </div>
        </div>

        {/* Disbursed & In Progress */}
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Disbursed &amp; Committed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
            ₹{(resolvedSpentBudget + inProgressCommittedBudget).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium font-mono">
            ₹{resolvedSpentBudget.toLocaleString()} spent • ₹{inProgressCommittedBudget.toLocaleString()} in field
          </div>
        </div>

        {/* Saved from Fake / Rejected OR Emergency Funds */}
        {role === 'district' ? (
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1">
            <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
              <span>District Emergency Funds</span>
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-900 font-mono">
              ₹{districtEmergencyBudget.toLocaleString()}
            </div>
            <div className="text-[10px] text-purple-700 font-medium">
              Sanctioned under Collectorate orders
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1">
            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
              <span>Savings from Rejected Reports</span>
              <Ban className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-900 font-mono">
              ₹{rejectedEstimatedSavings.toLocaleString()}
            </div>
            <div className="text-[10px] text-rose-700 font-medium">
              Avoided expenditure on invalid/fake claims
            </div>
          </div>
        )}
      </div>

      {/* TAB CONTENT 1: DEPARTMENT BREAKDOWN */}
      {activeTab === 'department' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Departmental Allocation &amp; Cost Variance</span>
            <span>Total Departments: {deptMetrics.length}</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">Department</th>
                  <th className="py-2.5 px-3 text-center">Reports</th>
                  <th className="py-2.5 px-3 text-right">Approved Budget</th>
                  <th className="py-2.5 px-3 text-right">Estimated Cost</th>
                  <th className="py-2.5 px-3 text-center">Budget Share</th>
                  <th className="py-2.5 px-3 text-right">Avg Cost / Issue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptMetrics.map((d) => {
                  const variance = d.approvedBudget - d.estimatedCost;
                  return (
                    <tr key={d.department} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        {d.department}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">
                        {d.totalCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-700 font-mono">
                        ₹{d.approvedBudget.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                        ₹{d.estimatedCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, d.budgetShare)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700 w-8 text-right">
                            {d.budgetShare}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                        ₹{d.avgCostPerIssue.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: CATEGORY BREAKDOWN */}
      {activeTab === 'category' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Civic Category Expenditure &amp; Engineering Cost Estimates</span>
            <span>Total Categories: {categoryMetrics.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryMetrics.map((c) => (
              <div
                key={c.category}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">{c.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                    {c.totalCount} Reports
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Approved Budget:</span>
                    <strong className="text-indigo-700 font-mono">
                      ₹{c.approvedBudget.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Estimated Repair Cost:</span>
                    <strong className="text-slate-800 font-mono">
                      ₹{c.estimatedCost.toLocaleString()}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Share of Total Budget:</span>
                    <strong className="text-slate-700">{c.shareOfBudget}%</strong>
                  </div>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, c.shareOfBudget)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: LIFECYCLE COMMITMENT */}
      {activeTab === 'lifecycle' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 uppercase text-[11px]">
                Disbursed Funds (Resolved)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 font-mono">
              ₹{resolvedSpentBudget.toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Disbursed for officially verified and closed complaints with photographic resolution proof.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 uppercase text-[11px]">
                Active Work In Progress
              </span>
              <HardHat className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-950 font-mono">
              ₹{inProgressCommittedBudget.toLocaleString()}
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Allocated to field workers and contractors currently carrying out scheduled repairs.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-900 uppercase text-[11px]">
                Funds Protected (Rejected Claims)
              </span>
              <Ban className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-950 font-mono">
              ₹{rejectedEstimatedSavings.toLocaleString()}
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Estimated municipal funds saved by rejecting duplicate, out-of-jurisdiction, or false reports.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
