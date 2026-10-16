import React, { useState, useEffect } from 'react';
import { Bot, Save, Mic, MicOff, MessageSquare, Volume2, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useVoiceAgent } from '../hooks/useVoiceAgent';

interface StudioViewProps {
  businessConfig: any;
  readiness: any;
  onRefreshConfig: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ businessConfig, readiness, onRefreshConfig }) => {
  const [formData, setFormData] = useState({
    name: 'Vaani',
    introduction: '',
    fallbackMessage: '',
    supportedLanguages: ['en', 'hi', 'bn'],
    voiceGender: 'female',
    activeProvider: 'mock',
    qualificationPrompt: '',
    escalationRules: '',
  });

  const [testLanguage, setTestLanguage] = useState('en');
  const [textInput, setTextInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form from businessConfig
  useEffect(() => {
    if (businessConfig?.business?.agentConfig) {
      const ac = businessConfig.business.agentConfig;
      setFormData({
        name: ac.name || 'Vaani',
        introduction: ac.introduction || '',
        fallbackMessage: ac.fallbackMessage || '',
        supportedLanguages: ac.supportedLanguages || ['en', 'hi', 'bn'],
        voiceGender: ac.voiceGender || 'female',
        activeProvider: ac.activeProvider || 'mock',
        qualificationPrompt: ac.qualificationPrompt || '',
        escalationRules: ac.escalationRules || '',
      });
    }
  }, [businessConfig]);

  // Embedded Voice Agent Hook for Studio testing
  const {
    state: voiceState,
    errorMessage,
    transcript,
    audioLevel,
    pitch,
    setPitch,
    rate,
    setRate,
    setGender,
    previewVoice,
    start: startVoice,
    stop: stopVoice,
    interrupt,
    sendText,
  } = useVoiceAgent({
    language: testLanguage,
    voiceGender: formData.voiceGender as any,
    initialPitch: 0.88,
    initialRate: 1.02,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateAgentConfig(formData);
      setSaveSuccess(true);
      onRefreshConfig();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Error saving configuration: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isRealAvailable = readiness?.voicePipeline?.gpuAvailable;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Voice Agent Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure agent personality, business knowledge prompts, languages, and test voice interactions live.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-medium flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved successfully</span>
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Agent Configuration Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Bot className="w-4 h-4 text-teal-600" />
              <span>Agent Identity & Voice Parameters</span>
            </h2>

            {/* Agent Name & Voice Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Voice Profile</label>
                  <button
                    type="button"
                    onClick={() => previewVoice()}
                    className="text-[11px] text-teal-600 hover:text-teal-700 font-bold flex items-center space-x-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Test Voice</span>
                  </button>
                </div>
                <select
                  value={formData.voiceGender}
                  onChange={(e) => {
                    const next = e.target.value;
                    setFormData({ ...formData, voiceGender: next });
                    setGender(next as any);
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 font-medium"
                >
                  <option value="female">Vaani - Female (Indian Accent: Low Pitch & High Confidence)</option>
                  <option value="male">Kabir - Male (Indian Accent: Warm Consultant)</option>
                </select>
                <p className="text-[11px] text-teal-700 font-medium mt-1 flex items-center space-x-1">
                  <span>🇮🇳</span>
                  <span>Neural Indian Accent: en-IN-NeerjaNeural / hi-IN-Swara / bn-IN-Tanishaa</span>
                </p>
              </div>
            </div>

            {/* Pitch & Cadence Sliders for Voice Tuning */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
              <div>
                <div className="flex justify-between text-xs text-slate-700 mb-1">
                  <span className="font-semibold">Pitch (Grounded Timbre):</span>
                  <span className="font-mono text-teal-700 font-bold">{pitch}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.20"
                  step="0.02"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Default 0.88 (Low pitch, high confidence)</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 mb-1">
                  <span className="font-semibold">Cadence (Speaking Rate):</span>
                  <span className="font-mono text-teal-700 font-bold">{rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.25"
                  step="0.02"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Default 1.02 (Crisp & articulate)</span>
              </div>
            </div>

            {/* Inference Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Active AI Inference Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`p-3 rounded-lg border cursor-pointer transition flex items-start space-x-2 ${
                  formData.activeProvider === 'mock'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="provider"
                    value="mock"
                    checked={formData.activeProvider === 'mock'}
                    onChange={() => setFormData({ ...formData, activeProvider: 'mock' })}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <div className="font-semibold text-xs">Deterministic Mock Mode</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Fast CPU simulation with synthetic playable WAV audio and complete ERP tools.
                    </div>
                  </div>
                </label>

                <label className={`p-3 rounded-lg border transition flex items-start space-x-2 ${
                  !isRealAvailable ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'
                } ${
                  formData.activeProvider === 'real'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-900'
                    : 'border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="provider"
                    value="real"
                    disabled={!isRealAvailable}
                    checked={formData.activeProvider === 'real'}
                    onChange={() => setFormData({ ...formData, activeProvider: 'real' })}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <div className="font-semibold text-xs flex items-center space-x-1">
                      <span>Real Model Pipeline</span>
                      {!isRealAvailable && (
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-medium">
                          GPU Required
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      IndicConformer (ASR), Qwen3-8B (LLM non-thinking), and IndicParler (TTS).
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Supported Languages */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supported Languages</label>
              <div className="flex items-center space-x-4">
                {[
                  { id: 'en', label: 'English (Indian Accent)' },
                  { id: 'hi', label: 'Hindi (हिंदी)' },
                  { id: 'bn', label: 'Bengali (বাংলা)' },
                ].map((lang) => {
                  const checked = formData.supportedLanguages.includes(lang.id);
                  return (
                    <label key={lang.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? formData.supportedLanguages.filter((l) => l !== lang.id)
                            : [...formData.supportedLanguages, lang.id];
                          setFormData({ ...formData, supportedLanguages: next });
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>{lang.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Spoken Greeting / Introduction */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Spoken Greeting / Introduction (English Default)
              </label>
              <textarea
                rows={2}
                value={formData.introduction}
                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Namaste! I am Aura..."
              />
            </div>

            {/* Qualification Prompt & Workflow Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Qualification Protocol & Script Rules
              </label>
              <textarea
                rows={4}
                value={formData.qualificationPrompt}
                onChange={(e) => setFormData({ ...formData, qualificationPrompt: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Escalation Rules */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Escalation Conditions (When to bring in Human Operator)
              </label>
              <input
                type="text"
                value={formData.escalationRules}
                onChange={(e) => setFormData({ ...formData, escalationRules: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="Escalate if caller is frustrated or asks for human..."
              />
            </div>
          </form>
        </div>

        {/* Right Column: Live Testing Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col h-full">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                <h2 className="text-sm font-bold text-slate-800">Interactive Studio Test Console</h2>
              </div>
              <select
                value={testLanguage}
                onChange={(e) => setTestLanguage(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 font-medium"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="bn">Bengali (বাংলা)</option>
              </select>
            </div>

            {/* Status indicator bar */}
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Voice Pipeline State:</span>
              <span className={`font-semibold capitalize px-2 py-0.5 rounded text-[11px] ${
                voiceState === 'listening'
                  ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                  : voiceState === 'thinking' || voiceState === 'transcribing'
                  ? 'bg-amber-100 text-amber-800'
                  : voiceState === 'speaking'
                  ? 'bg-teal-100 text-teal-800'
                  : voiceState === 'interrupted'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {voiceState}
              </span>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Live Visualizer Box */}
            <div className="h-44 bg-slate-900 rounded-xl p-4 flex flex-col justify-between text-white relative overflow-hidden">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Microphone Capture</span>
                {voiceState === 'speaking' && (
                  <span className="text-teal-400 font-medium animate-pulse">Playing Synthesized Audio</span>
                )}
              </div>

              {/* Animated Audio Waveform */}
              <div className="flex items-center justify-center space-x-1.5 h-16">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      voiceState === 'speaking'
                        ? 'bg-teal-400 animate-voice-' + ((i % 4) + 1)
                        : voiceState === 'listening'
                        ? 'bg-emerald-400'
                        : 'bg-slate-700'
                    }`}
                    style={{
                      height:
                        voiceState === 'listening'
                          ? `${Math.max(8, (audioLevel / 100) * 48 * (Math.sin(i) + 1))}px`
                          : voiceState === 'speaking'
                          ? '32px'
                          : '6px',
                    }}
                  />
                ))}
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-between">
                {voiceState === 'idle' || voiceState === 'error' ? (
                  <button
                    onClick={startVoice}
                    className="flex items-center space-x-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Start Voice Call</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={stopVoice}
                      className="flex items-center space-x-1.5 bg-red-500 hover:bg-red-400 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                      <span>End Call</span>
                    </button>
                    {voiceState === 'speaking' && (
                      <button
                        onClick={interrupt}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition"
                      >
                        Interrupt Voice
                      </button>
                    )}
                  </div>
                )}
                <span className="text-[11px] text-slate-400">Web Audio API • 16kHz</span>
              </div>
            </div>

            {/* Conversation Transcript Stream */}
            <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-2.5">
              {transcript.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2.5 text-xs ${
                      item.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                    }`}
                  >
                    <div className="font-semibold text-[10px] opacity-75 mb-0.5">
                      {item.role === 'user' ? 'You' : 'Aura (AI)'} • {item.timestamp}
                    </div>
                    <div>{item.text}</div>

                    {/* Tool execution badge if present */}
                    {item.toolCalls?.map((tc, idx) => (
                      <div key={idx} className="mt-2 p-1.5 rounded bg-slate-50 text-[10px] text-slate-700 border border-slate-200">
                        <span className="font-bold text-teal-700">Executed Tool:</span> {tc.toolName}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {transcript.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center p-4">
                  Start call to begin voice qualification or send text turn below.
                </div>
              )}
            </div>

            {/* Text Input Turn Fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendText(textInput);
                setTextInput('');
              }}
              className="flex items-center space-x-2 pt-2"
            >
              <input
                type="text"
                placeholder="Fallback text turn (e.g. 3 BHK in Whitefield)..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:bg-slate-300"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
