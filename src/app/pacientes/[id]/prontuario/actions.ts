'use server';

import { getTenantDb, prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { encryptText } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

export async function savePatientAnamnesisAction(payload: {
  patientId: string;
  answers: Record<string, string>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não encontrado.');

  const anamnesisEnc = encryptText(JSON.stringify(payload.answers || {}));

  await prisma.patient.updateMany({
    where: { id: payload.patientId, tenantId: tenant.id },
    data: { anamnesisEnc },
  });

  revalidatePath(`/pacientes/${payload.patientId}/prontuario`);
  return { success: true };
}

export async function saveClinicalRecordAction({
  recordId,
  patientId,
  appointmentId,
  sessionDateStr,
  sessionTimeStr,
  rawNotes,
  isLocked,
  emocoesTrabalhadas = [],
  situacoes = [],
}: {
  recordId?: string;
  patientId: string;
  appointmentId?: string;
  sessionDateStr?: string;
  sessionTimeStr?: string;
  rawNotes: string;
  isLocked: boolean;
  emocoesTrabalhadas?: string[];
  situacoes?: {
    categoria: string;
    situacao: string;
    complemento?: string;
    emocoes?: string[];
    pares?: {
      emocao: string;
      frequenciaNumero?: string;
      frequenciaTitulo?: string;
    }[];
  }[];
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);

  const rawDraftEnc = encryptText(rawNotes || '');
  // Mantém campo soapEnc válido em JSON vazio para retrocompatibilidade do banco
  const soapEnc = encryptText(
    JSON.stringify({ subjective: '', objective: '', assessment: '', plan: '' })
  );

  const payloadToStore = {
    emocoes: emocoesTrabalhadas,
    situacoes: situacoes,
  };

  // Verifica se estamos editando uma sessão já existente (por recordId explícito ou por appointmentId já apontado)
  const existingRecord = recordId
    ? await prisma.clinicalRecord.findFirst({
        where: { id: recordId, tenantId: tenant.id, patientId },
      })
    : appointmentId
    ? await prisma.clinicalRecord.findFirst({
        where: { appointmentId, tenantId: tenant.id, patientId },
      })
    : null;

  const effectiveAppointmentId = existingRecord?.appointmentId || appointmentId || null;
  const linkedAppointment = effectiveAppointmentId
    ? await prisma.appointment.findFirst({
        where: { id: effectiveAppointmentId, tenantId: tenant.id },
      })
    : null;

  // Resolve a data/hora real da sessão (respeitando data retroativa escolhida ou data agendada na consulta)
  let resolvedSessionDate: Date;
  if (sessionDateStr && /^\d{4}-\d{2}-\d{2}$/.test(sessionDateStr.trim())) {
    const safeTime =
      sessionTimeStr && /^\d{2}:\d{2}$/.test(sessionTimeStr.trim())
        ? sessionTimeStr.trim()
        : '14:00';
    const parsed = new Date(`${sessionDateStr.trim()}T${safeTime}:00-03:00`);
    resolvedSessionDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } else if (linkedAppointment?.scheduledAt) {
    resolvedSessionDate = new Date(linkedAppointment.scheduledAt);
  } else if (existingRecord?.sessionDate) {
    resolvedSessionDate = new Date(existingRecord.sessionDate);
  } else {
    resolvedSessionDate = new Date();
  }

  const patient = await db.patients.findUnique(patientId);

  let savedRecordId: string;
  const isEditingExisting = Boolean(existingRecord);

  if (existingRecord) {
    const updated = await prisma.clinicalRecord.update({
      where: { id: existingRecord.id },
      data: {
        sessionDate: resolvedSessionDate,
        rawDraftEnc,
        isLocked,
        emocoesTrabalhadas: JSON.stringify(payloadToStore),
      },
    });
    savedRecordId = updated.id;
  } else {
    const created = await db.records.create({
      patientId,
      appointmentId: effectiveAppointmentId,
      sessionDate: resolvedSessionDate,
      rawDraftEnc,
      soapEnc,
      aiAssisted: false,
      isLocked,
      emocoesTrabalhadas: JSON.stringify(payloadToStore),
    });
    savedRecordId = created.id;

    if (effectiveAppointmentId) {
      await db.appointments.updateStatus(effectiveAppointmentId, 'completed');
    }

    if (patient && (patient.sessionTypePreference === 'package' || patient.packageId)) {
      await db.patients.update(patientId, {
        packageUsedSessions: (patient.packageUsedSessions || 0) + 1,
      });
    }
  }

  // Se houver agendamento vinculado e o terapeuta informou/alterou a data da sessão, sincroniza na Agenda e no Financeiro
  if (effectiveAppointmentId && sessionDateStr) {
    const isPast = resolvedSessionDate.getTime() < Date.now();
    await Promise.all([
      prisma.appointment.updateMany({
        where: { id: effectiveAppointmentId, tenantId: tenant.id },
        data: {
          scheduledAt: resolvedSessionDate,
          ...(isPast ? { reminderSent: true, reminder2hSent: true } : {}),
        },
      }),
      prisma.financialTransaction.updateMany({
        where: { tenantId: tenant.id, appointmentId: effectiveAppointmentId, status: 'pending' },
        data: { dueDate: resolvedSessionDate },
      }),
    ]);
  }

  revalidatePath(`/pacientes/${patientId}/prontuario`);
  revalidatePath('/agenda');
  revalidatePath('/pacientes');
  revalidatePath('/');

  try {
    const { fireN8nWebhook } = await import('@/lib/ai/orchestrator');
    await fireN8nWebhook(
      tenant.id,
      isEditingExisting ? 'session.updated' : 'session.completed',
      {
        recordId: savedRecordId,
        patientId,
        patientName: patient?.name || null,
        appointmentId: existingRecord?.appointmentId || appointmentId || null,
        emocoesTrabalhadas,
        situacoes,
      }
    );
  } catch {
    // Não bloqueia salvamento clínico
  }

  return { success: true, recordId: savedRecordId, updated: isEditingExisting };
}

export async function compilePatientFeedbackAction(payload: {
  patientId: string;
  appointmentId?: string;
  toneId?: string;
  rawNotes?: string;
  soap?: { subjective: string; objective: string; assessment: string; plan: string };
  emocoesTrabalhadas?: string[];
  situacoes?: {
    categoria: string;
    situacao: string;
    complemento?: string;
    emocoes?: string[];
    pares?: {
      emocao: string;
      frequenciaNumero?: string;
      frequenciaTitulo?: string;
    }[];
  }[];
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const { getCurrentUserContext } = await import('@/lib/admin-guard');
  const userCtx = await getCurrentUserContext();
  if (!tenant.aiAgentsEnabled && !userCtx?.isSuperAdmin) {
    throw new Error('Seu consultório não possui permissão ativa para uso dos Agentes de IA.');
  }

  const { compilePostSessionFeedback } = await import('@/lib/ai/orchestrator');
  const res = await compilePostSessionFeedback({
    tenantId: tenant.id,
    patientId: payload.patientId,
    appointmentId: payload.appointmentId,
    toneId: payload.toneId,
    rawNotes: payload.rawNotes,
    soap: payload.soap,
    emocoesTrabalhadas: payload.emocoesTrabalhadas,
    situacoes: payload.situacoes,
    enqueueDispatch: false,
  });

  revalidatePath(`/pacientes/${payload.patientId}/prontuario`);
  revalidatePath('/ia-copiloto');
  return res;
}

export async function dispatchPatientFeedbackAction(payload: {
  patientId: string;
  appointmentId?: string;
  messageText: string;
  deliveryMode: 'review' | 'auto';
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const { queueOrSendPatientMessage } = await import('@/lib/ai/orchestrator');
  const db = getTenantDb(tenant.id);
  const patient = await db.patients.findUnique(payload.patientId);

  const res = await queueOrSendPatientMessage({
    tenantId: tenant.id,
    agentSlug: 'pos_sessao',
    patientId: payload.patientId,
    appointmentId: payload.appointmentId || null,
    title: `Feedback Pós-Sessão — ${patient?.name || 'Paciente'}`,
    messageText: payload.messageText,
    deliveryModeOverride: payload.deliveryMode,
  });

  revalidatePath(`/pacientes/${payload.patientId}/prontuario`);
  revalidatePath('/ia-copiloto');
  return res;
}

export async function createPatientProgramFromProntuarioAction(payload: {
  patientId: string;
  themeOrGoal: string;
  durationDays: number;
  deliveryMode: 'review' | 'auto';
  sendFirstDayNow: boolean;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const { generateConsciousnessProgram } = await import('@/lib/ai/orchestrator');
  const res = await generateConsciousnessProgram({
    tenantId: tenant.id,
    patientId: payload.patientId,
    themeOrGoal: payload.themeOrGoal,
    durationDays: payload.durationDays,
    deliveryMode: payload.deliveryMode,
    sendFirstDayNow: payload.sendFirstDayNow,
  });

  revalidatePath(`/pacientes/${payload.patientId}/prontuario`);
  revalidatePath('/ia-copiloto');
  return {
    success: true,
    title: res.program.title,
    dispatchStatus: res.firstDayDispatch?.status || null,
  };
}

export async function addPatientMemoryFromProntuarioAction(payload: {
  patientId: string;
  category: string;
  title: string;
  content: string;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const { createStructuredMemory } = await import('@/lib/ai/memory');
  await createStructuredMemory({
    tenantId: tenant.id,
    scope: 'atendimento',
    patientId: payload.patientId,
    category: payload.category,
    title: payload.title,
    content: payload.content,
    importance: 4,
    source: 'prontuario',
  });

  revalidatePath(`/pacientes/${payload.patientId}/prontuario`);
  revalidatePath('/ia-copiloto');
  return { success: true };
}
