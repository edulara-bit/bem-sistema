'use server';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken } from '@/lib/auth';
import { requireSuperAdmin } from '@/lib/admin-guard';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

/**
 * Alternância de consultório no topo — restrita exclusivamente ao Super Admin.
 */
export async function switchTenantAction(slug: string) {
  await requireSuperAdmin();

  const cookieStore = await cookies();
  cookieStore.set('bem_active_tenant', slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
}

/**
 * Valida o código de 6 dígitos enviado ao celular do terapeuta credenciado pelo Admin e define sua senha.
 */
export async function verifyTherapistCodeAndSetPasswordAction(payload: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}) {
  const cleanEmail = (payload.email || '').trim().toLowerCase();
  const cleanCode = (payload.code || '').replace(/\D/g, '').trim();
  const password = payload.password || '';

  if (!cleanEmail || !cleanCode) {
    return {
      success: false,
      error: 'Informe seu e-mail cadastrado e o código de 6 dígitos recebido no celular.',
    };
  }

  if (password.length < 6) {
    return { success: false, error: 'Sua nova senha deve ter pelo menos 6 caracteres.' };
  }

  if (password !== payload.confirmPassword) {
    return { success: false, error: 'A confirmação de senha não confere.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: { tenant: true },
  });

  if (!user || !user.tenant) {
    return {
      success: false,
      error:
        'E-mail não localizado. O cadastro de terapeutas é exclusivo mediante credenciamento prévio pela Administração B.E.M.',
    };
  }

  if (!user.tenant.isActive) {
    return {
      success: false,
      error: 'Este consultório encontra-se inativo. Entre em contato com a Administração B.E.M.',
    };
  }

  if (!user.verificationCode || user.verificationCode !== cleanCode) {
    return {
      success: false,
      error: 'Código de validação inválido. Confira os 6 dígitos enviados ao seu celular.',
    };
  }

  if (user.verificationExpiresAt && new Date() > new Date(user.verificationExpiresAt)) {
    return {
      success: false,
      error: 'Este código expirou. Clique em "Reenviar código no meu celular" abaixo.',
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password),
      isVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
    },
  });

  const sessionToken = await createSessionToken({
    userId: updatedUser.id,
    tenantId: user.tenant.id,
    tenantSlug: user.tenant.slug,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
  });

  const cookieStore = await cookies();
  cookieStore.set('bem_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set('bem_active_tenant', user.tenant.slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
  return { success: true, redirectUrl: '/cockpit' };
}

/**
 * Permite que um terapeuta já cadastrado pelo Admin solicite reenvio do código para o celular registrado.
 */
export async function requestNewCodeSelfServiceAction(email: string) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail.includes('@')) {
    return { success: false, error: 'Informe o e-mail cadastrado pela administração.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: { tenant: true },
  });

  if (!user || !user.tenant) {
    return {
      success: false,
      error:
        'E-mail não encontrado. Solicite seu credenciamento ao Administrador da Plataforma B.E.M.',
    };
  }

  if (!user.tenant.isActive) {
    return { success: false, error: 'Este consultório encontra-se inativo.' };
  }

  const rawPhone = (user.phone || user.tenant.whatsapp || '').replace(/\D/g, '');
  if (rawPhone.length < 10) {
    return {
      success: false,
      error: 'Nenhum celular vinculado ao seu cadastro. Solicite apoio ao Administrador.',
    };
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCode: code,
      verificationExpiresAt: expiresAt,
    },
  });

  const masterTenant = await prisma.tenant.findFirst({
    where: { OR: [{ slug: 'edulara' }, { whatsappStatus: 'open' }] },
    orderBy: { createdAt: 'asc' },
  });
  const instanceName = masterTenant?.whatsappInstanceName || 'bem_edulara';
  const firstName = user.name.trim().split(/\s+/)[0];

  const waRes = await sendWhatsAppMessage(
    instanceName,
    rawPhone,
    `Olá, *${firstName}*! 🌿\n\nSeu código de validação na Plataforma *B.E.M.* é:\n\n🔐 *${code}*`
  );

  if (!waRes.success) {
    return {
      success: false,
      error: 'Não foi possível entregar via WhatsApp agora. Peça o código diretamente ao Administrador.',
    };
  }

  const masked = `(**) *****-${rawPhone.slice(-4)}`;
  return {
    success: true,
    maskedPhone: masked,
  };
}
