import React, { useEffect, useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  PlusCircle,
  ThumbsUp,
  MapPin,
  Calendar,
  ArrowRight,
  ShieldAlert,
  User,
} from 'lucide-react';
import { api } from '../lib/api';
import { Complaint } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { useAuth } from '../context/AuthContext';

interface Props {
  onTrackNavigate: (reference: string) => void;
  onReportNavigate: () => void;
}

export const CitizenDashboardPage: React.FC<Props> = ({ onTrackNavigate, onReportNavigate }) => {
  const { currentUser } = useAuth();
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [upvotedComplaints, setUpvotedComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCitizenData() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const res = await api.getComplaints();
        const all = res.complaints || [];

        // Issues reported by active user
        const mine = all.filter((c) => c.reporterId === currentUser.id);
        // Issues upvoted by active user
        const upvoted = all.filter((c) => c.hasUserVoted && c.reporterId !== currentUser.id);

        setMyComplaints(mine);
        setUpvotedComplaints(upvoted);
      } catch (err) {
        console.error('Failed to load citizen complaints', err);
      } finally {
        setLoading(false);
      }
    }
    loadCitizenData();
  }, [currentUser]);

  const activeCount = myComplaints.filter(
    (c) => c.status === 'Submitted' || c.status === 'Acknowledged' || c.status === 'In Progress'
  ).length;
  const resolvedCount = myComplaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Profile Greeting */}
      <div className="syntrix-card bg-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={
              currentUser?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt={currentUser?.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-600"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{currentUser?.name}</h1>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-200">
                Verified Citizen
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email} • Metro District Resident</p>
          </div>
        </div>

        <button
          onClick={onReportNavigate}
          className="self-start md:self-auto flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Report New Problem</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="syntrix-card bg-white p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Reports Filed</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{myComplaints.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Recorded in municipal database</p>
        </div>

        <div className="syntrix-card bg-white p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active In Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{activeCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting or undergoing field repairs</p>
        </div>

        <div className="syntrix-card bg-white p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{resolvedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Closed with photographic proof</p>
        </div>
      </div>

      {/* Submitted Complaints Table / Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">My Reported Issues</h2>
          <span className="text-xs text-slate-500">{myComplaints.length} issues submitted</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading citizen records...</div>
        ) : myComplaints.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <p className="text-xs text-slate-500">You haven't submitted any complaints under this account yet.</p>
            <button
              onClick={onReportNavigate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Report Your First Civic Issue
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {myComplaints.map((c) => (
              <div
                key={c.id}
                onClick={() => onTrackNavigate(c.reference)}
                className="p-5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      {c.reference}
                    </span>
                    <StatusBadge status={c.status} size="sm" />
                    <PriorityBadge priority={c.priority} size="sm" showIcon={false} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {c.address}
                    </span>
                    <span>•</span>
                    <span>{c.assignedDepartment}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right text-xs">
                    <div className="text-slate-400 font-medium">
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-slate-600 font-semibold">{c.votesCount} endorsements</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Endorsed Community Issues */}
      {upvotedComplaints.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Community Reports You Endorsed</h2>
            </div>
            <span className="text-xs text-slate-500">{upvotedComplaints.length} reports supported</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upvotedComplaints.map((c) => (
              <div
                key={c.id}
                onClick={() => onTrackNavigate(c.reference)}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-mono font-bold text-teal-700">{c.reference}</span>
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-xs line-clamp-1 mb-1">{c.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{c.address}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{c.votesCount} total endorsements</span>
                  <span className="text-teal-600 font-semibold">Track &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
