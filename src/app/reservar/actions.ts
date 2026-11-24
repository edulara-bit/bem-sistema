'use server';

import { prisma, getTenantDb } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function bookPatientSlotAction(payload: {
  patientId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  modality: string; // 'online' | 'in_person'
  notes?: string;
}) {
  const { patientId, date, time, modality, notes } = payload;

  if (!patientId || !date || !time) {
    throw new Error('Dados incompletos para efetuar a reserva.');
  }

  // 1. Localiza o paciente e seu tenant
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { tenant: true },
  });

  if (!patient || !patient.tenant) {
    throw new Error('Paciente não encontrado ou cadastro inativo.');
  }

  const tenant = patient.tenant;

  // 2. Validação da janela de 1 mês (30 dias)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  if (date < todayStr || date > maxDateStr) {
    throw new Error('O agendamento só pode ser realizado para datas dentro dos próximos 30 dias.');
  }

  // 3. Validação se o horário já passou hoje
  const [hours, mins] = time.split(':').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  const scheduledAt = new Date(y, m - 1, d, hours, mins, 0);

  if (scheduledAt <= now) {
    throw new Error('Este horário já passou. Por favor, escolha um horário futuro.');
  }

  // 4. Validação de bloqueio de dia inteiro (feriado/folga)
  const isDateBlocked = await prisma.blockedDate.findFirst({
    where: { tenantId: tenant.id, date },
  });
  if (isDateBlocked) {
    throw new Error('Esta data não está disponível para atendimento.');
  }

  // 5. Validação de bloqueio avulso de horário
  const isSlotBlocked = await prisma.blockedSlot.findFirst({
    where: { tenantId: tenant.id, date, time },
  });
  if (isSlotBlocked) {
    throw new Error('Este horário específico está indisponível. Por favor, selecione outro horário.');
  }

  // 6. Validação de conflito com agendamento existente
  const existingApp = await prisma.appointment.findFirst({
    where: {
      tenantId: tenant.id,
      scheduledAt,
      status: { notIn: ['cancelled'] },
    },
  });
  if (existingApp) {
    throw new Error('Este horário acabou de ser agendado por outro paciente. Por favor, escolha outro horário.');
  }

  // 7. Criar a sessão
  const db = getTenantDb(tenant.id);
  const price = tenant.consultationPrice || 220.0;
  const meetingUrl = modality === 'online' ? (tenant.meetingUrlDefault || 'https://meet.google.com/bem-terapia') : undefined;

  const app = await db.appointments.create({
    patientId: patient.id,
    scheduledAt,
    durationMin: 50,
    status: 'scheduled',
    modality,
    price,
    notes: notes || 'Agendado pelo próprio paciente via link de reserva online.',
    meetingUrl,
  });

  // 8. Criar transação financeira pendente
  await db.finances.create({
    patientId: patient.id,
    appointmentId: app.id,
    type: 'income',
    category: 'consultation',
    amount: price,
    dueDate: scheduledAt,
    status: 'pending',
    description: `Sessão agendada online - ${scheduledAt.toLocaleDateString('pt-BR')}`,
  });

  revalidatePath('/agenda');
  revalidatePath('/cockpit');
  revalidatePath('/financeiro');

  return {
    success: true,
    appointmentId: app.id,
    scheduledAt: scheduledAt.toISOString(),
    patientName: patient.name,
    therapistName: tenant.name,
    therapistPhone: tenant.whatsapp,
    modality,
    price,
    meetingUrl,
    address: tenant.address,
  };
}
