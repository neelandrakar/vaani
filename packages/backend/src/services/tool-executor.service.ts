import { prisma } from '../database/prisma.js';
import { z } from 'zod';
import { ToolExecutionResult } from '../types/index.js';
import { TransactionType, CallbackStatus, EscalationPriority, ConversationOutcome } from '@prisma/client';

// Schemas for tool parameter validation
const GetBusinessInfoSchema = z.object({
  query: z.string().min(1).max(200),
  category: z.string().optional(),
});

const SearchApprovedPropertiesSchema = z.object({
  location: z.string().optional().nullable(),
  transaction_type: z.enum(['BUY', 'RENT', 'BOTH']).optional().nullable(),
  bedrooms: z.number().int().min(1).max(10).optional().nullable(),
  max_price: z.number().positive().optional().nullable(),
  property_type: z.string().optional().nullable(),
});

const GetLeadSchema = z.object({
  lead_id: z.string().uuid().optional(),
});

const UpdateLeadRequirementsSchema = z.object({
  property_type: z.string().optional().nullable(),
  transaction_type: z.enum(['BUY', 'RENT', 'BOTH']).optional().nullable(),
  location: z.string().optional().nullable(),
  budget_min: z.number().positive().optional().nullable(),
  budget_max: z.number().positive().optional().nullable(),
  timeline: z.string().optional().nullable(),
  bedrooms: z.number().int().min(1).max(10).optional().nullable(),
});

const CreateCallbackSchema = z.object({
  requested_time_text: z.string().min(2).max(100),
  reason: z.string().max(255).optional(),
  idempotency_key: z.string().optional(),
});

