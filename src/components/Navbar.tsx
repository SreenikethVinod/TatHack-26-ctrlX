import React, { useState } from 'react';
import {
  Shield,
  MapPin,
  BarChart3,
  Search,
  PlusCircle,
  Users,
  Compass,
  Check,
  ChevronDown,
  Presentation,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenPitch: () => void;
}

export const Navbar: React.FC<Props> = ({ currentTab, setCurrentTab, onOpenPitch }) => {
  const { currentUser, users, isOfficial, switchUser } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'landing', label: 'Home' },
    { id: 'explore', label: 'Explore Issues' },
    { id: 'track', label: 'Track Complaint' },
    { id: 'map', label: 'Civic Map' },
    { id: 'transparency', label: 'Transparency' },
    { id: 'citizen-dashboard', label: 'My Reports' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => setCurrentTab('landing')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black group-hover:bg-indigo-700 transition-colors">
                <Flame className="w-5 h-5 fill-white text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight text-white">CivicPulse</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-1.5 py-0.2 rounded">
                    GovTech
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-1 hidden sm:block">Citizen Resolution Platform</p>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-800 text-teal-400 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}

              {/* Official Dashboard link */}
              <button
                onClick={() => setCurrentTab('official-dashboard')}
                className={`ml-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  currentTab === 'official-dashboard'
                    ? 'bg-teal-600 text-white font-bold'
                    : isOfficial
                    ? 'bg-slate-800/90 text-teal-300 border border-teal-500/30 hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>Officer Workstation</span>
                {isOfficial && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                )}
              </button>
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isOfficial
                    ? 'bg-indigo-950 border-indigo-700 text-indigo-200 hover:bg-indigo-900'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
                title="Switch Demo Role"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOfficial ? 'bg-indigo-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="max-w-[100px] sm:max-w-[130px] truncate">
                  {currentUser?.name || 'Demo User'}
                </span>
                <span
                  className={`hidden sm:inline-block text-[9px] px-1 rounded uppercase font-bold tracking-wider ${
                    isOfficial
                      ? 'bg-indigo-800 text-indigo-100'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isOfficial ? 'Official' : 'Citizen'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-300 text-slate-900 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Demo Persona
                    </span>
                  </div>

                  <div className="p-1 space-y-1">
                    {users.map((u) => {
                      const isCurrent = currentUser?.id === u.id;
                      const userIsOfficial = u.role === 'official';

                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.id);
                            setRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-50 text-indigo-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                            <div>
                              <div className="font-semibold">{u.name}</div>
                              <div className="text-[10px] text-slate-400">
                                {u.department || (userIsOfficial ? 'Municipal Officer' : 'Verified Resident')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                userIsOfficial
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {userIsOfficial ? 'Gov' : 'Citizen'}
                            </span>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-600 ml-1" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="px-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                    Role-based server authorization actively enforced on all API requests.
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => setCurrentTab('report')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Report Issue</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-slate-800 text-xs no-scrollbar gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`px-2.5 py-1 whitespace-nowrap rounded-md font-medium ${
                currentTab === item.id ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => setCurrentTab('official-dashboard')}
            className={`px-2.5 py-1 whitespace-nowrap rounded-md font-medium ${
              currentTab === 'official-dashboard' ? 'bg-teal-600 text-white font-bold' : 'text-slate-400'
            }`}
          >
            Officer
          </button>
        </div>
      </div>
    </header>
  );
};
