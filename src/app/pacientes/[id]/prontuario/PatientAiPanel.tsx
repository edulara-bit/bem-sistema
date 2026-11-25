'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Send,
  Brain,
  Compass,
  CheckCircle2,
  Plus,
  Trash2,
  Play,
  ShieldCheck,
  HeartHandshake,
} from 'lucide-react';
import {
  compilePatientFeedbackAction,
  dispatchPatientFeedbackAction,
  createPatientProgramFromProntuarioAction,
  addPatientMemoryFromProntuarioAction,
} from './actions';
import {
  advanceProgramDayAction,
  deleteMemoryAction,
} from '@/app/ia-copiloto/actions';
import type { ApontamentoSituacao } from './ProntuarioView';
import type { DecryptedMemoryItem } from '@/lib/ai/memory';

export function PatientAiPanel({
  patient,
  appointmentId,
  draftRawNotes,
  draftSoap,
  draftEmotions,
  draftSituacoes,
  latestHistoryRecord,
  memories,
  programs,
  defaultDeliveryMode,
}: {
  patient: { id: string; name: string };
  appointmentId?: string;
  draftRawNotes: string;
  draftSoap: { subjective: string; objective: string; assessment: string; plan: string };
  draftEmotions: string[];
  draftSituacoes: ApontamentoSituacao[];
  latestHistoryRecord?: {
    rawNotes?: string;
    soap: { subjective: string; objective: string; assessment: string; plan: string };
    emocoesTrabalhadas?: string[];
    situacoes?: ApontamentoSituacao[];
  };
  memories: DecryptedMemoryItem[];
  programs: Array<{
    id: string;
    title: string;
    goal: string;
    durationDays: number;
    currentDay: number;
    deliveryMode: string;
    status: string;
    steps: any[];
  }>;
  defaultDeliveryMode: 'review' | 'auto';
}) {
  const router = useRouter();

  // --- Pós-Sessão ---
  const [feedbackText, setFeedbackText] = useState('');
  const [sourcesUsed, setSourcesUsed] = useState<string[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<'review' | 'auto'>(defaultDeliveryMode);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResultMsg, setSendResultMsg] = useState<string | null>(null);

  // --- Jornadas / Desafios ---
  const [progTheme, setProgTheme] = useState('');
  const [progDays, setProgDays] = useState(7);
  const [progMode, setProgMode] = useState<'review' | 'auto'>(defaultDeliveryMode);
  const [sendDay1Now, setSendDay1Now] = useState(true);
  const [isCreatingProg, setIsCreatingProg] = useState(false);

  // --- Nova Memória Individual ---
  const [memCategory, setMemCategory] = useState('padrao_emocional');
  const [memTitle, setMemTitle] = useState('');
  const [memContent, setMemContent] = useState('');
  const [isSavingMem, setIsSavingMem] = useState(false);

  const handleCompileFeedback = async () => {
    setIsCompiling(true);
    setSendResultMsg(null);
    try {
      const hasDraft =
        draftRawNotes.trim().length > 0 ||
        draftEmotions.length > 0 ||
        draftSituacoes.length > 0 ||
        Boolean(draftSoap.subjective);

      const sourceRaw = hasDraft ? draftRawNotes : latestHistoryRecord?.rawNotes || '';
      const sourceSoap = hasDraft
        ? draftSoap
        : latestHistoryRecord?.soap || { subjective: '', objective: '', assessment: '', plan: '' };
      const sourceEmotions = hasDraft
        ? draftEmotions
        : latestHistoryRecord?.emocoesTrabalhadas || [];
      const sourceSituacoes = hasDraft ? draftSituacoes : latestHistoryRecord?.situacoes || [];

      const res = await compilePatientFeedbackAction({
        patientId: patient.id,
        appointmentId,
        rawNotes: sourceRaw,
        soap: sourceSoap,
        emocoesTrabalhadas: sourceEmotions,
        situacoes: sourceSituacoes,
      });

      setFeedbackText(res.feedbackText);
      setSourcesUsed(res.sourcesUsed || []);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao compilar devolutiva pós-sessão.');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDispatchFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSending(true);
    try {
      const res = await dispatchPatientFeedbackAction({
        patientId: patient.id,
        appointmentId,
        messageText: feedbackText,
        deliveryMode,
      });

      if (res.status === 'sent') {
        setSendResultMsg('✓ Devolutiva enviada diretamente para o WhatsApp do paciente!');
      } else if (res.status === 'pending_review') {
        setSendResultMsg(
          '⏳ Devolutiva registrada na Fila de Revisão (Central de Agentes) aguardando disparo final.'
        );
      } else {
        setSendResultMsg(`⚠️ Atenção no envio: ${res.error || 'verifique a conexão do WhatsApp'}`);
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progTheme.trim()) return;
    setIsCreatingProg(true);
    try {
      const res = await createPatientProgramFromProntuarioAction({
        patientId: patient.id,
        themeOrGoal: progTheme,
        durationDays: progDays,
        deliveryMode: progMode,
        sendFirstDayNow: sendDay1Now,
      });
      setProgTheme('');
      alert(
        `Jornada "${res.title}" atribuída a ${patient.name}!${
          res.dispatchStatus === 'sent'
            ? ' O Dia 1 já foi enviado no WhatsApp!'
            : res.dispatchStatus === 'pending_review'
            ? ' O Dia 1 aguarda revisão na Fila de Aprovação.'
            : ''
        }`
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCreatingProg(false);
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim() || !memContent.trim()) return;
    setIsSavingMem(true);
    try {
      await addPatientMemoryFromProntuarioAction({
        patientId: patient.id,
        category: memCategory,
        title: memTitle,
        content: memContent,
      });
      setMemTitle('');
      setMemContent('');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingMem(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. COMPILADOR DE FEEDBACK PÓS-SESSÃO B.E.M. */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1F4D36] bg-[#EBF3ED] px-2.5 py-0.5 rounded-full mb-1">
              <HeartHandshake className="w-3.5 h-3.5" />
              Agente Clínico de Devolutiva B.E.M.
            </div>
            <h2 className="text-base font-bold text-[#222924]">
              Compilação de Feedback Pós-Sessão para {patient.name}
            </h2>
            <p className="text-xs text-[#6B726B]">
              Une automaticamente as situações apontadas (Medos, Relacionamento, Timeline), emoções trabalhadas, frases de ancoragem e a memória evolutiva do paciente.
            </p>
          </div>

          <button
            type="button"
            disabled={isCompiling}
            onClick={handleCompileFeedback}
            className="px-4 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            {isCompiling ? 'Compilando com Filosofia B.E.M....' : 'Gerar Feedback Pós-Sessão'}
          </button>
        </div>

        {feedbackText ? (
          <div className="space-y-3">
            {sourcesUsed.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {sourcesUsed.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#FBF9F5] border border-[#E8E5DF] text-[#6B726B]"
                  >
                    📚 {s}
                  </span>
                ))}
              </div>
            )}

            <textarea
              rows={7}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full p-4 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/25"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#222924]">Modo de Envio:</label>
                <select
                  value={deliveryMode}
                  onChange={(e) => setDeliveryMode(e.target.value as 'review' | 'auto')}
                  className="px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs font-semibold text-[#222924]"
                >
                  <option value="auto">⚡ Disparo Direto Agora no WhatsApp</option>
                  <option value="review">🛡️ Guardar na Fila de Revisão antes de enviar</option>
                </select>
              </div>

              <button
                type="button"
                disabled={isSending}
                onClick={handleDispatchFeedback}
                className="px-5 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {isSending
                  ? 'Processando...'
                  : deliveryMode === 'auto'
                  ? 'Aprovar e Enviar Agora no WhatsApp'
                  : 'Salvar na Fila de Revisão'}
              </button>
            </div>

            {sendResultMsg && (
              <div className="p-3 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-xs font-semibold text-[#1F4D36] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {sendResultMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-[#FBF9F5] border border-dashed border-[#E8E5DF] text-center text-xs text-[#6B726B]">
            Clique em <strong>Gerar Feedback Pós-Sessão</strong> acima para a IA redigir a mensagem com base na sessão atual (ou na última sessão registrada no histórico).
          </div>
        )}
      </div>

      {/* 2. PROGRAMAS, EXERCÍCIOS E DESAFIOS CONTÍNUOS + 3. MEMÓRIA INDIVIDUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Jornadas de Autoconsciência */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#222924] flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#1F4D36]" />
              Programas, Exercícios & Desafios Contínuos
            </h3>
            <p className="text-xs text-[#6B726B] mt-0.5">
              Mantenha {patient.name.split(' ')[0]} em desenvolvimento contínuo entre as sessões.
            </p>
          </div>

          <form
            onSubmit={handleCreateProgram}
            className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-3"
          >
            <input
              type="text"
              required
              value={progTheme}
              onChange={(e) => setProgTheme(e.target.value)}
              placeholder="Foco do desafio (ex: Liberar Medo de Crítica no Trabalho)"
              className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={progDays}
                onChange={(e) => setProgDays(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs"
              >
                <option value={7}>Desafio de 7 Dias</option>
                <option value={14}>Jornada de 14 Dias</option>
                <option value={21}>Ciclo de 21 Dias</option>
              </select>
              <select
                value={progMode}
                onChange={(e) => setProgMode(e.target.value as 'review' | 'auto')}
                className="px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs"
              >
                <option value="review">Revisão Humana a cada dia</option>
                <option value="auto">Disparo Direto Automático</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#222924]">
              <input
                type="checkbox"
                checked={sendDay1Now}
                onChange={(e) => setSendDay1Now(e.target.checked)}
              />
              Preparar/enviar o Dia 1 imediatamente
            </label>
            <button
              type="submit"
              disabled={isCreatingProg}
              className="w-full py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50"
            >
              {isCreatingProg ? 'Estruturando Jornada Personalizada...' : 'Criar e Atribuir Programa B.E.M.'}
            </button>
          </form>

          <div className="space-y-2.5">
            {programs.length === 0 ? (
              <p className="text-xs text-[#6B726B] text-center py-4">
                Nenhum programa ativo atribuído a este paciente ainda.
              </p>
            ) : (
              programs.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#222924]">{p.title}</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF3ED] text-[#1F4D36]">
                      Dia {p.currentDay}/{p.durationDays} ({p.deliveryMode === 'auto' ? 'Auto' : 'Revisão'})
                    </span>
                  </div>
                  <details className="text-[11px] text-[#6B726B]">
                    <summary className="cursor-pointer font-semibold text-[#1F4D36]">
                      Ver etapas diárias ({p.steps.length} dias)
                    </summary>
                    <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                      {p.steps.map((s: any) => (
                        <div key={s.day} className="p-2 rounded bg-white border border-[#E8E5DF]">
                          <strong>Dia {s.day}: {s.title}</strong> — {s.somaticExercise}
                        </div>
                      ))}
                    </div>
                  </details>
                  {p.status === 'active' && (
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await advanceProgramDayAction(p.id);
                        alert(
                          r.dispatchStatus === 'sent'
                            ? `Dia ${p.currentDay} enviado no WhatsApp!`
                            : `Dia ${p.currentDay} enviado para sua Fila de Revisão!`
                        );
                        router.refresh();
                      }}
                      className="w-full py-1.5 rounded-lg bg-[#1F4D36] text-white text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Disparar/Preparar Dia {p.currentDay}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna Memória Evolutiva Individual do Paciente */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                <Brain className="w-4 h-4 text-[#1F4D36]" />
                Memória Estruturada do Paciente ({memories.length})
              </h3>
              <p className="text-xs text-[#6B726B] mt-0.5">
                Criptografada em repouso (AES-256-GCM) e anonimizada antes de qualquer consulta à IA.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#1F4D36] shrink-0" />
          </div>

          <form
            onSubmit={handleSaveMemory}
            className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-2.5"
          >
            <div className="grid grid-cols-3 gap-2">
              <select
                value={memCategory}
                onChange={(e) => setMemCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-xs"
              >
                <option value="padrao_emocional">Padrão Emocional</option>
                <option value="gatilho">Gatilho / Contexto</option>
                <option value="evolucao">Conquista / Evolução</option>
                <option value="preferencia">Preferência Prática</option>
              </select>
              <input
                type="text"
                required
                value={memTitle}
                onChange={(e) => setMemTitle(e.target.value)}
                placeholder="Título curto do registro..."
                className="col-span-2 px-3 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-xs"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={memContent}
                onChange={(e) => setMemContent(e.target.value)}
                placeholder="Ex: Sente aperto no peito ao falar com o pai; responde bem a grounding..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-xs"
              />
              <button
                type="submit"
                disabled={isSavingMem}
                className="px-3.5 py-1.5 rounded-lg bg-[#1F4D36] text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Salvar
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {memories.length === 0 ? (
              <p className="text-xs text-[#6B726B] text-center py-6">
                A memória evolutiva deste paciente será alimentada automaticamente a cada sessão salva ou manualmente acima.
              </p>
            ) : (
              memories.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] flex items-start justify-between gap-2"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#1F4D36]">
                      {m.category}
                    </span>
                    <h4 className="text-xs font-bold text-[#222924]">{m.title}</h4>
                    <p className="text-[11px] text-[#6B726B]">{m.content}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteMemoryAction(m.id);
                      router.refresh();
                    }}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
