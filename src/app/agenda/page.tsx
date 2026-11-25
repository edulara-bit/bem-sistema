import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getAdminWeeklySchedule, getTenantWeeklyRules, formatAppointmentDateTime } from '@/lib/schedule-utils';
import { AgendaView } from './AgendaView';

function getMondayOfBrazilDate(dateInput = new Date()) {
  const { dateStr } = formatAppointmentDateTime(dateInput);
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const day = date.getUTCDay(); // 0 = Domingo, 1 = Segunda...
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(y, m - 1, diff, 12, 0, 0));
  return monday.toISOString().split('T')[0];
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
    weekStartDateStr = getMondayOfBrazilDate(new Date());
  }

  const db = getTenantDb(tenant.id);
  const appointments = (await db.appointments.findMany()) as any[];
  const rawPatients = await db.patients.findMany();

  const patients = rawPatients.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const { dateStr: todayStr } = formatAppointmentDateTime(new Date());
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
