'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  Save,
  Lock,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Heart,
  Waves,
  Search,
  X,
  Plus,
  Calendar,
  Video,
  MapPin,
  BookOpen,
  Info,
  FileText,
  FileCheck,
  BookmarkPlus,
  Trash2,
  Settings,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { saveClinicalRecordAction, savePatientAnamnesisAction } from './actions';
import { getRootCategories, getSituationsByCategory } from '@/lib/protocols';
import { PatientAiPanel } from './PatientAiPanel';
import type { DecryptedMemoryItem } from '@/lib/ai/memory';

export interface EmocaoFrequenciaPar {
  emocao: string;
  frequenciaNumero?: string;
  frequenciaTitulo?: string;
}

export interface ApontamentoSituacao {
  categoria: string;
  situacao: string;
  complemento?: string;
  emocoes?: string[];
  pares?: EmocaoFrequenciaPar[];
}

interface HistoricalRecord {
  id: string;
  appointmentId?: string;
  rawDateStr?: string;
  rawTimeStr?: string;
  sessionDate: string;
  rawNotes?: string;
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  emocoesTrabalhadas?: string[];
  situacoes?: ApontamentoSituacao[];
  modality?: string;
  sessionType?: string;
  status?: string;
  price?: number;
  appointmentNotes?: string | null;
  isLocked: boolean;
}

interface EmotionItem {
  id: string;
  title: string;
  description: string;
  phrases?: string | null;
  code?: string;
  type: string;
}

interface FrequencyItem {
  id: string;
  number: string;
  title: string;
  description: string;
}

interface AnamnesisQuestionItem {
  id: string;
  question: string;
  hint?: string | null;
  fieldType: string;
}

interface ProtocolNodeItem {
  id: string;
  title: string;
  parentId: string | null;
  sortOrder: number;
}

