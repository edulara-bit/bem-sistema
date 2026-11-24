'use server';

import { getTenantDb, prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { encryptText } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

export async function createPatientAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const name = formData.get('name') as string;
  const phone = (formData.get('phone') as string) || '';
  const email = (formData.get('email') as string) || '';
  const notes = (formData.get('notes') as string) || '';
  const modalityPreference = (formData.get('modalityPreference') as string) || 'online';
  const sessionTypePreference = (formData.get('sessionTypePreference') as string) || 'regular';
  const packageId = (formData.get('packageId') as string) || null;
  const packageTotalSessions = parseInt((formData.get('packageTotalSessions') as string) || '0', 10);

  const db = getTenantDb(tenant.id);

  await db.patients.create({
    name,
    phoneEnc: encryptText(phone),
    emailEnc: email ? encryptText(email) : null,
    notes,
    modalityPreference,
    sessionTypePreference,
    packageId: packageId || undefined,
    packageTotalSessions,
    packageUsedSessions: 0,
    status: 'active',
  });

  revalidatePath('/pacientes');
  revalidatePath('/agenda');
  revalidatePath('/');
  return { success: true };
}

export async function updatePatientAction(formData: FormData) {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const phone = (formData.get('phone') as string) || '';
  const email = (formData.get('email') as string) || '';
  const notes = (formData.get('notes') as string) || '';
  const modalityPreference = (formData.get('modalityPreference') as string) || 'online';
  const sessionTypePreference = (formData.get('sessionTypePreference') as string) || 'regular';
  const packageId = (formData.get('packageId') as string) || null;
  const packageTotalSessions = parseInt((formData.get('packageTotalSessions') as string) || '0', 10);
  const packageUsedSessions = parseInt((formData.get('packageUsedSessions') as string) || '0', 10);

  const db = getTenantDb(tenant.id);

  await db.patients.update(id, {
    name,
    phoneEnc: encryptText(phone),
    emailEnc: email ? encryptText(email) : null,
    notes,
    modalityPreference,
    sessionTypePreference,
    packageId: packageId || undefined,
    packageTotalSessions,
    packageUsedSessions,
  });

  revalidatePath('/pacientes');
  revalidatePath('/agenda');
  revalidatePath('/');
  return { success: true };
}

/**
 * Cria ou restaura o paciente teste 'Mariana Silva' com histórico completo
 * de 3 sessões anteriores (SOAP + apontamentos de situações/emoções) e 1 agendamento futuro.
 */
