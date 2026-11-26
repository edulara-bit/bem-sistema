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
      title: title.trim(),
      code: code.trim(),
      type,
      description: description.trim(),
      phrases: phrases?.trim() || null,
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
      tenantId: null,
      title: title.trim(),
      code: code.trim(),
      type,
      description: description.trim(),
      phrases: phrases?.trim() || null,
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

// ================= FREQUÊNCIAS VIBRACIONAIS B.E.M. (EXCLUSIVO ADMIN) =================

export async function createFrequencyAction(formData: FormData) {
  await requireSuperAdmin();

  const number = ((formData.get('number') as string) || '').trim();
  const title = ((formData.get('title') as string) || '').trim();
  const description = ((formData.get('description') as string) || '').trim();

  if (!number || !title || !description) {
    throw new Error('Preencha o Número, o Título e a Descrição da frequência.');
  }

  await prisma.frequency.create({
    data: {
      number,
      title,
      description,
    },
  });

  revalidatePath('/emocoes');
  revalidatePath('/pacientes');
  revalidatePath('/admin');
  return { success: true };
}

export async function updateFrequencyAction(formData: FormData) {
  await requireSuperAdmin();

  const id = formData.get('id') as string;
  const number = ((formData.get('number') as string) || '').trim();
  const title = ((formData.get('title') as string) || '').trim();
  const description = ((formData.get('description') as string) || '').trim();

  if (!id || !number || !title || !description) {
    throw new Error('Preencha o Número, o Título e a Descrição da frequência.');
  }

  await prisma.frequency.update({
    where: { id },
    data: {
      number,
      title,
      description,
    },
  });

  revalidatePath('/emocoes');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function deleteFrequencyAction(id: string) {
  await requireSuperAdmin();

  await prisma.frequency.delete({
    where: { id },
  });

  revalidatePath('/emocoes');
  revalidatePath('/pacientes');
  return { success: true };
}
