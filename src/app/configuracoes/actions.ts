'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { revalidatePath } from 'next/cache';
import { 
  getOrCreateWhatsAppInstance, 
  logoutWhatsAppInstance, 
  sendWhatsAppMessage,
  getLiveWhatsAppState 
} from '@/lib/whatsapp';
import { decryptText } from '@/lib/crypto';

export async function connectWhatsAppAction() {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  const res = await getOrCreateWhatsAppInstance(current.slug);
  await prisma.tenant.update({
    where: { id: current.id },
    data: {
      whatsappInstanceName: res.instanceName,
      whatsappStatus: res.status,
      whatsappQrCode: res.qrcode || null,
    },
  });

  revalidatePath('/configuracoes');
  return res;
}

export async function disconnectWhatsAppAction() {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  if (current.whatsappInstanceName) {
    await logoutWhatsAppInstance(current.whatsappInstanceName);
  }

  await prisma.tenant.update({
    where: { id: current.id },
    data: {
      whatsappStatus: 'disconnected',
      whatsappQrCode: null,
    },
  });

  revalidatePath('/configuracoes');
  return { success: true };
}

export async function updateTenantSettingsAction(formData: FormData) {
  const current = await getCurrentTenant();
  const slug = (formData.get('tenantSlug') as string) || current?.slug || 'edulara';
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new Error('Tenant não encontrado.');

  const name = formData.get('name') as string;
  const headline = (formData.get('headline') as string) || '';
  const bio = (formData.get('bio') as string) || '';
  const professionalReg = (formData.get('professionalReg') as string) || '';
  const consultationPrice = parseFloat((formData.get('consultationPrice') as string) || '220');
  const pixKey = (formData.get('pixKey') as string) || '';
  const pixType = (formData.get('pixType') as string) || 'email';
  const pixName = (formData.get('pixName') as string) || '';
  const meetingUrlDefault = (formData.get('meetingUrlDefault') as string) || '';
  const address = (formData.get('address') as string) || '';
  const whatsapp = (formData.get('whatsapp') as string) || '';
  const instagram = (formData.get('instagram') as string) || '';
  const whatsappAutoReminder = formData.get('whatsappAutoReminder') === 'on';
  const whatsappReminderHours = parseInt((formData.get('whatsappReminderHours') as string) || '24', 10);
  const whatsappReminderText = (formData.get('whatsappReminderText') as string) || '';
  const whatsappSend2hReminder = formData.get('whatsappSend2hReminder') === 'on';
  const whatsappReminder2hText = (formData.get('whatsappReminder2hText') as string) || '';

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name,
      headline,
      bio,
      professionalReg,
      consultationPrice,
      pixKey,
      pixType,
      pixName,
      meetingUrlDefault,
      address,
      whatsapp,
      instagram,
      whatsappAutoReminder,
      whatsappReminderHours,
      whatsappSend2hReminder,
      whatsappReminderText,
      whatsappReminder2hText,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/agendar');
  revalidatePath('/financeiro');
  revalidatePath('/');
  return { success: true };
}

