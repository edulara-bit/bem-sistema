'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Waves,
  Search,
  Plus,
  Edit2,
  BookOpen,
  X,
  Check,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  updateEmotionAction,
  createEmotionAction,
  deleteEmotionAction,
  createFrequencyAction,
  updateFrequencyAction,
  deleteFrequencyAction,
} from './actions';

export interface EmotionItem {
  id: string;
  code?: string | null;
  title: string;
  description: string;
  phrases?: string | null;
  type: string;
}

export interface FrequencyItem {
  id: string;
  number: string;
  title: string;
  description: string;
}

export function EmotionsView({
  emotions,
  frequencies = [],
  canManage = false,
}: {
  emotions: EmotionItem[];
  frequencies?: FrequencyItem[];
  canManage?: boolean;
}) {
  const router = useRouter();

  const [catalogTab, setCatalogTab] = useState<'emotions' | 'frequencies'>('emotions');

  // Estados Emoções
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Negativa' | 'Positiva'>('all');
  const [editingEmotion, setEditingEmotion] = useState<EmotionItem | null>(null);
  const [readingEmotion, setReadingEmotion] = useState<EmotionItem | null>(null);
  const [showNewEmotionModal, setShowNewEmotionModal] = useState(false);

  // Estados Frequências
  const [freqSearch, setFreqSearch] = useState('');
  const [editingFreq, setEditingFreq] = useState<FrequencyItem | null>(null);
  const [readingFreq, setReadingFreq] = useState<FrequencyItem | null>(null);
  const [showNewFreqModal, setShowNewFreqModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
    router.refresh();
  };

  const filteredEmotions = emotions.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.code && e.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || e.type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredFrequencies = frequencies.filter(
    (f) =>
      f.number.toLowerCase().includes(freqSearch.toLowerCase()) ||
      f.title.toLowerCase().includes(freqSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(freqSearch.toLowerCase())
  );

  const totalNegativas = emotions.filter((e) => e.type === 'Negativa').length;
  const totalPositivas = emotions.filter((e) => e.type === 'Positiva').length;

  return (
    <div className="space-y-6">
      {/* Top Banner + Seletor Emoções vs Frequências */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              Protocolo Oficial da Medicina Bioenergética B.E.M.
            </div>
            <h1 className="text-xl font-bold text-[#222924]">
              Emoções & Frequências Vibracionais
            </h1>
            <p className="text-xs text-[#6B726B] mt-0.5">
              {canManage
                ? 'Gerencie o catálogo oficial de Emoções e de Frequências vibracionais da realidade utilizadas nos atendimentos.'
                : 'Consulte o significado das Emoções e das Frequências vibracionais do protocolo B.E.M.'}
            </p>
          </div>

          {canManage ? (
            catalogTab === 'emotions' ? (
              <button
                type="button"
                onClick={() => setShowNewEmotionModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                Nova Emoção
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewFreqModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                Nova Frequência
              </button>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs font-semibold text-[#6B726B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1F4D36]" />
              Catálogo Oficial B.E.M. (Consulta)
            </span>
          )}
        </div>

        {/* Abas Emoções | Frequências */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#E8E5DF]">
          <button
            type="button"
            onClick={() => setCatalogTab('emotions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              catalogTab === 'emotions'
                ? 'bg-[#1F4D36] text-white shadow-xs'
                : 'bg-[#FBF9F5] text-[#6B726B] hover:text-[#222924] border border-[#E8E5DF]'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Emoções Clínicas ({emotions.length})
          </button>

          <button
            type="button"
            onClick={() => setCatalogTab('frequencies')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              catalogTab === 'frequencies'
                ? 'bg-[#1F4D36] text-white shadow-xs'
                : 'bg-[#FBF9F5] text-[#6B726B] hover:text-[#222924] border border-[#E8E5DF]'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            Frequências Vibracionais ({frequencies.length})
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-[#1F4D36] text-sm flex items-center gap-2 font-medium">
          <Check className="w-5 h-5 text-[#1F4D36]" />
          {successMsg}
        </div>
      )}

      {/* ================= ABA 1: EMOÇÕES ================= */}
      {catalogTab === 'emotions' && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar emoção por nome, código (A1, A2...) ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/20 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'all' ? 'bg-[#1F4D36] text-white shadow-xs' : 'hover:bg-gray-50'
                }`}
              >
                Todas ({emotions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Negativa')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'Negativa'
                    ? 'bg-rose-100 text-rose-800 shadow-xs'
                    : 'hover:bg-gray-50'
                }`}
              >
                Negativas ({totalNegativas})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('Positiva')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterType === 'Positiva'
                    ? 'bg-emerald-100 text-emerald-800 shadow-xs'
                    : 'hover:bg-gray-50'
                }`}
              >
                Positivas ({totalPositivas})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmotions.map((item) => {
              const isNeg = item.type === 'Negativa';
              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {item.code && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                            {item.code}
                          </span>
                        )}
                        <h3 className="font-bold text-[#222924] text-base">{item.title}</h3>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isNeg
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isNeg ? 'Negativa' : 'Positiva'}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B726B] line-clamp-3 leading-relaxed mb-4">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setReadingEmotion(item)}
                      className="text-[#1F4D36] hover:underline font-semibold flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Ler Completa
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setEditingEmotion(item)}
                        className="px-2.5 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] hover:bg-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ================= ABA 2: FREQUÊNCIAS VIBRACIONAIS B.E.M. ================= */}
      {catalogTab === 'frequencies' && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar frequência por número (1, 2, 3...), título ou expressão vibracional..."
              value={freqSearch}
              onChange={(e) => setFreqSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/20 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFrequencies.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-[#E8E5DF] text-[#6B726B]">
                <Waves className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#1F4D36]" />
                <p className="text-sm font-semibold text-[#222924]">
                  Nenhuma frequência encontrada.
                </p>
              </div>
            ) : (
              filteredFrequencies.map((freq) => (
                <div
                  key={freq.id}
                  className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className="w-8 h-8 rounded-xl bg-[#1F4D36] text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {freq.number}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F4D36] block">
                          Frequência Nº {freq.number}
                        </span>
                        <h3 className="font-bold text-[#222924] text-base leading-tight">
                          {freq.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-[#6B726B] line-clamp-4 leading-relaxed mb-4">
                      {freq.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setReadingFreq(freq)}
                      className="text-[#1F4D36] hover:underline font-semibold flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Ler Descrição
                    </button>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingFreq(freq)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] hover:bg-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              confirm(
                                `Deseja excluir a Frequência Nº ${freq.number} (${freq.title})?`
                              )
                            ) {
                              await deleteFrequencyAction(freq.id);
                              triggerSuccess('Frequência removida.');
                            }
                          }}
                          className="p-1.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* MODAL: Leitura de Emoção */}
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
            <div className="flex justify-end gap-2 pt-2">
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    const t = readingEmotion;
                    setReadingEmotion(null);
                    setEditingEmotion(t);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold"
                >
                  Editar Emoção
                </button>
              )}
              <button
                type="button"
                onClick={() => setReadingEmotion(null)}
                className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Leitura de Frequência */}
      {readingFreq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#1F4D36] text-white font-bold flex items-center justify-center text-sm">
                  {readingFreq.number}
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#1F4D36] block">
                    Frequência Vibracional Nº {readingFreq.number}
                  </span>
                  <h3 className="font-bold text-[#222924] text-lg">{readingFreq.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadingFreq(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs whitespace-pre-line leading-relaxed text-[#222924]">
              {readingFreq.description}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    const f = readingFreq;
                    setReadingFreq(null);
                    setEditingFreq(f);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold"
                >
                  Editar Frequência
                </button>
              )}
              <button
                type="button"
                onClick={() => setReadingFreq(null)}
                className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Editar Frequência (Exclusivo Admin) */}
      {(showNewFreqModal || editingFreq) && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base flex items-center gap-2">
                <Waves className="w-4 h-4 text-[#1F4D36]" />
                {editingFreq
                  ? `Editar Frequência Nº ${editingFreq.number}`
                  : 'Cadastrar Nova Frequência Vibracional'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewFreqModal(false);
                  setEditingFreq(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                try {
                  if (editingFreq) {
                    await updateFrequencyAction(formData);
                    triggerSuccess('Frequência atualizada com sucesso!');
                  } else {
                    await createFrequencyAction(formData);
                    triggerSuccess('Nova frequência cadastrada com sucesso!');
                  }
                  setEditingFreq(null);
                  setShowNewFreqModal(false);
                } catch (err: any) {
                  alert(err.message || 'Erro ao salvar frequência.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {editingFreq && <input type="hidden" name="id" value={editingFreq.id} />}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#222924] mb-1">Número *</label>
                  <input
                    type="text"
                    name="number"
                    required
                    defaultValue={editingFreq?.number || ''}
                    placeholder="Ex: 1, 2, 9..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] font-bold text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-[#222924] mb-1">
                    Título da Expressão Vibracional *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingFreq?.title || ''}
                    placeholder="Ex: Unidade / Harmonia / Expansão..."
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#222924] mb-1">
                  Descrição Vibracional (Usada na Compilação de Feedback com IA) *
                </label>
                <textarea
                  name="description"
                  rows={6}
                  required
                  defaultValue={editingFreq?.description || ''}
                  placeholder="Descreva o significado fundamental desta frequência na realidade e como ela acompanha a liberação/integração emocional no B.E.M...."
                  className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFreqModal(false);
                    setEditingFreq(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Frequência'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Editar Emoção (Exclusivo Admin) */}
      {(showNewEmotionModal || editingEmotion) && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base">
                {editingEmotion
                  ? `Editar Emoção: ${editingEmotion.title}`
                  : 'Cadastrar Nova Emoção'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingEmotion(null);
                  setShowNewEmotionModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                try {
                  if (editingEmotion) {
                    await updateEmotionAction(formData);
                    triggerSuccess('Emoção atualizada com sucesso!');
                  } else {
                    await createEmotionAction(formData);
                    triggerSuccess('Nova emoção cadastrada!');
                  }
                  setEditingEmotion(null);
                  setShowNewEmotionModal(false);
                } catch (err: any) {
                  alert(err.message || 'Erro ao salvar emoção.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              {editingEmotion && <input type="hidden" name="id" value={editingEmotion.id} />}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-[#222924] mb-1">Nome da Emoção *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingEmotion?.title || ''}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#222924] mb-1">Código</label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={editingEmotion?.code || ''}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#222924] mb-1">Polaridade *</label>
                <select
                  name="type"
                  defaultValue={editingEmotion?.type || 'Negativa'}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] font-semibold"
                >
                  <option value="Negativa">Negativa (Liberação / Desbloqueio)</option>
                  <option value="Positiva">Positiva (Ancoragem / Integração)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#222924] mb-1">
                  Descrição Terapêutica Completa *
                </label>
                <textarea
                  name="description"
                  rows={5}
                  required
                  defaultValue={editingEmotion?.description || ''}
                  className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-[#222924] mb-1">
                  Frases de Ancoragem / Reflexão
                </label>
                <textarea
                  name="phrases"
                  rows={2}
                  defaultValue={editingEmotion?.phrases || ''}
                  className="w-full p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E8E5DF]">
                {editingEmotion ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Excluir a emoção "${editingEmotion.title}"?`)) {
                        await deleteEmotionAction(editingEmotion.id);
                        setEditingEmotion(null);
                        triggerSuccess('Emoção excluída.');
                      }
                    }}
                    className="text-red-600 hover:underline font-semibold"
                  >
                    Excluir Emoção
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmotion(null);
                      setShowNewEmotionModal(false);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#E8E5DF] font-semibold text-[#6B726B]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white font-bold hover:bg-[#183C2A]"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Emoção'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
