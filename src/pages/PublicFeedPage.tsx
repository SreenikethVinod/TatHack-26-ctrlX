import React, { useEffect, useState } from 'react';
import {
  ThumbsUp,
  Search,
  Filter,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardHat,
  Eye,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Share2,
  Copy,
  Check,
  User,
  Users,
  Building,
  Landmark,
  PlusCircle,
  ArrowUpDown,
  Flame,
  ShieldCheck,
  MessageSquare,
  Bell,
  BellRing,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint, ComplaintCategory, PriorityLevel } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { PhotoVerificationBadge } from '../components/PhotoVerificationBadge';
import { useAuth } from '../context/AuthContext';

interface Props {
  onTrackNavigate: (reference: string) => void;
  onReportNavigate: () => void;
  onMapNavigate?: () => void;
}

export const PublicFeedPage: React.FC<Props> = ({
  onTrackNavigate,
  onReportNavigate,
  onMapNavigate,
}) => {
  const { currentUser, switchUser, isCitizen, isMunicipalityAdmin, isDistrictAdmin } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'endorsed' | 'recent' | 'priority'>('endorsed');

  // Voting & Follow feedback states
  const [votingId, setVotingId] = useState<string | null>(null);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ id: string; text: string; success: boolean } | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getComplaints();
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error('Failed to load public feed complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [currentUser]);

  // Handle endorsement toggle
  const handleEndorse = async (complaintId: string) => {
    if (!currentUser) {
      alert('Please sign in to endorse civic issues.');
      return;
    }

    setVotingId(complaintId);
    try {
      const res = await api.voteComplaint(complaintId);
      // Update local complaint state immediately
      setComplaints((prev) =>
        prev.map((c) => {
          if (c.id === complaintId) {
            return {
              ...c,
              votesCount: res.votesCount,
              hasUserVoted: res.hasUserVoted,
            };
          }
          return c;
        })
      );

      setToastMsg({
        id: complaintId,
        text: res.message || 'Endorsement updated successfully.',
        success: true,
      });

      setTimeout(() => {
        setToastMsg(null);
      }, 3500);
    } catch (err: any) {
      setToastMsg({
        id: complaintId,
        text: err.message || 'Could not record endorsement.',
        success: false,
      });
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setVotingId(null);
    }
  };

  // Handle follow report toggle
  const handleToggleFollow = async (complaintId: string) => {
    if (!currentUser) {
      alert('Please sign in to follow reports.');
      return;
    }

    setFollowingId(complaintId);
    try {
      const res = await api.followComplaint(complaintId);
      setComplaints((prev) =>
        prev.map((c) => {
          if (c.id === complaintId) {
            return {
              ...c,
              isFollowing: res.isFollowing,
              followersCount: res.followersCount,
            };
          }
          return c;
        })
      );

      setToastMsg({
        id: complaintId,
        text: res.message || (res.isFollowing ? 'You are now following this report! You will receive live updates when progress occurs.' : 'You have unfollowed this report.'),
        success: true,
      });

      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setToastMsg({
        id: complaintId,
        text: err.message || 'Could not update follow status.',
        success: false,
      });
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setFollowingId(null);
    }
  };

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Switch persona handler for rapid testing between Citizen 1, Citizen 2, Muni, District
  const handleQuickSwitch = async (userId: string) => {
    await switchUser(userId);
    await loadComplaints();
  };

  // Filter and sort complaints
  const filtered = complaints.filter((c) => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'escalated') {
        if (!c.status.toLowerCase().includes('district') && !c.status.toLowerCase().includes('escalat')) {
          return false;
        }
      } else if (c.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(term);
      const matchRef = c.reference.toLowerCase().includes(term);
      const matchAddress = c.address.toLowerCase().includes(term);
      const matchLocality = c.locality.toLowerCase().includes(term);
      const matchDesc = c.description.toLowerCase().includes(term);
      const matchReporter = c.reporterName.toLowerCase().includes(term);
      return matchTitle || matchRef || matchAddress || matchLocality || matchDesc || matchReporter;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'endorsed') {
      return (b.votesCount || 0) - (a.votesCount || 0);
    }
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'priority') {
      const priorityWeights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
    }
    return 0;
  });

  // Calculate community stats
  const totalReports = complaints.length;
  const totalVotes = complaints.reduce((sum, c) => sum + (c.votesCount || 0), 0);
  const highTrustCount = complaints.filter((c) => (c.votesCount || 0) >= 2).length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  // Category labels helper
  const categoryLabels: Record<string, string> = {
    road_damage: 'Road & Pavement',
    waste_management: 'Waste Management',
    drainage: 'Drainage & Stormwater',
    streetlights: 'Streetlights & Electrical',
    water_supply: 'Water Supply',
    public_safety: 'Public Safety Infrastructure',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Persona Tester Quick-Switch Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <span>Active Persona Tester</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-sm font-semibold text-slate-100">
                Viewing feed as:{' '}
                <span className="font-extrabold text-white">
                  {currentUser?.name || 'Guest Citizen'}
                </span>{' '}
                <span className="text-xs text-indigo-200 font-mono">
                  ({currentUser?.email || 'Not logged in'})
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
            {isDistrictAdmin
              ? '👑 Higher Authority Oversight'
              : isMunicipalityAdmin
              ? '🏢 Municipality Administrator'
              : currentUser?.email === 'citizen2@civicpulse.org'
              ? '👍 Citizen 2 (Maya Lin) • Ready to Endorse'
              : '📝 Citizen 1 (Alex Morgan)'}
          </div>
        </div>

        {/* 1-Click Switch Persona Buttons */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Switch Persona to Test Endorsement:
          </span>

          <button
            onClick={() => handleQuickSwitch('user-citizen-primary')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentUser?.email === 'citizen@civicpulse.org'
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Citizen 1 (Alex Morgan)</span>
          </button>

          <button
            onClick={() => handleQuickSwitch('user-citizen-secondary')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentUser?.email === 'citizen2@civicpulse.org'
                ? 'bg-indigo-500 text-white shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Log in as second citizen to endorse citizen 1 reports"
          >
            <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Citizen 2 (Maya Lin) • Endorse Issues</span>
          </button>

          <button
            onClick={() => handleQuickSwitch('user-muni-primary')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMunicipalityAdmin
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Muni Admin</span>
          </button>

          <button
            onClick={() => handleQuickSwitch('user-district-primary')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isDistrictAdmin
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>District Admin</span>
          </button>
        </div>
      </div>

      {/* 2. Public Feed Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Community Corroboration &amp; Trust Stream</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Public Civic Feed
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Public reports submitted by citizens across city wards. Endorse issues in your neighborhood to
            corroborate authenticity, elevate priority scores, and verify public trust.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onReportNavigate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report New Issue</span>
          </button>

          {onMapNavigate && (
            <button
              onClick={onMapNavigate}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Map View</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Community Impact Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Public Reports</span>
          <div className="text-2xl font-black text-slate-900">{totalReports}</div>
          <div className="text-[11px] text-slate-500">Active municipal reports</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
            <ThumbsUp className="w-3 h-3 text-indigo-600" />
            <span>Total Endorsements</span>
          </span>
          <div className="text-2xl font-black text-indigo-600">{totalVotes}</div>
          <div className="text-[11px] text-slate-500">Citizen corroborations</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>High Trustability</span>
          </span>
          <div className="text-2xl font-black text-emerald-700">{highTrustCount}</div>
          <div className="text-[11px] text-slate-500">Corroborated by ≥2 neighbors</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolved</span>
          <div className="text-2xl font-black text-slate-900">{resolvedCount}</div>
          <div className="text-[11px] text-slate-500">Fixed &amp; closed by city</div>
        </div>
      </div>

      {/* 4. Filter & Search Control Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reports by title, street, reference ID, or reporter name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="endorsed">Most Endorsed (High Trust)</option>
                <option value="recent">Newest Reports First</option>
                <option value="priority">Highest Priority Score</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted (Pending Review)</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="escalated">Escalated to District (&gt;14d)</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Category:
          </span>
          {[
            { id: 'all', label: 'All Issues' },
            { id: 'road_damage', label: 'Road & Pavement' },
            { id: 'waste_management', label: 'Waste Management' },
            { id: 'drainage', label: 'Drainage' },
            { id: 'streetlights', label: 'Streetlights' },
            { id: 'water_supply', label: 'Water Supply' },
            { id: 'public_safety', label: 'Public Safety' },
            { id: 'other', label: 'Other' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Toast for Endorsement Feedback */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200 ${
            toastMsg.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{toastMsg.text}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5. Main Feed Cards Stream */}
      {loading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading community civic reports...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
            <Flame className="w-7 h-7 text-indigo-500" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-extrabold text-slate-900">No civic reports found in feed</h3>
            <p className="text-xs text-slate-500">
              {search || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No reports match your selected search terms or filters. Try adjusting your criteria.'
                : 'Be the first citizen to report a civic issue in your ward!'}
            </p>
          </div>
          <button
            onClick={onReportNavigate}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Create New Report
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((complaint) => {
            const hasVoted = Boolean(complaint.hasUserVoted);
            const votesCount = complaint.votesCount || 0;
            const isEscalated =
              complaint.status.toLowerCase().includes('district') ||
              complaint.status.toLowerCase().includes('escalat');
            const isAcknowledged =
              complaint.status === 'Acknowledged' ||
              complaint.status === 'In Progress' ||
              complaint.status === 'Resolved';
            const hasWorker = Boolean(complaint.assignedWorker);

            // Calculate trust score & reliability meter
            const trustScore = Math.min(100, Math.max(20, votesCount * 25));
            let trustLabel = 'Single Citizen Report';
            let trustBadgeColor = 'text-slate-600 bg-slate-100 border-slate-200';
            if (votesCount >= 4) {
              trustLabel = `High Trust Community Verified (${votesCount} Endorsements)`;
              trustBadgeColor = 'text-emerald-800 bg-emerald-50 border-emerald-300';
            } else if (votesCount >= 2) {
              trustLabel = `Corroborated by ${votesCount} Residents (+25% Priority Weight)`;
              trustBadgeColor = 'text-indigo-800 bg-indigo-50 border-indigo-300';
            }

            return (
              <article
                key={complaint.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-all shadow-2xs"
              >
                {/* Card Header: Author, Date, Reference, Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {complaint.reporterName ? complaint.reporterName[0].toUpperCase() : 'C'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 leading-tight">
                          {complaint.reporterName || 'Citizen Resident'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Verified Citizen
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(complaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
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
                    {complaint.isMerged && (
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1" title="Spatial Auto-Merge: Clustered with nearby report (~50m across road)">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>Auto-Merged (~50m)</span>
                      </span>
                    )}

                    {/* Reference ID Pill */}
                    <button
                      type="button"
                      onClick={() => handleCopyRef(complaint.reference)}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Click to copy tracking reference"
                    >
                      <span>{complaint.reference}</span>
                      {copiedRef === complaint.reference ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Body: Title, Description, Location, Photo */}
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                      {categoryLabels[complaint.category] || complaint.category}
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                      {complaint.title}
                    </h2>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {complaint.description}
                  </p>

                  {/* Physical Location Pin */}
                  <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
                    <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-slate-900">{complaint.address}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500 font-medium">{complaint.locality || 'Central Ward'}</span>
                  </div>

                  {/* Photo Evidence if uploaded */}
                  {complaint.imageUrl && (
                    <div className="pt-1 space-y-2">
                      <img
                        src={complaint.imageUrl}
                        alt={complaint.title}
                        className="w-full max-h-72 object-cover rounded-2xl border border-slate-200 shadow-2xs"
                      />
                      <PhotoVerificationBadge
                        imageUrl={complaint.imageUrl}
                        photoFingerprint={complaint.photoFingerprint}
                        photoMetadata={complaint.photoMetadata}
                        isFlaggedLocationMismatch={complaint.isFlaggedLocationMismatch}
                        locationMatchStatus={complaint.locationMatchStatus}
                        photoDistanceMeters={complaint.photoDistanceMeters}
                      />
                    </div>
                  )}

                  {/* Worker Assignment & Budget Callout if municipal action has commenced */}
                  {(hasWorker || (complaint.budget && complaint.budget > 0)) && (
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs space-y-2">
                      <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                        <HardHat className="w-4 h-4 text-indigo-600" />
                        <span>Municipal Work Order &amp; Repair Budget Sanctioned</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <span className="text-slate-500">Assigned Worker / Crew:</span>{' '}
                          <strong className="text-slate-900">{complaint.assignedWorker}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Allocated Budget:</span>{' '}
                          <strong className="text-emerald-700 font-mono">
                            ₹{Number(complaint.budget).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                      {complaint.budgetNotes && (
                        <div className="text-[11px] text-indigo-800 italic pt-1 border-t border-indigo-100">
                          Work Scope: {complaint.budgetNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Escalation Notice if over 14 days unacknowledged */}
                  {isEscalated && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-purple-700 shrink-0" />
                      <div>
                        <strong>District Executive Order Active:</strong> Escalated to District Admin Dr. Elena Rostova
                        because this report remained unacknowledged for more than 14 days.
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Community Endorsement & Trustability Gauge */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  {/* Trustability Meter */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${trustBadgeColor}`}>
                        {trustLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Community Weight:</span>
                      <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            votesCount >= 4
                              ? 'bg-emerald-500'
                              : votesCount >= 2
                              ? 'bg-indigo-600'
                              : 'bg-amber-400'
                          }`}
                          style={{ width: `${trustScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-700">{trustScore}%</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Big Interactive Endorsement Button */}
                      <button
                        type="button"
                        onClick={() => handleEndorse(complaint.id)}
                        disabled={votingId === complaint.id}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          hasVoted
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                        title={
                          hasVoted
                            ? 'You have endorsed this issue. Click to withdraw endorsement.'
                            : 'Click to endorse and corroborate this issue as a neighbor.'
                        }
                      >
                        <ThumbsUp
                          className={`w-4 h-4 ${hasVoted ? 'fill-current text-white' : 'text-indigo-600'} ${
                            votingId === complaint.id ? 'animate-bounce' : ''
                          }`}
                        />
                        <span>
                          {hasVoted ? '✓ You Endorsed' : 'Endorse Issue'} ({votesCount})
                        </span>
                      </button>

                      {/* Follow Report Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleFollow(complaint.id)}
                        disabled={followingId === complaint.id}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                          complaint.isFollowing
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                        }`}
                        title={
                          complaint.isFollowing
                            ? 'Following: You will receive real-time notifications when this report is updated. Click to unfollow.'
                            : 'Follow this report to receive in-app notifications on all inspections, status updates & resolutions.'
                        }
                      >
                        {complaint.isFollowing ? (
                          <BellRing className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Bell className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>
                          {complaint.isFollowing ? 'Following' : 'Follow Report'} ({complaint.followersCount || 1})
                        </span>
                      </button>
                    </div>

                    {/* Quick navigation actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onTrackNavigate(complaint.reference)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Track Status</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyRef(complaint.reference)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                        title="Copy Reference ID"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
