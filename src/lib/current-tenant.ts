import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { verifySessionToken } from './auth';
import { ensureAiTables } from './ai/init-db';

export async function getCurrentTenant() {
  const cookieStore = await cookies();
  await ensureAiTables();

  const sessionToken = cookieStore.get('bem_session')?.value;
  const activeSlug = cookieStore.get('bem_active_tenant')?.value;

  if (sessionToken) {
    const session = await verifySessionToken(sessionToken);
    if (session?.userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { tenant: true },
      });

      if (dbUser?.tenant) {
        const isSuperAdmin =
          dbUser.role === 'super_admin' ||
          dbUser.role === 'admin' ||
          dbUser.tenant.slug === 'edulara';

        // Apenas Super Admin pode inspecionar outros consultórios via seletor bem_active_tenant
        if (isSuperAdmin && activeSlug && activeSlug !== dbUser.tenant.slug) {
          const switched = await prisma.tenant.findUnique({
            where: { slug: activeSlug },
          });
          if (switched) return switched;
        }

        return dbUser.tenant;
      }
    }
  }

  const fallbackSlug = activeSlug || 'edulara';
  let tenant = await prisma.tenant.findUnique({
    where: { slug: fallbackSlug },
  });

  if (!tenant) {
    tenant = await prisma.tenant.findFirst({
      orderBy: { createdAt: 'asc' },
    });
  }

  return tenant;
}

export async function getAllTenants() {
  await ensureAiTables();

  return await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      headline: true,
      plan: true,
      isActive: true,
      aiAgentsEnabled: true,
      logoUrl: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}
