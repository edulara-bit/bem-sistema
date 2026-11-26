import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { getTenantDb, prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';
import { decryptText } from '@/lib/crypto';
import { ensureAiTables } from '@/lib/ai/init-db';
import { listStructuredMemories } from '@/lib/ai/memory';
import { ProntuarioView } from './ProntuarioView';

const STARTER_FREQUENCIES = [
  { number: '1', title: 'Frequência 1', description: 'Expressão vibracional 1 do protocolo B.E.M.' },
  { number: '2', title: 'Frequência 2', description: 'Expressão vibracional 2 do protocolo B.E.M.' },
  { number: '3', title: 'Frequência 3', description: 'Expressão vibracional 3 do protocolo B.E.M.' },
  { number: '4', title: 'Frequência 4', description: 'Expressão vibracional 4 do protocolo B.E.M.' },
  { number: '5', title: 'Frequência 5', description: 'Expressão vibracional 5 do protocolo B.E.M.' },
  { number: '6', title: 'Frequência 6', description: 'Expressão vibracional 6 do protocolo B.E.M.' },
  { number: '7', title: 'Frequência 7', description: 'Expressão vibracional 7 do protocolo B.E.M.' },
  { number: '8', title: 'Frequência 8', description: 'Expressão vibracional 8 do protocolo B.E.M.' },
  { number: '9', title: 'Frequência 9', description: 'Expressão vibracional 9 do protocolo B.E.M.' },
];

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

  let emotions = await prisma.emotion.findMany({
    orderBy: [{ title: 'asc' }],
  });

  if (emotions.length === 0) {
    try {
      const jsonPath = path.join(process.cwd(), 'src/lib/emotions-detailed.json');
      if (fs.existsSync(jsonPath)) {
        emotions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      }
    } catch (e) {
      console.warn('Erro ao ler emotions-detailed.json:', e);
    }
  }

  let frequencies = await prisma.frequency.findMany();
  if (frequencies.length === 0) {
    for (const f of STARTER_FREQUENCIES) {
      await prisma.frequency.create({ data: f });
    }
    frequencies = await prisma.frequency.findMany();
  }
  frequencies.sort((a, b) =>
    a.number.localeCompare(b.number, 'pt-BR', { numeric: true })
  );

  const [records, patientMemories, patientPrograms, anamnesisQuestions, freshTenant, userCtx] =
    await Promise.all([
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
