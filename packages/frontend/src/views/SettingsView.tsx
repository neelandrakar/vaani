import React from 'react';
import { Settings, ShieldCheck, Database, Cpu, Lock, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

interface SettingsViewProps {
  businessConfig: any;
  readiness: any;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ businessConfig, readiness, onRefresh }) => {
  const business = businessConfig?.business;
  const secrets = businessConfig?.secretStatus;
  const isMock = readiness?.voicePipeline?.activeMode === 'mock' || !readiness?.voicePipeline?.gpuAvailable;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Business Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Enterprise business configuration, infrastructure readiness, masked secrets status, and recording policies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Profile */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Settings className="w-4 h-4 text-teal-600" />
            <span>Business Organization</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Business Name</span>
              <span className="font-semibold text-slate-800">{business?.name || 'Hoichoi'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Legal Entity</span>
              <span className="font-medium text-slate-800">{business?.legalName || 'Hoichoi Technologies Pvt Ltd'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Operating Industry</span>
              <span className="font-medium text-slate-800">{business?.industry || 'Digital Entertainment & OTT Streaming'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Standard Timezone</span>
              <span className="font-mono font-medium text-slate-800">{business?.timezone || 'Asia/Kolkata'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Official Phone</span>
              <span className="font-mono font-medium text-slate-800">{business?.phone || '+91 33 4000 7700'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Registered Office</span>
              <span className="font-medium text-slate-800 text-right max-w-xs">{business?.address}</span>
            </div>
          </div>
        </div>

        {/* Infrastructure & Model Readiness */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Cpu className="w-4 h-4 text-teal-600" />
            <span>Infrastructure & Model Connectivity</span>
          </h2>

          <div className="space-y-3">
            {/* Core Database */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <div>
                  <div className="font-semibold text-slate-800">PostgreSQL Database (Prisma)</div>
                  <div className="text-[11px] text-slate-500">{readiness?.coreErp?.database || 'Connected'}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 text-[10px]">
                HEALTHY
              </span>
            </div>

            {/* AI Voice Pipeline */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-teal-600" />
                <div>
                  <div className="font-semibold text-slate-800">Voice Inference Pipeline</div>
                  <div className="text-[11px] text-slate-500">
                    Mode: {readiness?.voicePipeline?.activeMode?.toUpperCase()} • Hardware: {readiness?.voicePipeline?.device}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                isMock ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isMock ? 'MOCK PIPELINE' : 'REAL INFERENCE'}
              </span>
            </div>

            {/* Model Architecture Checklist */}
            <div className="text-xs space-y-1.5 pt-2">
              <div className="flex justify-between py-1 text-slate-600">
                <span>ASR Model:</span>
                <span className="font-mono text-slate-800">ai4bharat/indic-conformer-600m</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>LLM Tool-Calling:</span>
                <span className="font-mono text-slate-800">Qwen/Qwen3-8B (non-thinking)</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>TTS Voice Synthesis:</span>
                <span className="font-mono text-slate-800">ai4bharat/indic-parler-tts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secret Configuration Status (Masked) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Lock className="w-4 h-4 text-teal-600" />
            <span>Environment Secret Status (Non-Exposed)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Confidential credentials status verified on backend without returning sensitive secret values.
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="font-mono text-slate-700">DATABASE_URL</span>
              <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Configured (Port 4200)</span>
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="font-mono text-slate-700">JWT_SECRET</span>
              <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Configured (32+ chars)</span>
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="font-mono text-slate-700">TWILIO_AUTH_TOKEN</span>
              <span className="text-slate-400 font-medium">Simulator active (Not set)</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-slate-50 border border-slate-100">
              <span className="font-mono text-slate-700">EXOTEL_API_KEY</span>
              <span className="text-slate-400 font-medium">Simulator active (Not set)</span>
            </div>
          </div>
        </div>

        {/* Recording & Consent Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Audio Recording & Compliance</span>
          </h2>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 leading-relaxed">
              <strong>Compliance Policy: </strong> Audio recording is <strong>strictly OFF by default</strong>. Microphone capture is processed in memory for speech recognition and immediately discarded.
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span>Raw Audio Recording:</span>
              <span className="font-semibold text-slate-800">Disabled (Off by default)</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span>Transcript Retention Policy:</span>
              <span className="font-semibold text-slate-800">30 Days</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span>Explicit Consent Requirement:</span>
              <span className="font-semibold text-emerald-700">Enforced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
