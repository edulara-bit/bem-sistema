import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';
import { EmotionsView } from './EmotionsView';

export const metadata = {
  title: 'Emoções & Frequências Vibracionais — BEM',
  description:
    'Catálogo oficial das Emoções e Frequências vibracionais do protocolo B.E.M.',
};

const STARTER_FREQUENCIES = [
  {
    number: '1',
    title: 'Frequência 1',
    description: 'Expressão vibracional fundamental 1 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '2',
    title: 'Frequência 2',
    description: 'Expressão vibracional fundamental 2 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '3',
    title: 'Frequência 3',
    description: 'Expressão vibracional fundamental 3 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '4',
    title: 'Frequência 4',
    description: 'Expressão vibracional fundamental 4 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '5',
    title: 'Frequência 5',
    description: 'Expressão vibracional fundamental 5 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '6',
    title: 'Frequência 6',
    description: 'Expressão vibracional fundamental 6 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '7',
    title: 'Frequência 7',
    description: 'Expressão vibracional fundamental 7 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '8',
    title: 'Frequência 8',
    description: 'Expressão vibracional fundamental 8 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
  {
    number: '9',
    title: 'Frequência 9',
    description: 'Expressão vibracional fundamental 9 do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).',
  },
];

export default async function EmotionsPage() {
  const [tenant, userCtx] = await Promise.all([
    getCurrentTenant(),
    getCurrentUserContext(),
  ]);
  if (!tenant) return <div>Consultório não encontrado.</div>;

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

  let frequencies = await prisma.frequency.findMany();
  if (frequencies.length === 0) {
    for (const f of STARTER_FREQUENCIES) {
      await prisma.frequency.create({ data: f });
    }
    frequencies = await prisma.frequency.findMany();
  }

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
