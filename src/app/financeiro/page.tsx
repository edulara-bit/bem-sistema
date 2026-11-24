import { getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { FinanceiroView } from './FinanceiroView';

export default async function FinanceiroPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) return <div>Tenant não encontrado.</div>;

  const db = getTenantDb(tenant.id);
  const summary = await db.finances.findSummary();
  const transactions = await db.finances.findMany();

  return (
    <FinanceiroView
      summary={summary}
      transactions={transactions}
      pixInfo={{
        pixKey: tenant.pixKey || 'terapeuta@edulara.com.br',
        pixName: tenant.pixName || tenant.name,
      }}
    />
  );
}
