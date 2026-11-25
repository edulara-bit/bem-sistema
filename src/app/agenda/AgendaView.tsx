'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  MapPin, 
  Plus, 
  Check, 
  X, 
  MessageCircle, 
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Ban,
  CheckCircle2,
  Copy,
  Share2,
  Lock,
  Unlock,
  Settings,
  CalendarDays,
  List,
  CalendarClock,
  RotateCcw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  createAppointmentAction, 
  updateAppointmentStatusAction,
  rescheduleAppointmentAction,
  cancelAppointmentAction,
  reactivateAppointmentAction,
  toggleSlotBlockAction,
  blockFullDateAction,
  unblockFullDateAction,
  saveWeeklyRulesAction
} from './actions';
import { DAY_NAMES, formatAppointmentDateTime } from '@/lib/schedule-utils';

interface Patient {
  id: string;
  name: string;
}

interface Appointment {
  id: string;
  patientId: string;
  scheduledAt: string | Date;
  durationMin: number;
  status: string;
  modality: string;
  meetingUrl?: string | null;
  price: number;
  notes?: string | null;
  patient: {
    id: string;
    name: string;
  };
}

interface AgendaViewProps {
  appointments: Appointment[];
  patients: Patient[];
  weeklySchedule: {
    weekStartStr: string;
    weekEndStr: string;
    allHours: string[];
    days: any[];
    weeklyRules: Record<number, { enabled: boolean; hours: string[] }>;
  };
  blockedDates: {
    id: string;
    date: string;
    reason?: string | null;
  }[];
  weeklyRules: Record<number, { enabled: boolean; hours: string[] }>;
  tenant: {
    id: string;
    name: string;
    slug: string;
    whatsapp?: string | null;
    consultationPrice: number;
  };
}

