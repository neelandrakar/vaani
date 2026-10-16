import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api.js';

export type VoiceState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'interrupted' | 'error';

export interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  metrics?: {
    asrDurationMs?: number;
    llmTotalMs?: number;
    ttsDurationMs?: number;
    e2eTurnaroundMs?: number;
  };
  toolCalls?: Array<{
    toolName: string;
    arguments: any;
    result: any;
    success: boolean;
  }>;
}

export interface VoiceOption {
  name: string;
  lang: string;
  gender: 'female' | 'male' | 'neutral';
  isDefault?: boolean;
}

export function findBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: string = 'en',
  gender: 'female' | 'male' = 'female',
  preferredVoiceName?: string
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  if (preferredVoiceName) {
    const exact = voices.find((v) => v.name === preferredVoiceName);
    if (exact) return exact;
  }

  const isMale = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    return (
      n.includes('david') ||
      n.includes('ravi') ||
      n.includes('george') ||
      n.includes('mark') ||
      n.includes('prabhat') ||
      n.includes('madhur') ||
      n.includes('male') ||
      n.includes('james')
    );
  };

  const isFemale = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase();
    return (
      n.includes('heera') ||
      n.includes('neerja') ||
      n.includes('veena') ||
      n.includes('priya') ||
      n.includes('aditi') ||
      n.includes('kavya') ||
      n.includes('ananya') ||
      n.includes('swara') ||
      n.includes('kalpana') ||
      n.includes('tanishaa') ||
      n.includes('pallavi') ||
      n.includes('shruti') ||
      n.includes('aarohi') ||
      n.includes('zira') ||
      n.includes('samantha') ||
      n.includes('karen') ||
      n.includes('victoria') ||
      n.includes('female') ||
      n.includes('eva') ||
      n.includes('catherine')
    );
  };

  if (gender === 'female') {
    // 1. Language matched female voice (e.g. Heera for en-IN, Kalpana/Swara for hi-IN)
    if (lang === 'hi') {
      const hiFemale = voices.find(
        (v) => (v.lang.includes('hi') || v.name.toLowerCase().includes('hindi')) && isFemale(v)
      );
      if (hiFemale) return hiFemale;
      const hiAny = voices.find(
        (v) => (v.lang.includes('hi') || v.name.toLowerCase().includes('hindi')) && !isMale(v)
      );
      if (hiAny) return hiAny;
    } else if (lang === 'bn') {
      const bnFemale = voices.find(
        (v) => (v.lang.includes('bn') || v.name.toLowerCase().includes('bengali')) && !isMale(v)
      );
      if (bnFemale) return bnFemale;
    } else {
      // English India Female (Heera / Neerja / Veena / Priya / Aditi)
      const inFemale = voices.find(
        (v) =>
          (v.lang.includes('en-IN') ||
            v.lang.includes('hi-IN') ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('heera') ||
            v.name.toLowerCase().includes('neerja') ||
            v.name.toLowerCase().includes('veena')) &&
          isFemale(v)
      );
      if (inFemale) return inFemale;

      const inNonMale = voices.find(
        (v) => (v.lang.includes('en-IN') || v.name.toLowerCase().includes('india')) && !isMale(v)
      );
      if (inNonMale) return inNonMale;
    }

    // 2. Any English Female voice (e.g., Zira, Samantha, Google UK English Female)
    const enFemale = voices.find((v) => v.lang.startsWith('en') && isFemale(v));
    if (enFemale) return enFemale;

    // 3. Any Female voice
    const anyFemale = voices.find((v) => isFemale(v));
    if (anyFemale) return anyFemale;

    // 4. Any non-male voice
    const anyNonMale = voices.find((v) => !isMale(v));
    if (anyNonMale) return anyNonMale;
  }

  return voices[0] || null;
}

