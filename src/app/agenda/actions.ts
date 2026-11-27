'use server';

import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { revalidatePath } from 'next/cache';

export async function createAppointmentAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const patientId = formData.get('patientId') as string;
  const dateStr = formData.get('date') as string;
  const timeStr = formData.get('time') as string;
  const modality = (formData.get('modality') as string) || 'online';
  const price = parseFloat((formData.get('price') as string) || tenant.consultationPrice.toString());
  const notes = (formData.get('notes') as string) || '';

  const scheduledAt = new Date(`${dateStr}T${timeStr}:00-03:00`);
  const isRetroactive = scheduledAt.getTime() < Date.now();

  const db = getTenantDb(tenant.id);

  // 1. Cria a sessão (se for retroativa, marca lembretes como já processados para não disparar WhatsApp indevido)
  const app = await db.appointments.create({
    patientId,
    scheduledAt,
    durationMin: 50,
    status: isRetroactive ? 'completed' : 'scheduled',
    modality,
    price,
    notes,
    reminderSent: isRetroactive,
    reminder2hSent: isRetroactive,
    meetingUrl: modality === 'online' ? (tenant.meetingUrlDefault || 'https://meet.google.com/bem-terapia') : undefined,
  });

  // 2. Cria o registro financeiro pendente correspondente
  await db.finances.create({
    patientId,
    appointmentId: app.id,
    type: 'income',
    category: 'consultation',
    amount: price,
    dueDate: scheduledAt,
    status: 'pending',
    description: `Sessão agendada - ${scheduledAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
  });

  revalidatePath('/agenda');
  revalidatePath('/');
  revalidatePath('/financeiro');
  return { success: true, appointmentId: app.id, patientId };
}

export async function rescheduleAppointmentAction(id: string, newDate: string, newTime: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const scheduledAt = new Date(`${newDate}T${newTime}:00-03:00`);
  const isRetroactive = scheduledAt.getTime() < Date.now();

  const db = getTenantDb(tenant.id);
  await db.appointments.update(id, {
    scheduledAt,
    reminderSent: isRetroactive,
    reminder2hSent: isRetroactive,
  });

  // Sincroniza também a data no Prontuário (ClinicalRecord) e no vencimento financeiro caso já existam
  const { prisma: prismaClient } = await import('@/lib/prisma');
  await Promise.all([
    prismaClient.clinicalRecord.updateMany({
      where: { tenantId: tenant.id, appointmentId: id },
      data: { sessionDate: scheduledAt },
    }),
    prismaClient.financialTransaction.updateMany({
      where: { tenantId: tenant.id, appointmentId: id, status: 'pending' },
      data: { dueDate: scheduledAt },
    }),
  ]);

  revalidatePath('/agenda');
  revalidatePath('/pacientes');
  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}

export async function cancelAppointmentAction(id: string, reason?: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  const cancelNote = reason ? `Cancelado: ${reason}` : 'Cancelado pelo terapeuta';

  await db.appointments.update(id, {
    status: 'cancelled',
    notes: cancelNote,
  });

  // Também cancela a cobrança financeira pendente associada a esta sessão, se existir
  const { prisma: prismaClient } = await import('@/lib/prisma');
  await prismaClient.financialTransaction.updateMany({
    where: {
      tenantId: tenant.id,
      appointmentId: id,
      status: 'pending',
    },
    data: {
      status: 'cancelled',
    },
  });

  revalidatePath('/agenda');
  revalidatePath('/');
  revalidatePath('/financeiro');
  return { success: true };
}


export async function reactivateAppointmentAction(id: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const { prisma: prismaClient } = await import('@/lib/prisma');
  const app = await prismaClient.appointment.findFirst({
    where: { id, tenantId: tenant.id },
  });

  if (!app) {
    throw new Error('Sessão não encontrada.');
  }

  // Verifica se o horário já está ocupado por outra sessão ativa
  const conflicting = await prismaClient.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      scheduledAt: app.scheduledAt,
      status: { notIn: ['cancelled'] },
      id: { not: id },
    },
  });

  if (conflicting) {
    throw new Error('Não é possível reativar: já existe outra sessão ativa marcada neste mesmo dia e horário.');
  }

  // Reativa a sessão
  await prismaClient.appointment.update({
    where: { id },
    data: {
      status: 'scheduled',
      notes: app.notes ? app.notes.replace(/^Cancelado:?.*$/i, '').trim() || null : null,
    },
  });

  // Reativa a transação financeira se estava cancelada
  await prismaClient.financialTransaction.updateMany({
    where: {
      tenantId: tenant.id,
      appointmentId: id,
      status: 'cancelled',
    },
    data: {
      status: 'pending',
    },
  });

  revalidatePath('/agenda');
  revalidatePath('/');
  revalidatePath('/financeiro');
  return { success: true };
}


export async function updateAppointmentStatusAction(id: string, status: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  await db.appointments.updateStatus(id, status);

  revalidatePath('/agenda');
  revalidatePath('/');
  return { success: true };
}

export async function toggleSlotBlockAction(date: string, time: string, reason?: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  const result = await db.blockedSlots.toggle(date, time, reason);

  revalidatePath('/agenda');
  return { success: true, ...result };
}

export async function blockFullDateAction(date: string, reason: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  await db.blockedDates.create(date, reason || 'Feriado / Recesso');

  revalidatePath('/agenda');
  return { success: true };
}

export async function unblockFullDateAction(date: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  await db.blockedDates.delete(date);

  revalidatePath('/agenda');
  return { success: true };
}

export async function saveWeeklyRulesAction(rules: { dayOfWeek: number; enabled: boolean; hours: string[] }[]) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  for (const r of rules) {
    await db.availabilityRules.upsert(r.dayOfWeek, r.enabled, r.hours.join(','));
  }

  revalidatePath('/agenda');
  return { success: true };
}

export async function deleteAppointmentAction(id: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const { prisma: prismaClient } = await import('@/lib/prisma');
  const app = await prismaClient.appointment.findFirst({
    where: { id, tenantId: tenant.id },
    include: { record: true, patient: true },
  });

  if (!app) {
    throw new Error('Sessão não encontrada.');
  }

  // Se já possuía prontuário apontado e o paciente usa pacote, devolve 1 crédito de sessão
  if (
    app.record &&
    app.patient &&
    (app.patient.sessionTypePreference === 'package' || app.patient.packageId) &&
    (app.patient.packageUsedSessions || 0) > 0
  ) {
    await prismaClient.patient.update({
      where: { id: app.patient.id },
      data: {
        packageUsedSessions: Math.max(0, (app.patient.packageUsedSessions || 0) - 1),
      },
    });
  }

  if (app.record) {
    await prismaClient.clinicalRecord.delete({ where: { id: app.record.id } });
  }
  await prismaClient.financialTransaction.deleteMany({
    where: { tenantId: tenant.id, appointmentId: app.id },
  });
  await prismaClient.appointment.delete({
    where: { id: app.id },
  });

  revalidatePath('/agenda');
  revalidatePath(`/pacientes/${app.patientId}/prontuario`);
  revalidatePath('/pacientes');
  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}
