import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { decryptText } from '@/lib/crypto';
import { PatientsView } from './PatientsView';

export default async function PatientsPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) return <div>Tenant não encontrado.</div>;

  const db = getTenantDb(tenant.id);
  const rawPatients = (await db.patients.findMany({
    include: {
      appointments: true,
      records: true,
    },
    orderBy: { name: 'asc' },
  })) as any[];

  const patients = rawPatients.map((p) => ({
    id: p.id,
    name: p.name,
    phone: decryptText(p.phoneEnc),
    email: p.emailEnc ? decryptText(p.emailEnc) : '',
    status: p.status,
    notes: p.notes,
    totalAppointments: p.appointments.length,
    totalRecords: p.records.length,
  }));

  return <PatientsView patients={patients} />;
}
