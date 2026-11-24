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

  return (
    <AgendarView
      therapist={{
        name: tenant?.name || 'Terapeuta',
        slug: tenant?.slug || 'edulara',
        headline: tenant?.headline || 'Psicoterapia, Gestão Emocional e Desenvolvimento Pessoal',
        bio: tenant?.bio,
        consultationPrice: tenant?.consultationPrice || 220.0,
        whatsapp: tenant?.whatsapp,
      }}
    />
  );
}

