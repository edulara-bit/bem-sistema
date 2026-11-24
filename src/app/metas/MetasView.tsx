'use client';

import { useState, useEffect } from 'react';
import { 
  Target, 
  TrendingUp, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Heart, 
  CheckCircle2, 
  Circle, 
  Sliders, 
  Clock, 
  DollarSign, 
  Sparkles,
  Smile
} from 'lucide-react';
import { updateGoalsAction } from './actions';

interface MetasViewProps {
  tenant: {
    id: string;
    name: string;
    consultationPrice: number;
    monthlyIncomeGoal: number;
    weeklyMaxHours: number;
  };
  stats: {
    weeklySessions: number;
    weeklyHours: number;
    monthlyPaid: number;
    monthlyPending: number;
    monthlyTotal: number;
  };
}

const DEFAULT_SELF_CARE = [
  { id: 'breaks', text: 'Intervalo de 10 a 15 min de descompressão entre cada sessão', category: 'Clínica' },
  { id: 'records', text: 'Todos os prontuários do dia preenchidos (zero pendência cognitiva)', category: 'Rotina' },
  { id: 'supervision', text: 'Supervisão clínica agendada ou estudo de caso em dia', category: 'Desenvolvimento' },
  { id: 'boundaries', text: 'WhatsApp profissional silenciado após o encerramento do expediente', category: 'Limites' },
  { id: 'body', text: 'Prática de respiração consciente, hidratação e pausa de telas', category: 'Saúde' },
];

