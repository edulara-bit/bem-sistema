'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { revalidatePath } from 'next/cache';

export async function updateGoalsAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const monthlyIncomeGoal = parseFloat((formData.get('monthlyIncomeGoal') as string) || '10000');
  const weeklyMaxHours = parseInt((formData.get('weeklyMaxHours') as string) || '20', 10);

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      monthlyIncomeGoal,
      weeklyMaxHours,
    },
  });

  revalidatePath('/metas');
  revalidatePath('/');
  return { success: true };
}

