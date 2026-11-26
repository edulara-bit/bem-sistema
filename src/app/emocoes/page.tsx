import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';
import { EmotionsView } from './EmotionsView';

export const metadata = {
  title: 'Catálogo de Emoções & Bioenergética — BEM',
  description:
    'Catálogo oficial das emoções clínicas trabalhadas nas sessões de Bioenergética B.E.M.',
};

export default async function EmotionsPage() {
  const [tenant, userCtx] = await Promise.all([
    getCurrentTenant(),
    getCurrentUserContext(),
  ]);
  if (!tenant) return <div>Consultório não encontrado.</div>;

  // Catálogo oficial unificado B.E.M. (gerenciado pelo Admin e consultável por todos os consultórios)
  let emotions = await prisma.emotion.findMany({
    orderBy: [{ title: 'asc' }],
  });

  if (emotions.length === 0) {
    try {
      const jsonPath = path.join(process.cwd(), 'src/lib/emotions-detailed.json');
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        for (const item of raw) {
          await prisma.emotion.create({
            data: {
              tenantId: null,
              title: item.title,
              description: item.description,
              code: item.letra,
              type: item.tipo,
              phrases: item.phrases,
            },
          });
        }
        emotions = await prisma.emotion.findMany({
          orderBy: [{ title: 'asc' }],
        });
      }
    } catch (e) {
      console.warn('Erro ao auto-popular emoções:', e);
    }
  }

  return (
    <EmotionsView
      emotions={emotions}
      canManage={Boolean(userCtx?.isSuperAdmin)}
    />
  );
}
