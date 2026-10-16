import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { conversationService } from '../services/conversation.service.js';
import { aiClient } from '../services/ai-client.service.js';
import { toolExecutor } from '../services/tool-executor.service.js';
import { MessageRole, ConversationChannel, ConversationOutcome } from '@prisma/client';
import { prisma } from '../database/prisma.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const leadId = req.query.leadId as string | undefined;
  const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
  const take = req.query.take ? parseInt(req.query.take as string, 10) : 50;

  const result = await conversationService.listConversations(req.user!.businessId, {
    leadId,
    skip,
    take,
  });

  res.json(result);
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const conv = await conversationService.getConversationById(req.user!.businessId, req.params.id);
  if (!conv) {
    res.status(404).json({ error: 'NotFound', message: 'Conversation not found.' });
    return;
  }
  res.json(conv);
});

const StartConversationSchema = z.object({
  leadId: z.string().uuid().optional(),
  language: z.string().default('en'),
  channel: z.nativeEnum(ConversationChannel).default(ConversationChannel.BROWSER_TEXT),
});

router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  const { leadId, language, channel } = StartConversationSchema.parse(req.body);

  const business = await prisma.businessConfig.findUnique({
    where: { id: req.user!.businessId },
    include: { agentConfig: true },
  });

  const conv = await conversationService.startConversation(
    req.user!.businessId,
    leadId,
    channel,
    language,
    business?.agentConfig?.activeProvider || 'mock'
  );

  const greetingText =
    language === 'hi'
      ? 'नमस्ते! मैं ऑरा हूँ, वाणी स्काईलाइन रियल्टी की एआई सहायक। क्या आप आज कोई प्रॉपर्टी खरीदना या किराए पर लेना चाहते हैं?'
      : language === 'bn'
      ? 'নমস্কার! আমি অরা, বাণী স্কাইলাইন রিয়েল্টির এআই সহকারী। আপনি কি আজ কোনও সম্পত্তি কিনতে বা ভাড়া নিতে চান?'
      : business?.agentConfig?.introduction ||
        'Namaste! I am Aura, your AI property assistant from Vaani Skyline Realty. Are you looking to buy or rent a property today?';

  await conversationService.addMessage(conv.id, MessageRole.ASSISTANT, greetingText, 0);

  res.status(201).json({
    conversationId: conv.id,
    greeting: greetingText,
    language,
  });
});

const TextTurnSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1),
  language: z.string().default('en'),
});

router.post('/text-turn', async (req: AuthenticatedRequest, res: Response) => {
  const { conversationId, message, language } = TextTurnSchema.parse(req.body);

  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, businessId: req.user!.businessId },
    include: {
      lead: { include: { requirements: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!conv) {
    res.status(404).json({ error: 'NotFound', message: 'Conversation not found.' });
    return;
  }

  // 1. Record User Message
  await conversationService.addMessage(conversationId, MessageRole.USER, message, 0);

  // 2. Build History for LLM
  const history = conv.messages.map((m) => ({
    role: m.role.toLowerCase(),
    content: m.content,
  }));
  history.push({ role: 'user', content: message });

  // 3. Call LLM
  const llmT0 = performance.now();
  const llmRes = await aiClient.generate(history, [], {
    requirements: conv.lead?.requirements,
    language,
  });
  const llmDurationMs = Math.round(performance.now() - llmT0);

  // 4. Execute tool calls if proposed
  const toolResults: any[] = [];
  if (llmRes.toolCalls && llmRes.toolCalls.length > 0) {
    for (const call of llmRes.toolCalls) {
      const toolRes = await toolExecutor.executeTool(
        req.user!.businessId,
        conv.leadId || undefined,
        conv.id,
        call.name,
        call.arguments
      );
      toolResults.push(toolRes);
    }
  }

  // 5. Build response text
  const responseText =
    llmRes.content ||
    (toolResults.some((t) => t.toolName === 'create_callback')
      ? 'Your callback appointment has been confirmed. Our property specialist will contact you then!'
      : 'Thank you. I have recorded your preferences.');

  // 6. Record Assistant Message
  await conversationService.addMessage(conversationId, MessageRole.ASSISTANT, responseText, llmDurationMs);

  res.json({
    response: responseText,
    toolResults,
    metrics: {
      llmDurationMs,
      totalTokens: llmRes.usage.totalTokens,
    },
  });
});

export default router;
