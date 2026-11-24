import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getAdminWeeklySchedule, getTenantWeeklyRules } from '@/lib/schedule-utils';
import { AgendaView } from './AgendaView';

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) return <div>Tenant não encontrado.</div>;

  const { week } = await searchParams;

  // Determina a Segunda-Feira da semana em visualização
  let weekStartDateStr = week;
  if (!weekStartDateStr) {
    const monday = getMonday(new Date());
    weekStartDateStr = monday.toISOString().split('T')[0];
  }

  const db = getTenantDb(tenant.id);
  const appointments = (await db.appointments.findMany()) as any[];
  const rawPatients = await db.patients.findMany();

  const patients = rawPatients.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const todayStr = new Date().toISOString().split('T')[0];
  const weeklySchedule = await getAdminWeeklySchedule(tenant.id, weekStartDateStr);
  const blockedDates = (await db.blockedDates.findMany(todayStr)) as any[];
  const weeklyRules = await getTenantWeeklyRules(tenant.id);

  return (
    <AgendaView
      appointments={appointments}
      patients={patients}
      weeklySchedule={weeklySchedule}
      blockedDates={blockedDates}
      weeklyRules={weeklyRules}
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        whatsapp: tenant.whatsapp,
        consultationPrice: tenant.consultationPrice,
      }}
    />
  );
}
