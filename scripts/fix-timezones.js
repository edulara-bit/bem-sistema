const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Verificando agendamentos para normalização de fuso horário ---');
  const appointments = await prisma.appointment.findMany({
    include: { patient: true }
  });

  for (const app of appointments) {
    const rawDate = new Date(app.scheduledAt);
    const utcHours = rawDate.getUTCHours();
    console.log(`Paciente: ${app.patient.name} | scheduledAt UTC: ${rawDate.toISOString()} | UTCHours: ${utcHours}`);
    
    // Se foi salvo exatamente como 15h ou 16h em UTC (que resulta em 12h ou 13h no Brasil)
    // ajustamos somando 3 horas para que no fuso -03:00 de São Paulo fique 15:00 e 16:00!
    if (utcHours === 12 || utcHours === 13 || utcHours === 15 || utcHours === 16) {
      // Se na agenda o terapeuta via 15:00 mas na lista aparecia 12:00, o UTC era 15:00 (15 - 3 = 12)
      if (utcHours === 15 || utcHours === 16) {
        const adjusted = new Date(rawDate.getTime() + 3 * 60 * 60 * 1000);
        await prisma.appointment.update({
          where: { id: app.id },
          data: { scheduledAt: adjusted }
        });
        console.log(`✅ Ajustado ${app.patient.name}: de ${rawDate.toISOString()} para ${adjusted.toISOString()} (15:00/16:00 de São Paulo)`);
      }
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
