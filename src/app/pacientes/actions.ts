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
  const modalityPreference = (formData.get('modalityPreference') as string) || 'online';
  const sessionTypePreference = (formData.get('sessionTypePreference') as string) || 'regular';
  const packageId = (formData.get('packageId') as string) || null;
  const packageTotalSessions = parseInt((formData.get('packageTotalSessions') as string) || '0', 10);

  const db = getTenantDb(tenant.id);

  await db.patients.create({
    name,
    phoneEnc: encryptText(phone),
    emailEnc: email ? encryptText(email) : null,
    notes,
    modalityPreference,
    sessionTypePreference,
    packageId: packageId || undefined,
    packageTotalSessions,
    packageUsedSessions: 0,
    status: 'active',
  });

  revalidatePath('/pacientes');
  revalidatePath('/agenda');
  revalidatePath('/');
  return { success: true };
}

export async function updatePatientAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const phone = (formData.get('phone') as string) || '';
  const email = (formData.get('email') as string) || '';
  const notes = (formData.get('notes') as string) || '';
  const modalityPreference = (formData.get('modalityPreference') as string) || 'online';
  const sessionTypePreference = (formData.get('sessionTypePreference') as string) || 'regular';
  const packageId = (formData.get('packageId') as string) || null;
  const packageTotalSessions = parseInt((formData.get('packageTotalSessions') as string) || '0', 10);
  const packageUsedSessions = parseInt((formData.get('packageUsedSessions') as string) || '0', 10);

  const db = getTenantDb(tenant.id);

  await db.patients.update(id, {
    name,
    phoneEnc: encryptText(phone),
    emailEnc: email ? encryptText(email) : null,
    notes,
    modalityPreference,
    sessionTypePreference,
    packageId: packageId || undefined,
    packageTotalSessions,
    packageUsedSessions,
  });

  revalidatePath('/pacientes');
  revalidatePath('/agenda');
  revalidatePath('/');
  return { success: true };
}
