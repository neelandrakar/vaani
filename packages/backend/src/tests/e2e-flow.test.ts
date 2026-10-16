import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../database/prisma.js';
import { leadService } from '../services/lead.service.js';
import { conversationService } from '../services/conversation.service.js';
import { toolExecutor } from '../services/tool-executor.service.js';
import { aiClient } from '../services/ai-client.service.js';
import { ConversationChannel, ConversationOutcome, MessageRole, CallbackStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

describe('End-to-End Real Estate Calling ERP Flow', () => {
  let businessId: string;
  let operatorToken: string;
  let leadId: string;
  let conversationId: string;

  beforeAll(async () => {
    const business = await prisma.businessConfig.findFirst();
    businessId = business!.id;

    const operator = await prisma.user.findUnique({
      where: { email: 'operator@vaani.ai' },
    });
    operatorToken = jwt.sign(
      {
        userId: operator!.id,
        email: operator!.email,
        name: operator!.name,
        role: operator!.role,
        businessId,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (leadId) {
      await prisma.lead.delete({ where: { id: leadId } }).catch(() => {});
    }
  });

  it('Step 1: Authenticates operator and validates session', () => {
    const decoded = jwt.verify(operatorToken, config.jwtSecret) as any;
    expect(decoded.email).toBe('operator@vaani.ai');
    expect(decoded.role).toBe('OPERATOR');
    expect(decoded.businessId).toBe(businessId);
  });

  it('Step 2: Creates a new inbound lead with property preferences', async () => {
    const lead = await leadService.createLead(businessId, {
      name: 'Ananya Sen',
      phone: '+91 98300 12345',
      email: 'ananya.sen@example.com',
      source: 'Inbound Voice Call',
      preferredLanguage: 'en',
      status: 'NEW',
      contactConsent: true,
      doNotCall: false,
      notes: 'Interested in Whitefield residential projects.',
      requirements: {
        propertyType: 'Apartment',
        transactionType: 'BUY',
        location: 'Whitefield',
        budgetMax: 16000000,
        timeline: '1-3 months',
        bedrooms: 3,
      },
    });

    expect(lead.id).toBeDefined();
    expect(lead.name).toBe('Ananya Sen');
    expect(lead.requirements?.isQualified).toBe(true);
    leadId = lead.id;
  });

  it('Step 3: Starts an AI conversation session and delivers greeting', async () => {
    const conv = await conversationService.startConversation(
      businessId,
      leadId,
      ConversationChannel.BROWSER_VOICE,
      'en',
      'mock'
    );
    expect(conv.id).toBeDefined();
    expect(conv.status).toBe('ACTIVE');
    conversationId = conv.id;

    // Record greeting message
    const greetingMsg = await conversationService.addMessage(
      conversationId,
      MessageRole.ASSISTANT,
      'Namaste! I am Aura from Vaani Skyline Realty. Are you looking to buy or rent a property today?',
      0
    );
    expect(greetingMsg.id).toBeDefined();
  });

  it('Step 4: Collects requirements and executes update_lead_requirements tool', async () => {
    // Lead responds: "I am looking to buy a 3 BHK in Whitefield with budget 1.5 crore"
    await conversationService.addMessage(
      conversationId,
      MessageRole.USER,
      'I am looking to buy a 3 BHK in Whitefield with budget 1.5 crore',
      350
    );

    const toolRes = await toolExecutor.executeTool(
      businessId,
      leadId,
      conversationId,
      'update_lead_requirements',
      {
        transaction_type: 'BUY',
        property_type: 'Apartment',
        location: 'Whitefield',
        bedrooms: 3,
        budget_max: 15000000,
        timeline: '1-3 months',
      }
    );

    expect(toolRes.success).toBe(true);
    expect(toolRes.result.is_qualified).toBe(true);
  });

  it('Step 5: Answers approved FAQ question using get_business_information tool', async () => {
    // Lead asks: "Are all your properties RERA approved?"
    await conversationService.addMessage(
      conversationId,
      MessageRole.USER,
      'Are all your properties RERA approved?',
      300
    );

    const faqRes = await toolExecutor.executeTool(
      businessId,
      leadId,
      conversationId,
      'get_business_information',
      { query: 'rera' }
    );

    expect(faqRes.success).toBe(true);
    expect(faqRes.result.entries.length).toBeGreaterThan(0);
    expect(faqRes.result.entries[0].answer).toContain('RERA registered');

    // Assistant records answer turn
    await conversationService.addMessage(
      conversationId,
      MessageRole.ASSISTANT,
      faqRes.result.entries[0].answer,
      420
    );
  });

  it('Step 6: Confirms and schedules a callback with idempotency protection', async () => {
    // Lead: "Yes please schedule a callback tomorrow at 11 AM"
    await conversationService.addMessage(
      conversationId,
      MessageRole.USER,
      'Yes please schedule a callback tomorrow at 11 AM',
      280
    );

    const idempotencyKey = `e2e_cb_${leadId}_turn_6`;
    const cbRes = await toolExecutor.executeTool(
      businessId,
      leadId,
      conversationId,
      'create_callback',
      {
        requested_time_text: 'tomorrow at 11:00 AM',
        reason: 'Site visit coordination for Whitefield 3 BHK',
        idempotency_key: idempotencyKey,
      }
    );

    expect(cbRes.success).toBe(true);
    expect(cbRes.result.callback_id).toBeDefined();
    expect(cbRes.result.timezone).toBe('Asia/Kolkata');

    // Verify duplicate retry
    const retryRes = await toolExecutor.executeTool(
      businessId,
      leadId,
      conversationId,
      'create_callback',
      {
        requested_time_text: 'tomorrow at 11:00 AM',
        reason: 'Site visit coordination for Whitefield 3 BHK',
        idempotency_key: idempotencyKey,
      }
    );
    expect(retryRes.result.is_duplicate).toBe(true);
  });

  it('Step 7: Concludes conversation and generates structured summary', async () => {
    const finishedConv = await conversationService.finishConversation(
      conversationId,
      ConversationOutcome.QUALIFIED_CALLBACK,
      'Prospect qualified for 3 BHK purchase in Whitefield. Callback scheduled for tomorrow morning.',
      { location: 'Whitefield', bedrooms: 3, budgetMax: 15000000 },
      { asrMs: 350, llmMs: 420, ttsMs: 280, e2eMs: 1050 }
    );

    expect(finishedConv.status).toBe('COMPLETED');
    expect(finishedConv.outcome).toBe(ConversationOutcome.QUALIFIED_CALLBACK);
  });

  it('Step 8: Verifies full persistence of transcript, requirements, summary and callback upon reload', async () => {
    // Fetch refreshed conversation record
    const retrievedConv = await conversationService.getConversationById(businessId, conversationId);
    expect(retrievedConv).toBeDefined();
    expect(retrievedConv?.status).toBe('COMPLETED');
    expect(retrievedConv?.outcome).toBe('QUALIFIED_CALLBACK');
    expect(retrievedConv?.summary).toContain('Whitefield');
    expect(retrievedConv?.messages.length).toBeGreaterThanOrEqual(4);
    expect(retrievedConv?.toolExecutions.length).toBeGreaterThanOrEqual(2);

    // Verify lead status
    const retrievedLead = await leadService.getLeadById(businessId, leadId);
    expect(retrievedLead?.status).toBe('QUALIFIED');
    expect(retrievedLead?.requirements?.location).toBe('Whitefield');
    expect(retrievedLead?.callbacks.length).toBeGreaterThanOrEqual(1);
    expect(retrievedLead?.callbacks[0].status).toBe(CallbackStatus.PENDING);
  });
});
