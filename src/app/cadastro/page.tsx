'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  Mail, 
  DollarSign,
  HeartHandshake
} from 'lucide-react';
import { registerNewTenantAction } from '@/actions/tenant-actions';

export default function CadastroPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugPreview, setSlugPreview] = useState('meuconsultorio');

  const handleNameChange = (val: string) => {
    const generated = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 25);
    setSlugPreview(generated || 'meuconsultorio');
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-10 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#1F4D36] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
          B
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Plataforma SaaS Multi-Terapeuta
        </div>
        <h1 className="text-2xl font-bold text-[#222924] tracking-tight">
          Criar Novo Espaço Terapêutico
        </h1>
        <p className="text-xs sm:text-sm text-[#6B726B] max-w-md mx-auto">
          Cadastre seu consultório independente com agenda, prontuários com IA, controle financeiro Pix e funil de captação isolados.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-5">
        <form
          action={async (formData) => {
            setIsSubmitting(true);
            try {
              await registerNewTenantAction(formData);
            } catch (err: any) {
              alert(err.message || 'Erro ao cadastrar novo terapeuta.');
              setIsSubmitting(false);
            }
          }}
          className="space-y-4 text-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Nome do Terapeuta *
              </label>
              <input
                type="text"
                name="therapistName"
                required
                placeholder="Ex: Dra. Mariana Costa"
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                E-mail de Acesso *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="terapeuta@exemplo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Senha de Acesso ao Consultório *
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Nome do Consultório / Espaço *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ex: Consultório de Psicologia Mariana Costa"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Identificador Exclusivo (Slug do Link) *
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2.5 bg-[#FBF9F5] border border-r-0 border-[#E8E5DF] rounded-l-xl text-xs text-[#6B726B] font-mono select-none">
                bem.edulara.com.br/agendar?slug=
              </span>
              <input
                type="text"
                name="slug"
                required
                value={slugPreview}
                onChange={(e) => setSlugPreview(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3.5 py-2.5 rounded-r-xl border border-[#E8E5DF] bg-white text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs font-mono font-bold"
              />
            </div>
            <p className="text-[11px] text-[#6B726B] mt-1">
              Este link será a sua página pública para colocar na bio do Instagram.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Especialidade / Abordagem
            </label>
            <input
              type="text"
              name="headline"
              placeholder="Ex: Terapia Cognitivo-Comportamental • Ansiedade e Depressão"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Valor Padrão da Consulta (R$)
              </label>
              <input
                type="number"
                step="0.01"
                name="consultationPrice"
                defaultValue="220"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Sua Chave Pix (Para Recebimento Direto)
              </label>
              <input
                type="text"
                name="pixKey"
                placeholder="E-mail, CPF ou Celular"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#EBF3ED]/60 border border-[#1F4D36]/10 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#1F4D36]">
              <ShieldCheck className="w-4 h-4" /> Isolamento Completo de Dados
            </div>
            <p className="text-[#6B726B]">
              Seus pacientes, prontuários, finanças e leads nunca são compartilhados ou acessados por outros terapeutas da plataforma.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#1F4D36] text-white font-bold text-sm hover:bg-[#183C2A] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <HeartHandshake className="w-4 h-4" />
              {isSubmitting ? 'Configurando Consultório...' : 'Criar Meu Consultório no BEM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

