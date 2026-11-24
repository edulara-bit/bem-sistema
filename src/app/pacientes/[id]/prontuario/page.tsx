import { getTenantDb, prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { decryptText } from '@/lib/crypto';
import { ProntuarioView } from './ProntuarioView';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';

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

  const db = getTenantDb(tenant.id);
  const patient = await db.patients.findUnique(id);

  if (!patient) {
    notFound();
  }

  // Busca emoções do banco ou do arquivo detalhado
  let emotions = await prisma.emotion.findMany({
    where: {
      OR: [{ tenantId: tenant.id }, { tenantId: null }],
    },
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

  // Busca histórico de registros com agendamentos vinculados
  const records = await prisma.clinicalRecord.findMany({
    where: {
      tenantId: tenant.id,
      patientId: patient.id,
    },
    include: {
      appointment: true,
    },
    orderBy: {
      sessionDate: 'desc',
    },
  });

  // Descriptografa histórico clínico completo
  const history = records.map((r: any) => {
    let soap = { subjective: '', objective: '', assessment: '', plan: '' };
    try {
      const decryptedSoapStr = decryptText(r.soapEnc);
      soap = JSON.parse(decryptedSoapStr);
    } catch {
      soap = { subjective: 'Erro na leitura', objective: '', assessment: '', plan: '' };
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
      aiAssisted: r.aiAssisted,
      isLocked: r.isLocked,
    };
  });

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
    />
  );
}
