'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { revalidatePath } from 'next/cache';

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
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/agendar');
  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}

