import React, { useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Building,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  Image as ImageIcon,
  ShieldCheck,
  FileText,
  ArrowRight,
  ExternalLink,
  Bell,
  BellRing,
  Sparkles,
  Layers,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint, ComplaintHistoryEntry, OfficialNote } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { PhotoVerificationBadge } from '../components/PhotoVerificationBadge';
import { Timeline } from '../components/Timeline';
import { useAuth } from '../context/AuthContext';

interface Props {
  initialReference?: string;
  onExploreNavigate: () => void;
}

export const TrackIssuePage: React.FC<Props> = ({ initialReference = '', onExploreNavigate }) => {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState(initialReference);
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintHistoryEntry[]>([]);
  const [notes, setNotes] = useState<OfficialNote[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(1);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followMsg, setFollowMsg] = useState<string | null>(null);

  // Quick preset samples for judges
  const sampleRefs = [
    { ref: 'CP-2026-001', label: 'CP-2026-001 (Pothole - In Progress)' },
    { ref: 'CP-2026-002', label: 'CP-2026-002 (Dumpster - Resolved w/ Proof)' },
    { ref: 'CP-2026-003', label: 'CP-2026-003 (Burst Pipe - Critical)' },
    { ref: 'CP-2026-007', label: 'CP-2026-007 (Traffic Signal - Resolved)' },
  ];

  const searchComplaint = async (refToSearch: string) => {
    if (!refToSearch.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.trackComplaint(refToSearch.trim());
      setComplaint(data.complaint);
      setHistory(data.history || []);
      setNotes(data.notes || []);
      setFollowersCount(data.complaint.followersCount || 1);
      
      // Also check follow status for logged in user
      if (data.complaint.id) {
        api.getFollowStatus(data.complaint.id)
          .then((st) => {
            setFollowing(st.isFollowing);
            setFollowersCount(st.followersCount);
          })
          .catch(() => {});
      }
    } catch (err: any) {
      setComplaint(null);
      setHistory([]);
      setNotes([]);
      setErrorMsg(err.message || 'No civic complaint found with that reference ID.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialReference) {
      searchComplaint(initialReference);
    } else {
      // Default to CP-2026-001 for instant view
      searchComplaint('CP-2026-001');
    }
  }, [initialReference]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchComplaint(query);
  };

  const handleToggleFollow = async () => {
    if (!complaint || followingLoading) return;
    setFollowingLoading(true);
    setFollowMsg(null);
    try {
      const res = await api.followComplaint(complaint.id);
      if (res.success) {
        setFollowing(res.isFollowing);
        setFollowersCount(res.followersCount);
        setFollowMsg(res.message);
        setTimeout(() => setFollowMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleVote = async () => {
    if (!complaint || voting) return;
    setVoting(true);
    try {
      const res = await api.voteComplaint(complaint.id);
      if (res.success) {
        setComplaint({
          ...complaint,
          votesCount: res.votesCount,
          hasUserVoted: true,
        });
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVoting(false);
    }
  };

  // Calculate SLA status
  const getSlaStatus = () => {
    if (!complaint) return null;
    if (complaint.status === 'Resolved') {
      return { text: 'Resolved within municipal SLA window', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    const created = new Date(complaint.createdAt).getTime();
    const now = Date.now();
    const hoursElapsed = Math.round((now - created) / (1000 * 60 * 60));
    const targetHours = complaint.slaHours || 72;

    if (hoursElapsed > targetHours) {
      return {
        text: `Overdue SLA by ${hoursElapsed - targetHours} hours (Target was ${targetHours}h)`,
        color: 'text-rose-800 bg-rose-50 border-rose-200',
      };
    }
    return {
      text: `${targetHours - hoursElapsed} hours remaining before ${targetHours}h SLA target`,
      color: 'text-blue-800 bg-blue-50 border-blue-200',
    };
  };

  const sla = getSlaStatus();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Search Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
          <Search className="w-3.5 h-3.5" />
          <span>Real-Time Public Accountability</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Complaint Resolution
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Enter any complaint reference code to inspect its progress, assigned municipal department, and audit history.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="syntrix-card p-5 bg-white space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Enter reference ID (e.g. CP-2026-001)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono uppercase focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shrink-0 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {/* Quick Demo Pre-picks */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Demo Quick Picks:</span>
          {sampleRefs.map((sample) => (
            <button
              key={sample.ref}
              type="button"
              onClick={() => {
                setQuery(sample.ref);
                searchComplaint(sample.ref);
              }}
              className="px-3 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-800 text-slate-700 rounded-xl text-xs font-mono font-medium border border-slate-200 transition-colors cursor-pointer"
            >
              {sample.ref}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Complaint Tracking Card */}
      {complaint && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="syntrix-card p-6 sm:p-8 bg-white space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                    {complaint.reference}
                  </span>
                  <StatusBadge status={complaint.status} size="md" />
                  <PriorityBadge priority={complaint.priority} size="md" />
                  {complaint.imageUrl && (
                    <PhotoVerificationBadge
                      imageUrl={complaint.imageUrl}
                      photoFingerprint={complaint.photoFingerprint}
                      photoMetadata={complaint.photoMetadata}
                      isFlaggedLocationMismatch={complaint.isFlaggedLocationMismatch}
                      locationMatchStatus={complaint.locationMatchStatus}
                      photoDistanceMeters={complaint.photoDistanceMeters}
                      compact
                    />
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                  {complaint.title}
                </h2>
              </div>

              {/* Actions: Follow Report & Endorse Vote */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleToggleFollow}
                  disabled={followingLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    following
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                  title={following ? 'Click to unfollow updates' : 'Follow to receive resolution updates'}
                >
                  {following ? (
                    <BellRing className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>
                    {following ? 'Following' : 'Follow Report'} ({followersCount})
                  </span>
                </button>

                <button
                  onClick={handleVote}
                  disabled={voting || complaint.hasUserVoted}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    complaint.hasUserVoted
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 cursor-default'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${complaint.hasUserVoted ? 'fill-teal-600 text-teal-600' : ''}`} />
                  <span>
                    {complaint.hasUserVoted ? 'Endorsed' : 'Support Issue'} ({complaint.votesCount})
                  </span>
                </button>
              </div>
            </div>

            {/* Follow Success Message */}
            {followMsg && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{followMsg}</span>
              </div>
            )}

            {/* Spatial Auto-Merge Banner: Opposite Side of Road */}
            {complaint.isMerged && complaint.mergedWithReference && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-950 block">Spatial Auto-Merge Clustered</span>
                    <span className="text-purple-800">
                      This report was clustered with canonical ticket <strong>{complaint.mergedWithReference}</strong> (located ~50m across the road).
                      Both reports are linked into one municipal work order to eliminate duplicate contractor payouts.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => searchComplaint(complaint.mergedWithReference!)}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Track {complaint.mergedWithReference}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {complaint.mergedCount && complaint.mergedCount > 0 && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Spatial Cluster Hub:</strong> {complaint.mergedCount} neighboring citizen report(s) from within 50m across the street were automatically merged into this issue, elevating community priority score and unified field triage.
                </span>
              </div>
            )}

            {/* SLA Status Banner */}
            {sla && (
              <div className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${sla.color}`}>
                <Clock className="w-4 h-4 shrink-0" />
                <span>{sla.text}</span>
              </div>
            )}

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Department</span>
                <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-teal-600" />
                  <span>{complaint.assignedDepartment}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location &amp; Locality</span>
                <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">{complaint.address}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reported On</span>
                <div className="font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>
                    {new Date(complaint.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Description */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Citizen Report Description</span>
              <p className="text-sm text-slate-800 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
                {complaint.description}
              </p>
            </div>

            {/* Evidence Photos: Before & After */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Photographic Verification</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reported Photo */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Initial Citizen Report Photo</span>
                    <span className="text-slate-400">Original Condition</span>
                  </div>
                  {complaint.imageUrl ? (
                    <div>
                      <img src={complaint.imageUrl} alt="Before" className="w-full h-48 object-cover" />
                      <div className="p-3">
                        <PhotoVerificationBadge
                          imageUrl={complaint.imageUrl}
                          photoFingerprint={complaint.photoFingerprint}
                          photoMetadata={complaint.photoMetadata}
                          isFlaggedLocationMismatch={complaint.isFlaggedLocationMismatch}
                          locationMatchStatus={complaint.locationMatchStatus}
                          photoDistanceMeters={complaint.photoDistanceMeters}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                      No initial photo attached
                    </div>
                  )}
                </div>

                {/* Resolved After Photo */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>Official Resolution Proof</span>
                    <span className="text-emerald-600 font-bold">Field Proof</span>
                  </div>
                  {complaint.afterImageUrl ? (
                    <img src={complaint.afterImageUrl} alt="After" className="w-full h-48 object-cover" />
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                      <Clock className="w-6 h-6 text-slate-300 mb-1" />
                      <span>Resolution in progress</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Photo proof uploaded upon completion</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Official Resolution Summary (if resolved) */}
            {complaint.resolutionSummary && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Official Resolution Summary</span>
                </div>
                <p className="text-sm text-emerald-950 leading-relaxed font-medium">
                  {complaint.resolutionSummary}
                </p>
                {complaint.resolvedAt && (
                  <p className="text-[11px] text-emerald-700 pt-1">
                    Verified on {new Date(complaint.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Audit Trail Timeline */}
          <div className="syntrix-card bg-white p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Official Lifecycle &amp; Audit Trail</h3>
                <p className="text-xs text-slate-500">
                  Immutable chronological record of each status change and acting official
                </p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 font-mono px-2.5 py-1 rounded-lg border border-slate-200">
                {history.length} Event{history.length === 1 ? '' : 's'}
              </span>
            </div>

            <Timeline history={history} />
          </div>

          {/* Public Official Updates */}
          {notes.length > 0 && (
            <div className="syntrix-card bg-white p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileText className="w-4 h-4 text-teal-600" />
                <h3>Official Communications</h3>
              </div>

              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span className="font-semibold text-slate-800">{note.authorName} ({note.department})</span>
                      <span>{new Date(note.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
