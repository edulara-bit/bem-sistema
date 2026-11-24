import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export function getPrismaClient(): PrismaClient {
  // Se o cliente em cache for de uma versão antiga sem o modelo 'lead', força a recriação
  if (!globalForPrisma.prisma || !(globalForPrisma.prisma as any).lead) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();

/**
 * Cria um wrapper para queries seguras garantindo que o tenantId nunca seja esquecido.
 */
export function getTenantDb(tenantId: string) {
  if (!tenantId) {
    throw new Error('Operação de banco de dados rejeitada: tenantId obrigatório.');
  }

  const client = getPrismaClient();

  return {
    patients: {
      findMany: (args: any = {}) =>
        client.patient.findMany({
          ...args,
          where: { ...(args?.where || {}), tenantId },
        }),
      findUnique: (id: string) =>
        client.patient.findFirst({
          where: { id, tenantId },
          include: {
            appointments: { orderBy: { scheduledAt: 'desc' } },
            records: { orderBy: { sessionDate: 'desc' } },
            finances: { orderBy: { dueDate: 'desc' } },
          },
        }),
      create: (data: Omit<Prisma.PatientUncheckedCreateInput, 'tenantId'>) =>
        client.patient.create({
          data: { ...data, tenantId },
        }),
      update: (id: string, data: Prisma.PatientUpdateInput) =>
        client.patient.updateMany({
          where: { id, tenantId },
          data,
        }),
    },
    appointments: {
      findMany: (args: any = {}) =>
        client.appointment.findMany({
          include: { patient: true, record: true, transaction: true },
          orderBy: { scheduledAt: 'asc' },
          ...args,
          where: { ...(args?.where || {}), tenantId },
        }),
      create: (data: Omit<Prisma.AppointmentUncheckedCreateInput, 'tenantId'>) =>
        client.appointment.create({
          data: { ...data, tenantId },
          include: { patient: true },
        }),
      updateStatus: (id: string, status: string) =>
        client.appointment.updateMany({
          where: { id, tenantId },
          data: { status },
        }),
    },
    records: {
      findByPatient: (patientId: string) =>
        client.clinicalRecord.findMany({
          where: { tenantId, patientId },
          orderBy: { sessionDate: 'desc' },
        }),
      create: (data: Omit<Prisma.ClinicalRecordUncheckedCreateInput, 'tenantId'>) =>
        client.clinicalRecord.create({
          data: { ...data, tenantId },
        }),
    },
    finances: {
      findSummary: async () => {
        const transactions = await client.financialTransaction.findMany({
          where: { tenantId },
        });

        const totalReceived = transactions
          .filter((t) => t.type === 'income' && t.status === 'paid')
          .reduce((acc, t) => acc + t.amount, 0);

        const totalPending = transactions
          .filter((t) => t.type === 'income' && t.status === 'pending')
          .reduce((acc, t) => acc + t.amount, 0);

        const totalExpenses = transactions
          .filter((t) => t.type === 'expense' && t.status === 'paid')
          .reduce((acc, t) => acc + t.amount, 0);

        return {
          totalReceived,
          totalPending,
          totalExpenses,
          balance: totalReceived - totalExpenses,
        };
      },
      findMany: (args: any = {}) =>
        client.financialTransaction.findMany({
          include: { patient: true, appointment: true },
          orderBy: { dueDate: 'desc' },
          ...args,
          where: { ...(args?.where || {}), tenantId },
        }),
      create: (data: Omit<Prisma.FinancialTransactionUncheckedCreateInput, 'tenantId'>) =>
        client.financialTransaction.create({
          data: { ...data, tenantId },
        }),
      markAsPaid: (id: string, paymentMethod = 'pix') =>
        client.financialTransaction.updateMany({
          where: { id, tenantId },
          data: {
            status: 'paid',
            paidAt: new Date(),
            paymentMethod,
          },
        }),
    },
    leads: {
      findMany: (args: any = {}) => {
        if (!client.lead) return [];
        return client.lead.findMany({
          orderBy: { createdAt: 'desc' },
          ...args,
          where: { ...(args?.where || {}), tenantId },
        });
      },
      findUnique: (id: string) => {
        if (!client.lead) return null;
        return client.lead.findFirst({
          where: { id, tenantId },
        });
      },
      create: (data: Omit<Prisma.LeadUncheckedCreateInput, 'tenantId'>) => {
        if (!client.lead) throw new Error('Modelo Lead indisponível.');
        return client.lead.create({
          data: { ...data, tenantId },
        });
      },
      updateStage: (id: string, stage: string) => {
        if (!client.lead) return;
        return client.lead.updateMany({
          where: { id, tenantId },
          data: { stage },
        });
      },
    },
    availabilityRules: {
      findMany: () =>
        client.availabilityRule.findMany({
          where: { tenantId },
          orderBy: { dayOfWeek: 'asc' },
        }),
      upsert: (dayOfWeek: number, enabled: boolean, hours: string) =>
        client.availabilityRule.upsert({
          where: { tenantId_dayOfWeek: { tenantId, dayOfWeek } },
          update: { enabled, hours },
          create: { tenantId, dayOfWeek, enabled, hours },
        }),
    },
    blockedDates: {
      findMany: (minDate?: string) =>
        client.blockedDate.findMany({
          where: {
            tenantId,
            ...(minDate ? { date: { gte: minDate } } : {}),
          },
          orderBy: { date: 'asc' },
        }),
      create: (date: string, reason?: string) =>
        client.blockedDate.upsert({
          where: { tenantId_date: { tenantId, date } },
          update: { reason },
          create: { tenantId, date, reason },
        }),
      delete: (date: string) =>
        client.blockedDate.deleteMany({
          where: { tenantId, date },
        }),
    },
    blockedSlots: {
      findMany: (minDate?: string) =>
        client.blockedSlot.findMany({
          where: {
            tenantId,
            ...(minDate ? { date: { gte: minDate } } : {}),
          },
          orderBy: [{ date: 'asc' }, { time: 'asc' }],
        }),
      toggle: async (date: string, time: string, reason?: string) => {
        const existing = await client.blockedSlot.findUnique({
          where: { tenantId_date_time: { tenantId, date, time } },
        });
        if (existing) {
          await client.blockedSlot.delete({
            where: { id: existing.id },
          });
          return { blocked: false };
        } else {
          await client.blockedSlot.create({
            data: { tenantId, date, time, reason: reason || 'Bloqueado manualmente' },
          });
          return { blocked: true };
        }
      },
      delete: (date: string, time: string) =>
        client.blockedSlot.deleteMany({
          where: { tenantId, date, time },
        }),
    },
  };
}
