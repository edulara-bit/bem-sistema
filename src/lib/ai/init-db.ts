import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

let initializedInProcess = false;
let migrationInFlight: Promise<void> | null = null;

export const DEFAULT_BEM_CORE_PHILOSOPHY = `Princípios Fundamentais da Técnica B.E.M. (Bioenergética Emocional Magnética):
1. O corpo, a mente e o campo emocional funcionam como uma unidade indivisível: toda emoção reprimida ou conflito não elaborado registra-se na fisiologia e na tensão corporal.
2. Não tratamos o ser humano como um diagnóstico estático ou rótulo patológico; acolhemos estados emocionais transitórios e padrões aprendidos (Medos, Relacionamentos e Linha do Tempo / Timeline) que podem ser conscientizados, liberados e ressignificados.
3. O objetivo central do processo terapêutico é a Expansão da Autoconsciência: sair do piloto automático reativo (insegurança, culpa, medo de abandono/rejeição, controle) para a presença consciente, autorresponsabilidade gentil e regulação do sistema nervoso.
4. Comunicação sempre acolhedora, clara, profunda, ética, sem promessas milagrosas de cura e respeitando a autonomia e o ritmo único de cada pessoa.`;

export const DEFAULT_AGENT_DEFINITIONS = [
  {
    slug: 'marketing',
    name: 'Agente de Conteúdo & Captação B.E.M.',
    description:
      'Cria conteúdos psicoeducativos (Reels, Carrosséis, Posts, Sequências de WhatsApp e E-mails) alinhados à filosofia B.E.M. para relacionamento e atração ética de pacientes.',
    deliveryMode: 'review',
    systemPrompt: `Você é o Estrategista de Conteúdo e Relacionamento Ético da plataforma B.E.M.
Sua missão é transformar dores cotidianas (ansiedade, autocrítica, medo de rejeição/abandono, tensões emocionais no corpo, padrões repetitivos nos relacionamentos e no trabalho) em conteúdos magnéticos, profundos e acessíveis.
Diretrizes:
- Baseie-se sempre na filosofia B.E.M., nas notas de seminários e nas referências bibliográficas da Base de Conhecimento.
- Traduza conceitos complexos de bioenergética e emoções em exemplos concretos da vida diária.
- Utilize ganchos empáticos que gerem identificação imediata sem apelar ao medo ou sensacionalismo.
- Finalize sempre com um convite ético e elegante para aprofundamento ou agendamento de sessão.`,
  },
  {
    slug: 'pos_sessao',
    name: 'Agente de Devolutiva & Pós-Sessão',
    description:
      'Compila feedbacks terapêuticos acolhedores pós-sessão unindo situações trabalhadas (Medos, Relacionamento, Timeline), emoções liberadas, frases de ancoragem e evolução do paciente.',
    deliveryMode: 'review',
    systemPrompt: `Você é o Assistente Clínico de Pós-Sessão da metodologia B.E.M.
Sua função é compilar uma mensagem de devolutiva pós-sessão calorosa, clara e integradora para o paciente ler após o atendimento (via WhatsApp).
Diretrizes:
- Acolha a coragem e entrega do paciente na sessão realizada.
- Sintetize de forma leve e encorajadora os temas/situações e as emoções trabalhadas/liberadas, traduzindo termos técnicos em percepções de vida prática.
- Inclua 1 frase de ancoragem positiva conectada às emoções trabalhadas e 1 micro-convite de auto-observação corporal/emocional para os próximos dias.
- Nunca exponha jargões frios de prontuário nem faça diagnósticos clínicos fechados. Escreva em primeira pessoa como apoio do terapeuta.`,
  },
  {
    slug: 'expansao',
    name: 'Agente de Expansão da Consciência & Jornadas',
    description:
      'Desenha programas contínuos, desafios de 7/14/21 dias, exercícios somáticos e práticas de auto-observação para manter o paciente engajado entre as sessões.',
    deliveryMode: 'review',
    systemPrompt: `Você é o Arquiteto de Jornadas de Expansão da Autoconsciência B.E.M.
Sua missão é criar programas estruturados, desafios práticos (7, 14 ou 21 dias), exercícios de percepção corporal/respiratória e perguntas geradoras de consciência para manter o paciente em movimento evolutivo entre as sessões.
Diretrizes:
- Cada exercício diário deve ser simples de cumprir em 3 a 5 minutos (ex: 1 percepção matinal + 1 pausa corporal/respiratória + 1 pergunta noturna de integração).
- Conecte sempre o exercício ao corpo (onde a emoção se manifesta no peito, garganta, abdômen, ombros, respiração) e às situações reais (Medos, Relacionamentos, Timeline).
- Respeite o histórico e o ritmo individual do paciente registrados na memória estruturada.`,
  },
  {
    slug: 'gestao',
    name: 'Agente de Gestão & Inteligência do Consultório',
    description:
      'Analisa indicadores reais de agenda, faturamento, retenção, cancelamentos e funil de captação para sugerir ações semanais estratégicas e mensagens de reativação.',
    deliveryMode: 'review',
    systemPrompt: `Você é o Consultor Executivo e Estrategista de Gestão de Consultórios Terapêuticos B.E.M.
Sua função é analisar os números reais do consultório (ocupação da agenda, receita recebida vs. meta mensal, taxa de cancelamento, pacientes ativos sem sessão marcada há mais de 15 dias e funil de leads) e propor decisões claras, humanas e sustentáveis (prevenindo burnout do terapeuta).
Diretrizes:
- Seja objetivo, analítico e propositivo: destaque gargalos reais nos números e sugira as 3 ações de maior alavancagem da semana.
- Ao sugerir reativação de pacientes ausentes ou abordagem de leads parados, mantenha tom cuidadoso de presença terapêutica, nunca cobrança comercial agressiva.`,
  },
] as const;

