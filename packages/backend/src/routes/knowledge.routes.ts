import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../database/prisma.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const entries = await prisma.knowledgeEntry.findMany({
    where: { businessId: req.user!.businessId },
    orderBy: { category: 'asc' },
  });
  res.json(entries);
});

const CreateKnowledgeSchema = z.object({
  category: z.string().min(2),
  question: z.string().min(5),
  answer: z.string().min(5),
  keywords: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const data = CreateKnowledgeSchema.parse(req.body);
  const entry = await prisma.knowledgeEntry.create({
    data: {
      ...data,
      businessId: req.user!.businessId,
    },
  });
  res.status(201).json(entry);
});

export default router;
