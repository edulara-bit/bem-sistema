'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  Save, 
  Lock, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw,
  Heart,
  Search,
  X,
  Plus,
  Tag,
  Calendar,
  Video,
  MapPin,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  BookmarkPlus,
  Trash2,
  FolderTree
} from 'lucide-react';
import { generateSoapAction, saveClinicalRecordAction } from './actions';
import { getRootCategories, getSituationsByCategory } from '@/lib/protocols';
import { PatientAiPanel } from './PatientAiPanel';
import type { DecryptedMemoryItem } from '@/lib/ai/memory';

interface SoapData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ApontamentoSituacao {
  categoria: string;
  situacao: string;
  complemento?: string;
  emocoes?: string[];
}

interface HistoricalRecord {
  id: string;
  sessionDate: string;
  rawNotes?: string;
  soap: SoapData;
  emocoesTrabalhadas?: string[];
  situacoes?: ApontamentoSituacao[];
  modality?: string;
  sessionType?: string;
  status?: string;
  price?: number;
  appointmentNotes?: string | null;
  aiAssisted: boolean;
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

export function ProntuarioView({
  patient,
  appointmentId,
  history = [],
  emotionsCatalog = [],
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
  history: HistoricalRecord[];
  emotionsCatalog?: EmotionItem[];
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
  // Aba ativa: se veio da agenda para atendimento imediato abre em 'nova_evolucao', senão mostra o 'historico'
  const [activeTab, setActiveTab] = useState<'historico' | 'nova_evolucao' | 'ia_bem'>(
    appointmentId || history.length === 0 ? 'nova_evolucao' : 'historico'
  );

  const [rawNotes, setRawNotes] = useState('');
  const [soap, setSoap] = useState<SoapData>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [emotionSearch, setEmotionSearch] = useState('');
  const [emotionFilter, setEmotionFilter] = useState<'all' | 'Negativa' | 'Positiva'>('all');

  // Estados de Situações & Protocolos Clínicos (Medos, Relacionamentos, Linha do Tempo)
  const [situacoesList, setSituacoesList] = useState<ApontamentoSituacao[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string>('Medos');
  const [currentSituation, setCurrentSituation] = useState<string>('Abandono');
  const [currentComplement, setCurrentComplement] = useState<string>('');
  const [currentAssocEmotions, setCurrentAssocEmotions] = useState<string[]>([]);

  // Atualiza a situação padrão quando a categoria muda
  const handleCategoryChange = (cat: string) => {
    setCurrentCategory(cat);
    const items = getSituationsByCategory(cat);
    if (items.length > 0) {
      setCurrentSituation(items[0].title);
    }
  };

  const handleAddSituacao = () => {
    if (!currentSituation) return;
    const newSit: ApontamentoSituacao = {
      categoria: currentCategory,
      situacao: currentSituation,
      complemento: currentComplement.trim() || undefined,
      emocoes: currentAssocEmotions.length > 0 ? [...currentAssocEmotions] : undefined,
    };
    setSituacoesList([...situacoesList, newSit]);

    // Também inclui as emoções no conjunto geral da sessão
    if (currentAssocEmotions.length > 0) {
      const merged = Array.from(new Set([...selectedEmotions, ...currentAssocEmotions]));
      setSelectedEmotions(merged);
    }

    setCurrentComplement('');
    setCurrentAssocEmotions([]);
  };

  const handleRemoveSituacao = (index: number) => {
    setSituacoesList(situacoesList.filter((_, i) => i !== index));
  };

  // Modal para exibir a descrição terapêutica de uma emoção clicada
  const [readingEmotion, setReadingEmotion] = useState<EmotionItem | null>(null);

  // Expansão do SOAP no histórico
  const [expandedSoaps, setExpandedSoaps] = useState<Record<string, boolean>>({});

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedLocal, setLastSavedLocal] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const storageKey = `bem_draft_${patient.id}`;
  const storageEmotionsKey = `bem_draft_emotions_${patient.id}`;

  // Recupera rascunho salvo localmente
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setRawNotes(saved);
        setLastSavedLocal('Recuperado da memória local');
      }
      const savedEmotions = localStorage.getItem(storageEmotionsKey);
      if (savedEmotions) {
        setSelectedEmotions(JSON.parse(savedEmotions));
      }
    } catch (e) {
      console.warn('Erro ao ler localStorage', e);
    }
  }, [storageKey, storageEmotionsKey]);

  // Salva automaticamente no LocalStorage
  const handleNotesChange = (text: string) => {
    setRawNotes(text);
    try {
      localStorage.setItem(storageKey, text);
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedLocal(`Salvo no aparelho às ${now}`);
    } catch (e) {
      console.warn('Erro ao gravar no localStorage', e);
    }
  };

  const toggleEmotion = (title: string) => {
    let updated: string[];
    if (selectedEmotions.includes(title)) {
      updated = selectedEmotions.filter((e) => e !== title);
    } else {
      updated = [...selectedEmotions, title];
    }
    setSelectedEmotions(updated);
    try {
      localStorage.setItem(storageEmotionsKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar emoções no localStorage', e);
    }
  };

  const openEmotionDetails = (title: string) => {
    const found = emotionsCatalog.find((e) => e.title.toLowerCase() === title.toLowerCase());
    if (found) {
      setReadingEmotion(found);
    } else {
      setReadingEmotion({
        id: title,
        title,
        description: 'Descrição terapêutica não encontrada no catálogo atual.',
        type: 'Positiva',
      });
    }
  };

  const toggleSoapExpand = (recordId: string) => {
    setExpandedSoaps((prev) => ({ ...prev, [recordId]: !prev[recordId] }));
  };

  const handleGenerateSoap = async () => {
    if (!rawNotes.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateSoapAction(rawNotes, patient.name);
      setSoap(result);
    } catch (err: any) {
      alert(err.message || 'Erro ao processar SOAP com IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveRecord = async (isLocked = false) => {
    if (!rawNotes.trim() && !soap.subjective && selectedEmotions.length === 0) {
      alert('Preencha as anotações, estrutura SOAP ou selecione as emoções trabalhadas.');
      return;
    }
    setIsSaving(true);
    try {
      await saveClinicalRecordAction({
        patientId: patient.id,
        appointmentId,
        rawNotes,
        soap,
        aiAssisted: Boolean(soap.subjective && soap.plan),
        isLocked,
        emocoesTrabalhadas: selectedEmotions,
        situacoes: situacoesList,
      });
      // Limpa rascunho local após salvar no banco com criptografia
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageEmotionsKey);
      setLastSavedLocal(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      setRawNotes('');
      setSoap({ subjective: '', objective: '', assessment: '', plan: '' });
      setSelectedEmotions([]);
      setSituacoesList([]);
      setActiveTab('historico');
    } catch (err: any) {
      alert('Erro ao salvar prontuário: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtragem de emoções do catálogo
  const filteredEmotions = emotionsCatalog.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(emotionSearch.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(emotionSearch.toLowerCase()));
    const matchesFilter = emotionFilter === 'all' || item.type === emotionFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
              Prontuário Clínico, Linha do Tempo de Atendimentos & Mapa de Emoções
            </p>
          </div>
        </div>

        {lastSavedLocal && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {lastSavedLocal}
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-[#1F4D36] text-sm flex items-center gap-2 font-medium animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#1F4D36]" />
          Evolução clínica e emoções salvas com sucesso no histórico do paciente!
        </div>
      )}

      {/* ABAS NO TOPO: Histórico vs Nova Evolução */}
      <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-1">
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
              ? 'bg-[#1F4D36] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Registrar Nova Evolução Clínica SOAP
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
          className="ml-auto text-xs text-[#1F4D36] font-semibold hover:underline hidden sm:flex items-center gap-1"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Ver Catálogo Completo de Emoções
        </Link>
      </div>

      {/* ========================================================= */}
      {/* ABA 1: LINHA DO TEMPO / HISTÓRICO DE SESSÕES DO PACIENTE  */}
      {/* ========================================================= */}
      {activeTab === 'historico' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1F4D36]" />
                Linha do Tempo de Atendimentos & Apontamentos
              </h2>
              <p className="text-[11px] text-[#6B726B]">
                Acompanhe as sessões realizadas, as queixas trazidas e as emoções trabalhadas em ordem cronológica.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('nova_evolucao')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Evoluir Sessão
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DF] text-[#6B726B] space-y-2">
              <Calendar className="w-10 h-10 mx-auto opacity-30 text-[#1F4D36]" />
              <p className="text-sm font-semibold text-[#222924]">Nenhuma sessão registrada no histórico ainda.</p>
              <p className="text-xs text-[#6B726B]">Clique em &quot;Registrar Nova Evolução Clínica SOAP&quot; para iniciar o acompanhamento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, idx) => {
                const sessionNumber = history.length - idx;
                const isSoapExpanded = expandedSoaps[record.id];

                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm hover:shadow-md transition-all p-5 space-y-4"
                  >
                    {/* Header da Sessão */}
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
                                  <MapPin className="w-3 h-3 text-amber-600" /> Presencial (60 min)
                                </>
                              ) : (
                                <>
                                  <Video className="w-3 h-3 text-[#1F4D36]" /> Online (50 min)
                                </>
                              )}
                            </span>
                            <span>•</span>
                            <span>{record.sessionType === 'package' ? 'Sessão de Pacote' : 'Sessão Regular'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        {record.aiAssisted && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EBF3ED] text-[#1F4D36] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> SOAP com IA
                          </span>
                        )}
                        {record.isLocked && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Sigilo Travado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Apontamentos Clínicos & Queixas */}
                    {record.rawNotes && (
                      <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-1.5">
                        <span className="text-[11px] font-bold text-[#222924] uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#1F4D36]" />
                          Apontamentos da Sessão (Relato do Terapeuta & Queixas)
                        </span>
                        <p className="text-xs text-[#222924] leading-relaxed whitespace-pre-line">
                          {record.rawNotes}
                        </p>
                      </div>
                    )}

                    {/* Situações & Protocolos Trabalhados nesta Sessão */}
                    {record.situacoes && record.situacoes.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 space-y-2">
                        <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <BookmarkPlus className="w-3.5 h-3.5 text-amber-700" />
                          Situações & Protocolos Bioenergéticos ({record.situacoes.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {record.situacoes.map((sit, sitIdx) => (
                            <div
                              key={sitIdx}
                              className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                  {sit.categoria}
                                </span>
                                <span className="text-xs font-bold text-[#222924]">➔ {sit.situacao}</span>
                              </div>
                              {sit.complemento && (
                                <p className="text-[11px] text-[#6B726B] italic font-medium">
                                  &quot;{sit.complemento}&quot;
                                </p>
                              )}
                              {sit.emocoes && sit.emocoes.length > 0 && (
                                <div className="flex flex-wrap gap-1 items-center pt-1 border-t border-amber-100">
                                  <span className="text-[9px] text-gray-500 font-semibold uppercase">Emoções:</span>
                                  {sit.emocoes.map((e) => (
                                    <span
                                      key={e}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200"
                                    >
                                      {e}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emoções Trabalhadas na Sessão */}
                    {record.emocoesTrabalhadas && record.emocoesTrabalhadas.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#222924] flex items-center gap-1.5">
                            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                            Emoções Trabalhadas ({record.emocoesTrabalhadas.length})
                          </span>
                          <span className="text-[10px] text-[#6B726B]">
                            Clique na emoção para ler o significado
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
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
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all hover:scale-105 ${
                                  isNeg
                                    ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                }`}
                              >
                                <span>{emoTitle}</span>
                                <Info className="w-3 h-3 opacity-60" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Estrutura SOAP (Expansível) */}
                    <div className="pt-2 border-t border-[#E8E5DF]">
                      <button
                        type="button"
                        onClick={() => toggleSoapExpand(record.id)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-[#1F4D36] hover:underline"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Estrutura Clínica SOAP (Subjetivo, Objetivo, Avaliação, Plano)
                        </span>
                        {isSoapExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {isSoapExpanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 animate-fade-in">
                          <div className="p-3 rounded-xl bg-white border border-[#E8E5DF]">
                            <strong className="text-[#1F4D36] block mb-1 font-bold">
                              S — Subjetivo (Falas do Paciente):
                            </strong>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                              {record.soap.subjective || '—'}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-[#E8E5DF]">
                            <strong className="text-[#1F4D36] block mb-1 font-bold">
                              O — Objetivo (Observações Corporais / Postura):
                            </strong>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                              {record.soap.objective || '—'}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-[#E8E5DF]">
                            <strong className="text-[#1F4D36] block mb-1 font-bold">
                              A — Avaliação (Hipóteses & Desbloqueios):
                            </strong>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                              {record.soap.assessment || '—'}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-white border border-[#E8E5DF]">
                            <strong className="text-[#1F4D36] block mb-1 font-bold">
                              P — Plano (Encaminhamentos & Ancoragem):
                            </strong>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                              {record.soap.plan || '—'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ABA 2: REGISTRAR NOVA EVOLUÇÃO CLÍNICA & APONTAR EMOÇÕES  */}
      {/* ========================================================= */}
      {activeTab === 'nova_evolucao' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lado Esquerdo: Anotações Livres do Terapeuta */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#222924] uppercase tracking-wider">
                    1. Relato & Apontamentos da Sessão
                  </label>
                  <span className="text-[11px] text-[#6B726B]">
                    Auto-salvo no aparelho
                  </span>
                </div>

                <textarea
                  value={rawNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={11}
                  placeholder="Digite as prioridades e queixas da sessão: bloqueios corporais, couraças observadas, falas marcantes, histórico familiar..."
                  className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 leading-relaxed resize-none font-sans"
                ></textarea>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGenerateSoap}
                  disabled={isGenerating || !rawNotes.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#EBF3ED] text-[#1F4D36] text-xs font-bold hover:bg-[#dceade] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-[#1F4D36]" />
                  {isGenerating ? 'Processando com Gemini...' : 'Estruturar em SOAP com IA'}
                </button>
                <p className="text-[11px] text-[#6B726B] text-center">
                  🔒 <strong>Privacidade:</strong> Dados são anonimizados antes do envio à IA.
                </p>
              </div>
            </div>

            {/* Lado Direito: Estrutura SOAP (Subjetivo, Objetivo, Avaliação, Plano) */}
            <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#222924] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#1F4D36]" /> 2. Estrutura Clínica SOAP
                  </label>
                  <span className="text-[11px] text-[#1F4D36] font-semibold">
                    Padrão CFP / Saúde
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1F4D36] uppercase">
                      S — Subjetivo (Falas e queixas do paciente)
                    </label>
                    <textarea
                      value={soap.subjective}
                      onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-[#1F4D36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1F4D36] uppercase">
                      O — Objetivo (Observações corporais / bioenergéticas)
                    </label>
                    <textarea
                      value={soap.objective}
                      onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-[#1F4D36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1F4D36] uppercase">
                      A — Avaliação (Hipóteses e progresso terapêutico)
                    </label>
                    <textarea
                      value={soap.assessment}
                      onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-[#1F4D36]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1F4D36] uppercase">
                      P — Plano (Direcionamento e próxima sessão)
                    </label>
                    <textarea
                      value={soap.plan}
                      onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-[#1F4D36]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveRecord(false)}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs font-semibold hover:bg-[#FBF9F5] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-gray-500" />
                  Salvar Rascunho
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveRecord(true)}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  Concluir & Gravar na Linha do Tempo
                </button>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Situações & Protocolos Bioenergéticos (Medos, Relacionamentos, Linha do Tempo) */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                  <BookmarkPlus className="w-4 h-4 text-amber-600" />
                  3. Situações & Protocolos Bioenergéticos ({situacoesList.length} apontamentos)
                </h2>
                <p className="text-[11px] text-[#6B726B]">
                  Aponte os medos, relacionamentos ou momentos da linha do tempo trabalhados e associe às emoções correspondentes.
                </p>
              </div>

              {/* Seletor Rápido de Categorias Principais */}
              <div className="flex items-center gap-1.5 bg-[#FBF9F5] p-1 rounded-xl border border-[#E8E5DF] text-[11px] font-semibold text-[#6B726B]">
                {getRootCategories().map((cat) => (
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
            </div>

            {/* Painel de Adição de Apontamento */}
            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#222924] mb-1">
                    Situação / Subcategoria ({currentCategory}):
                  </label>
                  <select
                    value={currentSituation}
                    onChange={(e) => setCurrentSituation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-[#222924] font-medium focus:outline-none focus:ring-2 focus:ring-[#1F4D36]"
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
                    placeholder="Ex: Pessoa que ama, Ansiedade financeira, Dores cervicais, Expectativa dos pais..."
                    className="w-full p-2.5 rounded-xl border border-amber-300 bg-white text-xs text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]"
                  />
                </div>
              </div>

              {/* Emoções Associadas a esta Situação */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#222924]">
                  Emoções associadas a esta situação:
                </label>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {currentAssocEmotions.map((emo) => (
                    <span
                      key={emo}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300"
                    >
                      {emo}
                      <button
                        type="button"
                        onClick={() => setCurrentAssocEmotions(currentAssocEmotions.filter((x) => x !== emo))}
                        className="text-rose-700 hover:text-rose-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  {/* Seletor rápido de emoções frequentes ou busca */}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !currentAssocEmotions.includes(e.target.value)) {
                        setCurrentAssocEmotions([...currentAssocEmotions, e.target.value]);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-amber-300 bg-white text-xs text-[#222924] focus:outline-none"
                  >
                    <option value="">+ Vincular emoção...</option>
                    {emotionsCatalog.map((emo) => (
                      <option key={emo.title} value={emo.title}>
                        {emo.title} ({emo.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddSituacao}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Apontamento à Sessão
                </button>
              </div>
            </div>

            {/* Lista de Situações Adicionadas nesta Sessão */}
            {situacoesList.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-[#222924] block">
                  Situações que serão registradas nesta evolução:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {situacoesList.map((sit, idx) => (
                    <div
                      key={idx}
                      className="bg-[#FBF9F5] p-3 rounded-xl border border-amber-200 flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                            {sit.categoria}
                          </span>
                          <span className="text-xs font-bold text-[#222924]">➔ {sit.situacao}</span>
                        </div>
                        {sit.complemento && (
                          <p className="text-[11px] text-[#6B726B] italic">&quot;{sit.complemento}&quot;</p>
                        )}
                        {sit.emocoes && sit.emocoes.length > 0 && (
                          <div className="flex flex-wrap gap-1 items-center pt-1">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase">Emoções:</span>
                            {sit.emocoes.map((e) => (
                              <span
                                key={e}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200"
                              >
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSituacao(idx)}
                        className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                        title="Remover apontamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 4: Emoções Trabalhadas nesta Sessão */}
          <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  4. Apontamento de Emoções Trabalhadas ({selectedEmotions.length} selecionadas)
                </h2>
                <p className="text-[11px] text-[#6B726B]">
                  Selecione as emoções liberadas (negativas) ou ancoradas (positivas) durante os exercícios bioenergéticos.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FBF9F5] p-1 rounded-xl border border-[#E8E5DF] text-[11px] font-semibold text-[#6B726B]">
                <button
                  type="button"
                  onClick={() => setEmotionFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    emotionFilter === 'all' ? 'bg-white text-[#1F4D36] shadow-xs' : ''
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setEmotionFilter('Negativa')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    emotionFilter === 'Negativa' ? 'bg-rose-100 text-rose-800 shadow-xs' : ''
                  }`}
                >
                  Negativas
                </button>
                <button
                  type="button"
                  onClick={() => setEmotionFilter('Positiva')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    emotionFilter === 'Positiva' ? 'bg-emerald-100 text-emerald-800 shadow-xs' : ''
                  }`}
                >
                  Positivas
                </button>
              </div>
            </div>

            {/* Emoções Selecionadas em Destaque */}
            {selectedEmotions.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-1.5">
                <span className="text-[11px] font-bold text-[#222924] block">
                  Emoções que ficarão gravadas nesta sessão:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmotions.map((title) => {
                    const item = emotionsCatalog.find((e) => e.title === title);
                    const isNeg = item?.type === 'Negativa';
                    return (
                      <div
                        key={title}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          isNeg
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openEmotionDetails(title)}
                          className="hover:underline flex items-center gap-1"
                        >
                          <span>{title}</span>
                          <Info className="w-3 h-3 opacity-60" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEmotion(title)}
                          className="ml-1 text-gray-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Busca e Lista de Emoções */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar emoção pelo nome ou código (ex: Ansiedade, Medo, A1, B2)..."
                  value={emotionSearch}
                  onChange={(e) => setEmotionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30"
                />
              </div>

              <div className="max-h-52 overflow-y-auto p-2 rounded-xl border border-[#E8E5DF]/60 bg-[#FBF9F5]/50 flex flex-wrap gap-1.5">
                {filteredEmotions.slice(0, 100).map((emotion) => {
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
                          <span className="text-[10px] opacity-75 font-mono mr-0.5">
                            [{emotion.code}]
                          </span>
                        )}
                        <span>{emotion.title}</span>
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setReadingEmotion(emotion)}
                        title="Ver significado clínico desta emoção"
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
      {/* ABA 3: PÓS-SESSÃO, JORNADAS CONTÍNUAS & MEMÓRIA IA B.E.M. */}
      {/* ========================================================= */}
      {activeTab === 'ia_bem' && aiAgentsEnabled && (
        <PatientAiPanel
          patient={{ id: patient.id, name: patient.name }}
          appointmentId={appointmentId}
          draftRawNotes={rawNotes}
          draftSoap={soap}
          draftEmotions={selectedEmotions}
          draftSituacoes={situacoesList}
          latestHistoryRecord={history[0]}
          memories={patientMemories}
          programs={patientPrograms}
          defaultDeliveryMode={defaultDeliveryMode}
        />
      )}

      {/* MODAL: Visualização da Descrição Terapêutica da Emoção */}
      {readingEmotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div className="flex items-center gap-2">
                {readingEmotion.code && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                    {readingEmotion.code}
                  </span>
                )}
                <h3 className="font-bold text-[#222924] text-lg">{readingEmotion.title}</h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    readingEmotion.type === 'Negativa'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {readingEmotion.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReadingEmotion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#222924]">
              <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-2">
                <span className="text-[11px] font-bold text-[#1F4D36] uppercase tracking-wider block">
                  Descrição Terapêutica & Significado Clínico:
                </span>
                <p className="whitespace-pre-line text-xs text-[#222924] leading-relaxed">
                  {readingEmotion.description}
                </p>
              </div>

              {readingEmotion.phrases && (
                <div className="p-3.5 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 space-y-1">
                  <span className="text-[11px] font-bold text-[#1F4D36] block">
                    Frases de Ancoragem / Reflexão:
                  </span>
                  <p className="whitespace-pre-line text-xs text-[#1F4D36]">
                    {readingEmotion.phrases}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs">
              <Link
                href="/emocoes"
                target="_blank"
                className="text-[#1F4D36] font-semibold hover:underline flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {isSuperAdmin ? 'Editar no Catálogo de Emoções' : 'Abrir Catálogo de Emoções'}
              </Link>
              <button
                type="button"
                onClick={() => setReadingEmotion(null)}
                className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white font-semibold hover:bg-[#183C2A]"
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
