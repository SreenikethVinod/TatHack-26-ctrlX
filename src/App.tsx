import React, { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SyntrixSidebar } from './components/SyntrixSidebar';
import { SyntrixTopBar } from './components/SyntrixTopBar';
import { SyntrixDashboard } from './components/SyntrixDashboard';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackIssuePage } from './pages/TrackIssuePage';
import { ExploreIssuesPage } from './pages/ExploreIssuesPage';
import { CivicMapPage } from './pages/CivicMapPage';
import { TransparencyPage } from './pages/TransparencyPage';
import { OfficialDashboardPage } from './pages/OfficialDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { api } from './lib/api';
import { AnalyticsData, Complaint } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [trackReference, setTrackReference] = useState<string>('CP-2026-001');

  // Live data for the Syntrix Dashboard
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);

  const loadDashboardData = async () => {
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
    loadDashboardData();
  }, []);

  const handleNavigate = (tab: string, reference?: string) => {
    if (reference) {
      setTrackReference(reference);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetData = async () => {
    if (!confirm('Reset CivicPulse database to initial 16 verified sample records?')) return;
    try {
      await api.resetDemoData();
      await loadDashboardData();
      alert('Demo database successfully reset to seed state.');
    } catch (err: any) {
      alert('Failed to reset: ' + err.message);
    }
  };

  return (
    <AuthProvider>
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
            onResetData={handleResetData}
          />

          {/* Canvas View Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {currentTab === 'dashboard' && (
              <SyntrixDashboard
                analytics={analytics}
                recentComplaints={recentComplaints}
                onNavigate={(tab, ref) => handleNavigate(tab, ref)}
              />
            )}

            {currentTab === 'report' && (
              <ReportIssuePage
                onSuccessNavigate={(ref) => handleNavigate('track', ref)}
                onExploreNavigate={() => handleNavigate('explore')}
              />
            )}

            {currentTab === 'track' && (
              <TrackIssuePage
                initialReference={trackReference}
                onExploreNavigate={() => handleNavigate('explore')}
              />
            )}

            {currentTab === 'explore' && (
              <ExploreIssuesPage
                onSelectComplaint={(ref) => handleNavigate('track', ref)}
                onReportNavigate={() => handleNavigate('report')}
              />
            )}

            {currentTab === 'map' && (
              <CivicMapPage
                onSelectComplaint={(ref) => handleNavigate('track', ref)}
                onReportNavigate={() => handleNavigate('report')}
              />
            )}

            {currentTab === 'transparency' && <TransparencyPage />}

            {currentTab === 'official-dashboard' && <OfficialDashboardPage />}

            {currentTab === 'profile' && <ProfilePage />}

            {currentTab === 'login' && (
              <LoginPage
                onLoginSuccess={(targetTab) => handleNavigate(targetTab)}
                onCancel={() => handleNavigate('dashboard')}
              />
            )}
          </main>

          {/* Minimalist Syntrix bottom footer */}
          <footer className="h-14 px-8 border-t border-slate-200/60 bg-[#f0f2f6] flex items-center justify-between text-xs text-slate-400">
            <div>CivicPulse • Syntrix Governance System</div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleResetData}
                className="hover:text-rose-600 transition-colors"
              >
                Reset Demo Data
              </button>
            </div>
          </footer>
        </div>
      </div>
    </AuthProvider>
  );
}
