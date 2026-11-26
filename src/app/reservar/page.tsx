import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPatientBookingAvailability } from '@/lib/schedule-utils';
import { ReservarView } from './[patientId]/ReservarView';

export const metadata = {
  title: 'Reservar Horário — BEM',
  description: 'Selecione seu horário de atendimento nos próximos 30 dias.',
};

export default async function ReservarQueryPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; patientId?: string }>;
}) {
  const { p, patientId: pId } = await searchParams;
  const targetId = p || pId;

  if (!targetId) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] py-16 px-4 text-center max-w-md mx-auto">
        <div className="bg-white p-8 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-4">
          <h1 className="text-xl font-bold text-[#222924]">Link de Reserva Individual</h1>
          <p className="text-sm text-[#6B726B]">
            Para agendar sua sessão, utilize o link personalizado que foi enviado diretamente para o seu WhatsApp pelo seu terapeuta.
          </p>
        </div>
      </div>
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: targetId },
    include: { tenant: true },
  });

  if (!patient || !patient.tenant) {
    return notFound();
  }

  const tenant = patient.tenant;
  if (!tenant.isActive) {
    return notFound();
  }
  const availableDays = await getPatientBookingAvailability(tenant.id);

  return (
    <ReservarView
      patient={{
        id: patient.id,
        name: patient.name,
      }}
      therapist={{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl || null,
        headline: tenant.headline,
        whatsapp: tenant.whatsapp,
        consultationPrice: tenant.consultationPrice,
        address: tenant.address,
      }}
      availableDays={availableDays}
    />
  );
}
