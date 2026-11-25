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
  FileCheck,
  MessageCircle,
  QrCode,
  RefreshCw,
  Power,
  Clock,
  Package as PackageIcon,
  Plus,
  Trash2,
  MapPin,
  CalendarCheck
} from 'lucide-react';
import { 
  updateTenantSettingsAction, 
  connectWhatsAppAction, 
  disconnectWhatsAppAction,
  createPackageAction,
  deletePackageAction,
  triggerManualRemindersAction,
  sendTestWhatsAppMessageAction
} from './actions';

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
  whatsappInstanceName?: string | null;
  whatsappStatus?: string | null;
  whatsappQrCode?: string | null;
  whatsappAutoReminder?: boolean;
  whatsappReminderHours?: number;
  whatsappSend2hReminder?: boolean;
  whatsappReminderText?: string | null;
  whatsappReminder2hText?: string | null;
}

interface PackageItem {
  id: string;
  title: string;
  description?: string | null;
  totalSessions: number;
  totalPrice: number;
  pricePerSession: number;
  active: boolean;
}

export function ConfiguracoesView({
  tenant,
  packages = [],
  publicUrl,
}: {
  tenant: TenantData;
  packages?: PackageItem[];
  publicUrl: string;
}) {
  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'canais' | 'whatsapp' | 'pacotes'>('geral');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(tenant.whatsappQrCode || null);
  const [whatsappStatus, setWhatsappStatus] = useState<string>(tenant.whatsappStatus || 'disconnected');

  // Estado para múltiplos lembretes
  const [reminder24h, setReminder24h] = useState<boolean>(tenant.whatsappAutoReminder ?? true);
  const [reminder2h, setReminder2h] = useState<boolean>(tenant.whatsappSend2hReminder ?? true);

  // Estados para testes e disparos manuais do WhatsApp
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);
  const [reminderReport, setReminderReport] = useState<{ totalSent: number; results: any[] } | null>(null);
  const [testPhone, setTestPhone] = useState(tenant.whatsapp || '');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  const handleManualTrigger = async () => {
    setIsTriggeringReminders(true);
    try {
      const res = await triggerManualRemindersAction();
      setReminderReport(res);
    } catch (err: any) {
      alert('Erro ao disparar lembretes: ' + err.message);
    } finally {
      setIsTriggeringReminders(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim()) {
      alert('Informe um número de telefone com DDD para testar.');
      return;
    }
    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await sendTestWhatsAppMessageAction(testPhone);
      if (res.success) {
        setTestFeedback({ success: true, msg: 'Mensagem de teste enviada com sucesso para o WhatsApp!' });
      } else {
        setTestFeedback({ success: false, msg: `Falha: ${res.error || 'Verifique se o WhatsApp está conectado.'}` });
      }
    } catch (err: any) {
      setTestFeedback({ success: false, msg: err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Estado para criação rápida de pacotes
  const [showNewPackageModal, setShowNewPackageModal] = useState(false);
  const [pkgSessions, setPkgSessions] = useState(5);
  const [pkgPrice, setPkgPrice] = useState(800);

  const handleConnectWhatsApp = async () => {
    setIsLoadingQr(true);
    try {
      const res = await connectWhatsAppAction();
      setWhatsappStatus(res.status);
      if (res.qrcode) {
        setQrCode(res.qrcode);
      }
    } catch (err: any) {
      alert('Erro ao conectar WhatsApp: ' + err.message);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!confirm('Deseja realmente desconectar o WhatsApp deste consultório?')) return;
    setIsLoadingQr(true);
    try {
      await disconnectWhatsAppAction();
      setWhatsappStatus('disconnected');
      setQrCode(null);
    } catch (err: any) {
      alert('Erro ao desconectar WhatsApp: ' + err.message);
    } finally {
      setIsLoadingQr(false);
    }
  };

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

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Deseja excluir este pacote de sessões?')) return;
    await deletePackageAction(id);
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
            Personalize seu perfil, valores, canais de contato, automação WhatsApp e pacotes de sessões.
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
            href={`/agendar?slug=${tenant.slug}`}
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
          Configurações salvas com sucesso! As alterações já estão ativas.
        </div>
      )}

      {/* Navegação por Abas no Topo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E8E5DF]">
        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'geral'
              ? 'bg-[#1F4D36] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <User className="w-4 h-4" />
          Identidade do Consultório
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('financeiro')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'financeiro'
              ? 'bg-[#1F4D36] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Financeiro & Pix
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('canais')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'canais'
              ? 'bg-[#1F4D36] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <Phone className="w-4 h-4" />
          Canais & Endereço
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'whatsapp'
              ? 'bg-[#25D366] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp & Lembretes
          {whatsappStatus === 'open' && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pacotes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'pacotes'
              ? 'bg-[#1F4D36] text-white shadow-sm'
              : 'text-[#6B726B] hover:text-[#222924] hover:bg-white'
          }`}
        >
          <PackageIcon className="w-4 h-4" />
          Pacotes de Sessões ({packages.length})
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="tenantSlug" value={tenant.slug} />

        {/* ABA 1: Identidade Profissional */}
        {activeTab === 'geral' && (
          <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4 animate-fade-in">
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
        )}

        {/* ABA 2: Financeiro & Pix */}
        {activeTab === 'financeiro' && (
          <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4 animate-fade-in">
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
                  Valor Padrão da Sessão Regular (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="consultationPrice"
                  defaultValue={tenant.consultationPrice}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
                />
                <p className="text-[10px] text-[#6B726B] mt-1">Sessões avulsas de manutenção</p>
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
        )}

        {/* ABA 3: Canais & Endereço */}
        {activeTab === 'canais' && (
          <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-3">
              <Phone className="w-5 h-5 text-[#1F4D36]" />
              <div>
                <h2 className="text-sm font-bold text-[#222924]">Canais de Contato & Localização</h2>
                <p className="text-[11px] text-[#6B726B]">Onde os novos pacientes encontram você e onde ocorrem as sessões</p>
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
                Link de Videochamada Padrão (Google Meet ou Zoom para sessões Online)
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
              <label className="block text-xs font-semibold text-[#222924] mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#1F4D36]" />
                Endereço do Consultório Presencial (Enviado para sessões Presenciais)
              </label>
              <input
                type="text"
                name="address"
                defaultValue={tenant.address || ''}
                placeholder="Ex: R. Irineu Forandi, 51 - Vila Monteiro, Piracicaba - SP, 13418-425"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-sm"
              />
            </div>
          </div>
        )}

        {/* ABA 4: WhatsApp & Lembretes Automáticos */}
        {activeTab === 'whatsapp' && (
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  <h2 className="text-base font-bold text-[#222924]">WhatsApp do Consultório & Lembretes</h2>
                </div>
                <p className="text-xs text-[#6B726B] mt-0.5">
                  Conecte o WhatsApp do seu consultório via QR Code para disparar lembretes automáticos com link ou endereço.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    whatsappStatus === 'open'
                      ? 'bg-emerald-100 text-emerald-800'
                      : whatsappStatus === 'connecting'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      whatsappStatus === 'open'
                        ? 'bg-emerald-500 animate-pulse'
                        : whatsappStatus === 'connecting'
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  {whatsappStatus === 'open'
                    ? 'WhatsApp Conectado'
                    : whatsappStatus === 'connecting'
                    ? 'Aguardando Leitura'
                    : 'Desconectado'}
                </span>

                {whatsappStatus === 'open' ? (
                  <button
                    type="button"
                    onClick={handleDisconnectWhatsApp}
                    disabled={isLoadingQr}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Desconectar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectWhatsApp}
                    disabled={isLoadingQr}
                    className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white hover:bg-[#1eb956] text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {isLoadingQr ? 'Gerando QR...' : 'Conectar Celular'}
                  </button>
                )}
              </div>
            </div>

            {/* QR Code quando desconectado ou aguardando */}
            {whatsappStatus !== 'open' && qrCode && (
              <div className="p-6 rounded-2xl bg-[#FBF9F5] border border-[#E8E5DF] text-center max-w-sm mx-auto space-y-3">
                <p className="text-xs font-bold text-[#222924]">
                  Abra o WhatsApp no celular ➔ Aparelhos Conectados ➔ Conectar um Aparelho:
                </p>
                <div className="p-3 bg-white rounded-xl border border-[#E8E5DF] inline-block shadow-sm">
                  <img
                    src={qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-56 h-56 mx-auto object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConnectWhatsApp}
                  className="text-xs text-[#1F4D36] font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar QR Code
                </button>
              </div>
            )}

            {/* Seleção de Múltiplos Lembretes Automáticos */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-[#222924] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1F4D36]" />
                Momentos dos Lembretes Automáticos aos Pacientes
              </h3>

              {/* Lembrete 1: 24 Horas Antes */}
              <div className="p-4 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[#222924]">
                  <input
                    type="checkbox"
                    name="whatsappAutoReminder"
                    checked={reminder24h}
                    onChange={(e) => setReminder24h(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1F4D36] focus:ring-[#1F4D36]"
                  />
                  <span>1º Lembrete: 24 horas antes da sessão</span>
                </label>
                {reminder24h && (
                  <div className="space-y-1 pl-6">
                    <label className="block text-[11px] font-semibold text-[#6B726B]">
                      Texto do Lembrete de 24h:
                    </label>
                    <textarea
                      name="whatsappReminderText"
                      rows={2}
                      defaultValue={
                        tenant.whatsappReminderText ||
                        'Olá, {{paciente}}! Passando para confirmar nossa sessão de {{tipo}} amanhã, dia {{data}} às {{hora}}. Aguardo você!'
                      }
                      className="w-full p-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 resize-none font-sans"
                    />
                    <p className="text-[10px] text-[#6B726B]">Variáveis disponíveis: {'{{paciente}}, {{data}}, {{hora}}, {{tipo}}'}</p>
                  </div>
                )}
              </div>

              {/* Lembrete 2: 2 Horas Antes */}
              <div className="p-4 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[#222924]">
                  <input
                    type="checkbox"
                    name="whatsappSend2hReminder"
                    checked={reminder2h}
                    onChange={(e) => setReminder2h(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1F4D36] focus:ring-[#1F4D36]"
                  />
                  <span>2º Lembrete: 2 horas antes da sessão (com Link / Endereço)</span>
                </label>
                {reminder2h && (
                  <div className="space-y-1 pl-6">
                    <label className="block text-[11px] font-semibold text-[#6B726B]">
                      Texto do Lembrete de 2h:
                    </label>
                    <textarea
                      name="whatsappReminder2hText"
                      rows={2}
                      defaultValue={
                        tenant.whatsappReminder2hText ||
                        'Olá, {{paciente}}! Nossa sessão começa em 2 horas (às {{hora}}). {{instrucoes_local}} Nos vemos em breve!'
                      }
                      className="w-full p-2.5 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 resize-none font-sans"
                    />
                    <p className="text-[10px] text-[#6B726B]">
                      Variáveis: {'{{paciente}}, {{hora}}, {{instrucoes_local}}'} (insere o link do Google Meet se online ou o endereço do consultório se presencial).
                    </p>
                  </div>
                )}
              </div>

              {/* Testes & Disparos Manuais */}
              <div className="pt-4 border-t border-[#E8E5DF] space-y-4">
                <h3 className="text-xs font-bold text-[#222924] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Ferramentas de Teste e Disparo Imediato
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Caixa 1: Disparo Manual dos Lembretes de Hoje */}
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                    <div>
                      <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-amber-700" />
                        Disparar Lembretes de Hoje Manualmente
                      </h4>
                      <p className="text-[11px] text-amber-800/80 mt-1">
                        Verifica e envia imediatamente todos os lembretes pendentes para os atendimentos de hoje (24h e 2h antes).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleManualTrigger}
                      disabled={isTriggeringReminders || whatsappStatus !== 'open'}
                      className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isTriggeringReminders ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verificando e disparando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Disparar Lembretes Pendentes Agora</span>
                        </>
                      )}
                    </button>

                    {reminderReport && (
                      <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs space-y-1.5">
                        <div className="font-bold text-amber-900">
                          {reminderReport.totalSent > 0
                            ? `✅ ${reminderReport.totalSent} lembrete(s) enviado(s) com sucesso!`
                            : 'ℹ️ Nenhum lembrete pendente para este momento.'}
                        </div>
                        {reminderReport.results.length > 0 && (
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {reminderReport.results.map((r: any, idx: number) => (
                              <div
                                key={idx}
                                className={`text-[10px] p-1.5 rounded flex items-center justify-between ${
                                  r.status === 'sent'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-rose-50 text-rose-800'
                                }`}
                              >
                                <span>
                                  <strong>{r.patient}</strong> ({r.type})
                                </span>
                                <span>{r.status === 'sent' ? r.time : r.error}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Caixa 2: Enviar Mensagem de Teste no Próprio WhatsApp */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                    <div>
                      <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        Testar Conexão no seu WhatsApp
                      </h4>
                      <p className="text-[11px] text-emerald-800/80 mt-1">
                        Envie uma mensagem de teste para o seu próprio número para garantir que a Evolution API está ativa.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="Seu telefone com DDD (ex: 19996858958)"
                        className="w-full p-2 rounded-lg border border-emerald-300 bg-white text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />

                      <button
                        type="button"
                        onClick={handleSendTestMessage}
                        disabled={isSendingTest}
                        className="w-full py-2 px-3 rounded-lg bg-[#1F4D36] hover:bg-[#183C2A] text-white font-bold text-xs disabled:opacity-50 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSendingTest ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Enviando teste...</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Enviar Mensagem de Teste</span>
                          </>
                        )}
                      </button>
                    </div>

                    {whatsappStatus !== 'open' && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        ⚠️ O WhatsApp precisa estar conectado acima via QR Code antes de testar ou enviar lembretes.
                      </p>
                    )}

                    {testFeedback && (
                      <div
                        className={`p-2.5 rounded-lg text-xs font-semibold ${
                          testFeedback.success
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        {testFeedback.msg}
                      </div>
                    )}
                  </div>
                </div>

                {/* Caixa 3: Instrução do Cron na VPS */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-700 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-gray-900">
                    <Clock className="w-4 h-4 text-gray-600" />
                    Automação no Servidor Linux (Crontab da VPS)
                  </div>
                  <p className="text-[11px] text-gray-600">
                    Para que os lembretes sejam disparados mesmo quando o navegador estiver fechado, adicione a linha abaixo no crontab da VPS rodando no terminal Linux (<code>crontab -e</code>):
                  </p>
                  <pre className="p-2.5 rounded-lg bg-gray-900 text-emerald-400 text-[11px] font-mono overflow-x-auto select-all">
                    */10 * * * * curl -s &quot;http://127.0.0.1:3002/api/cron/reminders?token=bem_cron_token_secret_hostinger&quot; &gt; /dev/null 2&gt;&amp;1
                  </pre>
                  <p className="text-[10px] text-gray-500">
                    Isso fará o servidor checar os agendamentos a cada 10 minutos e disparar os lembretes pontualmente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: Pacotes de Sessões */}
        {activeTab === 'pacotes' && (
          <div className="bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm space-y-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <PackageIcon className="w-5 h-5 text-[#1F4D36]" />
                  <h2 className="text-base font-bold text-[#222924]">Pacotes de Atendimento</h2>
                </div>
                <p className="text-xs text-[#6B726B] mt-0.5">
                  Crie pacotes de sessões. O sistema calcula automaticamente o valor por sessão para rateio e controle.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewPackageModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Criar Novo Pacote
              </button>
            </div>

            {packages.length === 0 ? (
              <div className="text-center py-10 bg-[#FBF9F5] rounded-xl border border-[#E8E5DF] text-[#6B726B] space-y-2">
                <PackageIcon className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-xs font-semibold text-[#222924]">Nenhum pacote cadastrado ainda.</p>
                <p className="text-[11px]">Crie pacotes (ex: 5 ou 10 sessões) para vincular aos seus pacientes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-4 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] flex flex-col justify-between hover:border-[#1F4D36]/40 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-sm text-[#222924]">{pkg.title}</h4>
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="text-red-400 hover:text-red-600 p-1 rounded-md"
                          title="Excluir pacote"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-[#6B726B] mb-3">{pkg.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#E8E5DF] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#6B726B]">Total: </span>
                        <strong className="text-[#222924] font-bold">
                          R$ {pkg.totalPrice.toFixed(2).replace('.', ',')}
                        </strong>
                        <span className="text-[11px] text-[#6B726B]"> ({pkg.totalSessions} sessões)</span>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-[#EBF3ED] text-[#1F4D36] font-bold text-[11px]">
                        R$ {pkg.pricePerSession.toFixed(2).replace('.', ',')}/sessão
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botão de Salvar Alterações */}
        {activeTab !== 'pacotes' && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] disabled:opacity-50 transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Alterações desta Aba'}
            </button>
          </div>
        )}
      </form>

      {/* Modal de Criação de Pacote */}
      {showNewPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base flex items-center gap-2">
                <PackageIcon className="w-5 h-5 text-[#1F4D36]" />
                Novo Pacote de Atendimento
              </h3>
              <button
                type="button"
                onClick={() => setShowNewPackageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form
              action={async (formData) => {
                await createPackageAction(formData);
                setShowNewPackageModal(false);
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Título do Pacote *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue="Pacote 5 Sessões Bioenergética"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  name="description"
                  placeholder="Ex: Acompanhamento quinzenal focado em ansiedade e alinhamento"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1">
                    Número de Sessões *
                  </label>
                  <input
                    type="number"
                    name="totalSessions"
                    min="1"
                    max="50"
                    required
                    value={pkgSessions}
                    onChange={(e) => setPkgSessions(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1">
                    Valor Total do Pacote (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="totalPrice"
                    min="1"
                    required
                    value={pkgPrice}
                    onChange={(e) => setPkgPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>
              </div>

              {/* Cálculo automático de rateio */}
              <div className="p-3 rounded-xl bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold flex items-center justify-between">
                <span>Rateio por sessão:</span>
                <span className="text-sm font-bold">
                  R$ {(pkgPrice / (pkgSessions || 1)).toFixed(2).replace('.', ',')} / sessão
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setShowNewPackageModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A]"
                >
                  Criar Pacote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
