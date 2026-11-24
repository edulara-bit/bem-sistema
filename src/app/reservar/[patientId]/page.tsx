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
        headline: tenant.headline,
        whatsapp: tenant.whatsapp,
        consultationPrice: tenant.consultationPrice,
        address: tenant.address,
      }}
      availableDays={availableDays}
    />
  );
}
