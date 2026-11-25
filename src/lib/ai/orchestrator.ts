import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { decryptText } from '@/lib/crypto';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sanitizeClinicalDraft } from '@/lib/ai/gemini';
import { ensureAiTables, DEFAULT_BEM_CORE_PHILOSOPHY } from '@/lib/ai/init-db';
import { callGeminiText, retrieveBemKnowledge } from '@/lib/ai/rag';
import { buildMemoryPromptContext, createStructuredMemory, MemoryScope } from '@/lib/ai/memory';

export type AgentSlug = 'marketing' | 'pos_sessao' | 'expansao' | 'gestao';

export interface ProgramStep {
  day: number;
  title: string;
  focusTheme: string;
  morningPrompt: string;
  somaticExercise: string;
  eveningReflection: string;
  whatsappMessage: string;
  completed?: boolean;
  patientFeedback?: string;
}

/**
 * Dispara eventos em tempo real para o n8n (Webhook assinado com HMAC-SHA256).
 */
export async function fireN8nWebhook(
  tenantId: string,
  eventName: string,
  payload: Record<string, any>,
  overrideUrl?: string | null
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, n8nWebhookUrl: true, aiApiKey: true },
    });
    const targetUrl = (overrideUrl || tenant?.n8nWebhookUrl || '').trim();
    if (!targetUrl) return { triggered: false };

    const bodyStr = JSON.stringify({
      event: eventName,
      tenantSlug: tenant?.slug,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = crypto
      .createHmac('sha256', tenant?.aiApiKey || 'bem_webhook_secret')
      .update(bodyStr)
      .digest('hex');

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BEM-Event': eventName,
        'X-BEM-Signature': signature,
      },
      body: bodyStr,
      signal: AbortSignal.timeout(8000),
    });

    return { triggered: true, status: res.status };
  } catch (err: any) {
    console.warn(`Falha ao notificar Webhook n8n (${eventName}):`, err?.message || err);
    return { triggered: false, error: err?.message };
  }
}

/**
 * Enfileira para Revisão Humana ('review') OU dispara imediatamente ('auto') via WhatsApp + n8n.
 */
export async function queueOrSendPatientMessage(params: {
  tenantId: string;
  agentSlug: AgentSlug;
  patientId: string;
  appointmentId?: string | null;
  programId?: string | null;
  title: string;
  messageText: string;
  deliveryModeOverride?: 'review' | 'auto';
}) {
  await ensureAiTables(params.tenantId);

  const [tenant, agentConfig, patient] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: params.tenantId } }),
    prisma.aiAgentConfig.findUnique({
      where: { tenantId_slug: { tenantId: params.tenantId, slug: params.agentSlug } },
    }),
    prisma.patient.findFirst({
      where: { id: params.patientId, tenantId: params.tenantId },
    }),
  ]);

  if (!tenant || !patient) {
    throw new Error('Consultório ou paciente não encontrado.');
  }

  const effectiveMode: 'review' | 'auto' =
    params.deliveryModeOverride ||
    (agentConfig?.deliveryMode as 'review' | 'auto') ||
    (tenant.aiDefaultDeliveryMode as 'review' | 'auto') ||
    'review';

  const dispatch = await prisma.aiMessageDispatch.create({
    data: {
      tenantId: params.tenantId,
      agentSlug: params.agentSlug,
      patientId: params.patientId,
      appointmentId: params.appointmentId || null,
      programId: params.programId || null,
      channel: 'whatsapp',
      deliveryMode: effectiveMode,
      title: params.title,
      messageText: params.messageText.trim(),
      status: effectiveMode === 'auto' ? 'pending_review' : 'pending_review',
    },
  });

  if (effectiveMode === 'auto') {
    return await executeDispatchNow(params.tenantId, dispatch.id);
  }

  // Notifica n8n que há uma mensagem aguardando aprovação (opcional)
  await fireN8nWebhook(
    params.tenantId,
    'message.pending_review',
    {
      dispatchId: dispatch.id,
      agentSlug: params.agentSlug,
      patientId: patient.id,
      patientName: patient.name,
      title: params.title,
      messageText: params.messageText,
    },
    agentConfig?.webhookUrl
  );

  return {
    dispatchId: dispatch.id,
    status: 'pending_review' as const,
    deliveryMode: 'review' as const,
  };
}

