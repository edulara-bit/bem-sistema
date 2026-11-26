import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';
import { ensureAiTables } from '@/lib/ai/init-db';
import { EmotionsView } from './EmotionsView';

export const metadata = {
  title: 'Emoções & Frequências Vibracionais — BEM',
  description:
    'Catálogo oficial das Emoções e Frequências vibracionais do protocolo B.E.M.',
};

export default async function EmotionsPage() {
  const [tenant, userCtx] = await Promise.all([
    getCurrentTenant(),
    getCurrentUserContext(),
  ]);
  if (!tenant) return <div>Consultório não encontrado.</div>;

  await ensureAiTables(tenant.id);

  const [emotions, frequencies] = await Promise.all([
    prisma.emotion.findMany({
      orderBy: [{ title: 'asc' }],
    }),
    prisma.frequency.findMany(),
  ]);

  // Ordenação numérica natural pelo campo number (1, 2, ... 9, 10...)
  frequencies.sort((a, b) =>
    a.number.localeCompare(b.number, 'pt-BR', { numeric: true })
  );

  return (
    <EmotionsView
      emotions={emotions}
      frequencies={frequencies}
      canManage={Boolean(userCtx?.isSuperAdmin)}
    />
  );
}
