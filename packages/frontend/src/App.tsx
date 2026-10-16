import React, { useState, useEffect, useCallback } from 'react';
import { api, User, Lead, Conversation, Callback } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar, TabId } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { LeadsView } from './views/LeadsView';
import { StudioView } from './views/StudioView';
import { ConversationsView } from './views/ConversationsView';
import { CallbacksView } from './views/CallbacksView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { VoiceAgentModal } from './components/VoiceAgentModal';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');

  // ERP State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [businessConfig, setBusinessConfig] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);

  // Voice Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [activeVoiceLead, setActiveVoiceLead] = useState<Lead | null>(null);

  // Check auth on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api
        .getCurrentUser()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, []);

  // Fetch ERP Data
  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const [leadsRes, convsRes, cbsRes, configRes, readyRes] = await Promise.all([
        api.listLeads(),
        api.listConversations(),
        api.listCallbacks(),
        api.getBusinessConfig().catch(() => null),
        api.getReadiness().catch(() => null),
      ]);

      setLeads(leadsRes.leads || []);
      setConversations(convsRes.conversations || []);
      setCallbacks(cbsRes || []);
      setBusinessConfig(configRes);
      setReadiness(readyRes);
    } catch (err) {
      console.error('Error fetching ERP records:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
  };

  const handleOpenVoiceWithLead = (lead: Lead) => {
    setActiveVoiceLead(lead);
    setIsVoiceModalOpen(true);
  };

  const handleOpenGeneralVoiceModal = () => {
    setActiveVoiceLead(null);
    setIsVoiceModalOpen(true);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Connecting to Vaani Calling ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={(u) => setUser(u)} />;
  }

  const pendingCallbacksCount = callbacks.filter((c) => c.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        user={user}
        readiness={readiness}
        onOpenVoiceModal={handleOpenGeneralVoiceModal}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingCallbacksCount={pendingCallbacksCount}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              leads={leads}
              conversations={conversations}
              callbacks={callbacks}
              readiness={readiness}
              onOpenVoiceModal={handleOpenGeneralVoiceModal}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'leads' && (
            <LeadsView
              leads={leads}
              onRefresh={refreshData}
              onOpenVoiceWithLead={handleOpenVoiceWithLead}
            />
          )}

          {currentTab === 'studio' && (
            <StudioView
              businessConfig={businessConfig}
              readiness={readiness}
              onRefreshConfig={refreshData}
            />
          )}

          {currentTab === 'conversations' && (
            <ConversationsView
              conversations={conversations}
              onRefresh={refreshData}
            />
          )}

          {currentTab === 'callbacks' && (
            <CallbacksView
              callbacks={callbacks}
              onRefresh={refreshData}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              businessConfig={businessConfig}
              readiness={readiness}
              onRefresh={refreshData}
            />
          )}
        </main>
      </div>

      {/* Global Voice Agent Modal */}
      <VoiceAgentModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        lead={activeVoiceLead}
        onConversationEnded={refreshData}
      />
    </div>
  );
};