export async function createPackageAction(formData: FormData) {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  const title = (formData.get('title') as string) || 'Pacote de Sessões';
  const description = (formData.get('description') as string) || '';
  const totalSessions = parseInt((formData.get('totalSessions') as string) || '5', 10);
  const totalPrice = parseFloat((formData.get('totalPrice') as string) || '800');
  const pricePerSession = totalSessions > 0 ? Number((totalPrice / totalSessions).toFixed(2)) : totalPrice;

  await prisma.package.create({
    data: {
      tenantId: current.id,
      title,
      description,
      totalSessions,
      totalPrice,
      pricePerSession,
      active: true,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function deletePackageAction(packageId: string) {
  const current = await getCurrentTenant();
  if (!current) throw new Error('Consultório não identificado.');

  await prisma.package.deleteMany({
    where: {
      id: packageId,
      tenantId: current.id,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

/**
 * Disparo manual imediato dos lembretes pendentes de hoje (24h e 2h antes)
 */
export async function triggerManualRemindersAction() {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  if (!tenant.whatsappInstanceName) {
    throw new Error('WhatsApp não está configurado para este consultório.');
  }

  const now = new Date();
  const results: any[] = [];
  let totalSent = 0;

  // 1. Lembrete 24h
  if (tenant.whatsappAutoReminder) {
    const start24h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const end24h = new Date(now.getTime() + 28 * 60 * 60 * 1000);

    const appointments24h = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['scheduled', 'confirmed'] },
        reminderSent: false,
        scheduledAt: { gte: start24h, lte: end24h },
      },
      include: { patient: true },
    });

    for (const app of appointments24h) {
      const phone = decryptText(app.patient.phoneEnc);
      if (!phone) continue;

      const dateStr = new Date(app.scheduledAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const timeStr = new Date(app.scheduledAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const modalityStr = app.modality === 'online' ? 'Online' : 'Presencial';

      let msg = tenant.whatsappReminderText || 'Olá, {{paciente}}! Passando para confirmar nossa sessão de {{tipo}} amanhã, dia {{data}} às {{hora}}. Aguardo você!';
      msg = msg
        .replace(/\{\{paciente\}\}|\{paciente\}/g, app.patient.name.split(' ')[0])
        .replace(/\{\{terapeuta\}\}|\{terapeuta\}/g, tenant.name)
        .replace(/\{\{data\}\}|\{data\}/g, dateStr)
        .replace(/\{\{hora\}\}|\{\{horario\}\}|\{horario\}/g, timeStr)
        .replace(/\{\{tipo\}\}|\{\{modalidade\}\}|\{modalidade\}/g, modalityStr);

      const sendRes = await sendWhatsAppMessage(tenant.whatsappInstanceName, phone, msg);
      if (sendRes.success) {
        await prisma.appointment.update({ where: { id: app.id }, data: { reminderSent: true } });
        totalSent++;
        results.push({ patient: app.patient.name, phone, type: '24 horas antes', time: `${dateStr} às ${timeStr}`, status: 'sent' });
      } else {
        results.push({ patient: app.patient.name, phone, type: '24 horas antes', time: `${dateStr} às ${timeStr}`, error: sendRes.error, status: 'failed' });
      }
    }
  }

  // 2. Lembrete 2h
  if (tenant.whatsappSend2hReminder) {
    const end2h = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

    const appointments2h = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['scheduled', 'confirmed'] },
        reminder2hSent: false,
        scheduledAt: { gte: now, lte: end2h },
      },
      include: { patient: true },
    });

    for (const app of appointments2h) {
      const phone = decryptText(app.patient.phoneEnc);
      if (!phone) continue;

      const timeStr = new Date(app.scheduledAt).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
      const localInstruction = app.modality === 'online'
        ? `Acesse a nossa sala online pelo link: ${tenant.meetingUrlDefault || 'https://meet.google.com/sua-sala'}`
        : `Nosso consultório fica no endereço: ${tenant.address || 'Consultório do Terapeuta'}`;

      let msg = tenant.whatsappReminder2hText || 'Olá, {{paciente}}! Nossa sessão começa em 2 horas (às {{hora}}). {{instrucoes_local}} Nos vemos em breve!';
      msg = msg
        .replace(/\{\{paciente\}\}|\{paciente\}/g, app.patient.name.split(' ')[0])
        .replace(/\{\{terapeuta\}\}|\{terapeuta\}/g, tenant.name)
        .replace(/\{\{hora\}\}|\{\{horario\}\}|\{horario\}/g, timeStr)
        .replace(/\{\{instrucoes_local\}\}/g, localInstruction);

      const sendRes = await sendWhatsAppMessage(tenant.whatsappInstanceName, phone, msg);
      if (sendRes.success) {
        await prisma.appointment.update({ where: { id: app.id }, data: { reminder2hSent: true } });
        totalSent++;
        results.push({ patient: app.patient.name, phone, type: '2 horas antes', time: `Hoje às ${timeStr}`, status: 'sent' });
      } else {
        results.push({ patient: app.patient.name, phone, type: '2 horas antes', time: `Hoje às ${timeStr}`, error: sendRes.error, status: 'failed' });
      }
    }
  }

  revalidatePath('/agenda');
  revalidatePath('/configuracoes');

  return { success: true, totalSent, results };
}

/**
 * Envia uma mensagem de teste no WhatsApp fornecido
 */
export async function sendTestWhatsAppMessageAction(targetPhone: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const instanceName = tenant.whatsappInstanceName || `bem_${tenant.slug.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

  // 1. Verifica estado de conexão ao vivo na Evolution API
  const live = await getLiveWhatsAppState(instanceName);
  if (live.state !== 'open') {
    return {
      success: false,
      error: `A instância do WhatsApp (${instanceName}) está no estado "${live.state}" na Evolution API (não conectada). Por favor, clique em "Conectar Celular" acima e leia o QR Code com seu WhatsApp.`,
    };
  }

  const phone = targetPhone.trim() || tenant.whatsapp;
  if (!phone) {
    throw new Error('Informe um número de telefone com DDD para teste.');
  }

  const testMsg = `🧪 *Teste de Conexão - BEM Terapeuta*\n\nOlá, ${tenant.name}! Sua integração com o WhatsApp está ativa e funcionando perfeitamente.\n\nOs lembretes automáticos de 24h e 2h antes serão enviados pontualmente aos seus pacientes.`;

  const res = await sendWhatsAppMessage(instanceName, phone, testMsg);
  return res;
}

