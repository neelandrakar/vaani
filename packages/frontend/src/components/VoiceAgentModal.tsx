import React, { useState } from 'react';
import { Mic, X, Bot, AlertCircle, Wrench, Send, PhoneOff, Volume2, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import { Lead } from '../services/api';

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onConversationEnded?: () => void;
}

export const VoiceAgentModal: React.FC<VoiceAgentModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConversationEnded,
}) => {
  const [selectedLang, setSelectedLang] = useState(lead?.preferredLanguage || 'en');
  const [textInput, setTextInput] = useState('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const {
    state,
    errorMessage,
    transcript,
    audioLevel,
    generationId,
    pitch,
    setPitch,
    rate,
    setRate,
    selectedVoiceName,
    setSelectedVoiceName,
    availableVoices,
    previewVoice,
    start,
    stop,
    interrupt,
    sendText,
  } = useVoiceAgent({
    leadId: lead?.id,
    language: selectedLang,
    voiceGender: 'female',
    initialPitch: 0.88, // Low pitch for confident, warm female tone
    initialRate: 1.02,
    onSummaryReady: () => {
      if (onConversationEnded) onConversationEnded();
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (state !== 'idle') {
      stop();
    }
    onClose();
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendText(textInput);
    setTextInput('');
  };

  // Filter available voices for female candidates
  const femaleVoices = availableVoices.filter((v) => {
    const n = v.name.toLowerCase();
    return (
      n.includes('heera') ||
      n.includes('zira') ||
      n.includes('neerja') ||
      n.includes('swara') ||
      n.includes('kalpana') ||
      n.includes('tanishaa') ||
      n.includes('samantha') ||
      n.includes('karen') ||
      n.includes('female') ||
      n.includes('natural')
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[740px] overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="p-4 px-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-slate-950 font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight">Vaani AI Calling Assistant (Hoichoi)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                  gen #{generationId}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-medium">
                  Indian Female Voice
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lead ? `Calling: ${lead.name} (${lead.phone})` : 'Inbound Test Caller Session'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className="text-xs flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Tune Voice Pitch & Accent"
            >
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span>Voice Tuning</span>
              {showVoiceSettings ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </button>

            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={state !== 'idle'}
              className="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded px-2.5 py-1 font-medium focus:ring-1 focus:ring-teal-400"
            >
              <option value="en">English (India)</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="bn">Bengali (বাংলা)</option>
            </select>

            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Voice Customization Drawer */}
        {showVoiceSettings && (
          <div className="bg-slate-900 border-b border-slate-800 p-4 px-6 text-white text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-teal-400 uppercase tracking-wider text-[11px]">
                Vaani Voice Character Tuning (Hoichoi)
              </span>
              <button
                onClick={() => previewVoice()}
                className="flex items-center space-x-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-slate-950 font-bold text-[11px] transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Voice Sample</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Pitch Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Pitch (Lower = More Grounded):</span>
                  <span className="font-mono text-teal-400">{pitch}</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.20"
                  step="0.02"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Low Pitch (Confident)</span>
                  <span>High Pitch</span>
                </div>
              </div>

              {/* Speed / Rate Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Cadence / Speed:</span>
                  <span className="font-mono text-teal-400">{rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.25"
                  step="0.02"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-teal-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Deliberate</span>
                  <span>Crisp & Fast</span>
                </div>
              </div>

              {/* Voice Model Selector */}
              <div className="space-y-1">
                <span className="text-slate-300 block">Active Voice Profile:</span>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-teal-400 font-medium"
                >
                  <option value="">⭐ Neural Vaani (Indian Accent - Neerja Neural)</option>
                  {femaleVoices.length > 0 ? (
                    femaleVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))
                  ) : (
                    availableVoices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))
                  )}
                </select>
                <div className="flex items-center space-x-1.5 text-[10px] text-teal-400 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  <span>Authentic Indian accent: en-IN-NeerjaNeural / hi-IN-Swara / bn-IN-Tanishaa</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Visualizer & Call Controls Bar */}
        <div className="bg-slate-950 p-5 text-white flex flex-col items-center justify-center space-y-4 shrink-0 border-b border-slate-800">
          {/* Animated Waveform Visualizer */}
          <div className="flex items-center justify-center space-x-1.5 h-12 w-full max-w-xs">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  state === 'speaking'
                    ? 'bg-teal-400 animate-voice-' + ((i % 4) + 1)
                    : state === 'listening'
                    ? 'bg-emerald-400'
                    : state === 'thinking' || state === 'transcribing'
                    ? 'bg-amber-400'
                    : 'bg-slate-800'
                }`}
                style={{
                  height:
                    state === 'listening'
                      ? `${Math.max(6, (audioLevel / 100) * 44 * (Math.sin(i * 0.8) + 1))}px`
                      : state === 'speaking'
                      ? '28px'
                      : '6px',
                }}
              />
            ))}
          </div>

          {/* Status Label & Controls */}
          <div className="flex items-center space-x-4">
            {state === 'idle' || state === 'error' ? (
              <button
                onClick={start}
                className="flex items-center space-x-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-full text-sm shadow-lg transition transform active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>Start Voice Call</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={stop}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-full text-xs shadow transition transform active:scale-95"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>

                {state === 'speaking' && (
                  <button
                    onClick={interrupt}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-2 rounded-full text-xs shadow transition transform active:scale-95"
                  >
                    Interrupt Agent
                  </button>
                )}
              </div>
            )}

            {/* Pipeline State Pill */}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                state === 'listening'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : state === 'transcribing' || state === 'thinking'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : state === 'speaking'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : state === 'interrupted'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {state === 'listening' ? 'Listening to speech...' : state}
            </span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border-b border-red-200 p-2.5 text-xs text-red-700 flex items-center space-x-2 px-6">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Live Transcript Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/70">
          {transcript.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                  item.role === 'user'
                    ? 'bg-teal-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75 mb-1 font-semibold">
                  <span>{item.role === 'user' ? 'Caller' : 'Vaani (Hoichoi AI)'}</span>
                  <span>{item.timestamp}</span>
                </div>
                <div>{item.text}</div>

                {/* Live Tool Execution Chips */}
                {item.toolCalls && item.toolCalls.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1.5">
                    {item.toolCalls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="bg-teal-50 text-teal-900 rounded p-2 text-[11px] font-mono border border-teal-200/60"
                      >
                        <div className="flex items-center space-x-1 font-bold">
                          <Wrench className="w-3 h-3 text-teal-600" />
                          <span>Tool: {tc.toolName}()</span>
                        </div>
                        <div className="text-[10px] text-teal-700 mt-0.5 truncate">
                          {JSON.stringify(tc.arguments)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Turnaround Latency benchmark */}
                {item.metrics?.e2eTurnaroundMs && (
                  <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">
                    Turnaround: {item.metrics.e2eTurnaroundMs}ms
                  </div>
                )}
              </div>
            </div>
          ))}

          {transcript.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-8 space-y-2">
              <Mic className="w-8 h-8 opacity-40 text-teal-600 animate-bounce" />
              <p className="font-medium text-slate-600">Click "Start Voice Call" to test the voice agent.</p>
              <p className="text-slate-400 max-w-sm text-[11px]">
                Speak naturally in English, Bengali, or Hindi (e.g., "What are your annual plans?", "কোন কোন শো আছে?"). Vaani will answer verified information, qualify needs, and arrange callbacks.
              </p>
            </div>
          )}
        </div>

        {/* Text Fallback Input Footer */}
        <form
          onSubmit={handleSendText}
          className="p-3 px-6 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0"
        >
          <input
            type="text"
            placeholder="Type text turn if microphone is unavailable..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white text-xs px-4 py-2 rounded-lg font-medium transition shadow-xs flex items-center space-x-1"
          >
            <span>Send</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
