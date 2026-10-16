import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { aiClient } from '../services/ai-client.service.js';
import { toolExecutor } from '../services/tool-executor.service.js';
import { conversationService } from '../services/conversation.service.js';
import { prisma } from '../database/prisma.js';
import { MessageRole, ConversationOutcome, ConversationChannel } from '@prisma/client';

interface ClientSession {
  ws: WebSocket;
  sessionId: string;
  conversationId?: string;
  leadId?: string;
  businessId: string;
  language: string;
  voiceGender?: string;
  generationId: number;
  isProcessing: boolean;
  history: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; toolCallId?: string }>;
  audioBuffer: Buffer[];
  leadRequirements: Record<string, any>;
  lastUserSpeechEnd?: number;
}

export class VoiceServer {
  private wss: WebSocketServer | null = null;
  private sessions = new Map<WebSocket, ClientSession>();
  private maxConcurrentSessions = 50;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/voice' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      if (this.sessions.size >= this.maxConcurrentSessions) {
        ws.send(JSON.stringify({ type: 'error', code: 'SERVER_BUSY', message: 'Maximum concurrent voice sessions reached.' }));
        ws.close(1013, 'Server Busy');
        return;
      }

      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const language = url.searchParams.get('language') || 'en';
      const leadId = url.searchParams.get('leadId') || undefined;
      const voiceGender = url.searchParams.get('gender') || 'female';

      const session: ClientSession = {
        ws,
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        leadId,
        businessId: '', // populated on init
        language,
        voiceGender,
        generationId: 0,
        isProcessing: false,
        history: [],
        audioBuffer: [],
        leadRequirements: {},
      };

      this.sessions.set(ws, session);
      this.handleConnection(ws, session);
    });

    console.log('🎙️ Voice WebSocket server listening on /ws/voice');
  }

  private async handleConnection(ws: WebSocket, session: ClientSession) {
    // 1. Resolve business configuration
    const business = await prisma.businessConfig.findFirst({
      include: { agentConfig: true },
    });
    session.businessId = business?.id || '';

    // If lead exists, load requirements
    if (session.leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: session.leadId },
        include: { requirements: true },
      });
      if (lead?.requirements) {
        session.leadRequirements = lead.requirements;
      }
    }

    // Create DB Conversation record
    const conv = await conversationService.startConversation(
      session.businessId,
      session.leadId,
      ConversationChannel.BROWSER_VOICE,
      session.language,
      business?.agentConfig?.activeProvider || 'mock'
    );
    session.conversationId = conv.id;

    // Send session ready message
    const businessName = business?.name || 'Hoichoi';
    const agentName = business?.agentConfig?.name || 'Vaani';

    // Send session ready message
    ws.send(
      JSON.stringify({
        type: 'session_ready',
        sessionId: session.sessionId,
        conversationId: conv.id,
        businessName,
        agentName,
        language: session.language,
        mode: business?.agentConfig?.activeProvider || 'mock',
      })
    );

    // Initial greeting matched to language and configured agent personality
    let greetingText = '';
    if (session.language === 'bn') {
      greetingText = `নমস্কার! আমি ${agentName}, ${businessName}-এর এআই কলিং অ্যাসিস্ট্যান্ট। আপনার সাথে কি এখন কথা বলার জন্য একটু সুবিধা হবে?`;
    } else if (session.language === 'hi') {
      greetingText = `नमस्ते! मैं ${agentName} हूँ, ${businessName} से आपकी एআই कॉलिंग असिस्टेंट। क्या बातचीत के लिए यह सही समय है?`;
    } else {
      greetingText =
        business?.agentConfig?.introduction ||
        `Hello, I’m ${agentName}, the AI calling assistant from ${businessName}. I’m calling about your subscription and our latest releases. Is this a good time for a quick conversation?`;
    }

    // Insert System Prompt into session history so LLM strictly follows personality & instructions!
    if (business?.agentConfig?.qualificationPrompt) {
      session.history.push({ role: 'system', content: business.agentConfig.qualificationPrompt });
    }

    // Queue initial greeting audio and message
    session.history.push({ role: 'assistant', content: greetingText });
    await conversationService.addMessage(conv.id, MessageRole.ASSISTANT, greetingText, 0);

    const greetingAudio = await aiClient.synthesize(greetingText, session.language, session.voiceGender || 'female');
    ws.send(
      JSON.stringify({
        type: 'agent_reply',
        generationId: session.generationId,
        text: greetingText,
        isGreeting: true,
      })
    );

    ws.send(
      JSON.stringify({
        type: 'audio_chunk',
        generationId: session.generationId,
        audioBase64: greetingAudio.audioBase64,
        sampleRate: greetingAudio.sampleRate,
        audioDurationSec: greetingAudio.audioDurationSec,
      })
    );

    ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
      try {
        if (isBinary) {
          // Audio stream chunk from microphone (16kHz PCM or WAV)
          session.audioBuffer.push(Buffer.from(data as Buffer));
          return;
        }

        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'audio_start':
            session.audioBuffer = [];
            ws.send(JSON.stringify({ type: 'state_change', state: 'listening' }));
            break;

          case 'audio_end': {
            session.lastUserSpeechEnd = performance.now();
            ws.send(JSON.stringify({ type: 'state_change', state: 'transcribing' }));
            const fullAudio = Buffer.concat(session.audioBuffer);
            session.audioBuffer = [];

            if (fullAudio.length < 500) {
              ws.send(JSON.stringify({ type: 'state_change', state: 'listening' }));
              return;
            }

            // Transcribe audio chunk
            const b64 = fullAudio.toString('base64');
            const asrRes = await aiClient.transcribe(b64, session.language);

            ws.send(
              JSON.stringify({
                type: 'transcription',
                text: asrRes.text,
                durationMs: asrRes.durationMs,
                confidence: asrRes.confidence,
                isFinal: true,
              })
            );

            if (asrRes.text.trim()) {
              await this.processUserTurn(session, asrRes.text, asrRes.durationMs);
            } else {
              ws.send(JSON.stringify({ type: 'state_change', state: 'listening' }));
            }
            break;
          }

          case 'text_turn': {
            // Text fallback turn
            session.lastUserSpeechEnd = performance.now();
            await this.processUserTurn(session, msg.text, 0);
            break;
          }

          case 'interrupt': {
            // Caller interrupted during agent playback!
            session.generationId += 1; // Invalidate all pending chunks
            session.isProcessing = false;
            ws.send(
              JSON.stringify({
                type: 'state_change',
                state: 'interrupted',
                newGenerationId: session.generationId,
              })
            );
            console.log(`[VoiceServer] Interruption received. Incremented generationId to ${session.generationId}`);
            break;
          }

          case 'end_conversation': {
            await this.concludeSession(session);
            break;
          }
        }
      } catch (err: any) {
        console.error('[VoiceServer] Error handling ws message:', err);
        ws.send(JSON.stringify({ type: 'error', message: err.message || 'Internal voice pipeline error' }));
      }
    });

    ws.on('close', async () => {
      this.sessions.delete(ws);
      if (session.conversationId) {
        await conversationService.finishConversation(
          session.conversationId,
          ConversationOutcome.INCOMPLETE,
          'Conversation ended upon client disconnect.'
        ).catch(() => {});
      }
    });
  }

  private async processUserTurn(session: ClientSession, userText: string, asrDurationMs: number) {
    const currentGen = ++session.generationId;
    session.isProcessing = true;

    // Send thinking state
    session.ws.send(JSON.stringify({ type: 'state_change', state: 'thinking', generationId: currentGen }));

    // Persist user turn
    if (session.conversationId) {
      await conversationService.addMessage(session.conversationId, MessageRole.USER, userText, asrDurationMs);
    }
    session.history.push({ role: 'user', content: userText });

    // Call LLM
    const llmT0 = performance.now();
    const llmRes = await aiClient.generate(session.history, [], {
      requirements: session.leadRequirements,
      language: session.language,
    });
    const llmTotalMs = Math.round(performance.now() - llmT0);

    // If client interrupted while LLM was thinking, abort
    if (session.generationId !== currentGen) {
      console.log(`[VoiceServer] Turn aborted after LLM due to interruption (gen ${currentGen} vs current ${session.generationId})`);
      return;
    }

    // Execute tool calls proposed by LLM
    const toolResults: any[] = [];
    if (llmRes.toolCalls && llmRes.toolCalls.length > 0) {
      for (const call of llmRes.toolCalls) {
        const toolRes = await toolExecutor.executeTool(
          session.businessId,
          session.leadId,
          session.conversationId,
          call.name,
          call.arguments
        );
        toolResults.push(toolRes);

        session.ws.send(
          JSON.stringify({
            type: 'tool_execution',
            generationId: currentGen,
            toolName: call.name,
            arguments: call.arguments,
            result: toolRes.result,
            success: toolRes.success,
            durationMs: toolRes.executionTimeMs,
          })
        );

        if (call.name === 'update_lead_requirements' && toolRes.success && toolRes.result?.requirements) {
          session.leadRequirements = toolRes.result.requirements;
        }
      }
    }

    // Final spoken response text
    const responseText =
      llmRes.content ||
      (toolResults.some((t) => t.toolName === 'create_callback')
        ? 'Your callback appointment has been confirmed. Our specialist will call you then!'
        : 'Thank you for sharing. How else may I assist your property search today?');

    // Add assistant turn to history
    session.history.push({ role: 'assistant', content: responseText });
    if (session.conversationId) {
      await conversationService.addMessage(session.conversationId, MessageRole.ASSISTANT, responseText, llmTotalMs);
    }

    // Synthesize TTS
    session.ws.send(JSON.stringify({ type: 'state_change', state: 'speaking', generationId: currentGen }));

    const ttsT0 = performance.now();
    const ttsRes = await aiClient.synthesize(responseText, session.language, session.voiceGender || 'female');
    const ttsDurationMs = Math.round(performance.now() - ttsT0);

    // Measure End-of-user-speech to first audible response
    const e2eTurnaroundMs = session.lastUserSpeechEnd
      ? Math.round(performance.now() - session.lastUserSpeechEnd)
      : Math.round(asrDurationMs + llmTotalMs + ttsDurationMs);

    // Check again for interruption before playing audio!
    if (session.generationId !== currentGen) {
      console.log(`[VoiceServer] Turn aborted before audio playback due to interruption`);
      return;
    }

    // Send agent reply text and audio
    session.ws.send(
      JSON.stringify({
        type: 'agent_reply',
        generationId: currentGen,
        text: responseText,
        metrics: {
          asrDurationMs,
          llmTotalMs,
          ttsDurationMs,
          e2eTurnaroundMs,
        },
      })
    );

    session.ws.send(
      JSON.stringify({
        type: 'audio_chunk',
        generationId: currentGen,
        audioBase64: ttsRes.audioBase64,
        sampleRate: ttsRes.sampleRate,
        audioDurationSec: ttsRes.audioDurationSec,
      })
    );

    session.isProcessing = false;
  }

  private async concludeSession(session: ClientSession) {
    if (!session.conversationId) return;

    // Determine outcome
    let outcome: ConversationOutcome = ConversationOutcome.INFORMATION_ONLY;
    const reqs = session.leadRequirements;
    if (reqs?.isQualified) {
      outcome = ConversationOutcome.QUALIFIED_CALLBACK;
    }

    const summary = `Lead qualification session conducted in ${session.language.toUpperCase()}. ${
      reqs?.propertyType ? `Interested in ${reqs.bedrooms || ''} BHK ${reqs.propertyType} in ${reqs.location || 'Bangalore'}.` : 'General inquiries answered.'
    }`;

    await conversationService.finishConversation(
      session.conversationId,
      outcome,
      summary,
      { requirements: reqs }
    );

    session.ws.send(
      JSON.stringify({
        type: 'summary_ready',
        outcome,
        summary,
        requirements: reqs,
      })
    );

    session.ws.send(JSON.stringify({ type: 'state_change', state: 'idle' }));
  }
}

export const voiceServer = new VoiceServer();
