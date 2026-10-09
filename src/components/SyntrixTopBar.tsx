import React, { useState } from 'react';
import {
  Search,
  Plus,
  Compass,
  MapPin,
  ChevronDown,
  LogOut,
  Building,
  Landmark,
  User,
  Zap,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onNavigate: (tab: string, ref?: string) => void;
  onResetData?: () => void;
}

export const SyntrixTopBar: React.FC<Props> = ({ onNavigate }) => {
  const { currentUser, isDistrictAdmin, isMunicipalityAdmin, isCitizen, logout } = useAuth();
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

  const getRoleBadge = () => {
    if (isDistrictAdmin) {
      return {
        label: 'District Admin',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: Landmark,
      };
    }
    if (isMunicipalityAdmin) {
      return {
        label: 'Municipality Admin',
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: Building,
      };
    }
    if (isCitizen) {
      return {
        label: 'Citizen',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: User,
      };
    }
    return {
      label: 'Guest',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: User,
    };
  };

  const roleInfo = getRoleBadge();
  const RoleIcon = roleInfo.icon;

  return (
    <header className="h-20 px-6 sm:px-8 flex items-center justify-between gap-4 border-b border-slate-200/70 bg-[#f0f2f6] shrink-0">
      {/* Search Input Box */}
      <form onSubmit={handleSearchSubmit} className="relative w-64 sm:w-80 md:w-96">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          placeholder="Search reports or enter Reference ID (e.g. CP-2026-001)..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-10 pr-12 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-colors"
        />
      </form>

      {/* Action Pills & Controls */}
      <div className="flex items-center gap-2.5">
        {/* Role-specific quick action */}
        {isCitizen && (
          <button
            onClick={() => onNavigate('report')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Report</span>
          </button>
        )}

        {isMunicipalityAdmin && (
          <button
            onClick={() => onNavigate('municipality-dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Muni Desk</span>
          </button>
        )}

        {isDistrictAdmin && (
          <button
            onClick={() => onNavigate('district-dashboard')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>District Oversight</span>
          </button>
        )}

        <button
          onClick={() => onNavigate('feed')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Feed</span>
        </button>

        <button
          onClick={() => onNavigate('map')}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-slate-600" />
          <span>Civic Map</span>
        </button>

        {/* User Account / Role Menu */}
        {currentUser ? (
          <div className="relative ml-1">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>

              <div className="text-left hidden sm:block">
                <div className="font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  {currentUser.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 p-2 z-50 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="font-bold text-slate-900 text-xs">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                  <div className="mt-1">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  {isCitizen && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('citizen-dashboard');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                    >
                      My Reports &amp; Status
                    </button>
                  )}

                  {isMunicipalityAdmin && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('municipality-dashboard');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                    >
                      Municipality Admin Desk
                    </button>
                  )}

                  {isDistrictAdmin && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigate('district-dashboard');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                    >
                      District Admin Higher Authority
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onNavigate('login');
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-50 text-indigo-600 font-medium cursor-pointer"
                  >
                    Switch Account Role
                  </button>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        onNavigate('login');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onNavigate('login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
