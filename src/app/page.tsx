import { redirect } from 'next/navigation';
import { getAuthSession } from '@/actions/auth-actions';

/**
 * Rota Raiz (/) de bem.edulara.com.br:
 * Endereço principal do sistema para os consultórios.
 * - Se o terapeuta/consultório já estiver autenticado -> Redireciona diretamente para o /cockpit.
 * - Se não estiver autenticado -> Redireciona para a tela de /login.
 * 
 * As Landing Pages públicas de campanhas ficam em rotas específicas dedicadas:
 * - /bioenergetica ou /lp -> Landing Page principal de apresentação
 * - /tristeza-e-depressao-de-fim-de-ano-sessao-de-alivio -> Campanha com oferta Kiwify
 * - E quaisquer outras que forem criadas no futuro!
 */
export default async function RootPage() {
  const session = await getAuthSession();

  if (session) {
    redirect('/cockpit');
  } else {
    redirect('/login');
  }
}
