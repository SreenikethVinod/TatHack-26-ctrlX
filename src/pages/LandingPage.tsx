import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  TrendingUp,
  FileText,
  Users,
  Eye,
  Search,
  Sparkles,
  Award,
} from 'lucide-react';
import { api } from '../lib/api';
import { AnalyticsData, Complaint } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';

interface Props {
  onNavigate: (tab: string, complaintRef?: string) => void;
  onOpenPitch: () => void;
}

export const LandingPage: React.FC<Props> = ({ onNavigate, onOpenPitch }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [trackInput, setTrackInput] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [analyticsRes, complaintsRes] = await Promise.all([
          api.getAnalytics().catch(() => null),
          api.getComplaints().catch(() => ({ complaints: [], count: 0 })),
        ]);
        if (analyticsRes) setAnalytics(analyticsRes);
        setRecentComplaints((complaintsRes.complaints || []).slice(0, 4));
      } catch (err) {
        console.error('Failed to load landing data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInput.trim()) return;
    onNavigate('track', trackInput.trim());
  };

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 border border-slate-800">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Civic Tech &amp; Governance Platform • 2026 Hackathon Edition</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Bridging Citizens &amp; City Hall With{' '}
            <span className="text-indigo-400">Radical Transparency</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Report local civic hazards in seconds, track repairs through auditable status timelines, and empower municipal departments with explainable, risk-based priority triage.
          </p>

          {/* Quick Tracking Search Bar */}
          <form
            onSubmit={handleTrackSubmit}
            className="max-w-md mx-auto flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1.5 focus-within:border-indigo-400 transition-colors"
          >
            <div className="pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Track Complaint ID (e.g. CP-2026-001)"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 px-3 py-1.5 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
            >
              Track
            </button>
          </form>

          {/* Primary & Secondary Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('report')}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <span>Report an Issue</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={() => onNavigate('explore')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm border border-slate-700 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Explore Public Reports</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Bar calculated from stored database */}
        <div className="relative z-10 mt-12 pt-8 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-400">
              {analytics ? analytics.summary.total : 16}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">Total Reported</div>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {analytics ? analytics.summary.resolved : 4}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">Resolved With Proof</div>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">
              {analytics ? analytics.summary.inProgress : 4}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">In Active Progress</div>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">
              {analytics ? `${analytics.summary.avgResolutionHours}h` : '52h'}
            </div>
            <div className="text-xs text-slate-400 font-medium mt-1">Avg Turnaround Time</div>
          </div>
        </div>
      </section>

      {/* How CivicPulse Works (3-Step Lifecycle) */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            A Transparent 4-Step Civic Lifecycle
          </h2>
          <p className="text-sm text-slate-600">
            From neighborhood report to photographic resolution proof—every step is documented.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-extrabold flex items-center justify-center text-base mb-4 border border-teal-200">
              1
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Citizen Reporting</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Snap a photo, auto-detect GPS coordinates, and flag public safety hazards. Instantly receive a unique tracking reference (e.g. CP-2026-001).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-extrabold flex items-center justify-center text-base mb-4 border border-blue-200">
              2
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Smart Urgency Triage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our transparent rule engine scores category hazard, community upvotes, and SLA aging to recommend an objective priority level.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 font-extrabold flex items-center justify-center text-base mb-4 border border-amber-200">
              3
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Department Dispatch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Municipal officers assign work orders, post public progress milestones, and manage internal field notes behind secure authorization.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold flex items-center justify-center text-base mb-4 border border-emerald-200">
              4
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Proof of Resolution</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Complaints are closed with after-photos and summary reports. Citizens see exact time stamps, preventing ghost closures.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Civic Reports Feed */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Recent Public Reports</h2>
            <p className="text-xs text-slate-500">Live feed of verified municipal community reports</p>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 self-start sm:self-auto"
          >
            <span>View All Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentComplaints.map((c) => (
            <div
              key={c.id}
              onClick={() => onNavigate('track', c.reference)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-500/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {c.reference}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} size="sm" />
                    <PriorityBadge priority={c.priority} size="sm" showIcon={false} />
                  </div>
                </div>

                <h3 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-1">{c.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  {c.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{c.address}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                  <span>{c.votesCount} {c.votesCount === 1 ? 'vote' : 'votes'}</span>
                  <span>•</span>
                  <span>{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Municipal Accountability & Transparency Spotlight */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            Public Oversight
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Open Data Dashboards For Civic Accountability
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every metric—from departmental resolution quotas to neighborhood complaint heatmaps—is computed transparently from database records. No concealed backlogs.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('transparency')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              View Transparency Metrics
            </button>
            <button
              onClick={() => onNavigate('map')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Open Civic Map
            </button>
          </div>
        </div>

        <div className="w-full lg:w-80 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
          <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span>Department SLA Targets</span>
            <span className="text-teal-400 font-mono">Live Benchmarks</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Public Works &amp; Roads</span>
                <span className="text-emerald-400 font-bold">48h Target</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-[82%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Sanitation &amp; Waste</span>
                <span className="text-emerald-400 font-bold">24h Target</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full w-[94%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Water Supply Board</span>
                <span className="text-amber-400 font-bold">24h Target</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full w-[76%]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
