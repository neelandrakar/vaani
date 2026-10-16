import { Router, Request, Response } from 'express';
import { prisma } from '../database/prisma.js';
import { aiClient } from '../services/ai-client.service.js';

const router = Router();

// /health: Process liveness
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// /ready: Dependency readiness (Postgres and AI Service)
router.get('/ready', async (_req: Request, res: Response) => {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const aiServiceStatus = await aiClient.checkReadiness();

  const isReady = dbOk;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    database: dbOk ? 'up' : 'down',
    voicePipeline: aiServiceStatus.status,
    timestamp: new Date().toISOString(),
  });
});

export default router;
