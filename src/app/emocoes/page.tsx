import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { EmotionsView } from './EmotionsView';
import fs from 'fs';
import path from 'path';

export const metadata = {
  title: 'Catálogo de Emoções & Bioenergética — BEM',
  description: 'Consulte, edite e personalize as descrições das 140 emoções clínicas trabalhadas nas sessões de Bioenergética.',
};

export default async function EmotionsPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) return <div>Tenant não encontrado.</div>;

  let emotions = await prisma.emotion.findMany({
    where: {
      OR: [{ tenantId: tenant.id }, { tenantId: null }],
    },
    orderBy: [{ title: 'asc' }],
  });

  // Auto-popula se o banco ainda não tiver as emoções populadas
  if (emotions.length === 0) {
    try {
      const jsonPath = path.join(process.cwd(), 'src/lib/emotions-detailed.json');
      if (fs.existsSync(jsonPath)) {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        for (const item of raw) {
          await prisma.emotion.create({
            data: {
              tenantId: tenant.id,
              title: item.title,
              description: item.description,
              code: item.letra,
              type: item.tipo,
              phrases: item.phrases,
            },
          });
        }
        emotions = await prisma.emotion.findMany({
          where: { tenantId: tenant.id },
          orderBy: [{ title: 'asc' }],
        });
      }
    } catch (e) {
      console.warn('Erro ao auto-popular emoções:', e);
    }
  }

  return <EmotionsView emotions={emotions} />;
}
