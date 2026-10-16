import { prisma } from '../database/prisma.js';
import { LeadStatus, TransactionType } from '@prisma/client';

export interface CreateLeadDto {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  preferredLanguage?: string;
  status?: LeadStatus;
  notes?: string;
  contactConsent?: boolean;
  doNotCall?: boolean;
  requirements?: {
    propertyType?: string;
    transactionType?: TransactionType;
    location?: string;
    budgetMin?: number;
    budgetMax?: number;
    timeline?: string;
    bedrooms?: number;
    rawNotes?: string;
  };
}

export class LeadService {
  async listLeads(
    businessId: string,
    query?: {
      search?: string;
      status?: LeadStatus;
      skip?: number;
      take?: number;
    }
  ) {
    const where: any = { businessId };
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          requirements: true,
          callbacks: { orderBy: { requestedTime: 'desc' }, take: 1 },
          _count: { select: { conversations: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: query?.skip || 0,
        take: query?.take || 50,
      }),
    ]);

    return { total, leads };
  }

  async getLeadById(businessId: string, leadId: string) {
    return prisma.lead.findFirst({
      where: { id: leadId, businessId },
      include: {
        requirements: true,
        conversations: {
          orderBy: { startedAt: 'desc' },
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
            toolExecutions: { orderBy: { createdAt: 'asc' } },
          },
        },
        callbacks: {
          orderBy: { requestedTime: 'desc' },
          include: { assignedUser: { select: { name: true, email: true } } },
        },
        escalations: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createLead(businessId: string, data: CreateLeadDto) {
    return prisma.lead.create({
      data: {
        businessId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        source: data.source || 'Manual Entry',
        preferredLanguage: data.preferredLanguage || 'en',
        status: data.status || LeadStatus.NEW,
        notes: data.notes,
        contactConsent: data.contactConsent ?? true,
        doNotCall: data.doNotCall ?? false,
        requirements: data.requirements
          ? {
              create: {
                propertyType: data.requirements.propertyType,
                transactionType: data.requirements.transactionType || TransactionType.BUY,
                location: data.requirements.location,
                budgetMin: data.requirements.budgetMin,
                budgetMax: data.requirements.budgetMax,
                timeline: data.requirements.timeline,
                bedrooms: data.requirements.bedrooms,
                rawNotes: data.requirements.rawNotes,
                isQualified: Boolean(data.requirements.location && (data.requirements.budgetMax || data.requirements.budgetMin)),
              },
            }
          : undefined,
      },
      include: { requirements: true },
    });
  }

  async updateLead(businessId: string, leadId: string, data: Partial<CreateLeadDto>) {
    return prisma.lead.update({
      where: { id: leadId, businessId },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        status: data.status,
        notes: data.notes,
        contactConsent: data.contactConsent,
        doNotCall: data.doNotCall,
        preferredLanguage: data.preferredLanguage,
      },
      include: { requirements: true },
    });
  }
}

export const leadService = new LeadService();
