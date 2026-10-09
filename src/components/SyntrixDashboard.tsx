import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  Shield,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  Building,
  ChevronDown,
  Construction,
  Trash2,
  Droplets,
  AlertCircle,
  Lightbulb,
  Waves,
} from 'lucide-react';
import { AnalyticsData, Complaint } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { useAuth } from '../context/AuthContext';

interface Props {
  analytics: AnalyticsData | null;
  recentComplaints: Complaint[];
  onNavigate: (tab: string, ref?: string) => void;
}

export const SyntrixDashboard: React.FC<Props> = ({
  analytics,
  recentComplaints,
  onNavigate,
}) => {
  const { currentUser } = useAuth();
  const [selectedOfficer, setSelectedOfficer] = useState('Director Marcus');
  const [quickDispatchNote, setQuickDispatchNote] = useState('Inspect site & deploy cold mix patch');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  // Quick officer contacts
  const contacts = [
    {
      name: 'Director Marcus',
      role: 'Public Works',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    },
    {
      name: 'Inspector Sarah',
      role: 'Sanitation',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    },
    {
      name: 'Eng. Roberto',
      role: 'Water Board',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    },
    {
      name: 'Aisha Chen',
      role: 'Citizen Lead',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    },
    {
      name: 'David Patel',
      role: 'Citizen Lead',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
  ];

  const handleQuickDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 3000);
  };

  // Helper to render clean SVG category icons without emojis
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'road_damage':
        return <Construction className="w-4 h-4 text-slate-700" />;
      case 'waste_management':
        return <Trash2 className="w-4 h-4 text-slate-700" />;
      case 'water_supply':
        return <Droplets className="w-4 h-4 text-slate-700" />;
      case 'drainage':
        return <Waves className="w-4 h-4 text-slate-700" />;
      case 'streetlights':
        return <Lightbulb className="w-4 h-4 text-slate-700" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-700" />;
    }
  };

  // Micro-bars count: 32 total segments
  const totalBars = 32;
  const filledBars = Math.round((analytics?.summary.resolutionRate || 75) / 100 * totalBars);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome Back, {currentUser?.name?.split(' ')[0] || 'Liam'} !
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Metropolitan Civic Resolution Hub • Real-Time Municipal Triage &amp; Transparency
          </p>
        </div>

        {/* Quick Top Controls (clean flat buttons, zero gradient, zero drop shadow) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('report')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Send Report</span>
          </button>
          <button
            onClick={() => onNavigate('track')}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Track Status
          </button>
          <button
            onClick={() => onNavigate('official-dashboard')}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Workstation
          </button>
        </div>
      </div>

      {/* Main Grid: 2-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Flat Layered Civic Portfolios Card */}
          <div className="syntrix-card p-6 relative overflow-hidden bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Civic Portfolios &amp; Sectors
              </span>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                3 Active Sectors
              </span>
            </div>

            {/* Layered container with clean flat solid cards */}
            <div className="relative pt-2 pb-1">
              {/* Back Card (Solid Indigo Tone) */}
              <div className="absolute top-0 inset-x-4 h-16 rounded-xl bg-slate-800 -translate-y-2 border border-slate-700" />

              {/* Middle Card (Solid Slate Tone) */}
              <div className="absolute top-2 inset-x-2 h-18 rounded-xl bg-slate-700 -translate-y-1 border border-slate-600" />

              {/* Foreground Card */}
              <div className="relative bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Municipal Queue
                    </span>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {analytics ? `${analytics.summary.total} Reported Incidents` : '16 Reported Incidents'}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('report')}
                    className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Add Complaint"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>84% On-Track</span>
                  </div>
                  <span className="text-slate-500 font-medium">
                    {analytics?.summary.resolved || 4} Resolved with Proof
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Sector Switches */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
              <button
                onClick={() => onNavigate('explore')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-center border border-slate-200 transition-colors cursor-pointer"
              >
                Roads (4)
              </button>
              <button
                onClick={() => onNavigate('explore')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-center border border-slate-200 transition-colors cursor-pointer"
              >
                Waste (3)
              </button>
              <button
                onClick={() => onNavigate('explore')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-center border border-slate-200 transition-colors cursor-pointer"
              >
                Water (2)
              </button>
            </div>
          </div>

          {/* 2. Monthly SLA Target Card */}
          <div className="syntrix-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Monthly Resolution Quota
                </span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">
                  92.4% Target Met
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Active cycle: Oct 01 to Oct 31, 2026
            </p>

            {/* Micro-bar segmented progress (flat solid micro-bars, zero gradient) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1 overflow-hidden py-1">
                {Array.from({ length: totalBars }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4.5 w-1.5 rounded-xs transition-colors ${
                      i < filledBars ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Resolved: <strong className="text-slate-900">{analytics?.summary.resolved || 4} Issues</strong></span>
                <span>Target: <strong className="text-slate-900">{analytics?.summary.total || 16} Issues</strong></span>
              </div>
            </div>
          </div>

          {/* 3. Recent Incidents Table */}
          <div className="syntrix-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Recent Civic Resolutions
              </h3>
              <button
                onClick={() => onNavigate('explore')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                See all
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentComplaints.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onNavigate('track', c.reference)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      {renderCategoryIcon(c.category)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-1 max-w-[170px]">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <StatusBadge status={c.status} size="sm" />
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {c.reference}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (7 cols) ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* 4. "Overview" Clean Dual-Line Chart */}
          <div className="syntrix-card p-6 bg-white space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Overview</h3>
                <p className="text-xs text-slate-400">Municipal incident resolution trajectory</p>
              </div>

              {/* Filter Dropdown */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span>Last 30 days</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Custom Clean Legend Pills */}
            <div className="flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span className="text-slate-500">Current Cycle:</span>
                <strong className="text-slate-900">{analytics?.summary.total || 16} Reports</strong>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-500">Prior Cycle:</span>
                <strong className="text-slate-900">24 Reports</strong>
              </div>
            </div>

            {/* Clean Wave Chart SVG (zero gradient fill, crisp stroke) */}
            <div className="relative h-60 w-full pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeDasharray="3 3" />
                <line x1="0" y1="190" x2="600" y2="190" stroke="#e2e8f0" />

                {/* Curve 2: Prior Cycle (Solid Amber line) */}
                <path
                  d="M 0 160 C 60 140, 120 170, 180 130 C 240 90, 300 115, 360 80 C 420 45, 480 130, 540 100 L 600 120"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Curve 1: Current Cycle (Solid Indigo line) */}
                <path
                  d="M 0 140 C 60 110, 120 145, 180 100 C 240 55, 300 150, 360 60 C 420 30, 480 90, 540 70 L 600 50"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Peak Points */}
                <circle cx="360" cy="60" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                <circle cx="360" cy="80" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
              </svg>

              {/* Month X-Axis Labels */}
              <div className="flex justify-between text-[10px] text-slate-400 pt-2 font-mono">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>
          </div>

          {/* 5. Quick Officer Dispatch */}
          <div className="syntrix-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Quick Officer Dispatch &amp; Leads
              </h3>
              <button
                onClick={() => onNavigate('official-dashboard')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                See All Contacts
              </button>
            </div>

            {/* Circular Contacts Row */}
            <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar">
              <button
                onClick={() => onNavigate('official-dashboard')}
                className="w-11 h-11 rounded-full border border-dashed border-slate-300 hover:border-indigo-600 text-slate-400 hover:text-indigo-600 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                title="Add Dispatch Assignment"
              >
                <Plus className="w-4 h-4" />
              </button>

              {contacts.map((contact, idx) => {
                const isSelected = selectedOfficer === contact.name;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedOfficer(contact.name)}
                    className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none cursor-pointer"
                  >
                    <div
                      className={`relative w-11 h-11 rounded-full p-0.5 transition-all ${
                        isSelected
                          ? 'ring-2 ring-indigo-600 ring-offset-2'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[64px]">
                      {contact.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Dispatch Input & Action Button (solid flat button, zero gradient, zero drop shadow) */}
            <form onSubmit={handleQuickDispatch} className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={quickDispatchNote}
                  onChange={(e) => setQuickDispatchNote(e.target.value)}
                  placeholder="Enter work order instructions..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>

            {dispatchSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Dispatch directive transmitted to {selectedOfficer}.</span>
              </div>
            )}
          </div>

          {/* 6. Incident Velocity Pillars */}
          <div className="syntrix-card p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Civic Resolution Velocity
                </h3>
                <p className="text-xs text-slate-400">Weekly report intake vs completed work orders</p>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1">
                <span>Last 30 days</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>

            {/* High/Low pill summary */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <div>
                <span className="text-slate-400 text-[11px]">Intake: </span>
                <strong className="text-slate-900">16 Incidents</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Resolved: </span>
                <strong className="text-indigo-600">12 Closures</strong>
              </div>
            </div>

            {/* Clean Flat Pillar Bars without gradients or glow */}
            <div className="flex items-end justify-between gap-2 h-28 pt-4">
              {[
                { label: 'Oct 02', h: 40, active: false },
                { label: 'Oct 03', h: 55, active: false },
                { label: 'Oct 04', h: 30, active: false },
                { label: 'Oct 05', h: 70, active: false },
                { label: 'Oct 06', h: 45, active: false },
                { label: 'Oct 07', h: 95, active: true },
                { label: 'Oct 08', h: 60, active: false },
                { label: 'Oct 09', h: 35, active: false },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  {bar.active && (
                    <div className="text-[9px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded-sm">
                      Peak
                    </div>
                  )}
                  <div
                    style={{ height: `${bar.h}%` }}
                    className={`w-full max-w-[28px] rounded-t-md transition-colors ${
                      bar.active
                        ? 'bg-indigo-600'
                        : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 font-mono">
                    {bar.label.split(' ')[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
