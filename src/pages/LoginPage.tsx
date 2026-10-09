import React, { useState } from 'react';
import {
  User,
  Building,
  Landmark,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  UserPlus,
  Check,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onLoginSuccess: (targetRole: 'citizen' | 'municipality' | 'district') => void;
  onCancel?: () => void;
}

type RoleType = 'citizen' | 'municipality' | 'district';

export const LoginPage: React.FC<Props> = ({ onLoginSuccess, onCancel }) => {
  const { login, register, currentUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [activeRole, setActiveRole] = useState<RoleType>('citizen');

  // Form states - starting empty for real user authentication
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Public Works & Roads');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const roleConfigs = {
    citizen: {
      role: 'citizen' as RoleType,
      title: 'Citizen Resident',
      badge: 'Public Citizen',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: User,
      description: 'Report civic issues in your neighborhood, track the status of your reports in real time, and see assigned workers and budgets.',
      features: [
        'Create new civic reports with photo and location',
        'Real-time status tracking (Submitted → Acknowledged → In Progress → Resolved)',
        'View worker assigned and budget allocated to fix your report',
        'Endorse & upvote neighborhood community issues',
      ],
    },
    municipality: {
      role: 'municipality' as RoleType,
      title: 'Municipality Admin',
      badge: 'Municipal Authority',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Building,
      description: 'View incoming citizen reports, review & acknowledge them, and assign tasks to workers with repair budgets before the 14-day SLA expires.',
      features: [
        'Review incoming civic complaints across city wards',
        'Formally Acknowledge reports to prevent 14-day automatic escalation',
        'Assign tasks to workers and specify repair budget required',
        'Monitor the 14-day statutory countdown on unacknowledged reports',
      ],
    },
    district: {
      role: 'district' as RoleType,
      title: 'District Admin',
      badge: 'Higher Authority Oversight',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Landmark,
      description: 'Higher-authority oversight console for all reports remaining unacknowledged by municipal bodies for over 14 days, with executive intervention powers.',
      features: [
        'Dedicated queue for reports Unacknowledged > 14 Days',
        'Higher-authority executive intervention and emergency funding',
        'Issue formal compliance directives to municipal department heads',
        'District-wide governance compliance & responsiveness analytics',
      ],
    },
  };

  const handleRoleSelect = (role: RoleType) => {
    setActiveRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);
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
      if (mode === 'login') {
        const user = await login(email.trim(), password.trim());
        setSuccessMsg(`Welcome, ${user.name}!`);

        // Determine destination role
        let targetRole: RoleType = activeRole;
        if ((user as any).systemRole === 'DISTRICT_REVIEWER' || user.email.toLowerCase().includes('district')) {
          targetRole = 'district';
        } else if (
          user.role === 'official' ||
          (user as any).systemRole === 'SUPERVISOR' ||
          (user as any).systemRole === 'PANCHAYAT_OFFICER' ||
          user.email.toLowerCase().includes('municipality')
        ) {
          targetRole = 'municipality';
        } else {
          targetRole = 'citizen';
        }

        setTimeout(() => {
          onLoginSuccess(targetRole);
        }, 500);
      } else {
        // Register flow
        if (!name.trim()) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }

        let systemRole = 'CITIZEN';
        if (activeRole === 'municipality') systemRole = 'SUPERVISOR';
        if (activeRole === 'district') systemRole = 'DISTRICT_REVIEWER';

        const user = await register({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role: systemRole,
          department: activeRole !== 'citizen' ? department : undefined,
        });

        setSuccessMsg(`Account created successfully! Welcome, ${user.name}.`);
        setTimeout(() => {
          onLoginSuccess(activeRole);
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const currentCfg = roleConfigs[activeRole];
  const Icon = currentCfg.icon;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Platform Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>CivicPulse Governance &amp; Grievance Management</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Civic Portal Login
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          Sign in or register to access your role-specific console: Citizen, Municipality Admin, or District Higher Authority.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['citizen', 'municipality', 'district'] as RoleType[]).map((role) => {
          const cfg = roleConfigs[role];
          const TabIcon = cfg.icon;
          const isSelected = activeRole === role;

          return (
            <button
              key={role}
              type="button"
              onClick={() => handleRoleSelect(role)}
              className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-white border-indigo-600 ring-2 ring-indigo-600/10 shadow-xs'
                  : 'bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <TabIcon className="w-5 h-5" />
                  </div>
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Select</span>
                  )}
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900">{cfg.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {cfg.description}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {isSelected ? 'Active Selection' : 'Click to Select'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Authentication Card */}
      <div className="syntrix-card bg-white p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Sign In / Register (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${currentCfg.badgeColor}`}>
                  {currentCfg.badge}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {mode === 'login' ? 'Authentication' : 'Create Account'}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                {mode === 'login' ? `Sign In as ${currentCfg.title}` : `Register as ${currentCfg.title}`}
              </h2>
            </div>

            {/* Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Have an account? Log In'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={mode === 'register'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                  placeholder="e.g. Alex Morgan"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Address</span>
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Password</span>
                </span>
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

            {mode === 'register' && activeRole !== 'citizen' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Department</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white"
                >
                  <option value="Public Works & Roads">Public Works & Roads</option>
                  <option value="Sanitation & Waste Management">Sanitation & Waste Management</option>
                  <option value="Drainage & Flood Control">Drainage & Flood Control</option>
                  <option value="Electrical & Street Lighting">Electrical & Street Lighting</option>
                  <option value="Water Supply & Sanitation Board">Water Supply & Sanitation Board</option>
                  <option value="Public Safety & Urban Infrastructure">Public Safety & Urban Infrastructure</option>
                  <option value="District Headquarters & Oversight">District Headquarters & Oversight</option>
                </select>
              </div>
            )}

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
                ) : mode === 'login' ? (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Enter as {currentCfg.title}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create &amp; Sign In</span>
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

        {/* Right Info: Role Responsibilities & Governance Rules (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200/80 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs">
              <Icon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Governance Scope
              </span>
              <h3 className="font-extrabold text-slate-900 text-sm">
                {currentCfg.title} Privileges
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {currentCfg.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600 leading-snug">
                <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {/* 14-Day Statutory Rule Callout */}
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>14-Day Unacknowledged Rule</span>
            </div>
            <p className="text-amber-700 leading-relaxed text-[10px]">
              If a citizen report remains unacknowledged for more than 14 days, the platform automatically escalates the report directly to the District Admin for higher-authority intervention.
            </p>
          </div>

          {/* Live Session Notice */}
          <div className="pt-2 text-[11px] text-slate-400">
            Current session: <span className="font-semibold text-slate-600">{currentUser ? currentUser.name : 'Not signed in'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
