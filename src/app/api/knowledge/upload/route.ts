import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentTenant } from '@/lib/current-tenant';
import { ensureAiTables } from '@/lib/ai/init-db';
import {
  extractTextFromPdfBase64,
  extractTextFromUrl,
  indexKnowledgeSource,
} from '@/lib/ai/rag';

function getSafePartFilePath(tenantId: string, uploadId: string): string {
  const safeId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return path.join(os.tmpdir(), `bem_kb_${safeTenant}_${safeId}.part`);
}

/**
 * Rota dedicada para Upload em Blocos (512 KB por bloco) + Indexação de PDFs, Textos e URLs.
 * Resolve limites de 1 MB de Nginx / Next.js Server Actions e evita erros de serialização React #441.
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Sessão expirada. Faça login novamente.' },
        { status: 401 }
      );
    }

    await ensureAiTables(tenant.id);

    const contentType = request.headers.get('content-type') || '';

    // 1. Recebimento de bloco binário via multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const action = String(formData.get('action') || 'chunk');
      const uploadId = String(formData.get('uploadId') || '');

      if (!uploadId) {
        return NextResponse.json(
          { success: false, error: 'Identificador de upload ausente.' },
          { status: 400 }
        );
      }

      const partPath = getSafePartFilePath(tenant.id, uploadId);

      if (action === 'chunk') {
        const chunkIndex = Number(formData.get('chunkIndex') || 0);
        const blob = formData.get('chunk') as File | null;
        if (!blob) {
          return NextResponse.json(
            { success: false, error: 'Bloco de arquivo vazio.' },
            { status: 400 }
          );
        }

        const buf = Buffer.from(await blob.arrayBuffer());
        if (chunkIndex === 0) {
          await fs.writeFile(partPath, buf);
        } else {
          await fs.appendFile(partPath, buf);
        }

        return NextResponse.json({ success: true, chunkIndex, bytesReceived: buf.length });
      }
    }

    // 2. Finalização do PDF montado OU indexação direta de Texto / Nota de Seminário / URL
    const body = await request.json();
    const action = body.action || 'direct';

    if (action === 'finalize_file') {
      const uploadId = String(body.uploadId || '');
      const fileName = String(body.fileName || 'documento.pdf');
      const partPath = getSafePartFilePath(tenant.id, uploadId);

      try {
        const fullBuffer = await fs.readFile(partPath);
        let extractedText = '';

        if (fileName.toLowerCase().endsWith('.pdf')) {
          extractedText = await extractTextFromPdfBase64(fullBuffer.toString('base64'), fileName);
        } else {
          extractedText = fullBuffer.toString('utf-8');
        }

        if (!extractedText || extractedText.trim().length < 10) {
          return NextResponse.json(
            {
              success: false,
              error: 'O arquivo parece estar vazio ou não contém texto legível.',
            },
            { status: 400 }
          );
        }

        const created = await indexKnowledgeSource({
          tenantId: tenant.id,
          title: body.title || fileName,
          sourceType: fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text',
          domainScope: body.domainScope || 'all',
          authorOrRef: body.authorOrRef,
          rawContent: extractedText,
          tags: body.tags,
          isPinned: Boolean(body.isPinned),
        });

        revalidatePath('/ia-copiloto');
        return NextResponse.json({
          success: true,
          id: created.id,
          chunkCount: created.chunkCount,
        });
      } finally {
        await fs.unlink(partPath).catch(() => {});
      }
    }

    // Indexação direta (Nota de seminário, Bibliografia, Diretriz, Texto colado ou URL)
    let finalContent = String(body.rawContent || '').trim();
    if (body.sourceType === 'url' && body.sourceUrl) {
      finalContent = await extractTextFromUrl(body.sourceUrl);
    }

    if (!finalContent || finalContent.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Informe um texto ou URL válida com conteúdo suficiente.' },
        { status: 400 }
      );
    }

    const created = await indexKnowledgeSource({
      tenantId: tenant.id,
      title: body.title,
      sourceType: body.sourceType || 'seminar_note',
      domainScope: body.domainScope || 'all',
      authorOrRef: body.authorOrRef,
      sourceUrl: body.sourceUrl,
      rawContent: finalContent,
      tags: body.tags,
      isPinned: Boolean(body.isPinned),
    });

    revalidatePath('/ia-copiloto');
    return NextResponse.json({
      success: true,
      id: created.id,
      chunkCount: created.chunkCount,
    });
  } catch (err: any) {
    console.error('Erro no upload/indexação da Base de Conhecimento:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erro interno ao processar o documento na Base de Conhecimento.',
      },
      { status: 500 }
    );
  }
}
