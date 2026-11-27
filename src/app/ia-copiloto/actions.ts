'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';

async function requireAiEnabledTenant() {
  const [tenant, userCtx] = await Promise.all([
    getCurrentTenant(),
    getCurrentUserContext(),
  ]);
  if (!tenant) throw new Error('Não autenticado.');
  if (!tenant.aiAgentsEnabled && !userCtx?.isSuperAdmin) {
    throw new Error('O módulo Agentes B.E.M. não está habilitado para este consultório.');
  }
  return tenant;
}
import { generateSocialContentWithAI } from '@/lib/ai/gemini';
import { ensureAiTables } from '@/lib/ai/init-db';
import {
  extractTextFromPdfBase64,
  extractTextFromUrl,
  indexKnowledgeSource,
} from '@/lib/ai/rag';
import { createStructuredMemory, MemoryScope } from '@/lib/ai/memory';
import {
  AgentSlug,
  executeDispatchNow,
  fireN8nWebhook,
  generateConsciousnessProgram,
  queueOrSendPatientMessage,
  runBemAgent,
} from '@/lib/ai/orchestrator';

export async function generateContentAction(
  theme: string,
  format: 'reels' | 'carousel' | 'post' = 'carousel'
) {
  const tenant = await requireAiEnabledTenant();
  if (!theme || theme.trim().length < 3) {
    throw new Error('Informe um tema válido para a geração.');
  }
  return await generateSocialContentWithAI(theme, format);
}

export async function invokeAgentChatAction(payload: {
  agentSlug: AgentSlug;
  prompt: string;
  patientId?: string | null;
  threadId?: string | null;
}) {
  const tenant = await requireAiEnabledTenant();
  if (!payload.prompt?.trim()) throw new Error('Digite uma instrução ou pergunta.');

  const result = await runBemAgent({
    tenantId: tenant.id,
    agentSlug: payload.agentSlug,
    userPrompt: payload.prompt,
    patientId: payload.patientId || null,
    threadId: payload.threadId || null,
  });

  revalidatePath('/ia-copiloto');
  return result;
}

export async function saveAgentConfigAction(payload: {
  slug: AgentSlug;
  systemPrompt: string;
  deliveryMode: 'review' | 'auto';
  autoMemory: boolean;
  webhookUrl?: string;
}) {
  const tenant = await requireAiEnabledTenant();
  await ensureAiTables(tenant.id);

  await prisma.aiAgentConfig.update({
    where: { tenantId_slug: { tenantId: tenant.id, slug: payload.slug } },
    data: {
      systemPrompt: payload.systemPrompt.trim(),
      deliveryMode: payload.deliveryMode,
      autoMemory: payload.autoMemory,
      webhookUrl: payload.webhookUrl?.trim() || null,
    },
  });

  revalidatePath('/ia-copiloto');
  return { success: true };
}

export async function saveCorePhilosophyAndAutomationAction(payload: {
  aiCorePhilosophy?: string;
  aiDefaultDeliveryMode?: 'review' | 'auto';
  n8nWebhookUrl?: string;
  regenerateApiKey?: boolean;
}) {
  const tenant = await requireAiEnabledTenant();
  await ensureAiTables(tenant.id);

  const newKey = payload.regenerateApiKey
    ? `bem_sk_${crypto.randomBytes(18).toString('hex')}`
    : undefined;

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      ...(payload.aiCorePhilosophy !== undefined
        ? { aiCorePhilosophy: payload.aiCorePhilosophy.trim() }
        : {}),
      ...(payload.aiDefaultDeliveryMode !== undefined
        ? { aiDefaultDeliveryMode: payload.aiDefaultDeliveryMode }
        : {}),
      ...(payload.n8nWebhookUrl !== undefined
        ? { n8nWebhookUrl: payload.n8nWebhookUrl.trim() || null }
        : {}),
      ...(newKey ? { aiApiKey: newKey } : {}),
    },
    select: { aiApiKey: true, aiDefaultDeliveryMode: true, n8nWebhookUrl: true },
  });

  revalidatePath('/ia-copiloto');
  return { success: true, ...updated };
}

