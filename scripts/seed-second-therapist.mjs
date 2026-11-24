import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const KEY = Buffer.from('3cf6e7ab221557c4c8180cc3fe14f017d46c0b91f70ae346b4bf494c5d9720e5', 'hex');

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}

async function main() {
  console.log('--- Criando Segundo Terapeuta (Simulação Multi-Tenant SaaS) ---');

  // 1. Criar Tenant da Dra. Camila Rocha
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'camilarocha' },
    update: {},
    create: {
      name: 'Consultório Dra. Camila Rocha',
      slug: 'camilarocha',
      plan: 'pro',
      headline: 'Neuropsicologia Clínica, TDAH e Avaliação Cognitiva',
      bio: 'Atendimento especializado focado em avaliação neuropsicológica e desenvolvimento de estratégias de foco e regulação para adultos e jovens.',
      consultationPrice: 280.0,
      pixKey: 'camila.rocha@viverbem.com.br',
      pixType: 'email',
      pixName: 'Dra. Camila Rocha',
      whatsapp: '(11) 97777-8888',
      instagram: '@dracamilarocha',
      meetingUrlDefault: 'https://meet.google.com/camila-consulta-online',
    },
  });

  console.log(`Tenant criado: ${tenant.name} (${tenant.slug})`);

  // 2. Usuário da Dra. Camila
  await prisma.user.upsert({
    where: { email: 'camila@viverbem.com.br' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Dra. Camila Rocha',
      email: 'camila@viverbem.com.br',
      passwordHash: 'secret_hash_camila',
      role: 'therapist',
    },
  });

  // 3. Pacientes exclusivos da Dra. Camila
  const p1 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      name: 'Carlos Alberto Nunes',
      phoneEnc: encrypt('(11) 96543-2109'),
      emailEnc: encrypt('carlos.nunes@email.com'),
      status: 'active',
      notes: 'Investigação de TDAH em adulto e desregulação atencional.',
    },
  });

  const p2 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      name: 'Fernanda Toledo',
      phoneEnc: encrypt('(11) 95432-1098'),
      status: 'active',
      notes: 'Reabilitação cognitiva pós-concussão.',
    },
  });

  console.log('Pacientes da Dra. Camila criados com criptografia isolada.');

  // 4. Sessão exclusiva de hoje
  const today = new Date();
  const app = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: p1.id,
      scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
      durationMin: 50,
      status: 'confirmed',
      modality: 'online',
      price: 280.0,
      notes: 'Sessão 02: Aplicação de escalas atencionais.',
      meetingUrl: 'https://meet.google.com/camila-consulta-online',
    },
  });

  // 5. Financeiro exclusivo da Dra. Camila
  await prisma.financialTransaction.create({
    data: {
      tenantId: tenant.id,
      patientId: p1.id,
      appointmentId: app.id,
      type: 'income',
      category: 'consultation',
      amount: 280.0,
      dueDate: new Date(),
      paidAt: new Date(),
      status: 'paid',
      paymentMethod: 'pix',
      description: 'Sessão 02 - Carlos Alberto',
    },
  });

  await prisma.financialTransaction.create({
    data: {
      tenantId: tenant.id,
      patientId: p2.id,
      type: 'income',
      category: 'consultation',
      amount: 560.0,
      dueDate: new Date(),
      status: 'pending',
      description: 'Pacote Quinzenal - Fernanda Toledo',
    },
  });

  // 6. Lead exclusivo no funil da Dra. Camila
  await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      name: 'Patrícia Gusmão',
      phoneEnc: encrypt('(11) 94321-0987'),
      demand: 'Suspeita de TDAH tardio, não consigo terminar projetos e esqueço compromissos importantes.',
      preferredTime: 'manha',
      modality: 'online',
      stage: 'new_lead',
      source: 'pagina_publica',
    },
  });

  console.log('Lead da Dra. Camila criado.');
  console.log('Segundo Terapeuta cadastrado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

