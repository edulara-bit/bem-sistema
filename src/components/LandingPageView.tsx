'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Check, 
  MessageSquare, 
  Sun, 
  HeartHandshake, 
  Play, 
  Lock, 
  X, 
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Zap
} from 'lucide-react';

// Declaração global para Facebook Pixel
declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

interface LandingPageViewProps {
  campaign?: 'default' | 'fim-de-ano';
}

export function LandingPageView({ campaign = 'default' }: LandingPageViewProps) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const kiwifyCheckoutUrl = 'https://pay.kiwify.com.br/CbdIKkT';
  const whatsappBaseUrl = 'https://wa.me/5519996858958';

  // Inicialização do Meta Pixel
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.fbq) {
        const n: any = (window.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        });
        if (!window._fbq) window._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
        const t = document.createElement('script');
        t.async = true;
        t.src = 'https://connect.facebook.net/en_US/fbevents.js';
        const s = document.getElementsByTagName('script')[0];
        s.parentNode?.insertBefore(t, s);
      }
      window.fbq('init', '1614000949984818');
      window.fbq('track', 'PageView');
    }
  }, []);

  const handleWhatsAppClick = (btnLabel: string) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'Contact', { content_name: btnLabel });
      window.fbq('track', 'Lead', { content_name: btnLabel });
    }
  };

  const handleCheckoutClick = (btnLabel: string) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: 197.0,
        currency: 'BRL',
        content_name: 'Sessão de Alívio (Kiwify)',
        content_category: btnLabel,
      });
      window.fbq('track', 'Lead', { content_name: `Kiwify Checkout - ${btnLabel}` });
    }
  };

  const videoTestimonials = [
    { id: 'gs6MU-9TQFs', title: 'Depoimento B.E.M. 1' },
    { id: 'ILxdhrD4y7M', title: 'Depoimento B.E.M. 2' },
    { id: 'yDQ5b5SHaTg', title: 'Depoimento B.E.M. 3' },
    { id: 'dw3sJ7riMt4', title: 'Depoimento B.E.M. 4' },
    { id: '2DB-2TiWE3E', title: 'Depoimento B.E.M. 5' },
    { id: 'GyJL2nBABns', title: 'Depoimento B.E.M. 6' },
    { id: 'CJ_W_4DmfEc', title: 'Depoimento B.E.M. 7' },
    { id: '3TjnJBgBP-w', title: 'Depoimento B.E.M. 8' },
    { id: 'zO9tzSZjtDo', title: 'Depoimento B.E.M. 9' },
  ];

  const symptomCards = [
    { src: '/images/landing/SEMCONTROLE.webp', alt: 'Sensação de estar sem controle' },
    { src: '/images/landing/MEDO.webp', alt: 'Medo constante e insegurança' },
    { src: '/images/landing/DORNOPEITO.webp', alt: 'Aperto e dor no peito' },
    { src: '/images/landing/DORNOCORPO.webp', alt: 'Dores no corpo e tensão muscular' },
    { src: '/images/landing/CANSACO.webp', alt: 'Cansaço extremo e fadiga' },
    { src: '/images/landing/ANGUSTIA.webp', alt: 'Angústia e ansiedade' },
    { src: '/images/landing/SEMSAIDA.webp', alt: 'Sensação de estar sem saída' },
    { src: '/images/landing/SOBRECARREGADA.webp', alt: 'Sensação de sobrecarga diária' },
  ];

  const clinicPhotos = [
    { src: '/images/landing/grande_bd4c9ab730f5513206b999ec0d90d1fb.webp', alt: 'Espaço de Atendimento Presencial BEM' },
    { src: '/images/landing/grande_2b24d495052a8ce66358eb576b8912c8.webp', alt: 'Consultório Acolhedor e Silencioso' },
    { src: '/images/landing/grande_0aa1883c6411f7873cb83dacb17b0afc.webp', alt: 'Ambiente Terapêutico Preparado para seu Bem-Estar' },
  ];

  const isFimDeAno = campaign === 'fim-de-ano';

  return (
    <div className="bg-[#1F2A34] text-[#EFE7E1] min-h-screen selection:bg-[#25D366] selection:text-black">
      {/* Barra de Topo Elegante */}
      <header className="sticky top-0 z-40 bg-[#1F2A34]/95 backdrop-blur-md border-b border-white/10 px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center font-bold text-black text-sm">
              B
            </div>
            <span className="font-semibold text-sm tracking-wide text-[#EFE7E1]">
              B.E.M.® <span className="text-xs text-[#B8C4B1] font-normal hidden sm:inline">• Medicina da Bioenergética</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#oferta"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F1BEA7] hover:bg-[#e0ab94] text-black text-xs font-bold transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Ver Oferta (R$ 197)</span>
            </a>

            <a
              href={`${whatsappBaseUrl}?text=Ol%C3%A1%20Eduardo%2C%20tenho%20d%C3%BAvidas%20sobre%20a%20Sess%C3%A3o%20de%20Al%C3%ADvio%20do%20BEM`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleWhatsAppClick('Header WhatsApp')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-black text-xs font-bold transition-all shadow-sm"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-black" />
              <span>WhatsApp</span>
            </a>

            <Link
              href="/cockpit"
              title="Acesso exclusivo do Terapeuta"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-xs transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cockpit</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ================= SEÇÃO 1: HERO ================= */}
      <section className="pt-10 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-48 sm:w-60 h-28 sm:h-36">
            <Image
              src="/images/landing/logo-claro-e1760192273435.png"
              alt="Logo B.E.M. Bioenergetics Medicine"
              fill
              priority
              className="object-contain"
            />
          </div>
        </div>

        {/* Headline Principal */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-medium leading-tight sm:leading-snug text-[#EFE7E1] drop-shadow-sm max-w-4xl mx-auto mb-5">
          {isFimDeAno
            ? 'Fim de ano pesado? Transforme a tristeza, a melancolia e o vazio em esperança, leveza e um novo recomeço!'
            : 'Descubra como o estresse e a pressão estão afetando sua energia, desempenho e qualidade de vida!'}
        </h1>

        {/* Subtítulo */}
        <p className="text-base sm:text-lg md:text-xl text-[#EFE7E1]/90 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          {isFimDeAno
            ? 'Ressignifique o término de ciclo com acolhimento, clareza e a energia que você merece para recomeçar!'
            : 'Recupere sua energia, equilibre sua carreira com sua vida pessoal e transforme sua rotina com clareza e propósito!'}
        </p>

        {/* Vídeo Principal */}
        <div className="max-w-3xl mx-auto mb-4">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black">
            <iframe
              src={isFimDeAno 
                ? "https://www.youtube.com/embed/lSvqU-BdXIU?autoplay=0&rel=0&modestbranding=1" 
                : "https://www.youtube.com/embed/nf4SCrU8AO8?autoplay=0&rel=0&modestbranding=1"
              }
              title="Apresentação B.E.M. Bioenergética"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 2: DORES E SINTOMAS ================= */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center border-t border-white/10">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-medium text-[#EFE7E1] mb-8">
          {isFimDeAno ? 'As sessões são individuais e Online' : 'As sessões são individuais e presenciais'}
        </h2>

        {/* Botão de Ação Direto para o Kiwify Checkout */}
        <div className="mb-14">
          <a
            href={kiwifyCheckoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleCheckoutClick('Hero CTA Kiwify')}
            className="group relative inline-flex items-center justify-center gap-3 w-full sm:w-auto max-w-3xl px-6 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.99] transition-all text-center leading-snug"
          >
            <Sparkles className="w-6 h-6 text-black shrink-0" />
            <span>
              {isFimDeAno
                ? 'Fim de ano pesado? Quero transformar a tristeza, melancolia e o vazio em esperança, leveza e um novo recomeço!'
                : 'Quero superar o estresse e a exaustão, recuperar minha energia e retomar o controle da minha vida!'}
            </span>
          </a>
          <p className="text-xs text-[#B8C4B1] mt-2 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Pagamento seguro via Kiwify • Confirmação imediata por Pix ou Cartão
          </p>
        </div>

        <h2 className="text-2xl sm:text-3xl font-semibold text-[#EFE7E1] mb-3">
          {isFimDeAno 
            ? 'Eu sei exatamente o que você está sentindo neste fim de ano!' 
            : 'Eu sei exatamente o que você está passando!'}
        </h2>

        <p className="text-base sm:text-lg text-[#EFE7E1]/85 max-w-3xl mx-auto mb-10 leading-relaxed font-light">
          {isFimDeAno
            ? 'Muitos se sentem desconectados, tristes ou pressionados a celebrar, enquanto carregam um vazio, uma saudade ou um cansaço que parece não ter fim.'
            : 'Atendo muitos profissionais que ocupam cargos de alta responsabilidade e que, mesmo com todo o esforço, sentem que nunca é o suficiente.'}
        </p>

        {/* Galeria de 8 Imagens dos Sintomas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {symptomCards.map((card, idx) => (
            <div
              key={idx}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-[#162028] shadow-md hover:border-[#25D366]/50 hover:shadow-xl transition-all"
            >
              <Image
                src={card.src}
                alt={card.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>

        {/* Texto reflexivo */}
        <p className="text-sm sm:text-base text-[#EFE7E1]/80 max-w-3xl mx-auto leading-relaxed italic">
          ... a pressão constante, as demandas do trabalho e a falta de tempo para cuidar de si mesmos acabam gerando um ciclo de estresse e exaustão que afeta a saúde, os relacionamentos e até o desempenho profissional....
        </p>
      </section>

      {/* ================= SEÇÃO 3: PROPOSTA DE VALOR & OFERTA KIWIFY ================= */}
      <section id="oferta" className="py-16 px-4 sm:px-6 lg:px-8 bg-black/25 border-y border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-[#EFE7E1] mb-8 leading-snug">
            O B.E.M.® pode ajudá-lo a transformar o estresse, a ansiedade e a sobrecarga em equilíbrio, clareza e energia.
          </h2>

          {/* Lista de Benefícios (Checklist) */}
          <div className="inline-flex flex-col items-start gap-3.5 mb-12 bg-[#162028]/80 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-lg text-left">
            {[
              'Não invasivo e acolhedor',
              'Sigilo Absoluto e Confidencialidade',
              'Zero Julgamentos',
              'Atendimento individual e personalizado',
              'Resultados sentidos desde a primeira sessão',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3.5 text-base sm:text-lg text-[#EFE7E1]">
                <div className="w-6 h-6 rounded-full bg-[#25D366]/20 border border-[#25D366]/60 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-[#25D366] stroke-[3]" />
                </div>
                <span className="font-medium tracking-wide">{item}</span>
              </div>
            ))}
          </div>

          {/* Destaque de Atendimento */}
          <div className="mb-8">
            <h3 className="text-base sm:text-lg font-bold tracking-wider text-[#F1BEA7] uppercase">
              ATENDIMENTO PRESENCIAL NA CIDADE DE <u className="underline-offset-4 decoration-[#25D366]">PIRACICABA</u> OU ONLINE PARA TODO O BRASIL
            </h3>
          </div>

          {/* ================= CARD DE OFERTA E CHECKOUT KIWIFY ================= */}
          <div className="relative max-w-2xl mx-auto bg-gradient-to-b from-[#1F2A34] to-[#141C23] border-2 border-[#25D366] rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
            {/* Tag no topo */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#25D366] text-black font-extrabold text-xs uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-black" />
              Oportunidade Especial
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-[#EFE7E1] mb-2 uppercase tracking-wide">
              Sessão de Alívio
            </h3>
            <p className="text-sm text-[#B8C4B1] mb-6">
              Sessão individual com até 60 minutos de desbloqueio emocional e bioenergético
            </p>

            {/* Preços */}
            <div className="mb-6 py-4 bg-black/30 rounded-2xl border border-white/10">
              <div className="text-base sm:text-lg text-white/50 line-through mb-1">
                DE R$ 350,00
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-[#25D366] tracking-tight">
                POR R$ 197,00
              </div>
              <p className="text-xs text-[#EFE7E1]/70 mt-1.5">
                à vista via Pix ou parcelado em até 12x no cartão pelo Kiwify
              </p>
            </div>

            {/* Aviso das 24 horas */}
            <div className="bg-[#1F4D36]/30 border border-[#25D366]/30 rounded-xl p-3.5 mb-8 text-xs sm:text-sm text-[#EFE7E1]/90 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-[#25D366] shrink-0" />
              <span>
                Finalize sua compra pelo Kiwify e, <strong>em até 24 horas</strong>, entrarei em contato pelo WhatsApp para agendarmos o melhor dia e horário para sua sessão!
              </span>
            </div>

            {/* Botão de Compra Kiwify */}
            <a
              href={kiwifyCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleCheckoutClick('Card Oferta Principal')}
              className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-lg sm:text-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all mb-4"
            >
              <CreditCard className="w-6 h-6 text-black" />
              <span>Quero garantir minha sessão!</span>
            </a>

            {/* Selos de Segurança Kiwify */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/60 pt-2 border-t border-white/10">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#25D366]" /> Compra 100% Segura
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#25D366]" /> Plataforma Kiwify
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[#25D366]" /> Confidencialidade Absoluta
              </span>
            </div>

            {/* Opção para tirar dúvidas no WhatsApp antes de pagar */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <a
                href={`${whatsappBaseUrl}?text=Ol%C3%A1%20Eduardo%2C%20tenho%20uma%20d%C3%BAvida%20antes%20de%20garantir%20minha%20Sess%C3%A3o%20de%20Al%C3%ADvio%20de%20R%24%20197.`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleWhatsAppClick('Dúvida antes da compra WhatsApp')}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#F1BEA7] hover:text-white underline underline-offset-4 transition-colors"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                <span>Prefere tirar alguma dúvida comigo no WhatsApp antes de comprar? Clique aqui</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 4: DEPOIMENTOS EM VÍDEO (9 VÍDEOS) ================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h3 className="text-2xl sm:text-3xl font-medium text-center text-[#EFE7E1] mb-10">
          Depoimentos
        </h3>

        {/* Grid dos 9 Vídeos com Play Interativo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videoTestimonials.map((vid) => {
            const isPlaying = activeVideoId === vid.id;

            return (
              <div
                key={vid.id}
                className="relative aspect-video rounded-2xl overflow-hidden bg-[#162028] border border-white/10 shadow-lg group"
              >
                {isPlaying ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${vid.id}?autoplay=1&rel=0`}
                    title={vid.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveVideoId(vid.id)}
                    className="relative w-full h-full block cursor-pointer text-left focus:outline-none"
                    aria-label={`Reproduzir ${vid.title}`}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${vid.id}/hqdefault.jpg`}
                      alt={vid.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 brightness-90 group-hover:brightness-100"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-red-600/90 group-hover:bg-red-600 group-hover:scale-110 flex items-center justify-center text-white shadow-xl transition-all">
                        <Play className="w-6 h-6 fill-white ml-1" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= SEÇÃO 5: SESSÃO PRESENCIAL DE ATÉ 60 MINUTOS ================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#1F2A34] to-[#17222B] border-t border-white/10">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-medium text-[#EFE7E1] mb-12 capitalize">
            sessão presencial ou online com até 60 minutos
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Escuta Ativa */}
            <div className="p-8 rounded-3xl bg-[#1F2A34] border border-white/10 shadow-lg text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-[#25D366] flex items-center justify-center text-[#25D366] mb-5 bg-[#25D366]/10">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-[#EFE7E1] mb-3">Escuta ativa</h3>
              <p className="text-sm text-[#EFE7E1]/80 leading-relaxed font-light">
                Aqui teremos uma conversa para que você possa me contar sobre suas prioridades e os desafios que está passando. Totalmente livre de julgamentos!
              </p>
            </div>

            {/* Card 2: Balanceamento */}
            <div className="p-8 rounded-3xl bg-[#1F2A34] border border-white/10 shadow-lg text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-[#F1BEA7] flex items-center justify-center text-[#F1BEA7] mb-5 bg-[#F1BEA7]/10">
                <Sun className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-[#EFE7E1] mb-3">Balanceamento</h3>
              <p className="text-sm text-[#EFE7E1]/80 leading-relaxed font-light">
                É como chamamos o processo de identificação e remoção de interferências e atualização de registros inconscientes e de sua energia.
              </p>
            </div>

            {/* Card 3: Plano Futuro */}
            <div className="p-8 rounded-3xl bg-[#1F2A34] border border-white/10 shadow-lg text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-[#B8C4B1] flex items-center justify-center text-[#B8C4B1] mb-5 bg-[#B8C4B1]/10">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-[#EFE7E1] mb-3">Plano Futuro</h3>
              <p className="text-sm text-[#EFE7E1]/80 leading-relaxed font-light">
                Definiremos juntos um plano de ações para promover seu bem-estar, sua autoconsciência e a capacidade de fazer escolhas mais leves e conscientes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 6: EXPERIÊNCIA E CONFIANÇA (+1300 ATENDIMENTOS) ================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center border-t border-white/10">
        <h3 className="text-xl sm:text-2xl font-bold tracking-wider text-[#EFE7E1] uppercase mb-8">
          EXPERIÊNCIA E CONFIANÇA!<br />
          <span className="text-[#25D366]">+1300 atendimentos realizados!</span>
        </h3>

        {/* Grid de 3 Fotos com Lightbox */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
          {clinicPhotos.map((photo, idx) => (
            <div
              key={idx}
              onClick={() => setLightboxImage(photo.src)}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/15 bg-black/30 cursor-pointer shadow-lg hover:border-[#25D366] transition-all"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            </div>
          ))}
        </div>
      </section>

      {/* ================= SEÇÃO 7: SOBRE EDUARDO D'AVILA ================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-black/20 border-t border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          {/* Coluna da Imagem e Assinatura */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="relative w-64 sm:w-72 h-80 sm:h-96 rounded-3xl overflow-hidden border border-white/15 shadow-2xl mb-6">
              <Image
                src="/images/landing/social-persone-1-e1717342169149.webp"
                alt="Eduardo D'Avila — Terapeuta B.E.M."
                fill
                className="object-cover"
              />
            </div>
            <div className="relative w-56 h-14">
              <Image
                src="/images/landing/assinatura-cinza-1.webp"
                alt="Assinatura Eduardo D'Avila"
                fill
                className="object-contain opacity-80"
              />
            </div>
          </div>

          {/* Coluna do Conteúdo Biográfico */}
          <div className="md:col-span-7 space-y-4 text-left font-light leading-relaxed text-[#EFE7E1]/90 text-base sm:text-lg">
            <p>
              Olá, sou <strong className="font-semibold text-white">Eduardo D’Avila</strong>, profissional especializado na técnica do <strong className="font-semibold text-white">B.E.M.® – BioEnergetics Medicine</strong>.
            </p>
            <p>
              Depois de mais de 20 anos no mundo corporativo, ocupando cargo de liderança e lidando com a pressão constante, eu decidi transformar minha vida e ajudar outros profissionais a fazerem o mesmo.
            </p>
            <p>
              Nos últimos seis anos, me dedico ao estudo e à prática da Medicina Bioenergética, ajudando profissionais de alta exigência a superarem o estresse, a exaustão e a ansiedade, recuperando sua energia, equilíbrio e propósito.
            </p>
            <p>
              Minha trajetória na <strong className="font-semibold text-white">BEM School®</strong> tem sido uma jornada de aprendizado profundo, que vai além da técnica. A essência do meu trabalho é reconhecer a extraordinária capacidade do corpo humano de se autocurar e autoregular.
            </p>
            <p>
              O <strong className="font-semibold text-white">B.E.M.®</strong> é uma ferramenta poderosa que atua diretamente nas causas emocionais e energéticas que estão te impedindo de viver com equilíbrio e clareza. Meu papel não é ser o curador, mas sim um facilitador, ajudando você a liberar bloqueios e a acessar o seu próprio potencial de cura e equilíbrio.
            </p>
            <p>
              Convido você a conhecer mais sobre como o <strong className="font-semibold text-white">B.E.M.®</strong> pode ser o início da sua jornada de transformação. Seja bem-vindo(a) ao <strong className="font-semibold text-white">B.E.M.®</strong>, o primeiro passo para uma vida com mais energia, propósito e harmonia entre sua carreira e sua vida pessoal.
            </p>

            <div className="pt-4">
              <blockquote className="border-l-4 border-[#25D366] pl-4 italic text-white font-medium text-lg sm:text-xl">
                “Ajudamos as pessoas a superarem qualquer desafio: Interno, Externo e Existencial.”
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEÇÃO 8: FECHAMENTO & DÚVIDAS WHATSAPP ================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-white/10">
        <h3 className="text-base sm:text-lg text-[#F1BEA7] font-semibold mb-3">
          Tudo pensado para a sua total comodidade, privacidade e segurança!
        </h3>

        <h2 className="text-2xl sm:text-3xl font-medium text-[#EFE7E1] mb-8">
          Se tiver dúvidas, você pode falar diretamente comigo pelo WhatsApp.
        </h2>

        {/* Botões Finais de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={kiwifyCheckoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleCheckoutClick('Rodapé Kiwify')}
            className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-lg sm:text-xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all"
          >
            <CreditCard className="w-6 h-6 text-black" />
            <span>Garantir sessão por R$ 197</span>
          </a>

          <a
            href={`${whatsappBaseUrl}?text=Ol%C3%A1%20Eduardo%2C%20tenho%20algumas%20d%C3%BAvidas%20sobre%20as%20sess%C3%B5es%20do%20B.E.M.`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleWhatsAppClick('Botão WhatsApp Final')}
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base border border-white/15 transition-all"
          >
            <WhatsAppIcon className="w-5 h-5 fill-current" />
            <span>Tirar dúvida no WhatsApp</span>
          </a>
        </div>
      </section>

      {/* ================= SEÇÃO 9: FOOTER ================= */}
      <footer className="py-8 px-4 text-center border-t border-white/10 bg-black/40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>
            Copyright © B.E.M. É marca registrada da B.E.M. School. Todos os direitos reservados
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/agendar"
              className="text-white/60 hover:text-white transition-colors"
            >
              Agendamento Online
            </Link>
            <span>•</span>
            <Link
              href="/cockpit"
              className="inline-flex items-center gap-1 text-white/40 hover:text-[#25D366] transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Acesso do Terapeuta</span>
            </Link>
          </div>
        </div>
      </footer>

      {/* Lightbox Modal para Galeria de Fotos */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            className="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full bg-white/10"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-[70vh]">
            <Image
              src={lightboxImage}
              alt="Foto ampliada"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Componente SVG Oficial do WhatsApp
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
  );
}
