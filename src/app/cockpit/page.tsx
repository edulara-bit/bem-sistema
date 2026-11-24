import Link from 'next/link';
import { prisma, getTenantDb } from '@/lib/prisma';
import { getCurrentTenant } from '@/lib/current-tenant';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Clock, 
  Video, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  MessageCircle
} from 'lucide-react';

export const metadata = {
  title: 'Cockpit do Terapeuta — BEM',
  description: 'Gestão de atendimentos do dia, finanças e prontuários do terapeuta.',
};

export default async function CockpitPage() {
  // Busca tenant ativo (Multi-Tenant)
  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Banco inicializando...</h2>
        <p className="text-sm text-gray-500">Execute o seed para carregar os dados iniciais.</p>
      </div>
    );
  }

  const db = getTenantDb(tenant.id);
  const appointments = (await db.appointments.findMany()) as any[];
  const finance = await db.finances.findSummary();
  const patients = await db.patients.findMany();
  const newLeads = (await db.leads.findMany({ where: { stage: 'new_lead' } })) as any[];

  // Filtrar sessões de hoje
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => {
    const aDate = new Date(a.scheduledAt).toISOString().split('T')[0];
    return aDate === todayStr;
  });

  return (
    <div className="space-y-6">
      {/* Header com Boas-Vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E5DF] shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#EBF3ED] text-[#1F4D36] text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Cockpit Diário do Terapeuta
          </div>
          <h1 className="text-2xl font-bold text-[#222924] tracking-tight">
            Olá, {tenant.name} 👋
          </h1>
          <p className="text-sm text-[#6B726B]">
            Você tem <strong className="text-[#1F4D36]">{todayAppointments.length} atendimentos</strong> programados para hoje.
            {newLeads.length > 0 && (
              <Link href="/captacao" className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-[#D97736] bg-[#FFF4ED] px-2 py-0.5 rounded-full hover:underline">
                • {newLeads.length} novo contato no funil de captação
              </Link>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ia-copiloto"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EBF3ED] text-[#1F4D36] text-sm font-semibold hover:bg-[#dceade] transition-all"
          >
            <Sparkles className="w-4 h-4 text-[#1F4D36]" />
            Gerar Ideia com IA
          </Link>
          <Link
            href="/agenda"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F4D36] text-white text-sm font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            Ver Agenda Completa
          </Link>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">Atendimentos Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF3ED] flex items-center justify-center text-[#1F4D36]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#222924]">{todayAppointments.length}</div>
          <p className="text-[11px] text-[#6B726B] mt-1">Horários de 14h às 17h</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">Recebido no Mês</span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF3ED] flex items-center justify-center text-[#1F4D36]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1F4D36]">
            R$ {finance.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-[#6B726B] mt-1">Líquido confirmado</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">A Receber / Pendente</span>
            <div className="w-8 h-8 rounded-lg bg-[#FFF4ED] flex items-center justify-center text-[#D97736]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#D97736]">
            R$ {finance.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <Link href="/financeiro" className="text-[11px] text-[#D97736] font-semibold mt-1 inline-flex items-center gap-1 hover:underline">
            Cobrar via Pix <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DF] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#6B726B]">Pacientes Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-[#EBF3ED] flex items-center justify-center text-[#1F4D36]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#222924]">{patients.length}</div>
          <p className="text-[11px] text-[#1F4D36] font-medium mt-1">100% sob sigilo LGPD</p>
        </div>
      </div>

      {/* Sessões de Hoje */}
      <div className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#E8E5DF] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#222924]">Sessões Programadas para Hoje</h2>
            <p className="text-xs text-[#6B726B]">Acesse prontuários com IA ou inicie a chamada online</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FBF9F5] border border-[#E8E5DF] text-[#6B726B]">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="divide-y divide-[#E8E5DF]">
          {todayAppointments.length === 0 ? (
            <div className="p-8 text-center text-[#6B726B]">
              <p className="text-sm">Nenhum atendimento marcado para hoje.</p>
              <p className="text-xs text-[#6B726B] mt-1">Aproveite para produzir conteúdos ou organizar finanças.</p>
            </div>
          ) : (
            todayAppointments.map((app) => {
              const appTime = new Date(app.scheduledAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={app.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FBF9F5] transition-all">
                  <div className="flex items-start gap-4">
                    <div className="px-3 py-2 rounded-xl bg-[#EBF3ED] text-[#1F4D36] font-bold text-center shrink-0">
                      <div className="text-sm">{appTime}</div>
                      <div className="text-[10px] uppercase font-semibold text-[#1F4D36]/70">50 min</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#222924] text-base">{app.patient.name}</h3>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            app.status === 'confirmed'
                              ? 'bg-[#EBF3ED] text-[#1F4D36]'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {app.status === 'confirmed' ? 'Confirmado' : 'Aguardando'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#6B726B]">
                        <span className="flex items-center gap-1">
                          {app.modality === 'online' ? (
                            <>
                              <Video className="w-3.5 h-3.5 text-[#1F4D36]" /> Online (Google Meet)
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-[#D97736]" /> Presencial
                            </>
                          )}
                        </span>
                        <span>•</span>
                        <span>R$ {app.price.toFixed(2)}</span>
                      </div>
                      {app.notes && (
                        <p className="text-xs text-[#6B726B] mt-1.5 bg-[#FBF9F5] px-2.5 py-1 rounded-lg border border-[#E8E5DF]/60 inline-block">
                          Nota: {app.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {app.meetingUrl && (
                      <a
                        href={app.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-xl bg-white border border-[#E8E5DF] text-[#222924] text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 transition-all"
                      >
                        <Video className="w-3.5 h-3.5 text-[#1F4D36]" />
                        Entrar na Sala
                      </a>
                    )}
                    <Link
                      href={`/pacientes/${app.patientId}/prontuario?appointmentId=${app.id}`}
                      className="px-3.5 py-2 rounded-xl bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Prontuário com IA
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
