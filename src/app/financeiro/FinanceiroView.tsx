'use client';

import { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Plus, 
  X, 
  MessageCircle,
  Share2
} from 'lucide-react';
import { markAsPaidAction, createTransactionAction } from './actions';

interface Transaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  dueDate: string | Date;
  paidAt?: string | Date | null;
  status: string;
  paymentMethod?: string | null;
  description?: string | null;
  patient?: {
    id: string;
    name: string;
  } | null;
}

export function FinanceiroView({
  summary,
  transactions,
  pixInfo,
}: {
  summary: { totalReceived: number; totalPending: number; totalExpenses: number; balance: number };
  transactions: Transaction[];
  pixInfo?: { pixKey: string; pixName: string };
}) {
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const filtered = transactions.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'paid') return t.status === 'paid';
    return true;
  });

  const handleCopyPixMessage = (t: Transaction) => {
    const patientName = t.patient?.name ? t.patient.name.split(' ')[0] : 'paciente';
    const amountStr = t.amount.toFixed(2).replace('.', ',');
    const key = pixInfo?.pixKey || 'terapeuta@edulara.com.br';
    const name = pixInfo?.pixName || 'Eduardo Lara';
    const msg = `Olá, ${patientName}! Tudo bem? Segue a chave Pix para o acerto da nossa sessão de terapia no valor de R$ ${amountStr}.\n\nChave Pix: ${key} (${name})\n\nQualquer dúvida estou à disposição! Abraço.`;
    
    navigator.clipboard.writeText(msg);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#222924]">Gestão Financeira do Consultório</h1>
          <p className="text-xs text-[#6B726B]">Fluxo de caixa, recebimentos de sessões e controle de despesas</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Despesa / Receita
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">Recebido</span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF3ED] flex items-center justify-center text-[#1F4D36]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1F4D36]">
            R$ {summary.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#6B726B] mt-1">Consultas quitadas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">A Receber</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">
            R$ {summary.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-amber-800 font-medium mt-1">Pendentes de acerto</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">Despesas</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700">
            R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#6B726B] mt-1">Custos operacionais</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">Saldo Líquido</span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF3ED] flex items-center justify-center text-[#1F4D36]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1F4D36]">
            R$ {summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#1F4D36] font-medium mt-1">Lucro real em caixa</p>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E8E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#222924]">Histórico Financeiro</h2>

          <div className="bg-[#FBF9F5] p-1 rounded-xl border border-[#E8E5DF] flex text-xs font-semibold text-[#6B726B]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all' ? 'bg-white text-[#1F4D36] shadow-xs' : ''
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'pending' ? 'bg-white text-[#1F4D36] shadow-xs' : ''
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'paid' ? 'bg-white text-[#1F4D36] shadow-xs' : ''
              }`}
            >
              Quitados
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#E8E5DF]">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-[#6B726B]">
              Nenhuma movimentação para o filtro selecionado.
            </p>
          ) : (
            filtered.map((t) => {
              const isIncome = t.type === 'income';
              const dateStr = new Date(t.dueDate).toLocaleDateString('pt-BR');

              return (
                <div
                  key={t.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FBF9F5] transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-[#EBF3ED] text-[#1F4D36]' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#222924] text-sm">
                          {t.description || (t.patient ? `Sessão — ${t.patient.name}` : t.category)}
                        </h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            t.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                      <div className="text-xs text-[#6B726B] mt-0.5 flex items-center gap-2">
                        <span>Data: {dateStr}</span>
                        {t.paymentMethod && <span>• Via {t.paymentMethod.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div
                      className={`text-base font-bold ${
                        isIncome ? 'text-[#1F4D36]' : 'text-rose-700'
                      }`}
                    >
                      {isIncome ? '+' : '-'} R$ {t.amount.toFixed(2)}
                    </div>

                    {t.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyPixMessage(t)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E8E5DF] bg-white text-[#222924] hover:bg-gray-50 text-xs font-semibold flex items-center gap-1 transition-all"
                          title="Copiar mensagem com chave Pix para o WhatsApp"
                        >
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                          {copiedId === t.id ? 'Copiado!' : 'Cobrar Pix'}
                        </button>

                        <button
                          onClick={() => markAsPaidAction(t.id, 'pix')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#1F4D36] text-white hover:bg-[#183C2A] text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Nova Movimentação */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base">Nova Movimentação Financeira</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await createTransactionAction(formData);
                setShowModal(false);
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">Tipo</label>
                <select
                  name="type"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924]"
                >
                  <option value="expense">Despesa (Aluguel, Software, Livros, Cursos)</option>
                  <option value="income">Receita Avulsa (Pacote, Palestra, Workshop)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">Descrição</label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Ex: Aluguel da sala ou Supervisão Clínica"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    required
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1">Data</label>
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A]"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