export async function seedTestPatientAction() {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('Tenant não encontrado.');

  const testName = 'Mariana Silva (Paciente Teste)';

  // 1. Busca se já existe paciente com este nome no tenant
  let patient = await prisma.patient.findFirst({
    where: {
      tenantId: tenant.id,
      name: testName,
    },
  });

  if (!patient) {
    patient = await prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: testName,
        phoneEnc: encryptText('19987654321'),
        emailEnc: encryptText('mariana.silva@exemplo.com'),
        notes: 'Paciente teste para validação de sessões, histórico bioenergético, protocolos e apontamentos.',
        modalityPreference: 'online',
        sessionTypePreference: 'package',
        packageTotalSessions: 5,
        packageUsedSessions: 3,
        status: 'active',
      },
    });
  } else {
    // Atualiza paciente teste
    patient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        packageTotalSessions: 5,
        packageUsedSessions: 3,
        sessionTypePreference: 'package',
        modalityPreference: 'online',
        notes: 'Paciente teste para validação de sessões, histórico bioenergético, protocolos e apontamentos.',
      },
    });

    // Remove registros e agendamentos anteriores do paciente teste para recriar limpo
    await prisma.clinicalRecord.deleteMany({
      where: { tenantId: tenant.id, patientId: patient.id },
    });
    await prisma.appointment.deleteMany({
      where: { tenantId: tenant.id, patientId: patient.id },
    });
  }

  const now = new Date();

  // ==========================================
  // SESSÃO 1: 14 DIAS ATRÁS (Medo > Abandono)
  // ==========================================
  const dateSess1 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  dateSess1.setHours(14, 0, 0, 0);

  const app1 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: dateSess1,
      durationMin: 50,
      status: 'completed',
      modality: 'online',
      sessionType: 'package',
      price: 160.0,
      notes: 'Primeira sessão do pacote. Queixa principal: ansiedade de separação e angústia matinal.',
      reminderSent: true,
      reminder2hSent: true,
    },
  });

  const payloadSess1 = {
    emocoes: ['Insegurança', 'Tristeza', 'Solidão'],
    situacoes: [
      {
        categoria: 'Medos',
        situacao: 'Abandono',
        complemento: 'Pessoa que ama / Medo de Rejeição',
        emocoes: ['Insegurança', 'Tristeza'],
      },
      {
        categoria: 'Relacionamento',
        situacao: 'Amoroso',
        complemento: 'Término recente e sensação de desamparo',
        emocoes: ['Solidão'],
      },
    ],
  };

  await prisma.clinicalRecord.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      appointmentId: app1.id,
      sessionDate: dateSess1,
      rawDraftEnc: encryptText(
        'Mariana procurou atendimento com queixa de ansiedade paralisante e choro frequente após término de relacionamento. Sente que sua vida perdeu o rumo e teme nunca mais conseguir se conectar com ninguém. Aponta que desde a infância sentia medo quando os pais viajavam.'
      ),
      soapEnc: encryptText(
        JSON.stringify({
          subjective:
            'Paciente relata sensação de vazio no peito, falta de ar pela manhã e insônia inicial. Demonstra extrema dependência de validação afetiva externa.',
          objective:
            'Tônus muscular tenso em trapézio e cervical. Respiração torácica rasa e bloqueio diafragmático visível ao relatar o término.',
          assessment:
            'Padrão clássico de ferida de abandono reativada na bioenergética, com fixação no canal emocional e couraça no segmento torácico.',
          plan: 'Exercícios de grounding e respiração diafragmática. Ressignificação do desamparo. Apontamento de Insegurança e Solidão.',
        })
      ),
      aiAssisted: true,
      isLocked: true,
      emocoesTrabalhadas: JSON.stringify(payloadSess1),
    },
  });

  // ==========================================
  // SESSÃO 2: 7 DIAS ATRÁS (Relacionamento > Família)
  // ==========================================
  const dateSess2 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  dateSess2.setHours(14, 0, 0, 0);

  const app2 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: dateSess2,
      durationMin: 50,
      status: 'completed',
      modality: 'online',
      sessionType: 'package',
      price: 160.0,
      notes: 'Segunda sessão. Investigação da dinâmica familiar e padrão de autossacrifício.',
      reminderSent: true,
      reminder2hSent: true,
    },
  });

  const payloadSess2 = {
    emocoes: ['Culpa', 'Frustração', 'Pressão'],
    situacoes: [
      {
        categoria: 'Relacionamento',
        situacao: 'Família',
        complemento: 'Cobrança materna e necessidade de agradar',
        emocoes: ['Culpa', 'Pressão'],
      },
      {
        categoria: 'Timeline',
        situacao: 'Passado',
        complemento: 'Pré-concepção e infância / Expectativas dos pais',
        emocoes: ['Frustração'],
      },
    ],
  };

  await prisma.clinicalRecord.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      appointmentId: app2.id,
      sessionDate: dateSess2,
      rawDraftEnc: encryptText(
        'Sessão focada na dinâmica com a mãe. Mariana percebeu que assume o papel de cuidadora dos pais desde cedo, suprimindo suas próprias necessidades para evitar críticas.'
      ),
      soapEnc: encryptText(
        JSON.stringify({
          subjective:
            'Relatou que o sentimento de culpa surge imediatamente quando tenta dizer não aos pedidos da mãe ou priorizar seu descanso.',
          objective:
            'Tensão na mandíbula (bruxismo relatado) e contenção da voz ao expressar sentimentos de raiva ou frustração.',
          assessment:
            'Couraça oral/mandibular com contenção da agressividade saudável. Lealdade sistêmica invisível gerando sobrecarga física.',
          plan: 'Liberação da mandíbula e expressão vocal. Delimitação de limites saudáveis com a família de origem.',
        })
      ),
      aiAssisted: true,
      isLocked: true,
      emocoesTrabalhadas: JSON.stringify(payloadSess2),
    },
  });

  // ==========================================
  // SESSÃO 3: 2 DIAS ATRÁS (Medo > Fracasso / Trabalho)
  // ==========================================
  const dateSess3 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  dateSess3.setHours(14, 0, 0, 0);

  const app3 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: dateSess3,
      durationMin: 50,
      status: 'completed',
      modality: 'online',
      sessionType: 'package',
      price: 160.0,
      notes: 'Terceira sessão. Foco no ambiente corporativo e medo do fracasso.',
      reminderSent: true,
      reminder2hSent: true,
    },
  });

  const payloadSess3 = {
    emocoes: ['Ansiedade', 'Autocrítica', 'Medo'],
    situacoes: [
      {
        categoria: 'Medos',
        situacao: 'Fracasso',
        complemento: 'Desapontar no trabalho e autocrítica severa',
        emocoes: ['Ansiedade', 'Autocrítica'],
      },
      {
        categoria: 'Relacionamento',
        situacao: 'Trabalho',
        complemento: 'Síndrome da impostora diante de nova liderança',
        emocoes: ['Medo'],
      },
    ],
  };

  await prisma.clinicalRecord.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      appointmentId: app3.id,
      sessionDate: dateSess3,
      rawDraftEnc: encryptText(
        'Paciente recebeu proposta para assumir a liderança de novos projetos e travou em crise de ansiedade. Crença central de "não ser boa o suficiente" e medo de ser julgada como incompetente.'
      ),
      soapEnc: encryptText(
        JSON.stringify({
          subjective:
            'Ansiedade antecipatória, sensação de impostura e perfeccionismo paralisante.',
          objective:
            'Postura encolhida, queixa de dores lombares e respiração apical.',
          assessment:
            'Medo de fracasso utilizado inconscientemente como justificativa para permanecer na zona de proteção contra rejeição social.',
          plan: 'Ancoragem corporal nos pés (Grounding), integração das competências reais e desmistificação do erro.',
        })
      ),
      aiAssisted: true,
      isLocked: true,
      emocoesTrabalhadas: JSON.stringify(payloadSess3),
    },
  });

  // ==========================================
  // SESSÃO 4 (FUTURA): Sexta-feira às 15:00
  // ==========================================
  const dateFuture = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  dateFuture.setHours(15, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: dateFuture,
      durationMin: 50,
      status: 'scheduled',
      modality: 'online',
      sessionType: 'package',
      price: 160.0,
      notes: 'Sessão 4 de 5 do pacote. Continuidade do trabalho de autonomia e segurança interna.',
      reminderSent: false,
      reminder2hSent: false,
    },
  });

  revalidatePath('/pacientes');
  revalidatePath(`/pacientes/${patient.id}/prontuario`);
  revalidatePath('/agenda');
  revalidatePath('/');

  return { success: true, patientId: patient.id };
}
