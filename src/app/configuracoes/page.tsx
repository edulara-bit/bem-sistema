import { getCurrentTenant } from '@/lib/current-tenant';
import { prisma } from '@/lib/prisma';
import { ConfiguracoesView } from './ConfiguracoesView';
import { getLiveWhatsAppState } from '@/lib/whatsapp';

export const metadata = {
  title: 'Configurações do Consultório — BEM',
  description: 'Gerencie seu perfil de terapeuta, chave Pix, valores e página pública.',
};

export default async function ConfiguracoesPage() {
  const tenant = await getCurrentTenant();

  if (!tenant) return <div>Tenant não encontrado.</div>;

  const instanceName = tenant.whatsappInstanceName || `bem_${tenant.slug.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  let liveWhatsappStatus = tenant.whatsappStatus || 'disconnected';
  try {
    const live = await getLiveWhatsAppState(instanceName);
    liveWhatsappStatus = live.state;
  } catch {
    // mantem fallback
  }

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
        whatsappInstanceName: instanceName,
        whatsappStatus: liveWhatsappStatus,
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

