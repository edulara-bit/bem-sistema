'use server';

import { prisma, getTenantDb } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { formatAppointmentDateTime } from '@/lib/schedule-utils';

export async function bookPatientSlotAction(payload: {
  patientId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  modality: string; // 'online' | 'in_person'
  notes?: string;
}): Promise<{
  success: boolean;
  error?: string;
  appointmentId?: string;
  scheduledAt?: string;
  patientName?: string;
  therapistName?: string;
  therapistPhone?: string | null;
  modality?: string;
  price?: number;
  meetingUrl?: string;
  address?: string | null;
}> {
  try {
    const { patientId, date, time, modality, notes } = payload;

    if (!patientId || !date || !time) {
      return { success: false, error: 'Dados incompletos para efetuar a reserva.' };
    }

    // 1. Localiza o paciente e seu tenant
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { tenant: true },
    });

    if (!patient || !patient.tenant) {
      return { success: false, error: 'Paciente não encontrado ou cadastro inativo.' };
    }

    const tenant = patient.tenant;

    // 2. Validação da janela de 1 mês (30 dias) considerando o fuso horário de São Paulo
    const now = new Date();
    const { dateStr: todayStr } = formatAppointmentDateTime(now);
    const maxDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { dateStr: maxDateStr } = formatAppointmentDateTime(maxDate);

    if (date < todayStr || date > maxDateStr) {
      return {
        success: false,
        error: 'O agendamento só pode ser realizado para datas dentro dos próximos 30 dias.',
      };
    }

    // 3. Validação se o horário já passou hoje
    const scheduledAt = new Date(`${date}T${time}:00-03:00`);

    if (scheduledAt <= now) {
      return {
        success: false,
        error: 'Este horário já passou. Por favor, escolha um horário futuro.',
      };
    }

    // 4. Validação de bloqueio de dia inteiro (feriado/folga)
    const isDateBlocked = await prisma.blockedDate.findFirst({
      where: { tenantId: tenant.id, date },
    });
    if (isDateBlocked) {
      return { success: false, error: 'Esta data não está disponível para atendimento.' };
    }

    // 5. Validação de bloqueio avulso de horário
    const isSlotBlocked = await prisma.blockedSlot.findFirst({
      where: { tenantId: tenant.id, date, time },
    });
    if (isSlotBlocked) {
      return {
        success: false,
        error: 'Este horário específico está indisponível. Por favor, selecione outro horário.',
      };
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
      return {
        success: false,
        error: 'Este horário acabou de ser agendado por outro paciente. Por favor, escolha outro horário.',
      };
    }

    // 7. Criar a sessão
    const db = getTenantDb(tenant.id);

    // Calcula o valor conforme o tipo de sessão do paciente
    let price = tenant.consultationPrice || 220.0;
    const sessionType = patient.sessionTypePreference || 'regular';
    const finalModality = patient.modalityPreference || modality || 'online';

    if (sessionType === 'experimental') {
      price = 0.0;
    } else if (sessionType === 'descoberta') {
      price = 150.0;
    } else if (sessionType === 'package' && patient.packageId) {
      const pkg = await prisma.package.findUnique({ where: { id: patient.packageId } });
      if (pkg) {
        price = pkg.pricePerSession;
      }
    }

    const meetingUrl =
      finalModality === 'online'
        ? tenant.meetingUrlDefault || 'https://meet.google.com/bem-terapia'
        : undefined;

    const app = await db.appointments.create({
      patientId: patient.id,
      scheduledAt,
      durationMin: finalModality === 'in_person' ? 60 : 50,
      status: 'scheduled',
      modality: finalModality,
      sessionType,
      packageId: patient.packageId || undefined,
      price,
      notes:
        notes ||
        `Agendado pelo próprio paciente via link de reserva online (${
          finalModality === 'in_person' ? 'Presencial' : 'Online'
        }).`,
      meetingUrl,
    });

    // Atualiza contagem de sessões do pacote se aplicável
    if (sessionType === 'package') {
      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          packageUsedSessions: { increment: 1 },
        },
      });
    }

    // 8. Criar transação financeira pendente se não for experimental gratuita
    if (price > 0) {
      await db.finances.create({
        patientId: patient.id,
        appointmentId: app.id,
        type: 'income',
        category: 'consultation',
        amount: price,
        dueDate: scheduledAt,
        status: 'pending',
        description: `Sessão agendada online (${sessionType}) - ${scheduledAt.toLocaleDateString(
          'pt-BR'
        )}`,
      });
    }

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
      modality: finalModality,
      price,
      meetingUrl,
      address: tenant.address,
    };
  } catch (err: any) {
    console.error('Erro em bookPatientSlotAction:', err);
    return {
      success: false,
      error: err.message || 'Erro ao processar reserva.',
    };
  }
}
