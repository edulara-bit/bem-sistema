import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateAiApiRequest } from '@/lib/ai/api-auth';
import {
  extractTextFromPdfBase64,
  extractTextFromUrl,
  indexKnowledgeSource,
} from '@/lib/ai/rag';

export async function GET(request: NextRequest) {
  const auth = await authenticateAiApiRequest(request);
  if (auth.error || !auth.tenant) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const sources = await prisma.knowledgeSource.findMany({
    where: { tenantId: auth.tenant.id },
    select: {
      id: true,
      title: true,
      sourceType: true,
      domainScope: true,
      authorOrRef: true,
      tags: true,
      isPinned: true,
      chunkCount: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ success: true, count: sources.length, sources });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAiApiRequest(request);
  if (auth.error || !auth.tenant) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'O campo "title" é obrigatório.' },
        { status: 400 }
      );
    }

    const sourceType = body.sourceType || 'seminar_note';
    let rawContent = (body.rawContent || '').trim();

    if (sourceType === 'pdf' && body.pdfBase64) {
      rawContent = await extractTextFromPdfBase64(body.pdfBase64, body.fileName || body.title);
    } else if (sourceType === 'url' && body.sourceUrl) {
      rawContent = await extractTextFromUrl(body.sourceUrl);
    }

    if (!rawContent || rawContent.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Conteúdo insuficiente para indexação.' },
        { status: 400 }
      );
    }

    const created = await indexKnowledgeSource({
      tenantId: auth.tenant.id,
      title: body.title,
      sourceType,
      domainScope: body.domainScope || 'all',
      authorOrRef: body.authorOrRef,
      sourceUrl: body.sourceUrl,
      rawContent,
      tags: body.tags,
      isPinned: Boolean(body.isPinned),
    });

    return NextResponse.json({
      success: true,
      sourceId: created.id,
      chunkCount: created.chunkCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao indexar conhecimento.' },
      { status: 500 }
    );
  }
}
