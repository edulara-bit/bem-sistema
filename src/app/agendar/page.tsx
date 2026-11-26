import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { AgendarView } from './AgendarView';

export const metadata = {
  title: 'Agendar Sessão Terapêutica — BEM',
  description: 'Solicite seu atendimento online ou presencial com acolhimento e sigilo absoluto.',
};

export default async function AgendarDefaultPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;

  let tenant = null;
  if (slug) {
    tenant = await prisma.tenant.findUnique({ where: { slug } });
  }

  if (!tenant) {
    tenant = await getCurrentTenant();
  }

  if (!tenant) {
    tenant = await prisma.tenant.findUnique({ where: { slug: 'edulara' } });
  }

  if (tenant && !tenant.isActive) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-2">
          <h1 className="text-lg font-bold text-[#222924]">Agenda Temporariamente Indisponível</h1>
          <p className="text-xs text-[#6B726B]">
            Este espaço terapêutico não está recebendo novos agendamentos online no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AgendarView
      therapist={{
        name: tenant?.name || 'Terapeuta',
        slug: tenant?.slug || 'edulara',
        logoUrl: tenant?.logoUrl || null,
        headline: tenant?.headline || 'Psicoterapia, Gestão Emocional e Desenvolvimento Pessoal',
        bio: tenant?.bio,
        consultationPrice: tenant?.consultationPrice || 220.0,
        whatsapp: tenant?.whatsapp,
      }}
    />
  );
}
