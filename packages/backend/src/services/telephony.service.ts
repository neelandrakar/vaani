import { TelephonyCallEvent } from '../types/index.js';
import crypto from 'crypto';

export interface TelephonyAdapter {
  providerName: string;
  validateWebhook(signature: string, payload: any, secret: string): boolean;
  initiateCall(to: string, from: string, options: Record<string, any>): Promise<{ callId: string; status: string }>;
  endCall(callId: string): Promise<boolean>;
  transferCall(callId: string, forwardTo: string): Promise<boolean>;
}

/**
 * Local Simulator Adapter for testing telephony webhooks and media stream events locally.
 */
export class TelephonySimulatorAdapter implements TelephonyAdapter {
  providerName = 'simulator';

  validateWebhook(_signature: string, _payload: any, _secret: string): boolean {
    return true; // simulator accepts test webhooks
  }

  async initiateCall(to: string, from: string, options: Record<string, any>) {
    const callId = `sim_call_${Date.now()}`;
    return {
      callId,
      status: 'in-progress',
      details: {
        to,
        from,
        channel: 'simulator-media-stream',
        options,
      },
    };
  }

  async endCall(callId: string): Promise<boolean> {
    console.log(`[TelephonySimulator] Hung up call: ${callId}`);
    return true;
  }

  async transferCall(callId: string, forwardTo: string): Promise<boolean> {
    console.log(`[TelephonySimulator] Transferred call ${callId} to ${forwardTo}`);
    return true;
  }
}

/**
 * Twilio Telephony Adapter interface implementation
 */
export class TwilioTelephonyAdapter implements TelephonyAdapter {
  providerName = 'twilio';

  validateWebhook(signature: string, payload: any, authToken: string): boolean {
    if (!signature || !authToken) return false;
    try {
      // Twilio HMAC-SHA1 signature verification
      const data = Object.keys(payload)
        .sort()
        .reduce((acc, key) => acc + key + payload[key], '');
      const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  async initiateCall(): Promise<{ callId: string; status: string }> {
    throw new Error('Outbound telephony calls are disabled by default in this MVP.');
  }

  async endCall(): Promise<boolean> {
    return true;
  }

  async transferCall(): Promise<boolean> {
    return true;
  }
}

export class TelephonyService {
  private simulator = new TelephonySimulatorAdapter();
  private twilio = new TwilioTelephonyAdapter();

  getAdapter(provider: string = 'simulator'): TelephonyAdapter {
    if (provider === 'twilio') return this.twilio;
    return this.simulator;
  }

  handleIncomingCall(event: TelephonyCallEvent) {
    console.log(`[Telephony] Inbound call received from ${event.from} on ${event.provider}`);
    return {
      action: 'connect_stream',
      streamUrl: `ws://localhost:5001/ws/voice?caller=${encodeURIComponent(event.from)}&channel=telephony`,
    };
  }
}

export const telephonyService = new TelephonyService();
