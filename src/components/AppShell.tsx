'use client';

import { usePathname } from 'next/navigation';
import { TopNavbar, Sidebar, MobileBottomNav } from '@/components/Navigation';

interface AppShellProps {
  children: React.ReactNode;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  } | null;
  allTenants?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
  }[];
}

export function AppShell({ children, tenant, allTenants = [] }: AppShellProps) {
  const pathname = usePathname();

  // Rotas públicas que não devem ter barra interna de terapeuta
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#222924]">
      {/* Barra Superior com Seletor Multi-Tenant */}
      <TopNavbar currentSlug={tenant?.slug || 'edulara'} allTenants={allTenants} />

      {/* Corpo com Sidebar à Esquerda e Conteúdo à Direita */}
      <div className="flex-1 flex flex-row items-start w-full">
        <Sidebar tenantName={tenant?.name} />
        <main className="flex-1 min-w-0 p-4 lg:p-8 w-full max-w-6xl mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Navegação Inferior para Mobile (PWA) */}
      <MobileBottomNav />
    </div>
  );
}