export async function addKnowledgeSourceAction(payload: {
  title: string;
  sourceType: 'directive' | 'seminar_note' | 'bibliography' | 'pdf' | 'text' | 'url';
  domainScope: string;
  authorOrRef?: string;
  sourceUrl?: string;
  rawContent?: string;
  pdfBase64?: string;
  fileName?: string;
  tags?: string;
  isPinned?: boolean;
}) {
  const tenant = await requireAiEnabledTenant();
  await ensureAiTables(tenant.id);

  let finalContent = (payload.rawContent || '').trim();

  if (payload.sourceType === 'pdf' && payload.pdfBase64) {
    finalContent = await extractTextFromPdfBase64(
      payload.pdfBase64,
      payload.fileName || payload.title
    );
  } else if (payload.sourceType === 'url' && payload.sourceUrl) {
    finalContent = await extractTextFromUrl(payload.sourceUrl);
  }

  if (!finalContent || finalContent.length < 10) {
    throw new Error('O conteúdo extraído ou informado é muito curto.');
  }

  const created = await indexKnowledgeSource({
    tenantId: tenant.id,
    title: payload.title,
    sourceType: payload.sourceType,
    domainScope: payload.domainScope || 'all',
    authorOrRef: payload.authorOrRef,
    sourceUrl: payload.sourceUrl,
    rawContent: finalContent,
    tags: payload.tags,
    isPinned: payload.isPinned,
  });

  revalidatePath('/ia-copiloto');
  return { success: true, id: created.id, chunkCount: created.chunkCount };
}

export async function toggleKnowledgePinAction(id: string, isPinned: boolean) {
  const tenant = await requireAiEnabledTenant();
  await prisma.knowledgeSource.updateMany({
    where: { id, tenantId: tenant.id },
    data: { isPinned },
  });
  revalidatePath('/ia-copiloto');
  return { success: true };
}

export async function updateKnowledgeScopeAction(id: string, domainScope: string) {
  const tenant = await requireAiEnabledTenant();
  await prisma.knowledgeSource.updateMany({
    where: { id, tenantId: tenant.id },
    data: { domainScope: domainScope.trim() || 'all' },
  });
  revalidatePath('/ia-copiloto');
  return { success: true };
}

export async function deleteKnowledgeSourceAction(id: string) {
  const tenant = await requireAiEnabledTenant();
  await prisma.knowledgeSource.deleteMany({
    where: { id, tenantId: tenant.id },
  });
  revalidatePath('/ia-copiloto');
  return { success: true };
}

export async function addStructuredMemoryAction(payload: {
  scope: MemoryScope;
  patientId?: string | null;
  category: string;
  title: string;
  content: string;
  importance?: number;
  isPinned?: boolean;
}) {
  const tenant = await requireAiEnabledTenant();
  await ensureAiTables(tenant.id);

  await createStructuredMemory({
    tenantId: tenant.id,
    scope: payload.scope,
    patientId: payload.patientId || null,
    category: payload.category,
    title: payload.title,
    content: payload.content,
    importance: payload.importance || 4,
    isPinned: payload.isPinned || false,
    source: 'manual',
  });

  revalidatePath('/ia-copiloto');
  if (payload.patientId) {
    revalidatePath(`/pacientes/${payload.patientId}/prontuario`);
  }
  return { success: true };
}

export async function toggleMemoryPinAction(id: string, isPinned: boolean) {
  const tenant = await requireAiEnabledTenant();
  await prisma.structuredMemory.updateMany({
    where: { id, tenantId: tenant.id },
    data: { isPinned },
  });
  revalidatePath('/ia-copiloto');
  return { success: true };
}

export async function deleteMemoryAction(id: string) {
  const tenant = await requireAiEnabledTenant();
  await prisma.structuredMemory.deleteMany({
    where: { id, tenantId: tenant.id },
  });
  revalidatePath('/ia-copiloto');
  return { success: true };
}

export async function createProgramAction(payload: {
  patientId?: string | null;
  themeOrGoal: string;
  durationDays: number;
  deliveryMode: 'review' | 'auto';
  sendFirstDayNow?: boolean;
}) {
  const tenant = await requireAiEnabledTenant();

  const res = await generateConsciousnessProgram({
    tenantId: tenant.id,
    patientId: payload.patientId || null,
    themeOrGoal: payload.themeOrGoal,
    durationDays: payload.durationDays,
    deliveryMode: payload.deliveryMode,
    sendFirstDayNow: payload.sendFirstDayNow,
  });

  revalidatePath('/ia-copiloto');
  if (payload.patientId) {
    revalidatePath(`/pacientes/${payload.patientId}/prontuario`);
  }
  return {
    success: true,
    programId: res.program.id,
    title: res.program.title,
    dispatchStatus: res.firstDayDispatch?.status || null,
  };
}

