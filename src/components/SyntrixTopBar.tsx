import React, { useState, useEffect } from 'react';
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
  Bell,
  Check,
  CheckCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { NotificationItem } from '../types';

interface Props {
  onNavigate: (tab: string, ref?: string) => void;
  onResetData?: () => void;
}

export const SyntrixTopBar: React.FC<Props> = ({ onNavigate }) => {
  const { currentUser, isDistrictAdmin, isMunicipalityAdmin, isCitizen, logout } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await api.getNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // ignore transient polling errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

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

        {/* Live Notifications Bell Dropdown */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setUserDropdownOpen(false);
                fetchNotifications();
              }}
              className="relative p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
              title="Report updates and notifications"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 p-3 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900 tracking-tight">Report Updates</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        await api.markAllNotificationsRead();
                        fetchNotifications();
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      <Bell className="w-6 h-6 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-medium text-slate-600">No notifications yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Follow reports to receive instant updates when work is assigned or resolved.
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={async () => {
                          if (!n.read) {
                            await api.markNotificationRead(n.id);
                          }
                          setNotifDropdownOpen(false);
                          if (n.complaintReference) {
                            onNavigate('track', n.complaintReference);
                          }
                        }}
                        className={`pt-2 first:pt-0 p-2 rounded-xl text-left cursor-pointer transition-colors ${
                          n.read ? 'hover:bg-slate-50 opacity-80' : 'bg-indigo-50/50 hover:bg-indigo-50 border-l-2 border-indigo-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-[11px] text-slate-900 flex items-center gap-1">
                            {n.type === 'AUTO_MERGED' && <Sparkles className="w-3 h-3 text-indigo-600" />}
                            {n.title}
                          </span>
                          <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                            {n.complaintReference}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400 font-medium">
                          <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-indigo-600 flex items-center gap-0.5 font-semibold">
                            View report <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
