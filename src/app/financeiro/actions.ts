'use server';

import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { revalidatePath } from 'next/cache';

export async function markAsPaidAction(transactionId: string, paymentMethod = 'pix') {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const db = getTenantDb(tenant.id);
  await db.finances.markAsPaid(transactionId, paymentMethod);

  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}

export async function createTransactionAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const type = (formData.get('type') as string) || 'expense';
  const category = (formData.get('category') as string) || 'outros';
  const amount = parseFloat((formData.get('amount') as string) || '0');
  const description = (formData.get('description') as string) || '';
  const dateStr = (formData.get('dueDate') as string) || new Date().toISOString().split('T')[0];

  const db = getTenantDb(tenant.id);

  await db.finances.create({
    type,
    category,
    amount,
    dueDate: new Date(dateStr),
    status: type === 'expense' ? 'paid' : 'pending',
    paidAt: type === 'expense' ? new Date() : null,
    description,
  });

  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}

