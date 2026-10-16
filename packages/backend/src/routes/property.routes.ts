import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { prisma } from '../database/prisma.js';
import { TransactionType } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const properties = await prisma.property.findMany({
    where: { businessId: req.user!.businessId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(properties);
});

const CreatePropertySchema = z.object({
  title: z.string().min(3),
  propertyType: z.string().min(2),
  transactionType: z.nativeEnum(TransactionType).default(TransactionType.BUY),
  location: z.string().min(2),
  address: z.string().min(5),
  price: z.number().positive(),
  bedrooms: z.number().int().optional(),
  bathrooms: z.number().int().optional(),
  areaSqFt: z.number().int().positive(),
  features: z.array(z.string()).default([]),
  approvedDescription: z.string().min(10),
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const data = CreatePropertySchema.parse(req.body);
  const property = await prisma.property.create({
    data: {
      ...data,
      businessId: req.user!.businessId,
    },
  });
  res.status(201).json(property);
});

export default router;
