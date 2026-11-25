import { prisma } from './prisma';

export interface TimeSlot {
  time: string;
  available: boolean;
  reason?: 'booked' | 'blocked' | 'past' | 'holiday';
  appointment?: {
    id: string;
    patientName: string;
    modality: string;
    status: string;
  };
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ...
  dayName: string;
  formattedDate: string;
  isHoliday: boolean;
  holidayReason?: string | null;
  slots: TimeSlot[];
  totalAvailable: number;
}

export const DEFAULT_WEEK_HOURS: Record<number, string[]> = {
  1: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Segunda
  2: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Terça
  3: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Quarta
  4: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Quinta
  5: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'], // Sexta
  6: [], // Sábado
  0: [], // Domingo
};

export const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Converte qualquer Date para YYYY-MM-DD e HH:mm estritamente no fuso horário de São Paulo (America/Sao_Paulo).
 */
export function formatAppointmentDateTime(dateInput: Date | string) {
  const d = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const p: Record<string, string> = {};
  parts.forEach((pt) => {
    p[pt.type] = pt.value;
  });

  const dateStr = `${p.year}-${p.month}-${p.day}`; // YYYY-MM-DD
  const timeStr = `${p.hour}:${p.minute}`; // HH:mm
  const displayDate = `${p.day}/${p.month}/${p.year}`;

  return { dateStr, timeStr, displayDate };
}

/**
 * Obtém os horários configurados para os dias da semana de um terapeuta.
 */
export async function getTenantWeeklyRules(tenantId: string) {
  const rules = await prisma.availabilityRule.findMany({
    where: { tenantId },
  });

  const config: Record<number, { enabled: boolean; hours: string[] }> = {};
  for (let d = 0; d <= 6; d++) {
    const rule = rules.find((r) => r.dayOfWeek === d);
    if (rule) {
      config[d] = {
        enabled: rule.enabled,
        hours: rule.hours ? rule.hours.split(',').map((h) => h.trim()).filter(Boolean) : [],
      };
    } else {
      const defaultHours = DEFAULT_WEEK_HOURS[d] || [];
      config[d] = {
        enabled: defaultHours.length > 0,
        hours: defaultHours,
      };
    }
  }

  return config;
}

/**
 * Retorna os dias e horários para agendamento online do paciente (Exatamente 30 dias / 1 mês).
 */