/**
 * Executa o disparo efetivo de um item da fila (seja automático ou após aprovação humana).
 */
export async function executeDispatchNow(
  tenantId: string,
  dispatchId: string,
  editedText?: string
) {
  const dispatch = await prisma.aiMessageDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: { patient: true, tenant: true },
  });

  if (!dispatch) throw new Error('Registro de envio não encontrado.');

  const finalMessage = (editedText ?? dispatch.messageText).trim();

  if (!dispatch.patient) {
    throw new Error('Nenhum paciente vinculado a este disparo.');
  }

  const phone = decryptText(dispatch.patient.phoneEnc);
  const instanceName =
    dispatch.tenant.whatsappInstanceName ||
    `bem_${dispatch.tenant.slug.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

  const waResult = await sendWhatsAppMessage(instanceName, phone, finalMessage);

  const updated = await prisma.aiMessageDispatch.update({
    where: { id: dispatch.id },
    data: {
      messageText: finalMessage,
      status: waResult.success ? 'sent' : 'failed',
      errorMsg: waResult.success ? null : waResult.error || 'Falha no envio WhatsApp',
      sentAt: waResult.success ? new Date() : null,
    },
  });

  await fireN8nWebhook(tenantId, waResult.success ? 'message.sent' : 'message.failed', {
    dispatchId: updated.id,
    agentSlug: updated.agentSlug,
    patientId: dispatch.patient.id,
    patientName: dispatch.patient.name,
    title: updated.title,
    messageText: finalMessage,
    whatsappSuccess: waResult.success,
    error: waResult.error || null,
  });

  return {
    dispatchId: updated.id,
    status: updated.status as 'sent' | 'failed',
    deliveryMode: updated.deliveryMode as 'review' | 'auto',
    error: waResult.error,
  };
}

/**
 * Gera radiografia em tempo real dos indicadores do consultório para o Agente de Gestão.
 */
export async function buildPracticeManagementSnapshot(tenantId: string): Promise<string> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

  const [tenant, patients, monthAppointments, transactions, leads] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.patient.findMany({
      where: { tenantId, status: 'active' },
      include: {
        appointments: {
          where: { status: { notIn: ['cancelled'] } },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.appointment.findMany({
      where: { tenantId, scheduledAt: { gte: startOfMonth } },
    }),
    prisma.financialTransaction.findMany({
      where: { tenantId, dueDate: { gte: startOfMonth } },
    }),
    prisma.lead.findMany({
      where: { tenantId },
    }),
  ]);

  const completedCount = monthAppointments.filter((a) => a.status === 'completed').length;
  const scheduledCount = monthAppointments.filter((a) =>
    ['scheduled', 'confirmed'].includes(a.status)
  ).length;
  const cancelledCount = monthAppointments.filter((a) => a.status === 'cancelled').length;
  const totalApps = monthAppointments.length || 1;
  const cancelRate = ((cancelledCount / totalApps) * 100).toFixed(1);

  const paidIncome = transactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);
  const pendingIncome = transactions
    .filter((t) => t.type === 'income' && t.status === 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

  const inactivePatients = patients.filter((p) => {
    const lastApp = p.appointments[0];
    if (!lastApp) return true;
    return new Date(lastApp.scheduledAt) < twentyDaysAgo;
  });

  const newLeads = leads.filter((l) => l.stage === 'new_lead').length;
  const contactedLeads = leads.filter((l) => l.stage === 'contacted').length;

  return `### RADIOGRAFIA EM TEMPO REAL DO CONSULTÓRIO (DADOS REAIS DO SISTEMA):
