import { getCurrentTenant } from '@/lib/current-tenant';
import { prisma } from '@/lib/prisma';
import { ConfiguracoesView } from './ConfiguracoesView';

export const metadata = {
  title: 'Configurações do Consultório — BEM',
  description: 'Gerencie seu perfil de terapeuta, chave Pix, valores e página pública.',
};

export default async function ConfiguracoesPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) return <div>Tenant não encontrado.</div>;

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/agendar?slug=${tenant.slug}`;

  const packages = await prisma.package.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <ConfiguracoesView
      tenant={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        headline: tenant.headline,
        bio: tenant.bio,
        whatsapp: tenant.whatsapp,
        instagram: tenant.instagram,
        consultationPrice: tenant.consultationPrice,
        pixKey: tenant.pixKey,
        pixType: tenant.pixType,
        pixName: tenant.pixName,
        professionalReg: tenant.professionalReg,
        meetingUrlDefault: tenant.meetingUrlDefault,
        address: tenant.address,
        whatsappInstanceName: tenant.whatsappInstanceName,
        whatsappStatus: tenant.whatsappStatus,
        whatsappQrCode: tenant.whatsappQrCode,
        whatsappAutoReminder: tenant.whatsappAutoReminder,
        whatsappReminderHours: tenant.whatsappReminderHours,
        whatsappSend2hReminder: tenant.whatsappSend2hReminder,
        whatsappReminderText: tenant.whatsappReminderText,
        whatsappReminder2hText: tenant.whatsappReminder2hText,
      }}
      packages={packages}
      publicUrl={publicUrl}
    />
  );
}

