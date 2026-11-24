import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { decryptText } from '@/lib/crypto';
import { CaptacaoView } from './CaptacaoView';

export const metadata = {
  title: 'Captação & CRM de Pacientes — BEM',
  description: 'Funil de captação, novos contatos e mensagens com IA',
};

export default async function CaptacaoPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) return <div>Tenant não encontrado.</div>;

  const db = getTenantDb(tenant.id);
  const rawLeads = (await db.leads.findMany()) as any[];

  const leads = rawLeads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: decryptText(l.phoneEnc),
    email: l.emailEnc ? decryptText(l.emailEnc) : null,
    demand: l.demand,
    preferredTime: l.preferredTime,
    modality: l.modality,
    stage: l.stage,
    source: l.source,
    createdAt: new Date(l.createdAt).toLocaleDateString('pt-BR'),
  }));

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/agendar?slug=${tenant.slug}`;

  return <CaptacaoView leads={leads} publicUrl={publicUrl} />;
}

