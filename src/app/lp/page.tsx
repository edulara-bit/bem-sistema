import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ensureAiTables } from '@/lib/ai/init-db';
import { LandingPageView } from '@/components/LandingPageView';

export const metadata: Metadata = {
  title: 'Tratamento da Ansiedade e do Medo com a Medicina da Bioenergética',
  description:
    'Conheça esta técnica inovadora que já ajudou milhares de pessoas em todo o Brasil. Atendimento presencial em Piracicaba.',
};

export default async function LpPage() {
  await ensureAiTables();
  const master = await prisma.tenant.findUnique({
    where: { slug: 'edulara' },
    select: { logoUrl: true },
  });

  return <LandingPageView logoUrl={master?.logoUrl || null} />;
}
