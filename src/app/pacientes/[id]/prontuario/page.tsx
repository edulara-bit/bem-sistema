import { notFound } from 'next/navigation';
import { getTenantDb, prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';
import { decryptText } from '@/lib/crypto';
import { ensureAiTables } from '@/lib/ai/init-db';
import { listStructuredMemories } from '@/lib/ai/memory';
import { ProntuarioView } from './ProntuarioView';

export default async function ProntuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const { id } = await params;
  const { appointmentId } = await searchParams;

  const tenant = await getCurrentTenant();
  if (!tenant) return <div>Tenant não encontrado.</div>;

  await ensureAiTables(tenant.id);

  const db = getTenantDb(tenant.id);
  const patient = await db.patients.findUnique(id);

  if (!patient) {
    notFound();
  }

  const [
    emotions,
    frequencies,
    protocolNodes,
    records,
    patientMemories,
    patientPrograms,
    anamnesisQuestions,
    freshTenant,
    userCtx,
  ] = await Promise.all([
    prisma.emotion.findMany({
      orderBy: [{ title: 'asc' }],
    }),
    prisma.frequency.findMany(),
    prisma.protocolNode.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    }),
    prisma.clinicalRecord.findMany({
      where: { tenantId: tenant.id, patientId: patient.id },
      include: { appointment: true },
      orderBy: { sessionDate: 'desc' },
    }),
    listStructuredMemories({
      tenantId: tenant.id,
      scope: 'atendimento',
      patientId: patient.id,
      limit: 40,
    }),
    prisma.patientProgram.findMany({
      where: { tenantId: tenant.id, patientId: patient.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.anamnesisQuestion.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { aiDefaultDeliveryMode: true, aiAgentsEnabled: true },
    }),
    getCurrentUserContext(),
  ]);

  frequencies.sort((a, b) =>
    a.number.localeCompare(b.number, 'pt-BR', { numeric: true })
  );

  let initialAnamnesisAnswers: Record<string, string> = {};
  if ((patient as any).anamnesisEnc) {
    try {
      initialAnamnesisAnswers = JSON.parse(decryptText((patient as any).anamnesisEnc));
    } catch {
      initialAnamnesisAnswers = {};
    }
  }

  const history = records.map((r: any) => {
    let soap = { subjective: '', objective: '', assessment: '', plan: '' };
    try {
      soap = JSON.parse(decryptText(r.soapEnc));
    } catch {
      soap = { subjective: '', objective: '', assessment: '', plan: '' };
    }

    let rawNotes = '';
    if (r.rawDraftEnc) {
      try {
        rawNotes = decryptText(r.rawDraftEnc);
      } catch {
        rawNotes = '';
      }
    }

    let emocoes: string[] = [];
    let situacoes: any[] = [];
    if (r.emocoesTrabalhadas) {
      try {
        const parsed = JSON.parse(r.emocoesTrabalhadas);
        if (Array.isArray(parsed)) {
          emocoes = parsed;
        } else if (parsed && typeof parsed === 'object') {
          emocoes = parsed.emocoes || [];
          situacoes = parsed.situacoes || [];
        }
      } catch {
        emocoes = [];
        situacoes = [];
      }
    }

    return {
      id: r.id,
      appointmentId: r.appointmentId || undefined,
      sessionDate: new Date(r.sessionDate).toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rawNotes,
      soap,
      emocoesTrabalhadas: emocoes,
      situacoes,
      modality: r.appointment?.modality || patient.modalityPreference || 'online',
      sessionType: r.appointment?.sessionType || patient.sessionTypePreference || 'regular',
      status: r.appointment?.status || 'completed',
      price: r.appointment?.price || 0,
      appointmentNotes: r.appointment?.notes || null,
      isLocked: r.isLocked,
    };
  });

  const isSuperAdmin = Boolean(userCtx?.isSuperAdmin);
  const aiAgentsEnabled = Boolean(freshTenant?.aiAgentsEnabled || isSuperAdmin);

  return (
    <ProntuarioView
      patient={{
        id: patient.id,
        name: patient.name,
        notes: patient.notes,
        modalityPreference: patient.modalityPreference,
        sessionTypePreference: patient.sessionTypePreference,
        packageTotalSessions: patient.packageTotalSessions,
        packageUsedSessions: patient.packageUsedSessions,
      }}
      appointmentId={appointmentId}
      history={history}
      emotionsCatalog={emotions.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        phrases: e.phrases || null,
        code: e.code || e.letra || '',
        type: e.type || e.tipo || 'Positiva',
      }))}
      frequenciesCatalog={frequencies.map((f) => ({
        id: f.id,
        number: f.number,
        title: f.title,
        description: f.description,
      }))}
      protocolNodes={protocolNodes.map((n) => ({
        id: n.id,
        title: n.title,
        parentId: n.parentId,
        sortOrder: n.sortOrder,
      }))}
      anamnesisQuestions={anamnesisQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        hint: q.hint,
        fieldType: q.fieldType,
      }))}
      initialAnamnesisAnswers={initialAnamnesisAnswers}
      patientMemories={patientMemories}
      patientPrograms={patientPrograms.map((p) => ({
        id: p.id,
        title: p.title,
        goal: p.goal || '',
        durationDays: p.durationDays,
        currentDay: p.currentDay,
        deliveryMode: p.deliveryMode,
        status: p.status,
        steps: JSON.parse(p.stepsJson || '[]'),
      }))}
      defaultDeliveryMode={(freshTenant?.aiDefaultDeliveryMode as 'review' | 'auto') || 'review'}
      aiAgentsEnabled={aiAgentsEnabled}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
