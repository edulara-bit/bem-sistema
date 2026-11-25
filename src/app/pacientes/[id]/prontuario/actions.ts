'use server';

import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { generateSoapWithAI } from '@/lib/ai/gemini';
import { encryptText } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

export async function generateSoapAction(rawNotes: string, patientName: string) {
  if (!rawNotes || rawNotes.trim().length < 5) {
    throw new Error('Anotações insuficientes para gerar a análise SOAP.');
  }
  return await generateSoapWithAI(rawNotes, patientName);
}

export async function saveClinicalRecordAction({
  patientId,
  appointmentId,
  rawNotes,
  soap,
  aiAssisted,
  isLocked,
  emocoesTrabalhadas = [],
  situacoes = [],
}: {
  patientId: string;
  appointmentId?: string;
  rawNotes: string;
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  aiAssisted: boolean;
  isLocked: boolean;
  emocoesTrabalhadas?: string[];
  situacoes?: {
    categoria: string;
    situacao: string;
    complemento?: string;
    emocoes?: string[];
  }[];
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);

  // Criptografa rascunho e SOAP com AES-256-GCM para sigilo estrito
  const rawDraftEnc = encryptText(rawNotes);
  const soapEnc = encryptText(JSON.stringify(soap));

  // Empacota emoções e situações estruturadas
  const payloadToStore = {
    emocoes: emocoesTrabalhadas,
    situacoes: situacoes,
  };

  const record = await db.records.create({
    patientId,
    appointmentId: appointmentId || null,
    sessionDate: new Date(),
    rawDraftEnc,
    soapEnc,
    aiAssisted,
    isLocked,
    emocoesTrabalhadas: JSON.stringify(payloadToStore),
  });

  // Se houver agendamento vinculado, marca como 'completed'
  if (appointmentId) {
    await db.appointments.updateStatus(appointmentId, 'completed');
  }

  // Se o paciente tiver pacote ativo, incrementa o contador de sessões utilizadas
  const patient = await db.patients.findUnique(patientId);
  if (patient && (patient.sessionTypePreference === 'package' || patient.packageId)) {
    await db.patients.update(patientId, {
      packageUsedSessions: (patient.packageUsedSessions || 0) + 1,
    });
  }

  revalidatePath(`/pacientes/${patientId}/prontuario`);
  revalidatePath('/agenda');
  revalidatePath('/pacientes');
  revalidatePath('/');

  // Dispara evento de sessão concluída para fluxos n8n (se configurado)
  try {
    const { fireN8nWebhook } = await import('@/lib/ai/orchestrator');
    await fireN8nWebhook(tenant.id, 'session.completed', {
      recordId: record.id,
      patientId,
      patientName: patient?.name || null,
      appointmentId: appointmentId || null,
      emocoesTrabalhadas,
      situacoesCount: situacoes.length,
    });
  } catch {
    // Não bloqueia o salvamento clínico caso webhook falhe
  }

  return { success: true, recordId: record.id };
}

export async function compilePatientFeedbackAction(payload: {
  patientId: string;
  appointmentId?: string;
  rawNotes?: string;
  soap?: { subjective: string; objective: string; assessment: string; plan: string };
  emocoesTrabalhadas?: string[];
  situacoes?: {
    categoria: string;
    situacao: string;
    complemento?: string;
    emocoes?: string[];
  }[];
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const { compilePostSessionFeedback } = await import('@/lib/ai/orchestrator');
  const res = await compilePostSessionFeedback({
    tenantId: tenant.id,
    patientId: payload.patientId,
    appointmentId: payload.appointmentId,
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

