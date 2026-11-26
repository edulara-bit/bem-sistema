'use client';

import { usePathname } from 'next/navigation';
import { Ban, LogOut } from 'lucide-react';
import { TopNavbar, Sidebar, MobileBottomNav } from '@/components/Navigation';
import { logoutAction } from '@/actions/auth-actions';

interface AppShellProps {
  children: React.ReactNode;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive?: boolean;
    aiAgentsEnabled?: boolean;
    logoUrl?: string | null;
  } | null;
  isSuperAdmin?: boolean;
  allTenants?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive?: boolean;
    logoUrl?: string | null;
  }[];
}

export function AppShell({
  children,
  tenant,
  isSuperAdmin = false,
  allTenants = [],
}: AppShellProps) {
  const pathname = usePathname();

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/lp' ||
    pathname === '/bioenergetica' ||
    pathname?.startsWith('/lp/') ||
    pathname?.startsWith('/bioenergetica/') ||
    pathname?.startsWith('/tristeza-e-depressao') ||
    pathname === '/agendar' ||
    pathname?.startsWith('/agendar/') ||
    pathname === '/reservar' ||
    pathname?.startsWith('/reservar/') ||
    pathname === '/cadastro' ||
    pathname === '/login';

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Se o consultório foi inativado pelo Admin e o usuário não é Super Admin, bloqueia o painel
  if (tenant && tenant.isActive === false && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6 text-[#222924]">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <Ban className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[#222924]">Consultório Inativo</h1>
          <p className="text-xs text-[#6B726B] leading-relaxed">
            O espaço <strong>{tenant.name}</strong> encontra-se temporariamente inativo na Plataforma B.E.M. Entre em contato com a Administração para regularizar ou reativar seu acesso.
          </p>
          <button
            type="button"
            onClick={() => logoutAction()}
            className="w-full py-3 rounded-xl bg-[#1F4D36] text-white text-xs font-bold hover:bg-[#183C2A] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  const aiEnabled = Boolean(tenant?.aiAgentsEnabled || isSuperAdmin);

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#222924]">
      <TopNavbar
        currentSlug={tenant?.slug || 'edulara'}
        tenantName={tenant?.name}
        logoUrl={tenant?.logoUrl || null}
        isSuperAdmin={isSuperAdmin}
        allTenants={allTenants}
      />

      <div className="flex-1 flex flex-row items-start w-full">
        <Sidebar
          tenantName={tenant?.name}
          isSuperAdmin={isSuperAdmin}
          aiAgentsEnabled={aiEnabled}
        />
        <main className="flex-1 min-w-0 p-4 lg:p-8 w-full max-w-6xl mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      <MobileBottomNav isSuperAdmin={isSuperAdmin} aiAgentsEnabled={aiEnabled} />
    </div>
  );
}
