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
  const whatsappSend2hReminder = formData.get('whatsappSend2hReminder') === 'on';
  const whatsappReminder2hText = (formData.get('whatsappReminder2hText') as string) || '';

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
      whatsappSend2hReminder,
      whatsappReminderText,
      whatsappReminder2hText,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/agendar');
  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}

export async function createPackageAction(formData: FormData) {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  const title = (formData.get('title') as string) || 'Pacote de Sessões';
  const description = (formData.get('description') as string) || '';
  const totalSessions = parseInt((formData.get('totalSessions') as string) || '5', 10);
  const totalPrice = parseFloat((formData.get('totalPrice') as string) || '800');
  const pricePerSession = totalSessions > 0 ? Number((totalPrice / totalSessions).toFixed(2)) : totalPrice;

  await prisma.package.create({
    data: {
      tenantId: current.id,
      title,
      description,
      totalSessions,
      totalPrice,
      pricePerSession,
      active: true,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function deletePackageAction(packageId: string) {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  await prisma.package.deleteMany({
    where: {
      id: packageId,
      tenantId: current.id,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

