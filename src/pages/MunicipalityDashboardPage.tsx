import React, { useEffect, useState } from 'react';
import {
  Building,
  CheckCircle2,
  Clock,
  HardHat,
  IndianRupee,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Check,
  Send,
  Calendar,
  MapPin,
  FileText,
  ShieldAlert,
  ArrowRight,
  X,
  Sparkles,
  Zap,
  Ban,
  XCircle,
  TrendingUp,
  BarChart3,
  PieChart,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint, ComplaintHistoryEntry, OfficialNote } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { PhotoVerificationBadge } from '../components/PhotoVerificationBadge';
import { BudgetCostBreakdown } from '../components/BudgetCostBreakdown';
import { useAuth } from '../context/AuthContext';

export const MunicipalityDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'queue' | 'budget' | 'operations'>('queue');
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'acknowledged' | 'in_progress' | 'resolved' | 'rejected' | 'escalated'>('all');
  const [search, setSearch] = useState('');

  // Selected complaint for drawer/review
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintHistoryEntry[]>([]);
  const [notes, setNotes] = useState<OfficialNote[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Acknowledge modal/action
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [ackNotes, setAckNotes] = useState('Reviewed by Municipal Triage Desk. Field inspection scheduled.');
  const [ackSubmitting, setAckSubmitting] = useState(false);

  // Assign task & budget modal/action
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignWorker, setAssignWorker] = useState('');
  const [assignBudget, setAssignBudget] = useState<string>('2500');
  const [assignNotes, setAssignNotes] = useState('Execute pothole resurfacing and bitumen sealing within standard SLA.');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Mark Resolved modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolutionSummary, setResolutionSummary] = useState('Repairs completed by assigned contractor team.');
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  // Reject modal/action
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Duplicate or invalid submission; verified by municipal field inspector.');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Feedback notifications
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getComplaints();
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const openComplaintReview = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setDetailLoading(true);
    try {
      const res = await api.getComplaint(complaint.id);
      setSelectedComplaint(res.complaint);
      setHistory(res.history || []);
      setNotes(res.notes || []);
    } catch (err) {
      console.error('Failed to load details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedComplaint) return;
    setAckSubmitting(true);
    try {
      const res = await api.acknowledgeComplaint(selectedComplaint.id, ackNotes);
      setSuccessToast(res.message);
      setAckModalOpen(false);
      await fetchComplaints();
      await openComplaintReview(res.complaint);
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to acknowledge report.');
    } finally {
      setAckSubmitting(false);
    }
  };

  const handleAssignWorkerAndBudget = async () => {
    if (!selectedComplaint) return;
    if (!assignWorker.trim()) {
      setErrorToast('Please enter the name of the assigned worker or crew.');
      return;
    }
    const numBudget = Number(assignBudget);
    if (isNaN(numBudget) || numBudget < 0) {
      setErrorToast('Please specify a valid repair budget amount.');
      return;
    }

    setAssignSubmitting(true);
    try {
      const res = await api.assignWorkerAndBudget(
        selectedComplaint.id,
        assignWorker.trim(),
        numBudget,
        assignNotes.trim()
      );
      setSuccessToast(res.message);
      setAssignModalOpen(false);
      await fetchComplaints();
      await openComplaintReview(res.complaint);
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to assign worker and budget.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;
    setResolveSubmitting(true);
    try {
      await api.updateStatus(selectedComplaint.id, {
        status: 'Resolved',
        resolutionSummary: resolutionSummary.trim(),
        publicUpdate: `Issue verified and resolved. Summary: ${resolutionSummary.trim()}`,
      });
      setSuccessToast(`Report ${selectedComplaint.reference} marked as Resolved!`);
      setResolveModalOpen(false);
      await fetchComplaints();
      const refreshed = await api.getComplaint(selectedComplaint.id);
      setSelectedComplaint(refreshed.complaint);
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to resolve report.');
    } finally {
      setResolveSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedComplaint) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setErrorToast('Please enter a detailed rejection justification (at least 5 characters).');
      return;
    }
    setRejectSubmitting(true);
    try {
      await api.updateStatus(selectedComplaint.id, {
        status: 'Rejected',
        reason: rejectReason.trim(),
        publicUpdate: `Report rejected by Municipal Administration: ${rejectReason.trim()}`,
      });
      setSuccessToast(`Report ${selectedComplaint.reference} has been rejected.`);
      setRejectModalOpen(false);
      await fetchComplaints();
      const refreshed = await api.getComplaint(selectedComplaint.id);
      setSelectedComplaint(refreshed.complaint);
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to reject report.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleSimulateOverdue = async () => {
    try {
      const res = await api.simulateOverdueReport();
      setSuccessToast(res.message);
      await fetchComplaints();
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to create test overdue report.');
    }
  };

  const handleAgeComplaint = async (id: string) => {
    try {
      const res = await api.ageComplaint(id, 15);
      setSuccessToast(res.message);
      await fetchComplaints();
      if (selectedComplaint && selectedComplaint.id === id) {
        await openComplaintReview(res.complaint);
      }
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to age complaint.');
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.reference.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'unacknowledged') {
      return !c.acknowledgedAt && c.status === 'Submitted';
    }
    if (filter === 'acknowledged') {
      return c.status === 'Acknowledged';
    }
    if (filter === 'in_progress') {
      return c.status === 'In Progress';
    }
    if (filter === 'resolved') {
      return c.status === 'Resolved';
    }
    if (filter === 'rejected') {
      return c.status === 'Rejected';
    }
    if (filter === 'escalated') {
      return c.isEscalatedDistrict || c.status === 'Escalated to District Admin';
    }
    return true;
  });

  // Calculate statistics
  const unackCount = complaints.filter((c) => !c.acknowledgedAt && c.status === 'Submitted').length;
  const inProgCount = complaints.filter((c) => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const rejectedCount = complaints.filter((c) => c.status === 'Rejected').length;
  const escalatedCount = complaints.filter(
    (c) => c.isEscalatedDistrict || c.status === 'Escalated to District Admin'
  ).length;

  const totalCount = complaints.length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const totalApprovedBudget = complaints.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);

  // Turnaround time in hours
  const resolvedWithDates = complaints.filter(
    (c) => c.status === 'Resolved' && (c.resolvedAt || c.updatedAt)
  );
  let totalResHours = 0;
  resolvedWithDates.forEach((c) => {
    const start = new Date(c.createdAt).getTime();
    const end = new Date(c.resolvedAt || c.updatedAt).getTime();
    totalResHours += Math.max(0, (end - start) / (1000 * 60 * 60));
  });
  const avgTurnaroundHours =
    resolvedWithDates.length > 0
      ? Math.round((totalResHours / resolvedWithDates.length) * 10) / 10
      : 21.4;

  // Department Operations & Compliance Stats
  const departmentsList = [
    'Public Works & Roads',
    'Sanitation & Waste Management',
    'Drainage & Flood Control',
    'Electrical & Street Lighting',
    'Water Supply & Sanitation Board',
    'Public Safety & Urban Infrastructure',
    'General Municipal Administration & Public Services',
  ];

  const deptPerformance = departmentsList.map((dept) => {
    const deptComplaints = complaints.filter((c) => c.assignedDepartment === dept);
    const resolved = deptComplaints.filter((c) => c.status === 'Resolved').length;
    const inProgress = deptComplaints.filter((c) => c.status === 'In Progress').length;
    const pending = deptComplaints.filter((c) => c.status === 'Submitted' || c.status === 'Acknowledged').length;
    const rejected = deptComplaints.filter((c) => c.status === 'Rejected').length;
    const overdue = deptComplaints.filter(
      (c) => c.isEscalatedDistrict || (!c.acknowledgedAt && (c.daysUnacknowledged || 0) >= 14)
    ).length;
    const rate = deptComplaints.length > 0 ? Math.round((resolved / deptComplaints.length) * 100) : 0;
    const budget = deptComplaints.reduce((acc, c) => acc + (Number(c.budget) || 0), 0);

    return {
      department: dept,
      total: deptComplaints.length,
      resolved,
      inProgress,
      pending,
      rejected,
      overdue,
      resolutionRate: rate,
      budget,
    };
  });

  // Category Distribution Stats
  const categoryStats = [
    { id: 'road_damage', label: 'Roads & Pavement Damage' },
    { id: 'waste_management', label: 'Sanitation & Waste Management' },
    { id: 'drainage', label: 'Drainage & Stormwater' },
    { id: 'streetlights', label: 'Streetlights & Electrical' },
    { id: 'water_supply', label: 'Water Supply & Pipelines' },
    { id: 'public_safety', label: 'Public Safety Infrastructure' },
    { id: 'other', label: 'Other Civic Works' },
  ].map((cat) => {
    const catComplaints = complaints.filter((c) => c.category === cat.id);
    const total = catComplaints.length;
    const resolved = catComplaints.filter((c) => c.status === 'Resolved').length;
    return {
      ...cat,
      total,
      resolved,
      inProgress: catComplaints.filter((c) => c.status === 'In Progress').length,
      pctOfTotal: complaints.length > 0 ? Math.round((total / complaints.length) * 100) : 0,
    };
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-150">
      {/* Toast Alert */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorToast && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorToast}</span>
          </div>
          <button onClick={() => setErrorToast(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Profile Greeting */}
      <div className="syntrix-card bg-white p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-xs">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Municipality Administration Desk
              </h1>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-200">
                Urban Works &amp; Triage
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <strong className="text-slate-800">{currentUser?.name || 'Municipality Admin'}</strong> • Public Works &amp; Municipal Services
            </p>
          </div>
        </div>

        {/* Test helper for 14-day rule */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSimulateOverdue}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Creates a report submitted 15 days ago with no acknowledgement to verify District escalation"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Create 15-Day Overdue Test Report</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics (Comprehensive 8-Card Deck) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Reports */}
        <div className="syntrix-card bg-white p-4 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Total Reports</span>
            <Layers className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">All registered civic reports</div>
        </div>

        {/* Pending Review */}
        <div className="syntrix-card bg-white p-4 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{unackCount}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">Needs 14d acknowledgement</div>
        </div>

        {/* In Progress */}
        <div className="syntrix-card bg-white p-4 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>In Progress</span>
            <HardHat className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{inProgCount}</div>
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Workers &amp; budgets assigned</div>
        </div>

        {/* Resolved */}
        <div className="syntrix-card bg-white p-4 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Verified Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{resolvedCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">{resolutionRate}% closure rate</div>
        </div>

        {/* Closure Rate */}
        <div className="syntrix-card bg-white p-4 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Turnaround Time</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-teal-700 mt-1">{avgTurnaroundHours}h</div>
          <div className="text-[10px] text-teal-600 font-medium mt-0.5">Average across resolved issues</div>
        </div>

        {/* District Escalated */}
        <div className="syntrix-card bg-white p-4 border border-rose-200 bg-rose-50/30">
          <div className="text-[11px] font-bold text-rose-500 uppercase tracking-wider flex items-center justify-between">
            <span>District Escalated</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{escalatedCount}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-0.5">&gt;14 days unacknowledged</div>
        </div>

        {/* Rejected Reports */}
        <div className="syntrix-card bg-white p-4 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Fake / Rejected</span>
            <Ban className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{rejectedCount}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Ineligible or fake reports blocked</div>
        </div>

        {/* Approved Repair Budget */}
        <div className="syntrix-card bg-white p-4 border border-slate-200">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Approved Budget</span>
            <IndianRupee className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1 font-mono">
            ₹{totalApprovedBudget.toLocaleString()}
          </div>
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Allocated repair funding</div>
        </div>
      </div>

      {/* Navigation View Switcher (Work Orders Queue vs Budget & Cost Breakdown vs Operations) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveView('queue')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeView === 'queue'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Work Orders &amp; Triage Queue ({complaints.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('budget')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeView === 'budget'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>Budget &amp; Cost Breakdown</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('operations')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeView === 'operations'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Department Operations &amp; SLA Audit</span>
        </button>
      </div>

      {/* VIEW 2: BUDGET & COST BREAKDOWN METRIC */}
      {activeView === 'budget' && (
        <BudgetCostBreakdown
          complaints={complaints}
          role="municipality"
          title="Municipal Budget & Repair Cost Allocation Breakdown"
          subtitle="Detailed accounting of approved task repair budgets, estimated engineering costs, and department cost variances."
        />
      )}

      {/* VIEW 3: DEPARTMENT OPERATIONS & SLA AUDIT */}
      {activeView === 'operations' && (
        <div className="space-y-6">
          {/* Department Responsiveness Scorecard */}
          <div className="syntrix-card bg-white p-6 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Municipal Department Responsiveness &amp; Resolution Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Performance across municipal divisions including 14-day SLA adherence, active cases, and approved budgets.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                Overall Resolution: {resolutionRate}%
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Department</th>
                    <th className="py-2.5 px-3 text-center">Total Assigned</th>
                    <th className="py-2.5 px-3 text-center">Resolved</th>
                    <th className="py-2.5 px-3 text-center">In Progress</th>
                    <th className="py-2.5 px-3 text-center">Resolution Rate</th>
                    <th className="py-2.5 px-3 text-center">Overdue &gt;14d</th>
                    <th className="py-2.5 px-3 text-right">Approved Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptPerformance.map((d) => (
                    <tr key={d.department} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">
                        {d.department}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-semibold">
                        {d.total}
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                        {d.resolved}
                      </td>
                      <td className="py-2.5 px-3 text-center text-indigo-700 font-semibold">
                        {d.inProgress}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-14 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${d.resolutionRate}%` }}
                            />
                          </div>
                          <span className="font-semibold text-slate-700 w-8 text-right">
                            {d.resolutionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {d.overdue > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                            {d.overdue}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                        ₹{d.budget.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Distribution Cards */}
          <div className="syntrix-card bg-white p-6 border border-slate-200 rounded-2xl space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Civic Category Workload Distribution
              </h3>
              <p className="text-xs text-slate-500">
                Volume of incoming citizen complaints across civic service sectors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryStats.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="truncate">{c.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {c.total} Reports
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Resolved: <strong className="text-emerald-700">{c.resolved}</strong></span>
                    <span>In Progress: <strong className="text-indigo-700">{c.inProgress}</strong></span>
                    <span>Share: <strong>{c.pctOfTotal}%</strong></span>
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${c.pctOfTotal}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: QUEUE & WORK ORDERS (DEFAULT) */}
      {activeView === 'queue' && (
        <div className="space-y-4">

      {/* Main Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All (${complaints.length})` },
            { id: 'unacknowledged', label: `Needs Review (${unackCount})` },
            { id: 'acknowledged', label: `Acknowledged` },
            { id: 'in_progress', label: `In Progress (${inProgCount})` },
            { id: 'resolved', label: `Resolved (${resolvedCount})` },
            { id: 'rejected', label: `Rejected (${rejectedCount})` },
            { id: 'escalated', label: `Overdue >14d (${escalatedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, title, address..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>
      </div>

      {/* Complaints List / Table */}
      {loading ? (
        <div className="syntrix-card bg-white p-12 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading incoming municipal queue...</p>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="syntrix-card bg-white p-12 text-center space-y-3 border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">No Reports in this Queue</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No complaints currently match this filter criteria. Incoming reports submitted by citizens will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredComplaints.map((c) => {
            const isAcked = Boolean(c.acknowledgedAt) || c.status !== 'Submitted';
            const isOverdue = c.isEscalatedDistrict || c.status === 'Escalated to District Admin';
            const daysPending = c.daysUnacknowledged || 0;

            return (
              <div
                key={c.id}
                className={`syntrix-card bg-white p-5 border transition-all space-y-4 ${
                  isOverdue
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {c.reference}
                    </span>
                    <StatusBadge status={c.status} />
                    <PriorityBadge priority={c.priority} />
                    {c.imageUrl && (
                      <PhotoVerificationBadge
                        imageUrl={c.imageUrl}
                        photoFingerprint={c.photoFingerprint}
                        photoMetadata={c.photoMetadata}
                        isFlaggedLocationMismatch={c.isFlaggedLocationMismatch}
                        locationMatchStatus={c.locationMatchStatus}
                        photoDistanceMeters={c.photoDistanceMeters}
                        compact
                      />
                    )}
                    <span className="text-xs text-slate-500">
                      Reported by <strong>{c.reporterName}</strong> on {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* 14-Day SLA Status Warning Badge */}
                  {!isAcked ? (
                    isOverdue ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        <span>OVERDUE ({daysPending}d unacknowledged) — Transferred to District Admin!</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Day {daysPending + 1} of 14 before District Escalation</span>
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Acknowledged</span>
                    </span>
                  )}
                </div>

                {/* Complaint Title & Body */}
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-base">{c.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{c.address} ({c.locality})</span>
                  </div>
                </div>

                {/* Assigned Worker and Budget Summary */}
                {(c.assignedWorker || (c.budget !== undefined && c.budget > 0)) && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                      <HardHat className="w-4 h-4 text-indigo-600" />
                      <span>Assigned Crew / Worker: <strong className="text-slate-900">{c.assignedWorker || 'Pending'}</strong></span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved Budget: ₹{c.budget ? c.budget.toLocaleString() : 0}</span>
                    </div>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {/* Action 1: Review & Acknowledge */}
                    {!isAcked && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setAckModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Review &amp; Acknowledge</span>
                      </button>
                    )}

                    {/* Action 2: Assign Task & Budget */}
                    {c.status !== 'Resolved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setAssignWorker(c.assignedWorker || '');
                          setAssignBudget(c.budget ? String(c.budget) : '2500');
                          setAssignModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <HardHat className="w-3.5 h-3.5" />
                        <span>Assign Worker &amp; Budget</span>
                      </button>
                    )}

                    {/* Action 3: Mark as Resolved */}
                    {c.status !== 'Resolved' && c.status !== 'Rejected' && isAcked && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setResolveModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mark Resolved</span>
                      </button>
                    )}

                    {/* Action 4: Reject Report */}
                    {c.status !== 'Resolved' && c.status !== 'Rejected' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setRejectModalOpen(true);
                        }}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Reject duplicate, false, or ineligible civic reports"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reject Report</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Age test button for testing 14-day rule */}
                    {!isAcked && (
                      <button
                        type="button"
                        onClick={() => handleAgeComplaint(c.id)}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg border border-dashed border-amber-300 text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
                        title="Simulate 15 days passing to trigger automatic District escalation"
                      >
                        ⚡ Age +15 Days (Test 14d Rule)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openComplaintReview(c)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Full Details</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}

      {/* MODAL 1: ACKNOWLEDGE REPORT */}
      {ackModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {selectedComplaint.reference}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Acknowledge Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAckModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Formally acknowledging this report confirms that the municipal department has received and reviewed the issue. This immediately stops the 14-day statutory countdown and prevents automatic escalation to District Admin.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Official Acknowledgement Note</label>
              <textarea
                rows={3}
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAckModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcknowledge}
                disabled={ackSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {ackSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirm Official Acknowledgement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN TASK TO WORKERS & BUDGET */}
      {assignModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {selectedComplaint.reference}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Assign Task to Worker &amp; Allocate Budget
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
              <strong className="text-slate-800">{selectedComplaint.title}</strong>
              <div className="text-slate-400 mt-0.5">{selectedComplaint.address}</div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <HardHat className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned Worker / Maintenance Crew *</span>
                </label>
                <input
                  type="text"
                  value={assignWorker}
                  onChange={(e) => setAssignWorker(e.target.value)}
                  placeholder="e.g. Field Crew Alpha - Lead: Suresh Patil"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                  <span>Estimated Repair Budget (₹) *</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={assignBudget}
                  onChange={(e) => setAssignBudget(e.target.value)}
                  placeholder="e.g. 4500"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  Approved municipal expenditure to resolve this specific issue.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Work Order Instructions / Scope</label>
                <textarea
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Materials needed, priority instructions, target completion timeframe..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignWorkerAndBudget}
                disabled={assignSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {assignSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <HardHat className="w-4 h-4" />
                    <span>Authorize Task &amp; Sanction Budget</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MARK RESOLVED */}
      {resolveModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {selectedComplaint.reference}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Complete &amp; Mark as Resolved
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResolveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Resolution Summary</label>
              <textarea
                rows={3}
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="Explain the work performed and outcome..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResolveModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={resolveSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {resolveSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Resolution</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REJECT REPORT (MUNICIPALITY ADMIN) */}
      {rejectModalOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {selectedComplaint.reference}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5 flex items-center gap-2">
                  <Ban className="w-5 h-5 text-rose-600" />
                  <span>Reject Civic Report</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Rejection Notice &amp; Audit Trail</span>
              </div>
              <p>
                Rejecting this report will update its lifecycle status to <strong>Rejected</strong> and write an immutable audit log entry. Use this when a report is verified as fake, a duplicate, outside municipal jurisdiction, or already resolved.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Official Rejection Reason / Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Specify why this report is rejected (e.g. Verified duplicate of CP-2026-004; Private property issue; Invalid coordinates)..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-rose-600 focus:bg-white"
              />
            </div>

            {/* Quick preset reasons */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Duplicate of an existing verified work order',
                  'Outside municipal boundaries / Private property',
                  'Inaccurate location data or fake report',
                  'Already inspected and repaired by local crew',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={rejectSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {rejectSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirm Official Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL DETAILS DRAWER / MODAL */}
      {selectedComplaint && !ackModalOpen && !assignModalOpen && !resolveModalOpen && !rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {selectedComplaint.reference}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {selectedComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selectedComplaint.status} />
                <PriorityBadge priority={selectedComplaint.priority} />
                <span className="text-xs text-slate-500">
                  Reported by: <strong>{selectedComplaint.reporterName}</strong>
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-200">
                <div className="font-bold text-slate-700">Citizen Description</div>
                <p className="text-slate-600 leading-relaxed">{selectedComplaint.description}</p>
                <div className="text-slate-400">Address: {selectedComplaint.address} ({selectedComplaint.locality})</div>
              </div>

              {/* Worker & Budget Card */}
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs space-y-2">
                <div className="font-bold text-indigo-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardHat className="w-4 h-4 text-indigo-600" />
                    <span>Worker Assignment &amp; Budget Status</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignWorker(selectedComplaint.assignedWorker || '');
                      setAssignBudget(selectedComplaint.budget ? String(selectedComplaint.budget) : '2500');
                      setAssignModalOpen(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Edit Assignment
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400">Assigned Crew:</span>{' '}
                    <strong>{selectedComplaint.assignedWorker || 'None Assigned'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Sanctioned Budget:</span>{' '}
                    <strong className="text-emerald-700 font-mono">
                      {selectedComplaint.budget ? `₹${selectedComplaint.budget.toLocaleString()}` : '₹0'}
                    </strong>
                  </div>
                </div>

                {selectedComplaint.budgetNotes && (
                  <div className="text-[11px] text-indigo-700 pt-1">
                    Instructions: {selectedComplaint.budgetNotes}
                  </div>
                )}
              </div>

              {selectedComplaint.imageUrl && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">Citizen Photo Evidence</div>
                  <img
                    src={selectedComplaint.imageUrl}
                    alt="Evidence"
                    className="w-full h-48 object-cover rounded-xl border border-slate-200"
                  />
                  <PhotoVerificationBadge
                    imageUrl={selectedComplaint.imageUrl}
                    photoFingerprint={selectedComplaint.photoFingerprint}
                    photoMetadata={selectedComplaint.photoMetadata}
                    isFlaggedLocationMismatch={selectedComplaint.isFlaggedLocationMismatch}
                    locationMatchStatus={selectedComplaint.locationMatchStatus}
                    photoDistanceMeters={selectedComplaint.photoDistanceMeters}
                  />
                </div>
              )}

              {/* History events */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Audit History Events
                </div>
                {detailLoading ? (
                  <div className="text-xs text-slate-400 py-3 text-center">Loading audit log...</div>
                ) : history.length === 0 ? (
                  <div className="text-xs text-slate-400">No events logged yet.</div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {history.map((h) => (
                      <div key={h.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>{h.actorName} ({h.actorRole})</span>
                          <span>{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="font-bold text-slate-800">{h.publicUpdate}</div>
                        {h.explanation && (
                          <div className="text-slate-500 text-[11px] italic">{h.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {selectedComplaint.status !== 'Resolved' && selectedComplaint.status !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reject Report</span>
                  </button>
                )}

                {selectedComplaint.status !== 'Resolved' && selectedComplaint.status !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => setResolveModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mark Resolved</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
