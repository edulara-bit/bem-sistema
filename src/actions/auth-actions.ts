'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import {
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  AuthSessionPayload,
} from '@/lib/auth';
import { ensureAiTables } from '@/lib/ai/init-db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const SESSION_COOKIE_NAME = 'bem_session';
const TENANT_COOKIE_NAME = 'bem_active_tenant';

export async function loginAction(formData: FormData) {
  await ensureAiTables();

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

  if (!user.tenant.isActive) {
    return {
      success: false,
      error:
        'Este consultório encontra-se inativo no momento. Entre em contato com a Administração B.E.M.',
    };
  }

  if (!user.isVerified || !user.passwordHash) {
    return {
      success: false,
      needsActivation: true,
      email: user.email,
      error:
        'Sua inscrição ainda não foi ativada. Valide o código recebido no seu celular para criar sua senha.',
    };
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: 'E-mail ou senha incorretos.' };
  }

  const effectiveRole =
    user.role === 'super_admin' || user.tenant.slug === 'edulara'
      ? 'super_admin'
      : user.role;

  const sessionPayload: AuthSessionPayload = {
    userId: user.id,
    tenantId: user.tenantId,
    tenantSlug: user.tenant.slug,
    name: user.name,
    email: user.email,
    role: effectiveRole,
  };

  const token = await createSessionToken(sessionPayload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set(TENANT_COOKIE_NAME, user.tenant.slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
  return { success: true, redirectUrl: '/cockpit' };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function getAuthSession(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return await verifySessionToken(token);
}
