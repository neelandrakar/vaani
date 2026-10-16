import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../database/prisma.js';
import { aiClient } from '../services/ai-client.service.js';
import { Role } from '@prisma/client';
import { config } from '../config/env.js';

const router = Router();

router.use(authenticate);

router.get('/business', async (req: AuthenticatedRequest, res: Response) => {
  const business = await prisma.businessConfig.findUnique({
    where: { id: req.user!.businessId },
    include: {
      agentConfig: true,
      users: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  if (!business) {
    res.status(404).json({ error: 'NotFound', message: 'Business configuration not found.' });
    return;
  }

  // Display secret status without returning raw secrets
  const secretStatus = {
    jwtSecretConfigured: Boolean(config.jwtSecret && config.jwtSecret.length > 10),
    databaseConfigured: Boolean(config.databaseUrl),
    twilioConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_ACCOUNT_SID),
    exotelConfigured: Boolean(process.env.EXOTEL_API_KEY && process.env.EXOTEL_API_TOKEN),
  };

  res.json({
    business,
    secretStatus,
  });
});

const UpdateAgentConfigSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  introduction: z.string().min(5).max(500).optional(),
  fallbackMessage: z.string().min(5).max(500).optional(),
  supportedLanguages: z.array(z.string()).min(1).optional(),
  voiceGender: z.enum(['female', 'male']).optional(),
  activeProvider: z.enum(['mock', 'real']).optional(),
  qualificationPrompt: z.string().optional(),
  escalationRules: z.string().optional(),
  isRecordingEnabled: z.boolean().optional(),
  retentionDays: z.number().int().min(1).max(365).optional(),
});

// Admin-only route to update agent configuration
router.patch('/agent', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  const data = UpdateAgentConfigSchema.parse(req.body);

  const updated = await prisma.agentConfig.update({
    where: { businessId: req.user!.businessId },
    data,
  });

  res.json(updated);
});

// System readiness route: separates Core ERP from Voice readiness
router.get('/readiness', async (req: AuthenticatedRequest, res: Response) => {
  let dbReady = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
  } catch {
    dbReady = false;
  }

  const aiServiceStatus = await aiClient.checkReadiness();

  res.json({
    timestamp: new Date().toISOString(),
    coreErp: {
      ready: dbReady,
      database: dbReady ? 'Connected (PostgreSQL)' : 'Disconnected',
      role: req.user!.role,
    },
    voicePipeline: {
      ready: aiServiceStatus.status === 'ok' || aiServiceStatus.status === 'mock_active',
      status: aiServiceStatus.status,
      activeMode: aiServiceStatus.aiMode,
      gpuAvailable: aiServiceStatus.gpuAvailable,
      device: aiServiceStatus.deviceName,
      adapters: aiServiceStatus.adapters,
      note: aiServiceStatus.gpuAvailable
        ? 'NVIDIA GPU detected; real model weights can be initialized.'
        : 'Running in deterministic Mock / CPU mode. Fully functional for lead qualification and workflow testing without GPU.',
    },
  });
});

// Voice Preview endpoint for authentic neural Indian accents
router.post('/preview-voice', async (req: AuthenticatedRequest, res: Response) => {
  const { text, language, voice, pitch, rate } = req.body;
  const sample =
    text ||
    (language === 'hi'
      ? 'नमस्ते! मैं ऑरा हूँ, वाणी स्काईलाइन रियल्टी की प्रॉपर्टी सलाहकार। आज आपको कैसे सहायता कर सकती हूँ?'
      : language === 'bn'
      ? 'নমস্কার! আমি অরা, বাণী স্কাইলাইন রিয়েল্টির এআই সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?'
      : 'Namaste! I am Aura, your AI property assistant from Vaani Skyline Realty. How may I assist your property search today?');

  const result = await aiClient.synthesize(sample, language || 'en', voice || 'female', pitch, rate);
  res.json(result);
});

export default router;
