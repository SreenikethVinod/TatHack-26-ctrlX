import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Zap, Clock, ArrowUp } from 'lucide-react';
import { api } from '../lib/api';
import { Complaint } from '../types';

interface ActivityItem {
  id: string;
  icon: 'critical' | 'resolved' | 'escalated' | 'new' | 'progress';
  label: string;
  ref: string;
  time: string;
}

const ICON_MAP = {
  critical: { icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  escalated: { icon: ArrowUp, color: 'text-amber-500', bg: 'bg-amber-50' },
  new: { icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  progress: { icon: Clock, color: 'text-sky-500', bg: 'bg-sky-50' },
};

function complaintsToActivity(complaints: Complaint[]): ActivityItem[] {
  return complaints
    .slice(0, 12)
    .map((c) => {
      let icon: ActivityItem['icon'] = 'new';
      let label = '';

      if (c.status === 'Resolved') {
        icon = 'resolved';
        label = `Resolved: ${c.title.slice(0, 28)}`;
      } else if (c.status === 'Escalated to District Admin') {
        icon = 'escalated';
        label = `Escalated → District: ${c.title.slice(0, 22)}`;
      } else if (c.priority === 'Critical') {
        icon = 'critical';
        label = `🔴 CRITICAL: ${c.title.slice(0, 26)}`;
      } else if (c.status === 'In Progress') {
        icon = 'progress';
        label = `In Progress: ${c.title.slice(0, 26)}`;
      } else {
        icon = 'new';
        label = `Reported: ${c.title.slice(0, 28)}`;
      }

      const date = new Date(c.createdAt || Date.now());
      const diff = Math.floor((Date.now() - date.getTime()) / 60000);
      const time =
        diff < 1
          ? 'just now'
          : diff < 60
          ? `${diff}m ago`
          : diff < 1440
          ? `${Math.floor(diff / 60)}h ago`
          : `${Math.floor(diff / 1440)}d ago`;

      return { id: c.id, icon, label, ref: c.reference || c.id, time };
    });
}

export const LiveActivityTicker: React.FC = () => {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchActivity = async () => {
    try {
      const res = await api.getComplaints();
      if (res?.complaints) {
        setItems(complaintsToActivity(res.complaints));
      }
    } catch {
      // Silent fail — non-critical widget
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 8000);
    return () => clearInterval(interval);
  }, []);

  if (!visible || items.length === 0) return null;

  return (
    <div className="px-2 mt-3 mb-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live</span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-[8px] text-slate-300 hover:text-slate-500 cursor-pointer transition-colors"
          title="Hide activity feed"
        >
          ✕
        </button>
      </div>

      {/* Scrolling items */}
      <div
        ref={containerRef}
        className="space-y-1 max-h-48 overflow-hidden relative"
      >
        {/* Fade gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#f0f2f6] to-transparent z-10 pointer-events-none" />

        {items.map((item) => {
          const cfg = ICON_MAP[item.icon];
          const Icon = cfg.icon;
          return (
            <div
              key={item.id}
              className="flex items-start gap-1.5 py-1 px-1.5 rounded-lg hover:bg-white/60 transition-colors cursor-default"
            >
              <div className={`w-4 h-4 rounded-md ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className={`w-2.5 h-2.5 ${cfg.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold text-slate-700 leading-tight truncate">
                  {item.label}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[8px] text-indigo-500 font-bold">{item.ref}</span>
                  <span className="text-[8px] text-slate-400">· {item.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
