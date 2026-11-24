'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, verifySessionToken, AuthSessionPayload } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'bem_session';
const TENANT_COOKIE_NAME = 'bem_active_tenant';

/**
 * Autentica o usuário pelo email e senha e estabelece a sessão do consultório.
 */
export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Por favor, informe seu e-mail e senha.' };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user || !user.tenant) {
    return { success: false, error: 'E-mail ou senha incorretos.' };
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'E-mail ou senha incorretos.' };
  }

  // Gera o token de sessão JWT
  const sessionPayload: AuthSessionPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenant.slug,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const token = await createSessionToken(sessionPayload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });

  // Vincula o tenant ativo ao do usuário autenticado
  cookieStore.set(TENANT_COOKIE_NAME, user.tenant.slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
  return { success: true, redirectUrl: '/cockpit' };
}

/**
 * Encerra a sessão atual e redireciona para a tela de login.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Obtém a sessão autenticada do usuário atual, se existir.
 */
export async function getAuthSession(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return await verifySessionToken(token);
}
