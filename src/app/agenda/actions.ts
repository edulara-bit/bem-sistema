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

  const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);

  const db = getTenantDb(tenant.id);

  // 1. Cria a sessão
  const app = await db.appointments.create({
    patientId,
    scheduledAt,
    durationMin: 50,
    status: 'scheduled',
    modality,
    price,
    notes,
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
    description: `Sessão agendada - ${scheduledAt.toLocaleDateString('pt-BR')}`,
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
