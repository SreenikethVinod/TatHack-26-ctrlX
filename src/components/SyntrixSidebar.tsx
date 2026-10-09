import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  MapPin,
  BarChart2,
  Shield,
  Settings,
  Flame,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const SyntrixSidebar: React.FC<Props> = ({ currentTab, onNavigate }) => {
  const { isOfficial } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Home', fullLabel: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'explore', label: 'Feed', fullLabel: 'Explore Public Reports', icon: FolderOpen },
    { id: 'track', label: 'Track', fullLabel: 'Track Complaint ID', icon: Search },
    { id: 'map', label: 'Map', fullLabel: 'Civic Geographic Map', icon: MapPin },
    { id: 'transparency', label: 'Metrics', fullLabel: 'Open Transparency KPIs', icon: BarChart2 },
    { id: 'official-dashboard', label: 'Desk', fullLabel: 'Officer Workstation', icon: Shield, badge: isOfficial },
    { id: 'login', label: 'Auth', fullLabel: 'Role-Based Login Portal', icon: KeyRound },
  ];

  return (
    <aside className="w-16 sm:w-18 bg-[#f0f2f6] border-r border-slate-200/70 flex flex-col items-center py-5 select-none shrink-0 min-h-screen z-30 transition-all">
      {/* Brand Icon (Concentric target emblem matching Syntrix reference) */}
      <button
        onClick={() => onNavigate('dashboard')}
        className="relative group w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 hover:bg-slate-50 transition-all mb-7 focus:outline-none"
        title="CivicPulse Syntrix"
      >
        <div className="relative flex items-center justify-center">
          <div className="w-5.5 h-5.5 rounded-full border-2 border-indigo-600 flex items-center justify-center group-hover:border-indigo-700 transition-colors">
            <div className="w-2 h-2 rounded-full bg-indigo-600" />
          </div>
        </div>

        {/* Hover Tooltip */}
        <span className="absolute left-14 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap translate-x-1 group-hover:translate-x-0">
          CivicPulse Syntrix
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
                className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                }`}
                aria-label={item.fullLabel}
              >
                <Icon className={`w-4.5 h-4.5 stroke-[2] ${isActive ? 'text-white' : ''}`} />

                {/* Status pulse indicator */}
                {item.badge && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-[#f0f2f6]" />
                )}
              </button>

              {/* Iconography-first micro-label underneath */}
              <span
                className={`text-[9px] font-semibold tracking-tight mt-1 transition-colors ${
                  isActive ? 'text-indigo-600 font-extrabold' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                {item.label}
              </span>

              {/* Floating Dock Tooltip for precise description */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap translate-x-1 group-hover:translate-x-0">
                {item.fullLabel}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Settings / Profile bottom dock item */}
      <div className="pt-3 w-full flex flex-col items-center border-t border-slate-200 px-2">
        <div className="relative group w-full flex flex-col items-center">
          <button
            onClick={() => onNavigate('profile')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
              currentTab === 'profile'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-800 hover:bg-white'
            }`}
            aria-label="Account Settings"
          >
            <Settings className="w-4.5 h-4.5 stroke-[2]" />
          </button>

          <span
            className={`text-[9px] font-semibold tracking-tight mt-1 transition-colors ${
              currentTab === 'profile' ? 'text-indigo-600 font-extrabold' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          >
            Profile
          </span>

          {/* Floating Dock Tooltip */}
          <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-lg border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 whitespace-nowrap translate-x-1 group-hover:translate-x-0">
            Account &amp; Persona Settings
          </div>
        </div>
      </div>
    </aside>
  );
};
