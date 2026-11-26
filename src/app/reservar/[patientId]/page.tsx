import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPatientBookingAvailability } from '@/lib/schedule-utils';
import { ReservarView } from './ReservarView';

export const metadata = {
  title: 'Reservar Horário — BEM',
  description: 'Selecione seu horário de atendimento nos próximos 30 dias com comodidade e confirmação instantânea.',
};

export default async function ReservarPatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  if (!patientId) return notFound();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { tenant: true },
  });

  if (!patient || !patient.tenant) {
    return notFound();
  }

  const tenant = patient.tenant;
  if (!tenant.isActive) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-2">
          <h1 className="text-lg font-bold text-[#222924]">Agenda Temporariamente Indisponível</h1>
          <p className="text-xs text-[#6B726B]">
            Entre em contato diretamente com o seu terapeuta para informações sobre horários.
          </p>
        </div>
      </div>
    );
  }
  const availableDays = await getPatientBookingAvailability(tenant.id);

  return (
    <ReservarView
      patient={{
        id: patient.id,
        name: patient.name,
        modalityPreference: patient.modalityPreference || 'online',
        sessionTypePreference: patient.sessionTypePreference || 'regular',
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
