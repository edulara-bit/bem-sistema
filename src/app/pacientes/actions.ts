'use server';

import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { encryptText } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

export async function createPatientAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const name = formData.get('name') as string;
  const phone = (formData.get('phone') as string) || '';
  const email = (formData.get('email') as string) || '';
  const notes = (formData.get('notes') as string) || '';

  const db = getTenantDb(tenant.id);

  await db.patients.create({
    name,
    phoneEnc: encryptText(phone),
    emailEnc: email ? encryptText(email) : null,
    notes,
    status: 'active',
  });

  revalidatePath('/pacientes');
  revalidatePath('/agenda');
  revalidatePath('/');
  return { success: true };
}