export function AgendaView({
  appointments,
  patients,
  weeklySchedule,
  blockedDates,
  weeklyRules: initialWeeklyRules,
  tenant,
}: AgendaViewProps) {
  const router = useRouter();

  // Estado local para reatividade imediata
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>(appointments);

  useEffect(() => {
    setAppointmentsList(appointments);
  }, [appointments]);

  // Abas principais
  const [activeTab, setActiveTab] = useState<'grid' | 'list' | 'settings'>('grid');

  // Filtro da aba lista
  const [filter, setFilter] = useState<'active' | 'today' | 'upcoming' | 'cancelled' | 'all'>('active');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPatientForShare, setSelectedPatientForShare] = useState<string>(patients[0]?.id || '');
  const [copiedLink, setCopiedLink] = useState(false);

  // Modais de Remarcar e Cancelar
  const [rescheduleData, setRescheduleData] = useState<{
    id: string;
    patientName: string;
    date: string;
    time: string;
  } | null>(null);
  const [cancelData, setCancelData] = useState<{
    id: string;
    patientName: string;
    date: string;
    time: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Estados de submissão
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockingLoadingKey, setBlockingLoadingKey] = useState<string | null>(null);

  // Estado para edição das regras semanais
  const [editableRules, setEditableRules] = useState(initialWeeklyRules);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Estado para formulário de bloquear dia inteiro
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayReason, setHolidayReason] = useState('');
  const [isBlockingHoliday, setIsBlockingHoliday] = useState(false);

  const { dateStr: todayStr } = formatAppointmentDateTime(new Date());

  // Navegação da semana
  const currentWeekDate = new Date(weeklySchedule.weekStartStr + 'T00:00:00');
  
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekDate);
    prev.setDate(prev.getDate() - 7);
    router.push(`/agenda?week=${prev.toISOString().split('T')[0]}`);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() + 7);
    router.push(`/agenda?week=${next.toISOString().split('T')[0]}`);
  };

  const handleCurrentWeek = () => {
    router.push('/agenda');
  };

  // Toggle de bloqueio de horário avulso
  const handleToggleSlotBlock = async (date: string, time: string) => {
    const key = `${date}_${time}`;
    setBlockingLoadingKey(key);
    try {
      await toggleSlotBlockAction(date, time);
      router.refresh();
    } catch (err: any) {
      alert('Erro ao alterar disponibilidade do horário: ' + err.message);
    } finally {
      setBlockingLoadingKey(null);
    }
  };

  // Bloqueio de dia inteiro (feriado)
  const handleBlockHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) return;
    setIsBlockingHoliday(true);
    try {
      await blockFullDateAction(holidayDate, holidayReason || 'Feriado / Recesso');
      setHolidayDate('');
      setHolidayReason('');
      router.refresh();
    } catch (err: any) {
      alert('Erro ao bloquear data: ' + err.message);
    } finally {
      setIsBlockingHoliday(false);
    }
  };

  const handleUnblockHoliday = async (date: string) => {
    if (!confirm(`Deseja desbloquear e liberar os horários do dia ${date}?`)) return;
    try {
      await unblockFullDateAction(date);
      router.refresh();
    } catch (err: any) {
      alert('Erro ao desbloquear data: ' + err.message);
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rescheduleData) return;
    setIsProcessingAction(true);
    const formData = new FormData(e.currentTarget);
    const newDate = formData.get('newDate') as string;
    const newTime = formData.get('newTime') as string;
    try {
      await rescheduleAppointmentAction(rescheduleData.id, newDate, newTime);
      setRescheduleData(null);
      router.refresh();
    } catch (err: any) {
      alert('Erro ao remarcar sessão: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelData) return;
    setIsProcessingAction(true);
    try {
      await cancelAppointmentAction(cancelData.id, cancelReason);
      setAppointmentsList((prev) =>
        prev.map((a) =>
          a.id === cancelData.id
            ? {
                ...a,
                status: 'cancelled',
                notes: cancelReason ? `Cancelado: ${cancelReason}` : 'Cancelado pelo terapeuta',
              }
            : a
        )
      );
      setCancelData(null);
      setCancelReason('');
      router.refresh();
    } catch (err: any) {
      alert('Erro ao cancelar sessão: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReactivateAppointment = async (id: string) => {
    if (!confirm('Deseja reativar este agendamento para o mesmo horário?')) return;
    setIsProcessingAction(true);
    try {
      await reactivateAppointmentAction(id);
      setAppointmentsList((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'scheduled' } : a))
      );
      router.refresh();
    } catch (err: any) {
      alert('Erro ao reativar sessão: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setAppointmentsList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    try {
      await updateAppointmentStatusAction(id, status);
      router.refresh();
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
      router.refresh();
    }
  };

  // Salvar regras semanais de dias e horários
  const handleSaveWeeklyRules = async () => {
    setIsSavingRules(true);
    try {
      const payload = Object.entries(editableRules).map(([dayOfWeek, config]) => ({
        dayOfWeek: Number(dayOfWeek),
        enabled: config.enabled,
        hours: config.hours,
      }));
      await saveWeeklyRulesAction(payload);
      alert('Configuração de horários semanais salva com sucesso!');
      router.refresh();
    } catch (err: any) {
      alert('Erro ao salvar horários: ' + err.message);
    } finally {
      setIsSavingRules(false);
    }
  };

  const activeCount = appointmentsList.filter((a) => a.status !== 'cancelled').length;
  const cancelledCount = appointmentsList.filter((a) => a.status === 'cancelled').length;
  const todayCount = appointmentsList.filter((a) => {
    const { dateStr: appDate } = formatAppointmentDateTime(a.scheduledAt);
    return appDate === todayStr && a.status !== 'cancelled';
  }).length;
  const upcomingCount = appointmentsList.filter((a) => {
    const { dateStr: appDate } = formatAppointmentDateTime(a.scheduledAt);
    return appDate >= todayStr && a.status !== 'cancelled';
  }).length;

  const filteredAppointments = appointmentsList.filter((app) => {
    const { dateStr: appDate } = formatAppointmentDateTime(app.scheduledAt);
    if (filter === 'active') return app.status !== 'cancelled';
    if (filter === 'today') return appDate === todayStr && app.status !== 'cancelled';
    if (filter === 'upcoming') return appDate >= todayStr && app.status !== 'cancelled';
    if (filter === 'cancelled') return app.status === 'cancelled';
    return true; // 'all'
  });

  // Gerador de Link para Paciente
  const getBookingLink = (patientId: string) => {
    const host = typeof window !== 'undefined' ? window.location.origin : 'https://bem.edulara.com.br';
    return `${host}/reservar/${patientId}`;
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientForShare);

  const copyPatientBookingLink = (patientId: string) => {
    const url = getBookingLink(patientId);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const getWhatsappBookingInvitationUrl = (patient: Patient) => {
    const url = getBookingLink(patient.id);
    const msg = `Olá ${patient.name.split(' ')[0]}! Tudo bem?\n\nSegue o seu link exclusivo para escolher e reservar o melhor dia e horário para sua próxima sessão com ${tenant.name}:\n\n🔗 ${url}\n\nVocê poderá consultar os horários disponíveis para os próximos 30 dias. Qualquer dúvida, estou à disposição!`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Abas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[#222924]">Agenda de Atendimentos</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36]">
              Reservas Online Ativas
            </span>
          </div>
          <p className="text-xs text-[#6B726B]">
            Grade semanal com horários livres, agendados e bloqueio em 1 clique
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão para enviar link de reserva no WhatsApp */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black text-xs font-bold transition-all shadow-sm"
          >
            <MessageCircle className="w-4 h-4 fill-black" />
            <span>Enviar Link de Reserva</span>
          </button>

          {/* Botão de nova sessão manual */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Sessão Manual</span>
          </button>
        </div>
      </div>

      {/* Seletor de Abas da Agenda */}
      <div className="flex items-center gap-2 border-b border-[#E8E5DF] pb-2 text-xs font-semibold text-[#6B726B]">
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'grid'
              ? 'bg-[#1F4D36] text-white shadow-xs'
              : 'hover:bg-white hover:text-[#222924]'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Grade Semanal & Bloqueios</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'list'
              ? 'bg-[#1F4D36] text-white shadow-xs'
              : 'hover:bg-white hover:text-[#222924]'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Lista de Sessões</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'bg-[#1F4D36] text-white shadow-xs'
              : 'hover:bg-white hover:text-[#222924]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurar Horários & Feriados</span>
        </button>
      </div>

      {/* ================= ABA 1: GRADE SEMANAL (VISÃO DE DIAS, HORÁRIOS E BLOQUEIOS) ================= */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          {/* Navegador de Semanas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-2 rounded-lg border border-[#E8E5DF] hover:bg-gray-50 text-xs font-semibold text-[#222924]"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleCurrentWeek}
                className="px-3 py-1.5 rounded-lg border border-[#E8E5DF] hover:bg-gray-50 text-xs font-semibold text-[#1F4D36]"
              >
                Esta Semana
              </button>

              <button
                onClick={handleNextWeek}
                className="p-2 rounded-lg border border-[#E8E5DF] hover:bg-gray-50 text-xs font-semibold text-[#222924]"
                title="Próxima Semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-sm font-bold text-[#222924] ml-2">
                Semana de {weeklySchedule.weekStartStr.split('-').reverse().slice(0, 2).join('/')} a{' '}
                {weeklySchedule.weekEndStr.split('-').reverse().slice(0, 2).join('/')}
              </span>
            </div>

            {/* Legenda dos Cards */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-[#6B726B]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1F4D36]" /> Agendado
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-600" /> Livre (Clique p/ bloquear)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Bloqueado (Clique p/ liberar)
              </span>
            </div>
          </div>

          {/* Grid dos 7 Dias da Semana */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weeklySchedule.days.map((day) => {
              const isToday = day.date === todayStr;

              return (
                <div
                  key={day.date}
                  className={`bg-white rounded-2xl border flex flex-col min-h-[460px] shadow-sm ${
                    isToday ? 'border-[#1F4D36] ring-1 ring-[#1F4D36]/20' : 'border-[#E8E5DF]'
                  }`}
                >
                  {/* Cabeçalho do Dia */}
                  <div className={`p-3 border-b text-center rounded-t-2xl ${isToday ? 'bg-[#EBF3ED]' : 'bg-[#FBF9F5]'}`}>
                    <div className="text-[11px] font-bold uppercase text-[#6B726B]">{day.dayName}</div>
                    <div className="text-base font-extrabold text-[#222924]">{day.formattedDate}</div>
                    <div className="mt-1">
                      {day.isHoliday ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Feriado/Bloqueado
                        </span>
                      ) : day.totalAvailable > 0 ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#1F4D36]">
                          {day.totalAvailable} livres
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {day.slots.length === 0 ? 'Sem expediente' : 'Lotado / Bloqueado'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo / Horários do Dia */}
                  <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
                    {day.isHoliday ? (
                      <div className="p-4 text-center my-auto space-y-2">
                        <Ban className="w-8 h-8 text-red-400 mx-auto opacity-70" />
                        <p className="text-xs font-semibold text-red-800">Dia Inteiro Bloqueado</p>
                        {day.holidayReason && (
                          <p className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-200">
                            {day.holidayReason}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUnblockHoliday(day.date)}
                          className="text-[10px] font-bold text-red-700 hover:underline inline-block pt-1"
                        >
                          Liberar este dia
                        </button>
                      </div>
                    ) : day.slots.length === 0 ? (
                      <div className="p-6 text-center text-[#6B726B] text-[11px] my-auto">
                        Dia não configurado para atendimento.
                      </div>
                    ) : (
                      day.slots.map((slot: any) => {
                        const isLoading = blockingLoadingKey === `${day.date}_${slot.time}`;

                        // CASO 1: Horário Agendado com Paciente
                        if (slot.reason === 'booked' && slot.appointment) {
                          return (
                            <div
                              key={slot.time}
                              className="p-2.5 rounded-xl bg-[#1F4D36] text-white text-xs shadow-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span>{slot.time}</span>
                                <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-medium">
                                  {slot.appointment.modality === 'online' ? 'Online' : 'Presencial'}
                                </span>
                              </div>
                              <div className="font-semibold truncate text-[11px]">
                                {slot.appointment.patientName}
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-white/20 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRescheduleData({
                                      id: slot.appointment.id,
                                      patientName: slot.appointment.patientName,
                                      date: day.date,
                                      time: slot.time,
                                    })
                                  }
                                  className="underline hover:text-emerald-200"
                                >
                                  Remarcar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCancelData({
                                      id: slot.appointment.id,
                                      patientName: slot.appointment.patientName,
                                      date: day.date,
                                      time: slot.time,
                                    })
                                  }
                                  className="text-red-200 hover:text-red-100 hover:underline"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // CASO 2: Horário Bloqueado / Indisponível
                        if (slot.reason === 'blocked' || slot.reason === 'holiday') {
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleToggleSlotBlock(day.date, slot.time)}
                              title="Clique para DESBLOQUEAR e tornar este horário livre para agendamento"
                              className="w-full p-2 rounded-xl bg-red-50 hover:bg-emerald-50 border border-red-200 hover:border-emerald-300 text-left transition-all group cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-red-900 group-hover:text-emerald-800">
                                  {slot.time}
                                </span>
                                <Lock className="w-3.5 h-3.5 text-red-500 group-hover:hidden" />
                                <Unlock className="w-3.5 h-3.5 text-emerald-600 hidden group-hover:block" />
                              </div>
                              <div className="text-[10px] font-medium text-red-700 group-hover:text-emerald-700 flex items-center justify-between mt-0.5">
                                <span>{isLoading ? 'Liberando...' : 'Indisponível'}</span>
                                <span className="text-[9px] underline opacity-0 group-hover:opacity-100">Liberar</span>
                              </div>
                            </button>
                          );
                        }

                        // CASO 3: Horário Livre para Agendamento
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleToggleSlotBlock(day.date, slot.time)}
                            title="Clique para BLOQUEAR / INDISPONIBILIZAR este horário"
                            className="w-full p-2 rounded-xl bg-white hover:bg-red-50 border border-emerald-200 hover:border-red-300 text-left transition-all group cursor-pointer shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#1F4D36] group-hover:text-red-700">
                                {slot.time}
                              </span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:hidden" />
                              <Ban className="w-3.5 h-3.5 text-red-500 hidden group-hover:block" />
                            </div>
                            <div className="text-[10px] font-medium text-emerald-800 group-hover:text-red-700 flex items-center justify-between mt-0.5">
                              <span>{isLoading ? 'Bloqueando...' : 'Livre'}</span>
                              <span className="text-[9px] underline opacity-0 group-hover:opacity-100">Bloquear</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= ABA 2: LISTA TRADICIONAL DE SESSÕES ================= */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E8E5DF] shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-[#222924]">Lista de Consultas</h2>
              <p className="text-xs text-[#6B726B] mt-0.5">Gerencie os status e histórico de todas as sessões agendadas.</p>
            </div>
            <div className="bg-[#FBF9F5] p-1 rounded-xl border border-[#E8E5DF] flex flex-wrap text-xs font-semibold text-[#6B726B] gap-1">
              <button
                type="button"
                onClick={() => setFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'active' ? 'bg-[#1F4D36] text-white shadow-xs' : 'hover:text-[#222924]'
                }`}
              >
                Ativas ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('today')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'today' ? 'bg-[#1F4D36] text-white shadow-xs' : 'hover:text-[#222924]'
                }`}
              >
                Hoje ({todayCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'upcoming' ? 'bg-[#1F4D36] text-white shadow-xs' : 'hover:text-[#222924]'
                }`}
              >
                Próximas ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('cancelled')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'cancelled' ? 'bg-red-600 text-white shadow-xs' : 'hover:text-red-600'
                }`}
              >
                Canceladas ({cancelledCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'all' ? 'bg-gray-800 text-white shadow-xs' : 'hover:text-[#222924]'
                }`}
              >
                Todas ({appointmentsList.length})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DF] text-[#6B726B]">
                <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#1F4D36]" />
                <p className="text-sm font-semibold text-[#222924]">Nenhuma sessão encontrada para este filtro.</p>
                <p className="text-xs text-[#6B726B] mt-1">Envie o link de agendamento para os pacientes ou agende manualmente.</p>
              </div>
            ) : (
              filteredAppointments.map((app) => {
                const dateObj = new Date(app.scheduledAt);
                const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const rawDateStr = dateObj.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
                const isCancelled = app.status === 'cancelled';

                return (
                  <div
                    key={app.id}
                    className={`bg-white p-4 sm:p-5 rounded-2xl border border-[#E8E5DF] shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCancelled ? 'opacity-75 hover:opacity-100 bg-[#FAF9F6]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`px-3 py-2 rounded-xl font-bold text-center shrink-0 ${
                          isCancelled
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-[#EBF3ED] text-[#1F4D36]'
                        }`}
                      >
                        <div className="text-xs">{dateFormatted.split(',')[0]}</div>
                        <div className="text-sm">{timeFormatted}</div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-bold text-base ${
                              isCancelled ? 'text-gray-500 line-through' : 'text-[#222924]'
                            }`}
                          >
                            {app.patient.name}
                          </h3>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isCancelled
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : app.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : app.status === 'completed'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isCancelled
                              ? 'Cancelado'
                              : app.status === 'confirmed'
                              ? 'Confirmado'
                              : app.status === 'completed'
                              ? 'Realizado'
                              : 'Agendado'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#6B726B]">
                          <span className="flex items-center gap-1">
                            {app.modality === 'online' ? (
                              <>
                                <Video className="w-3.5 h-3.5 text-[#1F4D36]" /> Online
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-[#D97736]" /> Presencial
                              </>
                            )}
                          </span>
                          <span>•</span>
                          <span>R$ {app.price.toFixed(2)}</span>
                          <span>•</span>
                          <span>{dateFormatted}</span>
                        </div>

                        {app.notes && (
                          <p
                            className={`text-xs px-2.5 py-1 rounded-lg border inline-block ${
                              isCancelled
                                ? 'bg-red-50/70 border-red-200 text-red-800'
                                : 'bg-[#FBF9F5] border-[#E8E5DF] text-[#6B726B]'
                            }`}
                          >
                            {app.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      {isCancelled ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReactivateAppointment(app.id)}
                            disabled={isProcessingAction}
                            className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                            Reativar Sessão
                          </button>
                          <Link
                            href={`/pacientes/${app.patientId}/prontuario?appointmentId=${app.id}`}
                            className="px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] text-xs font-semibold hover:bg-gray-50 flex items-center gap-1 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                            Prontuário
                          </Link>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setRescheduleData({
                                id: app.id,
                                patientName: app.patient.name,
                                date: rawDateStr,
                                time: timeFormatted,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] hover:bg-white text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                            Remarcar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCancelData({
                                id: app.id,
                                patientName: app.patient.name,
                                date: rawDateStr,
                                time: timeFormatted,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Cancelar
                          </button>

                          <Link
                            href={`/pacientes/${app.patientId}/prontuario?appointmentId=${app.id}`}
                            className="px-3 py-1.5 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] flex items-center gap-1 transition-all shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Prontuário
                          </Link>

                          {app.status === 'scheduled' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(app.id, 'confirmed')}
                              className="px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirmar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= ABA 3: CONFIGURAR HORÁRIOS DA SEMANA & DIAS BLOQUEADOS ================= */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Coluna 1: Dias da Semana e Horários Disponíveis */}
          <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#222924] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#1F4D36]" />
                Dias e Horários Disponíveis na Semana
              </h2>
              <p className="text-xs text-[#6B726B] mt-0.5">
                Defina os dias da semana em que você atende e os horários padrão de cada dia.
              </p>
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const rule = editableRules[d] || { enabled: false, hours: [] };
                return (
                  <div key={d} className="p-3.5 rounded-2xl border border-[#E8E5DF] bg-[#FBF9F5] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-bold text-[#222924] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => {
                            setEditableRules({
                              ...editableRules,
                              [d]: { ...rule, enabled: e.target.checked },
                            });
                          }}
                          className="w-4 h-4 rounded text-[#1F4D36] focus:ring-[#1F4D36]"
                        />
                        <span>{DAY_NAMES[d]}</span>
                      </label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.enabled ? 'bg-[#EBF3ED] text-[#1F4D36]' : 'bg-gray-200 text-gray-500'}`}>
                        {rule.enabled ? `${rule.hours.length} horários ativos` : 'Inativo'}
                      </span>
                    </div>

                    {rule.enabled && (
                      <div className="pt-1">
                        <label className="block text-[11px] font-medium text-[#6B726B] mb-1">
                          Horários disponíveis (digite livremente separados por vírgula, ex: 08:00, 19:00, 20:00, 21:00):
                        </label>
                        <input
                          type="text"
                          value={rule.hours.join(', ')}
                          onChange={(e) => {
                            const newHours = e.target.value.split(',').map((h) => h.trim()).filter(Boolean);
                            setEditableRules({
                              ...editableRules,
                              [d]: { ...rule, hours: newHours },
                            });
                          }}
                          placeholder="08:00, 09:00, 14:00, 18:00, 19:00, 20:00, 21:00"
                          className="w-full px-3 py-1.5 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-[#1F4D36]"
                        />
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {[
                            '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
                            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
                            '19:00', '20:00', '21:00', '22:00'
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                if (!rule.hours.includes(preset)) {
                                  const updated = [...rule.hours, preset].sort();
                                  setEditableRules({
                                    ...editableRules,
                                    [d]: { ...rule, hours: updated },
                                  });
                                }
                              }}
                              className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
                                rule.hours.includes(preset)
                                  ? 'bg-[#1F4D36] text-white border-[#1F4D36] font-semibold'
                                  : 'bg-white border-[#E8E5DF] text-[#6B726B] hover:bg-[#EBF3ED] hover:text-[#1F4D36]'
                              }`}
                            >
                              {rule.hours.includes(preset) ? '✓ ' : '+ '}{preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={isSavingRules}
              onClick={handleSaveWeeklyRules}
              className="w-full py-3 px-4 rounded-xl bg-[#1F4D36] hover:bg-[#183C2A] text-white font-bold text-xs shadow-sm transition-all"
            >
              {isSavingRules ? 'Salvando horários...' : 'Salvar Grade Semanal Padrão'}
            </button>
          </div>

          {/* Coluna 2: Bloquear Datas Inteiras (Feriados / Folgas) */}
          <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#222924] flex items-center gap-2">
                <Ban className="w-4 h-4 text-red-500" />
                Bloqueio de Dias (Feriados & Folgas)
              </h2>
              <p className="text-xs text-[#6B726B] mt-0.5">
                Nenhum horário será exibido como disponível no link do paciente nesta data.
              </p>
            </div>

            {/* Formulário de Adicionar Bloqueio de Dia */}
            <form onSubmit={handleBlockHoliday} className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E8E5DF] space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#222924] mb-1">
                  Data a bloquear:
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-[#1F4D36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#222924] mb-1">
                  Motivo (ex: Feriado, Recesso, Congresso):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Feriado Municipal / Folga"
                  value={holidayReason}
                  onChange={(e) => setHolidayReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-xs text-[#222924] focus:outline-none focus:ring-1 focus:ring-[#1F4D36]"
                />
              </div>

              <button
                type="submit"
                disabled={isBlockingHoliday || !holidayDate}
                className="w-full py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                {isBlockingHoliday ? 'Bloqueando dia...' : 'Bloquear Dia Inteiro'}
              </button>
            </form>

            {/* Lista dos Dias Bloqueados */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#222924]">Próximos Dias Bloqueados:</h3>
              {blockedDates.length === 0 ? (
                <p className="text-xs text-[#6B726B] italic">Nenhum feriado ou dia bloqueado cadastrado.</p>
              ) : (
                <div className="divide-y divide-[#E8E5DF] border border-[#E8E5DF] rounded-2xl overflow-hidden bg-white">
                  {blockedDates.map((b) => (
                    <div key={b.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#FBF9F5]">
                      <div>
                        <div className="font-bold text-[#222924]">
                          {b.date.split('-').reverse().join('/')}
                        </div>
                        <div className="text-[11px] text-[#6B726B]">{b.reason || 'Dia indisponível'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnblockHoliday(b.date)}
                        className="text-red-600 hover:text-red-800 text-[11px] font-semibold"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ENVIAR LINK DE RESERVA NO WHATSAPP ================= */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E5DF] p-6 max-w-lg w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DF]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#222924]">Enviar Link de Reserva Online</h2>
                  <p className="text-[11px] text-[#6B726B]">O paciente escolhe o dia e horário nos próximos 30 dias</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#222924] mb-1.5">
                  Selecione o Paciente Cadastrado:
                </label>
                <select
                  value={selectedPatientForShare}
                  onChange={(e) => setSelectedPatientForShare(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/20 font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPatient && (
                <>
                  {/* Link Gerado */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6B726B] mb-1">
                      Link Exclusivo do Paciente (Válido por 30 dias):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getBookingLink(selectedPatient.id)}
                        className="flex-1 px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-xs text-[#222924] font-mono select-all"
                      />
                      <button
                        type="button"
                        onClick={() => copyPatientBookingLink(selectedPatient.id)}
                        className="px-3 py-2 rounded-xl border border-[#E8E5DF] hover:bg-gray-50 text-xs font-semibold text-[#222924] flex items-center gap-1 shrink-0"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        {copiedLink ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  {/* Prévia da Mensagem */}
                  <div className="p-3.5 rounded-2xl bg-[#EBF3ED]/40 border border-[#E8E5DF] text-xs text-[#222924] space-y-1">
                    <span className="font-bold text-[#1F4D36] block">Mensagem pronta para WhatsApp:</span>
                    <p className="text-[11px] text-[#6B726B] whitespace-pre-line leading-relaxed">
                      Olá {selectedPatient.name.split(' ')[0]}! Tudo bem? Segue o seu link exclusivo para escolher e reservar o melhor dia e horário para sua próxima sessão com {tenant.name}: {getBookingLink(selectedPatient.id)}
                    </p>
                  </div>

                  {/* Botão de Enviar no WhatsApp */}
                  <a
                    href={getWhatsappBookingInvitationUrl(selectedPatient)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold text-sm transition-all shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 fill-black" />
                    <span>Abrir WhatsApp com Mensagem Pronta</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: NOVA SESSÃO MANUAL ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E5DF] p-6 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DF]">
              <h2 className="text-base font-bold text-[#222924]">Agendar Sessão Manual</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                try {
                  await createAppointmentAction(formData);
                  setShowModal(false);
                } catch (err: any) {
                  alert(err.message || 'Erro ao agendar sessão.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#222924] mb-1">Paciente:</label>
                <select
                  name="patientId"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924] font-medium"
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Data:</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={todayStr}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Horário:</label>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="14:00"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Modalidade:</label>
                  <select
                    name="modality"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924]"
                  >
                    <option value="online">Online (Google Meet)</option>
                    <option value="in_person">Presencial</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Valor (R$):</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    defaultValue={tenant.consultationPrice}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">Observações:</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Ex: Primeira consulta, alinhamento de metas..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#E8E5DF] text-[#6B726B] font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white font-semibold hover:bg-[#183C2A]"
                >
                  {isSubmitting ? 'Salvando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Remarcar Sessão */}
      {rescheduleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-[#222924] text-base flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#1F4D36]" />
                Remarcar Sessão
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleData(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF]">
                <span className="text-[#6B726B]">Paciente: </span>
                <strong className="text-[#222924] text-sm font-bold block">{rescheduleData.patientName}</strong>
                <span className="text-[11px] text-[#6B726B]">
                  Horário atual: {rescheduleData.date} às {rescheduleData.time}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Nova Data:</label>
                  <input
                    type="date"
                    name="newDate"
                    required
                    defaultValue={rescheduleData.date}
                    min={todayStr}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#222924] mb-1">Novo Horário:</label>
                  <input
                    type="time"
                    name="newTime"
                    required
                    defaultValue={rescheduleData.time}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-white text-[#222924]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-[#6B726B]">
                Ao remarcar, a data será atualizada na agenda e um novo lembrete será programado.
              </p>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setRescheduleData(null)}
                  className="px-3.5 py-2 rounded-xl border border-[#E8E5DF] text-[#6B726B] font-semibold hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded-xl bg-[#1F4D36] text-white font-semibold hover:bg-[#183C2A] disabled:opacity-50"
                >
                  {isProcessingAction ? 'Remarcando...' : 'Confirmar Nova Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cancelar Sessão */}
      {cancelData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-[#E8E5DF] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E8E5DF] pb-3">
              <h3 className="font-bold text-red-600 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Cancelar Sessão
              </h3>
              <button
                type="button"
                onClick={() => setCancelData(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-900">
                <span className="text-red-700">Deseja realmente cancelar a sessão de:</span>
                <strong className="block text-sm font-bold text-red-950 mt-0.5">{cancelData.patientName}</strong>
                <span className="text-[11px] text-red-700">
                  Agendada para {cancelData.date} às {cancelData.time}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#222924] mb-1">
                  Motivo do Cancelamento (Opcional):
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Paciente solicitou reagendamento, imprevisto de saúde..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E8E5DF] bg-[#FBF9F5] text-[#222924] focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8E5DF]">
                <button
                  type="button"
                  onClick={() => setCancelData(null)}
                  className="px-3.5 py-2 rounded-xl border border-[#E8E5DF] text-[#6B726B] font-semibold hover:bg-gray-50"
                >
                  Não Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {isProcessingAction ? 'Cancelando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
