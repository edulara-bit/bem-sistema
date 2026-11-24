'use server';

import { prisma, getTenantDb } from '@/lib/prisma';
import { encryptText } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

export async function submitBookingLeadAction(formData: FormData) {
  const slug = (formData.get('tenantSlug') as string) || 'edulara';
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error('Terapeuta não encontrado.');

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const email = (formData.get('email') as string) || '';
  const demand = formData.get('demand') as string;
  const preferredTime = (formData.get('preferredTime') as string) || 'tarde';
  const modality = (formData.get('modality') as string) || 'online';

  const db = getTenantDb(tenant.id);

  const lead = await db.leads.create({
    name,
    phoneEnc: encryptText(phone),
    emailEnc: email ? encryptText(email) : null,
    demand,
    preferredTime,
    modality,
    stage: 'new_lead',
    source: 'pagina_publica',
  });

  revalidatePath('/captacao');
  revalidatePath('/');
  return { success: true, leadId: lead.id, therapistName: tenant.name, phoneRaw: phone };
}

