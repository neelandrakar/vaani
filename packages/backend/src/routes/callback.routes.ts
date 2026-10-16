import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { callbackService } from '../services/callback.service.js';
import { CallbackStatus } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as CallbackStatus | undefined;
  const callbacks = await callbackService.listCallbacks(req.user!.businessId, status);
  res.json(callbacks);
});

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(CallbackStatus),
  notes: z.string().optional(),
});

router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const { status, notes } = UpdateStatusSchema.parse(req.body);
  const updated = await callbackService.updateCallbackStatus(req.user!.businessId, req.params.id, status, notes);
  res.json(updated);
});

const AssignOperatorSchema = z.object({
  operatorUserId: z.string().uuid(),
});

router.post('/:id/assign', async (req: AuthenticatedRequest, res: Response) => {
  const { operatorUserId } = AssignOperatorSchema.parse(req.body);
  const updated = await callbackService.assignOperator(req.user!.businessId, req.params.id, operatorUserId);
  res.json(updated);
});

export default router;