export function MetasView({ tenant, stats }: MetasViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState(tenant.monthlyIncomeGoal);
  const [weeklyHoursLimit, setWeeklyHoursLimit] = useState(tenant.weeklyMaxHours);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Checklist de autocuidado salvo localmente por dia
  const todayKey = `bem_selfcare_${new Date().toISOString().split('T')[0]}_${tenant.id}`;
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(todayKey);
        if (saved) {
          setCheckedItems(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [todayKey]);

  const toggleCheck = (id: string) => {
    const updated = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(todayKey, JSON.stringify(updated));
    }
  };

  // Cálculos de Burnout & Carga
  const workloadRatio = Math.round((stats.weeklyHours / weeklyHoursLimit) * 100);
  let workloadStatus: 'safe' | 'warning' | 'danger' = 'safe';
  let workloadText = 'Ritmo Saudável e Sustentável';
  let workloadAdvice = 'Sua carga horária desta semana está protegendo sua energia e presença terapêutica.';

  if (workloadRatio > 95) {
    workloadStatus = 'danger';
    workloadText = 'Alerta de Sobrecarga Mental — Risco de Burnout';
    workloadAdvice = 'Você atingiu ou ultrapassou sua meta máxima recomendada de atendimentos. Considere remanejar novos agendamentos e priorizar pausas regenerativas.';
  } else if (workloadRatio >= 75) {
    workloadStatus = 'warning';
    workloadText = 'Atenção — Próximo ao Limite de Carga';
    workloadAdvice = 'Você está em alta demanda. Garanta intervalos rígidos entre atendimentos para preservar sua escuta acolhedora.';
  }

  // Cálculos Financeiros
  const financialProgress = Math.min(100, Math.round((stats.monthlyTotal / monthlyGoal) * 100));
  const remainingIncome = Math.max(0, monthlyGoal - stats.monthlyTotal);
  const neededSessions = Math.ceil(remainingIncome / (tenant.consultationPrice || 220));

  const completedChecks = Object.values(checkedItems).filter(Boolean).length;
  const selfCareProgress = Math.round((completedChecks / DEFAULT_SELF_CARE.length) * 100);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateGoalsAction(formData);
      setSavedSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar metas.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
            <Target className="w-3.5 h-3.5" />
            Gestão Humanizada & Sustentabilidade Terapêutica
          </div>
          <h1 className="text-2xl font-bold text-[#222924] tracking-tight">
            Metas, Limites & Prevenção de Burnout
          </h1>
          <p className="text-sm text-[#6B726B] mt-1">
            Cuidar da sua energia mental e clareza é a ferramenta mais valiosa do seu consultório.
          </p>
        </div>

        <button
          onClick={() => setIsEditing(!isEditing)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E8E5DF] text-xs font-semibold text-[#222924] hover:bg-[#FBF9F5] transition-all shadow-sm"
        >
          <Sliders className="w-4 h-4 text-[#1F4D36]" />
          {isEditing ? 'Fechar Ajustes' : 'Ajustar Metas & Limites'}
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Suas metas e limites de carga de trabalho foram atualizados com sucesso!</span>
        </div>
      )}

      {/* Formulário de Edição de Metas */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border-2 border-[#1F4D36]/20 shadow-sm space-y-4 animate-fadeIn">
          <h2 className="text-base font-bold text-[#222924] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#1F4D36]" />
            Definir Metas do Consultório
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A544D] mb-1">
                Meta de Faturamento Mensal (R$)
              </label>
              <input
                type="number"
                name="monthlyIncomeGoal"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(parseFloat(e.target.value) || 0)}
                step="100"
                className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/20"
                required
              />
              <p className="text-[11px] text-[#6B726B] mt-1">
                Objetivo financeiro para cobrir custos, pró-labore e reservas.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A544D] mb-1">
                Limite Máximo Saudável de Sessões por Semana
              </label>
              <input
                type="number"
                name="weeklyMaxHours"
                value={weeklyHoursLimit}
                onChange={(e) => setWeeklyHoursLimit(parseInt(e.target.value, 10) || 1)}
                min="5"
                max="50"
                className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/20"
                required
              />
              <p className="text-[11px] text-[#6B726B] mt-1">
                Geralmente entre 18 a 22 atendimentos/semana para evitar fadiga por compaixão.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B] hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      )}

      {/* Grade Principal: Burnout + Financeiro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Termômetro de Sobrecarga e Prevenção de Burnout */}
        <div className={`p-6 rounded-2xl border transition-all ${
          workloadStatus === 'danger'
            ? 'bg-rose-50/50 border-rose-200'
            : workloadStatus === 'warning'
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-white border-[#E8E5DF]'
        } shadow-sm space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                workloadStatus === 'danger'
                  ? 'bg-rose-100 text-rose-700'
                  : workloadStatus === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-[#EBF3ED] text-[#1F4D36]'
              }`}>
                {workloadStatus === 'danger' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : workloadStatus === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#222924]">Termômetro de Carga Semanal</h3>
                <p className="text-xs text-[#6B726B]">Prevenção de Burnout & Fadiga Clínica</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              workloadStatus === 'danger'
                ? 'bg-rose-100 text-rose-700'
                : workloadStatus === 'warning'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              {workloadRatio}% da capacidade
            </span>
          </div>

          {/* Barra de Progresso de Carga */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-[#4A544D]">
                {stats.weeklySessions} sessões nesta semana (~{stats.weeklyHours}h)
              </span>
              <span className="text-[#6B726B]">
                Limite: {weeklyHoursLimit} atendimentos/sem
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  workloadStatus === 'danger'
                    ? 'bg-rose-500'
                    : workloadStatus === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-[#1F4D36]'
                }`}
                style={{ width: `${Math.min(100, workloadRatio)}%` }}
              />
            </div>
          </div>

          {/* Cartão de Diagnóstico de Saúde Mental */}
          <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            workloadStatus === 'danger'
              ? 'bg-white border-rose-200 text-rose-900'
              : workloadStatus === 'warning'
              ? 'bg-white border-amber-200 text-amber-900'
              : 'bg-[#FBF9F5] border-[#E8E5DF] text-[#4A544D]'
          }`}>
            <div className="font-bold flex items-center gap-1.5">
              <span>{workloadText}</span>
            </div>
            <p className="leading-relaxed opacity-90">{workloadAdvice}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3 rounded-xl border border-[#E8E5DF]/70">
              <p className="text-[11px] text-[#6B726B]">Horas Livres Recomendadas</p>
              <p className="text-lg font-bold text-[#1F4D36]">
                {Math.max(0, weeklyHoursLimit - stats.weeklySessions)} sessões
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#E8E5DF]/70">
              <p className="text-[11px] text-[#6B726B]">Média Diária (5 dias)</p>
              <p className="text-lg font-bold text-[#222924]">
                {(stats.weeklySessions / 5).toFixed(1)} / dia
              </p>
            </div>
          </div>
        </div>

        {/* Progresso da Meta Financeira */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#EBF3ED] text-[#1F4D36]">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#222924]">Meta Financeira Mensal</h3>
                <p className="text-xs text-[#6B726B]">Receita Realizada + Previsão em Aberto</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36]">
              {financialProgress}% atingido
            </span>
          </div>

          {/* Barra de Progresso Financeiro */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-[#1F4D36]">
                R$ {stats.monthlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[#6B726B]">
                Meta: R$ {monthlyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2D6A4F] to-[#52B788] transition-all duration-500 rounded-full"
                style={{ width: `${financialProgress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#FBF9F5] p-3 rounded-xl border border-[#E8E5DF]/70">
              <p className="text-[11px] text-[#6B726B]">Já Recebido (Pago)</p>
              <p className="text-base font-bold text-emerald-700">
                R$ {stats.monthlyPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-[#FBF9F5] p-3 rounded-xl border border-[#E8E5DF]/70">
              <p className="text-[11px] text-[#6B726B]">A Receber (Agendado)</p>
              <p className="text-base font-bold text-amber-700">
                R$ {stats.monthlyPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Insights de Previsibilidade */}
          <div className="p-3.5 rounded-xl bg-[#EBF3ED]/60 border border-[#1F4D36]/15 text-xs text-[#1F4D36] space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#1F4D36]" />
              {remainingIncome === 0
                ? '🎉 Parabéns! Você já superou sua meta financeira este mês!'
                : `Faltam R$ ${remainingIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para bater a meta.`}
            </p>
            {remainingIncome > 0 && (
              <p className="text-[11px] text-[#4A544D]">
                Com seu valor médio por consulta (R$ {tenant.consultationPrice.toFixed(0)}), você precisa de aproximadamente <strong>{neededSessions} sessões</strong> para atingir o objetivo.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Checklist Diário de Autocuidado do Terapeuta */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5DF] pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#222924]">Checklist Diário de Autocuidado</h3>
              <p className="text-xs text-[#6B726B]">
                Práticas fundamentais para preservar sua integridade física e emocional.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B726B]">
              Progresso hoje: {completedChecks}/{DEFAULT_SELF_CARE.length} ({selfCareProgress}%)
            </span>
            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all"
                style={{ width: `${selfCareProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {DEFAULT_SELF_CARE.map((item) => {
            const isChecked = !!checkedItems[item.id];
            return (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                  isChecked
                    ? 'bg-[#EBF3ED]/60 border-[#1F4D36]/30 text-[#1F4D36]'
                    : 'bg-[#FBF9F5] border-[#E8E5DF] text-[#4A544D] hover:bg-white'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckCircle2 className="w-5 h-5 text-[#1F4D36]" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/70 border border-gray-200 text-gray-600 inline-block mb-1">
                    {item.category}
                  </span>
                  <p className={`text-xs font-medium leading-relaxed ${isChecked ? 'line-through opacity-80' : ''}`}>
                    {item.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {completedChecks === DEFAULT_SELF_CARE.length && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <Smile className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Excelente! Seu dia teve limites saudáveis e respeito ao seu próprio bem-estar.</span>
          </div>
        )}
      </div>
    </div>
  );
}