- Meta Mensal de Receita: R$ ${(tenant?.monthlyIncomeGoal || 10000).toFixed(2)} | Limite Semanal Saudável: ${tenant?.weeklyMaxHours || 20}h
- Receita Recebida no Mês Atual: R$ ${paidIncome.toFixed(2)} | Receita Pendente/Agendada: R$ ${pendingIncome.toFixed(2)}
- Pacientes Ativos na Carteira: ${patients.length} | Pacientes sem sessão há mais de 20 dias (risco de evasão): ${inactivePatients.length} (${inactivePatients
    .slice(0, 8)
    .map((p) => p.name.split(' ')[0])
    .join(', ') || 'nenhum'})
- Sessões no Mês: ${completedCount} realizadas, ${scheduledCount} agendadas/confirmadas, ${cancelledCount} canceladas (Taxa de cancelamento: ${cancelRate}%)
- Funil de Captação (Leads): ${leads.length} totais (${newLeads} aguardando 1º contato, ${contactedLeads} em conversa).`;
}

/**
 * Busca resumo clínico recente anonimizado de um paciente para contextualizar Pós-Sessão ou Expansão.
 */
async function buildPatientClinicalSummary(tenantId: string, patientId: string, patientName: string) {
  const records = await prisma.clinicalRecord.findMany({
    where: { tenantId, patientId },
    orderBy: { sessionDate: 'desc' },
    take: 4,
  });

  if (records.length === 0) return '';

  const lines = records.map((r, idx) => {
    let soapPlan = '';
    try {
      const soap = JSON.parse(decryptText(r.soapEnc));
      soapPlan = sanitizeClinicalDraft(
        `${soap.assessment || ''} | Plano: ${soap.plan || ''}`,
        patientName
      );
    } catch {
      soapPlan = '';
    }

    let emocoes: string[] = [];
    let situacoes: any[] = [];
    if (r.emocoesTrabalhadas) {
      try {
        const parsed = JSON.parse(r.emocoesTrabalhadas);
        if (Array.isArray(parsed)) emocoes = parsed;
        else {
          emocoes = parsed.emocoes || [];
          situacoes = parsed.situacoes || [];
        }
      } catch {
        // ignore
      }
    }

    const sitText = situacoes
      .map(
        (s: any) =>
          `${s.categoria} > ${s.situacao}${s.complemento ? ` (${s.complemento})` : ''}${
            s.emocoes?.length ? ` [${s.emocoes.join(', ')}]` : ''
          }`
      )
      .join('; ');

    const d = new Date(r.sessionDate).toLocaleDateString('pt-BR');
    return `- Sessão ${idx + 1} (${d}): Situações=[${sitText || 'N/A'}] | Emoções=[${emocoes.join(', ') || 'N/A'}] | Síntese=${soapPlan.slice(0, 260)}`;
  });

  return `### HISTÓRICO DAS ÚLTIMAS SESSÕES DO PACIENTE (ANONIMIZADO):\n${lines.join('\n')}`;
}

/**
 * Executa qualquer um dos 4 Agentes B.E.M. com RAG + Memória Estruturada + Dados do Consultório + Extração Automática de Memória.
 */
