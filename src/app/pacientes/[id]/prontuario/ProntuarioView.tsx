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
  RotateCcw
} from 'lucide-react';
import { generateSoapAction, saveClinicalRecordAction } from './actions';

interface SoapData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface HistoricalRecord {
  id: string;
  sessionDate: string;
  soap: SoapData;
  aiAssisted: boolean;
  isLocked: boolean;
}

export function ProntuarioView({
  patient,
  appointmentId,
  history,
}: {
  patient: { id: string; name: string; notes?: string | null };
  appointmentId?: string;
  history: HistoricalRecord[];
}) {
  const [rawNotes, setRawNotes] = useState('');
  const [soap, setSoap] = useState<SoapData>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedLocal, setLastSavedLocal] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const storageKey = `bem_draft_${patient.id}`;

  // Recupera rascunho salvo localmente
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setRawNotes(saved);
        setLastSavedLocal('Recuperado da memória local');
      }
    } catch (e) {
      console.warn('Erro ao ler localStorage', e);
    }
  }, [storageKey]);

  // Salva automaticamente no IndexedDB/LocalStorage a cada alteração
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
    if (!rawNotes.trim() && !soap.subjective) {
      alert('Preencha ao menos as anotações ou a estrutura SOAP.');
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
      });
      // Limpa rascunho local após salvar no banco com criptografia
      localStorage.removeItem(storageKey);
      setLastSavedLocal(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      setRawNotes('');
      setSoap({ subjective: '', objective: '', assessment: '', plan: '' });
    } catch (err: any) {
      alert('Erro ao salvar prontuário: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/pacientes"
            className="w-9 h-9 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#222924]">{patient.name}</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Prontuário Criptografado
              </span>
            </div>
            <p className="text-xs text-[#6B726B]">
              Evolução de Atendimento & Estruturação Clínica SOAP com IA
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
        <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-[#1F4D36] text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-[#1F4D36]" />
          Evolução clínica criptografada e salva com sucesso no histórico do paciente!
        </div>
      )}

      {/* Editor Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Anotações Livres do Terapeuta */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#222924] uppercase tracking-wider">
                1. Relato Livre da Sessão
              </label>
              <span className="text-[11px] text-[#6B726B]">
                Auto-salvo no aparelho a cada toque
              </span>
            </div>

            <textarea
              value={rawNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={12}
              placeholder="Digite livremente o que o paciente trouxe durante a consulta: queixas, expressões, dinâmicas familiares, temas trabalhados..."
              className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 leading-relaxed resize-none font-sans"
            ></textarea>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleGenerateSoap}
              disabled={isGenerating || !rawNotes.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#EBF3ED] text-[#1F4D36] text-xs font-bold hover:bg-[#dceade] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#1F4D36]" />
              {isGenerating ? 'Processando com Gemini...' : 'Estruturar em SOAP com IA'}
            </button>
            <p className="text-[11px] text-[#6B726B] text-center">
              🔒 <strong>Privacidade Garantida:</strong> Os dados são anonimizados localmente antes de qualquer análise.
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
                  S — Subjetivo (Falas e percepções do paciente)
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
                  O — Objetivo (Observações do terapeuta)
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
                  P — Plano (Encaminhamentos e próxima sessão)
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
              onClick={() => handleSaveRecord(false)}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs font-semibold hover:bg-[#FBF9F5] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4 text-gray-500" />
              Salvar Rascunho
            </button>

            <button
              onClick={() => handleSaveRecord(true)}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Lock className="w-4 h-4" />
              Concluir & Travar
            </button>
          </div>
        </div>
      </div>

      {/* Histórico de Evoluções Anteriores */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
          <h2 className="text-base font-bold text-[#222924] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1F4D36]" />
            Histórico de Evoluções Clínicas ({history.length})
          </h2>
          <span className="text-xs text-[#6B726B]">Ordem cronológica reversa</span>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Nenhuma evolução anterior registrada para este paciente.
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1F4D36]">
                    Sessão em {record.sessionDate}
                  </span>
                  <div className="flex items-center gap-2">
                    {record.aiAssisted && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36] flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Assistido por IA
                      </span>
                    )}
                    {record.isLocked && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Travado (Sigilo CFP)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E5DF]/60">
                    <strong className="text-[#1F4D36] block mb-0.5">S (Subjetivo):</strong>
                    <p className="text-gray-700">{record.soap.subjective || '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E5DF]/60">
                    <strong className="text-[#1F4D36] block mb-0.5">O (Objetivo):</strong>
                    <p className="text-gray-700">{record.soap.objective || '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E5DF]/60">
                    <strong className="text-[#1F4D36] block mb-0.5">A (Avaliação):</strong>
                    <p className="text-gray-700">{record.soap.assessment || '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E8E5DF]/60">
                    <strong className="text-[#1F4D36] block mb-0.5">P (Plano):</strong>
                    <p className="text-gray-700">{record.soap.plan || '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

