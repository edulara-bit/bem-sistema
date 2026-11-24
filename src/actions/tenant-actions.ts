'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashPassword, createSessionToken } from '@/lib/auth';

export async function switchTenantAction(slug: string) {
  const cookieStore = await cookies();
  cookieStore.set('bem_active_tenant', slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
}

export async function registerNewTenantAction(formData: FormData) {
  const name = formData.get('name') as string;
  const rawSlug = formData.get('slug') as string;
  const therapistName = formData.get('therapistName') as string;
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = (formData.get('password') as string) || 'bem123456';
  const headline = (formData.get('headline') as string) || '';
  const consultationPrice = parseFloat((formData.get('consultationPrice') as string) || '200');
  const pixKey = (formData.get('pixKey') as string) || '';

  // Sanitiza slug
  const slug = rawSlug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 30);

  if (!slug) {
    throw new Error('Identificador (slug) inválido.');
  }

  const existing = await prisma.tenant.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new Error(`O identificador "${slug}" já está em uso por outro consultório.`);
  }

  // 1. Cria o novo Tenant isolado
  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      headline: headline || 'Psicoterapia & Acolhimento Humanizado',
      plan: 'pro',
      consultationPrice,
      pixKey,
      pixName: therapistName,
    },
  });

  // 2. Cria o usuário terapeuta do tenant com senha com hash seguro
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: therapistName,
      email,
      passwordHash: hashPassword(password),
      role: 'therapist',
    },
  });

  // 3. Define a sessão autenticada do novo consultório
  const sessionToken = await createSessionToken({
    userId: user.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set('bem_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set('bem_active_tenant', slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  revalidatePath('/', 'layout');
  redirect('/cockpit');
}

