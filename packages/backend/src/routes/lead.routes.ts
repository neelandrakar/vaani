import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { leadService } from '../services/lead.service.js';
import { LeadStatus, TransactionType } from '@prisma/client';

const router = Router();

router.use(authenticate);

const CreateLeadBodySchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal('')),
  source: z.string().optional(),
  preferredLanguage: z.string().default('en'),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  notes: z.string().optional(),
  contactConsent: z.boolean().default(true),
  doNotCall: z.boolean().default(false),
  requirements: z
    .object({
      propertyType: z.string().optional(),
      transactionType: z.nativeEnum(TransactionType).default(TransactionType.BUY),
      location: z.string().optional(),
      budgetMin: z.number().optional(),
      budgetMax: z.number().optional(),
      timeline: z.string().optional(),
      bedrooms: z.number().int().optional(),
      rawNotes: z.string().optional(),
    })
    .optional(),
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const search = req.query.search as string | undefined;
  const status = req.query.status as LeadStatus | undefined;
  const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
  const take = req.query.take ? parseInt(req.query.take as string, 10) : 50;

  const result = await leadService.listLeads(req.user!.businessId, {
    search,
    status,
    skip,
    take,
  });

  res.json(result);
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const lead = await leadService.getLeadById(req.user!.businessId, req.params.id);
  if (!lead) {
    res.status(404).json({ error: 'NotFound', message: 'Lead not found.' });
    return;
  }
  res.json(lead);
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const validated = CreateLeadBodySchema.parse(req.body);
  const lead = await leadService.createLead(req.user!.businessId, {
    ...validated,
    email: validated.email || undefined,
  });
  res.status(201).json(lead);
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const lead = await leadService.updateLead(req.user!.businessId, req.params.id, req.body);
  res.json(lead);
});

export default router;