export async function runBemAgent(params: {
  tenantId: string;
  agentSlug: AgentSlug;
  userPrompt: string;
  patientId?: string | null;
  threadId?: string | null;
  extraContext?: string;
  emotionHints?: string[];
}) {
  await ensureAiTables(params.tenantId);

  const [tenant, agentConfig, patient] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: params.tenantId } }),
    prisma.aiAgentConfig.findUnique({
      where: { tenantId_slug: { tenantId: params.tenantId, slug: params.agentSlug } },
    }),
    params.patientId
      ? prisma.patient.findFirst({ where: { id: params.patientId, tenantId: params.tenantId } })
      : Promise.resolve(null),
  ]);

  if (!tenant) throw new Error('Consultório não encontrado.');

  const corePhilosophy = tenant.aiCorePhilosophy || DEFAULT_BEM_CORE_PHILOSOPHY;
  const sanitizedUserPrompt = patient
    ? sanitizeClinicalDraft(params.userPrompt, patient.name)
    : params.userPrompt;

  // 1. Busca RAG + Memórias + Contexto Operacional em paralelo
  const [ragResult, memoryContext, managementSnapshot, patientHistoryContext] = await Promise.all([
    retrieveBemKnowledge({
      tenantId: params.tenantId,
      agentSlug: params.agentSlug,
      query: sanitizedUserPrompt,
      emotionNames: params.emotionHints,
    }),
    buildMemoryPromptContext({
      tenantId: params.tenantId,
      agentSlug: params.agentSlug,
      patientId: patient?.id,
      patientName: patient?.name,
    }),
    params.agentSlug === 'gestao'
      ? buildPracticeManagementSnapshot(params.tenantId)
      : Promise.resolve(''),
    patient
      ? buildPatientClinicalSummary(params.tenantId, patient.id, patient.name)
      : Promise.resolve(''),
  ]);

  // 2. Histórico recente da Thread (se em conversa contínua)
  let thread = params.threadId
    ? await prisma.agentThread.findFirst({
        where: { id: params.threadId, tenantId: params.tenantId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 } },
      })
    : null;

  if (!thread) {
    thread = await prisma.agentThread.create({
      data: {
        tenantId: params.tenantId,
        agentSlug: params.agentSlug,
        patientId: patient?.id || null,
        title: params.userPrompt.slice(0, 70),
      },
      include: { messages: true },
    });
  }

  const conversationHistory =
    thread.messages.length > 0
      ? `### HISTÓRICO DESTA CONVERSA:\n` +
        thread.messages
          .map((m) => `${m.role === 'user' ? 'TERAPEUTA' : 'AGENTE B.E.M.'}: ${m.content.slice(0, 700)}`)
          .join('\n\n')
      : '';

  const systemInstruction = `${corePhilosophy}

---
 PAPEL DO AGENTE ATUAL (${agentConfig?.name || params.agentSlug}):
${agentConfig?.systemPrompt || ''}
- Terapeuta responsável: ${tenant.name}
${patient ? '- Nota LGPD: O paciente em foco está anonimizado como [PACIENTE]. Quando redigir mensagens destinadas ao paciente, use o marcador [PACIENTE] onde entraria o primeiro nome dele.' : ''}`;

  const fullPrompt = `${ragResult.formattedContext}

${memoryContext}

${managementSnapshot}

${patientHistoryContext}

${params.extraContext ? `### CONTEXTO ADICIONAL DA TAREFA:\n${params.extraContext}` : ''}

${conversationHistory}

### SOLICITAÇÃO ATUAL DO TERAPEUTA:
${sanitizedUserPrompt}

