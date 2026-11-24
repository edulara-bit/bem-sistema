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
  Check
} from 'lucide-react';
import { createPatientAction } from './actions';

interface PatientItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  notes?: string | null;
  totalAppointments: number;
  totalRecords: number;
}

export function PatientsView({ patients }: { patients: PatientItem[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
            Histórico clínico, evoluções e acompanhamento de cada paciente
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </button>
      </div>

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
                  <h3 className="font-bold text-[#222924] text-base">{patient.name}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36]">
                    Ativo
                  </span>
                </div>

                <div className="space-y-1 text-xs text-[#6B726B] mb-3">
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
                  <p className="text-xs text-[#6B726B] bg-[#FBF9F5] p-2 rounded-lg border border-[#E8E5DF]/60 line-clamp-2 mb-3">
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

      {/* Modal de Novo Paciente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base">Cadastrar Novo Paciente</h3>
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
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">Nome Completo</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Nome do paciente"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#222924] mb-1">E-mail</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="paciente@email.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222924] mb-1">Queixa Inicial / Observações</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Demanda principal trazida no contato inicial..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/30"
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
    </div>
  );
}

