import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/prisma';

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export const GENERATION_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-2.5-flash',
];

const EMBEDDING_MODELS = ['gemini-embedding-001', 'text-embedding-004'];

/**
 * Chama o modelo Gemini com fallback automático de nome de modelo.
 */
export async function callGeminiText(params: {
  prompt: string;
  systemInstruction?: string;
  jsonMode?: boolean;
  inlineData?: { mimeType: string; data: string };
}): Promise<string | null> {
  const ai = getGenAI();
  if (!ai) return null;

  const contents: any = params.inlineData
    ? [
        {
          role: 'user',
          parts: [
            { inlineData: params.inlineData },
            { text: params.prompt },
          ],
        },
      ]
    : params.prompt;

  for (const modelName of GENERATION_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
          ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      });
      if (response.text) return response.text;
    } catch (err: any) {
      console.warn(`Tentativa com modelo ${modelName} falhou:`, err?.message || err);
    }
  }
  return null;
}

/**
 * Gera vetores de embedding em lote (256 dimensões) em uma única chamada rápida à API Gemini.
 */
export async function embedTextsBatch(texts: string[]): Promise<Array<number[] | null>> {
  const ai = getGenAI();
  if (!ai || texts.length === 0) return texts.map(() => null);

  const results: Array<number[] | null> = [];
  const batchSize = 25;

  for (let offset = 0; offset < texts.length; offset += batchSize) {
    const slice = texts.slice(offset, offset + batchSize).map((t) => t.slice(0, 6000));
    let embeddedBatch: Array<number[] | null> | null = null;

    for (const model of EMBEDDING_MODELS) {
      try {
        const res = await ai.models.embedContent({
          model,
          contents: slice,
          config: { outputDimensionality: 256 },
        });
        if (res.embeddings && res.embeddings.length === slice.length) {
          embeddedBatch = res.embeddings.map((e) =>
            e.values && e.values.length > 0 ? e.values.map((v) => Number(v.toFixed(5))) : null
          );
          break;
        }
      } catch {
        // Tenta próximo modelo
      }
    }

    if (embeddedBatch) {
      results.push(...embeddedBatch);
    } else {
      results.push(...slice.map(() => null));
    }
  }

  return results;
}
export async function embedSingleText(text: string): Promise<number[] | null> {
  const ai = getGenAI();
  if (!ai || !text.trim()) return null;

  const trimmed = text.slice(0, 6000);
  for (const model of EMBEDDING_MODELS) {
    try {
      const res = await ai.models.embedContent({
        model,
        contents: [trimmed],
        config: { outputDimensionality: 256 },
      });
      const values = res.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        return values.map((v) => Number(v.toFixed(5)));
      }
    } catch {
      // Tenta o próximo modelo de embedding
    }
  }
  return null;
}

/**
 * Divide textos longos (apostilas, transcrições de seminários, PDFs) em blocos semânticos com sobreposição.
 */
export function chunkKnowledgeText(rawText: string, maxChunkChars = 950, overlapChars = 140): string[] {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  if (normalized.length <= maxChunkChars) return [normalized];

  const paragraphs = normalized.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).trim().length <= maxChunkChars) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) {
        chunks.push(current.trim());
        const tail = current.slice(-overlapChars);
        current = `${tail}\n\n${para}`.slice(0, maxChunkChars * 1.4);
      } else {
        // Parágrafo muito grande: fatiar por frases
        let sliceStart = 0;
        while (sliceStart < para.length) {
          chunks.push(para.slice(sliceStart, sliceStart + maxChunkChars).trim());
          sliceStart += maxChunkChars - overlapChars;
        }
        current = '';
      }
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.filter((c) => c.length > 15);
}

/**
 * Extrai texto estruturado de um PDF (base64) usando capacidade multimodal do Gemini + fallback textual leve.
 */
