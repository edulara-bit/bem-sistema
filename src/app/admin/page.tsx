import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/admin-guard';
import { ensureAiTables } from '@/lib/ai/init-db';
import { AdminView } from './AdminView';

export const metadata = {
  title: 'Administração Geral — Plataforma B.E.M.',
  description:
    'Gestão exclusiva de terapeutas, categorias/subcategorias de protocolos B.E.M., permissões de Agentes e consultórios.',
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getCurrentUserContext();
  if (!ctx || !ctx.isSuperAdmin) {
    redirect('/cockpit');
  }

  await ensureAiTables(ctx.homeTenantId);
  const { tab } = await searchParams;

  const [tenants, emotionsCount, protocolNodes] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        users: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isVerified: true,
            verificationCode: true,
          },
        },
        _count: {
          select: {
            patients: true,
            appointments: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.emotion.count(),
    prisma.protocolNode.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    }),
  ]);

  return (
    <AdminView
      initialTab={tab === 'protocolos' ? 'protocolos' : 'consultorios'}
      emotionsCount={emotionsCount}
      protocolNodes={protocolNodes.map((n) => ({
        id: n.id,
        title: n.title,
        parentId: n.parentId,
        sortOrder: n.sortOrder,
      }))}
      tenants={tenants.map((t) => {
        const owner = t.users[0] || null;
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          isActive: t.isActive,
          aiAgentsEnabled: t.aiAgentsEnabled,
          logoUrl: t.logoUrl || null,
          whatsapp: t.whatsapp || owner?.phone || '',
          consultationPrice: t.consultationPrice,
          patientsCount: t._count.patients,
          appointmentsCount: t._count.appointments,
          createdAt: t.createdAt.toLocaleDateString('pt-BR'),
          owner: owner
            ? {
                id: owner.id,
                name: owner.name,
                email: owner.email,
                phone: owner.phone || t.whatsapp || '',
                role: owner.role,
                isVerified: owner.isVerified,
                verificationCode: owner.verificationCode,
              }
            : null,
        };
      })}
    />
  );
}
