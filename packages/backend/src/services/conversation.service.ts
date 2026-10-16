import { prisma } from '../database/prisma.js';
import { ConversationChannel, ConversationStatus, ConversationOutcome, MessageRole } from '@prisma/client';

export class ConversationService {
  async listConversations(businessId: string, options?: { skip?: number; take?: number; leadId?: string }) {
    const where: any = { businessId };
    if (options?.leadId) {
      where.leadId = options.leadId;
    }

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        include: {
          lead: { select: { id: true, name: true, phone: true, status: true } },
          _count: { select: { messages: true, toolExecutions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
    ]);

    return { total, conversations };
  }

  async getConversationById(businessId: string, conversationId: string) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
      include: {
        lead: {
          include: {
            requirements: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        toolExecutions: {
          orderBy: { createdAt: 'asc' },
        },
        callbacks: true,
        escalations: true,
      },
    });
  }

  async startConversation(
    businessId: string,
    leadId?: string,
    channel: ConversationChannel = ConversationChannel.BROWSER_VOICE,
    language: string = 'en',
    providerId: string = 'mock'
  ) {
    return prisma.conversation.create({
      data: {
        businessId,
        leadId: leadId || null,
        channel,
        language,
        providerId,
        status: ConversationStatus.ACTIVE,
        startedAt: new Date(),
      },
      include: {
        lead: {
          include: { requirements: true },
        },
      },
    });
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    latencyMs?: number,
    toolCallId?: string
  ) {
    return prisma.conversationMessage.create({
      data: {
        conversationId,
        role,
        content,
        latencyMs,
        toolCallId,
      },
    });
  }

  async finishConversation(
    conversationId: string,
    outcome: ConversationOutcome,
    summary: string,
    structuredData?: any,
    metrics?: any
  ) {
    const existing = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    const endedAt = new Date();
    const durationSec = existing?.startedAt
      ? Math.max(1, Math.round((endedAt.getTime() - new Date(existing.startedAt).getTime()) / 1000))
      : 30;

    return prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: ConversationStatus.COMPLETED,
        outcome,
        summary,
        structuredData: structuredData || undefined,
        latencyMetrics: metrics || undefined,
        endedAt,
        durationSec,
      },
    });
  }
}

export const conversationService = new ConversationService();
