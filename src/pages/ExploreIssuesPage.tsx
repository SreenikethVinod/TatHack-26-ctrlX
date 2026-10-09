import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  MapPin,
  ThumbsUp,
  Clock,
  Calendar,
  Building,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint, ComplaintCategory, ComplaintStatus, PriorityLevel } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { useAuth } from '../context/AuthContext';

interface Props {
  onSelectComplaint: (reference: string) => void;
  onReportNavigate: () => void;
}

export const ExploreIssuesPage: React.FC<Props> = ({ onSelectComplaint, onReportNavigate }) => {
  const { currentUser } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'votes'>('newest');

  // Voting state tracker
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.getComplaints({
        category: category !== 'all' ? category : undefined,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        search: search.trim() || undefined,
      });

      let list = res.complaints || [];

      if (sortBy === 'votes') {
        list.sort((a, b) => b.votesCount - a.votesCount);
      }

      setComplaints(list);
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [category, status, priority, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchList();
  };

  const handleVote = async (e: React.MouseEvent, complaintId: string) => {
    e.stopPropagation();
    if (votingId) return;
    setVotingId(complaintId);
    try {
      const res = await api.voteComplaint(complaintId);
      if (res.success) {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === complaintId
              ? { ...c, votesCount: res.votesCount, hasUserVoted: true }
              : c
          )
        );
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Community Transparency Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Explore Civic Issues
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Browse active and resolved municipal reports in your district. Upvote existing reports to elevate neighborhood priorities.
          </p>
        </div>

        <button
          onClick={onReportNavigate}
          className="self-start md:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
        >
          + Submit New Report
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="syntrix-card p-5 bg-white space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by keywords, ID (e.g. CP-2026-001), street, or locality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium text-[11px]">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Categories</option>
              <option value="road_damage">Road &amp; Pavement</option>
              <option value="waste_management">Waste &amp; Sanitation</option>
              <option value="drainage">Drainage &amp; Stormwater</option>
              <option value="streetlights">Lighting &amp; Electrical</option>
              <option value="water_supply">Water Supply</option>
              <option value="public_safety">Public Safety</option>
              <option value="other">Other Civic Issues</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium text-[11px]">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium text-[11px]">Priority:</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-400 font-medium text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500"
            >
              <option value="newest">Most Recent</option>
              <option value="votes">Most Supported</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Loading civic records from municipal database...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Search className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No complaints matched your filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting category, status, or search keywords to display all reported incidents.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setCategory('all');
              setStatus('all');
              setPriority('all');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {complaints.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectComplaint(c.reference)}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 transition-colors cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              {/* Optional Thumbnail Banner */}
              {c.imageUrl && (
                <div className="h-40 w-full overflow-hidden bg-slate-100 relative">
                  <img
                    src={c.imageUrl}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="font-mono text-[10px] font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {c.reference}
                    </span>
                  </div>
                  {c.afterImageUrl && (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Proof Attached</span>
                    </div>
                  )}
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  {!c.imageUrl && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        {c.reference}
                      </span>
                      <StatusBadge status={c.status} size="sm" />
                    </div>
                  )}

                  {c.imageUrl && (
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={c.status} size="sm" />
                      <PriorityBadge priority={c.priority} size="sm" showIcon={false} />
                    </div>
                  )}

                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-teal-700 transition-colors">
                    {c.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {c.description}
                  </p>

                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-400">
                      <Building className="w-3 h-3 shrink-0" />
                      <span className="truncate">{c.assignedDepartment}</span>
                    </div>
                  </div>
                </div>

                {/* Footer bar with Upvote Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => handleVote(e, c.id)}
                    disabled={votingId === c.id || c.hasUserVoted}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      c.hasUserVoted
                        ? 'bg-teal-50 text-teal-700 border border-teal-200 cursor-default'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${c.hasUserVoted ? 'fill-teal-600 text-teal-600' : ''}`} />
                    <span>{c.votesCount}</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
