'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  BookOpen,
  Brain,
  Send,
  ShieldCheck,
  Zap,
  Webhook,
  Plus,
  Trash2,
  Pin,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Settings,
  Upload,
  Link as LinkIcon,
  FileText,
  Compass,
  TrendingUp,
  HeartHandshake,
  Megaphone,
  RotateCcw,
  Layers,
  Video,
  Play,
  AlertCircle,
} from 'lucide-react';
import {
  invokeAgentChatAction,
  saveAgentConfigAction,
  saveCorePhilosophyAndAutomationAction,
  addKnowledgeSourceAction,
  toggleKnowledgePinAction,
  updateKnowledgeScopeAction,
  deleteKnowledgeSourceAction,
  addStructuredMemoryAction,
  toggleMemoryPinAction,
  deleteMemoryAction,
  createProgramAction,
  advanceProgramDayAction,
  approveDispatchAction,
  rejectDispatchAction,
  queueDirectAgentReplyAction,
  generateContentAction,
  testN8nWebhookAction,
  createTonePresetAction,
  updateTonePresetAction,
  deleteTonePresetAction,
} from './actions';
import type { AgentSlug } from '@/lib/ai/orchestrator';
import type { DecryptedMemoryItem, MemoryScope } from '@/lib/ai/memory';

interface TonePresetItem {
  id: string;
  slug: string;
  name: string;
  prompt: string;
}

interface AgentConfigItem {
  slug: AgentSlug;
  name: string;
  description: string;
  systemPrompt: string;
  deliveryMode: 'review' | 'auto';
  autoMemory: boolean;
  webhookUrl: string;
}

interface KnowledgeItem {
  id: string;
  title: string;
  sourceType: string;
  domainScope: string;
  authorOrRef: string;
  sourceUrl: string;
  excerpt: string;
  tags: string;
  isPinned: boolean;
  chunkCount: number;
  updatedAt: string;
}

interface DispatchItem {
  id: string;
  agentSlug: string;
  patientId: string | null;
  patientName: string;
  title: string;
  messageText: string;
  deliveryMode: string;
  status: string;
  errorMsg?: string | null;
  createdAt: string;
}

interface ProgramItem {
  id: string;
  patientId: string | null;
  patientName: string;
  title: string;
  goal: string;
  durationDays: number;
  currentDay: number;
  deliveryMode: string;
  status: string;
  steps: any[];
}

const ALL_AGENT_SCOPE_OPTIONS: Array<{ slug: AgentSlug; label: string }> = [
  { slug: 'pos_sessao', label: 'Pós-Sessão / Atendimento' },
  { slug: 'expansao', label: 'Expansão da Consciência' },
  { slug: 'marketing', label: 'Conteúdo & Captação' },
  { slug: 'gestao', label: 'Gestão do Consultório' },
];

function parseScopeList(domainScope: string): AgentSlug[] {
  if (!domainScope || domainScope === 'all') {
    return ALL_AGENT_SCOPE_OPTIONS.map((o) => o.slug);
  }
  const valid = new Set(ALL_AGENT_SCOPE_OPTIONS.map((o) => o.slug));
  const parsed = domainScope
    .split(',')
    .map((s) => s.trim() as AgentSlug)
    .filter((s) => valid.has(s));
  return parsed.length > 0 ? parsed : ALL_AGENT_SCOPE_OPTIONS.map((o) => o.slug);
}

function serializeScopeList(selected: AgentSlug[]): string {
  if (selected.length === 0 || selected.length >= ALL_AGENT_SCOPE_OPTIONS.length) {
    return 'all';
  }
  return selected.join(',');
}

function formatScopeLabel(domainScope: string): string {
  if (!domainScope || domainScope === 'all') return 'Todos os Agentes';
  const map: Record<string, string> = {
    pos_sessao: 'Pós-Sessão',
    expansao: 'Expansão',
    marketing: 'Conteúdo/Captação',
    gestao: 'Gestão',
  };
  return domainScope
    .split(',')
    .map((s) => map[s.trim()] || s.trim())
    .join(' • ');
}

const QUICK_PROMPTS_BY_AGENT: Record<AgentSlug, string[]> = {
  marketing: [
    'Crie um carrossel conectando Medo de Rejeição à tensão nos ombros segundo o B.E.M.',
    'Escreva uma sequência de 3 mensagens de WhatsApp para leads que pediram preço e sumiram',
    'Roteiro de Reels de 45s sobre por que tentamos controlar tudo quando estamos inseguros',
  ],
  pos_sessao: [
    'Compile uma mensagem pós-sessão acolhedora com foco em liberação do Medo de Abandono e presença',
    'Escreva um resumo integrador destacando a coragem do paciente e 1 frase de ancoragem de Segurança',
  ],
  expansao: [
    'Estruture 5 práticas rápidas de percepção corporal para pacientes com autocrítica elevada',
    'Crie um protocolo semanal de auto-observação noturna conectado à Linha do Tempo (Presente Emocional)',
  ],
  gestao: [
    'Analise meus números reais deste mês e me dê um plano prático de 3 ações para bater a meta sem burnout',
    'Crie uma mensagem ética e calorosa para reativar os pacientes que estão há mais de 20 dias sem sessão',
  ],
};

