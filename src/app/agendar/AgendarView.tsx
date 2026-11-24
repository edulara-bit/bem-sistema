'use client';

import { useState } from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Clock, 
  Video, 
  MapPin, 
  CheckCircle2, 
  Send, 
  MessageCircle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { submitBookingLeadAction } from './actions';

export function AgendarView({
  therapist,
}: {
  therapist: {
    name: string;
    slug: string;
    headline?: string | null;
    bio?: string | null;
    consultationPrice: number;
    whatsapp?: string | null;
  };
}) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadData, setLeadData] = useState<{ name: string; phone: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await submitBookingLeadAction(formData);
      setLeadData({
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
      });
      setSubmitted(true);
    } catch (err: any) {
      alert('Erro ao enviar solicitação: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#222924] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Card do Terapeuta */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E5DF] shadow-sm text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#1F4D36] text-white flex items-center justify-center text-3xl font-bold mx-auto shadow-md">
            {therapist.name.charAt(0)}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Espaço Terapêutico & Acolhimento
            </div>
            <h1 className="text-2xl font-bold text-[#222924] tracking-tight">
              {therapist.name}
            </h1>
            <p className="text-sm text-[#6B726B] font-medium mt-1">
              {therapist.headline || 'Psicoterapia, Gestão Emocional e Desenvolvimento Pessoal'}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-[#222924]/80 leading-relaxed max-w-lg mx-auto font-sans">
            {therapist.bio ||
              'Um espaço confidencial e sem julgamentos para você falar sobre suas angústias, organizar sentimentos e trilhar caminhos mais leves para sua vida.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-[#1F4D36]">
            <span className="flex items-center gap-1.5 bg-[#FBF9F5] px-3 py-1.5 rounded-full border border-[#E8E5DF]">
              <ShieldCheck className="w-4 h-4" /> 100% Sigiloso
            </span>
            <span className="flex items-center gap-1.5 bg-[#FBF9F5] px-3 py-1.5 rounded-full border border-[#E8E5DF]">
              <Clock className="w-4 h-4" /> Sessões de 50 min
            </span>
            <span className="flex items-center gap-1.5 bg-[#FBF9F5] px-3 py-1.5 rounded-full border border-[#E8E5DF]">
              <Video className="w-4 h-4" /> Online ou Presencial
            </span>
          </div>
        </div>

        {/* Formulário ou Tela de Sucesso */}
        {submitted ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-md text-center space-y-4 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-[#222924]">
              Recebido com muito carinho, {leadData?.name.split(' ')[0]}!
            </h2>
            <p className="text-sm text-[#6B726B] max-w-md mx-auto leading-relaxed">
              Sua mensagem já chegou no meu painel confidencial. Em breve entrarei em contato pelo WhatsApp para alinharmos o melhor dia e horário para a sua sessão.
            </p>

            <div className="pt-4">
              <a
                href={`https://wa.me/5511999999999?text=${encodeURIComponent(
                  `Olá Eduardo! Sou ${leadData?.name}, acabei de preencher a solicitação de acolhimento no seu site.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 transition-all shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                Conversar pelo WhatsApp Agora
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E5DF] shadow-sm space-y-6">
            <div className="border-b border-[#E8E5DF] pb-4">
              <h2 className="text-lg font-bold text-[#222924]">
                Solicitar Agendamento de Primeira Sessão
              </h2>
              <p className="text-xs text-[#6B726B] mt-0.5">
                Preencha os campos abaixo. Entrarei em contato para combinarmos o melhor horário.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <input type="hidden" name="tenantSlug" value={therapist.slug} />

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1.5">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Como você prefere ser chamado(a)?"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1.5">
                    WhatsApp com DDD *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1.5">
                    E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1.5">
                  O que você gostaria de cuidar no atendimento? *
                </label>
                <textarea
                  name="demand"
                  required
                  rows={3}
                  placeholder="Conte brevemente o que você está sentindo ou passando (ex: ansiedade, transição profissional, problemas em relacionamentos, autoconhecimento...)"
                  className="w-full p-4 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1.5">
                    Modalidade Preferida
                  </label>
                  <select
                    name="modality"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                  >
                    <option value="online">Online (Google Meet — de onde estiver)</option>
                    <option value="in_person">Presencial (Consultório)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1.5">
                    Melhor Período para Sessões
                  </label>
                  <select
                    name="preferredTime"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                  >
                    <option value="tarde">Tarde (13h às 18h)</option>
                    <option value="manha">Manhã (08h às 12h)</option>
                    <option value="noite">Noite (18h às 21h)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#1F4D36] text-white font-bold text-sm hover:bg-[#183C2A] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Solicitação de Acolhimento'}
                </button>
                <p className="text-[11px] text-[#6B726B] text-center mt-2.5">
                  🔒 Seus dados e relatos são estritamente sigilosos e protegidos pela LGPD.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

