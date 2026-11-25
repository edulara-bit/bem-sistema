import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { verifySessionToken } from './auth';
import { ensureAiTables } from './ai/init-db';

export async function getCurrentTenant() {
  const cookieStore = await cookies();
  await ensureAiTables();

  // 1. Prioriza o tenant da sessão autenticada
  const sessionToken = cookieStore.get('bem_session')?.value;
  if (sessionToken) {
    const session = await verifySessionToken(sessionToken);
    if (session?.tenantId) {
      const tenantFromSession = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
      });
      if (tenantFromSession) return tenantFromSession;
    }
  }

  // 2. Caso não esteja autenticado, busca pelo cookie ativo
  const activeSlug = cookieStore.get('bem_active_tenant')?.value || 'edulara';

  let tenant = await prisma.tenant.findUnique({
    where: { slug: activeSlug },
  });

  // Fallback para o primeiro tenant cadastrado se o slug do cookie não existir
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
    },
    orderBy: { createdAt: 'asc' },
  });
}
