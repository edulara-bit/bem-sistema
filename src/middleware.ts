import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.ENCRYPTION_KEY || 'bem_super_secret_jwt_key_fallback_at_least_32_characters_long_12345';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING.padEnd(32, '0').slice(0, 32));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Lista de rotas públicas livres que NUNCA exigem login
  const isPublic =
    pathname === '/' ||
    pathname === '/lp' ||
    pathname === '/bioenergetica' ||
    pathname.startsWith('/lp/') ||
    pathname.startsWith('/bioenergetica/') ||
    pathname.startsWith('/tristeza-e-depressao') ||
    pathname === '/agendar' ||
    pathname.startsWith('/agendar') ||
    pathname === '/reservar' ||
    pathname.startsWith('/reservar') ||
    pathname === '/cadastro' ||
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') || // arquivos estáticos (.png, .css, etc.)
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico';

  if (isPublic) {
    return NextResponse.next();
  }

  // 2. Para rotas privadas (/cockpit, /agenda, /pacientes, /financeiro, /metas, /ia-copiloto, /configuracoes, /captacao):
  const sessionToken = request.cookies.get('bem_session')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Valida o token JWT assinado
    const { payload } = await jwtVerify(sessionToken, JWT_SECRET);
    
    // Injeta cabeçalho com tenantId do usuário autenticado para as rotas
    const response = NextResponse.next();
    if (payload?.tenantId) {
      response.headers.set('x-tenant-id', payload.tenantId as string);
    }
    return response;
  } catch {
    // Token inválido ou expirado
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('bem_session');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
