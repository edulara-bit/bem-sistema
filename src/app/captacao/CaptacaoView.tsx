'use client';

import { useState } from 'react';
import { 
  Users, 
  Sparkles, 
  MessageCircle, 
  Check, 
  ExternalLink, 
  Copy, 
  UserPlus, 
  ArrowRight,
  Filter,
  Share2,
  Calendar,
  X,
  Phone,
  Clock
} from 'lucide-react';
import { updateLeadStageAction, convertLeadToPatientAction, generateApproachMessageAction } from './actions';

interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  demand?: string | null;
  preferredTime?: string | null;
  modality: string;
  stage: string;
  source: string;
  createdAt: string;
}

const STAGES = [
  { id: 'new_lead', label: 'Novos Contatos', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'contacted', label: 'Contato Realizado', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'scheduled', label: 'Sessão Agendada', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  { id: 'converted', label: 'Pacientes Ativos', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
];

export function CaptacaoView({
  leads,
  publicUrl,
}: {
  leads: LeadItem[];
  publicUrl: string;
}) {
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [aiMessage, setAiMessage] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleOpenAiModal = async (lead: LeadItem) => {
    setSelectedLead(lead);
    setIsGeneratingAi(true);
    setAiMessage('');
    try {
      const msg = await generateApproachMessageAction(
        lead.name,
        lead.demand || 'Acolhimento geral e autoconhecimento',
        lead.modality
      );
      setAiMessage(msg);
    } catch (e: any) {
      setAiMessage('Olá! Recebi seu contato e gostaria de agendar nossa primeira sessão de conversa.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleMoveStage = async (id: string, stage: string) => {
    await updateLeadStageAction(id, stage);
  };

  const handleConvertToPatient = async (id: string) => {
    if (confirm('Deseja transformar este interessado em um Paciente oficial no seu consultório?')) {
      await convertLeadToPatientAction(id);
    }
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyAiMessage = () => {
    navigator.clipboard.writeText(aiMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);
  };

  const openWhatsAppWithAiMessage = () => {
    if (!selectedLead) return;
    const cleanPhone = selectedLead.phone.replace(/\D/g, '');
    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${phoneWithDDI}?text=${encodeURIComponent(aiMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Captação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Funil de Captação & CRM de Pacientes
          </div>
          <h1 className="text-xl font-bold text-[#222924]">
            Gestão de Contatos & Conversão Ética
          </h1>
          <p className="text-xs text-[#6B726B] mt-0.5">
            Acompanhe o caminho de cada pessoa desde a primeira dúvida até a primeira sessão.
          </p>
        </div>

        {/* Link Público para Compartilhar */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyPublicUrl}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs font-semibold text-[#222924] hover:bg-white transition-all shadow-xs"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            {copiedLink ? 'Link Copiado!' : 'Copiar Link de Agendamento'}
          </button>
          <a
            href="/agendar"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Página Pública
          </a>
        </div>
      </div>

      {/* Grid do Funil (Kanban) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className="bg-white/80 rounded-2xl border border-[#E8E5DF] shadow-sm p-4 flex flex-col space-y-3 min-h-[300px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DF]">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.color.split(' ')[0]}`}></span>
                  <h3 className="text-xs font-bold text-[#222924] uppercase tracking-wider">
                    {stage.label}
                  </h3>
                </div>
                <span className="text-xs font-bold text-[#6B726B] px-2 py-0.5 rounded-full bg-[#FBF9F5] border border-[#E8E5DF]">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards de Leads */}
              <div className="space-y-3">
                {stageLeads.length === 0 ? (
                  <p className="text-[11px] text-gray-400 text-center py-6">
                    Nenhum contato nesta etapa.
                  </p>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-[#FBF9F5] hover:bg-white p-3.5 rounded-xl border border-[#E8E5DF] transition-all shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-sm text-[#222924]">{lead.name}</h4>
                        <span className="text-[9px] font-semibold text-gray-500 uppercase px-1.5 py-0.5 rounded bg-white border border-[#E8E5DF]">
                          {lead.modality}
                        </span>
                      </div>

                      {lead.demand && (
                        <p className="text-xs text-[#222924]/80 bg-white p-2 rounded-lg border border-[#E8E5DF]/60 line-clamp-2 italic font-sans">
                          "{lead.demand}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-[#6B726B]">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {lead.phone}
                        </span>
                        <span>{lead.preferredTime || 'Tarde'}</span>
                      </div>

                      {/* Botões de Ação */}
                      <div className="pt-2 border-t border-[#E8E5DF]/70 flex flex-wrap items-center justify-between gap-1.5">
                        <button
                          onClick={() => handleOpenAiModal(lead)}
                          className="px-2 py-1 rounded-lg bg-[#EBF3ED] text-[#1F4D36] text-[11px] font-semibold hover:bg-[#dceade] transition-all flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          Mensagem IA
                        </button>

                        {lead.stage !== 'converted' ? (
                          <button
                            onClick={() => handleConvertToPatient(lead.id)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-xs"
                            title="Transformar em Paciente ativo"
                          >
                            <UserPlus className="w-3 h-3" />
                            Tornar Paciente
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Paciente Ativo
                          </span>
                        )}

                        {/* Dropdown de mudança rápida de etapa */}
                        <select
                          value={lead.stage}
                          onChange={(e) => handleMoveStage(lead.id, e.target.value)}
                          className="w-full text-[10px] font-medium text-gray-600 bg-white border border-[#E8E5DF] rounded-md py-0.5 px-1 focus:outline-none"
                        >
                          <option value="new_lead">📥 Novo Contato</option>
                          <option value="contacted">💬 Contatado</option>
                          <option value="scheduled">📅 Agendado</option>
                          <option value="converted">🌟 Convertido</option>
                          <option value="lost">⏸️ Não avançou</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Abordagem com IA */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3ED] text-[#1F4D36] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#222924]">
                    Mensagem de WhatsApp Humanizada para {selectedLead.name.split(' ')[0]}
                  </h3>
                  <p className="text-[11px] text-[#6B726B]">Gerada sob medida com Gemini 3.8 Flash</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedLead.demand && (
              <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs">
                <strong className="text-[#1F4D36] block mb-0.5">Demanda relatada pelo interessado:</strong>
                <p className="text-[#222924]">{selectedLead.demand}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#222924]">
                  Sugestão de Resposta Acolhedora
                </label>
                <button
                  onClick={copyAiMessage}
                  className="text-xs text-[#1F4D36] font-semibold flex items-center gap-1 hover:underline"
                >
                  <Copy className="w-3 h-3" />
                  {copiedMessage ? 'Copiado!' : 'Copiar'}
                </button>
              </div>

              <textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                rows={6}
                placeholder={isGeneratingAi ? 'A IA está escrevendo uma mensagem acolhedora...' : ''}
                className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 font-sans"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E5DF]">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B] hover:bg-gray-50"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={openWhatsAppWithAiMessage}
                disabled={!aiMessage || isGeneratingAi}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Abrir WhatsApp com esta Mensagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

