import React, { useState } from 'react';
import { MessageSquare, Clock, Wrench, ShieldAlert, CheckCircle2, User, Bot, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Conversation, api } from '../services/api';

interface ConversationsViewProps {
  conversations: Conversation[];
  onRefresh: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({ conversations, onRefresh }) => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleSelect = async (c: Conversation) => {
    setIsLoadingDetail(true);
    try {
      const full = await api.getConversation(c.id);
      setSelectedConversation(full);
    } catch {
      setSelectedConversation(c);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Call Records & Transcripts</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audited transcripts, latency benchmarks, tool execution history, and structured lead outcomes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Conversation List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recorded Calls ({conversations.length})
            </span>
            <button
              onClick={onRefresh}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Refresh
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {conversations.map((c) => {
              const isSelected = selectedConversation?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`p-4 transition cursor-pointer ${
                    isSelected ? 'bg-teal-50/60 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm text-slate-800">
                      {c.lead?.name || 'Inbound Web Prospect'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.outcome === 'QUALIFIED_CALLBACK'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.outcome === 'DO_NOT_CALL'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.outcome || 'INCOMPLETE'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {c.summary || 'Lead qualification conversation turn.'}
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2.5">
                    <span>{new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span className="uppercase">{c.language}</span>
                    <span>•</span>
                    <span>{c.durationSec ? `${c.durationSec}s` : 'Active'}</span>
                    <span>•</span>
                    <span>{c._count?.toolExecutions || 0} tools executed</span>
                  </div>
                </div>
              );
            })}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No conversations logged. Launch a voice test to record interactions.
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Inspection Panel (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col h-[700px] overflow-y-auto">
          {selectedConversation ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedConversation.lead?.name || 'Inbound Caller'}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                      {selectedConversation.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Channel: {selectedConversation.channel.replace(/_/g, ' ')} • Provider: {selectedConversation.providerId} • Language: {selectedConversation.language.toUpperCase()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    selectedConversation.outcome === 'QUALIFIED_CALLBACK'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedConversation.outcome || 'IN PROGRESS'}
                </span>
              </div>

              {/* Summary Card */}
              {selectedConversation.summary && (
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    AI Conversation Summary
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed">{selectedConversation.summary}</p>
                </div>
              )}

              {/* Tool Execution History */}
              {selectedConversation.toolExecutions && selectedConversation.toolExecutions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <Wrench className="w-3.5 h-3.5 text-teal-600" />
                    <span>ERP Tools Executed ({selectedConversation.toolExecutions.length})</span>
                  </span>
                  <div className="space-y-2">
                    {selectedConversation.toolExecutions.map((te) => (
                      <div key={te.id} className="p-3 bg-teal-50/40 rounded-lg border border-teal-100 text-xs">
                        <div className="flex justify-between font-mono font-medium text-teal-800">
                          <span>{te.toolName}()</span>
                          <span className="text-[11px] text-teal-600">{te.executionTimeMs}ms</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          <strong>Input:</strong> {JSON.stringify(te.inputParams)}
                        </div>
                        <div className="text-[11px] text-slate-700 mt-0.5">
                          <strong>Output:</strong> {JSON.stringify(te.outputResult)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Transcript Messages */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Full Timestamped Transcript
                </span>
                <div className="space-y-3">
                  {selectedConversation.messages?.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.role === 'USER' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                          m.role === 'USER'
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-75 mb-1 font-semibold">
                          <span>{m.role === 'USER' ? 'Lead' : 'Vaani (AI Agent)'}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div>{m.content}</div>
                        {m.latencyMs !== null && m.latencyMs !== undefined && m.latencyMs > 0 && (
                          <div className="text-[9px] mt-1.5 text-slate-400 text-right">
                            Latency: {m.latencyMs}ms
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!selectedConversation.messages || selectedConversation.messages.length === 0) && (
                    <div className="text-xs text-slate-400 italic">No messages recorded in transcript.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <span>Select a conversation from the list to inspect audited transcript and tool traces.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
