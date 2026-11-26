import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';

export async function POST(req: NextRequest) {
  try {
    const current = await getCurrentTenant();
    if (!current) {
      return NextResponse.json(
        { error: 'Sessão expirada ou consultório não identificado. Faça login novamente.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const tenant = current;

    const updateData: Record<string, any> = {};

    if (typeof body.name === 'string') {
      const trimmedName = body.name.trim();
      updateData.name = trimmedName || tenant.name;
    }

    if (body.logoChanged === true) {
      const rawLogo = typeof body.logoUrl === 'string' ? body.logoUrl.trim() : '';
      updateData.logoUrl = rawLogo ? rawLogo : null;
    }

    if (typeof body.headline === 'string') updateData.headline = body.headline;
    if (typeof body.bio === 'string') updateData.bio = body.bio;
    if (typeof body.professionalReg === 'string') updateData.professionalReg = body.professionalReg;

    if (body.consultationPrice !== undefined && body.consultationPrice !== null && body.consultationPrice !== '') {
      const parsedPrice = Number(body.consultationPrice);
      if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
        updateData.consultationPrice = parsedPrice;
      }
    }

    if (typeof body.pixKey === 'string') updateData.pixKey = body.pixKey;
    if (typeof body.pixType === 'string') updateData.pixType = body.pixType;
    if (typeof body.pixName === 'string') updateData.pixName = body.pixName;
    if (typeof body.meetingUrlDefault === 'string') updateData.meetingUrlDefault = body.meetingUrlDefault;
    if (typeof body.address === 'string') updateData.address = body.address;
    if (typeof body.whatsapp === 'string') updateData.whatsapp = body.whatsapp;
    if (typeof body.instagram === 'string') updateData.instagram = body.instagram;

    if (typeof body.whatsappAutoReminder === 'boolean') {
      updateData.whatsappAutoReminder = body.whatsappAutoReminder;
    }
    if (body.whatsappReminderHours !== undefined) {
      const hrs = parseInt(String(body.whatsappReminderHours), 10);
      if (!Number.isNaN(hrs) && hrs > 0) {
        updateData.whatsappReminderHours = hrs;
      }
    }
    if (typeof body.whatsappSend2hReminder === 'boolean') {
      updateData.whatsappSend2hReminder = body.whatsappSend2hReminder;
    }
    if (typeof body.whatsappReminderText === 'string') {
      updateData.whatsappReminderText = body.whatsappReminderText;
    }
    if (typeof body.whatsappReminder2hText === 'string') {
      updateData.whatsappReminder2hText = body.whatsappReminder2hText;
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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[POST /api/settings] Erro ao salvar configurações:', err);
    return NextResponse.json(
      { error: err?.message || 'Erro interno ao salvar configurações.' },
      { status: 500 }
    );
  }
}
