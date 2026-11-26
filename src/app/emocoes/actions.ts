'use server';

import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin-guard';
import { revalidatePath } from 'next/cache';

export async function updateEmotionAction(formData: FormData) {
  await requireSuperAdmin();

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
  await requireSuperAdmin();

  const title = (formData.get('title') as string) || '';
  const code = (formData.get('code') as string) || '';
  const type = (formData.get('type') as string) || 'Negativa';
  const description = (formData.get('description') as string) || '';
  const phrases = (formData.get('phrases') as string) || null;

  await prisma.emotion.create({
    data: {
      tenantId: null, // Catálogo oficial global mantido exclusivamente pelo Admin
      title,
      code,
      type,
      description,
      phrases,
    },
  });

  revalidatePath('/emocoes');
  revalidatePath('/admin');
  return { success: true };
}

export async function deleteEmotionAction(id: string) {
  await requireSuperAdmin();

  await prisma.emotion.delete({
    where: { id },
  });

  revalidatePath('/emocoes');
  revalidatePath('/admin');
  return { success: true };
}
