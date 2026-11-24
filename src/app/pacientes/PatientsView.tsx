'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  FileText, 
  Sparkles, 
  Calendar,
  ShieldCheck,
  X,
  MessageCircle,
  Copy,
  Check,
  Edit2,
  Video,
  MapPin,
  Package as PackageIcon,
  Award,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { createPatientAction, updatePatientAction, seedTestPatientAction } from './actions';

interface PackageItem {
  id: string;
  title: string;
  totalSessions: number;
  totalPrice: number;
  pricePerSession: number;
}

interface PatientItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  notes?: string | null;
  modalityPreference: string;
  sessionTypePreference: string;
  packageId?: string | null;
  packageTotalSessions?: number;
  packageUsedSessions?: number;
  totalAppointments: number;
  totalRecords: number;
}

export function PatientsView({ 
  patients, 
  packages = [] 
}: { 
  patients: PatientItem[];
  packages?: PackageItem[];
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSeedingTest, setIsSeedingTest] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  const handleSeedPatient = async () => {
    if (confirm('Deseja criar/restaurar a paciente teste "Mariana Silva" com 3 sessões anteriores (SOAP + apontamentos de medos/relacionamentos) e 1 agendamento futuro?')) {
      try {
        setIsSeedingTest(true);
        const res = await seedTestPatientAction();
        if (res.success) {
          setSeedSuccessMsg('Paciente teste Mariana Silva gerada com sucesso com 3 sessões ricas e 1 agendada!');
          setTimeout(() => setSeedSuccessMsg(null), 6000);
        }
      } catch (err: any) {
        alert('Erro ao gerar paciente teste: ' + err.message);
      } finally {
        setIsSeedingTest(false);
      }
    }
  };

  // Estados dinâmicos do formulário modal
  const [formModality, setFormModality] = useState<'online' | 'in_person'>('online');
  const [formSessionType, setFormSessionType] = useState<string>('regular');
  const [formSelectedPackage, setFormSelectedPackage] = useState<string>('');
  const [formTotalSessions, setFormTotalSessions] = useState<number>(5);

  const getBookingUrl = (patientId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/reservar/${patientId}`;
    }
    return `/reservar/${patientId}`;
  };

  const handleCopyLink = (patientId: string) => {
    const url = getBookingUrl(patientId);
    navigator.clipboard.writeText(url);
    setCopiedId(patientId);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const handleSendWhatsApp = (patient: PatientItem) => {
    const url = getBookingUrl(patient.id);
    const cleanPhone = (patient.phone || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.length >= 10 ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';
    const message = encodeURIComponent(
      `Olá, ${patient.name}! Aqui está o seu link exclusivo para escolher o melhor dia e horário para a sua sessão de Bioenergética (disponível para os próximos 30 dias):\n\n👉 ${url}\n\nQualquer dúvida estou à disposição!`
    );
    window.open(`https://wa.me/${phoneParam}?text=${message}`, '_blank');
  };

  const handleOpenEdit = (patient: PatientItem) => {
    setEditingPatient(patient);
    setFormModality((patient.modalityPreference as any) || 'online');
    setFormSessionType(patient.sessionTypePreference || 'regular');
    setFormSelectedPackage(patient.packageId || '');
    setFormTotalSessions(patient.packageTotalSessions || 5);
  };

  const handleOpenNew = () => {
    setEditingPatient(null);
    setFormModality('online');
    setFormSessionType('regular');
    setFormSelectedPackage(packages[0]?.id || '');
    setFormTotalSessions(packages[0]?.totalSessions || 5);
    setShowModal(true);
  };

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[#222924]">Pacientes & Prontuários</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36]">
              <ShieldCheck className="w-3 h-3" /> Criptografia LGPD
            </span>
          </div>
          <p className="text-xs text-[#6B726B]">
            Histórico clínico, modalidade fixa, pacotes contratados e prontuário integrado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedPatient}
            disabled={isSeedingTest}
            title="Gera uma paciente de testes completa com histórico de 3 sessões anteriores e 1 futura"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-all shadow-xs disabled:opacity-50"
          >
            {isSeedingTest ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Restaurar Paciente Teste (Mariana Silva)</span>
          </button>

          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Paciente
          </button>
        </div>
      </div>

      {seedSuccessMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between font-medium animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{seedSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSeedSuccessMsg(null)}
            className="text-amber-700 hover:text-amber-900 text-xs ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar paciente pelo nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/20 shadow-xs"
        />
      </div>

      {/* Lista de Pacientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-[#E8E5DF] text-[#6B726B]">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#1F4D36]" />
            <p className="text-sm font-semibold text-[#222924]">Nenhum paciente cadastrado ou encontrado.</p>
            <p className="text-xs text-[#6B726B] mt-1">Cadastre seus pacientes para iniciar o acompanhamento.</p>
          </div>
        ) : (
          filtered.map((patient) => (
            <div
              key={patient.id}
              className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-[#222924] text-base">{patient.name}</h3>
                    {/* Badges de Modalidade e Tipo de Sessão */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        patient.modalityPreference === 'in_person'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {patient.modalityPreference === 'in_person' ? (
                          <>
                            <MapPin className="w-3 h-3 text-amber-600" /> Presencial (60 min)
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3 text-emerald-600" /> Online (50 min)
                          </>
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                        {patient.sessionTypePreference === 'experimental' && 'Experimental (Grátis)'}
                        {patient.sessionTypePreference === 'descoberta' && 'Descoberta'}
                        {patient.sessionTypePreference === 'package' && (
                          <span className="text-[#1F4D36] font-bold">
                            Pacote ({patient.packageUsedSessions || 0}/{patient.packageTotalSessions || 0})
                          </span>
                        )}
                        {(!patient.sessionTypePreference || patient.sessionTypePreference === 'regular') && 'Manutenção'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(patient)}
                    title="Editar dados e modalidade do paciente"
                    className="p-1.5 rounded-lg border border-[#E8E5DF] text-gray-500 hover:text-[#1F4D36] hover:bg-[#FBF9F5] transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-[#6B726B] my-3">
                  {patient.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                </div>

                {patient.notes && (
                  <p className="text-xs text-[#6B726B] bg-[#FBF9F5] p-2.5 rounded-xl border border-[#E8E5DF]/60 line-clamp-2 mb-3">
                    {patient.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[#E8E5DF] flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-[#6B726B]">
                  <strong>{patient.totalAppointments}</strong> sessões •{' '}
                  <strong>{patient.totalRecords}</strong> evoluções
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSendWhatsApp(patient)}
                    title="Enviar link de reserva pelo WhatsApp"
                    className="p-1.5 rounded-lg bg-[#EBF3ED] text-[#1F4D36] hover:bg-[#dceade] transition-all flex items-center gap-1 text-xs font-medium"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleCopyLink(patient.id)}
                    title="Copiar link de agendamento do paciente"
                    className="p-1.5 rounded-lg border border-[#E8E5DF] bg-white text-[#222924] hover:bg-gray-50 transition-all text-xs"
                  >
                    {copiedId === patient.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>

                  <Link
                    href={`/pacientes/${patient.id}/prontuario`}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183d2b] transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Prontuário
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Cadastro de Novo Paciente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1F4D36]" />
                Cadastrar Novo Paciente
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                await createPatientAction(formData);
                setIsSubmitting(false);
                setShowModal(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#222924] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Nome do paciente"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="paciente@email.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>
              </div>

              {/* Modalidade Fixa do Paciente */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-2">
                <label className="block font-bold text-[#222924]">
                  Modalidade do Paciente (Definida pelo Terapeuta) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    formModality === 'online'
                      ? 'border-[#1F4D36] bg-[#EBF3ED] text-[#1F4D36] font-bold'
                      : 'border-[#E8E5DF] bg-white text-[#6B726B]'
                  }`}>
                    <input
                      type="radio"
                      name="modalityPreference"
                      value="online"
                      checked={formModality === 'online'}
                      onChange={() => setFormModality('online')}
                      className="sr-only"
                    />
                    <Video className="w-4 h-4" />
                    <span>Online (50 min)</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    formModality === 'in_person'
                      ? 'border-[#D97736] bg-amber-50 text-amber-900 font-bold'
                      : 'border-[#E8E5DF] bg-white text-[#6B726B]'
                  }`}>
                    <input
                      type="radio"
                      name="modalityPreference"
                      value="in_person"
                      checked={formModality === 'in_person'}
                      onChange={() => setFormModality('in_person')}
                      className="sr-only"
                    />
                    <MapPin className="w-4 h-4" />
                    <span>Presencial (60 min)</span>
                  </label>
                </div>
                <p className="text-[10px] text-[#6B726B]">
                  O paciente não precisará escolher no link de agendamento; a sessão será automaticamente alocada conforme esta preferência.
                </p>
              </div>

              {/* Tipo de Sessão e Pacote */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-2">
                <label className="block font-bold text-[#222924]">
                  Tipo de Atendimento / Contratação *
                </label>
                <select
                  name="sessionTypePreference"
                  value={formSessionType}
                  onChange={(e) => setFormSessionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] font-semibold text-xs"
                >
                  <option value="regular">Sessão Regular (Manutenção - Valor Padrão)</option>
                  <option value="experimental">Sessão Experimental (Gratuita - R$ 0)</option>
                  <option value="descoberta">Sessão de Descoberta</option>
                  <option value="package">Pacote de Sessões</option>
                </select>

                {formSessionType === 'package' && (
                  <div className="pt-2 border-t border-[#E8E5DF] space-y-2">
                    <label className="block font-semibold text-[#222924]">
                      Selecione o Pacote de Sessões:
                    </label>
                    {packages.length > 0 ? (
                      <select
                        name="packageId"
                        value={formSelectedPackage}
                        onChange={(e) => {
                          setFormSelectedPackage(e.target.value);
                          const pkg = packages.find((p) => p.id === e.target.value);
                          if (pkg) setFormTotalSessions(pkg.totalSessions);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs font-medium"
                      >
                        <option value="">Personalizado</option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.title} ({pkg.totalSessions} sessões - R$ {pkg.totalPrice.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-[#6B726B]">
                        Você pode criar modelos de pacotes em <strong>Configurações ➔ Pacotes</strong>.
                      </p>
                    )}

                    <div>
                      <label className="block font-semibold text-[#222924] mb-1">
                        Total de Sessões Contratadas no Pacote:
                      </label>
                      <input
                        type="number"
                        name="packageTotalSessions"
                        value={formTotalSessions}
                        onChange={(e) => setFormTotalSessions(parseInt(e.target.value, 10) || 1)}
                        min="1"
                        max="50"
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">Queixa Inicial / Observações</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Demanda principal trazida no contato inicial..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs resize-none"
                ></textarea>
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
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Paciente Existente */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#1F4D36]" />
                Editar Dados do Paciente
              </h3>
              <button onClick={() => setEditingPatient(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                await updatePatientAction(formData);
                setIsSubmitting(false);
                setEditingPatient(null);
              }}
              className="space-y-4 text-xs"
            >
              <input type="hidden" name="id" value={editingPatient.id} />

              <div>
                <label className="block font-semibold text-[#222924] mb-1">Nome Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingPatient.name}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    defaultValue={editingPatient.phone}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingPatient.email}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs"
                  />
                </div>
              </div>

              {/* Modalidade Fixa do Paciente */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-2">
                <label className="block font-bold text-[#222924]">
                  Modalidade do Paciente (Fixada pelo Terapeuta) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    formModality === 'online'
                      ? 'border-[#1F4D36] bg-[#EBF3ED] text-[#1F4D36] font-bold'
                      : 'border-[#E8E5DF] bg-white text-[#6B726B]'
                  }`}>
                    <input
                      type="radio"
                      name="modalityPreference"
                      value="online"
                      checked={formModality === 'online'}
                      onChange={() => setFormModality('online')}
                      className="sr-only"
                    />
                    <Video className="w-4 h-4" />
                    <span>Online (50 min)</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    formModality === 'in_person'
                      ? 'border-[#D97736] bg-amber-50 text-amber-900 font-bold'
                      : 'border-[#E8E5DF] bg-white text-[#6B726B]'
                  }`}>
                    <input
                      type="radio"
                      name="modalityPreference"
                      value="in_person"
                      checked={formModality === 'in_person'}
                      onChange={() => setFormModality('in_person')}
                      className="sr-only"
                    />
                    <MapPin className="w-4 h-4" />
                    <span>Presencial (60 min)</span>
                  </label>
                </div>
                <p className="text-[10px] text-[#6B726B]">
                  Sessões presenciais costumam demorar um pouco mais (60 min). O paciente receberá a confirmação com o endereço do consultório.
                </p>
              </div>

              {/* Tipo de Sessão e Pacote */}
              <div className="p-3.5 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-2">
                <label className="block font-bold text-[#222924]">
                  Tipo de Atendimento / Contratação *
                </label>
                <select
                  name="sessionTypePreference"
                  value={formSessionType}
                  onChange={(e) => setFormSessionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] font-semibold text-xs"
                >
                  <option value="regular">Sessão Regular (Manutenção - R$ normal)</option>
                  <option value="experimental">Sessão Experimental (Gratuita - R$ 0)</option>
                  <option value="descoberta">Sessão de Descoberta</option>
                  <option value="package">Pacote de Sessões</option>
                </select>

                {formSessionType === 'package' && (
                  <div className="pt-2 border-t border-[#E8E5DF] space-y-2">
                    <label className="block font-semibold text-[#222924]">
                      Selecione o Pacote de Sessões:
                    </label>
                    {packages.length > 0 ? (
                      <select
                        name="packageId"
                        value={formSelectedPackage}
                        onChange={(e) => {
                          setFormSelectedPackage(e.target.value);
                          const pkg = packages.find((p) => p.id === e.target.value);
                          if (pkg) setFormTotalSessions(pkg.totalSessions);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs font-medium"
                      >
                        <option value="">Personalizado</option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.title} ({pkg.totalSessions} sessões - R$ {pkg.totalPrice.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-[#6B726B]">
                        Crie modelos de pacotes em Configurações para vincular automaticamente.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-[#222924] mb-1">
                          Sessões Realizadas:
                        </label>
                        <input
                          type="number"
                          name="packageUsedSessions"
                          defaultValue={editingPatient.packageUsedSessions || 0}
                          min="0"
                          max="50"
                          className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#222924] mb-1">
                          Total de Sessões do Pacote:
                        </label>
                        <input
                          type="number"
                          name="packageTotalSessions"
                          value={formTotalSessions}
                          onChange={(e) => setFormTotalSessions(parseInt(e.target.value, 10) || 1)}
                          min="1"
                          max="50"
                          className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">Queixa Inicial / Observações</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingPatient.notes || ''}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30 text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E5DF] text-xs font-semibold text-[#6B726B] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