export function useVoiceAgent(options: {
  leadId?: string;
  language?: string;
  voiceGender?: 'female' | 'male';
  initialPitch?: number;
  initialRate?: number;
  onSummaryReady?: (summary: any) => void;
}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentGenerationId, setCurrentGenerationId] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Voice Customization State (Default low pitch 0.88 for confident, warm female tone)
  const [pitch, setPitch] = useState<number>(options.initialPitch ?? 0.88);
  const [rate, setRate] = useState<number>(options.initialRate ?? 1.02);
  const [gender, setGender] = useState<'female' | 'male'>(options.voiceGender ?? 'female');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const generationIdRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);

  // Load browser voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const vList = window.speechSynthesis.getVoices();
        setAvailableVoices(vList);
        if (vList.length > 0 && !selectedVoiceName) {
          const best = findBestVoice(vList, options.language || 'en', gender);
          if (best) setSelectedVoiceName(best.name);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [gender, options.language, selectedVoiceName]);

  const pendingFallbackTextRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<any>(null);

  // Stop active playback and speech synthesis immediately
  const stopCurrentPlayback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    pendingFallbackTextRef.current = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch {}
      activeSourceNodeRef.current = null;
    }
    isSpeakingRef.current = false;
  }, []);

  // Send interrupt event to server and stop playback immediately
  const interrupt = useCallback(() => {
    generationIdRef.current += 1;
    setCurrentGenerationId(generationIdRef.current);
    stopCurrentPlayback();
    setState('interrupted');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setTimeout(() => {
      setState('listening');
    }, 400);
  }, [stopCurrentPlayback]);

  // High quality confident female speech synthesis (Local OS voice fallback)
  const speakText = useCallback(
    (text: string, lang: string = 'en') => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';

      // Confident, low-pitch female voice parameters
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetVoice = findBestVoice(voices, lang, gender, selectedVoiceName);

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setState('speaking');
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setState('listening');
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setState('listening');
      };

      window.speechSynthesis.speak(utterance);
    },
    [gender, pitch, rate, selectedVoiceName]
  );

  // Play neural audio stream chunk from backend edge-tts (Authentic Indian accent)
  const playAudioChunk = useCallback(
    async (base64Audio: string, genId: number) => {
      if (!base64Audio || genId !== generationIdRef.current) return;

      try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const binaryStr = window.atob(base64Audio);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        // decodeAudioData decodes mp3/wav buffer
        const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));

        if (genId !== generationIdRef.current) return;

        stopCurrentPlayback();

        const sourceNode = audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioCtx.destination);

        activeSourceNodeRef.current = sourceNode;
        isSpeakingRef.current = true;
        setState('speaking');

        sourceNode.onended = () => {
          if (activeSourceNodeRef.current === sourceNode) {
            activeSourceNodeRef.current = null;
            isSpeakingRef.current = false;
            setState('listening');
          }
        };

        sourceNode.start(0);
      } catch (err) {
        console.warn('[VoiceAgent] Web Audio decode failed, falling back to browser speech synthesis:', err);
        if (pendingFallbackTextRef.current) {
          speakText(pendingFallbackTextRef.current, options.language || 'en');
          pendingFallbackTextRef.current = null;
        }
      }
    },
    [options.language, speakText, stopCurrentPlayback]
  );

  // Preview voice sample button (Plays authentic Indian accent neural sample)
  const previewVoice = useCallback(
    async (sampleText?: string) => {
      const textToSpeak =
        sampleText ||
        (options.language === 'hi'
          ? 'नमस्ते! मैं वाणी हूँ, होईचोई (Hoichoi) से आपकी एआई कॉलिंग असिस्टेंट। क्या बातचीत के लिए यह सही समय है?'
          : options.language === 'bn'
          ? 'নমস্কার! আমি বাণী, হইচই (Hoichoi)-এর এআই কলিং অ্যাসিস্ট্যান্ট। আপনার সাথে কি এখন কথা বলার জন্য একটু সুবিধা হবে?'
          : 'Hello, I’m Vaani, the AI calling assistant from Hoichoi. I’m calling about your subscription and our latest releases. Is this a good time for a quick conversation?');

      try {
        const res = await api.previewVoice(textToSpeak, options.language || 'en', gender);
        if (res && res.audioBase64) {
          generationIdRef.current += 1;
          setCurrentGenerationId(generationIdRef.current);
          await playAudioChunk(res.audioBase64, generationIdRef.current);
          return;
        }
      } catch (err) {
        console.warn('Backend neural preview unavailable, using browser voices:', err);
      }

      speakText(textToSpeak, options.language || 'en');
    },
    [gender, options.language, playAudioChunk, speakText]
  );

  // Send text turn to server
  const sendText = useCallback((text: string) => {
    if (!text.trim()) return;

    setTranscript((prev) => [
      ...prev,
      {
        id: `usr_${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_turn', text }));
    }
  }, []);

  // Start Voice Session
  const start = useCallback(async () => {
    setErrorMessage(null);
    setState('listening');
    setTranscript([]);
    generationIdRef.current = 0;
    setCurrentGenerationId(0);

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // 2. Setup AudioContext & microphone analyzer for live waveform visualization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // Audio level meter
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const levelInterval = setInterval(() => {
        if (state !== 'idle') {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        } else {
          clearInterval(levelInterval);
        }
      }, 100);

      // 3. Connect WebSocket for state, ERP tool executions, and turn sync
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/voice?language=${options.language || 'en'}&gender=${gender}${
        options.leadId ? `&leadId=${options.leadId}` : ''
      }`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🎙️ Connected to Vaani Voice WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'session_ready':
              setSessionId(msg.sessionId);
              setConversationId(msg.conversationId);
              break;

            case 'state_change':
              if (msg.state !== 'speaking' || isSpeakingRef.current) {
                setState(msg.state);
              }
              if (msg.newGenerationId) {
                generationIdRef.current = msg.newGenerationId;
                setCurrentGenerationId(msg.newGenerationId);
              }
              break;

            case 'transcription':
              setTranscript((prev) => [
                ...prev,
                {
                  id: `usr_${Date.now()}`,
                  role: 'user',
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString(),
                  metrics: { asrDurationMs: msg.durationMs },
                },
              ]);
              break;

            case 'tool_execution':
              setTranscript((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                  last.toolCalls = [
                    ...(last.toolCalls || []),
                    {
                      toolName: msg.toolName,
                      arguments: msg.arguments,
                      result: msg.result,
                      success: msg.success,
                    },
                  ];
                }
                return updated;
              });
              break;

            case 'agent_reply':
              generationIdRef.current = msg.generationId;
              setCurrentGenerationId(msg.generationId);
              setTranscript((prev) => [
                ...prev,
                {
                  id: `asst_${Date.now()}`,
                  role: 'assistant',
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString(),
                  metrics: msg.metrics,
                },
              ]);

              // Queue fallback speech synthesis in case neural audio chunk doesn't arrive within 1500ms
              pendingFallbackTextRef.current = msg.text;
              if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
              fallbackTimerRef.current = setTimeout(() => {
                if (pendingFallbackTextRef.current && generationIdRef.current === msg.generationId) {
                  console.log('[VoiceAgent] Neural audio chunk timed out, using local fallback');
                  speakText(pendingFallbackTextRef.current, options.language || 'en');
                  pendingFallbackTextRef.current = null;
                }
              }, 1500);
              break;

            case 'audio_chunk':
              if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
              }
              if (msg.audioBase64) {
                pendingFallbackTextRef.current = null;
                playAudioChunk(msg.audioBase64, msg.generationId);
              } else if (pendingFallbackTextRef.current) {
                speakText(pendingFallbackTextRef.current, options.language || 'en');
                pendingFallbackTextRef.current = null;
              }
              break;

            case 'summary_ready':
              if (options.onSummaryReady) {
                options.onSummaryReady(msg);
              }
              break;

            case 'error':
              setErrorMessage(msg.message);
              setState('error');
              break;
          }
        } catch (e) {
          console.error('Error parsing ws event:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('Voice WebSocket Error:', e);
        setErrorMessage('Failed to connect to Voice Agent service.');
        setState('error');
      };

      ws.onclose = () => {
        setState('idle');
      };

      // 4. Start Browser Speech Recognition for real user speech capture
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang =
          options.language === 'hi' ? 'hi-IN' : options.language === 'bn' ? 'bn-IN' : 'en-IN';

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text) {
                // If agent is speaking (Web Audio or SpeechSynthesis), cancel agent speech immediately when user talks!
                if (
                  isSpeakingRef.current ||
                  activeSourceNodeRef.current ||
                  (window.speechSynthesis && window.speechSynthesis.speaking)
                ) {
                  interrupt();
                }
                // Send real recognized speech turn to server
                sendText(text);
              }
            }
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error !== 'no-speech') {
            console.warn('SpeechRecognition notice:', e.error);
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn('SpeechRecognition start notice:', e);
        }
      }
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone permission in your browser.'
          : err.message || 'Could not start audio stream.'
      );
      setState('error');
    }
  }, [interrupt, options, sendText, speakText, state]);

  // Stop session
  const stop = useCallback(() => {
    stopCurrentPlayback();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_conversation' }));
      wsRef.current.close();
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setState('idle');
  }, [stopCurrentPlayback]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    errorMessage,
    transcript,
    audioLevel,
    sessionId,
    conversationId,
    generationId: currentGenerationId,
    pitch,
    setPitch,
    rate,
    setRate,
    gender,
    setGender,
    selectedVoiceName,
    setSelectedVoiceName,
    availableVoices,
    previewVoice,
    start,
    stop,
    interrupt,
    sendText,
  };
}
