'use client';

import { useState } from 'react';
import { 
  Settings, 
  User, 
  DollarSign, 
  Video, 
  Share2, 
  Save, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Building2,
  Sparkles,
  Phone,
  FileCheck
} from 'lucide-react';
import { updateTenantSettingsAction } from './actions';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  headline?: string | null;
  bio?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  consultationPrice: number;
  pixKey?: string | null;
  pixType?: string | null;
  pixName?: string | null;
  professionalReg?: string | null;
  meetingUrlDefault?: string | null;
  address?: string | null;
}

export function ConfiguracoesView({
  tenant,
  publicUrl,
}: {
  tenant: TenantData;
  publicUrl: string;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateTenantSettingsAction(formData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err: any) {
      alert('Erro ao salvar configurações: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
            <Settings className="w-3.5 h-3.5" />
            Consultório & Multi-Tenancy
          </div>
          <h1 className="text-xl font-bold text-[#222924]">
            Configurações do Terapeuta
          </h1>
          <p className="text-xs text-[#6B726B] mt-0.5">
            Personalize seu perfil profissional, dados de recebimento Pix, valores e página pública.
          </p>
        </div>

        {/* Link da Página Pública */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={copyPublicUrl}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs font-semibold text-[#222924] hover:bg-white transition-all shadow-xs"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            {copiedLink ? 'Copiado!' : 'Copiar Link Público'}
          </button>
          <a
            href="/agendar"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Visualizar
          </a>
        </div>
      </div>

      {showSuccess && (
        <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/20 text-[#1F4D36] text-sm flex items-center gap-2 font-medium animate-fade-in">
          <Check className="w-5 h-5 text-[#1F4D36]" />
          Configurações salvas com sucesso! A página pública e os dados de cobrança foram atualizados.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="tenantSlug" value={tenant.slug} />

        {/* Seção 1: Identidade Profissional */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-3">
            <User className="w-5 h-5 text-[#1F4D36]" />
            <div>
              <h2 className="text-sm font-bold text-[#222924]">Identidade do Consultório</h2>
              <p className="text-[11px] text-[#6B726B]">Como seus pacientes e o público visualizam seu nome e especialidade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Nome do Espaço / Terapeuta *
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={tenant.name}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Registro Profissional (Opcional)
              </label>
              <input
                type="text"
                name="professionalReg"
                defaultValue={tenant.professionalReg || ''}
                placeholder="Ex: CRP 06/123456 ou CRTH-BR 1234"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Slogan / Subtítulo Profissional
            </label>
            <input
              type="text"
              name="headline"
              defaultValue={tenant.headline || ''}
              placeholder="Ex: Psicoterapia Integrativa & Acolhimento Humanizado"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Biografia / Apresentação (Exibida em /agendar)
            </label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={tenant.bio || ''}
              placeholder="Apresente sua abordagem e como você acolhe os pacientes..."
              className="w-full p-3.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm resize-none font-sans"
            ></textarea>
          </div>
        </div>

        {/* Seção 2: Dados de Recebimento Pix & Consulta */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-3">
            <DollarSign className="w-5 h-5 text-[#1F4D36]" />
            <div>
              <h2 className="text-sm font-bold text-[#222924]">Financeiro & Recebimento Pix Direto</h2>
              <p className="text-[11px] text-[#6B726B]">Sua chave Pix própria para receber 100% dos pagamentos de consultas sem intermediários</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Valor Padrão da Sessão (R$)
              </label>
              <input
                type="number"
                step="0.01"
                name="consultationPrice"
                defaultValue={tenant.consultationPrice}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Tipo de Chave Pix
              </label>
              <select
                name="pixType"
                defaultValue={tenant.pixType || 'email'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              >
                <option value="email">E-mail</option>
                <option value="cpf">CPF</option>
                <option value="phone">Celular</option>
                <option value="random">Chave Aleatória</option>
                <option value="cnpj">CNPJ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Sua Chave Pix
              </label>
              <input
                type="text"
                name="pixKey"
                defaultValue={tenant.pixKey || ''}
                placeholder="Ex: terapeuta@edulara.com.br"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Nome do Titular da Conta Pix
            </label>
            <input
              type="text"
              name="pixName"
              defaultValue={tenant.pixName || ''}
              placeholder="Ex: Eduardo Lara"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
            />
            <p className="text-[11px] text-[#6B726B] mt-1">
              Este nome e chave aparecerão automaticamente nas mensagens de cobrança rápida no WhatsApp.
            </p>
          </div>
        </div>

        {/* Seção 3: Canais de Contato & Redes */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-3">
            <Phone className="w-5 h-5 text-[#1F4D36]" />
            <div>
              <h2 className="text-sm font-bold text-[#222924]">Canais de Contato & Redes Sociais</h2>
              <p className="text-[11px] text-[#6B726B]">Onde os novos pacientes e seguidores encontram você</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                WhatsApp Profissional (com DDD)
              </label>
              <input
                type="tel"
                name="whatsapp"
                defaultValue={tenant.whatsapp || ''}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Instagram (@seuperfil)
              </label>
              <input
                type="text"
                name="instagram"
                defaultValue={tenant.instagram || ''}
                placeholder="@edulara.terapeuta"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Link de Videochamada Padrão (Google Meet ou Zoom)
            </label>
            <input
              type="url"
              name="meetingUrlDefault"
              defaultValue={tenant.meetingUrlDefault || ''}
              placeholder="https://meet.google.com/sua-sala-fixa"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222924] mb-1">
              Endereço do Consultório Presencial (Opcional)
            </label>
            <input
              type="text"
              name="address"
              defaultValue={tenant.address || ''}
              placeholder="Ex: Av. Paulista, 1000 - Sala 42, Bela Vista - São Paulo"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
            />
          </div>
        </div>

        {/* Seção 4: Isolamento Multi-Terapeuta (SaaS) */}
        <div className="bg-[#FBF9F5] p-5 rounded-2xl border border-[#E8E5DF] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#1F4D36] shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-bold text-[#222924]">Status do Tenant Multi-Terapeuta</h3>
            <p className="text-[#6B726B] mt-0.5">
              Identificador: <code className="bg-white px-1.5 py-0.5 rounded border border-[#E8E5DF] text-[#1F4D36] font-mono">{tenant.slug}</code> • Plano: <span className="font-semibold text-[#1F4D36] uppercase">{tenant.plan}</span> • Isolamento RLS e Criptografia em Repouso Ativos.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Salvar Todas as Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}
