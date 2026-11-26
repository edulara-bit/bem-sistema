'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/admin-guard';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

async function resolveMasterWhatsAppInstance(): Promise<string> {
  const masterTenant = await prisma.tenant.findFirst({
    where: { OR: [{ slug: 'edulara' }, { whatsappStatus: 'open' }] },
    orderBy: { createdAt: 'asc' },
  });
  return masterTenant?.whatsappInstanceName || 'bem_edulara';
}

export async function createTherapistInviteAction(payload: {
  therapistName: string;
  email: string;
  phone: string;
  clinicName: string;
  slug: string;
  professionalReg?: string;
  headline?: string;
  consultationPrice?: number;
  aiAgentsEnabled: boolean;
}) {
  try {
    await requireSuperAdmin();

    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanPhone = payload.phone.replace(/\D/g, '');
    const cleanSlug = payload.slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 32);

    if (!payload.therapistName.trim() || !payload.clinicName.trim()) {
      return { success: false, error: 'Informe o nome do terapeuta e o nome do consultório.' };
    }
    if (!cleanEmail.includes('@')) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }
    if (cleanPhone.length < 10) {
      return {
        success: false,
        error: 'Informe um número de celular válido com DDD para envio do código.',
      };
    }
    if (!cleanSlug) {
      return { success: false, error: 'Identificador (slug) inválido.' };
    }

    const [existingSlug, existingEmail] = await Promise.all([
      prisma.tenant.findUnique({ where: { slug: cleanSlug } }),
      prisma.user.findUnique({ where: { email: cleanEmail } }),
    ]);

    if (existingSlug) {
      return {
        success: false,
        error: `O identificador "${cleanSlug}" já está sendo usado por outro consultório.`,
      };
    }
    if (existingEmail) {
      return {
        success: false,
        error: `O e-mail "${cleanEmail}" já possui cadastro na plataforma.`,
      };
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

    const createdTenant = await prisma.tenant.create({
      data: {
        name: payload.clinicName.trim(),
        slug: cleanSlug,
        plan: 'pro',
        isActive: true,
        aiAgentsEnabled: Boolean(payload.aiAgentsEnabled),
        headline: payload.headline?.trim() || 'Terapia Integrativa & Autoconsciência B.E.M.',
        professionalReg: payload.professionalReg?.trim() || null,
        whatsapp: payload.phone.trim(),
        consultationPrice: Number(payload.consultationPrice) || 220,
        pixName: payload.therapistName.trim(),
      },
    });

    await prisma.user.create({
      data: {
        tenantId: createdTenant.id,
        name: payload.therapistName.trim(),
        email: cleanEmail,
        phone: payload.phone.trim(),
        passwordHash: '', // Definida pelo terapeuta somente após validar o código
        role: 'therapist',
        isVerified: false,
        verificationCode: code,
        verificationExpiresAt: expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bem.edulara.com.br';
    const activationLink = `${appUrl}/cadastro?email=${encodeURIComponent(cleanEmail)}`;
    const firstName = payload.therapistName.trim().split(/\s+/)[0];

    const message = `Olá, *${firstName}*! 🌿\n\nSeu espaço terapêutico (*${payload.clinicName.trim()}*) foi credenciado pela Administração na Plataforma *B.E.M.*\n\n🔐 *Seu Código de Validação:* *${code}*\n\nAcesse o link abaixo, informe este código e crie sua senha pessoal de acesso:\n👉 ${activationLink}`;

    const instanceName = await resolveMasterWhatsAppInstance();
    const waRes = await sendWhatsAppMessage(instanceName, cleanPhone, message);

    revalidatePath('/admin');
    revalidatePath('/', 'layout');

    return {
      success: true,
      whatsappSent: waRes.success,
      whatsappError: waRes.error || null,
      verificationCode: code,
      activationLink,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao cadastrar novo terapeuta.' };
  }
}

export async function resendTherapistCodeAction(userId: string) {
  try {
    await requireSuperAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.tenant) {
      return { success: false, error: 'Terapeuta não encontrado.' };
    }

    const phone = (user.phone || user.tenant.whatsapp || '').replace(/\D/g, '');
    if (phone.length < 10) {
      return {
        success: false,
        error: 'Este terapeuta não possui número de celular válido cadastrado.',
      };
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        verificationExpiresAt: expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bem.edulara.com.br';
    const activationLink = `${appUrl}/cadastro?email=${encodeURIComponent(user.email)}`;
    const firstName = user.name.trim().split(/\s+/)[0];

    const message = `Olá, *${firstName}*! 🌿\n\nSegue seu novo código de validação para ativar ou redefinir sua senha na Plataforma *B.E.M.*:\n\n🔐 *Código:* *${code}*\n\n👉 Validar e criar senha: ${activationLink}`;

    const instanceName = await resolveMasterWhatsAppInstance();
    const waRes = await sendWhatsAppMessage(instanceName, phone, message);

    revalidatePath('/admin');
    return {
      success: true,
      whatsappSent: waRes.success,
      whatsappError: waRes.error || null,
      verificationCode: code,
      activationLink,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao reenviar código.' };
  }
}

export async function toggleTenantAiAccessAction(tenantId: string, aiAgentsEnabled: boolean) {
  try {
    await requireSuperAdmin();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { aiAgentsEnabled },
    });
    revalidatePath('/admin');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar permissão de IA.' };
  }
}

export async function toggleTenantActiveStatusAction(tenantId: string, isActive: boolean) {
  try {
    const admin = await requireSuperAdmin();
    const target = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!target) {
      return { success: false, error: 'Consultório não encontrado.' };
    }

    if (!isActive && (target.slug === 'edulara' || target.id === admin.homeTenantId)) {
      return {
        success: false,
        error: 'Não é permitido inativar o consultório principal da Administração.',
      };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    });

    revalidatePath('/admin');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar status do consultório.' };
  }
}

