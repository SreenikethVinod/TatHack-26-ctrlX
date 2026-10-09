import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  MapPin,
  BarChart2,
  Building,
  Landmark,
  User,
  PlusCircle,
  KeyRound,
  LogOut,
  ShieldAlert,
  Flame,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LiveActivityTicker } from './LiveActivityTicker';

interface Props {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const SyntrixSidebar: React.FC<Props> = ({ currentTab, onNavigate }) => {
  const { currentUser, isDistrictAdmin, isMunicipalityAdmin, isCitizen, logout } = useAuth();

  // Dynamic Navigation Items tailored to the authenticated role
  let navItems: { id: string; label: string; fullLabel: string; icon: any; badge?: boolean }[] = [];

  if (isDistrictAdmin) {
    navItems = [
      { id: 'district-dashboard', label: 'District', fullLabel: 'District Higher Authority (>14d Escalations)', icon: Landmark, badge: true },
      { id: 'municipality-dashboard', label: 'Muni Desk', fullLabel: 'Municipal Queue View', icon: Building },
      { id: 'waste-management', label: 'Waste', fullLabel: 'Waste Collection Dispatch Desk', icon: Trash2 },
      { id: 'feed', label: 'Feed', fullLabel: 'Public Community Feed & Endorsements', icon: Flame },
      { id: 'map', label: 'Map', fullLabel: 'Civic Geographic Map', icon: MapPin },
      { id: 'transparency', label: 'Metrics', fullLabel: 'District Governance Scorecard', icon: BarChart2 },
    ];
  } else if (isMunicipalityAdmin) {
    navItems = [
      { id: 'municipality-dashboard', label: 'Muni Desk', fullLabel: 'Municipal Queue (Review, Acknowledge, Assign)', icon: Building, badge: true },
      { id: 'waste-management', label: 'Waste', fullLabel: 'Waste Collection Dispatch Desk', icon: Trash2 },
      { id: 'feed', label: 'Feed', fullLabel: 'Public Community Feed & Endorsements', icon: Flame },
      { id: 'map', label: 'Map', fullLabel: 'Civic Geographic Map', icon: MapPin },
      { id: 'transparency', label: 'Metrics', fullLabel: 'SLA & Performance Metrics', icon: BarChart2 },
    ];
  } else if (isCitizen) {
    navItems = [
      { id: 'citizen-dashboard', label: 'My Reports', fullLabel: 'My Reports & Status Tracker', icon: User, badge: true },
      { id: 'feed', label: 'Feed', fullLabel: 'Public Community Feed & Endorsements', icon: Flame },
      { id: 'waste-management', label: 'Waste', fullLabel: 'On-Demand Doorstep Waste Collection', icon: Trash2 },
      { id: 'report', label: 'Report', fullLabel: 'Create New Civic Report', icon: PlusCircle },
      { id: 'track', label: 'Track', fullLabel: 'Track Complaint Reference ID', icon: Search },
      { id: 'map', label: 'Map', fullLabel: 'Civic Geographic Map', icon: MapPin },
    ];
  } else {
    // Guest / Not logged in
    navItems = [
      { id: 'feed', label: 'Feed', fullLabel: 'Public Community Feed & Endorsements', icon: Flame, badge: true },
      { id: 'waste-management', label: 'Waste', fullLabel: 'On-Demand Waste Pickup', icon: Trash2 },
      { id: 'map', label: 'Map', fullLabel: 'Civic Map', icon: MapPin },
      { id: 'track', label: 'Track', fullLabel: 'Track Complaint ID', icon: Search },
      { id: 'login', label: 'Login', fullLabel: 'Sign In to Portal', icon: KeyRound },
    ];
  }

  const handleLogoClick = () => {
    if (isDistrictAdmin) onNavigate('district-dashboard');
    else if (isMunicipalityAdmin) onNavigate('municipality-dashboard');
    else if (isCitizen) onNavigate('citizen-dashboard');
    else onNavigate('login');
  };

  return (
    <aside className="w-20 bg-[#f0f2f6] border-r border-slate-200/70 flex flex-col items-center py-5 select-none shrink-0 min-h-screen z-30 transition-all">
      {/* Brand Icon */}
      <button
        onClick={handleLogoClick}
        className="relative group w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 hover:bg-slate-50 transition-all mb-7 focus:outline-none cursor-pointer"
        title="CivicPulse Syntrix"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-5.5 h-5.5 rounded-full border-2 border-indigo-600 flex items-center justify-center group-hover:border-indigo-700 transition-colors">
            <div className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </div>

        {/* Hover Tooltip */}
        <span className="absolute left-14 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap translate-x-1 group-hover:translate-x-0">
          CivicPulse Governance
        </span>
      </button>

      {/* Vertical Navigation Dock */}
      <nav className="flex-1 flex flex-col items-center gap-2 w-full px-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative group w-full flex flex-col items-center">
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-colors cursor-pointer relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                }`}
                aria-label={item.fullLabel}
              >
                <Icon className={`w-4.5 h-4.5 stroke-[2] ${isActive ? 'text-white' : ''}`} />

                {item.badge && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-[#f0f2f6]" />
                )}
              </button>

              <span
                className={`text-[9px] font-semibold tracking-tight mt-1 transition-colors ${
                  isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                {item.label}
              </span>

              {/* Floating Dock Tooltip */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap translate-x-1 group-hover:translate-x-0">
                {item.fullLabel}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Live Activity Ticker - above logout */}
      {currentUser && <LiveActivityTicker />}

      {/* Bottom Logout Button */}
      {currentUser && (
        <div className="pt-3 w-full flex flex-col items-center border-t border-slate-200 px-2">
          <div className="relative group w-full flex flex-col items-center">
            <button
              onClick={() => {
                logout();
                onNavigate('login');
              }}
              className="w-11 h-11 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
            <span className="text-[9px] font-semibold text-slate-400 mt-1">Exit</span>
            <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap translate-x-1 group-hover:translate-x-0">
              Sign Out &amp; Return to Login
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
