import { NextRequest, NextResponse } from 'next/server';
import { authenticateAiApiRequest, resolvePatientForApi } from '@/lib/ai/api-auth';
import {
  createStructuredMemory,
  listStructuredMemories,
  MemoryScope,
} from '@/lib/ai/memory';

const VALID_SCOPES = new Set(['marketing', 'gestao', 'expansao', 'atendimento']);

export async function GET(request: NextRequest) {
  const auth = await authenticateAiApiRequest(request);
  if (auth.error || !auth.tenant) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const scopeParam = searchParams.get('scope') as MemoryScope | null;
  const patientId = searchParams.get('patientId');
  const patientPhone = searchParams.get('patientPhone');

  const patient = await resolvePatientForApi(auth.tenant.id, { patientId, patientPhone });

  const items = await listStructuredMemories({
    tenantId: auth.tenant.id,
    scope: scopeParam && VALID_SCOPES.has(scopeParam) ? scopeParam : undefined,
    patientId: patient?.id || undefined,
    limit: Number(searchParams.get('limit') || 50),
  });

  return NextResponse.json({ success: true, count: items.length, memories: items });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAiApiRequest(request);
  if (auth.error || !auth.tenant) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const scope = (body.scope || 'atendimento') as MemoryScope;
    if (!VALID_SCOPES.has(scope)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Escopo inválido. Use: marketing, gestao, expansao ou atendimento.',
        },
        { status: 400 }
      );
    }

    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Campos "title" e "content" são obrigatórios.' },
        { status: 400 }
      );
    }

    const patient =
      scope === 'atendimento'
        ? await resolvePatientForApi(auth.tenant.id, {
            patientId: body.patientId,
            patientPhone: body.patientPhone,
          })
        : null;

    const created = await createStructuredMemory({
      tenantId: auth.tenant.id,
      scope,
      patientId: patient?.id || null,
      category: body.category || 'automacao_n8n',
      title: body.title,
      content: body.content,
      importance: body.importance || 4,
      isPinned: Boolean(body.isPinned),
      source: 'n8n',
    });

    return NextResponse.json({
      success: true,
      memoryId: created.id,
      scope: created.scope,
      patientLinked: patient ? { id: patient.id, name: patient.name } : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro ao gravar memória estruturada.' },
      { status: 500 }
    );
  }
}
