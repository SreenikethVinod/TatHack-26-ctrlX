import React, { useEffect, useState } from 'react';
import {
  Shield,
  Search,
  Filter,
  AlertOctagon,
  Clock,
  CheckCircle2,
  Building,
  UserCheck,
  Send,
  Eye,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  MessageSquare,
  Upload,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint, ComplaintHistoryEntry, ComplaintStatus, OfficialNote, PriorityLevel } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { PhotoVerificationBadge } from '../components/PhotoVerificationBadge';
import { InAppCameraCapture } from '../components/InAppCameraCapture';
import { Timeline } from '../components/Timeline';
import { useAuth } from '../context/AuthContext';

export const OfficialDashboardPage: React.FC = () => {
  const { currentUser, isOfficial, switchUser, users } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  // Selected complaint for detailed triage drawer/modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintHistoryEntry[]>([]);
  const [notes, setNotes] = useState<OfficialNote[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Triage action form states
  const [actionTab, setActionTab] = useState<'status' | 'priority' | 'assign' | 'note'>('status');
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('In Progress');
  const [statusUpdateNote, setStatusUpdateNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [afterImageUrl, setAfterImageUrl] = useState('');

  // Priority override form states
  const [newPriority, setNewPriority] = useState<PriorityLevel>('High');
  const [overrideReason, setOverrideReason] = useState('');

  // Department assignment state
  const [newDept, setNewDept] = useState('');

  // Official Note composer
  const [noteText, setNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'internal' | 'public'>('internal');

  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const departmentsList = [
    'Public Works & Roads',
    'Sanitation & Waste Management',
    'Drainage & Flood Control',
    'Electrical & Street Lighting',
    'Water Supply & Sanitation Board',
    'Public Safety & Urban Infrastructure',
  ];

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getComplaints({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        priority: filterPriority !== 'all' ? filterPriority : undefined,
        department: filterDept !== 'all' ? filterDept : undefined,
        search: search.trim() || undefined,
      });

      let list = res.complaints || [];

      if (showOverdueOnly) {
        const now = Date.now();
        list = list.filter((c) => {
          if (c.status === 'Resolved' || c.status === 'Rejected') return false;
          const hoursOpen = (now - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
          return hoursOpen > (c.slaHours || 72);
        });
      }

      setComplaints(list);
    } catch (err) {
      console.error('Failed to load official complaint queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus, filterPriority, filterDept, showOverdueOnly]);

  const loadComplaintDetails = async (c: Complaint) => {
    setSelectedComplaint(c);
    setNewStatus(c.status);
    setNewPriority(c.priority);
    setNewDept(c.assignedDepartment);
    setDetailLoading(true);
    try {
      const res = await api.getComplaint(c.id);
      setHistory(res.history || []);
      setNotes(res.notes || []);
    } catch (err) {
      console.error('Failed to load details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Submit Status Change
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setActionSubmitting(true);
    setActionSuccess(null);
    try {
      const res = await api.updateStatus(selectedComplaint.id, {
        status: newStatus,
        publicUpdate: statusUpdateNote || undefined,
        resolutionSummary: newStatus === 'Resolved' ? resolutionSummary : undefined,
        afterImageUrl: afterImageUrl || undefined,
      });

      setActionSuccess(`Status updated to ${newStatus}. Public audit log created.`);
      setSelectedComplaint(res.complaint);
      setHistory((prev) => [...prev, res.historyEntry]);
      fetchComplaints();
      setStatusUpdateNote('');
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Submit Priority Override
  const handlePrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!overrideReason.trim()) {
      alert('Official justification reason is required to override system priority recommendation.');
      return;
    }
    setActionSubmitting(true);
    setActionSuccess(null);
    try {
      const res = await api.updatePriority(selectedComplaint.id, {
        priority: newPriority,
        overrideReason: overrideReason.trim(),
      });

      setActionSuccess(`Priority updated to ${newPriority} with signed justification.`);
      setSelectedComplaint(res.complaint);
      fetchComplaints();
      setOverrideReason('');
    } catch (err: any) {
      alert(err.message || 'Error updating priority');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Submit Department Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setActionSubmitting(true);
    setActionSuccess(null);
    try {
      const res = await api.updateAssignment(selectedComplaint.id, {
        department: newDept,
      });

      setActionSuccess(`Work order routed to ${newDept}.`);
      setSelectedComplaint(res.complaint);
      fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Error assigning department');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Submit Official Note (Internal vs Public)
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !noteText.trim()) return;
    setActionSubmitting(true);
    setActionSuccess(null);
    try {
      const res = await api.addNote(selectedComplaint.id, {
        note: noteText.trim(),
        visibility: noteVisibility,
      });

      setNotes((prev) => [...prev, res.note]);
      setNoteText('');
      setActionSuccess(`Official ${noteVisibility} note appended to record.`);
    } catch (err: any) {
      alert(err.message || 'Error adding note');
    } finally {
      setActionSubmitting(false);
    }
  };

  // If user is currently in a citizen role, offer quick official impersonation
  if (!isOfficial) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Municipal Officer Workstation</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
            This dashboard contains sensitive administrative controls, work order dispatch, priority overrides, and internal field notes.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
          <p className="font-semibold text-slate-800">
            Current Account: <span className="text-teal-700">{currentUser?.name || 'Citizen'}</span>
          </p>
          <p className="text-slate-500">
            To evaluate municipal triage capabilities, please sign in with an authorized Municipal Officer or Administrator account.
          </p>
        </div>
      </div>
    );
  }

  // Overdue count
  const overdueCount = complaints.filter((c) => {
    if (c.status === 'Resolved' || c.status === 'Rejected') return false;
    const hoursOpen = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60);
    return hoursOpen > (c.slaHours || 72);
  }).length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Officer Header */}
      <div className="syntrix-card p-6 sm:p-8 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Authorized Municipal Workstation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Complaint Dispatch &amp; Triage Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as: <strong className="text-indigo-600">{currentUser?.name}</strong> • {currentUser?.department || 'City Administration'}
          </p>
        </div>

        {/* Quick SLA Counter Badge */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="text-center px-3 border-r border-slate-200">
            <div className="text-xl font-bold text-slate-900">{complaints.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Queue Total</div>
          </div>
          <div className="text-center px-3">
            <div className={`text-xl font-bold ${overdueCount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              {overdueCount}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">SLA Overdue</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="syntrix-card p-4 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search complaint queue by reference, title, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>

            {/* Priority */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Department */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 font-medium max-w-[160px] truncate"
            >
              <option value="all">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Overdue SLA toggle */}
            <button
              type="button"
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className={`px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showOverdueOnly
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Overdue Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Interface: Queue Table & Action Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Complaints Queue Table (7 cols) */}
        <div className="lg:col-span-7 syntrix-card bg-white overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Assigned Incident Queue ({complaints.length})
            </span>
            <span>Click any row to open triage workstation</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Loading queue records...</div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No complaints in queue matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
              {complaints.map((c) => {
                const isSelected = selectedComplaint?.id === c.id;
                const hoursOpen = Math.round((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60));
                const isOverdue = (c.status !== 'Resolved' && c.status !== 'Rejected') && hoursOpen > (c.slaHours || 72);

                return (
                  <div
                    key={c.id}
                    onClick={() => loadComplaintDetails(c)}
                    className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-teal-50/80 border-l-4 border-l-teal-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-800">
                          {c.reference}
                        </span>
                        <StatusBadge status={c.status} size="sm" />
                        <PriorityBadge priority={c.priority} size="sm" showIcon={false} />
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
                        {isOverdue && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded border border-rose-300">
                            SLA Alert ({hoursOpen}h)
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-1">
                        {c.title}
                      </h4>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="truncate max-w-[200px]">{c.address}</span>
                        <span>•</span>
                        <span className="truncate">{c.assignedDepartment}</span>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 shrink-0">
                      <div>{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className="font-semibold text-slate-600">{c.votesCount} votes</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Triage Workstation & Audit Controller (5 cols) */}
        <div className="lg:col-span-5 syntrix-card bg-white p-6 space-y-6 sticky top-20">
          {!selectedComplaint ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Eye className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Select a Complaint</h3>
              <p className="text-xs text-slate-500">
                Click any complaint on the queue table to update status, override priority, or re-route department.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Complaint Header Snapshot */}
              <div className="border-b border-slate-100 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {selectedComplaint.reference}
                  </span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedComplaint.status} size="sm" />
                    <PriorityBadge priority={selectedComplaint.priority} size="sm" />
                  </div>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  {selectedComplaint.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {selectedComplaint.description}
                </p>

                {selectedComplaint.imageUrl && (
                  <div className="pt-2 space-y-2">
                    <img
                      src={selectedComplaint.imageUrl}
                      alt={selectedComplaint.title}
                      className="w-full h-40 object-cover rounded-xl border border-slate-200"
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
              </div>

              {/* Explainable Rule-Based Priority Rationale Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    Rule Engine Recommendation
                  </span>
                  <span className="text-teal-700 uppercase font-mono font-bold">
                    {selectedComplaint.systemRecommendedPriority}
                  </span>
                </div>
                <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5">
                  {selectedComplaint.priorityRationale && selectedComplaint.priorityRationale.length > 0 ? (
                    selectedComplaint.priorityRationale.map((r, i) => <li key={i}>{r}</li>)
                  ) : (
                    <li>Baseline municipal priority applied.</li>
                  )}
                </ul>
              </div>

              {/* Action Tabs */}
              <div className="flex border-b border-slate-200 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActionTab('status')}
                  className={`pb-2 font-bold transition-all border-b-2 ${
                    actionTab === 'status'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Update Status
                </button>
                <button
                  type="button"
                  onClick={() => setActionTab('priority')}
                  className={`pb-2 font-bold transition-all border-b-2 ${
                    actionTab === 'priority'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Override Priority
                </button>
                <button
                  type="button"
                  onClick={() => setActionTab('assign')}
                  className={`pb-2 font-bold transition-all border-b-2 ${
                    actionTab === 'assign'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Re-Route Dept
                </button>
                <button
                  type="button"
                  onClick={() => setActionTab('note')}
                  className={`pb-2 font-bold transition-all border-b-2 ${
                    actionTab === 'note'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Admin Note
                </button>
              </div>

              {actionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Tab 1: Update Status Form */}
              {actionTab === 'status' && (
                <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Status Transition
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                    >
                      <option value="Submitted">Submitted (Under Review)</option>
                      <option value="Acknowledged">Acknowledged (Work Order Queued)</option>
                      <option value="In Progress">In Progress (Field Crew Deployed)</option>
                      <option value="Resolved">Resolved (Repairs Complete)</option>
                      <option value="Rejected">Rejected (Out of Scope / Invalid)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Public Update Note (Visible to Citizen)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Field crew dispatched with cold mix asphalt."
                      value={statusUpdateNote}
                      onChange={(e) => setStatusUpdateNote(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {newStatus === 'Resolved' && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                      <div>
                        <label className="block font-bold text-emerald-950 uppercase tracking-wider mb-1">
                          Official Resolution Summary
                        </label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Document the exact engineering or sanitation repair executed..."
                          value={resolutionSummary}
                          onChange={(e) => setResolutionSummary(e.target.value)}
                          className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-emerald-950 uppercase tracking-wider mb-2">
                          Live On-Site After-Photo Resolution Proof
                        </label>
                        <InAppCameraCapture
                          reportedLatitude={selectedComplaint.latitude}
                          reportedLongitude={selectedComplaint.longitude}
                          reportedAddress={selectedComplaint.address}
                          existingImageUrl={afterImageUrl}
                          onPhotoCaptured={({ imageUrl }) => {
                            setAfterImageUrl(imageUrl);
                          }}
                          onPhotoCleared={() => {
                            setAfterImageUrl('');
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {actionSubmitting ? 'Saving Status Update...' : 'Commit Status Update'}
                  </button>
                </form>
              )}

              {/* Tab 2: Override Priority Form */}
              {actionTab === 'priority' && (
                <form onSubmit={handlePrioritySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Official Priority Selection
                    </label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                    >
                      <option value="Critical">Critical (24h SLA • Immediate Danger)</option>
                      <option value="High">High (48h SLA • Major Transit Disruption)</option>
                      <option value="Medium">Medium (72h SLA • Standard Municipal)</option>
                      <option value="Low">Low (120h SLA • Scheduled Maintenance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Administrative Override Justification <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Explain why municipal assessment diverged from the automated rule recommendation..."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {actionSubmitting ? 'Saving Override...' : 'Confirm Priority Override'}
                  </button>
                </form>
              )}

              {/* Tab 3: Re-Route Department Form */}
              {actionTab === 'assign' && (
                <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Assigned Municipal Department
                    </label>
                    <select
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600"
                    >
                      {departmentsList.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {actionSubmitting ? 'Routing...' : 'Re-Assign Department'}
                  </button>
                </form>
              )}

              {/* Tab 4: Official Note Composer */}
              {actionTab === 'note' && (
                <form onSubmit={handleNoteSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Note Visibility Boundary
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="noteVisibility"
                          checked={noteVisibility === 'internal'}
                          onChange={() => setNoteVisibility('internal')}
                        />
                        <span className="font-semibold text-rose-700">Internal (Government Staff Only)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="noteVisibility"
                          checked={noteVisibility === 'public'}
                          onChange={() => setNoteVisibility('public')}
                        />
                        <span className="font-semibold text-teal-700">Public (Visible to Citizen)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Note Content
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder={
                        noteVisibility === 'internal'
                          ? 'Contractor details, worker safety precautions, equipment serials...'
                          : 'Public communication message for citizen tracking page...'
                      }
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionSubmitting}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {actionSubmitting ? 'Posting...' : 'Save Administrative Note'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
