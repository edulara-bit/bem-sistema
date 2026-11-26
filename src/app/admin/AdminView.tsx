'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UserPlus,
  Building2,
  Sparkles,
  Power,
  Send,
  Heart,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Phone,
  Mail,
  AlertCircle,
} from 'lucide-react';
import {
  createTherapistInviteAction,
  resendTherapistCodeAction,
  toggleTenantAiAccessAction,
  toggleTenantActiveStatusAction,
} from './actions';

interface TenantAdminItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  aiAgentsEnabled: boolean;
  logoUrl: string | null;
  whatsapp: string;
  consultationPrice: number;
  patientsCount: number;
  appointmentsCount: number;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    isVerified: boolean;
    verificationCode?: string | null;
  } | null;
}

export function AdminView({
  tenants,
  emotionsCount,
}: {
  tenants: TenantAdminItem[];
  emotionsCount: number;
}) {
  const router = useRouter();

  // Form states
  const [therapistName, setTherapistName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [slug, setSlug] = useState('');
  const [professionalReg, setProfessionalReg] = useState('');
  const [headline, setHeadline] = useState('');
  const [consultationPrice, setConsultationPrice] = useState('220');
  const [aiAgentsEnabled, setAiAgentsEnabled] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{
    whatsappSent: boolean;
    whatsappError?: string | null;
    code: string;
    link: string;
    therapistName: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleAutoSlug = (val: string) => {
    setTherapistName(val);
    if (!clinicName) {
      setClinicName(`Espaço Terapêutico ${val}`);
    }
    const gen = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28);
    setSlug(gen);
  };

  const handleCreateTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInviteFeedback(null);
    setIsCreating(true);

    const res = await createTherapistInviteAction({
      therapistName,
      email,
      phone,
      clinicName,
      slug,
      professionalReg,
      headline,
      consultationPrice: parseFloat(consultationPrice) || 220,
      aiAgentsEnabled,
    });

    setIsCreating(false);

    if (!res.success) {
      setFormError(res.error || 'Erro ao cadastrar terapeuta.');
      return;
    }

    setInviteFeedback({
      whatsappSent: Boolean(res.whatsappSent),
      whatsappError: res.whatsappError,
      code: res.verificationCode || '',
      link: res.activationLink || '',
      therapistName,
    });

    setTherapistName('');
    setEmail('');
    setPhone('');
    setClinicName('');
    setSlug('');
    setProfessionalReg('');
    setHeadline('');
    setAiAgentsEnabled(false);
    router.refresh();
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const activeTenantsCount = tenants.filter((t) => t.isActive).length;
  const aiEnabledCount = tenants.filter((t) => t.aiAgentsEnabled).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header do Painel Administrativo */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Área Exclusiva do Administrador B.E.M.
          </div>
          <h1 className="text-xl font-bold text-[#222924]">
            Gestão de Consultórios, Credenciamento & Permissões
          </h1>
          <p className="text-xs text-[#6B726B] mt-1">
            Cadastre novos terapeutas com validação via código no celular, libere os Agentes B.E.M. por consultório e gerencie inativações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs">
            <span className="text-[#6B726B]">Consultórios Ativos: </span>
            <strong className="text-[#1F4D36]">
              {activeTenantsCount}/{tenants.length}
            </strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] text-xs">
            <span className="text-[#6B726B]">Com Agentes IA: </span>
            <strong className="text-[#1F4D36]">{aiEnabledCount}</strong>
          </div>
          <Link
            href="/emocoes"
            className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] flex items-center gap-1.5 shadow-xs"
          >
            <Heart className="w-3.5 h-3.5" />
            Gerenciar Emoções ({emotionsCount})
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: Credenciar Novo Terapeuta */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleCreateTherapist}
            className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4"
          >
            <div className="border-b border-[#E8E5DF] pb-3">
              <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1F4D36]" />
                Cadastrar Novo Terapeuta Credenciado
              </h2>
              <p className="text-[11px] text-[#6B726B] mt-0.5">
                O terapeuta receberá um código de 6 dígitos no celular (WhatsApp) para validar a inscrição e definir sua senha.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {inviteFeedback && (
              <div className="p-4 rounded-xl bg-[#EBF3ED] border border-[#1F4D36]/30 space-y-2 text-xs text-[#1F4D36]">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Consultório de {inviteFeedback.therapistName} criado!
                </div>
                <p>
                  {inviteFeedback.whatsappSent
                    ? '✓ Código de validação enviado automaticamente para o celular do terapeuta via WhatsApp!'
                    : `⚠️ Conta criada, mas o WhatsApp retornou aviso (${
                        inviteFeedback.whatsappError || 'desconectado'
                      }). Envie o código abaixo manualmente:`}
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-[#1F4D36]/20 flex items-center justify-between">
                  <span>
                    Código: <strong className="font-mono text-sm">{inviteFeedback.code}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        'invite',
                        `Código B.E.M.: ${inviteFeedback.code}\nLink para validar e criar senha: ${inviteFeedback.link}`
                      )
                    }
                    className="px-2.5 py-1 rounded bg-[#1F4D36] text-white text-[11px] font-bold flex items-center gap-1"
                  >
                    {copiedKey === 'invite' ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copiar Convite
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Nome Completo do Terapeuta *
              </label>
              <input
                type="text"
                required
                value={therapistName}
                onChange={(e) => handleAutoSlug(e.target.value)}
                placeholder="Ex: Dra. Juliana Mendes"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  E-mail de Login *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juliana@exemplo.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Celular / WhatsApp (com DDD) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 19999998888"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222924] mb-1">
                Nome do Consultório / Espaço *
              </label>
              <input
                type="text"
                required
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Ex: Espaço Terapêutico Juliana Mendes"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Slug da Página Pública *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="juliana-mendes"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Valor Padrão Sessão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={consultationPrice}
                  onChange={(e) => setConsultationPrice(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Registro Profissional
                </label>
                <input
                  type="text"
                  value={professionalReg}
                  onChange={(e) => setProfessionalReg(e.target.value)}
                  placeholder="CRP / CRTH-BR"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Especialidade Curta
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Terapeuta B.E.M."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] cursor-pointer">
              <input
                type="checkbox"
                checked={aiAgentsEnabled}
                onChange={(e) => setAiAgentsEnabled(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#1F4D36]"
              />
              <div className="text-xs">
                <strong className="text-[#222924] block">
                  Liberar acesso à Central de Agentes B.E.M. (IA)
                </strong>
                <span className="text-[11px] text-[#6B726B]">
                  Você pode ativar ou revogar este acesso a qualquer momento na lista ao lado.
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {isCreating
                ? 'Criando Consultório e Enviando Código...'
                : 'Cadastrar e Enviar Código no Celular'}
            </button>
          </form>
        </div>

        {/* COLUNA DIREITA: Lista de Consultórios Cadastrados */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#222924] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1F4D36]" />
              Consultórios na Plataforma ({tenants.length})
            </h2>
          </div>

          {tenants.map((t) => {
            const isMaster = t.slug === 'edulara';
            const isPendingVerification = t.owner && !t.owner.isVerified;

            return (
              <div
                key={t.id}
                className={`bg-white p-5 rounded-2xl border shadow-xs space-y-3 transition-all ${
                  t.isActive
                    ? 'border-[#E8E5DF]'
                    : 'border-red-200 bg-red-50/30 opacity-85'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {t.logoUrl ? (
                      <img
                        src={t.logoUrl}
                        alt={t.name}
                        className="w-11 h-11 rounded-xl object-contain border border-[#E8E5DF] bg-white p-0.5 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#1F4D36] text-white font-bold flex items-center justify-center text-base shrink-0">
                        {t.name.charAt(0)}
                      </div>
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-bold text-[#222924]">{t.name}</h3>
                        {isMaster && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1F4D36] text-white">
                            Matriz Admin
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {t.isActive ? 'Ativo' : 'Consultório Inativo'}
                        </span>
                        {isPendingVerification ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Aguardando Validar Código
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            Senha Ativa
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#6B726B] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {t.owner && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {t.owner.email}
                          </span>
                        )}
                        {t.whatsapp && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {t.whatsapp}
                          </span>
                        )}
                        <span>Slug: /{t.slug}</span>
                        <span>• {t.patientsCount} pacientes</span>
                        <span>• {t.appointmentsCount} sessões</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controles Administrativos do Consultório */}
                <div className="pt-3 border-t border-[#E8E5DF] flex flex-wrap items-center justify-between gap-2">
                  {/* Permissão Agentes B.E.M. */}
                  <button
                    type="button"
                    disabled={busyId === `ai_${t.id}`}
                    onClick={async () => {
                      setBusyId(`ai_${t.id}`);
                      const res = await toggleTenantAiAccessAction(t.id, !t.aiAgentsEnabled);
                      setBusyId(null);
                      if (!res.success) alert(res.error);
                      router.refresh();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                      t.aiAgentsEnabled
                        ? 'bg-[#EBF3ED] border-[#1F4D36]/30 text-[#1F4D36]'
                        : 'bg-[#FBF9F5] border-[#E8E5DF] text-[#6B726B] hover:text-[#222924]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t.aiAgentsEnabled ? 'Agentes B.E.M.: Liberado ✓' : 'Agentes B.E.M.: Bloqueado'}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Reenviar Código no Celular */}
                    {t.owner && (
                      <button
                        type="button"
                        disabled={busyId === `code_${t.id}`}
                        onClick={async () => {
                          if (!t.owner) return;
                          setBusyId(`code_${t.id}`);
                          const res = await resendTherapistCodeAction(t.owner.id);
                          setBusyId(null);
                          if (!res.success) {
                            alert(res.error);
                          } else {
                            alert(
                              res.whatsappSent
                                ? `Novo código (${res.verificationCode}) enviado no WhatsApp do terapeuta!`
                                : `Novo código gerado: ${res.verificationCode} (WhatsApp retornou: ${res.whatsappError})`
                            );
                          }
                          router.refresh();
                        }}
                        className="px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] hover:bg-white text-xs font-semibold text-[#222924] flex items-center gap-1"
                      >
                        <Send className="w-3 h-3 text-[#1F4D36]" />
                        {isPendingVerification ? 'Reenviar Código SMS/WhatsApp' : 'Enviar Código de Redefinição'}
                      </button>
                    )}

                    {/* Inativar / Reativar Consultório */}
                    {!isMaster && (
                      <button
                        type="button"
                        disabled={busyId === `act_${t.id}`}
                        onClick={async () => {
                          const actionWord = t.isActive ? 'INATIVAR' : 'REATIVAR';
                          if (
                            !confirm(
                              `Deseja realmente ${actionWord} o consultório "${t.name}"?`
                            )
                          )
                            return;
                          setBusyId(`act_${t.id}`);
                          const res = await toggleTenantActiveStatusAction(t.id, !t.isActive);
                          setBusyId(null);
                          if (!res.success) alert(res.error);
                          router.refresh();
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all ${
                          t.isActive
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {t.isActive ? 'Inativar Consultório' : 'Reativar Consultório'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
