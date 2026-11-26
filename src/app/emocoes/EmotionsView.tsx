'use client';

import { useState } from 'react';
import { 
  Heart, 
  Search, 
  Plus, 
  Edit2, 
  BookOpen, 
  X, 
  Check, 
  Sparkles, 
  ArrowUpDown, 
  Save, 
  FileText,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { updateEmotionAction, createEmotionAction, deleteEmotionAction } from './actions';

interface EmotionItem {
  id: string;
  code?: string | null;
  title: string;
  description: string;
  phrases?: string | null;
  type: string;
}

export function EmotionsView({
  emotions,
  canManage = false,
}: {
  emotions: EmotionItem[];
  canManage?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Negativa' | 'Positiva'>('all');
  
  // Modais
  const [editingEmotion, setEditingEmotion] = useState<EmotionItem | null>(null);
  const [readingEmotion, setReadingEmotion] = useState<EmotionItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const filtered = emotions.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.code && e.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || e.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalNegativas = emotions.filter((e) => e.type === 'Negativa').length;
  const totalPositivas = emotions.filter((e) => e.type === 'Positiva').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            Bioenergética & Mapa Emocional
          </div>
          <h1 className="text-xl font-bold text-[#222924]">
            Catálogo de Emoções Clínicas ({emotions.length})
          </h1>
          <p className="text-xs text-[#6B726B] mt-0.5">
            {canManage
              ? 'Gerencie, cadastre e edite as descrições oficiais do catálogo de emoções B.E.M.'
              : 'Consulte as descrições e frases de ancoragem oficiais da metodologia B.E.M.'}
          </p>
        </div>

        {canManage ? (
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            Nova Emoção
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs font-semibold text-[#6B726B]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1F4D36]" />
            Catálogo Oficial B.E.M. (Somente Consulta)
          </span>
        )}
      </div>

      {showSuccess && (
        <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-[#1F4D36] text-sm flex items-center gap-2 font-medium animate-fade-in">
          <Check className="w-5 h-5 text-[#1F4D36]" />
          Emoção e descrição atualizadas com sucesso!
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, código (A1, A2...) ou palavra na descrição..."
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
              filterType === 'Negativa' ? 'bg-rose-100 text-rose-800 shadow-xs' : 'hover:bg-gray-50'
            }`}
          >
            Negativas ({totalNegativas})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('Positiva')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'Positiva' ? 'bg-emerald-100 text-emerald-800 shadow-xs' : 'hover:bg-gray-50'
            }`}
          >
            Positivas ({totalPositivas})
          </button>
        </div>
      </div>

      {/* Grid de Emoções */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-[#E8E5DF] text-[#6B726B]">
            <Heart className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#1F4D36]" />
            <p className="text-sm font-semibold text-[#222924]">Nenhuma emoção encontrada.</p>
            <p className="text-xs text-[#6B726B] mt-1">Tente ajustar a busca ou o filtro.</p>
          </div>
        ) : (
          filtered.map((item) => {
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
                      className="px-2.5 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] hover:bg-white text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                      Editar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Leitura Completa da Emoção */}
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
                  Descrição Terapêutica & Significado
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

            <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-end gap-2">
              {canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    const target = readingEmotion;
                    setReadingEmotion(null);
                    setEditingEmotion(target);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar esta Descrição
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setReadingEmotion(null)}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A]"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Emoção e Descrição */}
      {editingEmotion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#1F4D36]" />
                Editar Emoção: {editingEmotion.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingEmotion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                await updateEmotionAction(formData);
                setIsSubmitting(false);
                setEditingEmotion(null);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
              }}
              className="space-y-4 text-xs"
            >
              <input type="hidden" name="id" value={editingEmotion.id} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#222924] mb-1">Título da Emoção *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingEmotion.title}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Código (Letra)</label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={editingEmotion.code || ''}
                    placeholder="Ex: A1, B2"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">Polaridade *</label>
                <select
                  name="type"
                  defaultValue={editingEmotion.type}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] font-semibold text-xs"
                >
                  <option value="Negativa">Negativa (Para Liberação / Desbloqueio)</option>
                  <option value="Positiva">Positiva (Para Ancoragem / Integração)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">
                  Descrição Terapêutica Completa (Explicada no Prontuário) *
                </label>
                <textarea
                  name="description"
                  rows={8}
                  required
                  defaultValue={editingEmotion.description}
                  placeholder="Escreva a descrição terapêutica e significado bioenergético desta emoção..."
                  className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs leading-relaxed resize-y font-sans"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">
                  Frases de Ancoragem / Reflexão (Opcional)
                </label>
                <textarea
                  name="phrases"
                  rows={3}
                  defaultValue={editingEmotion.phrases || ''}
                  placeholder="Ex: Eu me permito confiar na minha verdade interior..."
                  className="w-full p-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setEditingEmotion(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nova Emoção */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#1F4D36]" />
                Cadastrar Nova Emoção Clínica
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                await createEmotionAction(formData);
                setIsSubmitting(false);
                setShowNewModal(false);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#222924] mb-1">Título da Emoção *</label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="Ex: Gratidão, Mágoa, Empatia"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Código (Letra)</label>
                  <input
                    type="text"
                    name="code"
                    placeholder="Ex: C1, D4"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">Polaridade *</label>
                <select
                  name="type"
                  defaultValue="Positiva"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] font-semibold text-xs"
                >
                  <option value="Positiva">Positiva (Para Ancoragem / Integração)</option>
                  <option value="Negativa">Negativa (Para Liberação / Desbloqueio)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">
                  Descrição Terapêutica Completa *
                </label>
                <textarea
                  name="description"
                  rows={6}
                  required
                  placeholder="Escreva a descrição terapêutica e como o terapeuta deve orientar essa emoção..."
                  className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs leading-relaxed resize-y font-sans"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">
                  Frases de Ancoragem / Reflexão (Opcional)
                </label>
                <textarea
                  name="phrases"
                  rows={2}
                  placeholder="Ex: Eu me sinto pleno e em paz no meu corpo..."
                  className="w-full p-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar Emoção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