export async function extractTextFromPdfBase64(base64Data: string, fileName: string): Promise<string> {
  const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, '');

  // 1. Extração fiel via Gemini Multimodal (suporta PDFs diagramados, colunas e páginas escaneadas)
  const extractedByAi = await callGeminiText({
    prompt: `Extraia integralmente e com máxima fidelidade todo o conteúdo textual relevante deste documento PDF ("${fileName}"). Preserve títulos, tópicos, conceitos terapêuticos, citações bibliográficas e exercícios. Não resuma: transcreva o conteúdo limpo em texto/markdown.`,
    inlineData: {
      mimeType: 'application/pdf',
      data: cleanBase64,
    },
  });

  if (extractedByAi && extractedByAi.trim().length > 30) {
    return extractedByAi.trim();
  }

  // 2. Fallback leve em puro Node.js para streams de texto simples em PDF caso sem GEMINI_API_KEY
  try {
    const buffer = Buffer.from(cleanBase64, 'base64');
    const latin = buffer.toString('latin1');
    const matches = latin.match(/\(([^()\\]{3,})\)/g) || [];
    const fallbackText = matches
      .map((m) => m.slice(1, -1))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (fallbackText.length > 40) {
      return fallbackText;
    }
  } catch {
    // Ignora erro de fallback
  }

  throw new Error(
    'Não foi possível extrair o texto deste PDF automaticamente. Verifique se a GEMINI_API_KEY está configurada na VPS ou cole o texto diretamente.'
  );
}

/**
 * Extrai conteúdo limpo de uma página/artigo web (URL).
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BEMKnowledgeBot/1.0)',
      Accept: 'text/html,application/xhtml+xml,text/plain',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`Não foi possível acessar a URL informada (HTTP ${res.status}).`);
  }

  const html = await res.text();
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<\/(p|div|h1|h2|h3|h4|li|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (withoutScripts.length < 30) {
    throw new Error('A página retornou pouco texto legível. Cole o conteúdo manualmente se for uma página fechada.');
  }

  return withoutScripts.slice(0, 45000);
}

/**
 * Salva uma nova fonte na Base de Conhecimento B.E.M., divide em chunks e indexa embeddings.
 */
export async function indexKnowledgeSource(params: {
  tenantId: string;
  title: string;
  sourceType: 'directive' | 'seminar_note' | 'bibliography' | 'pdf' | 'text' | 'url';
  domainScope?: string;
  authorOrRef?: string;
  sourceUrl?: string;
  rawContent: string;
  tags?: string;
  isPinned?: boolean;
}) {
  const chunks = chunkKnowledgeText(params.rawContent);

  const source = await prisma.knowledgeSource.create({
    data: {
      tenantId: params.tenantId,
      title: params.title.trim(),
      sourceType: params.sourceType,
      domainScope: params.domainScope || 'all',
      authorOrRef: params.authorOrRef?.trim() || null,
      sourceUrl: params.sourceUrl?.trim() || null,
      rawContent: params.rawContent.trim(),
      tags: params.tags?.trim() || null,
      isPinned: Boolean(params.isPinned || params.sourceType === 'directive'),
      chunkCount: chunks.length,
    },
  });

  // Indexa até 80 chunks usando chamadas em lote (leva ~1s em vez de 80 requisições sequenciais)
  const limitedChunks = chunks.slice(0, 80);
  const textsForEmbedding = limitedChunks.map(
    (c) => `${params.title}${params.authorOrRef ? ` (${params.authorOrRef})` : ''}\n${c}`
  );
  const vectors = await embedTextsBatch(textsForEmbedding);

  for (let i = 0; i < limitedChunks.length; i++) {
    const vec = vectors[i];
    await prisma.knowledgeChunk.create({
      data: {
        tenantId: params.tenantId,
        sourceId: source.id,
        chunkIndex: i,
        content: limitedChunks[i],
        embeddingJson: vec ? JSON.stringify(vec) : null,
      },
    });
  }

  return source;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function lexicalScore(query: string, candidate: string): number {
  const tokens = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);

  if (tokens.length === 0) return 0;
  const hay = candidate
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let hits = 0;
  for (const tk of tokens) {
    if (hay.includes(tk)) hits++;
  }
  return hits / tokens.length;
}

export function scopeMatchesAgent(
  domainScope: string | null | undefined,
  agentSlug: string
): boolean {
  if (!domainScope || domainScope.trim() === '' || domainScope === 'all') return true;
  const parts = domainScope
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.includes('all') || parts.includes(agentSlug);
}

/**
 * Busca Híbrida (Semântica Vetorial + Lexical + Diretrizes Fixadas + Catálogo Nativo de Emoções B.E.M.)
 */
