import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { decryptText } from '@/lib/crypto';
import { ProntuarioView } from './ProntuarioView';
import { notFound } from 'next/navigation';

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

  // Descriptografa histórico para renderização
  const history = patient.records.map((r) => {
    let soap = { subjective: '', objective: '', assessment: '', plan: '' };
    try {
      const decryptedSoapStr = decryptText(r.soapEnc);
      soap = JSON.parse(decryptedSoapStr);
    } catch {
      soap = { subjective: 'Erro na leitura', objective: '', assessment: '', plan: '' };
    }

    return {
      id: r.id,
      sessionDate: new Date(r.sessionDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      soap,
      aiAssisted: r.aiAssisted,
      isLocked: r.isLocked,
    };
  });

  return (
    <ProntuarioView
      patient={{ id: patient.id, name: patient.name, notes: patient.notes }}
      appointmentId={appointmentId}
      history={history}
    />
  );
}
