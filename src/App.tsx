import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyntrixSidebar } from './components/SyntrixSidebar';
import { SyntrixTopBar } from './components/SyntrixTopBar';
import { SyntrixDashboard } from './components/SyntrixDashboard';
import { CitizenDashboardPage } from './pages/CitizenDashboardPage';
import { MunicipalityDashboardPage } from './pages/MunicipalityDashboardPage';
import { DistrictDashboardPage } from './pages/DistrictDashboardPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackIssuePage } from './pages/TrackIssuePage';
import { ExploreIssuesPage } from './pages/ExploreIssuesPage';
import { PublicFeedPage } from './pages/PublicFeedPage';
import { CivicMapPage } from './pages/CivicMapPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { LoginPage } from './pages/LoginPage';
import { api } from './lib/api';
import { AnalyticsData, Complaint } from './types';

function MainApp() {
  const { currentUser, isDistrictAdmin, isMunicipalityAdmin, isCitizen, loading: authLoading } = useAuth();

  // Tab state
  const [currentTab, setCurrentTab] = useState<string>('login');
  const [trackReference, setTrackReference] = useState<string>('CP-2026-001');

  // Live data for analytics and maps
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);

  const loadData = async () => {
    try {
      const [analyticsRes, complaintsRes] = await Promise.all([
        api.getAnalytics().catch(() => null),
        api.getComplaints().catch(() => ({ complaints: [], count: 0 })),
      ]);
      if (analyticsRes) setAnalytics(analyticsRes);
      setRecentComplaints(complaintsRes.complaints || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // When user signs in or changes, automatically route to their dedicated role screen
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        setCurrentTab('login');
      } else if (currentTab === 'login') {
        if (isDistrictAdmin) {
          setCurrentTab('district-dashboard');
        } else if (isMunicipalityAdmin) {
          setCurrentTab('municipality-dashboard');
        } else {
          setCurrentTab('citizen-dashboard');
        }
      }
    }
  }, [currentUser, authLoading, isDistrictAdmin, isMunicipalityAdmin]);

  const handleNavigate = (tab: string, reference?: string) => {
    if (reference) {
      setTrackReference(reference);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (role: 'citizen' | 'municipality' | 'district') => {
    loadData();
    if (role === 'district') {
      setCurrentTab('district-dashboard');
    } else if (role === 'municipality') {
      setCurrentTab('municipality-dashboard');
    } else {
      setCurrentTab('citizen-dashboard');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f6]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Initializing CivicPulse Portal...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show the Login Screen first as required
  if (!currentUser || currentTab === 'login') {
    return (
      <div className="min-h-screen bg-[#f0f2f6] text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
        <header className="h-16 px-6 sm:px-8 flex items-center justify-between border-b border-slate-200/70 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              CP
            </div>
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">CivicPulse</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">Governance &amp; Citizen Grievance Redressal</span>
        </header>

        <main className="py-6">
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f0f2f6] text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Syntrix Left Dock Navigation Sidebar */}
      <SyntrixSidebar
        currentTab={currentTab}
        onNavigate={(tab) => handleNavigate(tab)}
      />

      {/* Main Application Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Syntrix Top Bar */}
        <SyntrixTopBar
          onNavigate={(tab, ref) => handleNavigate(tab, ref)}
        />

        {/* Canvas View Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          {/* 1. Citizen Screen */}
          {currentTab === 'citizen-dashboard' && (
            <CitizenDashboardPage
              onTrackNavigate={(ref) => handleNavigate('track', ref)}
              onReportNavigate={() => handleNavigate('report')}
            />
          )}

          {/* 2. Municipality Admin Screen */}
          {currentTab === 'municipality-dashboard' && (
            <MunicipalityDashboardPage />
          )}

          {/* 3. District Admin Higher Authority Screen */}
          {currentTab === 'district-dashboard' && (
            <DistrictDashboardPage />
          )}

          {/* Citizen Report Form Direct Tab */}
          {currentTab === 'report' && (
            <ReportIssuePage
              onSuccessNavigate={(ref) => handleNavigate('track', ref)}
              onExploreNavigate={() => handleNavigate('citizen-dashboard')}
            />
          )}

          {/* Track Issue by ID */}
          {currentTab === 'track' && (
            <TrackIssuePage
              initialReference={trackReference}
              onExploreNavigate={() => handleNavigate(isCitizen ? 'citizen-dashboard' : 'municipality-dashboard')}
            />
          )}

          {/* Public Community Feed */}
          {currentTab === 'feed' && (
            <PublicFeedPage
              onTrackNavigate={(ref) => handleNavigate('track', ref)}
              onReportNavigate={() => handleNavigate('report')}
              onMapNavigate={() => handleNavigate('map')}
            />
          )}

          {/* Map View */}
          {currentTab === 'map' && (
            <CivicMapPage
              onSelectComplaint={(ref) => handleNavigate('track', ref)}
              onReportNavigate={() => handleNavigate(isCitizen ? 'report' : 'municipality-dashboard')}
            />
          )}

          {/* Feed / Explore */}
          {currentTab === 'explore' && (
            <ExploreIssuesPage
              onSelectComplaint={(ref) => handleNavigate('track', ref)}
              onReportNavigate={() => handleNavigate(isCitizen ? 'report' : 'municipality-dashboard')}
            />
          )}

          {/* Transparency & SLA Metrics */}
          {currentTab === 'transparency' && <TransparencyPage />}

          {/* Overview Dashboard */}
          {currentTab === 'dashboard' && (
            <SyntrixDashboard
              analytics={analytics}
              recentComplaints={recentComplaints}
              onNavigate={(tab, ref) => handleNavigate(tab, ref)}
            />
          )}
        </main>

        {/* Minimalist Syntrix bottom footer */}
        <footer className="h-14 px-8 border-t border-slate-200/60 bg-[#f0f2f6] flex items-center justify-between text-xs text-slate-400">
          <div>CivicPulse • Municipal Grievance &amp; 14-Day Accountability Governance System</div>
          <div className="flex items-center gap-4">
            <span>Role: {isDistrictAdmin ? 'District Admin' : isMunicipalityAdmin ? 'Municipality Admin' : 'Citizen'}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
