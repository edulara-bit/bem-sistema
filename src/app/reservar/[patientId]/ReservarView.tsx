'use client';

import { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  MapPin, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  ChevronRight, 
  ChevronLeft,
  CalendarCheck,
  ExternalLink,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import { bookPatientSlotAction } from '../actions';
import { DaySchedule } from '@/lib/schedule-utils';

interface ReservarViewProps {
  patient: {
    id: string;
    name: string;
    modalityPreference?: string;
    sessionTypePreference?: string;
  };
  therapist: {
    id: string;
    name: string;
    slug: string;
    headline?: string | null;
    whatsapp?: string | null;
    consultationPrice: number;
    address?: string | null;
  };
  availableDays: DaySchedule[];
}

export function ReservarView({ patient, therapist, availableDays }: ReservarViewProps) {
  // Encontra o primeiro dia com horários disponíveis para pré-selecionar
  const firstAvailableDay = availableDays.find((d) => d.totalAvailable > 0) || availableDays[0];

  const [selectedDate, setSelectedDate] = useState<string>(firstAvailableDay?.date || '');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [modality] = useState<'online' | 'in_person'>((patient.modalityPreference as any) || 'online');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const activeDay = availableDays.find((d) => d.date === selectedDate);
  const availableSlots = activeDay?.slots.filter((s) => s.available) || [];

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      alert('Por favor, selecione uma data e um horário disponível.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bookPatientSlotAction({
        patientId: patient.id,
        date: selectedDate,
        time: selectedTime,
        modality,
        notes,
      });
      setConfirmedBooking(res);
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGoogleCalendarUrl = (booking: any) => {
    if (!booking) return '';
    const start = new Date(booking.scheduledAt);
    const end = new Date(start.getTime() + 50 * 60000); // 50 min
    const startIso = start.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endIso = end.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(`Sessão B.E.M. com ${booking.therapistName}`);
    const details = encodeURIComponent(
      `Sessão Terapêutica (${booking.modality === 'online' ? 'Online' : 'Presencial'}).\nLink/Endereço: ${
        booking.meetingUrl || booking.address || 'A combinar'
      }`
    );
    const location = encodeURIComponent(booking.modality === 'online' ? (booking.meetingUrl || 'Google Meet') : (booking.address || 'Consultório'));
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  const getWhatsappConfirmationUrl = (booking: any) => {
    if (!booking || !therapist.whatsapp) return '';
    const phone = therapist.whatsapp.replace(/\D/g, '');
    const d = new Date(booking.scheduledAt);
    const dateFormatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const timeFormatted = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msg = `Olá ${therapist.name}! Acabei de reservar meu horário pelo link online para o dia ${dateFormatted} às ${timeFormatted} (${
      booking.modality === 'online' ? 'Online' : 'Presencial'
    }). Aguardo confirmação!`;
    return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Se agendamento confirmado, exibe tela de sucesso
  if (confirmedBooking) {
    const scheduledDate = new Date(confirmedBooking.scheduledAt);
    const dateFormatted = scheduledDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeFormatted = scheduledDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="min-h-screen bg-[#FBF9F5] py-12 px-4 sm:px-6 max-w-xl mx-auto flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-[#E8E5DF] shadow-xl text-center space-y-6 w-full animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-[#EBF3ED] text-[#1F4D36] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1F4D36] bg-[#EBF3ED] px-3 py-1 rounded-full">
              Reserva Confirmada
            </span>
            <h1 className="text-2xl font-bold text-[#222924] mt-2">Horário Reservado!</h1>
            <p className="text-sm text-[#6B726B] mt-1">
              Olá, <strong>{patient.name}</strong>. Sua sessão com <strong>{therapist.name}</strong> foi agendada no sistema com sucesso.
            </p>
          </div>

          {/* Card com Detalhes */}
          <div className="bg-[#FBF9F5] p-5 rounded-2xl border border-[#E8E5DF] text-left space-y-3">
            <div className="flex items-center gap-3 text-sm text-[#222924]">
              <CalendarIcon className="w-4 h-4 text-[#1F4D36] shrink-0" />
              <span className="capitalize font-semibold">{dateFormatted}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#222924]">
              <Clock className="w-4 h-4 text-[#1F4D36] shrink-0" />
              <span>Horário: <strong>{timeFormatted}</strong> (duração de 50 minutos)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#222924]">
              {confirmedBooking.modality === 'online' ? (
                <>
                  <Video className="w-4 h-4 text-[#1F4D36] shrink-0" />
                  <span>Modalidade: <strong>Atendimento Online (Google Meet)</strong></span>
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-[#D97736] shrink-0" />
                  <span>Modalidade: <strong>Presencial no Consultório</strong> {therapist.address && `(${therapist.address})`}</span>
                </>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3 pt-2">
            <a
              href={getGoogleCalendarUrl(confirmedBooking)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1F4D36] hover:bg-[#183C2A] text-white font-semibold text-sm transition-all shadow-sm"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Salvar no Google Agenda</span>
            </a>

            {therapist.whatsapp && (
              <a
                href={getWhatsappConfirmationUrl(confirmedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-sm transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4 fill-black" />
                <span>Avisar Terapeuta no WhatsApp</span>
              </a>
            )}
          </div>

          <p className="text-[11px] text-[#6B726B] pt-2">
            Caso precise remarcar, entre em contato diretamente com o terapeuta com antecedência.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-8 sm:py-12 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      {/* Top Header com Terapeuta e Paciente */}
      <div className="bg-white p-6 rounded-3xl border border-[#E8E5DF] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Agendamento de Sessão Online
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#222924] tracking-tight">
            Olá, {patient.name} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[#6B726B] mt-0.5">
            Selecione o melhor dia e horário para seu atendimento com <strong className="text-[#1F4D36]">{therapist.name}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center bg-[#FBF9F5] px-4 py-2 rounded-2xl border border-[#E8E5DF]">
          <Clock className="w-4 h-4 text-[#1F4D36]" />
          <span className="text-xs font-medium text-[#6B726B]">
            Disponibilidade: <strong>Próximos 30 dias</strong>
          </span>
        </div>
      </div>

      {/* Grid Principal: Seletor de Datas + Seletor de Horários */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Seletor de Dias (30 dias) */}
        <div className="md:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E5DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#222924] flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#1F4D36]" />
              Escolha o Dia
            </h2>
            <span className="text-xs text-[#6B726B]">Janela de 1 mês</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {availableDays.map((d) => {
              const isSelected = selectedDate === d.date;
              const hasSlots = d.totalAvailable > 0;

              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={!hasSlots}
                  onClick={() => {
                    setSelectedDate(d.date);
                    setSelectedTime('');
                  }}
                  className={`p-3 rounded-2xl text-center border transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'bg-[#1F4D36] text-white border-[#1F4D36] shadow-md scale-[1.02]'
                      : hasSlots
                      ? 'bg-white hover:bg-[#EBF3ED]/50 border-[#E8E5DF] text-[#222924] cursor-pointer'
                      : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-white/80' : 'text-[#6B726B]'}`}>
                    {d.dayName}
                  </span>
                  <span className="text-lg font-bold my-0.5">
                    {d.formattedDate}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : hasSlots
                        ? 'bg-[#EBF3ED] text-[#1F4D36]'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {d.isHoliday ? 'Feriado' : hasSlots ? `${d.totalAvailable} horários` : 'Esgotado'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Horários e Modalidade */}
        <div className="md:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-[#E8E5DF] shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#222924] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1F4D36]" />
                Horários Disponíveis
              </h2>
              <p className="text-xs text-[#6B726B] mt-0.5">
                Para {activeDay ? `${activeDay.dayName}, ${activeDay.formattedDate}` : 'o dia selecionado'}
              </p>
            </div>

            {availableSlots.length === 0 ? (
              <div className="p-8 text-center bg-[#FBF9F5] rounded-2xl border border-dashed border-[#E8E5DF] text-xs text-[#6B726B]">
                {activeDay?.isHoliday
                  ? `Dia bloqueado (${activeDay.holidayReason || 'Feriado/Recesso'}). Escolha outro dia.`
                  : 'Nenhum horário livre restante neste dia. Selecione outra data ao lado.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSlots.map((s) => {
                  const isTimeSelected = selectedTime === s.time;
                  return (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => setSelectedTime(s.time)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        isTimeSelected
                          ? 'bg-[#1F4D36] text-white border-[#1F4D36] shadow-sm'
                          : 'bg-white hover:bg-[#EBF3ED] border-[#E8E5DF] text-[#222924]'
                      }`}
                    >
                      {s.time}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Modalidade (Definida pelo Consultório) */}
            <div className="pt-2 p-3 rounded-2xl bg-[#FBF9F5] border border-[#E8E5DF] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#6B726B] block">Formato de Atendimento:</span>
                <span className="text-xs font-bold text-[#1F4D36] flex items-center gap-1.5 mt-0.5">
                  {modality === 'in_person' ? (
                    <>
                      <MapPin className="w-4 h-4 text-[#D97736]" />
                      Atendimento Presencial no Consultório
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 text-[#1F4D36]" />
                      Atendimento Online (Google Meet)
                    </>
                  )}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 bg-white px-2 py-1 rounded-lg border border-[#E8E5DF]">
                {modality === 'in_person' ? 'Duração: 60 min' : 'Duração: 50 min'}
              </span>
            </div>

            {/* Observações Opcionais */}
            <div>
              <label className="block text-xs font-medium text-[#6B726B] mb-1">
                Alguma observação para esta sessão? (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: foco no estresse do trabalho..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E5DF] bg-white text-[#222924] focus:outline-none focus:ring-2 focus:ring-[#1F4D36]/20"
              />
            </div>
          </div>

          {/* Botão de Confirmação */}
          <div className="pt-2 border-t border-[#E8E5DF]">
            <button
              type="button"
              disabled={!selectedDate || !selectedTime || isSubmitting}
              onClick={handleBooking}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                !selectedDate || !selectedTime || isSubmitting
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#1F4D36] hover:bg-[#183C2A] text-white hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <span>Confirmando reserva...</span>
              ) : selectedDate && selectedTime ? (
                <>
                  <span>Confirmar para {activeDay?.formattedDate} às {selectedTime}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <span>Selecione data e horário</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-[#6B726B] flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#1F4D36]" />
        <span>Reserva protegida sob sigilo profissional • BEM Plataforma</span>
      </div>
    </div>
  );
}