const RequestHumanAssistanceSchema = z.object({
  reason: z.string().min(1).max(500),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

const FinishConversationSchema = z.object({
  outcome: z.nativeEnum(ConversationOutcome),
  reason: z.string().max(500).optional(),
});

export class ToolExecutorService {
  /**
   * Safe, schema-validated tool executor bounded by business and lead permissions.
   */
  async executeTool(
    businessId: string,
    permittedLeadId: string | undefined,
    conversationId: string | undefined,
    toolName: string,
    inputArgs: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const t0 = performance.now();

    try {
      let resultData: any = null;

      switch (toolName) {
        case 'get_business_information': {
          const params = GetBusinessInfoSchema.parse(inputArgs);
          const entries = await prisma.knowledgeEntry.findMany({
            where: {
              businessId,
              isActive: true,
            },
            take: 10,
          });

          // Match by keywords or query substring
          const q = params.query.toLowerCase();
          const matched = entries.filter((e) => {
            if (params.category && e.category.toLowerCase() !== params.category.toLowerCase()) return false;
            if (e.question.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q)) return true;
            return e.keywords.some((k) => q.includes(k.toLowerCase()) || k.toLowerCase().includes(q));
          });

          resultData = {
            count: matched.length > 0 ? matched.length : entries.length,
            entries: (matched.length > 0 ? matched : entries.slice(0, 3)).map((e) => ({
              category: e.category,
              question: e.question,
              answer: e.answer,
            })),
          };
          break;
        }

        case 'search_approved_properties': {
          const params = SearchApprovedPropertiesSchema.parse(inputArgs);
          const whereClause: any = { businessId, status: 'AVAILABLE' };

          if (params.location) {
            whereClause.location = { contains: params.location, mode: 'insensitive' };
          }
          if (params.transaction_type && params.transaction_type !== 'BOTH') {
            whereClause.transactionType = params.transaction_type as TransactionType;
          }
          if (params.bedrooms) {
            whereClause.bedrooms = params.bedrooms;
          }
          if (params.max_price) {
            whereClause.price = { lte: params.max_price };
          }
          if (params.property_type) {
            whereClause.propertyType = { contains: params.property_type, mode: 'insensitive' };
          }

          const properties = await prisma.property.findMany({
            where: whereClause,
            take: 5,
            orderBy: { price: 'asc' },
          });

          resultData = {
            count: properties.length,
            properties: properties.map((p) => ({
              id: p.id,
              title: p.title,
              property_type: p.propertyType,
              transaction_type: p.transactionType,
              location: p.location,
              price: Number(p.price),
              bedrooms: p.bedrooms,
              area_sqft: p.areaSqFt,
              features: p.features,
              description: p.approvedDescription,
            })),
          };
          break;
        }

        case 'get_lead': {
          GetLeadSchema.parse(inputArgs);
          if (!permittedLeadId) {
            resultData = { error: 'No lead attached to current session' };
            break;
          }

          const lead = await prisma.lead.findFirst({
            where: { id: permittedLeadId, businessId },
            include: { requirements: true },
          });

          if (!lead) {
            resultData = { error: 'Lead not found or unauthorized' };
          } else {
            resultData = {
              id: lead.id,
              name: lead.name,
              phone: lead.phone,
              email: lead.email,
              status: lead.status,
              preferred_language: lead.preferredLanguage,
              contact_consent: lead.contactConsent,
              do_not_call: lead.doNotCall,
              requirements: lead.requirements,
            };
          }
          break;
        }

        case 'update_lead_requirements': {
          const params = UpdateLeadRequirementsSchema.parse(inputArgs);
          if (!permittedLeadId) {
            resultData = { error: 'No lead attached to current session for update' };
            break;
          }

          // Idempotent upsert
          const updated = await prisma.leadRequirements.upsert({
            where: { leadId: permittedLeadId },
            update: {
              propertyType: params.property_type ?? undefined,
              transactionType: params.transaction_type as TransactionType ?? undefined,
              location: params.location ?? undefined,
              budgetMin: params.budget_min ?? undefined,
              budgetMax: params.budget_max ?? undefined,
              timeline: params.timeline ?? undefined,
              bedrooms: params.bedrooms ?? undefined,
              isQualified: Boolean(params.location && (params.budget_max || params.budget_min)),
            },
            create: {
              leadId: permittedLeadId,
              propertyType: params.property_type,
              transactionType: (params.transaction_type as TransactionType) || TransactionType.BUY,
              location: params.location,
              budgetMin: params.budget_min,
              budgetMax: params.budget_max,
              timeline: params.timeline,
              bedrooms: params.bedrooms,
              isQualified: Boolean(params.location && (params.budget_max || params.budget_min)),
            },
          });

          // Also set lead status to QUALIFIED if ready
          if (updated.isQualified) {
            await prisma.lead.update({
              where: { id: permittedLeadId },
              data: { status: 'QUALIFIED' },
            });
          }

          resultData = {
            success: true,
            requirements: updated,
            is_qualified: updated.isQualified,
          };
          break;
        }

        case 'create_callback': {
          const params = CreateCallbackSchema.parse(inputArgs);
          if (!permittedLeadId) {
            resultData = { error: 'Cannot create callback without active lead' };
            break;
          }

          // Check lead DNC status first
          const lead = await prisma.lead.findUnique({
            where: { id: permittedLeadId },
          });
          if (lead?.doNotCall) {
            resultData = {
              success: false,
              error: 'Lead is marked as Do Not Call. Callback cannot be scheduled.',
            };
            break;
          }

          // Parse requested time text in Asia/Kolkata
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + 1);
          scheduledDate.setHours(11, 0, 0, 0); // Default tomorrow 11:00 AM IST

          // Idempotency protection key
          const idempotencyKey =
            params.idempotency_key || `cb_${permittedLeadId}_${scheduledDate.toISOString().slice(0, 10)}`;

          // Check if already created
          const existingCb = await prisma.callback.findUnique({
            where: { idempotencyKey },
          });

          if (existingCb) {
            resultData = {
              success: true,
              callback_id: existingCb.id,
              requested_time: existingCb.requestedTime,
              timezone: existingCb.timezone,
              status: existingCb.status,
              is_duplicate: true,
              message: 'Existing callback confirmed (idempotent)',
            };
            break;
          }

          const callback = await prisma.callback.create({
            data: {
              businessId,
              leadId: permittedLeadId,
              conversationId: conversationId || null,
              requestedTime: scheduledDate,
              timezone: 'Asia/Kolkata',
              status: CallbackStatus.PENDING,
              reason: params.reason || 'Lead follow-up callback',
              idempotencyKey,
            },
          });

          resultData = {
            success: true,
            callback_id: callback.id,
            requested_time: callback.requestedTime,
            timezone: callback.timezone,
            status: callback.status,
            formatted_time: 'Tomorrow at 11:00 AM IST',
            message: 'Callback appointment scheduled successfully.',
          };
          break;
        }

        case 'request_human_assistance': {
          const params = RequestHumanAssistanceSchema.parse(inputArgs);
          if (!permittedLeadId) {
            resultData = { error: 'No active lead to escalate' };
            break;
          }

          const escalation = await prisma.escalation.create({
            data: {
              businessId,
              leadId: permittedLeadId,
              conversationId: conversationId || null,
              reason: params.reason,
              priority: params.priority as EscalationPriority,
              status: 'OPEN',
            },
          });

          resultData = {
            success: true,
            escalation_id: escalation.id,
            priority: escalation.priority,
            message: 'An escalation record has been created for human operator review.',
          };
          break;
        }

        case 'finish_conversation': {
          const params = FinishConversationSchema.parse(inputArgs);
          if (conversationId) {
            await prisma.conversation.update({
              where: { id: conversationId },
              data: {
                status: 'COMPLETED',
                outcome: params.outcome,
                endedAt: new Date(),
              },
            });
          }

          if (params.outcome === 'DO_NOT_CALL' && permittedLeadId) {
            await prisma.lead.update({
              where: { id: permittedLeadId },
              data: { doNotCall: true, contactConsent: false },
            });
          }

          resultData = {
            success: true,
            outcome: params.outcome,
            reason: params.reason,
          };
          break;
        }

        default:
          return {
            toolCallId: inputArgs.id || `call_${Date.now()}`,
            toolName,
            success: false,
            result: null,
            error: `Unsupported tool: ${toolName}`,
            executionTimeMs: Math.round(performance.now() - t0),
          };
      }

      const elapsed = Math.round(performance.now() - t0);

      // Persist ToolExecution record if conversation exists
      if (conversationId) {
        await prisma.toolExecution.create({
          data: {
            conversationId,
            toolName,
            inputParams: inputArgs,
            outputResult: resultData,
            status: 'SUCCESS',
            executionTimeMs: elapsed,
          },
        }).catch((err) => console.error('Failed to log tool execution:', err));
      }

      return {
        toolCallId: inputArgs.id || `call_${Date.now()}`,
        toolName,
        success: true,
        result: resultData,
        executionTimeMs: elapsed,
      };
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - t0);
      console.error(`[ToolExecutor] Error executing ${toolName}:`, err);

      return {
        toolCallId: inputArgs.id || `call_${Date.now()}`,
        toolName,
        success: false,
        result: null,
        error: err.message || 'Tool execution error',
        executionTimeMs: elapsed,
      };
    }
  }
}

export const toolExecutor = new ToolExecutorService();
