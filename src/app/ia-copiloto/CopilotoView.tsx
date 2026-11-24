'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Video, 
  FileText, 
  Copy, 
  Check, 
  Send,
  Lightbulb,
  HeartHandshake
} from 'lucide-react';
import { generateContentAction } from './actions';

const suggestedThemes = [
  'Ansiedade e a sensação de nunca descansar',
  'Como dizer não sem culpa nas relações',
  'A diferença entre cansaço mental e preguiça',
  '3 passos para regular o sistema nervoso em crises',
  'Por que procrastinamos o que mais nos importa?',
];

export function CopilotoView() {
  const [theme, setTheme] = useState('');
  const [format, setFormat] = useState<'carousel' | 'reels' | 'post'>('carousel');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    hook: string;
    slidesOrScript: string[];
    caption: string;
  } | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const handleGenerate = async (selectedTheme?: string) => {
    const finalTheme = selectedTheme || theme;
    if (!finalTheme) return;
    setIsGenerating(true);
    try {
      const data = await generateContentAction(finalTheme, format);
      setResult(data);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar conteúdo com IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Copiloto de Conteúdo & Captação Ética
        </div>
        <h1 className="text-xl font-bold text-[#222924]">
          Produção de Conteúdo e Marketing Terapêutico com IA
        </h1>
        <p className="text-xs text-[#6B726B] mt-1">
          Crie carrosséis educativos para Instagram, roteiros de Reels e reflexões que atraem pacientes alinhados com sua abordagem.
        </p>
      </div>

      {/* Seletor de Formato e Input */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-[#222924] uppercase tracking-wider mb-2">
            1. Escolha o Formato do Conteúdo
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setFormat('carousel')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                format === 'carousel'
                  ? 'border-[#1F4D36] bg-[#EBF3ED]/60 ring-2 ring-[#1F4D36]/20'
                  : 'border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white'
              }`}
            >
              <Layers className={`w-5 h-5 shrink-0 mt-0.5 ${format === 'carousel' ? 'text-[#1F4D36]' : 'text-gray-400'}`} />
              <div>
                <div className="text-xs font-bold text-[#222924]">Carrossel Instagram</div>
                <div className="text-[11px] text-[#6B726B]">5 slides didáticos passo a passo</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('reels')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                format === 'reels'
                  ? 'border-[#1F4D36] bg-[#EBF3ED]/60 ring-2 ring-[#1F4D36]/20'
                  : 'border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white'
              }`}
            >
              <Video className={`w-5 h-5 shrink-0 mt-0.5 ${format === 'reels' ? 'text-[#1F4D36]' : 'text-gray-400'}`} />
              <div>
                <div className="text-xs font-bold text-[#222924]">Roteiro para Reels / Vídeo</div>
                <div className="text-[11px] text-[#6B726B]">Gancho forte + fala + cenas</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('post')}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                format === 'post'
                  ? 'border-[#1F4D36] bg-[#EBF3ED]/60 ring-2 ring-[#1F4D36]/20'
                  : 'border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white'
              }`}
            >
              <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${format === 'post' ? 'text-[#1F4D36]' : 'text-gray-400'}`} />
              <div>
                <div className="text-xs font-bold text-[#222924]">Post Reflexivo</div>
                <div className="text-[11px] text-[#6B726B]">Texto profundo para engajamento</div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#222924] uppercase tracking-wider mb-2">
            2. Qual o Tema ou Dor do Paciente?
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex: Como lidar com a autocrítica excessiva..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !theme.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 transition-all flex items-center gap-2 shrink-0 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Criando...' : 'Gerar com IA'}
            </button>
          </div>
        </div>

        {/* Sugestões Rápidas */}
        <div>
          <span className="text-[11px] font-semibold text-[#6B726B] flex items-center gap-1 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-[#D97736]" /> Sugestões de temas com alta procura terapêutica:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedThemes.map((st) => (
              <button
                key={st}
                onClick={() => {
                  setTheme(st);
                  handleGenerate(st);
                }}
                className="text-xs bg-[#FBF9F5] hover:bg-[#EBF3ED] text-[#222924] hover:text-[#1F4D36] px-3 py-1.5 rounded-lg border border-[#E8E5DF] transition-all"
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultado da Geração */}
      {result && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-[#E8E5DF] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F4D36] bg-[#EBF3ED] px-2 py-0.5 rounded">
                Pronto para Publicar
              </span>
              <h2 className="text-lg font-bold text-[#222924] mt-1">{result.title}</h2>
            </div>
            <button
              onClick={() => copyToClipboard(`${result.title}\n\n${result.hook}\n\n${result.slidesOrScript.join('\n\n')}\n\n${result.caption}`)}
              className="px-3.5 py-1.5 rounded-xl border border-[#E8E5DF] text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 transition-all"
            >
              {copiedCaption ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCaption ? 'Tudo Copiado!' : 'Copiar Roteiro'}
            </button>
          </div>

          {/* Gancho */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
            <strong className="block mb-1 text-amber-950 font-bold">🎣 Gancho Inicial (Primeiros 3 segundos):</strong>
            {result.hook}
          </div>

          {/* Slides ou Cenas */}
          <div>
            <h3 className="text-xs font-bold text-[#222924] uppercase tracking-wider mb-3">
              {format === 'carousel' ? 'Slides do Carrossel (Arraste para o lado)' : 'Estrutura / Roteiro'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.slidesOrScript.map((slide, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs space-y-1 relative"
                >
                  <span className="text-[10px] font-bold text-[#1F4D36] uppercase">
                    Slide {idx + 1}
                  </span>
                  <p className="text-gray-800 leading-relaxed font-medium">{slide}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Legenda Pronta */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-[#222924] uppercase tracking-wider">
                Legenda Formatada com Chamada para Ação
              </h3>
              <button
                onClick={() => copyToClipboard(result.caption)}
                className="text-xs text-[#1F4D36] font-semibold flex items-center gap-1 hover:underline"
              >
                <Copy className="w-3 h-3" /> Copiar Legenda
              </button>
            </div>
            <div className="p-4 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs text-[#222924] whitespace-pre-line leading-relaxed font-sans">
              {result.caption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