export function CopilotoView({
  initialMainTab = 'agents',
  tenantConfig,
  tonePresets = [],
  agents,
  knowledgeSources,
  memories,
  patients,
  dispatches,
  programs,
}: {
  initialMainTab?: 'agents' | 'tones' | 'knowledge' | 'memories' | 'dispatches' | 'n8n';
  tenantConfig: {
    name: string;
    slug: string;
    aiApiKey: string;
    n8nWebhookUrl: string;
    aiDefaultDeliveryMode: 'review' | 'auto';
    aiCorePhilosophy: string;
  };
  tonePresets?: TonePresetItem[];
  agents: AgentConfigItem[];
  knowledgeSources: KnowledgeItem[];
  memories: DecryptedMemoryItem[];
  patients: { id: string; name: string }[];
  dispatches: DispatchItem[];
  programs: ProgramItem[];
}) {
  const router = useRouter();

  const [mainTab, setMainTab] = useState<
    'agents' | 'tones' | 'knowledge' | 'memories' | 'dispatches' | 'n8n'
  >(initialMainTab);

  // --- Estado Tons de Conversa ---
  const [editableTones, setEditableTones] = useState<Record<string, { name: string; prompt: string }>>(() => {
    const map: Record<string, { name: string; prompt: string }> = {};
    for (const tp of tonePresets) {
      map[tp.id] = { name: tp.name, prompt: tp.prompt };
    }
    return map;
  });
  const [newToneName, setNewToneName] = useState('');
  const [newTonePrompt, setNewTonePrompt] = useState('');
  const [savingToneId, setSavingToneId] = useState<string | null>(null);
  const [savedToneFeedbackId, setSavedToneFeedbackId] = useState<string | null>(null);

  // --- Estado Estúdio de Agentes ---
  const [selectedAgentSlug, setSelectedAgentSlug] = useState<AgentSlug>('marketing');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [promptInput, setPromptInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chatLog, setChatLog] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: string[];
      memories?: { title: string; scope: string }[];
    }>
  >([]);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Submodo rápido de Redes Sociais (para Agente de Marketing)
  const [socialFormat, setSocialFormat] = useState<'carousel' | 'reels' | 'post'>('carousel');
  const [socialResult, setSocialResult] = useState<any | null>(null);

  // Submodo Construtor de Jornadas (para Agente de Expansão)
  const [progGoal, setProgGoal] = useState('');
  const [progDays, setProgDays] = useState(7);
  const [progDeliveryMode, setProgDeliveryMode] = useState<'review' | 'auto'>(
    tenantConfig.aiDefaultDeliveryMode
  );
  const [progSendDay1, setProgSendDay1] = useState(true);
  const [isBuildingProgram, setIsBuildingProgram] = useState(false);

  // Edição do Agente atual
  const currentAgent =
    agents.find((a) => a.slug === selectedAgentSlug) || agents[0];
  const [editPrompt, setEditPrompt] = useState(currentAgent?.systemPrompt || '');
  const [editDeliveryMode, setEditDeliveryMode] = useState<'review' | 'auto'>(
    currentAgent?.deliveryMode || 'review'
  );
  const [editAutoMemory, setEditAutoMemory] = useState(currentAgent?.autoMemory ?? true);
  const [editWebhook, setEditWebhook] = useState(currentAgent?.webhookUrl || '');

  // --- Estado Biblioteca de Conhecimento ---
  const [philosophyText, setPhilosophyText] = useState(tenantConfig.aiCorePhilosophy);
  const [isSavingPhilosophy, setIsSavingPhilosophy] = useState(false);
  const [kType, setKType] = useState<
    'seminar_note' | 'pdf' | 'bibliography' | 'text' | 'url' | 'directive'
  >('seminar_note');
  const [kTitle, setKTitle] = useState('');
  const [kSelectedAgents, setKSelectedAgents] = useState<AgentSlug[]>([
    'pos_sessao',
    'expansao',
    'marketing',
    'gestao',
  ]);
  const [editingScopeSourceId, setEditingScopeSourceId] = useState<string | null>(null);
  const [editingScopeSelection, setEditingScopeSelection] = useState<AgentSlug[]>([]);
  const [kAuthor, setKAuthor] = useState('');
  const [kUrl, setKUrl] = useState('');
  const [kTags, setKTags] = useState('');
  const [kContent, setKContent] = useState('');
  const [kPinned, setKPinned] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [kFilterScope, setKFilterScope] = useState('all_filter');

  // --- Estado Cofre de Memórias ---
  const [memScopeFilter, setMemScopeFilter] = useState<'all' | MemoryScope>('all');
  const [memPatientFilter, setMemPatientFilter] = useState('');
  const [newMemScope, setNewMemScope] = useState<MemoryScope>('expansao');
  const [newMemPatientId, setNewMemPatientId] = useState('');
  const [newMemCategory, setNewMemCategory] = useState('metodologia');
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemContent, setNewMemContent] = useState('');
  const [newMemImportance, setNewMemImportance] = useState(4);
  const [isSavingMem, setIsSavingMem] = useState(false);

  // --- Estado Fila de Revisão & n8n ---
  const [editedDispatches, setEditedDispatches] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [globalDeliveryMode, setGlobalDeliveryMode] = useState<'review' | 'auto'>(
    tenantConfig.aiDefaultDeliveryMode
  );
  const [n8nUrl, setN8nUrl] = useState(tenantConfig.n8nWebhookUrl);
  const [apiKeyState, setApiKeyState] = useState(tenantConfig.aiApiKey);
  const [webhookStatusMsg, setWebhookStatusMsg] = useState<string | null>(null);

  const pendingReviewCount = dispatches.filter((d) => d.status === 'pending_review').length;

  const selectAgent = (slug: AgentSlug) => {
    setSelectedAgentSlug(slug);
    setThreadId(null);
    setChatLog([]);
    setSocialResult(null);
    const found = agents.find((a) => a.slug === slug);
    if (found) {
      setEditPrompt(found.systemPrompt);
      setEditDeliveryMode(found.deliveryMode);
      setEditAutoMemory(found.autoMemory);
      setEditWebhook(found.webhookUrl);
    }
  };

  const handleRunAgent = async (overrideText?: string) => {
    const text = (overrideText ?? promptInput).trim();
    if (!text) return;
    setIsRunningAgent(true);
    setPromptInput('');
    setChatLog((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const res = await invokeAgentChatAction({
        agentSlug: selectedAgentSlug,
        prompt: text,
        patientId: selectedPatientId || null,
        threadId,
      });
      setThreadId(res.threadId);
      setChatLog((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          sources: res.sourcesUsed,
          memories: res.memoriesSaved,
        },
      ]);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Falha ao consultar agente.');
    } finally {
      setIsRunningAgent(false);
    }
  };

  const handleQuickSocialGenerate = async () => {
    if (!promptInput.trim()) return;
    setIsRunningAgent(true);
    try {
      const data = await generateContentAction(promptInput.trim(), socialFormat);
      setSocialResult(data);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar roteiro.');
    } finally {
      setIsRunningAgent(false);
    }
  };

  const handleSaveAgentConfig = async () => {
    try {
      await saveAgentConfigAction({
        slug: selectedAgentSlug,
        systemPrompt: editPrompt,
        deliveryMode: editDeliveryMode,
        autoMemory: editAutoMemory,
        webhookUrl: editWebhook,
      });
      setShowAgentSettings(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!kTitle) setKTitle(file.name.replace(/\.[^.]+$/, ''));

    setSelectedFile(file);
    setPdfFileName(file.name);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setKType('pdf');
    } else {
      setKType('text');
      const reader = new FileReader();
      reader.onload = () => {
        setKContent(String(reader.result || ''));
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kTitle.trim()) return;
    setIsIndexing(true);
    setUploadStatusText('Iniciando processamento...');

    try {
      let resultData: any = null;

      // Upload em blocos de 512 KB quando houver arquivo PDF selecionado (nunca estoura limite de 1MB do Nginx/Next)
      if (selectedFile && kType === 'pdf') {
        const CHUNK_SIZE = 512 * 1024; // 512 KB por requisição
        const totalChunks = Math.max(1, Math.ceil(selectedFile.size / CHUNK_SIZE));
        const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        for (let idx = 0; idx < totalChunks; idx++) {
          const pct = Math.round(((idx + 1) / totalChunks) * 100);
          setUploadStatusText(`Enviando arquivo PDF (${pct}%)...`);

          const slice = selectedFile.slice(idx * CHUNK_SIZE, (idx + 1) * CHUNK_SIZE);
          const fd = new FormData();
          fd.append('action', 'chunk');
          fd.append('uploadId', uploadId);
          fd.append('chunkIndex', String(idx));
          fd.append('chunk', slice, selectedFile.name);

          const chunkRes = await fetch('/api/knowledge/upload', {
            method: 'POST',
            body: fd,
          });
          const chunkJson = await chunkRes.json().catch(() => null);
          if (!chunkRes.ok || !chunkJson?.success) {
            throw new Error(chunkJson?.error || `Falha ao enviar parte ${idx + 1} do PDF.`);
          }
        }

        setUploadStatusText('Extraindo texto integral do PDF com IA e gerando blocos vetoriais...');
        const finRes = await fetch('/api/knowledge/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'finalize_file',
            uploadId,
            fileName: selectedFile.name,
            title: kTitle,
            domainScope: serializeScopeList(kSelectedAgents),
            authorOrRef: kAuthor,
            tags: kTags,
            isPinned: kPinned,
          }),
        });
        resultData = await finRes.json().catch(() => null);
        if (!finRes.ok || !resultData?.success) {
          throw new Error(
            resultData?.error || 'Falha ao extrair e indexar o conteúdo do PDF.'
          );
        }
      } else {
        setUploadStatusText('Indexando conteúdo e vetores na Base B.E.M....');
        const directRes = await fetch('/api/knowledge/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'direct',
            title: kTitle,
            sourceType: kType,
            domainScope: serializeScopeList(kSelectedAgents),
            authorOrRef: kAuthor,
            sourceUrl: kUrl,
            rawContent: kContent,
            tags: kTags,
            isPinned: kPinned,
          }),
        });
        resultData = await directRes.json().catch(() => null);
        if (!directRes.ok || !resultData?.success) {
          throw new Error(resultData?.error || 'Erro ao indexar conhecimento.');
        }
      }

      setKTitle('');
      setKAuthor('');
      setKUrl('');
      setKTags('');
      setKContent('');
      setSelectedFile(null);
      setPdfFileName('');
      setKPinned(false);
      setUploadStatusText('');
      alert(`Conhecimento indexado com sucesso em ${resultData.chunkCount} bloco(s) semânticos!`);
      router.refresh();
    } catch (err: any) {
      alert(err?.message || 'Erro ao indexar conhecimento.');
    } finally {
      setIsIndexing(false);
      setUploadStatusText('');
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemTitle.trim() || !newMemContent.trim()) return;
    setIsSavingMem(true);
    try {
      await addStructuredMemoryAction({
        scope: newMemScope,
        patientId: newMemScope === 'atendimento' ? newMemPatientId || null : null,
        category: newMemCategory,
        title: newMemTitle,
        content: newMemContent,
        importance: newMemImportance,
      });
      setNewMemTitle('');
      setNewMemContent('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingMem(false);
    }
  };

  const handleBuildProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progGoal.trim()) return;
    setIsBuildingProgram(true);
    try {
      const res = await createProgramAction({
        patientId: selectedPatientId || null,
        themeOrGoal: progGoal,
        durationDays: progDays,
        deliveryMode: progDeliveryMode,
        sendFirstDayNow: Boolean(selectedPatientId && progSendDay1),
      });
      setProgGoal('');
      alert(
        `Jornada "${res.title}" criada com sucesso!${
          res.dispatchStatus === 'pending_review'
            ? ' O Dia 1 aguarda sua aprovação na aba Fila de Revisão.'
            : res.dispatchStatus === 'sent'
            ? ' O Dia 1 já foi enviado automaticamente no WhatsApp do paciente!'
            : ''
        }`
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsBuildingProgram(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const getAgentIcon = (slug: AgentSlug) => {
    if (slug === 'marketing') return Megaphone;
    if (slug === 'pos_sessao') return HeartHandshake;
    if (slug === 'expansao') return Compass;
    return TrendingUp;
  };

  const filteredMemories = memories.filter((m) => {
    if (memScopeFilter !== 'all' && m.scope !== memScopeFilter) return false;
    if (memPatientFilter && m.patientId !== memPatientFilter) return false;
    return true;
  });

  const filteredKnowledge = knowledgeSources.filter((k) => {
    if (kFilterScope === 'all_filter') return true;
    if (kFilterScope === 'all') return k.domainScope === 'all';
    const list = parseScopeList(k.domainScope);
    return k.domainScope === 'all' || list.includes(kFilterScope as AgentSlug);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Cabeçalho Principal */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Ecossistema de Inteligência B.E.M.
          </div>
          <h1 className="text-xl font-bold text-[#222924]">
            Central de Agentes, Conhecimento & Memória Estruturada
          </h1>
          <p className="text-xs text-[#6B726B] mt-1">
            Alimente seus agentes com notas de seminários, PDFs e referências da técnica B.E.M., gerencie memórias isoladas e conecte ao n8n.
          </p>
        </div>

        {/* Navegação das 5 Abas */}
        <div className="flex flex-wrap gap-1.5 bg-[#FBF9F5] p-1.5 rounded-2xl border border-[#E8E5DF]">
          {[
            { id: 'agents', label: 'Agentes B.E.M.', icon: Sparkles },
            { id: 'tones', label: `Tons de Conversa (${tonePresets.length})`, icon: HeartHandshake },
            { id: 'knowledge', label: `Conhecimento (${knowledgeSources.length})`, icon: BookOpen },
            { id: 'memories', label: `Memórias (${memories.length})`, icon: Brain },
            {
              id: 'dispatches',
              label: `Revisão & Jornadas${pendingReviewCount > 0 ? ` (${pendingReviewCount})` : ''}`,
              icon: Send,
            },
            { id: 'n8n', label: 'API & n8n', icon: Webhook },
          ].map((t) => {
            const Icon = t.icon;
            const active = mainTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setMainTab(t.id as any)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  active
                    ? 'bg-[#1F4D36] text-white shadow-sm'
                    : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= ABA 1: ESTÚDIO DOS 4 AGENTES ================= */}
      {mainTab === 'agents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Lateral: Seleção do Agente + Contexto de Paciente */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B726B] block px-1">
                Escolha o Agente Especialista
              </span>
              {agents.map((ag) => {
                const Icon = getAgentIcon(ag.slug);
                const isSelected = ag.slug === selectedAgentSlug;
                return (
                  <button
                    key={ag.slug}
                    type="button"
                    onClick={() => selectAgent(ag.slug)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-[#1F4D36] bg-[#EBF3ED]/70 ring-2 ring-[#1F4D36]/15'
                        : 'border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-[#1F4D36] text-white' : 'bg-white text-[#6B726B]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#222924] truncate">
                          {ag.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                            ag.deliveryMode === 'auto'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-white text-[#1F4D36] border border-[#1F4D36]/20'
                          }`}
                        >
                          {ag.deliveryMode === 'auto' ? 'Auto' : 'Revisão'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B726B] line-clamp-2 mt-0.5">
                        {ag.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Seletor Opcional de Paciente para Memória Individual */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-2">
              <label className="text-xs font-bold text-[#222924] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#1F4D36]" />
                Vincular Paciente (Memória Individual LGPD)
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924]"
              >
                <option value="">Sem paciente específico (Uso geral do consultório)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B726B]">
                Ao selecionar um paciente, o agente carrega automaticamente o histórico de sessões e a memória criptografada dele.
              </p>
            </div>

            {/* Construtor Rápido de Jornadas/Desafios quando em Expansão */}
            {selectedAgentSlug === 'expansao' && (
              <form
                onSubmit={handleBuildProgram}
                className="bg-white p-4 rounded-2xl border border-[#1F4D36]/30 shadow-sm space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#1F4D36]">
                  <Compass className="w-4 h-4" />
                  Gerador Estruturado de Jornada / Desafio
                </div>
                <input
                  type="text"
                  required
                  value={progGoal}
                  onChange={(e) => setProgGoal(e.target.value)}
                  placeholder="Ex: Dissolver Medo de Crítica e ancorar presença..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#6B726B]">Duração</label>
                    <select
                      value={progDays}
                      onChange={(e) => setProgDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                    >
                      <option value={7}>7 Dias</option>
                      <option value={14}>14 Dias</option>
                      <option value={21}>21 Dias</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#6B726B]">Modo de Envio</label>
                    <select
                      value={progDeliveryMode}
                      onChange={(e) => setProgDeliveryMode(e.target.value as 'review' | 'auto')}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                    >
                      <option value="review">Revisão Humana</option>
                      <option value="auto">Disparo Direto</option>
                    </select>
                  </div>
                </div>
                {selectedPatientId && (
                  <label className="flex items-center gap-2 text-[11px] text-[#222924]">
                    <input
                      type="checkbox"
                      checked={progSendDay1}
                      onChange={(e) => setProgSendDay1(e.target.checked)}
                    />
                    Já preparar/disparar o Dia 1 no WhatsApp
                  </label>
                )}
                <button
                  type="submit"
                  disabled={isBuildingProgram}
                  className="w-full py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50"
                >
                  {isBuildingProgram ? 'Montando Jornada B.E.M....' : 'Criar Programa Completo'}
                </button>
              </form>
            )}
          </div>

          {/* Coluna Principal: Console Interativo do Agente */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-col min-h-[580px]">
            {/* Barra do Agente */}
            <div className="p-4 border-b border-[#E8E5DF] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#222924]">{currentAgent?.name}</h2>
                <p className="text-[11px] text-[#6B726B]">
                  Modo atual:{' '}
                  <strong className="text-[#1F4D36]">
                    {currentAgent?.deliveryMode === 'auto'
                      ? 'Disparo Direto Automático'
                      : 'Revisão Humana antes de enviar'}
                  </strong>{' '}
                  • Memória Automática: {currentAgent?.autoMemory ? 'Ativa' : 'Manual'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setThreadId(null);
                    setChatLog([]);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] text-xs text-[#6B726B] hover:bg-gray-50 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Nova Conversa
                </button>
                <button
                  type="button"
                  onClick={() => setShowAgentSettings(!showAgentSettings)}
                  className="px-3 py-1.5 rounded-lg bg-[#FBF9F5] border border-[#E8E5DF] text-xs font-semibold text-[#222924] hover:bg-[#EBF3ED] flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-[#1F4D36]" /> Configurar Agente
                </button>
              </div>
            </div>

            {/* Painel retrátil de configuração do Agente */}
            {showAgentSettings && (
              <div className="p-4 bg-[#FBF9F5] border-b border-[#E8E5DF] space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#222924] mb-1">
                    Instruções Específicas deste Agente (System Prompt)
                  </label>
                  <textarea
                    rows={4}
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-[#222924] mb-1">
                      Regra de Envio de Mensagens
                    </label>
                    <select
                      value={editDeliveryMode}
                      onChange={(e) => setEditDeliveryMode(e.target.value as 'review' | 'auto')}
                      className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs"
                    >
                      <option value="review">Exigir Revisão Humana (Aprovar antes)</option>
                      <option value="auto">Disparo Direto Automático (WhatsApp/n8n)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#222924] mb-1">
                      Webhook n8n dedicado (opcional)
                    </label>
                    <input
                      type="url"
                      value={editWebhook}
                      onChange={(e) => setEditWebhook(e.target.value)}
                      placeholder="https://seu-n8n.../webhook/..."
                      className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-[#222924]">
                      <input
                        type="checkbox"
                        checked={editAutoMemory}
                        onChange={(e) => setEditAutoMemory(e.target.checked)}
                      />
                      Auto-gravar memória
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveAgentConfig}
                      className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A]"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sugestões Rápidas */}
            <div className="px-4 pt-3 flex flex-wrap gap-1.5">
              {(QUICK_PROMPTS_BY_AGENT[selectedAgentSlug] || []).map((qp) => (
                <button
                  key={qp}
                  type="button"
                  onClick={() => handleRunAgent(qp)}
                  disabled={isRunningAgent}
                  className="text-[11px] bg-[#FBF9F5] hover:bg-[#EBF3ED] text-[#222924] hover:text-[#1F4D36] px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] transition-all text-left"
                >
                  ✨ {qp}
                </button>
              ))}
            </div>

            {/* Área de Mensagens */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[460px]">
              {chatLog.length === 0 && !socialResult ? (
                <div className="text-center py-14 text-[#6B726B] space-y-2">
                  <Sparkles className="w-9 h-9 text-[#1F4D36]/40 mx-auto" />
                  <p className="text-sm font-semibold text-[#222924]">
                    {currentAgent?.name} pronto para trabalhar
                  </p>
                  <p className="text-xs max-w-md mx-auto">
                    Todas as respostas consultam automaticamente sua Biblioteca de Conhecimento B.E.M. e o Cofre de Memória Estruturada deste escopo.
                  </p>
                </div>
              ) : (
                chatLog.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-2xl text-xs space-y-2.5 ${
                      msg.role === 'user'
                        ? 'bg-[#EBF3ED] text-[#1F4D36] ml-8 font-medium'
                        : 'bg-[#FBF9F5] border border-[#E8E5DF] text-[#222924] mr-4'
                    }`}
                  >
                    <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>

                    {msg.role === 'assistant' && (
                      <div className="pt-2 border-t border-[#E8E5DF] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources?.map((src, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#E8E5DF] text-[#6B726B]"
                            >
                              📚 {src}
                            </span>
                          ))}
                          {msg.memories?.map((m, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold"
                            >
                              🧠 Memória salva ({m.scope}): {m.title}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyText(msg.content)}
                            className="text-[11px] font-semibold text-[#1F4D36] hover:underline flex items-center gap-1"
                          >
                            {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            Copiar
                          </button>
                          {selectedPatientId && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await queueDirectAgentReplyAction({
                                  agentSlug: selectedAgentSlug,
                                  patientId: selectedPatientId,
                                  title: `Mensagem ${currentAgent?.name}`,
                                  messageText: msg.content,
                                });
                                alert(
                                  res.status === 'sent'
                                    ? 'Enviada diretamente para o WhatsApp do paciente!'
                                    : 'Adicionada à Fila de Revisão para sua aprovação final!'
                                );
                                router.refresh();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#1F4D36] text-white text-[11px] font-semibold hover:bg-[#183C2A] flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              {currentAgent?.deliveryMode === 'auto'
                                ? 'Disparar no WhatsApp'
                                : 'Enviar p/ Revisão'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {socialResult && (
                <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-[#1F4D36]">{socialResult.title}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          `${socialResult.title}\n\n${socialResult.hook}\n\n${(
                            socialResult.slidesOrScript || []
                          ).join('\n')}\n\n${socialResult.caption}`
                        )
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#E8E5DF] bg-white font-semibold"
                    >
                      Copiar Roteiro
                    </button>
                  </div>
                  <p className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950">
                    <strong>Gancho:</strong> {socialResult.hook}
                  </p>
                  <div className="space-y-1.5">
                    {(socialResult.slidesOrScript || []).map((s: string, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-white border border-[#E8E5DF]">
                        <strong>Parte {idx + 1}:</strong> {s}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-[#E8E5DF] whitespace-pre-line">
                    {socialResult.caption}
                  </div>
                </div>
              )}
            </div>

            {/* Caixa de Entrada */}
            <div className="p-4 border-t border-[#E8E5DF] space-y-2">
              {selectedAgentSlug === 'marketing' && (
                <div className="flex items-center justify-between text-[11px] text-[#6B726B]">
                  <div className="flex items-center gap-1.5">
                    <span>Formato rápido opcional:</span>
                    {(['carousel', 'reels', 'post'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSocialFormat(fmt)}
                        className={`px-2 py-0.5 rounded border ${
                          socialFormat === fmt
                            ? 'bg-[#1F4D36] text-white border-[#1F4D36]'
                            : 'bg-white border-[#E8E5DF]'
                        }`}
                      >
                        {fmt === 'carousel' ? 'Carrossel' : fmt === 'reels' ? 'Reels' : 'Post'}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickSocialGenerate}
                    disabled={isRunningAgent || !promptInput.trim()}
                    className="text-[#1F4D36] font-bold hover:underline disabled:opacity-40"
                  >
                    Gerar em Cards de Post →
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleRunAgent();
                    }
                  }}
                  placeholder="Converse com o agente, peça análises, conteúdos, devolutivas ou metodologias B.E.M...."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/25"
                />
                <button
                  type="button"
                  onClick={() => handleRunAgent()}
                  disabled={isRunningAgent || !promptInput.trim()}
                  className="px-5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  {isRunningAgent ? 'Pensando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA TONS DE CONVERSA (PROMPTS EDITÁVEIS) ================= */}
      {mainTab === 'tones' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Criar Novo Tom Personalizado */}
          <div className="lg:col-span-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newToneName.trim() || !newTonePrompt.trim()) return;
                setSavingToneId('new');
                try {
                  const res = await createTonePresetAction({
                    name: newToneName,
                    prompt: newTonePrompt,
                  });
                  if (res.tone) {
                    setEditableTones((prev) => ({
                      ...prev,
                      [res.tone.id]: { name: res.tone.name, prompt: res.tone.prompt },
                    }));
                  }
                  setNewToneName('');
                  setNewTonePrompt('');
                  router.refresh();
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setSavingToneId(null);
                }
              }}
              className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4"
            >
              <div className="border-b border-[#E8E5DF] pb-3">
                <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#1F4D36]" />
                  Criar Novo Tom de Conversa
                </h2>
                <p className="text-[11px] text-[#6B726B] mt-0.5">
                  Defina novos estilos de escrita para escolher ao gerar o feedback pós-sessão no Prontuário.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Nome do Tom *
                </label>
                <input
                  type="text"
                  required
                  value={newToneName}
                  onChange={(e) => setNewToneName(e.target.value)}
                  placeholder="Ex: Acolhedor Poético, Direto e Prático..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Prompt de Instrução do Tom *
                </label>
                <textarea
                  rows={5}
                  required
                  value={newTonePrompt}
                  onChange={(e) => setNewTonePrompt(e.target.value)}
                  placeholder="Descreva exatamente como a IA deve conduzir o vocabulário, ritmo, abertura e fechamento da mensagem neste tom..."
                  className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={savingToneId === 'new'}
                className="w-full py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {savingToneId === 'new' ? 'Adicionando...' : 'Adicionar Tom de Conversa'}
              </button>
            </form>
          </div>

          {/* Coluna Direita: Lista de Tons com Prompts Editáveis */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
              <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#1F4D36]" />
                Prompts de Cada Tom de Conversa ({tonePresets.length})
              </h2>
              <p className="text-xs text-[#6B726B] mt-0.5">
                Personalize livremente o prompt de cada tom (ex.: Descontraído, Formal e Elegante, Formal e Técnico, Holístico Energético). Ao gerar o feedback dentro da edição de uma sessão, o Agente Pós-Sessão seguirá exatamente o prompt do tom selecionado.
              </p>
            </div>

            {tonePresets.map((tp) => {
              const local = editableTones[tp.id] ?? { name: tp.name, prompt: tp.prompt };
              const isSavingThis = savingToneId === tp.id;
              const isSavedOk = savedToneFeedbackId === tp.id;

              return (
                <div
                  key={tp.id}
                  className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-[#6B726B] mb-1">
                        Título do Tom
                      </label>
                      <input
                        type="text"
                        value={local.name}
                        onChange={(e) =>
                          setEditableTones((prev) => ({
                            ...prev,
                            [tp.id]: { ...local, name: e.target.value },
                          }))
                        }
                        className="w-full sm:max-w-sm px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs font-bold text-[#222924]"
                      />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isSavedOk && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Salvo!
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isSavingThis}
                        onClick={async () => {
                          setSavingToneId(tp.id);
                          try {
                            await updateTonePresetAction({
                              id: tp.id,
                              name: local.name,
                              prompt: local.prompt,
                            });
                            setSavedToneFeedbackId(tp.id);
                            setTimeout(() => setSavedToneFeedbackId(null), 2500);
                            router.refresh();
                          } catch (err: any) {
                            alert(err.message);
                          } finally {
                            setSavingToneId(null);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50"
                      >
                        {isSavingThis ? 'Salvando...' : 'Salvar Prompt'}
                      </button>

                      {tonePresets.length > 1 && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Deseja excluir o tom "${local.name}"?`)) return;
                            try {
                              await deleteTonePresetAction(tp.id);
                              router.refresh();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                          title="Excluir tom"
                          className="p-1.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B726B] mb-1">
                      Prompt de Estilo deste Tom
                    </label>
                    <textarea
                      rows={3}
                      value={local.prompt}
                      onChange={(e) =>
                        setEditableTones((prev) => ({
                          ...prev,
                          [tp.id]: { ...local, prompt: e.target.value },
                        }))
                      }
                      className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/25"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= ABA 2: BIBLIOTECA & CONHECIMENTO B.E.M. ================= */}
      {mainTab === 'knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Filosofia Mestra + Formulário de Alimentação */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1F4D36]" />
                  Constituição Filosófica do B.E.M.
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36] font-semibold">
                  Sempre Ativa em Todos os Agentes
                </span>
              </div>
              <textarea
                rows={6}
                value={philosophyText}
                onChange={(e) => setPhilosophyText(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] leading-relaxed"
              />
              <button
                type="button"
                disabled={isSavingPhilosophy}
                onClick={async () => {
                  setIsSavingPhilosophy(true);
                  await saveCorePhilosophyAndAutomationAction({
                    aiCorePhilosophy: philosophyText,
                  });
                  setIsSavingPhilosophy(false);
                  alert('Diretrizes mestras da filosofia B.E.M. atualizadas!');
                }}
                className="w-full py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A]"
              >
                {isSavingPhilosophy ? 'Salvando...' : 'Salvar Filosofia Central B.E.M.'}
              </button>
            </div>

            <form
              onSubmit={handleAddKnowledge}
              className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-3.5"
            >
              <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#1F4D36]" />
                Adicionar Conhecimento (Seminários, PDFs, Livros e Links)
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { id: 'seminar_note', label: 'Nota de Seminário' },
                  { id: 'pdf', label: 'Arquivo PDF/TXT' },
                  { id: 'bibliography', label: 'Ref. Bibliográfica' },
                  { id: 'directive', label: 'Instrução Fixa' },
                  { id: 'url', label: 'Link / Artigo' },
                  { id: 'text', label: 'Texto / Apostila' },
                ].map((tp) => (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => setKType(tp.id as any)}
                    className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all ${
                      kType === tp.id
                        ? 'bg-[#1F4D36] text-white border-[#1F4D36]'
                        : 'bg-[#FBF9F5] text-[#6B726B] border-[#E8E5DF]'
                    }`}
                  >
                    {tp.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#222924] mb-1">
                  Título do Material ou Insight
                </label>
                <input
                  type="text"
                  required
                  value={kTitle}
                  onChange={(e) => setKTitle(e.target.value)}
                  placeholder="Ex: Anotações Seminário B.E.M. — Leitura Corporal do Medo de Abandono"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#222924] mb-1">
                  Autor / Livro / Seminário
                </label>
                <input
                  type="text"
                  value={kAuthor}
                  onChange={(e) => setKAuthor(e.target.value)}
                  placeholder="Ex: Seminário Piracicaba 2025 / M.T. Morter Jr."
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-[#222924]">
                    Quais Agentes usam? (Múltipla Escolha)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (kSelectedAgents.length === ALL_AGENT_SCOPE_OPTIONS.length) {
                        setKSelectedAgents(['pos_sessao']);
                      } else {
                        setKSelectedAgents(ALL_AGENT_SCOPE_OPTIONS.map((o) => o.slug));
                      }
                    }}
                    className="text-[11px] font-semibold text-[#1F4D36] hover:underline"
                  >
                    {kSelectedAgents.length === ALL_AGENT_SCOPE_OPTIONS.length
                      ? 'Selecionar individualmente'
                      : 'Marcar todos os agentes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF]">
                  {ALL_AGENT_SCOPE_OPTIONS.map((opt) => {
                    const checked = kSelectedAgents.includes(opt.slug);
                    return (
                      <label
                        key={opt.slug}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          checked
                            ? 'bg-[#EBF3ED] border-[#1F4D36]/40 text-[#1F4D36] font-semibold'
                            : 'bg-white border-[#E8E5DF] text-[#6B726B] hover:text-[#222924]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              if (kSelectedAgents.length > 1) {
                                setKSelectedAgents(
                                  kSelectedAgents.filter((s) => s !== opt.slug)
                                );
                              }
                            } else {
                              setKSelectedAgents([...kSelectedAgents, opt.slug]);
                            }
                          }}
                          className="w-3.5 h-3.5 accent-[#1F4D36]"
                        />
                        <span className="truncate">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {(kType === 'pdf' || kType === 'text') && (
                <div className="p-3 rounded-xl border border-dashed border-[#1F4D36]/40 bg-[#EBF3ED]/30 space-y-1.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#1F4D36] cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>
                      {pdfFileName
                        ? `PDF selecionado: ${pdfFileName}`
                        : 'Selecionar arquivo (.pdf, .txt, .md)'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-[#6B726B]">
                    Arquivos PDF têm seu texto extraído integralmente e indexado em blocos vetoriais.
                  </p>
                </div>
              )}

              {kType === 'url' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#222924] mb-1">
                    URL de Referência
                  </label>
                  <input
                    type="url"
                    required
                    value={kUrl}
                    onChange={(e) => setKUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                  />
                </div>
              )}

              {kType !== 'url' && kType !== 'pdf' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#222924] mb-1">
                    Conteúdo / Anotações / Trechos Bibliográficos
                  </label>
                  <textarea
                    rows={6}
                    required={!selectedFile}
                    value={kContent}
                    onChange={(e) => setKContent(e.target.value)}
                    placeholder="Cole suas anotações soltas de seminário, citações comentadas ou orientações técnicas..."
                    className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={kTags}
                  onChange={(e) => setKTags(e.target.value)}
                  placeholder="Tags opcionais (ex: abandono, respiração, timeline)"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
                <label className="flex items-center gap-1.5 text-xs font-medium text-[#222924] shrink-0">
                  <input
                    type="checkbox"
                    checked={kPinned}
                    onChange={(e) => setKPinned(e.target.checked)}
                  />
                  Fixar sempre
                </label>
              </div>

              <button
                type="submit"
                disabled={isIndexing}
                className="w-full py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50"
              >
                {isIndexing
                  ? uploadStatusText || 'Extraindo e Indexando Conhecimento...'
                  : 'Indexar na Base B.E.M.'}
              </button>
            </form>
          </div>

          {/* Coluna Direita: Acervo Indexado */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#222924]">
                  Acervo Indexado ({filteredKnowledge.length})
                </h3>
                <p className="text-[11px] text-[#6B726B]">
                  Além destes itens, o catálogo completo de Emoções & Protocolos do sistema já está conectado nativamente.
                </p>
              </div>
              <select
                value={kFilterScope}
                onChange={(e) => setKFilterScope(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              >
                <option value="all_filter">Todos os escopos</option>
                <option value="all">Globais (all)</option>
                <option value="pos_sessao">Pós-Sessão</option>
                <option value="expansao">Expansão</option>
                <option value="marketing">Marketing</option>
                <option value="gestao">Gestão</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredKnowledge.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-[#E8E5DF] text-center text-xs text-[#6B726B]">
                  Nenhuma fonte adicionada neste filtro ainda. Comece colando uma nota de seminário ou enviando um PDF ao lado!
                </div>
              ) : (
                filteredKnowledge.map((k) => (
                  <div
                    key={k.id}
                    className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EBF3ED] text-[#1F4D36]">
                            {k.sourceType}
                          </span>
                          <button
                            type="button"
                            title="Clique para escolher quais agentes usam este material"
                            onClick={() => {
                              if (editingScopeSourceId === k.id) {
                                setEditingScopeSourceId(null);
                              } else {
                                setEditingScopeSourceId(k.id);
                                setEditingScopeSelection(parseScopeList(k.domainScope));
                              }
                            }}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 hover:bg-[#EBF3ED] text-gray-700 hover:text-[#1F4D36] transition-all cursor-pointer"
                          >
                            Agentes: {formatScopeLabel(k.domainScope)} ✎
                          </button>
                          <span className="text-[10px] text-[#6B726B]">
                            {k.chunkCount} bloco(s) • {k.updatedAt}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#222924] mt-1">{k.title}</h4>
                        {k.authorOrRef && (
                          <p className="text-[11px] font-medium text-[#D97736]">
                            Referência: {k.authorOrRef}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={k.isPinned ? 'Desafixar' : 'Fixar como diretriz obrigatória'}
                          onClick={() => toggleKnowledgePinAction(k.id, !k.isPinned)}
                          className={`p-1.5 rounded-lg border ${
                            k.isPinned
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'border-[#E8E5DF] text-gray-400 hover:text-gray-700'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover "${k.title}" da base de conhecimento?`)) {
                              deleteKnowledgeSourceAction(k.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {editingScopeSourceId === k.id && (
                      <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#1F4D36]/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#1F4D36]">
                            Quais agentes usam "{k.title}"?
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingScopeSelection(
                                ALL_AGENT_SCOPE_OPTIONS.map((o) => o.slug)
                              )
                            }
                            className="text-[10px] font-semibold text-[#1F4D36] hover:underline"
                          >
                            Marcar todos
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_AGENT_SCOPE_OPTIONS.map((opt) => {
                            const active = editingScopeSelection.includes(opt.slug);
                            return (
                              <button
                                key={opt.slug}
                                type="button"
                                onClick={() => {
                                  if (active && editingScopeSelection.length > 1) {
                                    setEditingScopeSelection(
                                      editingScopeSelection.filter((s) => s !== opt.slug)
                                    );
                                  } else if (!active) {
                                    setEditingScopeSelection([
                                      ...editingScopeSelection,
                                      opt.slug,
                                    ]);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
                                  active
                                    ? 'bg-[#1F4D36] text-white border-[#1F4D36]'
                                    : 'bg-white text-[#6B726B] border-[#E8E5DF]'
                                }`}
                              >
                                {active ? '✓ ' : '+ '}
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingScopeSourceId(null)}
                            className="px-2.5 py-1 rounded-lg border border-[#E8E5DF] bg-white text-[11px] text-[#6B726B]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await updateKnowledgeScopeAction(
                                k.id,
                                serializeScopeList(editingScopeSelection)
                              );
                              setEditingScopeSourceId(null);
                              router.refresh();
                            }}
                            className="px-3 py-1 rounded-lg bg-[#1F4D36] text-white text-[11px] font-bold"
                          >
                            Salvar Agentes
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-[#6B726B] bg-[#FBF9F5] p-2.5 rounded-xl border border-[#E8E5DF]">
                      {k.excerpt}...
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 3: COFRE DE MEMÓRIAS ESTRUTURADAS ================= */}
      {mainTab === 'memories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Registrar Memória Manualmente */}
          <form
            onSubmit={handleAddMemory}
            className="lg:col-span-4 bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-3.5 h-fit"
          >
            <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#1F4D36]" />
              Registrar Memória Estruturada
            </h2>

            <div>
              <label className="block text-[11px] font-bold text-[#222924] mb-1">
                Cofre / Escopo da Memória
              </label>
              <select
                value={newMemScope}
                onChange={(e) => setNewMemScope(e.target.value as MemoryScope)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              >
                <option value="atendimento">Atendimento (Memória Individual por Paciente)</option>
                <option value="expansao">Expansão da Consciência (Metodologias)</option>
                <option value="marketing">Marketing & Posicionamento</option>
                <option value="gestao">Gestão do Consultório</option>
              </select>
            </div>

            {newMemScope === 'atendimento' && (
              <div>
                <label className="block text-[11px] font-bold text-[#222924] mb-1">
                  Paciente (Criptografia AES-256-GCM)
                </label>
                <select
                  required
                  value={newMemPatientId}
                  onChange={(e) => setNewMemPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                >
                  <option value="">Selecione o paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#222924] mb-1">Categoria</label>
                <input
                  type="text"
                  value={newMemCategory}
                  onChange={(e) => setNewMemCategory(e.target.value)}
                  placeholder="Ex: padrao_emocional, tom_voz"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#222924] mb-1">
                  Importância (1–5)
                </label>
                <select
                  value={newMemImportance}
                  onChange={(e) => setNewMemImportance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      Nível {n} {n === 5 ? '(Crítica)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#222924] mb-1">
                Chave / Título Curto
              </label>
              <input
                type="text"
                required
                value={newMemTitle}
                onChange={(e) => setNewMemTitle(e.target.value)}
                placeholder="Ex: Responde melhor a exercícios respiratórios curtos"
                className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#222924] mb-1">
                Registro Estruturado
              </label>
              <textarea
                rows={4}
                required
                value={newMemContent}
                onChange={(e) => setNewMemContent(e.target.value)}
                placeholder="Descreva o aprendizado, padrão ou regra que o agente deve sempre lembrar neste escopo..."
                className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingMem}
              className="w-full py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A]"
            >
              {isSavingMem ? 'Gravando no Cofre...' : 'Salvar Memória'}
            </button>
          </form>

          {/* Listagem dos Cofres */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Todos os Cofres' },
                  { id: 'atendimento', label: 'Atendimento (Por Paciente)' },
                  { id: 'expansao', label: 'Expansão da Consciência' },
                  { id: 'marketing', label: 'Marketing' },
                  { id: 'gestao', label: 'Gestão' },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setMemScopeFilter(sc.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      memScopeFilter === sc.id
                        ? 'bg-[#1F4D36] text-white'
                        : 'bg-[#FBF9F5] text-[#6B726B] border border-[#E8E5DF]'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              <select
                value={memPatientFilter}
                onChange={(e) => setMemPatientFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              >
                <option value="">Filtrar por paciente (todos)</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5">
              {filteredMemories.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-[#E8E5DF] text-center text-xs text-[#6B726B]">
                  Nenhuma memória estruturada encontrada neste filtro. Elas são criadas automaticamente nas sessões/conversas ou manualmente ao lado.
                </div>
              ) : (
                filteredMemories.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EBF3ED] text-[#1F4D36]">
                          {m.scope}
                        </span>
                        {m.patientName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            🔒 Paciente: {m.patientName}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {m.category} • Imp. {m.importance}/5 • Origem: {m.source}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#222924]">{m.title}</h4>
                      <p className="text-xs text-[#6B726B] leading-relaxed">{m.content}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleMemoryPinAction(m.id, !m.isPinned)}
                        className={`p-1.5 rounded-lg border ${
                          m.isPinned
                            ? 'bg-amber-50 border-amber-300 text-amber-700'
                            : 'border-[#E8E5DF] text-gray-400'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMemoryAction(m.id)}
                        className="p-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 4: FILA DE REVISÃO HUMANA & JORNADAS ATIVAS ================= */}
      {mainTab === 'dispatches' && (
        <div className="space-y-6">
          {/* Seletor Geral Revisão Humana vs Disparo Direto */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#222924]">
                Política Padrão de Envio aos Pacientes
              </h2>
              <p className="text-xs text-[#6B726B]">
                Escolha se os feedbacks pós-sessão e pílulas de programas devem parar nesta fila para sua revisão ou disparar direto no WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={globalDeliveryMode}
                onChange={async (e) => {
                  const mode = e.target.value as 'review' | 'auto';
                  setGlobalDeliveryMode(mode);
                  await saveCorePhilosophyAndAutomationAction({
                    aiDefaultDeliveryMode: mode,
                  });
                  router.refresh();
                }}
                className="px-3.5 py-2 rounded-xl border border-[#1F4D36] bg-[#EBF3ED] text-xs font-bold text-[#1F4D36]"
              >
                <option value="review">🛡️ Revisão Humana Obrigatória antes do WhatsApp</option>
                <option value="auto">⚡ Disparo Direto Automático no WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Fila de Mensagens */}
            <div className="lg:col-span-7 space-y-3">
              <h3 className="text-sm font-bold text-[#222924]">
                Fila de Aprovação & Histórico de Envios ({dispatches.length})
              </h3>
              {dispatches.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-[#E8E5DF] text-center text-xs text-[#6B726B]">
                  Nenhuma mensagem gerada na fila ainda. Gere uma devolutiva pós-sessão no Prontuário ou uma jornada de expansão!
                </div>
              ) : (
                dispatches.map((d) => {
                  const textVal = editedDispatches[d.id] ?? d.messageText;
                  const isPending = d.status === 'pending_review' || d.status === 'failed';
                  return (
                    <div
                      key={d.id}
                      className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              d.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700'
                                : d.status === 'pending_review'
                                ? 'bg-amber-50 text-amber-800'
                                : d.status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {d.status === 'sent'
                              ? '✓ Enviado no WhatsApp'
                              : d.status === 'pending_review'
                              ? '⏳ Aguardando sua Revisão'
                              : d.status === 'failed'
                              ? '⚠️ Falha no Envio'
                              : 'Descartado'}
                          </span>
                          <h4 className="text-xs font-bold text-[#222924] mt-1">
                            {d.title} • Paciente: {d.patientName}
                          </h4>
                          <span className="text-[10px] text-[#6B726B]">{d.createdAt}</span>
                        </div>
                      </div>

                      {isPending ? (
                        <textarea
                          rows={5}
                          value={textVal}
                          onChange={(e) =>
                            setEditedDispatches({ ...editedDispatches, [d.id]: e.target.value })
                          }
                          className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924]"
                        />
                      ) : (
                        <p className="text-xs text-[#6B726B] whitespace-pre-line bg-[#FBF9F5] p-3 rounded-xl border border-[#E8E5DF]">
                          {d.messageText}
                        </p>
                      )}

                      {d.errorMsg && (
                        <p className="text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {d.errorMsg}
                        </p>
                      )}

                      {isPending && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await rejectDispatchAction(d.id);
                              router.refresh();
                            }}
                            className="px-3 py-1.5 rounded-xl border border-[#E8E5DF] text-xs text-[#6B726B] hover:bg-gray-50"
                          >
                            Descartar
                          </button>
                          <button
                            type="button"
                            disabled={processingId === d.id}
                            onClick={async () => {
                              setProcessingId(d.id);
                              const res = await approveDispatchAction(d.id, textVal);
                              setProcessingId(null);
                              if (res.status === 'failed') {
                                alert(`Falha ao enviar via WhatsApp: ${res.error}`);
                              }
                              router.refresh();
                            }}
                            className="px-4 py-1.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {processingId === d.id
                              ? 'Enviando...'
                              : 'Aprovar e Enviar no WhatsApp'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Programas e Desafios Criados */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-sm font-bold text-[#222924]">
                Programas & Desafios de Autoconsciência ({programs.length})
              </h3>
              {programs.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-[#E8E5DF] text-center text-xs text-[#6B726B]">
                  Nenhum programa criado ainda. Use o Agente de Expansão da Consciência ou o Prontuário para montar jornadas de 7, 14 ou 21 dias!
                </div>
              ) : (
                programs.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF3ED] text-[#1F4D36]">
                        {p.patientName} • {p.deliveryMode === 'auto' ? 'Envio Direto' : 'Com Revisão'}
                      </span>
                      <span className="text-[11px] font-bold text-[#222924]">
                        Dia {p.currentDay}/{p.durationDays}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#222924]">{p.title}</h4>
                    <p className="text-[11px] text-[#6B726B]">{p.goal}</p>
                    {p.patientId && p.status === 'active' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await advanceProgramDayAction(p.id);
                          alert(
                            res.dispatchStatus === 'sent'
                              ? `Dia ${p.currentDay} enviado direto no WhatsApp!`
                              : `Dia ${p.currentDay} preparado na Fila de Revisão ao lado!`
                          );
                          router.refresh();
                        }}
                        className="w-full py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Processar Dia {p.currentDay} Agora
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ABA 5: API & AUTOMAÇÕES N8N ================= */}
      {mainTab === 'n8n' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
              <Webhook className="w-4 h-4 text-[#1F4D36]" />
              Credenciais & Conexão com n8n (Mesma VPS)
            </h2>

            <div>
              <label className="block text-[11px] font-bold text-[#222924] mb-1">
                Chave de API Exclusiva (`X-BEM-API-Key`)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={apiKeyState}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyText(apiKeyState)}
                  className="px-3 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold hover:bg-gray-50"
                >
                  Copiar
                </button>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Regenerar a chave invalidará fluxos antigos no n8n. Continuar?'))
                    return;
                  const res = await saveCorePhilosophyAndAutomationAction({
                    regenerateApiKey: true,
                  });
                  if (res.aiApiKey) setApiKeyState(res.aiApiKey);
                }}
                className="text-[11px] text-[#D97736] font-semibold mt-1 hover:underline"
              >
                Gerar nova chave secreta
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#222924] mb-1">
                Webhook Principal do n8n (Recebe eventos do B.E.M.)
              </label>
              <input
                type="url"
                value={n8nUrl}
                onChange={(e) => setN8nUrl(e.target.value)}
                placeholder="http://n8n:5678/webhook/bem-eventos"
                className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              />
              <p className="text-[10px] text-[#6B726B] mt-1">
                Dica na mesma VPS Docker: você pode usar o endereço interno <code>http://n8n:5678/webhook/...</code> sem latência externa!
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await saveCorePhilosophyAndAutomationAction({ n8nWebhookUrl: n8nUrl });
                  setWebhookStatusMsg('Configuração salva com sucesso!');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A]"
              >
                Salvar Webhook
              </button>
              <button
                type="button"
                onClick={async () => {
                  await saveCorePhilosophyAndAutomationAction({ n8nWebhookUrl: n8nUrl });
                  const res = await testN8nWebhookAction();
                  setWebhookStatusMsg(
                    res.triggered
                      ? `Evento enviado ao n8n (HTTP ${res.status})!`
                      : `Não disparado: ${res.error || 'Defina uma URL válida'}`
                  );
                }}
                className="px-4 py-2.5 rounded-xl border border-[#1F4D36] text-[#1F4D36] text-xs font-bold hover:bg-[#EBF3ED]"
              >
                Testar Disparo
              </button>
            </div>

            {webhookStatusMsg && (
              <p className="text-xs font-semibold text-[#1F4D36] bg-[#EBF3ED] p-2.5 rounded-xl">
                {webhookStatusMsg}
              </p>
            )}
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#222924]">
              Endpoints REST Prontos para o Nó HTTP Request do n8n
            </h3>
            <p className="text-xs text-[#6B726B]">
              Dentro da mesma rede Docker na VPS, o n8n pode chamar <code>http://bem-app:3000</code> (ou externamente <code>https://bem.edulara.com.br</code>) enviando o cabeçalho <code>X-BEM-API-Key: {apiKeyState.slice(0, 14)}...</code>
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-1">
                <div className="font-bold text-[#1F4D36]">
                  1. Acionar qualquer Agente B.E.M. com RAG + Memória (`POST /api/v1/agents/invoke`)
                </div>
                <pre className="text-[11px] overflow-x-auto bg-white p-2.5 rounded-lg border border-[#E8E5DF]">
{`{
  "agentSlug": "expansao",
  "patientPhone": "5519999999999",
  "prompt": "O paciente respondeu ao exercício do dia 2 dizendo que sentiu alívio no peito. Acolha e oriente."
}`}
                </pre>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-1">
                <div className="font-bold text-[#1F4D36]">
                  2. Consultar ou Salvar Memória Estruturada (`GET / POST /api/v1/memories`)
                </div>
                <pre className="text-[11px] overflow-x-auto bg-white p-2.5 rounded-lg border border-[#E8E5DF]">
{`{
  "scope": "atendimento",
  "patientPhone": "5519999999999",
  "category": "resposta_desafio",
  "title": "Relato de prática respiratória",
  "content": "Paciente relatou diminuição da ansiedade noturna após 3 dias do exercício B.E.M."
}`}
                </pre>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-1">
                <div className="font-bold text-[#1F4D36]">
                  3. Alimentar Base de Conhecimento via Automação (`POST /api/v1/knowledge`)
                </div>
                <pre className="text-[11px] overflow-x-auto bg-white p-2.5 rounded-lg border border-[#E8E5DF]">
{`{
  "title": "Nota de Áudio / Seminário via Telegram ou Drive",
  "sourceType": "seminar_note",
  "domainScope": "all",
  "authorOrRef": "Notas Eduardo",
  "rawContent": "Texto transcrito automaticamente pelo n8n..."
}`}
                </pre>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-1">
                <div className="font-bold text-[#1F4D36]">
                  4. Avançar Pílula Diária dos Programas Ativos (`POST /api/v1/programs/advance`)
                </div>
                <p className="text-[11px] text-[#6B726B]">
                  Ideal para um gatilho Cron diário às 08:00 no n8n: processa o próximo dia de todos os pacientes com programas ativos, respeitando se cada programa está em modo <strong>Revisão Humana</strong> ou <strong>Disparo Direto</strong>!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
