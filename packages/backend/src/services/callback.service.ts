import { prisma } from '../database/prisma.js';
import { CallbackStatus } from '@prisma/client';

export class CallbackService {
  async listCallbacks(businessId: string, status?: CallbackStatus) {
    const where: any = { businessId };
    if (status) {
      where.status = status;
    }

    return prisma.callback.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            preferredLanguage: true,
            requirements: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { requestedTime: 'asc' },
    });
  }

  async updateCallbackStatus(businessId: string, callbackId: string, status: CallbackStatus, notes?: string) {
    return prisma.callback.update({
      where: { id: callbackId, businessId },
      data: {
        status,
        notes: notes ?? undefined,
      },
    });
  }

  async assignOperator(businessId: string, callbackId: string, operatorUserId: string) {
    return prisma.callback.update({
      where: { id: callbackId, businessId },
      data: {
        assignedUserId: operatorUserId,
      },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const callbackService = new CallbackService();
