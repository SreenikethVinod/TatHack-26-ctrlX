import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Building,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { AnalyticsData } from '../types';
import { useAnimatedCounter } from '../lib/useAnimatedCounter';

export const TransparencyPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  // Animated counters (must be called unconditionally before early return)
  const animatedTotal = useAnimatedCounter(data?.summary?.total ?? 0);
  const animatedResolved = useAnimatedCounter(data?.summary?.resolved ?? 0);
  const animatedInProgress = useAnimatedCounter(data?.summary?.inProgress ?? 0);
  const animatedAvgHours = useAnimatedCounter(data?.summary?.avgResolutionHours ?? 0);

  if (loading || !data) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Calculating live governance metrics from verified municipal database records...</p>
      </div>
    );
  }

  const { summary, categories, topAreas, departmentPerformance } = data;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Open Data &amp; Municipal Governance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Public Transparency &amp; Service Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Objective performance benchmarks calculated directly from citizen complaints, department work orders, and photographic resolution records.
        </p>
      </div>

      {/* Live Governance Benchmark Notice */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>Live Municipal Ledger:</strong> All metrics, resolution rates, and SLA benchmarks are computed in real time from verified database records.
        </span>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="syntrix-card p-5 bg-white stat-card-hover animate-fade-slide-in">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Reports</span>
            <BarChart3 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 animate-count-up">{animatedTotal}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.submitted} newly submitted
          </div>
        </div>

        <div className="syntrix-card p-5 bg-white stat-card-hover animate-fade-slide-in">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 animate-count-up">{animatedResolved}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {summary.resolutionRate}% closure rate
          </div>
        </div>

        <div className="syntrix-card p-5 bg-white stat-card-hover animate-fade-slide-in">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Active Repairs</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 animate-count-up">{animatedInProgress}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.acknowledged} acknowledged
          </div>
        </div>

        <div className="syntrix-card p-5 bg-white stat-card-hover animate-fade-slide-in">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Turnaround</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 animate-count-up">{animatedAvgHours}h</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across verified closures
          </div>
        </div>
      </div>

      {/* Category Breakdown & Locality Heatmaps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Bar Chart (7 cols) */}
        <div className="lg:col-span-7 syntrix-card p-6 bg-white space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Complaints by Civic Category</h3>
              <p className="text-xs text-slate-500">Distribution across municipal service sectors</p>
            </div>
            <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              6 Sectors
            </span>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => {
              const pct = summary.total > 0 ? Math.round((cat.total / summary.total) * 100) : 0;
              return (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{cat.label}</span>
                    <span className="text-slate-500 font-mono">
                      {cat.total} reports ({pct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${(cat.resolved / (cat.total || 1)) * 100}%` }}
                      className="bg-emerald-500 h-full"
                      title={`${cat.resolved} resolved`}
                    />
                    <div
                      style={{ width: `${(cat.inProgress / (cat.total || 1)) * 100}%` }}
                      className="bg-amber-400 h-full"
                      title={`${cat.inProgress} in progress`}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="text-emerald-700 font-medium">{cat.resolved} resolved</span>
                    <span>•</span>
                    <span className="text-amber-700 font-medium">{cat.inProgress} in progress</span>
                    <span>•</span>
                    <span>{cat.total - cat.resolved - cat.inProgress} pending</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highest Incident Localities (5 cols) */}
        <div className="lg:col-span-5 syntrix-card p-6 bg-white space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">High-Volume Localities</h3>
            <p className="text-xs text-slate-500">Neighborhoods with highest report densities</p>
          </div>

          <div className="space-y-3">
            {topAreas.map((area, idx) => (
              <div
                key={area.locality}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900">{area.locality}</span>
                    <div className="text-[10px] text-slate-400">Metro Sub-District</div>
                  </div>
                </div>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {area.count} Issues
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department-Level Performance Table */}
      <div className="syntrix-card p-6 bg-white overflow-hidden space-y-2">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Department Performance &amp; SLA Compliance</h3>
            <p className="text-xs text-slate-500">Municipal department resolution turnaround analysis</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-bold">
            Public Benchmark
          </span>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-2">Municipal Department</th>
                <th className="py-3 px-2 text-center">Assigned Incidents</th>
                <th className="py-3 px-2 text-center">Resolved</th>
                <th className="py-3 px-2 text-center">Active Work Orders</th>
                <th className="py-3 px-2 text-right">Resolution Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {departmentPerformance.map((dept) => (
                <tr key={dept.department} className="hover:bg-slate-50">
                  <td className="py-3.5 px-2 font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{dept.department}</span>
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono">{dept.total}</td>
                  <td className="py-3.5 px-2 text-center font-mono text-emerald-600 font-bold">
                    {dept.resolved}
                  </td>
                  <td className="py-3.5 px-2 text-center font-mono text-amber-600 font-bold">
                    {dept.active}
                  </td>
                  <td className="py-3.5 px-2 text-right font-mono font-bold">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        dept.resolutionRate >= 70
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : dept.resolutionRate >= 40
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {dept.resolutionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
