import React from 'react';
import { Calendar, CheckCircle2, Clock, UserCheck, ShieldCheck } from 'lucide-react';
import { ComplaintHistoryEntry } from '../types';
import { StatusBadge } from './StatusBadge';

interface Props {
  history: ComplaintHistoryEntry[];
}

export const Timeline: React.FC<Props> = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm">No activity history recorded yet.</p>
      </div>
    );
  }

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return {
        dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timeStr: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { dateStr: isoString, timeStr: '' };
    }
  };

  return (
    <div className="relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 space-y-6">
      {history.map((entry, idx) => {
        const { dateStr, timeStr } = formatDate(entry.timestamp);
        const isOfficial = entry.actorRole.toLowerCase().includes('official') || entry.actorRole.toLowerCase().includes('admin');
        const isResolved = entry.newStatus === 'Resolved';

        return (
          <div key={entry.id || idx} className="relative group">
            {/* Dot marker */}
            <div
              className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isResolved
                  ? 'bg-emerald-500 border-white ring-4 ring-emerald-100 text-white'
                  : isOfficial
                  ? 'bg-teal-600 border-white ring-4 ring-teal-100 text-white'
                  : 'bg-slate-400 border-white ring-4 ring-slate-100 text-white'
              }`}
            >
              {isResolved ? (
                <CheckCircle2 className="w-3 h-3 stroke-[3]" />
              ) : isOfficial ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </div>

            {/* Event Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 transition-colors hover:border-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {entry.previousStatus === 'None' ? 'Initial Submission' : 'Status Transition'}
                  </span>
                  {entry.newStatus && (
                    <StatusBadge status={entry.newStatus as any} size="sm" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dateStr}</span>
                  <span className="text-slate-300">•</span>
                  <span>{timeStr}</span>
                </div>
              </div>

              {/* Public update narrative */}
              <p className="text-sm text-slate-800 leading-relaxed font-normal">
                {entry.publicUpdate}
              </p>

              {/* Actor credit */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700">{entry.actorName}</span>
                </div>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                    isOfficial ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {entry.actorRole}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