Responda em JSON válido contendo:
{
  "reply": "Sua resposta completa, bem estruturada em Markdown, clara e fiel à filosofia B.E.M.",
  "extractedMemories": [
    {
      "category": "padrao_emocional | evolucao | preferencia | posicionamento | metodologia | regra_gestao",
      "title": "Resumo curto do fato importante aprendido (máx 60 caracteres)",
      "content": "Descrição objetiva para guardar na memória estruturada futura",
      "importance": 4
    }
  ]
}
(Nota: só inclua itens em extractedMemories se houver realmente um aprendizado duradouro novo relevante nesta interação; caso contrário retorne array vazio []).`;

  const rawAiJson = await callGeminiText({
    prompt: fullPrompt,
    systemInstruction,
    jsonMode: true,
  });

  let replyText = '';
  let extractedMemories: Array<{
    category: string;
    title: string;
    content: string;
    importance: number;
  }> = [];

  if (rawAiJson) {
    try {
      const parsed = JSON.parse(rawAiJson);
      replyText = parsed.reply || rawAiJson;
      if (Array.isArray(parsed.extractedMemories)) {
        extractedMemories = parsed.extractedMemories.slice(0, 2);
      }
    } catch {
      replyText = rawAiJson;
    }
  } else {
    // Fallback local inteligente caso GEMINI_API_KEY ainda não esteja definida no .env local
    replyText = buildOfflineFallbackReply({
      agentSlug: params.agentSlug,
      userPrompt: params.userPrompt,
      managementSnapshot,
      sourcesUsed: ragResult.sourcesUsed,
    });
  }

  // Re-hidrata [PACIENTE] para o primeiro nome real apenas na visualização local autorizada
  if (patient) {
    const firstName = patient.name.trim().split(/\s+/)[0];
    replyText = replyText.replace(/\[PACIENTE\]/gi, firstName);
  }

  // 3. Persiste novas memórias estruturadas se autoMemory estiver ativo
  const savedMemories: Array<{ title: string; scope: string }> = [];
  if ((agentConfig?.autoMemory ?? true) && extractedMemories.length > 0) {
    const targetScope: MemoryScope = patient
      ? 'atendimento'
      : params.agentSlug === 'marketing'
      ? 'marketing'
      : params.agentSlug === 'gestao'
      ? 'gestao'
      : 'expansao';

    for (const mem of extractedMemories) {
      if (mem.title && mem.content) {
        await createStructuredMemory({
          tenantId: params.tenantId,
          scope: targetScope,
          patientId: patient?.id || null,
          category: mem.category || 'aprendizado',
          title: mem.title,
          content: mem.content,
          importance: mem.importance || 3,
          source: 'agent_auto',
        });
        savedMemories.push({ title: mem.title, scope: targetScope });
      }
    }
  }

  // 4. Registra mensagens na Thread
  await prisma.agentMessage.create({
    data: {
      threadId: thread.id,
      role: 'user',
      content: params.userPrompt,
    },
  });

  await prisma.agentMessage.create({
    data: {
      threadId: thread.id,
      role: 'assistant',
      content: replyText,
      memoriesExtractedJson: savedMemories.length > 0 ? JSON.stringify(savedMemories) : null,
      sourcesUsedJson:
        ragResult.sourcesUsed.length > 0 ? JSON.stringify(ragResult.sourcesUsed) : null,
    },
  });

  await prisma.agentThread.update({
    where: { id: thread.id },
    data: { updatedAt: new Date() },
  });

  return {
    threadId: thread.id,
    reply: replyText,
    sourcesUsed: ragResult.sourcesUsed,
    memoriesSaved: savedMemories,
    deliveryMode: (agentConfig?.deliveryMode || tenant.aiDefaultDeliveryMode || 'review') as
      | 'review'
      | 'auto',
  };
}

/**
 * Fluxo Clínico Especializado 1: Compilação de Feedback Pós-Sessão B.E.M.
 */
export async function compilePostSessionFeedback(params: {
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  rawNotes?: string;
  soap?: { subjective: string; objective: string; assessment: string; plan: string };
  emocoesTrabalhadas?: string[];
  situacoes?: Array<{
    categoria: string;
    situacao: string;
    complemento?: string;
    emocoes?: string[];
  }>;
  deliveryModeOverride?: 'review' | 'auto';
  enqueueDispatch?: boolean;
}) {
  await ensureAiTables(params.tenantId);

  const patient = await prisma.patient.findFirst({
    where: { id: params.patientId, tenantId: params.tenantId },
  });
  if (!patient) throw new Error('Paciente não encontrado.');

  const allEmotions = Array.from(
    new Set([
      ...(params.emocoesTrabalhadas || []),
      ...(params.situacoes || []).flatMap((s) => s.emocoes || []),
    ])
  );

  const situacoesDesc = (params.situacoes || [])
    .map(
      (s) =>
        `- Categoria: ${s.categoria} | Situação: ${s.situacao}${
          s.complemento ? ` (${ sanitizeClinicalDraft(s.complemento, patient.name) })` : ''
        }${s.emocoes?.length ? ` -> Emoções associadas: ${s.emocoes.join(', ')}` : ''}`
    )
    .join('\n');

  const sessionContext = `DADOS DA SESSÃO RECÉM-REALIZADA COM [PACIENTE]:
