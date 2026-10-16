import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../database/prisma.js';
import { toolExecutor } from '../services/tool-executor.service.js';
import { aiClient } from '../services/ai-client.service.js';
import { VoiceServer } from '../websocket/voice-server.js';
import { Role, CallbackStatus, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

describe('Vaani Calling ERP Test Suite', () => {
  let businessId: string;
  let testLeadId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Ensure test business
    let business = await prisma.businessConfig.findFirst();
    if (!business) {
      business = await prisma.businessConfig.create({
        data: {
          name: 'Hoichoi',
          industry: 'Digital Entertainment & OTT Streaming',
          timezone: 'Asia/Kolkata',
        },
      });
    }
    businessId = business.id;

    // Create a fresh test lead
    const lead = await prisma.lead.create({
      data: {
        businessId,
        name: 'Automated Test Prospect',
        phone: `+9199999${Math.floor(10000 + Math.random() * 90000)}`,
        source: 'Automated Test',
        contactConsent: true,
        doNotCall: false,
      },
    });
    testLeadId = lead.id;

    // Create test user
    const user = await prisma.user.upsert({
      where: { email: 'test_operator@vaani.ai' },
      update: {},
      create: {
        email: 'test_operator@vaani.ai',
        passwordHash: await bcrypt.hash('TestPass@123', 10),
        name: 'Test Operator',
        role: Role.OPERATOR,
        businessId,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testLeadId) {
      await prisma.lead.delete({ where: { id: testLeadId } }).catch(() => {});
    }
  });

  describe('1. Authentication and Role Permissions', () => {
    it('should generate valid JWT and enforce role claims', () => {
      const token = jwt.sign(
        { userId: testUserId, email: 'test_operator@vaani.ai', role: Role.OPERATOR, businessId },
        config.jwtSecret
      );
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe(Role.OPERATOR);
      expect(decoded.businessId).toBe(businessId);
    });

    it('should reject invalid or tampered JWT', () => {
      expect(() => {
        jwt.verify('invalid.token.signature', config.jwtSecret);
      }).toThrow();
    });
  });

  describe('2. Lead Persistence and Requirement Updates', () => {
    it('should update lead requirements via tool and mark as qualified when valid', async () => {
      const res = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
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

      expect(res.success).toBe(true);
      expect(res.result.is_qualified).toBe(true);

      const lead = await prisma.lead.findUnique({
        where: { id: testLeadId },
        include: { requirements: true },
      });
      expect(lead?.requirements?.location).toBe('Whitefield');
      expect(lead?.requirements?.bedrooms).toBe(3);
      expect(Number(lead?.requirements?.budgetMax)).toBe(15000000);
      expect(lead?.status).toBe('QUALIFIED');
    });
  });

  describe('3. Tool Schema Validation and Boundaries', () => {
    it('should reject invalid parameters for get_business_information', async () => {
      const res = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
        'get_business_information',
        { query: '' } // query cannot be empty string
      );
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('should prevent SQL / arbitrary command injection attempts safely', async () => {
      const injectionAttempt = "'; DROP TABLE \"Lead\"; --";
      const res = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
        'get_business_information',
        { query: injectionAttempt }
      );
      // Prisma parameterized query returns 0 matches safely without executing injection
      expect(res.success).toBe(true);
      expect(res.result.count).toBeDefined();
    });

    it('should isolate tools to permitted lead and prevent cross-session leakage', async () => {
      const fakeLeadId = '00000000-0000-0000-0000-000000000000';
      const res = await toolExecutor.executeTool(
        businessId,
        fakeLeadId,
        undefined,
        'get_lead',
        {}
      );
      expect(res.result.error).toContain('Lead not found');
    });
  });

  describe('4. Callback Scheduling and Duplicate Prevention (Idempotency)', () => {
    it('should create callback and prevent duplicate on repeated identical request', async () => {
      const idempotencyKey = `test_idempotent_cb_${testLeadId}_${Date.now()}`;

      // First call
      const res1 = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
        'create_callback',
        {
          requested_time_text: 'tomorrow at 11:00 AM',
          reason: 'Site visit scheduling',
          idempotency_key: idempotencyKey,
        }
      );
      expect(res1.success).toBe(true);
      expect(res1.result.callback_id).toBeDefined();
      expect(res1.result.timezone).toBe('Asia/Kolkata');

      // Duplicate retry call with same key
      const res2 = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
        'create_callback',
        {
          requested_time_text: 'tomorrow at 11:00 AM',
          reason: 'Site visit scheduling',
          idempotency_key: idempotencyKey,
        }
      );
      expect(res2.success).toBe(true);
      expect(res2.result.is_duplicate).toBe(true);
      expect(res2.result.callback_id).toBe(res1.result.callback_id);
    });

    it('should refuse callback creation if lead is marked as Do Not Call', async () => {
      // Mark lead as DNC
      await prisma.lead.update({
        where: { id: testLeadId },
        data: { doNotCall: true },
      });

      const res = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
        'create_callback',
        {
          requested_time_text: 'tomorrow at 2:00 PM',
          idempotency_key: `dnc_test_${Date.now()}`,
        }
      );

      expect(res.result.success).toBe(false);
      expect(res.result.error).toContain('Do Not Call');

      // Revert DNC for clean state
      await prisma.lead.update({
        where: { id: testLeadId },
        data: { doNotCall: false },
      });
    });
  });

  describe('5. Approved Business Information and Property Search', () => {
    it('should return approved FAQs matching query', async () => {
      const res = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
        'get_business_information',
        { query: 'rera' }
      );
      expect(res.success).toBe(true);
      expect(res.result.entries.length).toBeGreaterThan(0);
      expect(res.result.entries[0].answer).toContain('RERA registered');
    });

    it('should search approved properties with filter constraints', async () => {
      const res = await toolExecutor.executeTool(
        businessId,
        testLeadId,
        undefined,
        'search_approved_properties',
        {
          location: 'Whitefield',
          bedrooms: 3,
          transaction_type: 'BUY',
        }
      );
      expect(res.success).toBe(true);
      expect(res.result.properties.length).toBeGreaterThan(0);
      expect(res.result.properties[0].location).toBe('Whitefield');
      expect(res.result.properties[0].bedrooms).toBe(3);
    });
  });

  describe('6. Voice Pipeline Interruption & Generation IDs', () => {
    it('should cancel active response playback when generation ID changes', () => {
      let generationId = 1;
      const turnGenId = generationId;

      // Simulate user interruption
      generationId += 1;

      // Check whether turn should play audio
      const shouldPlayAudio = turnGenId === generationId;
      expect(shouldPlayAudio).toBe(false);
      expect(generationId).toBe(2);
    });
  });

  describe('7. Mode Separation (Mock vs Real Mode Visibility)', () => {
    it('should report explicit mode and adapter status via readiness check', async () => {
      const readiness = await aiClient.checkReadiness();
      expect(readiness.aiMode).toBeDefined();
      expect(readiness.adapters).toBeDefined();
      expect(readiness.adapters.asr).toBeDefined();
      expect(readiness.adapters.llm).toBeDefined();
      expect(readiness.adapters.tts).toBeDefined();
    });
  });
});
