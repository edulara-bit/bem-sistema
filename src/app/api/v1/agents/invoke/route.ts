import { NextRequest, NextResponse } from 'next/server';
import { authenticateAiApiRequest, resolvePatientForApi } from '@/lib/ai/api-auth';
import {
  AgentSlug,
  queueOrSendPatientMessage,
  runBemAgent,
} from '@/lib/ai/orchestrator';

const VALID_AGENTS = new Set(['marketing', 'pos_sessao', 'expansao', 'gestao']);

export async function POST(request: NextRequest) {
  const auth = await authenticateAiApiRequest(request);
  if (auth.error || !auth.tenant) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const agentSlug = (body.agentSlug || 'expansao') as AgentSlug;

    if (!VALID_AGENTS.has(agentSlug)) {
      return NextResponse.json(
        {
          success: false,
          error: 'agentSlug inválido. Use: marketing, pos_sessao, expansao ou gestao.',
        },
        { status: 400 }
      );
    }

    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'O campo "prompt" é obrigatório.' },
        { status: 400 }
      );
    }

    const patient = await resolvePatientForApi(auth.tenant.id, {
      patientId: body.patientId,
      patientPhone: body.patientPhone,
    });

    const result = await runBemAgent({
      tenantId: auth.tenant.id,
      agentSlug,
      userPrompt: body.prompt,
      patientId: patient?.id || null,
      threadId: body.threadId || null,
      extraContext: body.extraContext || undefined,
      emotionHints: Array.isArray(body.emotionHints) ? body.emotionHints : undefined,
    });

    let dispatch = null;
    if (body.dispatchToPatient && patient) {
      dispatch = await queueOrSendPatientMessage({
        tenantId: auth.tenant.id,
        agentSlug,
        patientId: patient.id,
        title: body.dispatchTitle || `Automação n8n (${agentSlug})`,
        messageText: result.reply,
        deliveryModeOverride:
          body.deliveryMode === 'auto' || body.deliveryMode === 'review'
            ? body.deliveryMode
            : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      agentSlug,
      patient: patient ? { id: patient.id, name: patient.name } : null,
      threadId: result.threadId,
      reply: result.reply,
      sourcesUsed: result.sourcesUsed,
      memoriesSaved: result.memoriesSaved,
      dispatch,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro interno ao executar agente B.E.M.' },
      { status: 500 }
    );
  }
}