export async function getPatientBookingAvailability(tenantId: string): Promise<DaySchedule[]> {
  const weeklyRules = await getTenantWeeklyRules(tenantId);

  // Período: hoje até hoje + 30 dias
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Buscar datas bloqueadas (feriados / recesso)
  const blockedDates = await prisma.blockedDate.findMany({
    where: {
      tenantId,
      date: { gte: startStr, lte: endStr },
    },
  });
  const blockedDatesMap = new Map(blockedDates.map((b) => [b.date, b.reason || 'Data indisponível']));

  // Buscar horários específicos bloqueados
  const blockedSlots = await prisma.blockedSlot.findMany({
    where: {
      tenantId,
      date: { gte: startStr, lte: endStr },
    },
  });
  const blockedSlotsSet = new Set(blockedSlots.map((s) => `${s.date}_${s.time}`));

  // Buscar agendamentos existentes (não cancelados)
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: { gte: startDate, lte: new Date(endDate.getTime() + 86400000) },
      status: { notIn: ['cancelled'] },
    },
    include: { patient: true },
  });

  const bookedSlotsMap = new Map<string, any>();
  for (const app of appointments) {
    const { dateStr, timeStr } = formatAppointmentDateTime(app.scheduledAt);
    bookedSlotsMap.set(`${dateStr}_${timeStr}`, app);
  }

  const days: DaySchedule[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();
    const dayRule = weeklyRules[dayOfWeek] || { enabled: false, hours: [] };
    const isHoliday = blockedDatesMap.has(dateStr);
    const holidayReason = blockedDatesMap.get(dateStr) || null;

    const slots: TimeSlot[] = [];

    if (dayRule.enabled && !isHoliday) {
      for (const time of dayRule.hours) {
        const slotKey = `${dateStr}_${time}`;
        
        // Verifica se é no passado (se a data for hoje)
        const [hours, mins] = time.split(':').map(Number);
        const slotDateTime = new Date(current.getFullYear(), current.getMonth(), current.getDate(), hours, mins);
        const isPast = slotDateTime <= now;

        if (isPast) {
          slots.push({ time, available: false, reason: 'past' });
        } else if (bookedSlotsMap.has(slotKey)) {
          slots.push({ time, available: false, reason: 'booked' });
        } else if (blockedSlotsSet.has(slotKey)) {
          slots.push({ time, available: false, reason: 'blocked' });
        } else {
          slots.push({ time, available: true });
        }
      }
    }

    days.push({
      date: dateStr,
      dayOfWeek,
      dayName: DAY_NAMES_SHORT[dayOfWeek],
      formattedDate: `${current.getDate().toString().padStart(2, '0')}/${(current.getMonth() + 1).toString().padStart(2, '0')}`,
      isHoliday,
      holidayReason,
      slots,
      totalAvailable: slots.filter((s) => s.available).length,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Retorna os dados completos da semana para o painel admin (com agendamentos, livres e bloqueados).
 */
export async function getAdminWeeklySchedule(tenantId: string, weekStartDateStr: string) {
  const weeklyRules = await getTenantWeeklyRules(tenantId);

  // Início da semana determinístico no fuso horário de São Paulo (UTC-3)
  const weekStart = new Date(`${weekStartDateStr}T00:00:00-03:00`);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { dateStr: startStr } = formatAppointmentDateTime(weekStart);
  const { dateStr: endStr } = formatAppointmentDateTime(new Date(weekEnd.getTime() - 1000));

  // Buscar bloqueios de datas
  const blockedDates = await prisma.blockedDate.findMany({
    where: { tenantId, date: { gte: startStr, lte: endStr } },
  });
  const blockedDatesMap = new Map(blockedDates.map((b) => [b.date, b.reason || 'Dia Bloqueado']));

  // Buscar bloqueios de horários avulsos
  const blockedSlots = await prisma.blockedSlot.findMany({
    where: { tenantId, date: { gte: startStr, lte: endStr } },
  });
  const blockedSlotsMap = new Map(blockedSlots.map((s) => [`${s.date}_${s.time}`, s]));

  // Buscar agendamentos dentro da semana
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      scheduledAt: { gte: weekStart, lt: weekEnd },
      status: { notIn: ['cancelled'] },
    },
    include: { patient: true },
  });

  const bookedSlotsMap = new Map<string, any>();
  for (const app of appointments) {
    const { dateStr, timeStr } = formatAppointmentDateTime(app.scheduledAt);
    bookedSlotsMap.set(`${dateStr}_${timeStr}`, app);
  }

  // Descobrir todos os horários únicos usados na semana
  const allHoursSet = new Set<string>();
  for (let day = 0; day <= 6; day++) {
    const rule = weeklyRules[day];
    if (rule?.enabled) {
      rule.hours.forEach((h) => allHoursSet.add(h));
    }
  }
  const allHours = Array.from(allHoursSet).sort();

  const days: DaySchedule[] = [];

  for (let i = 0; i < 7; i++) {
    // Meio-dia para neutralizar qualquer desvio de borda de fuso
    const dayDate = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
    const { dateStr, displayDate } = formatAppointmentDateTime(dayDate);
    const dayOfWeek = dayDate.getDay();
    const dayRule = weeklyRules[dayOfWeek] || { enabled: false, hours: [] };
    const isHoliday = blockedDatesMap.has(dateStr);
    const holidayReason = blockedDatesMap.get(dateStr) || null;

    const slots: TimeSlot[] = [];

    // Se o dia estiver habilitado nas regras semanais
    if (dayRule.enabled) {
      for (const time of dayRule.hours) {
        const slotKey = `${dateStr}_${time}`;
        const app = bookedSlotsMap.get(slotKey);
        const isBlocked = blockedSlotsMap.has(slotKey) || isHoliday;

        if (app) {
          slots.push({
            time,
            available: false,
            reason: 'booked',
            appointment: {
              id: app.id,
              patientName: app.patient.name,
              modality: app.modality,
              status: app.status,
            },
          });
        } else if (isBlocked) {
          slots.push({
            time,
            available: false,
            reason: isHoliday ? 'holiday' : 'blocked',
          });
        } else {
          slots.push({
            time,
            available: true,
          });
        }
      }
    }

    days.push({
      date: dateStr,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      formattedDate: `${displayDate.slice(0, 5)}`,
      isHoliday,
      holidayReason,
      slots,
      totalAvailable: slots.filter((s) => s.available).length,
    });
  }

  return {
    weekStartStr: startStr,
    weekEndStr: endStr,
    allHours,
    days,
    weeklyRules,
  };
}
