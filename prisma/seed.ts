import { PrismaClient } from '@prisma/client';
import { encryptText } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do BEM...');

  // 1. Criar ou atualizar Tenant principal (Eduardo Lara)
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'edulara' },
    update: {},
    create: {
      name: 'Espaço Terapêutico Edu Lara',
      slug: 'edulara',
      plan: 'pro',
    },
  });

  console.log(`Tenant criado: ${tenant.name} (${tenant.id})`);

  // 2. Criar Usuário Terapeuta
  const user = await prisma.user.upsert({
    where: { email: 'terapeuta@edulara.com.br' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Eduardo Lara',
      email: 'terapeuta@edulara.com.br',
      passwordHash: 'demo_hash_secure',
      role: 'therapist',
    },
  });

  console.log(`Usuário terapeuta criado: ${user.name}`);

  // 3. Criar Pacientes Iniciais com Criptografia LGPD
  const p1 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      name: 'Mariana Silva',
      phoneEnc: encryptText('(11) 98765-4321'),
      emailEnc: encryptText('mariana.silva@email.com'),
      cpfEnc: encryptText('123.456.789-00'),
      status: 'active',
      notes: 'Demanda inicial: Ansiedade generalizada e transição de carreira.',
    },
  });

  const p2 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      name: 'Lucas Souza',
      phoneEnc: encryptText('(11) 91234-5678'),
      emailEnc: encryptText('lucas.souza@email.com'),
      status: 'active',
      notes: 'Demanda inicial: Gestão de estresse e relações interpessoais.',
    },
  });

  const p3 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      name: 'Camila Ferreira',
      phoneEnc: encryptText('(11) 99887-6655'),
      status: 'active',
      notes: 'Atendimento quinzenal. Foco em autoconhecimento.',
    },
  });

  console.log('Pacientes criados com dados pessoais criptografados!');

  // 4. Criar Agendamentos para Hoje e Próximos Dias
  const today = new Date();
  
  const app1 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: p1.id,
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      durationMin: 50,
      status: 'confirmed',
      modality: 'online',
      meetingUrl: 'https://meet.google.com/bem-terapia-demo',
      price: 220.0,
      notes: 'Sessão 04: Trabalhar técnicas de regulação emocional.',
    },
  });

  const app2 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: p2.id,
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
      durationMin: 50,
      status: 'scheduled',
      modality: 'in_person',
      price: 250.0,
      notes: 'Primeira sessão pós-férias.',
    },
  });

  const app3 = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: p3.id,
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0),
      durationMin: 50,
      status: 'scheduled',
      modality: 'online',
      price: 220.0,
    },
  });

  console.log('Agendamentos criados com sucesso.');

  // 5. Criar Registro Clínico SOAP com Criptografia
  const soapContent = JSON.stringify({
    subjective: 'Paciente relata melhora nos picos de ansiedade matinal, porém sentiu desconforto ao apresentar projeto no trabalho.',
    objective: 'Postura atenta e comunicativa. Discurso coerente e articulado. Demonstrou alívio ao falar sobre suas conquistas recentes.',
    assessment: 'Evolução favorável na percepção dos gatilhos de estresse. Boa receptividade aos exercícios de escrita terapêutica propostos.',
    plan: 'Praticar técnica de respiração diafragmática 5min antes de reuniões. Revisitar plano na próxima quarta-feira.',
  });

  await prisma.clinicalRecord.create({
    data: {
      tenantId: tenant.id,
      patientId: p1.id,
      appointmentId: app1.id,
      sessionDate: new Date(),
      rawDraftEnc: encryptText('Mariana chegou mais calma hoje, falou do trabalho e das reuniões...'),
      soapEnc: encryptText(soapContent),
      aiAssisted: true,
      isLocked: false,
    },
  });

  // 6. Criar Transações Financeiras (Recebidas e Pendentes)
  await prisma.financialTransaction.create({
    data: {
      tenantId: tenant.id,
      patientId: p1.id,
      appointmentId: app1.id,
      type: 'income',
      category: 'consultation',
      amount: 220.0,
      dueDate: new Date(),
      paidAt: new Date(),
      status: 'paid',
      paymentMethod: 'pix',
      description: 'Sessão 04 - Mariana Silva',
    },
  });

  await prisma.financialTransaction.create({
    data: {
      tenantId: tenant.id,
      patientId: p2.id,
      appointmentId: app2.id,
      type: 'income',
      category: 'consultation',
      amount: 250.0,
      dueDate: new Date(),
      status: 'pending',
      description: 'Sessão Individual - Lucas Souza',
    },
  });

  await prisma.financialTransaction.create({
    data: {
      tenantId: tenant.id,
      type: 'expense',
      category: 'software',
      amount: 49.9,
      dueDate: new Date(),
      paidAt: new Date(),
      status: 'paid',
      paymentMethod: 'card',
      description: 'Plataforma de Videoconferência & Domínio',
    },
  });

  // 7. Criar Leads Iniciais no Funil de Captação (com Criptografia)
  await prisma.lead.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: 'Juliana Mendes',
        phoneEnc: encryptText('(11) 97654-3210'),
        demand: 'Sinto muita ansiedade e taquicardia antes de reuniões importantes no trabalho.',
        preferredTime: 'noite',
        modality: 'online',
        stage: 'new_lead',
        source: 'pagina_publica',
      },
      {
        tenantId: tenant.id,
        name: 'Rodrigo Alcântara',
        phoneEnc: encryptText('(11) 98111-2233'),
        demand: 'Esgotamento emocional com trabalho e dificuldade para dormir.',
        preferredTime: 'tarde',
        modality: 'online',
        stage: 'contacted',
        source: 'instagram',
      },
      {
        tenantId: tenant.id,
        name: 'Beatriz Nogueira',
        phoneEnc: encryptText('(11) 99444-5566'),
        demand: 'Dificuldade em estabelecer limites com familiares sem me sentir culpada.',
        preferredTime: 'manha',
        modality: 'in_person',
        stage: 'scheduled',
        source: 'indicacao',
      },
    ],
  });

  console.log('Leads do Funil de Captação criados.');
  console.log('Seed do BEM finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

