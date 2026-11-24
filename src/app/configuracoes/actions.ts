'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { revalidatePath } from 'next/cache';
import { getOrCreateWhatsAppInstance, logoutWhatsAppInstance } from '@/lib/whatsapp';

export async function connectWhatsAppAction() {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  const res = await getOrCreateWhatsAppInstance(current.slug);
  await prisma.tenant.update({
    where: { id: current.id },
    data: {
      whatsappInstanceName: res.instanceName,
      whatsappStatus: res.status,
      whatsappQrCode: res.qrcode || null,
    },
  });

  revalidatePath('/configuracoes');
  return res;
}

export async function disconnectWhatsAppAction() {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  if (current.whatsappInstanceName) {
    await logoutWhatsAppInstance(current.whatsappInstanceName);
  }

  await prisma.tenant.update({
    where: { id: current.id },
    data: {
      whatsappStatus: 'disconnected',
      whatsappQrCode: null,
    },
  });

  revalidatePath('/configuracoes');
  return { success: true };
}

export async function updateTenantSettingsAction(formData: FormData) {
  const current = await getCurrentTenant();
  const slug = (formData.get('tenantSlug') as string) || current?.slug || 'edulara';
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error('Tenant não encontrado.');

  const name = formData.get('name') as string;
  const headline = (formData.get('headline') as string) || '';
  const bio = (formData.get('bio') as string) || '';
  const professionalReg = (formData.get('professionalReg') as string) || '';
  const consultationPrice = parseFloat((formData.get('consultationPrice') as string) || '220');
  const pixKey = (formData.get('pixKey') as string) || '';
  const pixType = (formData.get('pixType') as string) || 'email';
  const pixName = (formData.get('pixName') as string) || '';
  const meetingUrlDefault = (formData.get('meetingUrlDefault') as string) || '';
  const address = (formData.get('address') as string) || '';
  const whatsapp = (formData.get('whatsapp') as string) || '';
  const instagram = (formData.get('instagram') as string) || '';
  const whatsappAutoReminder = formData.get('whatsappAutoReminder') === 'on';
  const whatsappReminderHours = parseInt((formData.get('whatsappReminderHours') as string) || '24', 10);
  const whatsappReminderText = (formData.get('whatsappReminderText') as string) || '';

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name,
      headline,
      bio,
      professionalReg,
      consultationPrice,
      pixKey,
      pixType,
      pixName,
      meetingUrlDefault,
      address,
      whatsapp,
      instagram,
      whatsappAutoReminder,
      whatsappReminderHours,
      whatsappReminderText,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/agendar');
  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}

