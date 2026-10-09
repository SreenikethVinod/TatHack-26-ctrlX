import React, { useState } from 'react';
import {
  Search,
  Plus,
  Compass,
  MapPin,
  ChevronDown,
  Check,
  RotateCcw,
  Shield,
  Send,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface Props {
  onNavigate: (tab: string, ref?: string) => void;
  onResetData: () => void;
}

export const SyntrixTopBar: React.FC<Props> = ({ onNavigate, onResetData }) => {
  const { currentUser, users, switchUser, isOfficial } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const term = searchInput.trim();
    if (term.toUpperCase().startsWith('CP-') || term.length <= 12) {
      onNavigate('track', term);
    } else {
      onNavigate('explore');
    }
  };

  return (
    <header className="h-20 px-6 sm:px-8 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-[#f0f2f6] shrink-0">
      {/* Search Input Box (exactly like Syntrix ⌘K input) */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 sm:w-80 md:w-96">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search or jump to..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>
      </form>

      {/* Action Pills & Controls (flat clean buttons) */}
      <div className="flex items-center gap-2">
        {/* Primary Flat Action Button */}
        <button
          onClick={() => onNavigate('report')}
          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Report Issue</span>
        </button>

        {/* Action Buttons */}
        <button
          onClick={() => onNavigate('track')}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>Track ID</span>
        </button>

        <button
          onClick={() => onNavigate('map')}
          className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-slate-600" />
          <span>Civic Map</span>
        </button>

        {/* User Persona Dropdown */}
        <div className="relative ml-1">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="relative">
              <img
                src={
                  currentUser?.avatarUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                }
                alt={currentUser?.name}
                className="w-8 h-8 rounded-lg object-cover border border-slate-200"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                  isOfficial ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              />
            </div>
            <div className="text-left hidden sm:block">
              <div className="font-bold text-slate-900 leading-tight truncate max-w-[100px]">
                {currentUser?.name || 'User'}
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {isOfficial ? 'Official' : 'Citizen'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-300 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Persona (Role-Enforced)
                </span>
              </div>

              <div className="space-y-1">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isOff = u.role === 'official';

                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-2xl text-xs flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-indigo-50/80 text-indigo-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                          alt={u.name}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                        <div>
                          <div className="font-bold">{u.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                            {u.department || (isOff ? 'Municipal Officer' : 'Resident')}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          isOff
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isOff ? 'Officer' : 'Citizen'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 px-2 space-y-2 text-[11px]">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onNavigate('login');
                  }}
                  className="w-full p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Open Full Login Portal</span>
                </button>

                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => {
                      onResetData();
                      setUserDropdownOpen(false);
                    }}
                    className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Demo Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
