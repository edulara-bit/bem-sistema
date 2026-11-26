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

  const updateData: Record<string, any> = {};

  if (formData.has('name')) {
    const rawName = String(formData.get('name') || '').trim();
    updateData.name = rawName || tenant.name;
  }
  if (formData.has('logoUrl')) {
    const logoUrlRaw = String(formData.get('logoUrl') || '').trim();
    updateData.logoUrl = logoUrlRaw ? logoUrlRaw : null;
  }
  if (formData.has('headline')) updateData.headline = String(formData.get('headline') || '');
  if (formData.has('bio')) updateData.bio = String(formData.get('bio') || '');
  if (formData.has('professionalReg')) updateData.professionalReg = String(formData.get('professionalReg') || '');
  if (formData.has('consultationPrice')) {
    const parsed = parseFloat(String(formData.get('consultationPrice') || tenant.consultationPrice));
    if (!Number.isNaN(parsed)) updateData.consultationPrice = parsed;
  }
  if (formData.has('pixKey')) updateData.pixKey = String(formData.get('pixKey') || '');
  if (formData.has('pixType')) updateData.pixType = String(formData.get('pixType') || 'email');
  if (formData.has('pixName')) updateData.pixName = String(formData.get('pixName') || '');
  if (formData.has('meetingUrlDefault')) updateData.meetingUrlDefault = String(formData.get('meetingUrlDefault') || '');
  if (formData.has('address')) updateData.address = String(formData.get('address') || '');
  if (formData.has('whatsapp')) updateData.whatsapp = String(formData.get('whatsapp') || '');
  if (formData.has('instagram')) updateData.instagram = String(formData.get('instagram') || '');

  if (formData.has('whatsappReminderText') || formData.has('whatsappReminder2hText') || formData.has('whatsappAutoReminder') || formData.has('whatsappSend2hReminder')) {
    updateData.whatsappAutoReminder = formData.get('whatsappAutoReminder') === 'on';
    updateData.whatsappSend2hReminder = formData.get('whatsappSend2hReminder') === 'on';
    if (formData.has('whatsappReminderHours')) {
      updateData.whatsappReminderHours = parseInt(String(formData.get('whatsappReminderHours') || '24'), 10);
    }
    if (formData.has('whatsappReminderText')) {
      updateData.whatsappReminderText = String(formData.get('whatsappReminderText') || '');
    }
    if (formData.has('whatsappReminder2hText')) {
      updateData.whatsappReminder2hText = String(formData.get('whatsappReminder2hText') || '');
    }
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: updateData,
  });

  revalidatePath('/', 'layout');
  revalidatePath('/configuracoes');
  revalidatePath('/agendar');
  revalidatePath('/reservar');
  revalidatePath('/financeiro');
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

// ================= GESTÃO DE PERGUNTAS DE ANAMNESE DO CONSULTÓRIO =================

export async function createAnamnesisQuestionAction(payload: {
  question: string;
  hint?: string;
  fieldType: string;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não identificado.');

  const q = (payload.question || '').trim();
  if (!q) throw new Error('Digite o texto da pergunta de anamnese.');

  const count = await prisma.anamnesisQuestion.count({ where: { tenantId: tenant.id } });

  await prisma.anamnesisQuestion.create({
    data: {
      tenantId: tenant.id,
      question: q,
      hint: payload.hint?.trim() || null,
      fieldType: payload.fieldType || 'textarea',
      sortOrder: count + 1,
      active: true,
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function updateAnamnesisQuestionAction(payload: {
  id: string;
  question: string;
  hint?: string;
  fieldType: string;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não identificado.');

  await prisma.anamnesisQuestion.updateMany({
    where: { id: payload.id, tenantId: tenant.id },
    data: {
      question: payload.question.trim(),
      hint: payload.hint?.trim() || null,
      fieldType: payload.fieldType || 'textarea',
    },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function deleteAnamnesisQuestionAction(id: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não identificado.');

  await prisma.anamnesisQuestion.deleteMany({
    where: { id, tenantId: tenant.id },
  });

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

export async function seedStarterAnamnesisQuestionsAction() {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Consultório não identificado.');

  const starters = [
    {
      question: 'Qual o principal motivo que o trouxe para esta sessão hoje?',
      hint: 'Permita que o paciente se expresse livremente sobre suas queixas físicas e emocionais.',
      fieldType: 'textarea',
    },
    {
      question: 'Se você pudesse resumir em uma frase, qual é o problema real ou dilema que está enfrentando?',
      hint: 'Alinhado com a identificação do Problema Real / Dilema / Situação existente.',
      fieldType: 'textarea',
    },
    {
      question: 'Como você está se sentindo internamente e no corpo sobre tudo isso?',
      hint: 'Observe tensões, dores recorrentes ou sensações viscerais.',
      fieldType: 'textarea',
    },
    {
      question: 'Há quanto tempo você está vivendo essa situação?',
      hint: 'Identifique marcos na Linha do Tempo (Timeline).',
      fieldType: 'text',
    },
    {
      question: 'Faz uso de medicamentos contínuos ou acompanhamento médico atualmente?',
      hint: '',
      fieldType: 'yes_no',
    },
  ];

  const currentCount = await prisma.anamnesisQuestion.count({ where: { tenantId: tenant.id } });
  for (let i = 0; i < starters.length; i++) {
    await prisma.anamnesisQuestion.create({
      data: {
        tenantId: tenant.id,
        question: starters[i].question,
        hint: starters[i].hint || null,
        fieldType: starters[i].fieldType,
        sortOrder: currentCount + i + 1,
        active: true,
      },
    });
  }

  revalidatePath('/configuracoes');
  revalidatePath('/pacientes');
  return { success: true };
}