/**
 * Garante que todas as tabelas e colunas da Central de Agentes B.E.M. existam no SQLite
 * mesmo em ambientes Docker standalone sem o binário CLI do Prisma.
 */
export async function ensureAiTables(tenantId?: string) {
  if (!initializedInProcess) {
    if (!migrationInFlight) {
      migrationInFlight = (async () => {
        try {
          const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
            `PRAGMA table_info("Tenant")`
          );
          const colSet = new Set(cols.map((c) => c.name));

          const alterDefs: Array<[string, string]> = [
            ['aiApiKey', `ALTER TABLE "Tenant" ADD COLUMN "aiApiKey" TEXT`],
            ['n8nWebhookUrl', `ALTER TABLE "Tenant" ADD COLUMN "n8nWebhookUrl" TEXT`],
            [
              'aiDefaultDeliveryMode',
              `ALTER TABLE "Tenant" ADD COLUMN "aiDefaultDeliveryMode" TEXT NOT NULL DEFAULT 'review'`,
            ],
            ['aiCorePhilosophy', `ALTER TABLE "Tenant" ADD COLUMN "aiCorePhilosophy" TEXT`],
            ['isActive', `ALTER TABLE "Tenant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT 1`],
            [
              'aiAgentsEnabled',
              `ALTER TABLE "Tenant" ADD COLUMN "aiAgentsEnabled" BOOLEAN NOT NULL DEFAULT 0`,
            ],
            ['logoUrl', `ALTER TABLE "Tenant" ADD COLUMN "logoUrl" TEXT`],
          ];
          for (const [colName, stmt] of alterDefs) {
            if (!colSet.has(colName)) {
              await prisma.$executeRawUnsafe(stmt);
            }
          }

          // Colunas novas na tabela User (validação por código no celular e role super_admin)
          const userCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
            `PRAGMA table_info("User")`
          );
          const userColSet = new Set(userCols.map((c) => c.name));
          const userAlterDefs: Array<[string, string]> = [
            ['phone', `ALTER TABLE "User" ADD COLUMN "phone" TEXT`],
            ['isVerified', `ALTER TABLE "User" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT 1`],
            ['verificationCode', `ALTER TABLE "User" ADD COLUMN "verificationCode" TEXT`],
            [
              'verificationExpiresAt',
              `ALTER TABLE "User" ADD COLUMN "verificationExpiresAt" DATETIME`,
            ],
          ];
          for (const [colName, stmt] of userAlterDefs) {
            if (!userColSet.has(colName)) {
              await prisma.$executeRawUnsafe(stmt);
            }
          }

          // Garante que o consultório matriz 'edulara' (administrador da plataforma) tenha Super Admin e Agentes BEM ativos
          await prisma.$executeRawUnsafe(
            `UPDATE "Tenant" SET "aiAgentsEnabled" = 1, "isActive" = 1 WHERE "slug" = 'edulara'`
          );
          await prisma.$executeRawUnsafe(
            `UPDATE "User" SET "role" = 'super_admin' WHERE "tenantId" IN (SELECT "id" FROM "Tenant" WHERE "slug" = 'edulara')`
          );

          // Coluna anamnesisEnc na tabela Patient
          const patCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
            `PRAGMA table_info("Patient")`
          );
          if (!patCols.some((c) => c.name === 'anamnesisEnc')) {
            await prisma.$executeRawUnsafe(`ALTER TABLE "Patient" ADD COLUMN "anamnesisEnc" TEXT`);
          }

          // Tabela global de Frequências Vibracionais B.E.M.
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "Frequency" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "number" TEXT NOT NULL,
              "title" TEXT NOT NULL,
              "description" TEXT NOT NULL,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "Frequency_number_idx" ON "Frequency"("number")`
          );

          // Tabela de Perguntas de Anamnese configuráveis por consultório
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "AnamnesisQuestion" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "question" TEXT NOT NULL,
              "hint" TEXT,
              "fieldType" TEXT NOT NULL DEFAULT 'textarea',
              "sortOrder" INTEGER NOT NULL DEFAULT 0,
              "active" BOOLEAN NOT NULL DEFAULT 1,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "AnamnesisQuestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "AnamnesisQuestion_tenantId_sortOrder_idx" ON "AnamnesisQuestion"("tenantId", "sortOrder")`
          );

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "AiAgentConfig" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "slug" TEXT NOT NULL,
              "name" TEXT NOT NULL,
              "description" TEXT,
              "systemPrompt" TEXT NOT NULL,
              "deliveryMode" TEXT NOT NULL DEFAULT 'review',
              "autoMemory" BOOLEAN NOT NULL DEFAULT true,
              "webhookUrl" TEXT,
              "enabled" BOOLEAN NOT NULL DEFAULT true,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "AiAgentConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE UNIQUE INDEX IF NOT EXISTS "AiAgentConfig_tenantId_slug_key" ON "AiAgentConfig"("tenantId", "slug")`
          );

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "KnowledgeSource" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "title" TEXT NOT NULL,
              "sourceType" TEXT NOT NULL DEFAULT 'text',
              "domainScope" TEXT NOT NULL DEFAULT 'all',
              "authorOrRef" TEXT,
              "sourceUrl" TEXT,
              "rawContent" TEXT NOT NULL,
              "tags" TEXT,
              "isPinned" BOOLEAN NOT NULL DEFAULT false,
              "chunkCount" INTEGER NOT NULL DEFAULT 0,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "KnowledgeSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "KnowledgeSource_tenantId_domainScope_idx" ON "KnowledgeSource"("tenantId", "domainScope")`
          );

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "sourceId" TEXT NOT NULL,
              "chunkIndex" INTEGER NOT NULL,
              "content" TEXT NOT NULL,
              "embeddingJson" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "KnowledgeChunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "KnowledgeChunk_tenantId_idx" ON "KnowledgeChunk"("tenantId")`
          );
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "KnowledgeChunk_sourceId_idx" ON "KnowledgeChunk"("sourceId")`
          );

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "StructuredMemory" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "scope" TEXT NOT NULL,
              "patientId" TEXT,
              "category" TEXT NOT NULL DEFAULT 'geral',
              "title" TEXT NOT NULL,
              "contentEnc" TEXT NOT NULL,
              "importance" INTEGER NOT NULL DEFAULT 3,
              "isPinned" BOOLEAN NOT NULL DEFAULT false,
              "source" TEXT NOT NULL DEFAULT 'manual',
              "embeddingJson" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "StructuredMemory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT "StructuredMemory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "StructuredMemory_tenantId_scope_idx" ON "StructuredMemory"("tenantId", "scope")`
          );
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "StructuredMemory_tenantId_patientId_idx" ON "StructuredMemory"("tenantId", "patientId")`
          );

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "PatientProgram" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "patientId" TEXT,
              "title" TEXT NOT NULL,
              "goal" TEXT,
              "durationDays" INTEGER NOT NULL DEFAULT 7,
              "stepsJson" TEXT NOT NULL,
              "deliveryMode" TEXT NOT NULL DEFAULT 'review',
              "status" TEXT NOT NULL DEFAULT 'active',
              "currentDay" INTEGER NOT NULL DEFAULT 1,
              "preferredSendHour" TEXT NOT NULL DEFAULT '08:00',
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "PatientProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT "PatientProgram_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "PatientProgram_tenantId_status_idx" ON "PatientProgram"("tenantId", "status")`
          );

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "AiMessageDispatch" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "agentSlug" TEXT NOT NULL,
              "patientId" TEXT,
              "appointmentId" TEXT,
              "programId" TEXT,
              "channel" TEXT NOT NULL DEFAULT 'whatsapp',
              "deliveryMode" TEXT NOT NULL DEFAULT 'review',
              "title" TEXT NOT NULL,
              "messageText" TEXT NOT NULL,
              "status" TEXT NOT NULL DEFAULT 'pending_review',
              "errorMsg" TEXT,
              "sentAt" DATETIME,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "AiMessageDispatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT "AiMessageDispatch_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
              CONSTRAINT "AiMessageDispatch_programId_fkey" FOREIGN KEY ("programId") REFERENCES "PatientProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "AiMessageDispatch_tenantId_status_idx" ON "AiMessageDispatch"("tenantId", "status")`
          );

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "AgentThread" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "tenantId" TEXT NOT NULL,
              "agentSlug" TEXT NOT NULL,
              "patientId" TEXT,
              "title" TEXT NOT NULL,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "AgentThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
              CONSTRAINT "AgentThread_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
          `);

          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "AgentMessage" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "threadId" TEXT NOT NULL,
              "role" TEXT NOT NULL,
              "content" TEXT NOT NULL,
              "memoriesExtractedJson" TEXT,
              "sourcesUsedJson" TEXT,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "AgentMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AgentThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);

          // Tabela global hierárquica de Categorias e Subcategorias de Protocolos B.E.M. (Medos, Relacionamento, Timeline)
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "ProtocolNode" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "title" TEXT NOT NULL,
              "parentId" TEXT,
              "sortOrder" INTEGER NOT NULL DEFAULT 0,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT "ProtocolNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProtocolNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
          `);
          await prisma.$executeRawUnsafe(
            `CREATE INDEX IF NOT EXISTS "ProtocolNode_parentId_sortOrder_idx" ON "ProtocolNode"("parentId", "sortOrder")`
          );

          // 1) Auto-seed e deduplicação automática de Emoções (remove registros duplicados preservando edições)
          const existingEmotions = await prisma.emotion.findMany({
            orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          });

          if (existingEmotions.length === 0) {
            try {
              const jsonPath = path.join(process.cwd(), 'src/lib/emotions-detailed.json');
              if (fs.existsSync(jsonPath)) {
                const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                const seenSeed = new Set<string>();
                for (const item of raw) {
                  const t = String(item.title || '').trim();
                  const tp = String(item.tipo || 'Negativa').trim();
                  const k = `${t.toLowerCase()}|${tp.toLowerCase()}`;
                  if (!t || seenSeed.has(k)) continue;
                  seenSeed.add(k);
                  await prisma.emotion.create({
                    data: {
                      tenantId: null,
                      title: t,
                      description: String(item.description || ''),
                      code: item.letra ? String(item.letra) : null,
                      type: tp,
                      phrases: item.phrases ? String(item.phrases) : null,
                    },
                  });
                }
              }
            } catch (e) {
              console.warn('Aviso ao popular emoções iniciais:', e);
            }
          } else {
            const seenEmotionKeys = new Set<string>();
            const duplicateEmotionIds: string[] = [];
            for (const emo of existingEmotions) {
              const key = `${emo.title.trim().toLowerCase()}|${(emo.type || '').trim().toLowerCase()}`;
              if (seenEmotionKeys.has(key)) {
                duplicateEmotionIds.push(emo.id);
              } else {
                seenEmotionKeys.add(key);
              }
            }
            if (duplicateEmotionIds.length > 0) {
              await prisma.emotion.deleteMany({
                where: { id: { in: duplicateEmotionIds } },
              });
            }
          }

          // 2) Auto-seed e deduplicação automática de Frequências Vibracionais (1 a 9)
          const existingFreqs = await prisma.frequency.findMany({
            orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
          });
          if (existingFreqs.length === 0) {
            for (let n = 1; n <= 9; n++) {
              await prisma.frequency.create({
                data: {
                  number: String(n),
                  title: `Frequência ${n}`,
                  description: `Expressão vibracional fundamental ${n} do protocolo B.E.M. (Edite o título e a descrição conforme sua referência oficial).`,
                },
              });
            }
          } else {
            const seenFreqNums = new Set<string>();
            const dupFreqIds: string[] = [];
            for (const fq of existingFreqs) {
              const k = fq.number.trim().toLowerCase();
              if (seenFreqNums.has(k)) {
                dupFreqIds.push(fq.id);
              } else {
                seenFreqNums.add(k);
              }
            }
            if (dupFreqIds.length > 0) {
              await prisma.frequency.deleteMany({
                where: { id: { in: dupFreqIds } },
              });
            }
          }

          // 3) Auto-seed inicial da árvore de Protocolos B.E.M. (Medos, Relacionamento, Timeline e subcategorias)
          const nodeCountRows = await prisma.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(
            `SELECT COUNT(*) as cnt FROM "ProtocolNode"`
          );
          const nodeCount = Number(nodeCountRows[0]?.cnt || 0);
          if (nodeCount === 0) {
            await seedInitialProtocolNodes();
          }

          // Valida que as novas colunas de Tenant realmente estão acessíveis
          await prisma.$queryRawUnsafe(`SELECT "aiApiKey", "aiDefaultDeliveryMode" FROM "Tenant" LIMIT 1`);
          initializedInProcess = true;
        } catch (err) {
          console.error('Erro na auto-migração SQLite das tabelas de IA:', err);
        } finally {
          migrationInFlight = null;
        }
      })();
    }

    await migrationInFlight;
  }

  if (tenantId) {
    try {
      await ensureTenantDefaults(tenantId);
    } catch (err) {
      console.error('Aviso ao semear padrões de IA do consultório:', err);
    }
  }
}