Situações Mapeadas na Sessão:
${situacoesDesc || '- Sessão de acolhimento e regulação emocional geral'}

Emoções Trabalhadas / Liberadas:
${allEmotions.join(', ') || 'Presença e auto-observação'}

Síntese Clínica (SOAP Anonimizado):
- Relato: ${sanitizeClinicalDraft(params.soap?.subjective || params.rawNotes || '', patient.name)}
- Avaliação: ${sanitizeClinicalDraft(params.soap?.assessment || '', patient.name)}
- Plano Terapêutico: ${sanitizeClinicalDraft(params.soap?.plan || '', patient.name)}`;

  const prompt = `Elabore uma mensagem de **Devolutiva Pós-Sessão B.E.M.** pronta para enviar no WhatsApp de [PACIENTE] (entre 2 e 4 parágrafos curtos, acolhedores e formatados para leitura agradável no celular).
Inclua:
1. Acolhimento caloroso reconhecendo o passo dado hoje na sessão.
2. Uma síntese clara e humana do que trabalhamos e liberamos hoje (conectando as situações e emoções sem soar técnico ou patologizante).
3. Uma Frase de Ancoragem inspirada nas emoções positivas da técnica B.E.M.
4. Um pequeno exercício prático de percepção corporal/respiratória de 2 minutos para praticar até o nosso próximo encontro.`;

  const agentRes = await runBemAgent({
    tenantId: params.tenantId,
    agentSlug: 'pos_sessao',
    userPrompt: prompt,
    patientId: patient.id,
    extraContext: sessionContext,
    emotionHints: allEmotions,
  });

  // Registra memória estruturada da sessão na ficha evolutiva do paciente
  if (allEmotions.length > 0 || (params.situacoes && params.situacoes.length > 0)) {
    const summaryTitle = `Sessão ${new Date().toLocaleDateString('pt-BR')}: ${
      allEmotions.slice(0, 3).join(', ') || 'Integração B.E.M.'
    }`;
    const summaryContent = `Trabalhado: ${
      (params.situacoes || []).map((s) => `${s.categoria}/${s.situacao}`).join(', ') || 'Geral'
    }. Emoções: ${allEmotions.join(', ')}. Plano: ${params.soap?.plan || 'Auto-observação'}.`;

    await createStructuredMemory({
      tenantId: params.tenantId,
      scope: 'atendimento',
      patientId: patient.id,
      category: 'historico_sessao',
      title: summaryTitle.slice(0, 80),
      content: summaryContent,
      importance: 4,
      source: 'prontuario',
    });
  }

  let dispatchResult = null;
  if (params.enqueueDispatch) {
    dispatchResult = await queueOrSendPatientMessage({
      tenantId: params.tenantId,
      agentSlug: 'pos_sessao',
      patientId: patient.id,
      appointmentId: params.appointmentId || null,
      title: `Feedback Pós-Sessão — ${patient.name}`,
      messageText: agentRes.reply,
      deliveryModeOverride: params.deliveryModeOverride,
    });
  }

  return {
    feedbackText: agentRes.reply,
    sourcesUsed: agentRes.sourcesUsed,
    dispatch: dispatchResult,
  };
}

/**
 * Fluxo Especializado 2: Gerador de Programas, Exercícios e Desafios de Expansão da Consciência (7 / 14 / 21 dias)
 */
export async function generateConsciousnessProgram(params: {
  tenantId: string;
  patientId?: string | null;
  themeOrGoal: string;
  durationDays: number;
  deliveryMode: 'review' | 'auto';
  sendFirstDayNow?: boolean;
}) {
  await ensureAiTables(params.tenantId);

  const [tenant, patient] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: params.tenantId } }),
    params.patientId
      ? prisma.patient.findFirst({ where: { id: params.patientId, tenantId: params.tenantId } })
      : Promise.resolve(null),
  ]);

  if (!tenant) throw new Error('Consultório não encontrado.');

  const daysToGenerate = Math.min(21, Math.max(3, params.durationDays || 7));
  const [ragResult, memoryContext, patientHistory] = await Promise.all([
    retrieveBemKnowledge({
      tenantId: params.tenantId,
      agentSlug: 'expansao',
      query: params.themeOrGoal,
    }),
    buildMemoryPromptContext({
      tenantId: params.tenantId,
      agentSlug: 'expansao',
      patientId: patient?.id,
      patientName: patient?.name,
    }),
    patient ? buildPatientClinicalSummary(params.tenantId, patient.id, patient.name) : Promise.resolve(''),
  ]);

  const prompt = `${tenant.aiCorePhilosophy || DEFAULT_BEM_CORE_PHILOSOPHY}

