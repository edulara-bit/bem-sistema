'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Sparkles, 
  LayoutDashboard, 
  Activity,
  PlusCircle,
  UserPlus,
  Settings,
  Target,
  LogOut,
  Heart
} from 'lucide-react';
import clsx from 'clsx';
import { TenantSwitcher } from './TenantSwitcher';
import { logoutAction } from '@/actions/auth-actions';

export const navItems = [
  { href: '/cockpit', label: 'Hoje', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/pacientes', label: 'Pacientes & Prontuário', icon: Users },
  { href: '/emocoes', label: 'Emoções & Bioenergética', icon: Heart },
  { href: '/captacao', label: 'Captação & Funil', icon: UserPlus },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/metas', label: 'Metas & Burnout', icon: Target },
  { href: '/ia-copiloto', label: 'Agentes B.E.M.', icon: Sparkles },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function TopNavbar({
  currentSlug = 'edulara',
  allTenants = [],
}: {
  currentSlug?: string;
  allTenants?: { id: string; name: string; slug: string; plan: string }[];
}) {
  const currentTenant = allTenants.find((t) => t.slug === currentSlug) || allTenants[0];

  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E8E5DF] px-4 lg:px-8 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/cockpit" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-[#1F4D36] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            B
          </div>
          <div>
            <h1 className="text-base font-bold text-[#1F4D36] tracking-tight leading-none flex items-center gap-1.5">
              BEM <span className="text-[10px] uppercase font-semibold bg-[#EBF3ED] text-[#1F4D36] px-1.5 py-0.5 rounded">Terapeuta</span>
            </h1>
            <p className="text-xs text-[#6B726B] font-medium truncate max-w-[160px] sm:max-w-xs">
              {currentTenant?.name || 'Espaço Terapêutico'}
            </p>
          </div>
        </Link>
      </div>

      {/* Switcher & Ações */}
      <div className="flex items-center gap-2.5">
        <TenantSwitcher currentSlug={currentSlug} allTenants={allTenants} />
        <Link
          href="/agenda"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F4D36] text-white text-xs font-semibold hover:bg-[#183C2A] transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Nova Sessão
        </Link>
        <button
          onClick={() => logoutAction()}
          title="Sair do consultório"
          className="p-1.5 rounded-lg border border-[#E8E5DF] text-[#6B726B] hover:text-red-600 hover:bg-red-50 transition-all text-xs"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export function Sidebar({ tenantName }: { tenantName?: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E8E5DF] shrink-0 sticky top-[57px] h-[calc(100vh-57px)] p-4 overflow-y-auto">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/cockpit' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#EBF3ED] text-[#1F4D36] font-semibold'
                  : 'text-[#6B726B] hover:bg-[#FBF9F5] hover:text-[#222924]'
              )}
            >
              <Icon className={clsx('w-5 h-5', isActive ? 'text-[#1F4D36]' : 'text-[#6B726B]')} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto pt-6 border-t border-[#E8E5DF] space-y-3">
        <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E8E5DF]/60">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[#1F4D36]" />
            <span className="text-xs font-semibold text-[#222924]">Status do Consultório</span>
          </div>
          <p className="text-[11px] text-[#6B726B]">
            {tenantName || 'Consultório Ativo'} • LGPD Ativa • Dados Criptografados
          </p>
        </div>

        <button
          onClick={() => logoutAction()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#6B726B] hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair do Consultório</span>
        </button>
      </div>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E5DF] px-2 py-1.5 flex justify-around items-center safe-area-bottom shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/cockpit' && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all',
              isActive
                ? 'text-[#1F4D36] font-bold'
                : 'text-[#6B726B] hover:text-[#222924]'
            )}
          >
            <div
              className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center mb-0.5 transition-all',
                isActive ? 'bg-[#EBF3ED] text-[#1F4D36]' : 'text-[#6B726B]'
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
