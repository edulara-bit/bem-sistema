import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { getCurrentTenant, getAllTenants } from '@/lib/current-tenant';
import { getCurrentUserContext } from '@/lib/admin-guard';

export const metadata: Metadata = {
  title: 'Tratamento da Ansiedade e do Medo com a Medicina da Bioenergética',
  description:
    'Conheça esta técnica inovadora que já ajudou milhares de pessoas em todo o Brasil. Sessões individuais e presenciais em Piracicaba.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BEM',
  },
};

export const viewport: Viewport = {
  themeColor: '#1F2A34',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tenant, userCtx] = await Promise.all([
    getCurrentTenant(),
    getCurrentUserContext(),
  ]);

  const isSuperAdmin = Boolean(userCtx?.isSuperAdmin);
  const allTenants = isSuperAdmin ? await getAllTenants() : [];

  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <AppShell
          tenant={
            tenant
              ? {
                  id: tenant.id,
                  name: tenant.name,
                  slug: tenant.slug,
                  plan: tenant.plan,
                  isActive: tenant.isActive,
                  aiAgentsEnabled: Boolean(tenant.aiAgentsEnabled || isSuperAdmin),
                  logoUrl: tenant.logoUrl || null,
                }
              : null
          }
          isSuperAdmin={isSuperAdmin}
          allTenants={allTenants}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
