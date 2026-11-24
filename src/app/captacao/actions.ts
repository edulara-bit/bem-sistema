'use server';

import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { generateLeadApproachMessageWithAI } from '@/lib/ai/gemini';
import { decryptText, encryptText } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

export async function updateLeadStageAction(leadId: string, stage: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  await db.leads.updateStage(leadId, stage);

  revalidatePath('/captacao');
  revalidatePath('/');
  return { success: true };
}

export async function convertLeadToPatientAction(leadId: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  const lead = await db.leads.findUnique(leadId);

  if (!lead) throw new Error('Lead não encontrado.');

  // Cria paciente com dados já criptografados
  const patient = await db.patients.create({
    name: lead.name,
    phoneEnc: lead.phoneEnc,
    emailEnc: lead.emailEnc,
    notes: `Captado via ${lead.source}. Demanda inicial: ${lead.demand || 'Não informada'}.`,
    status: 'active',
  });

  // Atualiza lead para 'converted'
  await db.leads.updateStage(leadId, 'converted');

  revalidatePath('/captacao');
  revalidatePath('/pacientes');
  revalidatePath('/agenda');
  revalidatePath('/');

  return { success: true, patientId: patient.id };
}

export async function generateApproachMessageAction(
  leadName: string,
  demand: string,
  modality: string
) {
  return await generateLeadApproachMessageWithAI(leadName, demand, modality);
}