export async function advanceProgramDayAction(programId: string) {
  const tenant = await requireAiEnabledTenant();

  const prog = await prisma.patientProgram.findFirst({
    where: { id: programId, tenantId: tenant.id },
  });
  if (!prog || !prog.patientId) {
    throw new Error('Programa não encontrado ou não vinculado a um paciente.');
  }

  const steps = JSON.parse(prog.stepsJson || '[]');
  const stepIndex = prog.currentDay - 1;
  const currentStep = steps[stepIndex];
  if (!currentStep) {
    await prisma.patientProgram.update({
      where: { id: prog.id },
      data: { status: 'completed' },
    });
    revalidatePath('/ia-copiloto');
    return { success: true, completed: true };
  }

  const dispatch = await queueOrSendPatientMessage({
    tenantId: tenant.id,
    agentSlug: 'expansao',
    patientId: prog.patientId,
    programId: prog.id,
    title: `${prog.title} — Dia ${prog.currentDay}`,
    messageText: currentStep.whatsappMessage,
    deliveryModeOverride: prog.deliveryMode as 'review' | 'auto',
  });

  steps[stepIndex].completed = true;
  const nextDay = prog.currentDay + 1;
  const isFinished = nextDay > steps.length;

  await prisma.patientProgram.update({
    where: { id: prog.id },
    data: {
      stepsJson: JSON.stringify(steps),
      currentDay: isFinished ? prog.currentDay : nextDay,
      status: isFinished ? 'completed' : 'active',
    },
  });

  revalidatePath('/ia-copiloto');
  revalidatePath(`/pacientes/${prog.patientId}/prontuario`);
  return { success: true, dispatchStatus: dispatch.status, completed: isFinished };
}

export async function approveDispatchAction(dispatchId: string, editedText?: string) {
  const tenant = await requireAiEnabledTenant();

  const result = await executeDispatchNow(tenant.id, dispatchId, editedText);
  revalidatePath('/ia-copiloto');
  return result;
}

export async function rejectDispatchAction(dispatchId: string) {
  const tenant = await requireAiEnabledTenant();

  await prisma.aiMessageDispatch.updateMany({
    where: { id: dispatchId, tenantId: tenant.id },
    data: { status: 'rejected' },
  });
  revalidatePath('/ia-copiloto');
  return { success: true };
}

export async function queueDirectAgentReplyAction(payload: {
  agentSlug: AgentSlug;
  patientId: string;
  title: string;
  messageText: string;
  deliveryModeOverride?: 'review' | 'auto';
}) {
  const tenant = await requireAiEnabledTenant();

  const res = await queueOrSendPatientMessage({
    tenantId: tenant.id,
    agentSlug: payload.agentSlug,
    patientId: payload.patientId,
    title: payload.title,
    messageText: payload.messageText,
    deliveryModeOverride: payload.deliveryModeOverride,
  });

  revalidatePath('/ia-copiloto');
  return res;
}

export async function testN8nWebhookAction() {
  const tenant = await requireAiEnabledTenant();

  return await fireN8nWebhook(tenant.id, 'bem.webhook_test', {
    message: 'Conexão entre plataforma B.E.M. e n8n validada com sucesso!',
    testedBy: tenant.name,
  });
}

// ================= GESTÃO DE TONS DE CONVERSA (PROMPTS POR TOM) =================

export async function createTonePresetAction(payload: { name: string; prompt: string }) {
  const tenant = await requireAiEnabledTenant();
  await ensureAiTables(tenant.id);

  const name = (payload.name || '').trim();
  const prompt = (payload.prompt || '').trim();
  if (!name || !prompt) {
    throw new Error('Informe o nome do tom e o prompt de instruções.');
  }

  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  const slug = `${baseSlug || 'tom'}_${Date.now().toString(36).slice(-4)}`;

  const count = await prisma.aiTonePreset.count({ where: { tenantId: tenant.id } });
  const created = await prisma.aiTonePreset.create({
    data: {
      tenantId: tenant.id,
      slug,
      name,
      prompt,
      sortOrder: count + 1,
    },
  });

  revalidatePath('/ia-copiloto');
  revalidatePath('/pacientes');
  return { success: true, tone: created };
}

export async function updateTonePresetAction(payload: {
  id: string;
  name: string;
  prompt: string;
}) {
  const tenant = await requireAiEnabledTenant();
  const name = (payload.name || '').trim();
  const prompt = (payload.prompt || '').trim();
  if (!payload.id || !name || !prompt) {
    throw new Error('Preencha o nome e o prompt do tom.');
  }

  await prisma.aiTonePreset.updateMany({
    where: { id: payload.id, tenantId: tenant.id },
    data: { name, prompt },
  });

  revalidatePath('/ia-copiloto');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function deleteTonePresetAction(id: string) {
  const tenant = await requireAiEnabledTenant();
  const total = await prisma.aiTonePreset.count({ where: { tenantId: tenant.id } });
  if (total <= 1) {
    throw new Error('Mantenha ao menos um tom de conversa cadastrado.');
  }

  await prisma.aiTonePreset.deleteMany({
    where: { id, tenantId: tenant.id },
  });

  revalidatePath('/ia-copiloto');
  revalidatePath('/pacientes');
  return { success: true };
}