export async function ensureTenantDefaults(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { aiApiKey: true, aiCorePhilosophy: true, aiDefaultDeliveryMode: true },
  });

  if (tenant && (!tenant.aiApiKey || !tenant.aiCorePhilosophy)) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        aiApiKey: tenant.aiApiKey || `bem_sk_${crypto.randomBytes(18).toString('hex')}`,
        aiCorePhilosophy: tenant.aiCorePhilosophy || DEFAULT_BEM_CORE_PHILOSOPHY,
      },
    });
  }

  const existingAgents = await prisma.aiAgentConfig.findMany({
    where: { tenantId },
    select: { slug: true },
  });
  const existingSlugs = new Set(existingAgents.map((a) => a.slug));

  for (const def of DEFAULT_AGENT_DEFINITIONS) {
    if (!existingSlugs.has(def.slug)) {
      await prisma.aiAgentConfig.create({
        data: {
          tenantId,
          slug: def.slug,
          name: def.name,
          description: def.description,
          systemPrompt: def.systemPrompt,
          deliveryMode: def.deliveryMode,
          autoMemory: true,
          enabled: true,
        },
      });
    }
  }
}

async function seedInitialProtocolNodes() {
  try {
    const jsonPath = path.join(process.cwd(), 'src/lib/protocols-data.json');
    if (fs.existsSync(jsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const rawProtocols: Array<{ id: number; title: string; parentId: number }> =
        parsed.protocols || [];

      // Ordena as raízes na ordem clínica preferida: Medos, Relacionamento, Timeline
      const rootOrder: Record<string, number> = {
        Medo: 1,
        Medos: 1,
        Relacionamento: 2,
        Timeline: 3,
      };

      const legacyToCuid = new Map<number, string>();
      const remaining = [...rawProtocols];
      let safety = 0;

      while (remaining.length > 0 && safety < 10) {
        safety++;
        const deferred: typeof rawProtocols = [];
        let sortCounter = 0;

        for (const item of remaining) {
          if (item.parentId === 0) {
            const normalizedTitle = item.title === 'Medo' ? 'Medos' : item.title;
            const created = await prisma.protocolNode.create({
              data: {
                title: normalizedTitle,
                parentId: null,
                sortOrder: rootOrder[item.title] || ++sortCounter,
              },
            });
            legacyToCuid.set(item.id, created.id);
          } else if (legacyToCuid.has(item.parentId)) {
            sortCounter++;
            const created = await prisma.protocolNode.create({
              data: {
                title: item.title,
                parentId: legacyToCuid.get(item.parentId)!,
                sortOrder: sortCounter,
              },
            });
            legacyToCuid.set(item.id, created.id);
          } else {
            deferred.push(item);
          }
        }
        remaining.length = 0;
        remaining.push(...deferred);
      }

      // Garante que "Rejeição" também exista dentro de Medos (usado nas sessões atuais)
      const medosRootId = legacyToCuid.get(2);
      if (medosRootId) {
        const hasRejeicao = await prisma.protocolNode.findFirst({
          where: { parentId: medosRootId, title: 'Rejeição' },
        });
        if (!hasRejeicao) {
          await prisma.protocolNode.create({
            data: {
              title: 'Rejeição',
              parentId: medosRootId,
              sortOrder: 0,
            },
          });
        }
      }
      return;
    }
  } catch (err) {
    console.warn('Aviso ao popular ProtocolNode a partir de protocols-data.json:', err);
  }

  // Fallback caso o JSON não esteja acessível
  const medos = await prisma.protocolNode.create({
    data: { title: 'Medos', parentId: null, sortOrder: 1 },
  });
  for (const [idx, t] of ['Abandono', 'Rejeição', 'Crítica', 'Saúde', 'Financeiro', 'Fracasso', 'Sucesso'].entries()) {
    await prisma.protocolNode.create({
      data: { title: t, parentId: medos.id, sortOrder: idx + 1 },
    });
  }

  const rel = await prisma.protocolNode.create({
    data: { title: 'Relacionamento', parentId: null, sortOrder: 2 },
  });
  for (const [idx, t] of ['Família', 'Amoroso', 'Trabalho', 'Consigo', 'Dinheiro', 'Tempo', 'Deus'].entries()) {
    await prisma.protocolNode.create({
      data: { title: t, parentId: rel.id, sortOrder: idx + 1 },
    });
  }

  const tl = await prisma.protocolNode.create({
    data: { title: 'Timeline', parentId: null, sortOrder: 3 },
  });
  for (const [idx, t] of ['Passado', 'Presente', 'Futuro'].entries()) {
    await prisma.protocolNode.create({
      data: { title: t, parentId: tl.id, sortOrder: idx + 1 },
    });
  }
}
