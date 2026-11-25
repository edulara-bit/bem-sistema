import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAiApiRequest } from '@/lib/ai/api-auth';
import { queueOrSendPatientMessage } from '@/lib/ai/orchestrator';

/**
 * Endpoint acionável por Cron no n8n (ex: todos os dias às 08:00) para avançar 1 dia
 * nos Programas/Desafios de Expansão da Consciência ativos, respeitando se cada programa
 * está configurado como 'review' (Revisão Humana) ou 'auto' (Disparo Direto WhatsApp).
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateAiApiRequest(request);
  if (auth.error || !auth.tenant) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const specificProgramId = body?.programId as string | undefined;

    const activePrograms = await prisma.patientProgram.findMany({
      where: {
        tenantId: auth.tenant.id,
        status: 'active',
        patientId: { not: null },
        ...(specificProgramId ? { id: specificProgramId } : {}),
      },
      include: { patient: { select: { id: true, name: true } } },
    });

    const processed: any[] = [];

    for (const prog of activePrograms) {
      if (!prog.patientId) continue;
      const steps = JSON.parse(prog.stepsJson || '[]');
      const idx = prog.currentDay - 1;
      const step = steps[idx];

      if (!step) {
        await prisma.patientProgram.update({
          where: { id: prog.id },
          data: { status: 'completed' },
        });
        continue;
      }

      const dispatch = await queueOrSendPatientMessage({
        tenantId: auth.tenant.id,
        agentSlug: 'expansao',
        patientId: prog.patientId,
        programId: prog.id,
        title: `${prog.title} — Dia ${prog.currentDay}`,
        messageText: step.whatsappMessage,
        deliveryModeOverride: prog.deliveryMode as 'review' | 'auto',
      });

      step.completed = true;
      const nextDay = prog.currentDay + 1;
      const finished = nextDay > steps.length;

      await prisma.patientProgram.update({
        where: { id: prog.id },
        data: {
          stepsJson: JSON.stringify(steps),
          currentDay: finished ? prog.currentDay : nextDay,
          status: finished ? 'completed' : 'active',
        },
      });

      processed.push({
        programId: prog.id,
        patientName: prog.patient?.name,
        dayProcessed: prog.currentDay,
        deliveryMode: prog.deliveryMode,
        dispatchStatus: dispatch.status,
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: processed.length,
      results: processed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao avançar programas ativos.' },
      { status: 500 }
    );
  }
}
