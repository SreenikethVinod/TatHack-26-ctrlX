import React, { useState } from 'react';
import {
  Shield,
  User,
  Building,
  Landmark,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onLoginSuccess: (targetTab: string) => void;
  onCancel?: () => void;
}

type RoleType = 'citizen' | 'municipality' | 'district';

export const LoginPage: React.FC<Props> = ({ onLoginSuccess, onCancel }) => {
  const { login, currentUser, users } = useAuth();

  const [activeRole, setActiveRole] = useState<RoleType>('citizen');
  const [email, setEmail] = useState('aisha.chen@citizen.demo');
  const [password, setPassword] = useState('DemoPass123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Role metadata and sample personas
  const roleConfigs = {
    citizen: {
      title: 'Citizen Resident Portal',
      badge: 'Public Citizen Access',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: User,
      description: 'Report localized civic issues, track real-time resolution stages, and upvote neighborhood infrastructure repairs.',
      defaultEmail: 'aisha.chen@citizen.demo',
      targetTab: 'dashboard',
      personas: [
        {
          name: 'Aisha Chen',
          email: 'aisha.chen@citizen.demo',
          label: 'Citizen Lead (Central Metro)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        },
        {
          name: 'David Patel',
          email: 'david.patel@citizen.demo',
          label: 'Resident Reporter (Downtown)',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        },
      ],
      capabilities: [
        'Submit photographic civic complaints with geolocation',
        'Transparent reference ID tracking & audit timeline',
        'Upvote community concerns to amplify triage priority',
        'Public resolution verification with photographic evidence',
      ],
    },
    municipality: {
      title: 'Municipality Administration Desk',
      badge: 'Local Body Official',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Building,
      description: 'Operations console for Panchayat and Municipal department heads to triage, assign work orders, and manage SLA timers.',
      defaultEmail: 'admin@civicpulse.demo',
      targetTab: 'official-dashboard',
      personas: [
        {
          name: 'Administrator Vikram Sharma',
          email: 'admin@civicpulse.demo',
          label: 'Municipal Administrator (Full Access)',
          avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
        },
        {
          name: 'Director Marcus Vance',
          email: 'marcus.vance@gov.demo',
          label: 'Director - Public Works & Roads',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        },
        {
          name: 'Inspector Sarah Jenkins',
          email: 'sarah.jenkins@gov.demo',
          label: 'Supervisor - Sanitation & Waste',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        },
      ],
      capabilities: [
        'Enforce 24h acknowledgement and 48h active SLA cycles',
        'Assign departmental work orders and dispatch field teams',
        'Override algorithmic priority with audit-logged justifications',
        'Resolve complaints with required photographic evidence check',
      ],
    },
    district: {
      title: 'District Governance & Oversight',
      badge: 'District Reviewer & Collectorate',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Landmark,
      description: 'Collectorate-level oversight portal for escalated complaints, inactive 3-cycle municipal bottlenecks, and district accountability.',
      defaultEmail: 'elena.rostova@district.demo',
      targetTab: 'official-dashboard',
      personas: [
        {
          name: 'Commissioner Elena Rostova',
          email: 'elena.rostova@district.demo',
          label: 'District Reviewer - Collectorate Oversight',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
        },
      ],
      capabilities: [
        'Inspect the District Escalation Queue for stalled issues',
        'Intervene in 3-cycle inactive municipal bottlenecks',
        'Audit departmental resolution velocities & KPI benchmarks',
        'Review evidence verification logs before official sign-off',
      ],
    },
  };

  const handleRoleSwitch = (role: RoleType) => {
    setActiveRole(role);
    setEmail(roleConfigs[role].defaultEmail);
    setPassword('DemoPass123!');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSelectPersona = (personaEmail: string) => {
    setEmail(personaEmail);
    setPassword('DemoPass123!');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const user = await login(email.trim(), password.trim());
      setSuccessMsg(`Welcome, ${user.name}! Authenticated as ${user.role.toUpperCase()}.`);

      setTimeout(() => {
        const target = roleConfigs[activeRole].targetTab;
        onLoginSuccess(target);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const currentConfig = roleConfigs[activeRole];
  const Icon = currentConfig.icon;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-indigo-600" />
          <span>CivicPulse Syntrix Governance Portal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Role-Based Authentication Access
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Select your civic persona to enter the appropriate governance dashboard.
        </p>
      </div>

      {/* Role Selector Tabs (Clean Syntrix Flat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['citizen', 'municipality', 'district'] as RoleType[]).map((role) => {
          const cfg = roleConfigs[role];
          const TabIcon = cfg.icon;
          const isSelected = activeRole === role;

          return (
            <button
              key={role}
              onClick={() => handleRoleSwitch(role)}
              type="button"
              className={`p-4 rounded-2xl text-left border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/10 shadow-xs'
                  : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <TabIcon className="w-4.5 h-4.5" />
              </div>
              <div className="text-xs font-bold text-slate-900">{cfg.title.split(' ')[0]} {cfg.title.split(' ')[1]}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{cfg.badge}</div>
            </button>
          );
        })}
      </div>

      {/* Main Login Card (2 Columns) */}
      <div className="syntrix-card bg-white p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Persona Switcher (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${currentConfig.badgeColor}`}>
                  {currentConfig.badge}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">{currentConfig.title}</h2>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
              <Icon className="w-5 h-5" />
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {currentConfig.description}
          </p>

          {/* Quick Persona Selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick 1-Click Demo Profiles ({activeRole})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentConfig.personas.map((persona) => {
                const isChosen = email === persona.email;
                return (
                  <button
                    key={persona.email}
                    type="button"
                    onClick={() => handleSelectPersona(persona.email)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isChosen
                        ? 'bg-indigo-50/60 border-indigo-400 text-indigo-900'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <img
                      src={persona.avatar}
                      alt={persona.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{persona.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{persona.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Authorized Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                placeholder="officer@gov.demo"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Password</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Demo: DemoPass123!</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white font-mono"
                placeholder="••••••••••••"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In to {currentConfig.title.split(' ')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Role Capabilities & Governance Rules (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200/80 space-y-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Role Authority &amp; System Scope
            </span>
            <h3 className="font-extrabold text-slate-900 text-sm mt-1">
              Active Security Privileges
            </h3>
          </div>

          <div className="space-y-3">
            {currentConfig.capabilities.map((cap, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600 leading-snug">
                <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{cap}</span>
              </div>
            ))}
          </div>

          {/* Current Session Indicator */}
          <div className="pt-4 border-t border-slate-200/60 text-xs space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Currently Logged As
            </span>
            <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 truncate text-xs">
                  {currentUser?.name || 'Guest Resident'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser?.email || 'Public Citizen Session'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
            <strong className="font-bold">Backend Enforced:</strong> All status updates, SLA resets, and priority overrides require authenticated role permissions.
          </div>
        </div>
      </div>
    </div>
  );
};