export async function retrieveBemKnowledge(params: {
  tenantId: string;
  agentSlug: string;
  query: string;
  emotionNames?: string[];
  topK?: number;
}) {
  const topK = params.topK || 6;

  // 1. Diretrizes fixadas (isPinned) deste escopo (suporta múltiplos agentes separados por vírgula) ou globais
  const rawPinned = await prisma.knowledgeSource.findMany({
    where: {
      tenantId: params.tenantId,
      isPinned: true,
      OR: [{ domainScope: 'all' }, { domainScope: { contains: params.agentSlug } }],
    },
    orderBy: { updatedAt: 'desc' },
    take: 12,
  });
  const pinnedSources = rawPinned
    .filter((p) => scopeMatchesAgent(p.domainScope, params.agentSlug))
    .slice(0, 6);

  // 2. Chunks de fontes aplicáveis ao agente
  const rawChunks = await prisma.knowledgeChunk.findMany({
    where: {
      tenantId: params.tenantId,
      source: {
        isPinned: false,
        OR: [{ domainScope: 'all' }, { domainScope: { contains: params.agentSlug } }],
      },
    },
    include: {
      source: {
        select: {
          title: true,
          authorOrRef: true,
          sourceType: true,
          tags: true,
          domainScope: true,
        },
      },
    },
    take: 300,
  });
  const candidateChunks = rawChunks.filter((c) =>
    scopeMatchesAgent(c.source.domainScope, params.agentSlug)
  );

  const queryVec = candidateChunks.length > 0 ? await embedSingleText(params.query) : null;

  const scored = candidateChunks.map((chunk) => {
    let vecScore = 0;
    if (queryVec && chunk.embeddingJson) {
      try {
        const parsedVec = JSON.parse(chunk.embeddingJson) as number[];
        vecScore = cosineSimilarity(queryVec, parsedVec);
      } catch {
        vecScore = 0;
      }
    }
    const metaText = `${chunk.source.title} ${chunk.source.authorOrRef || ''} ${chunk.source.tags || ''} ${chunk.content}`;
    const lexScore = lexicalScore(params.query, metaText);
    const finalScore = queryVec ? vecScore * 0.72 + lexScore * 0.28 : lexScore;

    return {
      sourceTitle: chunk.source.title,
      authorOrRef: chunk.source.authorOrRef,
      sourceType: chunk.source.sourceType,
      content: chunk.content,
      score: finalScore,
    };
  });

  const topChunks = scored
    .filter((s) => s.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // 3. Catálogo nativo de Emoções B.E.M. (se mencionadas na query ou na lista de emoções da sessão)
  const allEmotions = await prisma.emotion.findMany({
    where: { OR: [{ tenantId: params.tenantId }, { tenantId: null }] },
    take: 120,
  });

  const queryLower = params.query.toLowerCase();
  const explicitSet = new Set((params.emotionNames || []).map((e) => e.toLowerCase().trim()));
  const matchedEmotions = allEmotions
    .filter(
      (e) =>
        explicitSet.has(e.title.toLowerCase()) ||
        (e.title.length > 3 && queryLower.includes(e.title.toLowerCase()))
    )
    .slice(0, 8);

  const sourcesUsed = Array.from(
    new Set([
      ...pinnedSources.map((p) => `${p.title}${p.authorOrRef ? ` (${p.authorOrRef})` : ''}`),
      ...topChunks.map((c) => `${c.sourceTitle}${c.authorOrRef ? ` (${c.authorOrRef})` : ''}`),
      ...(matchedEmotions.length > 0
        ? [`Catálogo B.E.M.: ${matchedEmotions.map((e) => e.title).join(', ')}`]
        : []),
    ])
  );

  let formattedContext = '';

  if (pinnedSources.length > 0) {
    formattedContext += `\n### DIRETRIZES E ANOTAÇÕES FIXADAS DO B.E.M.:\n`;
    for (const p of pinnedSources) {
      formattedContext += `- **${p.title}**${p.authorOrRef ? ` [Ref: ${p.authorOrRef}]` : ''}:\n${p.rawContent.slice(0, 1500)}\n\n`;
    }
  }

  if (topChunks.length > 0) {
    formattedContext += `\n### TRECHOS RELEVANTES DA BASE DE CONHECIMENTO (SEMINÁRIOS, TEXTOS E BIBLIOGRAFIA):\n`;
    for (const c of topChunks) {
      formattedContext += `- **${c.sourceTitle}**${c.authorOrRef ? ` [Ref: ${c.authorOrRef}]` : ''}:\n${c.content}\n\n`;
    }
  }

  if (matchedEmotions.length > 0) {
    formattedContext += `\n### DICIONÁRIO DE EMOÇÕES DA TÉCNICA B.E.M.:\n`;
    for (const em of matchedEmotions) {
      formattedContext += `- **${em.title}** (${em.type}): ${em.description}${
        em.phrases ? ` | Frases de Ancoragem: ${em.phrases}` : ''
      }\n`;
    }
  }

  return {
    formattedContext: formattedContext.trim(),
    sourcesUsed,
  };
}
