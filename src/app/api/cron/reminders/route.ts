import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { decryptText } from '@/lib/crypto';

/**
 * Endpoint de disparo automático de lembretes (chamado pelo Cron a cada 1 hora ou pelo agendador).
 * GET /api/cron/reminders
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'bem_cron_token_secret_hostinger';

    // Validação básica do token de segurança para evitar chamadas indevidas
    if (authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(request.url);
      const queryToken = url.searchParams.get('token');
      if (queryToken !== cronSecret) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
    }

    const now = new Date();
    // Busca tenants com WhatsApp configurado e lembrete ativo
    const tenants = await prisma.tenant.findMany({
      where: {
        whatsappAutoReminder: true,
        whatsappStatus: 'open',
        whatsappInstanceName: { not: null },
      },
    });

    let totalSent = 0;
    const results: any[] = [];

    for (const tenant of tenants) {
      if (!tenant.whatsappInstanceName) continue;

      // Define janela de tempo com base na antecedência configurada (ex: 24h ou 2h)
      const hoursAhead = tenant.whatsappReminderHours || 24;
      const targetStart = new Date(now.getTime() + (hoursAhead - 1) * 60 * 60 * 1000);
      const targetEnd = new Date(now.getTime() + (hoursAhead + 2) * 60 * 60 * 1000);

      // Busca sessões agendadas nessa janela que ainda não receberam lembrete
      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId: tenant.id,
          status: 'scheduled',
          reminderSent: false,
          scheduledAt: {
            gte: targetStart,
            lte: targetEnd,
          },
        },
        include: {
          patient: true,
        },
      });

      for (const app of appointments) {
        const phone = decryptText(app.patient.phoneEnc);
        if (!phone) continue;

        const dateStr = new Date(app.scheduledAt).toLocaleDateString('pt-BR');
        const timeStr = new Date(app.scheduledAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const modalityStr = app.modality === 'online' ? 'Online (Google Meet)' : 'Presencial no Consultório';

        // Monta a mensagem personalizada
        let msg =
          tenant.whatsappReminderText ||
          'Olá {paciente}! Lembramos da sua sessão de Bioenergética com {terapeuta} marcada para {data} às {horario} ({modalidade}). Caso precise reagendar, avise por aqui com antecedência. Até breve!';

        msg = msg
          .replace('{paciente}', app.patient.name.split(' ')[0])
          .replace('{terapeuta}', tenant.name)
          .replace('{data}', dateStr)
          .replace('{horario}', timeStr)
          .replace('{modalidade}', modalityStr);

        // Se for online e tiver link padrão, anexa o link
        if (app.modality === 'online' && tenant.meetingUrlDefault) {
          msg += `\n\nLink da sala: ${tenant.meetingUrlDefault}`;
        }

        const sendRes = await sendWhatsAppMessage(tenant.whatsappInstanceName, phone, msg);

        if (sendRes.success) {
          await prisma.appointment.update({
            where: { id: app.id },
            data: { reminderSent: true },
          });
          totalSent++;
          results.push({ patient: app.patient.name, time: timeStr, status: 'sent' });
        } else {
          results.push({ patient: app.patient.name, error: sendRes.error, status: 'failed' });
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      totalSent,
      details: results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
