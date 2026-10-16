import { Router, Request, Response } from 'express';
import { telephonyService } from '../services/telephony.service.js';

const router = Router();

// Inbound Telephony Webhook (Simulator and Provider Integration)
router.post('/webhook/inbound', (req: Request, res: Response) => {
  const provider = (req.headers['x-telephony-provider'] as string) || 'simulator';
  const signature = (req.headers['x-telephony-signature'] as string) || '';

  const adapter = telephonyService.getAdapter(provider);
  const isValid = adapter.validateWebhook(signature, req.body, process.env.TWILIO_AUTH_TOKEN || '');

  if (!isValid && provider !== 'simulator') {
    res.status(403).json({ error: 'InvalidSignature', message: 'Telephony webhook signature verification failed.' });
    return;
  }

  const result = telephonyService.handleIncomingCall({
    callId: req.body.CallSid || `sim_${Date.now()}`,
    provider: provider as any,
    direction: 'inbound',
    from: req.body.From || '+919999999999',
    to: req.body.To || '+918040008899',
    status: 'in-progress',
    timestamp: new Date().toISOString(),
  });

  res.json(result);
});

// Simulator trigger endpoint for testing inbound call handling
router.post('/simulator/trigger-call', async (req: Request, res: Response) => {
  const { callerPhone, targetLanguage } = req.body;
  const adapter = telephonyService.getAdapter('simulator');

  const result = await adapter.initiateCall(
    '+918040008899',
    callerPhone || '+919876543210',
    { language: targetLanguage || 'en' }
  );

  res.json({
    message: 'Simulator call triggered successfully.',
    callDetails: result,
  });
});

export default router;
