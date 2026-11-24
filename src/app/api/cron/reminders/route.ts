import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { decryptText } from '@/lib/crypto';

/**
 * Endpoint de disparo automático de lembretes (chamado pelo Cron a cada 15-30 minutos).
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
    // Busca tenants com WhatsApp conectado
    const tenants = await prisma.tenant.findMany({
      where: {
        whatsappStatus: 'open',
        whatsappInstanceName: { not: null },
      },
    });

    let totalSent = 0;
    const results: any[] = [];

    for (const tenant of tenants) {
      if (!tenant.whatsappInstanceName) continue;

      // ==========================================
      // 1. LEMBRETE DE 24 HORAS ANTES
      // ==========================================
      if (tenant.whatsappAutoReminder) {
        const start24h = new Date(now.getTime() + 22 * 60 * 60 * 1000); // 22h no futuro
        const end24h = new Date(now.getTime() + 26 * 60 * 60 * 1000);   // 26h no futuro

        const appointments24h = await prisma.appointment.findMany({
          where: {
            tenantId: tenant.id,
            status: 'scheduled',
            reminderSent: false,
            scheduledAt: { gte: start24h, lte: end24h },
          },
          include: { patient: true },
        });

        for (const app of appointments24h) {
          const phone = decryptText(app.patient.phoneEnc);
          if (!phone) continue;

          const dateStr = new Date(app.scheduledAt).toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          });
          const timeStr = new Date(app.scheduledAt).toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          });
          const modalityStr = app.modality === 'online' ? 'Online' : 'Presencial';

          let msg =
            tenant.whatsappReminderText ||
            'Olá, {{paciente}}! Passando para confirmar nossa sessão de {{tipo}} amanhã, dia {{data}} às {{hora}}. Aguardo você!';

          msg = msg
            .replace(/\{\{paciente\}\}|\{paciente\}/g, app.patient.name.split(' ')[0])
            .replace(/\{\{terapeuta\}\}|\{terapeuta\}/g, tenant.name)
            .replace(/\{\{data\}\}|\{data\}/g, dateStr)
            .replace(/\{\{hora\}\}|\{\{horario\}\}|\{horario\}/g, timeStr)
            .replace(/\{\{tipo\}\}|\{\{modalidade\}\}|\{modalidade\}/g, modalityStr);

          const sendRes = await sendWhatsAppMessage(tenant.whatsappInstanceName, phone, msg);
          if (sendRes.success) {
            await prisma.appointment.update({
              where: { id: app.id },
              data: { reminderSent: true },
            });
            totalSent++;
            results.push({ patient: app.patient.name, type: '24h', time: timeStr, status: 'sent' });
          } else {
            results.push({ patient: app.patient.name, type: '24h', error: sendRes.error, status: 'failed' });
          }
        }
      }

      // ==========================================
      // 2. LEMBRETE DE 2 HORAS ANTES
      // ==========================================
      if (tenant.whatsappSend2hReminder) {
        const start2h = new Date(now.getTime() + 1 * 60 * 60 * 1000);   // 1h no futuro
        const end2h = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);   // 2h30 no futuro

        const appointments2h = await prisma.appointment.findMany({
          where: {
            tenantId: tenant.id,
            status: { in: ['scheduled', 'confirmed'] },
            reminder2hSent: false,
            scheduledAt: { gte: start2h, lte: end2h },
          },
          include: { patient: true },
        });

        for (const app of appointments2h) {
          const phone = decryptText(app.patient.phoneEnc);
          if (!phone) continue;

          const timeStr = new Date(app.scheduledAt).toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          });

          const localInstruction =
            app.modality === 'online'
              ? `Acesse a nossa sala online pelo link: ${tenant.meetingUrlDefault || 'https://meet.google.com/sua-sala'}`
              : `Nosso consultório fica no endereço: ${tenant.address || 'Consultório do Terapeuta'}`;

          let msg =
            tenant.whatsappReminder2hText ||
            'Olá, {{paciente}}! Nossa sessão começa em 2 horas (às {{hora}}). {{instrucoes_local}} Nos vemos em breve!';

          msg = msg
            .replace(/\{\{paciente\}\}|\{paciente\}/g, app.patient.name.split(' ')[0])
            .replace(/\{\{terapeuta\}\}|\{terapeuta\}/g, tenant.name)
            .replace(/\{\{hora\}\}|\{\{horario\}\}|\{horario\}/g, timeStr)
            .replace(/\{\{instrucoes_local\}\}/g, localInstruction);

          const sendRes = await sendWhatsAppMessage(tenant.whatsappInstanceName, phone, msg);
          if (sendRes.success) {
            await prisma.appointment.update({
              where: { id: app.id },
              data: { reminder2hSent: true },
            });
            totalSent++;
            results.push({ patient: app.patient.name, type: '2h', time: timeStr, status: 'sent' });
          } else {
            results.push({ patient: app.patient.name, type: '2h', error: sendRes.error, status: 'failed' });
          }
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
