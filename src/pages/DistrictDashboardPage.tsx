import React, { useEffect, useState } from 'react';
import {
  Landmark,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  HardHat,
  IndianRupee,
  Send,
  Eye,
  Check,
  Building,
  User,
  MapPin,
  Calendar,
  FileText,
  Zap,
  X,
  Scale,
  Award,
  AlertOctagon,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint, ComplaintHistoryEntry, OfficialNote } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { BudgetCostBreakdown } from '../components/BudgetCostBreakdown';
import { useAuth } from '../context/AuthContext';

export const DistrictDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [escalations, setEscalations] = useState<Complaint[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Intervention modal
  const [selectedEscalation, setSelectedEscalation] = useState<Complaint | null>(null);
  const [interventionType, setInterventionType] = useState<
    'DIRECT_ASSIGN' | 'FORMAL_DIRECTIVE' | 'FORCE_ACKNOWLEDGE' | 'EMERGENCY_FUNDS'
  >('DIRECT_ASSIGN');
  const [directiveText, setDirectiveText] = useState(
    'District Collectorate executive intervention order: Municipal local body failed to acknowledge within 14 days.'
  );
  const [districtWorker, setDistrictWorker] = useState('District Rapid Taskforce Squad #1');
  const [emergencyBudget, setEmergencyBudget] = useState('5000');
  const [intervening, setIntervening] = useState(false);

  // Detail inspection modal
  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintHistoryEntry[]>([]);
  const [notes, setNotes] = useState<OfficialNote[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [escRes, allRes] = await Promise.all([
        api.getDistrictEscalations().catch(() => ({ escalations: [] })),
        api.getComplaints().catch(() => ({ complaints: [] })),
      ]);

      setEscalations(escRes.escalations || []);
      setAllComplaints(allRes.complaints || []);
    } catch (err) {
      console.error('Failed to load district data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenIntervention = (complaint: Complaint) => {
    setSelectedEscalation(complaint);
    setDirectiveText(
      `District Executive Directive for ${complaint.reference}: Due to 14+ days unacknowledged status by ${complaint.assignedDepartment}, District Administration assumes direct jurisdiction.`
    );
    setDistrictWorker('District Rapid Taskforce Squad #1');
    setEmergencyBudget('5000');
    setInterventionType('DIRECT_ASSIGN');
  };

  const handleApplyIntervention = async () => {
    if (!selectedEscalation) return;
    if (!directiveText.trim()) {
      setToastMsg({ text: 'Please enter executive directive instructions.', type: 'error' });
      return;
    }

    setIntervening(true);
    try {
      const numBudget = Number(emergencyBudget);
      const res = await api.districtIntervene(selectedEscalation.id, {
        actionType: interventionType,
        directiveText: directiveText.trim(),
        worker: districtWorker.trim() || undefined,
        emergencyBudget: isNaN(numBudget) ? undefined : numBudget,
      });

      setToastMsg({ text: res.message, type: 'success' });
      setSelectedEscalation(null);
      await loadData();
    } catch (err: any) {
      setToastMsg({ text: err.message || 'Intervention failed.', type: 'error' });
    } finally {
      setIntervening(false);
    }
  };

  const openInspection = async (complaint: Complaint) => {
    setDetailComplaint(complaint);
    setDetailLoading(true);
    try {
      const res = await api.getComplaint(complaint.id);
      setDetailComplaint(res.complaint);
      setHistory(res.history || []);
      setNotes(res.notes || []);
    } catch (err) {
      console.error('Failed to load details', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSimulateOverdue = async () => {
    try {
      const res = await api.simulateOverdueReport();
      setToastMsg({
        text: `Simulated report ${res.complaint.reference} created with age 15 days. Automatically forwarded to District Admin page!`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setToastMsg({ text: err.message || 'Failed to simulate overdue report.', type: 'error' });
    }
  };

  // Department compliance statistics
  const deptStats = [
    'Public Works & Roads',
    'Sanitation & Waste Management',
    'Drainage & Flood Control',
    'Electrical & Street Lighting',
    'Water Supply & Sanitation Board',
  ].map((dept) => {
    const deptComplaints = allComplaints.filter((c) => c.assignedDepartment === dept);
    const overdueDept = deptComplaints.filter(
      (c) => c.isEscalatedDistrict || (!c.acknowledgedAt && (c.daysUnacknowledged || 0) >= 14)
    ).length;
    return {
      department: dept,
      total: deptComplaints.length,
      overdue: overdueDept,
      onTime: deptComplaints.length - overdueDept,
    };
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-150">
      {/* Toast */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-xs ${
            toastMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* District Header Greeting */}
      <div className="syntrix-card bg-white p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-700 text-white flex items-center justify-center font-extrabold text-xl shrink-0 shadow-xs">
            <Landmark className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                District Administration &amp; Collectorate
              </h1>
              <span className="text-[10px] bg-purple-50 text-purple-700 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-purple-200">
                Higher Authority
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <strong className="text-slate-800">{currentUser?.name || 'District Admin'}</strong> • Metropolitan Collectorate Oversight &amp; Statutory Escalations
            </p>
          </div>
        </div>

        {/* Instant test simulation button */}
        <button
          type="button"
          onClick={handleSimulateOverdue}
          className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-2xs self-start md:self-auto"
          title="Simulate a report exceeding 14 days without acknowledgement to test automatic district routing"
        >
          <Zap className="w-4 h-4 text-purple-600" />
          <span>Simulate 15-Day Overdue Report</span>
        </button>
      </div>

      {/* SECTION 1: 🚨 AUTOMATIC ESCALATIONS (UNACKNOWLEDGED > 14 DAYS) */}
      <div className="space-y-4">
        {/* Callout Notice */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5 shadow-2xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-rose-950 text-sm flex items-center gap-2">
              <span>Automatic Statutory Escalation Desk: Reports Unacknowledged &gt; 14 Days</span>
              <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-bold">
                {escalations.length} Overdue Issues Transferred
              </span>
            </h3>
            <p className="text-xs text-rose-800 leading-relaxed">
              Under municipal governance law, any report that remains <strong>Unacknowledged for more than 14 days</strong> by a local municipal department is automatically transferred to this District Admin page. As the higher authority, you have executive powers to sanction emergency funds, bypass unresponsive departments, and deploy direct taskforces.
            </p>
          </div>
        </div>

        {/* Escalations List */}
        {loading ? (
          <div className="syntrix-card bg-white p-12 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Inspecting district escalation queue...</p>
          </div>
        ) : escalations.length === 0 ? (
          <div className="syntrix-card bg-white p-10 text-center space-y-3 border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">No 14-Day Overdue Escalations</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All active complaints have been acknowledged by municipal authorities within the 14-day statutory timeline. Use the test button above to simulate a 15-day unacknowledged report.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {escalations.map((c) => {
              const daysElapsed = c.daysUnacknowledged || Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
              const daysBreached = Math.max(1, daysElapsed - 14);

              return (
                <div
                  key={c.id}
                  className="syntrix-card bg-white p-5 border-2 border-rose-300 rounded-2xl shadow-xs space-y-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Statutory Breach: {daysElapsed} Days Unacknowledged</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 pt-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {c.reference}
                      </span>
                      <StatusBadge status={c.status} />
                      <PriorityBadge priority={c.priority} />
                      <span className="text-xs text-slate-500">
                        Reported by: <strong>{c.reporterName}</strong> on {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-base">{c.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {c.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.address} ({c.locality})</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-rose-700 font-bold">
                        Failed Department: {c.assignedDepartment}
                      </span>
                    </div>
                  </div>

                  {/* Overdue Analysis Box */}
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 text-xs space-y-1">
                    <div className="font-bold text-rose-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Breach Audit: {daysElapsed} Days Without Municipal Acknowledgement</span>
                    </div>
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      Statutory 14-day timeline lapsed {daysBreached} day{daysBreached > 1 ? 's' : ''} ago. Municipal department &quot;{c.assignedDepartment}&quot; failed to acknowledge or dispatch field crew. District Executive intervention authorized.
                    </p>
                  </div>

                  {/* Existing Worker / Budget if intervened */}
                  {c.assignedWorker && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs flex items-center justify-between text-purple-900">
                      <div>
                        Assigned Taskforce: <strong>{c.assignedWorker}</strong>
                      </div>
                      <div className="font-bold font-mono">
                        District Emergency Budget: ₹{c.budget ? c.budget.toLocaleString() : 0}
                      </div>
                    </div>
                  )}

                  {/* Higher Authority Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenIntervention(c)}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Higher-Authority Executive Intervention</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openInspection(c)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Audit Log</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: DISTRICT MUNICIPAL COMPLIANCE SCORECARD */}
      <div className="syntrix-card bg-white p-6 border border-slate-200 rounded-2xl space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Municipal Department Responsiveness &amp; Compliance Audit
          </h2>
          <p className="text-xs text-slate-500">
            Compliance percentage with the 14-day acknowledgement mandate across local government departments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {deptStats.map((d) => {
            const compliancePct = d.total > 0 ? Math.round(((d.total - d.overdue) / d.total) * 100) : 100;
            return (
              <div key={d.department} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-900 truncate">{d.department}</div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Total Reports: <strong>{d.total}</strong></span>
                  <span className={d.overdue > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                    Overdue: {d.overdue}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${compliancePct < 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${compliancePct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 text-right">
                  14-Day Compliance: {compliancePct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: DISTRICT BUDGET & REPAIR COST BREAKDOWN */}
      <BudgetCostBreakdown
        complaints={allComplaints}
        role="district"
        title="District Collectorate Budget & Cost Breakdown"
        subtitle="District-wide statutory oversight of approved municipal repair budgets, emergency allocations, and estimated department repair costs."
      />

      {/* MODAL: DISTRICT HIGHER AUTHORITY INTERVENTION */}
      {selectedEscalation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {selectedEscalation.reference} • Statutory Escalation
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  District Executive Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEscalation(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200">
              <div className="font-bold text-slate-900">{selectedEscalation.title}</div>
              <div className="text-slate-500">
                Department: {selectedEscalation.assignedDepartment} • Location: {selectedEscalation.address}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Executive Action Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'DIRECT_ASSIGN', label: 'Direct Taskforce & Emergency Budget' },
                    { id: 'FORMAL_DIRECTIVE', label: 'Issue Official Summons to Department' },
                    { id: 'FORCE_ACKNOWLEDGE', label: 'Force Acknowledge & 48h Inspection' },
                    { id: 'EMERGENCY_FUNDS', label: 'Sanction District Relief Budget' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setInterventionType(act.id as any)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                        interventionType === act.id
                          ? 'bg-purple-50 border-purple-600 text-purple-900 ring-1 ring-purple-600'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {(interventionType === 'DIRECT_ASSIGN' || interventionType === 'EMERGENCY_FUNDS') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <HardHat className="w-3.5 h-3.5 text-slate-400" />
                      <span>District Taskforce / Contractor</span>
                    </label>
                    <input
                      type="text"
                      value={districtWorker}
                      onChange={(e) => setDistrictWorker(e.target.value)}
                      placeholder="e.g. District Rapid Response Unit 1"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                      <span>Emergency District Budget (₹)</span>
                    </label>
                    <input
                      type="number"
                      value={emergencyBudget}
                      onChange={(e) => setEmergencyBudget(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">District Executive Order Directive</label>
                <textarea
                  rows={3}
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                  placeholder="Record formal directive reasons and mandate..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedEscalation(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyIntervention}
                disabled={intervening}
                className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {intervening ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Scale className="w-4 h-4" />
                    <span>Issue Executive District Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL INSPECTION */}
      {detailComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-purple-600">
                  {detailComplaint.reference}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {detailComplaint.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailComplaint(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={detailComplaint.status} />
                <PriorityBadge priority={detailComplaint.priority} />
                <span className="text-xs text-slate-500">
                  Department: <strong>{detailComplaint.assignedDepartment}</strong>
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-200">
                <div className="font-bold text-slate-700">Citizen Description</div>
                <p className="text-slate-600 leading-relaxed">{detailComplaint.description}</p>
                <div className="text-slate-400">Address: {detailComplaint.address} ({detailComplaint.locality})</div>
              </div>

              {detailComplaint.imageUrl && (
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1.5">Citizen Photo Evidence</div>
                  <img
                    src={detailComplaint.imageUrl}
                    alt="Evidence"
                    className="w-full h-48 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}

              {/* History events */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Complete Legal Audit Trail
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

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailComplaint(null)}
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
