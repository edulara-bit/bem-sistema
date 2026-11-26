import { prisma } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';
import { ensureAiTables, DEFAULT_BEM_CORE_PHILOSOPHY } from '@/lib/ai/init-db';
import { listStructuredMemories } from '@/lib/ai/memory';
import { CopilotoView } from './CopilotoView';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Central de Agentes B.E.M. & Conhecimento — BEM',
  description:
    'Orquestração de Agentes Especialistas, Biblioteca RAG B.E.M., Memória Estruturada e Automações n8n',
};

export default async function CopilotoPage() {
  const [tenant, userCtx] = await Promise.all([
    getCurrentTenant(),
    getCurrentUserContext(),
  ]);
  if (!tenant) {
    return <div className="p-8 text-sm text-gray-600">Consultório não autenticado.</div>;
  }

  if (!tenant.aiAgentsEnabled && !userCtx?.isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded-3xl border border-[#E8E5DF] shadow-sm text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#EBF3ED] text-[#1F4D36] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-[#222924]">
          Central de Agentes B.E.M. não habilitada neste consultório
        </h1>
        <p className="text-xs text-[#6B726B] leading-relaxed">
          O acesso aos Agentes de IA B.E.M. é liberado individualmente pela Administração da plataforma. Entre em contato com o administrador para solicitar a ativação no seu plano.
        </p>
      </div>
    );
  }

  await ensureAiTables(tenant.id);

  const [freshTenant, agents, knowledgeSources, memories, patients, dispatches, programs] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenant.id } }),
      prisma.aiAgentConfig.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.knowledgeSource.findMany({
        where: { tenantId: tenant.id },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take: 100,
      }),
      listStructuredMemories({ tenantId: tenant.id, limit: 100 }),
      prisma.patient.findMany({
        where: { tenantId: tenant.id, status: 'active' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.aiMessageDispatch.findMany({
        where: { tenantId: tenant.id },
        include: { patient: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.patientProgram.findMany({
        where: { tenantId: tenant.id },
        include: { patient: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 30,
      }),
    ]);

  return (
    <CopilotoView
      tenantConfig={{
        name: freshTenant?.name || tenant.name,
        slug: freshTenant?.slug || tenant.slug,
        aiApiKey: freshTenant?.aiApiKey || '',
        n8nWebhookUrl: freshTenant?.n8nWebhookUrl || '',
        aiDefaultDeliveryMode: (freshTenant?.aiDefaultDeliveryMode as 'review' | 'auto') || 'review',
        aiCorePhilosophy: freshTenant?.aiCorePhilosophy || DEFAULT_BEM_CORE_PHILOSOPHY,
      }}
      agents={agents.map((a) => ({
        slug: a.slug as any,
        name: a.name,
        description: a.description || '',
        systemPrompt: a.systemPrompt,
        deliveryMode: (a.deliveryMode as 'review' | 'auto') || 'review',
        autoMemory: a.autoMemory,
        webhookUrl: a.webhookUrl || '',
      }))}
      knowledgeSources={knowledgeSources.map((k) => ({
        id: k.id,
        title: k.title,
        sourceType: k.sourceType,
        domainScope: k.domainScope,
        authorOrRef: k.authorOrRef || '',
        sourceUrl: k.sourceUrl || '',
        excerpt: k.rawContent.slice(0, 260),
        tags: k.tags || '',
        isPinned: k.isPinned,
        chunkCount: k.chunkCount,
        updatedAt: k.updatedAt.toLocaleDateString('pt-BR'),
      }))}
      memories={memories}
      patients={patients}
      dispatches={dispatches.map((d) => ({
        id: d.id,
        agentSlug: d.agentSlug,
        patientId: d.patientId,
        patientName: d.patient?.name || 'Geral',
        title: d.title,
        messageText: d.messageText,
        deliveryMode: d.deliveryMode,
        status: d.status,
        errorMsg: d.errorMsg,
        createdAt: d.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      }))}
      programs={programs.map((p) => ({
        id: p.id,
        patientId: p.patientId,
        patientName: p.patient?.name || 'Modelo Reutilizável',
        title: p.title,
        goal: p.goal || '',
        durationDays: p.durationDays,
        currentDay: p.currentDay,
        deliveryMode: p.deliveryMode,
        status: p.status,
        steps: JSON.parse(p.stepsJson || '[]'),
      }))}
    />
  );
}