// ================= GESTÃO DE CATEGORIAS E SUBCATEGORIAS DE PROTOCOLOS B.E.M. =================

export async function createProtocolNodeAction(payload: {
  title: string;
  parentId?: string | null;
}) {
  try {
    await requireSuperAdmin();
    const title = (payload.title || '').trim();
    if (!title) {
      return { success: false, error: 'Informe o título da categoria ou subcategoria.' };
    }

    const parentId = payload.parentId || null;
    const siblingCount = await prisma.protocolNode.count({
      where: { parentId },
    });

    const node = await prisma.protocolNode.create({
      data: {
        title,
        parentId,
        sortOrder: siblingCount + 1,
      },
    });

    revalidatePath('/admin');
    revalidatePath('/pacientes');
    return { success: true, node };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao incluir item.' };
  }
}

export async function updateProtocolNodeAction(payload: {
  id: string;
  title: string;
  sortOrder?: number;
}) {
  try {
    await requireSuperAdmin();
    const title = (payload.title || '').trim();
    if (!payload.id || !title) {
      return { success: false, error: 'Informe o novo título.' };
    }

    await prisma.protocolNode.update({
      where: { id: payload.id },
      data: {
        title,
        ...(typeof payload.sortOrder === 'number' ? { sortOrder: payload.sortOrder } : {}),
      },
    });

    revalidatePath('/admin');
    revalidatePath('/pacientes');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar item.' };
  }
}

export async function deleteProtocolNodeAction(id: string) {
  try {
    await requireSuperAdmin();
    if (!id) return { success: false, error: 'ID inválido.' };

    // Remove recursivamente descendentes (garantia extra além do ON DELETE CASCADE)
    const allNodes = await prisma.protocolNode.findMany({
      select: { id: true, parentId: true },
    });
    const toDelete = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const n of allNodes) {
        if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
          toDelete.add(n.id);
          added = true;
        }
      }
    }

    await prisma.protocolNode.deleteMany({
      where: { id: { in: Array.from(toDelete) } },
    });

    revalidatePath('/admin');
    revalidatePath('/pacientes');
    return { success: true, deletedCount: toDelete.size };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir item.' };
  }
}

export async function deduplicateEmotionsNowAction() {
  try {
    await requireSuperAdmin();
    const allEmos = await prisma.emotion.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    const seen = new Set<string>();
    const dupIds: string[] = [];
    for (const emo of allEmos) {
      const key = `${emo.title.trim().toLowerCase()}|${(emo.type || '').trim().toLowerCase()}`;
      if (seen.has(key)) {
        dupIds.push(emo.id);
      } else {
        seen.add(key);
      }
    }

    if (dupIds.length > 0) {
      await prisma.emotion.deleteMany({ where: { id: { in: dupIds } } });
    }

    revalidatePath('/emocoes');
    revalidatePath('/admin');
    revalidatePath('/pacientes');
    return { success: true, removed: dupIds.length };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao remover duplicidades.' };
  }
}
