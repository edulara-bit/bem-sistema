'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { revalidatePath } from 'next/cache';

export async function updateEmotionAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não identificado.');

  const id = formData.get('id') as string;
  const title = (formData.get('title') as string) || '';
  const code = (formData.get('code') as string) || '';
  const type = (formData.get('type') as string) || 'Negativa';
  const description = (formData.get('description') as string) || '';
  const phrases = (formData.get('phrases') as string) || null;

  await prisma.emotion.update({
    where: { id },
    data: {
      title,
      code,
      type,
      description,
      phrases,
    },
  });

  revalidatePath('/emocoes');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function createEmotionAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não identificado.');

  const title = (formData.get('title') as string) || '';
  const code = (formData.get('code') as string) || '';
  const type = (formData.get('type') as string) || 'Negativa';
  const description = (formData.get('description') as string) || '';
  const phrases = (formData.get('phrases') as string) || null;

  await prisma.emotion.create({
    data: {
      tenantId: tenant.id,
      title,
      code,
      type,
      description,
      phrases,
    },
  });

  revalidatePath('/emocoes');
  return { success: true };
}

export async function deleteEmotionAction(id: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não identificado.');

  await prisma.emotion.delete({
    where: { id },
  });

  revalidatePath('/emocoes');
  return { success: true };
}
