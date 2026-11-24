import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { MetasView } from './MetasView';

export const metadata = {
  title: 'Metas & Prevenção de Burnout — BEM',
  description: 'Acompanhamento de metas financeiras e limites saudáveis de carga de trabalho terapêutica.',
};

export default async function MetasPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) return <div>Tenant não encontrado.</div>;

  const db = getTenantDb(tenant.id);

  // 1. Calcular início e fim da semana atual (Segunda a Domingo)
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + distanceToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Buscar agendamentos desta semana
  const allAppointments = (await db.appointments.findMany()) as any[];
  const weeklyAppointments = allAppointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    return d >= startOfWeek && d <= endOfWeek && a.status !== 'cancelled';
  });

  const weeklySessions = weeklyAppointments.length;
  const weeklyMinutes = weeklyAppointments.reduce((acc, curr) => acc + (curr.durationMin || 50), 0);
  const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10;

  // 2. Calcular Faturamento do Mês Atual
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const allTransactions = (await db.finances.findMany()) as any[];
  const monthlyTransactions = allTransactions.filter((t) => {
    const d = new Date(t.dueDate);
    return d >= startOfMonth && d <= endOfMonth && t.type === 'income' && t.status !== 'cancelled';
  });

  let monthlyPaid = 0;
  let monthlyPending = 0;

  for (const t of monthlyTransactions) {
    if (t.status === 'paid') {
      monthlyPaid += t.amount;
    } else if (t.status === 'pending') {
      monthlyPending += t.amount;
    }
  }

  const monthlyTotal = monthlyPaid + monthlyPending;

  return (
    <MetasView
      tenant={{
        id: tenant.id,
        name: tenant.name,
        consultationPrice: tenant.consultationPrice || 220,
        monthlyIncomeGoal: tenant.monthlyIncomeGoal || 10000,
        weeklyMaxHours: tenant.weeklyMaxHours || 20,
      }}
      stats={{
        weeklySessions,
        weeklyHours,
        monthlyPaid,
        monthlyPending,
        monthlyTotal,
      }}
    />
  );
}

