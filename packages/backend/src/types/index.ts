import { Role, LeadStatus, TransactionType, ConversationChannel, ConversationStatus, ConversationOutcome, CallbackStatus, EscalationPriority } from '@prisma/client';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: Role;
  businessId: string;
}

export interface ConversationTurnState {
  sessionId: string;
  leadId?: string;
  businessId: string;
  language: string;
  generationId: number;
  history: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCallId?: string;
  }>;
  requirements: {
    propertyType?: string | null;
    transactionType?: TransactionType;
    location?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    timeline?: string | null;
    bedrooms?: number | null;
    isQualified?: boolean;
    missingFields?: string[];
  };
  currentWorkflowStage: 'GREETING' | 'QUALIFYING' | 'RECOMMENDING' | 'CALLBACK_OFFER' | 'CLOSING' | 'ESCALATED';
  pendingConfirmation?: {
    type: 'CALLBACK' | 'DO_NOT_CALL';
    proposedTime?: string;
    details?: Record<string, any>;
  };
  metrics: {
    asrDurationMs?: number;
    llmFirstTokenMs?: number;
    llmTotalMs?: number;
    ttsAudioDurationMs?: number;
    ttsTotalMs?: number;
    e2eDurationMs?: number;
    toolExecutionMs?: number;
  };
  finalOutcome?: ConversationOutcome;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolExecutionRequest {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  result: any;
  error?: string;
  executionTimeMs: number;
}

export interface TelephonyCallEvent {
  callId: string;
  provider: 'twilio' | 'exotel' | 'simulator';
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  timestamp: string;
  recordingUrl?: string;
}
