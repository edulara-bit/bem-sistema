import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { verifySessionToken } from './auth';
import { ensureAiTables } from './ai/init-db';

export interface CurrentUserContext {
  userId: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  homeTenantId: string;
  homeTenantSlug: string;
}

/**
 * Retorna o contexto completo do usuário autenticado consultando o banco ao vivo
 * (para refletir imediatamente permissões de super_admin e status de inativação).
 */
export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const cookieStore = await cookies();
  await ensureAiTables();

  const token = cookieStore.get('bem_session')?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session?.userId) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { tenant: { select: { id: true, slug: true, isActive: true } } },
  });

  if (!dbUser || !dbUser.tenant) return null;

  const isSuperAdmin =
    dbUser.role === 'super_admin' ||
    dbUser.role === 'admin' ||
    dbUser.tenant.slug === 'edulara';

  return {
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: isSuperAdmin ? 'super_admin' : dbUser.role,
    isSuperAdmin,
    homeTenantId: dbUser.tenant.id,
    homeTenantSlug: dbUser.tenant.slug,
  };
}

/**
 * Exige que a chamada venha de um Administrador Geral da plataforma B.E.M.
 */
export async function requireSuperAdmin(): Promise<CurrentUserContext> {
  const ctx = await getCurrentUserContext();
  if (!ctx || !ctx.isSuperAdmin) {
    throw new Error('Acesso negado: esta operação é exclusiva do Administrador B.E.M.');
  }
  return ctx;
}
