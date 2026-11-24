const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

const prisma = new PrismaClient();

const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || '3cf6e7ab221557c4c8180cc3fe14f017d46c0b91f70ae346b4bf494c5d9720e5',
  'hex'
);

function encryptText(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${enc}:${tag}`;
}

async function main() {
  console.log('--- 1. Povoando catálogo de 140 emoções com descrições ---');
  const detailedEmotions = JSON.parse(fs.readFileSync('src/lib/emotions-detailed.json', 'utf8'));

  // Busca ou cria o tenant principal
  let tenant = await prisma.tenant.findUnique({ where: { slug: 'edulara' } });
  if (!tenant) {
    tenant = await prisma.tenant.findFirst();
  }
  if (!tenant) {
    throw new Error('Nenhum tenant encontrado no banco de dados.');
  }

  console.log(`Tenant ativo: ${tenant.name} (${tenant.slug})`);

  let countEmotions = 0;
  for (const item of detailedEmotions) {
    const existing = await prisma.emotion.findFirst({
      where: { title: item.title, tenantId: tenant.id },
    });

    if (!existing) {
      await prisma.emotion.create({
        data: {
          tenantId: tenant.id,
          title: item.title,
          description: item.description,
          code: item.letra,
          type: item.tipo,
          phrases: item.phrases,
        },
      });
      countEmotions++;
    }
  }
  console.log(`✅ ${countEmotions} emoções cadastradas/atualizadas no banco.`);

  console.log('\n--- 2. Criando Paciente Teste com Histórico Completo de Sessões ---');

  // Limpa paciente teste anterior se existir
  const testPatientName = 'Mariana Silva (Paciente Teste)';
  const existingPatient = await prisma.patient.findFirst({
    where: { name: testPatientName, tenantId: tenant.id },
  });

  if (existingPatient) {
    await prisma.patient.delete({ where: { id: existingPatient.id } });
    console.log('Paciente teste anterior removido para atualização limpa.');
  }

  // Cria pacote modelo se não existir
  let pkg = await prisma.package.findFirst({ where: { tenantId: tenant.id } });
  if (!pkg) {
    pkg = await prisma.package.create({
      data: {
        tenantId: tenant.id,
        title: 'Pacote 5 Sessões - Bioenergética Integrativa',
        description: 'Acompanhamento quinzenal com alinhamento emocional e liberação de couraças',
        totalSessions: 5,
        totalPrice: 800.0,
        pricePerSession: 160.0,
        active: true,
      },
    });
  }

  const patient = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      name: testPatientName,
      phoneEnc: encryptText('(19) 99876-5432'),
      emailEnc: encryptText('mariana.silva@exemplo.com'),
      notes: 'Demanda inicial: Crises de ansiedade, aperto no peito, sobrecarga no trabalho e dificuldade em dizer não.',
      modalityPreference: 'in_person',
      sessionTypePreference: 'package',
      packageId: pkg.id,
      packageTotalSessions: 5,
      packageUsedSessions: 3,
      status: 'active',
    },
  });

  console.log(`✅ Paciente criado: ${patient.name} (ID: ${patient.id})`);

  // SESSÃO 1 (Há 21 dias)
  const d1 = new Date();
  d1.setDate(d1.getDate() - 21);
  d1.setHours(15, 0, 0, 0);

  const raw1 = 'Prioridades: Crise de ansiedade e sensação de peito apertado após término de relacionamento. Dores musculares no trapézio. Balanceamento bioenergético focado no cardíaco. Trabalhamos a insegurança na tomada de decisões e a acomodação na zona de conforto.';
  const soap1 = {
    subjective: 'Paciente relata que desde o término sente um nó no peito, com medo constante de não dar conta do trabalho e de ficar sozinha.',
    objective: 'Respiração torácica curta e acelerada, ombros elevados e tensão acentuada nos trapézios. Dificuldade de manter contato visual durante o relato.',
    assessment: 'Padrão bioenergético de couraça torácica bloqueando a livre expressão afetiva. Conflito entre necessidade de segurança e medo de arriscar.',
    plan: 'Exercícios de grounding (aterramento) diários de 5 minutos, respiração diafragmática profunda e balanceamento da Insegurança para Segurança.',
  };
  const em1 = ['Insegurança', 'Acomodação', 'Segurança', 'Motivação'];

  const app1 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: d1,
      durationMin: 60,
      status: 'completed',
      modality: 'in_person',
      sessionType: 'package',
      price: 160.0,
      notes: 'Sessão 1 do Pacote - Queixa de ansiedade e término',
      reminderSent: true,
      reminder2hSent: true,
    },
  });

  await prisma.clinicalRecord.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      appointmentId: app1.id,
      sessionDate: d1,
      rawDraftEnc: encryptText(raw1),
      soapEnc: encryptText(JSON.stringify(soap1)),
      emocoesTrabalhadas: JSON.stringify(em1),
      aiAssisted: true,
      isLocked: true,
    },
  });

  // SESSÃO 2 (Há 14 dias)
  const d2 = new Date();
  d2.setDate(d2.getDate() - 14);
  d2.setHours(15, 0, 0, 0);

  const raw2 = 'Melhora significativa das crises de ansiedade. Nova questão trazida: cobrança profissional intensa e culpa por não atender expectativas da família. Aplicado Módulo 3 - Baixa Autoestima e Pâncreas. Balanceado Culpa e Autonomia.';
  const soap2 = {
    subjective: 'Relatou que dormiu melhor na última semana. Porém, sentiu forte culpa ao recusar um pedido excessivo de hora extra no trabalho.',
    objective: 'Postura mais ereta, respiração mais profunda. Menor rigidez na musculatura cervical.',
    assessment: 'Evolução favorável do tônus autonômico. Emergência de padrão de autossabotagem alimentado por sentimento arcaico de culpa infantil.',
    plan: 'Reforço da ancoragem da emoção de Autonomia e Autoestima. Exercício de liberação vocal para expressão de limites saudáveis.',
  };
  const em2 = ['Culpa', 'Fracasso', 'Autonomia', 'Autoestima', 'Perdão'];

  const app2 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: d2,
      durationMin: 60,
      status: 'completed',
      modality: 'in_person',
      sessionType: 'package',
      price: 160.0,
      notes: 'Sessão 2 do Pacote - Cobrança profissional e limites',
      reminderSent: true,
      reminder2hSent: true,
    },
  });

  await prisma.clinicalRecord.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      appointmentId: app2.id,
      sessionDate: d2,
      rawDraftEnc: encryptText(raw2),
      soapEnc: encryptText(JSON.stringify(soap2)),
      emocoesTrabalhadas: JSON.stringify(em2),
      aiAssisted: true,
      isLocked: true,
    },
  });

  // SESSÃO 3 (Há 7 dias)
  const d3 = new Date();
  d3.setDate(d3.getDate() - 7);
  d3.setHours(15, 0, 0, 0);

  const raw3 = 'Paciente muito mais centrada e comunicativa. Relata que conseguiu ter uma conversa franca com os pais sem perder a calma. Alinhamento bioenergético geral, desbloqueio diafragmático e ancoragem de naturalidade.';
  const soap3 = {
    subjective: 'Sentimento de alívio e expansão: "Sinto que voltei a respirar de verdade e a confiar no meu valor."',
    objective: 'Expressão facial relaxada, tônus corporal equilibrado, riso espontâneo e excelente resposta aos toques bioenergéticos.',
    assessment: 'Integração satisfatória das emoções trabalhadas. Paciente consolidando nova referência interna de segurança e naturalidade.',
    plan: 'Manter rotina de autocuidado. Próxima sessão focada em metas de futuro e sustentação do entusiasmo.',
  };
  const em3 = ['Timidez', 'Naturalidade', 'Confiança', 'Entusiasmo'];

  const app3 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: d3,
      durationMin: 60,
      status: 'completed',
      modality: 'in_person',
      sessionType: 'package',
      price: 160.0,
      notes: 'Sessão 3 do Pacote - Integração e conversa com a família',
      reminderSent: true,
      reminder2hSent: true,
    },
  });

  await prisma.clinicalRecord.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      appointmentId: app3.id,
      sessionDate: d3,
      rawDraftEnc: encryptText(raw3),
      soapEnc: encryptText(JSON.stringify(soap3)),
      emocoesTrabalhadas: JSON.stringify(em3),
      aiAssisted: true,
      isLocked: true,
    },
  });

  // SESSÃO 4 (Futura - Próxima sexta-feira às 15:00)
  const d4 = new Date();
  d4.setDate(d4.getDate() + 4);
  d4.setHours(15, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      scheduledAt: d4,
      durationMin: 60,
      status: 'confirmed',
      modality: 'in_person',
      sessionType: 'package',
      price: 160.0,
      notes: 'Sessão 4 do Pacote - Metas futuras e sustentação',
      reminderSent: false,
      reminder2hSent: false,
    },
  });

  console.log('✅ 3 sessões anteriores (concluídas com SOAP e emoções) e 1 futura (agendada) criadas com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
