import React from 'react';
import { Users, PhoneCall, CheckCircle2, Clock, ArrowRight, Mic, Sparkles, Building2 } from 'lucide-react';
import { Lead, Conversation, Callback } from '../services/api';

interface DashboardViewProps {
  leads: Lead[];
  conversations: Conversation[];
  callbacks: Callback[];
  readiness: any;
  onOpenVoiceModal: () => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads,
  conversations,
  callbacks,
  readiness,
  onOpenVoiceModal,
  onNavigateTab,
}) => {
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => l.status === 'QUALIFIED' || l.requirements?.isQualified).length;
  const pendingCallbacks = callbacks.filter((c) => c.status === 'PENDING').length;
  const totalConversations = conversations.length;
  const qualifiedRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  const isMock = readiness?.voicePipeline?.activeMode === 'mock' || !readiness?.voicePipeline?.gpuAvailable;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-slate-800 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/20 uppercase tracking-wide">
              Real-Estate Qualification Engine
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-400 text-amber-950">
              Demo data
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
            Vaani AI Calling Dashboard
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-1 max-w-xl">
            Automated voice agent qualifying buyers and tenants in Hindi & English, scheduling site visit callbacks, and logging structured ERP requirements.
          </p>
        </div>
        <button
          onClick={onOpenVoiceModal}
          className="flex items-center space-x-2 bg-white text-teal-800 hover:bg-slate-100 font-semibold px-4 py-2.5 rounded-lg text-sm shadow transition shrink-0"
        >
          <Mic className="w-4 h-4 text-teal-600" />
          <span>Launch Voice Agent Test</span>
        </button>
      </div>

      {/* Mode Advisory Notice */}
      <div className={`p-4 rounded-lg border text-sm flex items-start space-x-3 ${
        isMock ? 'bg-blue-50/70 border-blue-200 text-blue-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${isMock ? 'text-blue-600' : 'text-emerald-600'}`} />
        <div>
          <span className="font-semibold">Pipeline Architecture Status: </span>
          {isMock ? (
            <span>
              Operating in <strong>Deterministic Mock Mode</strong>. Full microphone capture, Web Audio PCM playback, ERP tool execution, and interruption handling are active without downloading heavy 15GB weights. Real adapter candidates (Qwen3-8B, IndicConformer, IndicParler) are configured.
            </span>
          ) : (
            <span>
              Operating in <strong>Real Model Mode</strong> with active GPU acceleration.
            </span>
          )}
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Leads</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-800">{totalLeads}</div>
          <div className="mt-1 text-xs text-slate-500">Persisted in database</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Qualified Rate</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-teal-700">{qualifiedRate}%</div>
          <div className="mt-1 text-xs text-teal-600 font-medium">{qualifiedLeads} qualified prospects</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Callbacks</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700">{pendingCallbacks}</div>
          <div className="mt-1 text-xs text-amber-600 font-medium">Site visits & follow-ups</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Voice Calls</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-indigo-700">{totalConversations}</div>
          <div className="mt-1 text-xs text-indigo-600">Total sessions recorded</div>
        </div>
      </div>

      {/* Recent Conversations and Callbacks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recent AI Conversations</h2>
            <button
              onClick={() => onNavigateTab('conversations')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {conversations.slice(0, 4).map((c) => (
              <div key={c.id} className="p-4 hover:bg-slate-50/60 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm text-slate-800">
                      {c.lead?.name || 'Inbound Web Visitor'}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {c.language}
                    </span>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    c.outcome === 'QUALIFIED_CALLBACK'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.outcome === 'DO_NOT_CALL'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {c.outcome ? c.outcome.replace(/_/g, ' ') : 'IN PROGRESS'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {c.summary || 'Lead qualification conversation.'}
                </p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                  <span>{new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span>{c.channel.replace(/_/g, ' ')}</span>
                  <span>•</span>
                  <span>{c.durationSec ? `${c.durationSec}s` : 'Active'}</span>
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No conversations recorded yet. Launch the voice test to create one.
              </div>
            )}
          </div>
        </div>

        {/* Scheduled Callbacks */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Upcoming Scheduled Callbacks</h2>
            <button
              onClick={() => onNavigateTab('callbacks')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center space-x-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {callbacks.slice(0, 4).map((cb) => (
              <div key={cb.id} className="p-4 hover:bg-slate-50/60 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm text-slate-800">{cb.lead.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{cb.lead.phone}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    cb.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {cb.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{cb.reason || 'Property Consultation'}</p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                  <span className="font-medium text-slate-600">
                    {new Date(cb.requestedTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span>•</span>
                  <span>{cb.timezone}</span>
                </div>
              </div>
            ))}
            {callbacks.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No pending callbacks at this time.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