${ragResult.formattedContext}

${memoryContext}

${patientHistory}

Crie um Programa Estruturado de Expansão da Autoconsciência B.E.M. com duração de **${daysToGenerate} dias** focado em: "${sanitizeClinicalDraft(params.themeOrGoal, patient?.name)}".
${patient ? 'Personalize a jornada para o momento atual de [PACIENTE].' : 'Crie um programa versátil reutilizável.'}

Retorne OBRIGATORIAMENTE um JSON válido com a estrutura:
{
  "title": "Nome inspirador do programa/desafio",
  "goal": "Objetivo terapêutico central em 1 frase",
  "steps": [
    {
      "day": 1,
      "title": "Título do Dia 1",
      "focusTheme": "Emoção ou chave de consciência trabalhada",
      "morningPrompt": "Pergunta de intenção ao acordar",
      "somaticExercise": "Prática corporal/respiratória B.E.M. de 3 minutos",
      "eveningReflection": "Auto-observação noturna",
      "whatsappMessage": "Mensagem completa e calorosa pronta para enviar no WhatsApp na manhã deste dia"
    }
  ]
}
Gere exatamente ${daysToGenerate} itens no array steps (dias 1 até ${daysToGenerate}).`;

  const rawJson = await callGeminiText({
    prompt,
    jsonMode: true,
  });

  let programTitle = `Jornada ${daysToGenerate} Dias — ${params.themeOrGoal}`;
  let programGoal = params.themeOrGoal;
  let steps: ProgramStep[] = [];

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      programTitle = parsed.title || programTitle;
      programGoal = parsed.goal || programGoal;
      if (Array.isArray(parsed.steps)) {
        steps = parsed.steps.map((s: any, idx: number) => {
          const firstName = patient ? patient.name.trim().split(/\s+/)[0] : 'você';
          return {
            day: s.day || idx + 1,
            title: (s.title || `Dia ${idx + 1}`).replace(/\[PACIENTE\]/gi, firstName),
            focusTheme: s.focusTheme || 'Autoconsciência',
            morningPrompt: (s.morningPrompt || '').replace(/\[PACIENTE\]/gi, firstName),
            somaticExercise: (s.somaticExercise || '').replace(/\[PACIENTE\]/gi, firstName),
            eveningReflection: (s.eveningReflection || '').replace(/\[PACIENTE\]/gi, firstName),
            whatsappMessage: (s.whatsappMessage || '').replace(/\[PACIENTE\]/gi, firstName),
            completed: false,
          };
        });
      }
    } catch {
      steps = [];
    }
  }

  if (steps.length === 0) {
    const firstName = patient ? patient.name.trim().split(/\s+/)[0] : '';
    for (let d = 1; d <= daysToGenerate; d++) {
      steps.push({
        day: d,
        title: `Dia ${d} — Presença e Escuta do Corpo`,
        focusTheme: params.themeOrGoal,
        morningPrompt: 'Onde no meu corpo sinto mais tensão ou abertura ao iniciar o dia hoje?',
        somaticExercise:
          '3 ciclos de respiração profunda soltando o peso dos ombros e destravando o maxilar no exalar.',
        eveningReflection: 'Qual emoção pediu minha atenção hoje sem que eu precisasse julgá-la?',
        whatsappMessage: `Bom dia${firstName ? `, ${firstName}` : ''}! 🌿\n\n*Dia ${d} da nossa jornada (${params.themeOrGoal}):*\n\n✨ *Pergunta da manhã:* Onde no seu corpo você percebe mais presença hoje?\n🫁 *Pausa B.E.M. (3 min):* Inspire profundo pelo nariz e solte o ar suavemente pela boca relaxando os ombros e o maxilar.\n🌙 *À noite, observe:* Qual sentimento apareceu hoje pedindo acolhimento em vez de cobrança?`,
        completed: false,
      });
    }
  }

  const savedProgram = await prisma.patientProgram.create({
    data: {
      tenantId: params.tenantId,
      patientId: patient?.id || null,
      title: programTitle,
      goal: programGoal,
      durationDays: steps.length,
      stepsJson: JSON.stringify(steps),
      deliveryMode: params.deliveryMode,
      status: patient ? 'active' : 'template',
      currentDay: 1,
    },
  });

  await fireN8nWebhook(params.tenantId, 'program.created', {
    programId: savedProgram.id,
    patientId: patient?.id || null,
    patientName: patient?.name || null,
    title: savedProgram.title,
    durationDays: savedProgram.durationDays,
    deliveryMode: savedProgram.deliveryMode,
    steps,
  });

  let firstDayDispatch = null;
  if (patient && params.sendFirstDayNow && steps[0]?.whatsappMessage) {
    firstDayDispatch = await queueOrSendPatientMessage({
      tenantId: params.tenantId,
      agentSlug: 'expansao',
      patientId: patient.id,
      programId: savedProgram.id,
      title: `${savedProgram.title} — Dia 1`,
      messageText: steps[0].whatsappMessage,
      deliveryModeOverride: params.deliveryMode,
    });
  }

  return {
    program: savedProgram,
    steps,
    firstDayDispatch,
  };
}

function buildOfflineFallbackReply(params: {
  agentSlug: AgentSlug;
  userPrompt: string;
  managementSnapshot: string;
  sourcesUsed: string[];
}): string {
  const sourcesNote =
    params.sourcesUsed.length > 0
      ? `\n\n📚 *Fontes B.E.M. consultadas:* ${params.sourcesUsed.join(' • ')}`
      : '';

  if (params.agentSlug === 'gestao') {
    return `### Diagnóstico do Consultório B.E.M.\n\n${params.managementSnapshot}\n\n#### Recomendações Práticas da Semana:\n1. **Retenção Ativa:** Envie uma mensagem gentil de presença aos pacientes que estão há mais de 20 dias sem agendar.\n2. **Conversão do Funil:** Priorize o contato com os novos leads em até 2 horas após o cadastro.\n3. **Previsibilidade:** Ofereça renovação de pacotes para pacientes em fase de consolidação terapêutica.${sourcesNote}\n\n*(Configure \`GEMINI_API_KEY\` no ambiente para análises generativas profundas em tempo real).*`;
  }

  return `Olá! Recebi sua solicitação no agente **${params.agentSlug.toUpperCase()}**:\n> "${params.userPrompt}"\n\nPara ativar a geração profunda com IA baseada na sua biblioteca e memórias B.E.M., certifique-se de que a variável \`GEMINI_API_KEY\` está preenchida no seu arquivo \`.env\` / \`docker-compose.yml\`.${sourcesNote}`;
}
