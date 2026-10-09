import React, { useState } from 'react';
import {
  User,
  Shield,
  RotateCcw,
  Check,
  Building,
  Mail,
  Calendar,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export const ProfilePage: React.FC = () => {
  const { currentUser, users, switchUser, isOfficial } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleResetData = async () => {
    if (!confirm('Reset CivicPulse database to default 16 verified sample records?')) return;
    setResetting(true);
    try {
      const res = await api.resetDemoData();
      setResetMsg(res.message);
      setTimeout(() => setResetMsg(null), 4000);
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
          <User className="w-3.5 h-3.5" />
          <span>User Authentication &amp; RBAC</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          User Profile &amp; Role Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          View your active account details, assigned municipal department, and system access tier.
        </p>
      </div>

      {/* Active User Card */}
      <div className="syntrix-card p-6 sm:p-8 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={
              currentUser?.avatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            alt={currentUser?.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-600"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{currentUser?.name}</h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  isOfficial
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isOfficial ? 'Municipal Official' : 'Resident Citizen'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {currentUser?.email}
              </span>
              {currentUser?.department && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-indigo-700 font-semibold">
                    <Building className="w-3.5 h-3.5" />
                    {currentUser.department}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="font-semibold text-slate-800">RBAC Status:</div>
          <div>{isOfficial ? 'Full Dispatch Permissions' : 'Public Citizen Rights'}</div>
        </div>
      </div>
    </div>
  );
};
