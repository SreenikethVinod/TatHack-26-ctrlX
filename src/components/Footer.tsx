import React, { useState } from 'react';
import { Flame, RotateCcw, Presentation, ShieldCheck, HeartHandshake } from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  onOpenPitch: () => void;
  onDataReset?: () => void;
}

export const Footer: React.FC<Props> = ({ onOpenPitch, onDataReset }) => {
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleReset = async () => {
    if (!confirm('Reset CivicPulse demo dataset to initial 16 verified sample records?')) return;
    setResetting(true);
    try {
      const res = await api.resetDemoData();
      setResetMsg(res.message);
      if (onDataReset) onDataReset();
      setTimeout(() => setResetMsg(null), 4000);
    } catch (err: any) {
      alert('Failed to reset dataset: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & description */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Flame className="w-4 h-4 fill-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">CivicPulse</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                  Hackathon Edition 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Transparent Citizen-to-Government Reporting & SLA Resolution Engine.
              </p>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenPitch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Presentation className="w-3.5 h-3.5 text-amber-400" />
              <span>Pitch Deck &amp; Presentation</span>
            </button>
          </div>
        </div>

        {resetMsg && (
          <div className="mt-4 p-2 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-lg text-center text-xs">
            {resetMsg}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <p>
            Official civic engagement platform for community grievance redressal, municipal SLA tracking, and public auditability.
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Verified SLA Engine
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
              Community Endorsed
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
