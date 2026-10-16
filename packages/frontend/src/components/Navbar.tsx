import React from 'react';
import { Mic, CheckCircle2, AlertTriangle, ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../services/api';

interface NavbarProps {
  user: User | null;
  readiness: any;
  onOpenVoiceModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, readiness, onOpenVoiceModal, onLogout }) => {
  const isMock = readiness?.voicePipeline?.activeMode === 'mock' || !readiness?.voicePipeline?.gpuAvailable;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Brand & Business Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              V
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-900 tracking-tight text-base">Vaani</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                  Calling ERP
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200" title="Contains sample seed records">
                  Demo data
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                {user?.businessName || 'Hoichoi'} • Kolkata / India
              </p>
            </div>
          </div>

          {/* Right: Mode Badge, Test Voice Agent Action, User Info */}
          <div className="flex items-center space-x-4">
            {/* Real vs Mock Mode Tag */}
            <div
              className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isMock
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title={
                isMock
                  ? 'Running deterministic mock adapters. Real weights not loaded on CPU.'
                  : 'Real AI model inference active.'
              }
            >
              {isMock ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>Mock Mode (CPU/Dev)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real Models Active</span>
                </>
              )}
            </div>

            {/* Core Readiness */}
            <div className="hidden lg:flex items-center space-x-1 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ERP Online</span>
            </div>

            {/* Prominent Browser Voice Agent Test Action */}
            <button
              onClick={onOpenVoiceModal}
              className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition shadow-sm hover:shadow focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              <Mic className="w-4 h-4" />
              <span>Test Voice Agent</span>
            </button>

            {/* User Profile & Role */}
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-slate-800">{user?.name}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
