import { prisma } from '@/lib/prisma';
import { encryptText, decryptText } from '@/lib/crypto';
import { sanitizeClinicalDraft } from '@/lib/ai/gemini';

export type MemoryScope = 'marketing' | 'gestao' | 'expansao' | 'atendimento';

export interface DecryptedMemoryItem {
  id: string;
  scope: MemoryScope;
  patientId: string | null;
  patientName?: string | null;
  category: string;
  title: string;
  content: string;
  importance: number;
  isPinned: boolean;
  source: string;
  updatedAt: string;
}

/**
 * Cria um registro de memória estruturada (com criptografia AES-256-GCM em repouso).
 */
export async function createStructuredMemory(params: {
  tenantId: string;
  scope: MemoryScope;
  patientId?: string | null;
  category?: string;
  title: string;
  content: string;
  importance?: number;
  isPinned?: boolean;
  source?: 'manual' | 'agent_auto' | 'prontuario' | 'n8n';
}) {
  const contentEnc = encryptText(params.content.trim());

  return await prisma.structuredMemory.create({
    data: {
      tenantId: params.tenantId,
      scope: params.scope,
      patientId: params.scope === 'atendimento' ? params.patientId || null : null,
      category: params.category?.trim() || 'geral',
      title: params.title.trim(),
      contentEnc,
      importance: Math.min(5, Math.max(1, params.importance || 3)),
      isPinned: Boolean(params.isPinned),
      source: params.source || 'manual',
    },
  });
}

/**
 * Lista memórias estruturadas descriptografadas de um escopo ou paciente específico.
 */
export async function listStructuredMemories(params: {
  tenantId: string;
  scope?: MemoryScope;
  patientId?: string;
  limit?: number;
}): Promise<DecryptedMemoryItem[]> {
  const rows = await prisma.structuredMemory.findMany({
    where: {
      tenantId: params.tenantId,
      ...(params.scope ? { scope: params.scope } : {}),
      ...(params.patientId ? { patientId: params.patientId } : {}),
    },
    include: {
      patient: { select: { name: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { importance: 'desc' }, { updatedAt: 'desc' }],
    take: params.limit || 60,
  });

  return rows.map((r) => {
    let content = '';
    try {
      content = decryptText(r.contentEnc);
    } catch {
      content = '[Erro ao descriptografar memória]';
    }
    return {
      id: r.id,
      scope: r.scope as MemoryScope,
      patientId: r.patientId,
      patientName: r.patient?.name || null,
      category: r.category,
      title: r.title,
      content,
      importance: r.importance,
      isPinned: r.isPinned,
      source: r.source,
      updatedAt: r.updatedAt.toISOString(),
    };
  });
}

/**
 * Monta o bloco de Memória Estruturada para injetar no prompt do Agente,
 * anonimizando automaticamente dados pessoais caso seja memória de paciente (LGPD).
 */
export async function buildMemoryPromptContext(params: {
  tenantId: string;
  agentSlug: string;
  patientId?: string;
  patientName?: string;
}): Promise<string> {
  const scopeMap: Record<string, MemoryScope> = {
    marketing: 'marketing',
    gestao: 'gestao',
    expansao: 'expansao',
    pos_sessao: 'atendimento',
    atendimento: 'atendimento',
  };

  const primaryScope = scopeMap[params.agentSlug] || 'expansao';
  const blocks: string[] = [];

  // 1. Memória do domínio do Agente (ex: metodologias de expansão, diretrizes de marketing ou regras de gestão)
  if (primaryScope !== 'atendimento') {
    const domainMemories = await listStructuredMemories({
      tenantId: params.tenantId,
      scope: primaryScope,
      limit: 20,
    });
    if (domainMemories.length > 0) {
      blocks.push(
        `### MEMÓRIA ESTRUTURADA DO ESCOPO [${primaryScope.toUpperCase()}]:\n` +
          domainMemories
            .map((m) => `- [${m.category} | Imp:${m.importance}] **${m.title}**: ${m.content}`)
            .join('\n')
      );
    }
  }

  // 2. Se houver um paciente selecionado (Pós-Sessão, Expansão Individual ou Atendimento), carrega a Ficha Viva do Paciente!
  if (params.patientId) {
    const patientMemories = await listStructuredMemories({
      tenantId: params.tenantId,
      scope: 'atendimento',
      patientId: params.patientId,
      limit: 25,
    });

    if (patientMemories.length > 0) {
      const sanitizedLines = patientMemories.map((m) => {
        const safeTitle = sanitizeClinicalDraft(m.title, params.patientName);
        const safeContent = sanitizeClinicalDraft(m.content, params.patientName);
        return `- [${m.category} | Imp:${m.importance}] **${safeTitle}**: ${safeContent}`;
      });
      blocks.push(
        `### MEMÓRIA EVOLUTIVA INDIVIDUAL DO PACIENTE (ANONIMIZADA LGPD):\n` +
          sanitizedLines.join('\n')
      );
    }
  }

  return blocks.join('\n\n');
}