export function ProntuarioView({
  patient,
  appointmentId,
  defaultSessionDateStr = '',
  defaultSessionTimeStr = '14:00',
  todayDateStr = '',
  nowTimeStr = '14:00',
  history = [],
  emotionsCatalog = [],
  frequenciesCatalog = [],
  protocolNodes = [],
  anamnesisQuestions = [],
  initialAnamnesisAnswers = {},
  patientMemories = [],
  patientPrograms = [],
  defaultDeliveryMode = 'review',
  aiAgentsEnabled = false,
  isSuperAdmin = false,
}: {
  patient: {
    id: string;
    name: string;
    notes?: string | null;
    modalityPreference?: string;
    sessionTypePreference?: string;
    packageTotalSessions?: number | null;
    packageUsedSessions?: number | null;
  };
  appointmentId?: string;
  defaultSessionDateStr?: string;
  defaultSessionTimeStr?: string;
  todayDateStr?: string;
  nowTimeStr?: string;
  history: HistoricalRecord[];
  emotionsCatalog?: EmotionItem[];
  frequenciesCatalog?: FrequencyItem[];
  protocolNodes?: ProtocolNodeItem[];
  anamnesisQuestions?: AnamnesisQuestionItem[];
  initialAnamnesisAnswers?: Record<string, string>;
  patientMemories?: DecryptedMemoryItem[];
  patientPrograms?: Array<{
    id: string;
    title: string;
    goal: string;
    durationDays: number;
    currentDay: number;
    deliveryMode: string;
    status: string;
    steps: any[];
  }>;
  defaultDeliveryMode?: 'review' | 'auto';
  aiAgentsEnabled?: boolean;
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();

  // Se entrou via ?appointmentId= de uma consulta já apontada, carrega-a automaticamente em modo de edição!
  const initialLinkedRecord = appointmentId
    ? history.find((h) => h.appointmentId === appointmentId) || null
    : null;

  const [editingRecord, setEditingRecord] = useState<HistoricalRecord | null>(
    initialLinkedRecord
  );

  const [sessionDateStr, setSessionDateStr] = useState<string>(
    initialLinkedRecord?.rawDateStr || defaultSessionDateStr || todayDateStr
  );
  const [sessionTimeStr, setSessionTimeStr] = useState<string>(
    initialLinkedRecord?.rawTimeStr || defaultSessionTimeStr || nowTimeStr
  );

  const [activeTab, setActiveTab] = useState<
    'historico' | 'nova_evolucao' | 'anamnese' | 'ia_bem'
  >(appointmentId || history.length === 0 ? 'nova_evolucao' : 'historico');

  const [rawNotes, setRawNotes] = useState(initialLinkedRecord?.rawNotes || '');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(
    initialLinkedRecord?.emocoesTrabalhadas || []
  );
  const [emotionSearch, setEmotionSearch] = useState('');
  const [emotionFilter, setEmotionFilter] = useState<'all' | 'Negativa' | 'Positiva'>('all');

  // Situações & Protocolos Bioenergéticos com par (Emoção + Frequência na frente da emoção)
  const [situacoesList, setSituacoesList] = useState<ApontamentoSituacao[]>(
    initialLinkedRecord?.situacoes
      ? JSON.parse(JSON.stringify(initialLinkedRecord.situacoes))
      : []
  );
  const [currentCategory, setCurrentCategory] = useState<string>('Medos');
  const [currentSituation, setCurrentSituation] = useState<string>('Abandono');
  const rootProtocolNodes = protocolNodes.filter((n) => !n.parentId);
  const getProtocolChildren = (parentId: string) =>
    protocolNodes.filter((n) => n.parentId === parentId);

  const [selectedRootNodeId, setSelectedRootNodeId] = useState<string>(
    rootProtocolNodes[0]?.id || ''
  );
  const [selectedChainIds, setSelectedChainIds] = useState<string[]>(() => {
    const firstRoot = rootProtocolNodes[0];
    if (!firstRoot) return [];
    const lvl2 = protocolNodes.filter((n) => n.parentId === firstRoot.id);
    return lvl2[0] ? [lvl2[0].id] : [];
  });
  const [currentComplement, setCurrentComplement] = useState<string>('');
  const [currentPairs, setCurrentPairs] = useState<EmocaoFrequenciaPar[]>([]);
  const [pendingEmotionToPick, setPendingEmotionToPick] = useState<string>('');
  const [emotionComboQuery, setEmotionComboQuery] = useState<string>('');
  const [emotionComboOpen, setEmotionComboOpen] = useState<boolean>(false);
  const [emotionComboHighlight, setEmotionComboHighlight] = useState<number>(0);
  const [pendingFreqNumberToPick, setPendingFreqNumberToPick] = useState<string>(
    frequenciesCatalog[0]?.number || '1'
  );

  const normalizeSearch = (val: string) =>
    val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const comboFilteredEmotions = (() => {
    const q = normalizeSearch(emotionComboQuery);
    if (!q) return emotionsCatalog;
    const startsWith: EmotionItem[] = [];
    const contains: EmotionItem[] = [];
    for (const emo of emotionsCatalog) {
      const normTitle = normalizeSearch(emo.title);
      const normCode = emo.code ? normalizeSearch(emo.code) : '';
      if (normTitle.startsWith(q) || (normCode && normCode.startsWith(q))) {
        startsWith.push(emo);
      } else if (normTitle.includes(q) || (normCode && normCode.includes(q))) {
        contains.push(emo);
      }
    }
    return [...startsWith, ...contains];
  })();

  // Anamnese
  const [anamnesisAnswers, setAnamnesisAnswers] = useState<Record<string, string>>(
    initialAnamnesisAnswers
  );
  const [isSavingAnamnesis, setIsSavingAnamnesis] = useState(false);
  const [anamnesisSaved, setAnamnesisSaved] = useState(false);

  // Modais de leitura de Emoção e de Frequência
  const [readingEmotion, setReadingEmotion] = useState<EmotionItem | null>(null);
  const [readingFrequency, setReadingFrequency] = useState<FrequencyItem | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedLocal, setLastSavedLocal] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const storageKey = `bem_draft_${patient.id}`;
  const storageEmotionsKey = `bem_draft_emotions_${patient.id}`;

  useEffect(() => {
    // Não sobrescreve os dados carregados quando estiver editando uma sessão já existente
    if (editingRecord) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setRawNotes(saved);
        setLastSavedLocal('Recuperado do rascunho local');
      }
      const savedEmotions = localStorage.getItem(storageEmotionsKey);
      if (savedEmotions) {
        setSelectedEmotions(JSON.parse(savedEmotions));
      }
    } catch {
      // ignore
    }
  }, [storageKey, storageEmotionsKey, editingRecord]);

  const handleStartEditingRecord = (record: HistoricalRecord) => {
    setEditingRecord(record);
    setSessionDateStr(record.rawDateStr || todayDateStr);
    setSessionTimeStr(record.rawTimeStr || nowTimeStr);
    setRawNotes(record.rawNotes || '');
    setSelectedEmotions(record.emocoesTrabalhadas ? [...record.emocoesTrabalhadas] : []);
    setSituacoesList(
      record.situacoes ? JSON.parse(JSON.stringify(record.situacoes)) : []
    );
    setCurrentComplement('');
    setCurrentPairs([]);
    setPendingEmotionToPick('');
    setEmotionComboQuery('');
    setEmotionComboOpen(false);
    setLastSavedLocal(null);
    setActiveTab('nova_evolucao');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEditingRecord = (goToNewBlank = false) => {
    setEditingRecord(null);
    setSessionDateStr(todayDateStr || defaultSessionDateStr);
    setSessionTimeStr(nowTimeStr || defaultSessionTimeStr);
    setRawNotes('');
    setSelectedEmotions([]);
    setSituacoesList([]);
    setCurrentComplement('');
    setCurrentPairs([]);
    setPendingEmotionToPick('');
    setEmotionComboQuery('');
    setEmotionComboOpen(false);
    setLastSavedLocal(null);
    setActiveTab(goToNewBlank ? 'nova_evolucao' : 'historico');
  };

  const handleCategoryChange = (cat: string) => {
    setCurrentCategory(cat);
    const items = getSituationsByCategory(cat);
    if (items.length > 0) {
      setCurrentSituation(items[0].title);
    }
  };

  const handleRootProtocolSelect = (rootId: string) => {
    setSelectedRootNodeId(rootId);
    const lvl2 = getProtocolChildren(rootId);
    setSelectedChainIds(lvl2[0] ? [lvl2[0].id] : []);
  };

  const handleChainLevelChange = (depthIdx: number, nodeId: string) => {
    const next = selectedChainIds.slice(0, depthIdx);
    if (nodeId) {
      next.push(nodeId);
    }
    setSelectedChainIds(next);
  };

  const handleAddPairToCurrentSituation = () => {
    if (!pendingEmotionToPick) return;
    const freqObj = frequenciesCatalog.find((f) => f.number === pendingFreqNumberToPick);
    const nextPair: EmocaoFrequenciaPar = {
      emocao: pendingEmotionToPick,
      frequenciaNumero: freqObj?.number || pendingFreqNumberToPick || undefined,
      frequenciaTitulo: freqObj?.title || undefined,
    };
    setCurrentPairs([...currentPairs, nextPair]);
    setPendingEmotionToPick('');
    setEmotionComboQuery('');
    setEmotionComboOpen(false);
  };

  const handleUpdatePairFrequency = (pairIndex: number, freqNumber: string) => {
    const freqObj = frequenciesCatalog.find((f) => f.number === freqNumber);
    setCurrentPairs((prev) =>
      prev.map((p, idx) =>
        idx === pairIndex
          ? {
              ...p,
              frequenciaNumero: freqNumber || undefined,
              frequenciaTitulo: freqObj?.title || undefined,
            }
          : p
      )
    );
  };

  const handleAddSituacao = () => {
    const activeRootNode =
      rootProtocolNodes.find((r) => r.id === selectedRootNodeId) || rootProtocolNodes[0];

    let resolvedCategory = currentCategory;
    let resolvedSituation = currentSituation;

    if (rootProtocolNodes.length > 0 && activeRootNode) {
      resolvedCategory = activeRootNode.title;
      const chainTitles = selectedChainIds
        .map((cid) => protocolNodes.find((n) => n.id === cid)?.title)
        .filter(Boolean) as string[];
      resolvedSituation =
        chainTitles.length > 0 ? chainTitles.join(' ➔ ') : activeRootNode.title;
    }

    if (!resolvedSituation) return;

    // Se o terapeuta selecionou uma emoção no dropdown mas ainda não clicou "+ Vincular", inclui automaticamente!
    let finalPairs = [...currentPairs];
    if (pendingEmotionToPick) {
      const freqObj = frequenciesCatalog.find((f) => f.number === pendingFreqNumberToPick);
      finalPairs.push({
        emocao: pendingEmotionToPick,
        frequenciaNumero: freqObj?.number || pendingFreqNumberToPick || undefined,
        frequenciaTitulo: freqObj?.title || undefined,
      });
    }

    const emocoesNames = finalPairs.map((p) => p.emocao);

    const newSit: ApontamentoSituacao = {
      categoria: resolvedCategory,
      situacao: resolvedSituation,
      complemento: currentComplement.trim() || undefined,
      emocoes: emocoesNames.length > 0 ? emocoesNames : undefined,
      pares: finalPairs.length > 0 ? finalPairs : undefined,
    };

    setSituacoesList([...situacoesList, newSit]);

    if (emocoesNames.length > 0) {
      setSelectedEmotions(Array.from(new Set([...selectedEmotions, ...emocoesNames])));
    }

    setCurrentComplement('');
    setCurrentPairs([]);
    setPendingEmotionToPick('');
    setEmotionComboQuery('');
    setEmotionComboOpen(false);
  };

  const handleUpdateSavedSituacaoPairFreq = (
    sitIdx: number,
    pairIdx: number,
    freqNumber: string
  ) => {
    const freqObj = frequenciesCatalog.find((f) => f.number === freqNumber);
    setSituacoesList((prev) =>
      prev.map((sit, sIdx) => {
        if (sIdx !== sitIdx) return sit;
        const basePares: EmocaoFrequenciaPar[] =
          sit.pares && sit.pares.length > 0
            ? sit.pares
            : (sit.emocoes || []).map((e) => ({ emocao: e }));
        return {
          ...sit,
          pares: basePares.map((p, pIdx) =>
            pIdx === pairIdx
              ? {
                  ...p,
                  frequenciaNumero: freqNumber || undefined,
                  frequenciaTitulo: freqObj?.title || undefined,
                }
              : p
          ),
        };
      })
    );
  };

  const handleRemoveSituacao = (index: number) => {
    setSituacoesList(situacoesList.filter((_, i) => i !== index));
  };

  const handleRemoveSavedSituacaoPair = (sitIdx: number, pairIdx: number) => {
    setSituacoesList((prev) =>
      prev.map((sit, sIdx) => {
        if (sIdx !== sitIdx) return sit;
        const basePares: EmocaoFrequenciaPar[] =
          sit.pares && sit.pares.length > 0
            ? sit.pares
            : (sit.emocoes || []).map((e) => ({ emocao: e }));
        const nextPares = basePares.filter((_, pIdx) => pIdx !== pairIdx);
        return {
          ...sit,
          pares: nextPares,
          emocoes: nextPares.map((p) => p.emocao),
        };
      })
    );
  };

  const handleEditSituacaoInBuilder = (index: number) => {
    const target = situacoesList[index];
    if (!target) return;
    setCurrentCategory(target.categoria);
    setCurrentSituation(target.situacao);

    if (rootProtocolNodes.length > 0) {
      const matchedRoot = rootProtocolNodes.find(
        (r) =>
          r.title.toLowerCase() === target.categoria.toLowerCase() ||
          (target.categoria.toLowerCase().startsWith('medo') &&
            r.title.toLowerCase().startsWith('medo'))
      );
      if (matchedRoot) {
        setSelectedRootNodeId(matchedRoot.id);
        const parts = target.situacao.split('➔').map((s) => s.trim());
        const chain: string[] = [];
        let currParentId = matchedRoot.id;
        for (const part of parts) {
          const match = getProtocolChildren(currParentId).find(
            (c) => c.title.toLowerCase() === part.toLowerCase()
          );
          if (match) {
            chain.push(match.id);
            currParentId = match.id;
          } else {
            break;
          }
        }
        if (chain.length > 0) {
          setSelectedChainIds(chain);
        } else {
          const lvl2 = getProtocolChildren(matchedRoot.id);
          setSelectedChainIds(lvl2[0] ? [lvl2[0].id] : []);
        }
      }
    }

    setCurrentComplement(target.complemento || '');
    const loadedPairs: EmocaoFrequenciaPar[] =
      target.pares && target.pares.length > 0
        ? [...target.pares]
        : (target.emocoes || []).map((e) => ({ emocao: e }));
    setCurrentPairs(loadedPairs);
    setSituacoesList(situacoesList.filter((_, i) => i !== index));
  };

  const handleNotesChange = (text: string) => {
    setRawNotes(text);
    if (editingRecord) return;
    try {
      localStorage.setItem(storageKey, text);
      const now = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastSavedLocal(`Salvo no aparelho às ${now}`);
    } catch {
      // ignore
    }
  };

  const toggleEmotion = (title: string) => {
    const updated = selectedEmotions.includes(title)
      ? selectedEmotions.filter((e) => e !== title)
      : [...selectedEmotions, title];
    setSelectedEmotions(updated);
    if (editingRecord) return;
    try {
      localStorage.setItem(storageEmotionsKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const openEmotionDetails = (title: string) => {
    const found = emotionsCatalog.find((e) => e.title.toLowerCase() === title.toLowerCase());
    setReadingEmotion(
      found || {
        id: title,
        title,
        description: 'Descrição terapêutica não encontrada no catálogo atual.',
        type: 'Positiva',
      }
    );
  };

  const openFrequencyDetails = (freqNumber?: string) => {
    if (!freqNumber) return;
    const found = frequenciesCatalog.find((f) => f.number === freqNumber);
    if (found) setReadingFrequency(found);
  };

  const handleSaveRecord = async (isLocked = false) => {
    if (
      !editingRecord &&
      !rawNotes.trim() &&
      selectedEmotions.length === 0 &&
      situacoesList.length === 0
    ) {
      alert(
        'Adicione ao menos um apontamento de Situação/Protocolo, Emoção trabalhada ou observação da sessão.'
      );
      return;
    }
    setIsSaving(true);
    try {
      await saveClinicalRecordAction({
        recordId: editingRecord?.id,
        patientId: patient.id,
        appointmentId: editingRecord?.appointmentId || appointmentId,
        sessionDateStr,
        sessionTimeStr,
        rawNotes,
        isLocked,
        emocoesTrabalhadas: selectedEmotions,
        situacoes: situacoesList,
      });
      if (!editingRecord) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(storageEmotionsKey);
      }
      setEditingRecord(null);
      setLastSavedLocal(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      setRawNotes('');
      setSelectedEmotions([]);
      setSituacoesList([]);
      setActiveTab('historico');
      router.refresh();
    } catch (err: any) {
      alert('Erro ao salvar sessão: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnamnesis = async () => {
    setIsSavingAnamnesis(true);
    try {
      await savePatientAnamnesisAction({
        patientId: patient.id,
        answers: anamnesisAnswers,
      });
      setAnamnesisSaved(true);
      setTimeout(() => setAnamnesisSaved(false), 3500);
      router.refresh();
    } catch (err: any) {
      alert('Erro ao salvar ficha de anamnese: ' + err.message);
    } finally {
      setIsSavingAnamnesis(false);
    }
  };

  const filteredEmotions = emotionsCatalog.filter((item) => {
    const q = normalizeSearch(emotionSearch);
    const matchesSearch =
      !q ||
      normalizeSearch(item.title).includes(q) ||
      Boolean(item.code && normalizeSearch(item.code).includes(q));
    const matchesFilter = emotionFilter === 'all' || item.type === emotionFilter;
    return matchesSearch && matchesFilter;
  });

  const answeredAnamnesisCount = anamnesisQuestions.filter(
    (q) => (anamnesisAnswers[q.id] || '').trim().length > 0
  ).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/pacientes"
            className="w-9 h-9 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[#222924]">{patient.name}</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Criptografia LGPD
              </span>
              {patient.sessionTypePreference === 'package' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  Pacote ({patient.packageUsedSessions || 0}/{patient.packageTotalSessions || 0} sessões)
                </span>
              )}
            </div>
            <p className="text-xs text-[#6B726B] mt-0.5">
              Prontuário Bioenergético B.E.M. — Anamnese, Situações, Emoções & Frequências
            </p>
          </div>
        </div>

        {lastSavedLocal && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {lastSavedLocal}
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-[#1F4D36] text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-[#1F4D36]" />
          Sessão bioenergética, emoções e frequências gravadas com sucesso no histórico!
        </div>
      )}

      {/* ABAS DO PRONTUÁRIO */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E8E5DF] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'historico'
              ? 'bg-[#1F4D36] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Histórico de Sessões ({history.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nova_evolucao')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'nova_evolucao'
              ? editingRecord
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-[#1F4D36] text-white shadow-sm'
              : editingRecord
              ? 'bg-amber-50 text-amber-800 border border-amber-300'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          {editingRecord ? <Pencil className="w-4 h-4" /> : <Waves className="w-4 h-4" />}
          {editingRecord
            ? `Editando Sessão (${editingRecord.sessionDate.split(',')[0]})`
            : 'Registrar Sessão B.E.M.'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('anamnese')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'anamnese'
              ? 'bg-[#1F4D36] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Anamnese ({answeredAnamnesisCount}/{anamnesisQuestions.length})
        </button>

        {aiAgentsEnabled && (
          <button
            type="button"
            onClick={() => setActiveTab('ia_bem')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ia_bem'
                ? 'bg-[#1F4D36] text-white shadow-sm'
                : 'text-[#1F4D36] bg-[#EBF3ED]/70 hover:bg-[#EBF3ED]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Pós-Sessão, Jornadas & Memória IA ({patientMemories.length})
          </button>
        )}

        <Link
          href="/emocoes"
          target="_blank"
          className="ml-auto text-xs text-[#1F4D36] font-semibold hover:underline hidden md:flex items-center gap-1"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Emoções & Frequências
        </Link>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: LINHA DO TEMPO / HISTÓRICO DE SESSÕES DO PACIENTE  */}
      {/* ========================================================= */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1F4D36]" />
                Linha do Tempo de Sessões Bioenergéticas
              </h2>
              <p className="text-[11px] text-[#6B726B]">
                Histórico cronológico dos protocolos, emoções desbloqueadas e frequências vibracionais trabalhadas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleCancelEditingRecord(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Sessão
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DF] text-[#6B726B] space-y-2">
              <Calendar className="w-10 h-10 mx-auto opacity-30 text-[#1F4D36]" />
              <p className="text-sm font-semibold text-[#222924]">
                Nenhuma sessão registrada no histórico ainda.
              </p>
              <p className="text-xs text-[#6B726B]">
                Clique em &quot;Registrar Sessão B.E.M.&quot; para iniciar o acompanhamento.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, idx) => {
                const sessionNumber = history.length - idx;
                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm p-5 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-[#1F4D36] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                          #{sessionNumber}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[#222924] text-sm">
                              Sessão de {record.sessionDate}
                            </h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Realizada
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#6B726B] mt-0.5">
                            <span className="flex items-center gap-1">
                              {record.modality === 'in_person' ? (
                                <>
                                  <MapPin className="w-3 h-3 text-amber-600" /> Presencial
                                </>
                              ) : (
                                <>
                                  <Video className="w-3 h-3 text-[#1F4D36]" /> Online
                                </>
                              )}
                            </span>
                            <span>•</span>
                            <span>
                              {record.sessionType === 'package'
                                ? 'Sessão de Pacote'
                                : 'Sessão Regular'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        {record.isLocked ? (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-gray-100 text-gray-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Concluída
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Em Aberto
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEditingRecord(record)}
                          className="px-3 py-1.5 rounded-xl border border-[#1F4D36]/30 bg-[#EBF3ED] hover:bg-[#1F4D36] text-[#1F4D36] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar / Complementar Sessão
                        </button>
                      </div>
                    </div>

                    {/* Situações & Protocolos Bioenergéticos com Emoção + Frequência */}
                    {record.situacoes && record.situacoes.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-2">
                        <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <BookmarkPlus className="w-3.5 h-3.5 text-amber-700" />
                          Protocolos Bioenergéticos Trabalhados ({record.situacoes.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {record.situacoes.map((sit, sitIdx) => {
                            const displayPairs: EmocaoFrequenciaPar[] =
                              sit.pares && sit.pares.length > 0
                                ? sit.pares
                                : (sit.emocoes || []).map((e) => ({ emocao: e }));

                            return (
                              <div
                                key={sitIdx}
                                className="bg-white p-3 rounded-xl border border-amber-200 space-y-2"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                    {sit.categoria}
                                  </span>
                                  <span className="text-xs font-bold text-[#222924]">
                                    ➔ {sit.situacao}
                                  </span>
                                </div>
                                {sit.complemento && (
                                  <p className="text-[11px] text-[#6B726B] italic">
                                    &quot;{sit.complemento}&quot;
                                  </p>
                                )}

                                {displayPairs.length > 0 && (
                                  <div className="space-y-1 pt-1.5 border-t border-amber-100">
                                    {displayPairs.map((pair, pIdx) => (
                                      <div
                                        key={pIdx}
                                        className="flex flex-wrap items-center gap-1.5 text-[11px]"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => openEmotionDetails(pair.emocao)}
                                          className="px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:underline"
                                        >
                                          {pair.emocao}
                                        </button>

                                        {pair.frequenciaNumero && (
                                          <>
                                            <span className="text-gray-400 font-bold">➔</span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openFrequencyDetails(pair.frequenciaNumero)
                                              }
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-[#EBF3ED] text-[#1F4D36] border border-[#1F4D36]/25 hover:underline"
                                            >
                                              <Waves className="w-3 h-3" />
                                              Freq. {pair.frequenciaNumero}
                                              {pair.frequenciaTitulo
                                                ? ` — ${pair.frequenciaTitulo}`
                                                : ''}
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Observações Livres da Sessão */}
                    {record.rawNotes && (
                      <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-1">
                        <span className="text-[11px] font-bold text-[#222924] uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#1F4D36]" />
                          Observações & Apontamentos da Sessão
                        </span>
                        <p className="text-xs text-[#222924] leading-relaxed whitespace-pre-line">
                          {record.rawNotes}
                        </p>
                      </div>
                    )}

                    {/* Emoções Gerais */}
                    {record.emocoesTrabalhadas && record.emocoesTrabalhadas.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-[#6B726B] mr-1">
                          Emoções na sessão:
                        </span>
                        {record.emocoesTrabalhadas.map((emoTitle) => {
                          const found = emotionsCatalog.find(
                            (e) => e.title.toLowerCase() === emoTitle.toLowerCase()
                          );
                          const isNeg = found?.type === 'Negativa';
                          return (
                            <button
                              key={emoTitle}
                              type="button"
                              onClick={() => openEmotionDetails(emoTitle)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                                isNeg
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <span>{emoTitle}</span>
                              <Info className="w-3 h-3 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: REGISTRAR OU EDITAR SESSÃO BIOENERGÉTICA B.E.M.    */}
      {/* ========================================================= */}
      {activeTab === 'nova_evolucao' && (
        <div className="space-y-6">
          {editingRecord && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Pencil className="w-4 h-4 text-amber-700" />
                  Editando Sessão Realizada em {editingRecord.sessionDate}
                </div>
                <p className="text-xs text-amber-800">
                  Adicione novos protocolos/situações, complemente emoções e frequências ou ajuste as observações abaixo. Ao salvar, esta sessão será atualizada sem criar duplicidade.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCancelEditingRecord(true)}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Sessão em Branco
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelEditingRecord(false)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E5DF] hover:bg-gray-50 text-[#222924] text-xs font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Voltar ao Histórico
                </button>
              </div>
            </div>
          )}

          {/* DATA E HORÁRIO DA SESSÃO (Suporta Sessões Retroativas e Correção de Data) */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1F4D36]" />
                Data e Horário da Sessão Realizada
              </h2>
              <p className="text-[11px] text-[#6B726B] mt-0.5">
                {editingRecord
                  ? 'Você pode corrigir ou ajustar livremente a data e o horário desta sessão já registrada.'
                  : 'Informe a data real em que o atendimento aconteceu (aceita datas retroativas de anotações em papel).'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#6B726B] mb-1">
                  Data da Sessão
                </label>
                <input
                  type="date"
                  value={sessionDateStr}
                  onChange={(e) => setSessionDateStr(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#1F4D36]/30 bg-[#FBF9F5] text-xs font-bold text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/25"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#6B726B] mb-1">
                  Horário
                </label>
                <input
                  type="time"
                  value={sessionTimeStr}
                  onChange={(e) => setSessionTimeStr(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#1F4D36]/30 bg-[#FBF9F5] text-xs font-bold text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/25"
                />
              </div>
            </div>
          </div>

          {/* 1. SITUAÇÕES & PROTOCOLOS BIOENERGÉTICOS COM EMOÇÃO + FREQUÊNCIA NA FRENTE */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                  <BookmarkPlus className="w-4 h-4 text-amber-600" />
                  1. Situações & Protocolos Bioenergéticos ({situacoesList.length} apontamentos)
                </h2>
                <p className="text-[11px] text-[#6B726B]">
                  Selecione a situação trabalhada, escolha a emoção comprometida e aponte na frente dela a Frequência vibracional correspondente.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1.5 bg-[#FBF9F5] p-1 rounded-xl border border-[#E8E5DF] text-[11px] font-semibold text-[#6B726B]">
                  {rootProtocolNodes.length > 0
                    ? rootProtocolNodes.map((root) => {
                        const isActive =
                          (selectedRootNodeId || rootProtocolNodes[0]?.id) === root.id;
                        return (
                          <button
                            key={root.id}
                            type="button"
                            onClick={() => handleRootProtocolSelect(root.id)}
                            className={`px-3 py-1 rounded-lg transition-all ${
                              isActive
                                ? 'bg-[#1F4D36] text-white shadow-xs'
                                : 'hover:bg-white text-[#222924]'
                            }`}
                          >
                            {root.title}
                          </button>
                        );
                      })
                    : getRootCategories().map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleCategoryChange(cat)}
                          className={`px-3 py-1 rounded-lg transition-all ${
                            currentCategory === cat
                              ? 'bg-[#1F4D36] text-white shadow-xs'
                              : 'hover:bg-white text-[#222924]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                </div>

                {isSuperAdmin && (
                  <Link
                    href="/admin?tab=protocolos"
                    target="_blank"
                    className="px-2.5 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white text-[11px] font-semibold text-[#1F4D36] flex items-center gap-1"
                    title="Gerenciar Categorias e Subcategorias no Admin"
                  >
                    <Settings className="w-3 h-3" />
                    Categorias
                  </Link>
                )}
              </div>
            </div>

            {/* Construtor de Apontamento */}
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-4">
              {rootProtocolNodes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {(() => {
                    const activeRoot =
                      rootProtocolNodes.find((r) => r.id === selectedRootNodeId) ||
                      rootProtocolNodes[0];
                    if (!activeRoot) return null;

                    const levelsToRender: Array<{
                      depthIdx: number;
                      label: string;
                      options: ProtocolNodeItem[];
                      selectedValue: string;
                    }> = [];

                    const lvl2Options = getProtocolChildren(activeRoot.id);
                    if (lvl2Options.length > 0) {
                      levelsToRender.push({
                        depthIdx: 0,
                        label: `Subcategoria (${activeRoot.title})`,
                        options: lvl2Options,
                        selectedValue: selectedChainIds[0] || '',
                      });
                    }

                    for (let d = 0; d < 4; d++) {
                      const chosenId = selectedChainIds[d];
                      if (!chosenId) break;
                      const nextOpts = getProtocolChildren(chosenId);
                      if (nextOpts.length === 0) break;
                      const chosenNode = protocolNodes.find((n) => n.id === chosenId);
                      levelsToRender.push({
                        depthIdx: d + 1,
                        label: `Subnível (${chosenNode?.title || `Nível ${d + 3}`})`,
                        options: nextOpts,
                        selectedValue: selectedChainIds[d + 1] || '',
                      });
                    }

                    const complementColSpan =
                      levelsToRender.length <= 1
                        ? 'md:col-span-8'
                        : levelsToRender.length === 2
                        ? 'md:col-span-4'
                        : 'md:col-span-12';

                    return (
                      <>
                        {levelsToRender.map((lvl) => (
                          <div key={lvl.depthIdx} className="md:col-span-4">
                            <label className="block text-[11px] font-bold text-[#222924] mb-1">
                              {lvl.label}:
                            </label>
                            <select
                              value={lvl.selectedValue}
                              onChange={(e) =>
                                handleChainLevelChange(lvl.depthIdx, e.target.value)
                              }
                              className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-[#222924] font-medium"
                            >
                              {lvl.depthIdx > 0 && (
                                <option value="">— Selecionar subnível (opcional) —</option>
                              )}
                              {lvl.options.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}

                        <div className={complementColSpan}>
                          <label className="block text-[11px] font-bold text-[#222924] mb-1">
                            Complemento / Especificação (Opcional):
                          </label>
                          <input
                            type="text"
                            value={currentComplement}
                            onChange={(e) => setCurrentComplement(e.target.value)}
                            placeholder="Ex: Pessoa específica, data/idade, evento da infância, região do corpo..."
                            className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-[#222924]"
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#222924] mb-1">
                      Situação / Subcategoria ({currentCategory}):
                    </label>
                    <select
                      value={currentSituation}
                      onChange={(e) => setCurrentSituation(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-[#222924] font-medium"
                    >
                      {getSituationsByCategory(currentCategory).map((sit) => (
                        <option key={sit.title} value={sit.title}>
                          {sit.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[#222924] mb-1">
                      Complemento / Especificação (Opcional):
                    </label>
                    <input
                      type="text"
                      value={currentComplement}
                      onChange={(e) => setCurrentComplement(e.target.value)}
                      placeholder="Ex: Pessoa específica, evento da infância, região do corpo, contexto..."
                      className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-[#222924]"
                    />
                  </div>
                </div>
              )}

              {/* Linha de Adição: Emoção + Frequência na frente da emoção */}
              <div className="p-3.5 rounded-xl bg-white border border-amber-200 space-y-3">
                <label className="block text-[11px] font-bold text-[#222924]">
                  Vincular Emoção e apontar Frequência Vibracional ao lado:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-5 relative">
                    <span className="block text-[10px] font-semibold text-[#6B726B] mb-1">
                      Emoção Identificada (digite para filtrar)
                    </span>
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 absolute left-3 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={emotionComboQuery}
                        onFocus={() => {
                          setEmotionComboOpen(true);
                          setEmotionComboHighlight(0);
                        }}
                        onBlur={() => {
                          // Pequeno atraso para permitir clique nas opções da lista
                          setTimeout(() => setEmotionComboOpen(false), 160);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEmotionComboQuery(val);
                          setEmotionComboOpen(true);
                          setEmotionComboHighlight(0);
                          const exact = emotionsCatalog.find(
                            (em) => normalizeSearch(em.title) === normalizeSearch(val)
                          );
                          setPendingEmotionToPick(exact ? exact.title : '');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setEmotionComboOpen(true);
                            setEmotionComboHighlight((prev) =>
                              Math.min(prev + 1, Math.max(0, comboFilteredEmotions.length - 1))
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setEmotionComboHighlight((prev) => Math.max(0, prev - 1));
                          } else if (e.key === 'Enter') {
                            if (emotionComboOpen && comboFilteredEmotions.length > 0) {
                              e.preventDefault();
                              const picked =
                                comboFilteredEmotions[emotionComboHighlight] ||
                                comboFilteredEmotions[0];
                              if (picked) {
                                setPendingEmotionToPick(picked.title);
                                setEmotionComboQuery(picked.title);
                                setEmotionComboOpen(false);
                              }
                            } else if (pendingEmotionToPick) {
                              e.preventDefault();
                              handleAddPairToCurrentSituation();
                            }
                          } else if (e.key === 'Escape') {
                            setEmotionComboOpen(false);
                          }
                        }}
                        placeholder="Digite a emoção (ex: Raiva, Abandono, A1)..."
                        className={`w-full pl-8 pr-8 py-2 rounded-xl border text-xs text-[#222924] transition-all focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/25 ${
                          pendingEmotionToPick
                            ? 'border-[#1F4D36] bg-[#EBF3ED]/40 font-bold'
                            : 'border-[#E8E5DF] bg-[#FBF9F5]'
                        }`}
                      />

                      {emotionComboQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setEmotionComboQuery('');
                            setPendingEmotionToPick('');
                            setEmotionComboOpen(true);
                            setEmotionComboHighlight(0);
                          }}
                          title="Limpar busca"
                          className="absolute right-2.5 text-gray-400 hover:text-gray-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {emotionComboOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-40 max-h-60 overflow-y-auto rounded-xl border border-[#E8E5DF] bg-white shadow-xl divide-y divide-[#F3F1EC]">
                        {comboFilteredEmotions.length === 0 ? (
                          <div className="p-3 text-xs text-[#6B726B] text-center">
                            Nenhuma emoção encontrada para &quot;{emotionComboQuery}&quot;.
                          </div>
                        ) : (
                          comboFilteredEmotions.map((emo, idx) => {
                            const isHighlighted = idx === emotionComboHighlight;
                            const isNeg = emo.type === 'Negativa';
                            return (
                              <button
                                key={emo.id}
                                type="button"
                                onMouseDown={(ev) => {
                                  ev.preventDefault();
                                  setPendingEmotionToPick(emo.title);
                                  setEmotionComboQuery(emo.title);
                                  setEmotionComboOpen(false);
                                }}
                                onMouseEnter={() => setEmotionComboHighlight(idx)}
                                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                                  isHighlighted ? 'bg-[#EBF3ED]' : 'hover:bg-[#FBF9F5]'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="font-bold text-[#222924] truncate">
                                    {emo.title}
                                  </span>
                                  {emo.code && (
                                    <span className="text-[10px] font-mono text-[#6B726B] shrink-0">
                                      [{emo.code}]
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    isNeg
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {emo.type}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-5">
                    <span className="block text-[10px] font-semibold text-[#1F4D36] mb-1">
                      Frequência na frente da Emoção
                    </span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={pendingFreqNumberToPick}
                        onChange={(e) => setPendingFreqNumberToPick(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-[#1F4D36]/30 bg-[#EBF3ED]/50 text-xs font-semibold text-[#1F4D36]"
                      >
                        {frequenciesCatalog.map((fq) => (
                          <option key={fq.id} value={fq.number}>
                            Nº {fq.number} — {fq.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openFrequencyDetails(pendingFreqNumberToPick)}
                        title="Ler significado vibracional desta frequência"
                        className="p-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#1F4D36] hover:bg-[#EBF3ED]"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={!pendingEmotionToPick}
                      onClick={handleAddPairToCurrentSituation}
                      className="w-full py-2 px-3 rounded-xl bg-[#EBF3ED] text-[#1F4D36] border border-[#1F4D36]/30 text-xs font-bold hover:bg-[#1F4D36] hover:text-white disabled:opacity-40 transition-all"
                    >
                      + Vincular
                    </button>
                  </div>
                </div>

                {/* Lista dos pares (Emoção ➔ Frequência) adicionados neste protocolo atual */}
                {currentPairs.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#E8E5DF]">
                    {currentPairs.map((pair, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#FBF9F5] border border-[#E8E5DF] text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-900 border border-rose-200">
                            {pair.emocao}
                          </span>
                          <span className="text-gray-400 font-bold">➔</span>
                          <select
                            value={pair.frequenciaNumero || ''}
                            onChange={(e) => handleUpdatePairFrequency(pIdx, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-[#1F4D36]/30 bg-[#EBF3ED] text-[#1F4D36] font-bold text-xs"
                          >
                            <option value="">Sem frequência</option>
                            {frequenciesCatalog.map((fq) => (
                              <option key={fq.id} value={fq.number}>
                                Freq. {fq.number} — {fq.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPairs(currentPairs.filter((_, i) => i !== pIdx))
                          }
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddSituacao}
                  className="px-4 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Apontamento à Sessão
                </button>
              </div>
            </div>

            {/* Apontamentos já adicionados à sessão atual */}
            {situacoesList.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-[#222924] block">
                  Protocolos que serão gravados nesta sessão:
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {situacoesList.map((sit, sitIdx) => {
                    const pairs: EmocaoFrequenciaPar[] =
                      sit.pares && sit.pares.length > 0
                        ? sit.pares
                        : (sit.emocoes || []).map((e) => ({ emocao: e }));
                    return (
                      <div
                        key={sitIdx}
                        className="bg-[#FBF9F5] p-3.5 rounded-xl border border-amber-200 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                              {sit.categoria}
                            </span>
                            <span className="text-xs font-bold text-[#222924]">
                              ➔ {sit.situacao}
                            </span>
                            {sit.complemento && (
                              <span className="text-xs text-[#6B726B] italic">
                                (&quot;{sit.complemento}&quot;)
                              </span>
                            )}
                          </div>

                          {pairs.length > 0 && (
                            <div className="space-y-1.5">
                              {pairs.map((p, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="flex flex-wrap items-center gap-2 text-xs"
                                >
                                  <span className="px-2 py-0.5 rounded font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                    {p.emocao}
                                  </span>
                                  <span className="text-gray-400 font-bold">➔</span>
                                  <select
                                    value={p.frequenciaNumero || ''}
                                    onChange={(e) =>
                                      handleUpdateSavedSituacaoPairFreq(
                                        sitIdx,
                                        pIdx,
                                        e.target.value
                                      )
                                    }
                                    className="px-2 py-0.5 rounded-lg border border-[#1F4D36]/30 bg-white text-[#1F4D36] font-bold text-[11px]"
                                  >
                                    <option value="">Selecionar Frequência...</option>
                                    {frequenciesCatalog.map((fq) => (
                                      <option key={fq.id} value={fq.number}>
                                        Freq. {fq.number} — {fq.title}
                                      </option>
                                    ))}
                                    </select>
                                    <button
                                      type="button"
                                      title="Remover esta emoção deste protocolo"
                                      onClick={() =>
                                        handleRemoveSavedSituacaoPair(sitIdx, pIdx)
                                      }
                                      className="text-gray-400 hover:text-rose-600 p-0.5"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditSituacaoInBuilder(sitIdx)}
                              title="Carregar no editor acima para incluir mais emoções ou ajustar complemento"
                              className="px-2.5 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSituacao(sitIdx)}
                              title="Remover protocolo da sessão"
                              className="text-gray-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          {/* 2. APONTAMENTOS LIVRES & BOTÕES DE GRAVAÇÃO DA SESSÃO */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1F4D36]" />
                  2. Observações & Percepções Energéticas da Sessão (Opcional)
                </h2>
                <p className="text-[11px] text-[#6B726B]">
                  Anote percepções corporais, respostas ao desbloqueio ou observações livres para o histórico e para a IA Pós-Sessão.
                </p>
              </div>
              <span className="text-[11px] text-[#6B726B]">
                {editingRecord ? 'Modo de edição da sessão' : 'Auto-salvo localmente'}
              </span>
            </div>

            <textarea
              value={rawNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={5}
              placeholder="Ex: Paciente relatou sensação imediata de leveza no peito e aquecimento nas mãos após o desbloqueio..."
              className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 leading-relaxed font-sans"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-1">
              {editingRecord && (
                <button
                  type="button"
                  onClick={() => handleCancelEditingRecord(false)}
                  disabled={isSaving}
                  className="py-2.5 px-4 rounded-xl border border-[#E8E5DF] bg-white text-[#6B726B] text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar Edição
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveRecord(false)}
                disabled={isSaving}
                className="py-2.5 px-5 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs font-semibold hover:bg-[#FBF9F5] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4 text-gray-500" />
                {editingRecord ? 'Salvar e Manter em Aberto' : 'Salvar em Aberto'}
              </button>

              <button
                type="button"
                onClick={() => handleSaveRecord(true)}
                disabled={isSaving}
                className="py-2.5 px-6 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {editingRecord ? <Save className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {isSaving
                  ? 'Gravando...'
                  : editingRecord
                  ? 'Salvar Alterações da Sessão'
                  : 'Concluir & Gravar na Linha do Tempo'}
              </button>
            </div>
          </div>

          {/* 3. SELEÇÃO COMPLEMENTAR RÁPIDA DE EMOÇÕES */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  3. Emoções Gerais Trabalhadas / Ancoradas ({selectedEmotions.length})
                </h2>
                <p className="text-[11px] text-[#6B726B]">
                  As emoções adicionadas nos protocolos acima já entram aqui automaticamente; você também pode marcar emoções extras.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FBF9F5] p-1 rounded-xl border border-[#E8E5DF] text-[11px] font-semibold text-[#6B726B]">
                {(['all', 'Negativa', 'Positiva'] as const).map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setEmotionFilter(tp)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      emotionFilter === tp ? 'bg-white text-[#1F4D36] shadow-xs' : ''
                    }`}
                  >
                    {tp === 'all' ? 'Todas' : `${tp}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar emoção por nome ou código (ex: A1, Insegurança, Segurança)..."
                value={emotionSearch}
                onChange={(e) => setEmotionSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924]"
              />
            </div>

            <div className="max-h-60 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1.5">
                {filteredEmotions.map((emotion) => {
                  const isSelected = selectedEmotions.includes(emotion.title);
                  const isNeg = emotion.type === 'Negativa';
                  return (
                    <div
                      key={emotion.id}
                      className={`inline-flex items-center rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? isNeg
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-[#1F4D36] text-white border-[#1F4D36] shadow-xs'
                          : isNeg
                          ? 'bg-white text-rose-900 border-rose-200 hover:bg-rose-50'
                          : 'bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleEmotion(emotion.title)}
                        className="px-2.5 py-1 flex items-center gap-1"
                      >
                        {emotion.code && (
                          <span className="text-[10px] opacity-75 font-mono">
                            [{emotion.code}]
                          </span>
                        )}
                        <span>{emotion.title}</span>
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReadingEmotion(emotion)}
                        className="pr-2 pl-0.5 py-1 opacity-60 hover:opacity-100"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 3: FICHA DE ANAMNESE CONFIGURÁVEL                     */}
      {/* ========================================================= */}
      {activeTab === 'anamnese' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#222924] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#1F4D36]" />
                Ficha de Anamnese — {patient.name}
              </h2>
              <p className="text-xs text-[#6B726B] mt-0.5">
                Respostas armazenadas com criptografia de ponta a ponta (LGPD). As perguntas são personalizadas pelo seu consultório.
              </p>
            </div>

            <Link
              href="/configuracoes"
              className="px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white text-xs font-semibold text-[#222924] flex items-center gap-1.5 self-start sm:self-center"
            >
              <Settings className="w-3.5 h-3.5 text-[#1F4D36]" />
              Configurar Perguntas de Anamnese
            </Link>
          </div>

          {anamnesisSaved && (
            <div className="p-3 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-xs font-semibold text-[#1F4D36] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Ficha de Anamnese salva com segurança!
            </div>
          )}

          {anamnesisQuestions.length === 0 ? (
            <div className="p-10 text-center bg-[#FBF9F5] rounded-2xl border border-[#E8E5DF] space-y-3">
              <FileCheck className="w-9 h-9 text-[#1F4D36]/40 mx-auto" />
              <p className="text-sm font-bold text-[#222924]">
                Seu consultório ainda não cadastrou perguntas de Anamnese
              </p>
              <p className="text-xs text-[#6B726B] max-w-md mx-auto">
                Vá em <strong>Configurações ➔ aba Anamnese</strong> para incluir suas perguntas personalizadas (ou importar as perguntas sugeridas B.E.M. com 1 clique).
              </p>
              <Link
                href="/configuracoes"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A]"
              >
                <Settings className="w-3.5 h-3.5" />
                Ir para Configurações de Anamnese
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {anamnesisQuestions.map((q, idx) => {
                const val = anamnesisAnswers[q.id] || '';
                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-2"
                  >
                    <label className="block text-xs sm:text-sm font-bold text-[#222924]">
                      {idx + 1}. {q.question}
                    </label>
                    {q.hint && (
                      <p className="text-[11px] text-[#6B726B] italic">{q.hint}</p>
                    )}

                    {q.fieldType === 'text' ? (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setAnamnesisAnswers({ ...anamnesisAnswers, [q.id]: e.target.value })
                        }
                        placeholder="Digite a resposta..."
                        className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924]"
                      />
                    ) : q.fieldType === 'yes_no' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {['Sim', 'Não'].map((opt) => {
                            const starts = val.startsWith(`${opt}:`) || val === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const detail = val.includes(':')
                                    ? val.split(':').slice(1).join(':').trim()
                                    : '';
                                  setAnamnesisAnswers({
                                    ...anamnesisAnswers,
                                    [q.id]: detail ? `${opt}: ${detail}` : opt,
                                  });
                                }}
                                className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold ${
                                  starts
                                    ? 'bg-[#1F4D36] text-white border-[#1F4D36]'
                                    : 'bg-white text-[#6B726B] border-[#E8E5DF]'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          value={
                            val.includes(':') ? val.split(':').slice(1).join(':').trim() : ''
                          }
                          onChange={(e) => {
                            const prefix = val.startsWith('Não') ? 'Não' : 'Sim';
                            setAnamnesisAnswers({
                              ...anamnesisAnswers,
                              [q.id]: e.target.value ? `${prefix}: ${e.target.value}` : prefix,
                            });
                          }}
                          placeholder="Observação complementar (opcional)..."
                          className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924]"
                        />
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) =>
                          setAnamnesisAnswers({ ...anamnesisAnswers, [q.id]: e.target.value })
                        }
                        placeholder="Registre a resposta do paciente..."
                        className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924] leading-relaxed"
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSavingAnamnesis}
                  onClick={handleSaveAnamnesis}
                  className="px-6 py-3 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {isSavingAnamnesis ? 'Salvando Anamnese...' : 'Salvar Ficha de Anamnese'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 4: PÓS-SESSÃO, JORNADAS CONTÍNUAS & MEMÓRIA IA B.E.M. */}
      {/* ========================================================= */}
      {activeTab === 'ia_bem' && aiAgentsEnabled && (
        <PatientAiPanel
          patient={{ id: patient.id, name: patient.name }}
          appointmentId={appointmentId}
          draftRawNotes={rawNotes}
          draftSoap={{ subjective: '', objective: '', assessment: '', plan: '' }}
          draftEmotions={selectedEmotions}
          draftSituacoes={situacoesList}
          latestHistoryRecord={history[0]}
          memories={patientMemories}
          programs={patientPrograms}
          defaultDeliveryMode={defaultDeliveryMode}
        />
      )}

      {/* MODAL: Leitura da Emoção */}
      {readingEmotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div className="flex items-center gap-2">
                {readingEmotion.code && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                    {readingEmotion.code}
                  </span>
                )}
                <h3 className="font-bold text-[#222924] text-lg">{readingEmotion.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReadingEmotion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs whitespace-pre-line leading-relaxed text-[#222924]">
              {readingEmotion.description}
            </div>
            {readingEmotion.phrases && (
              <div className="p-3.5 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-xs text-[#1F4D36] whitespace-pre-line">
                <strong className="block mb-1">Frases de Ancoragem:</strong>
                {readingEmotion.phrases}
              </div>
            )}
            <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs">
              <Link
                href="/emocoes"
                target="_blank"
                className="text-[#1F4D36] font-semibold hover:underline flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {isSuperAdmin ? 'Editar no Catálogo' : 'Abrir Catálogo'}
              </Link>
              <button
                type="button"
                onClick={() => setReadingEmotion(null)}
                className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Leitura da Frequência Vibracional */}
      {readingFrequency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#1F4D36] text-white font-bold flex items-center justify-center text-sm">
                  {readingFrequency.number}
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#1F4D36] block">
                    Frequência Vibracional Nº {readingFrequency.number}
                  </span>
                  <h3 className="font-bold text-[#222924] text-lg">{readingFrequency.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadingFrequency(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs whitespace-pre-line leading-relaxed text-[#222924]">
              {readingFrequency.description}
            </div>
            <div className="pt-3 border-t border-[#E8E5DF] flex justify-end">
              <button
                type="button"
                onClick={() => setReadingFrequency(null)}
                className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
