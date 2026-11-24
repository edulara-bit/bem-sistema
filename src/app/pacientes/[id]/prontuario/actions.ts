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
}: {
  patientId: string;
  appointmentId?: string;
  rawNotes: string;
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  aiAssisted: boolean;
  isLocked: boolean;
  emocoesTrabalhadas?: string[];
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);

  // Criptografa rascunho e SOAP com AES-256-GCM para sigilo estrito
  const rawDraftEnc = encryptText(rawNotes);
  const soapEnc = encryptText(JSON.stringify(soap));

  const record = await db.records.create({
    patientId,
    appointmentId: appointmentId || null,
    sessionDate: new Date(),
    rawDraftEnc,
    soapEnc,
    aiAssisted,
    isLocked,
    emocoesTrabalhadas: emocoesTrabalhadas.length > 0 ? JSON.stringify(emocoesTrabalhadas) : null,
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
  return { success: true, recordId: record.id };
}

