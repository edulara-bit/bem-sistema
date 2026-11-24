import type { Metadata } from 'next';
import { LandingPageView } from '@/components/LandingPageView';

export const metadata: Metadata = {
  title: 'Tristeza de Fim de Ano — Sessão de Alívio Online | B.E.M.®',
  description: 'Fim de ano pesado? Transforme a tristeza, a melancolia e o vazio em esperança, leveza e um novo recomeço com a Medicina da Bioenergética. Garanta sua sessão.',
  openGraph: {
    title: 'Tristeza de Fim de Ano — Sessão de Alívio Online',
    description: 'Transforme a tristeza, melancolia e o vazio em esperança, leveza e um novo recomeço com o B.E.M.®',
    url: 'https://bem.edulara.com.br/tristeza-e-depressao-de-fim-de-ano-sessao-de-alivio/',
    siteName: 'B.E.M.® Medicina da Bioenergética',
    locale: 'pt_BR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://bem.edulara.com.br/tristeza-e-depressao-de-fim-de-ano-sessao-de-alivio/',
  },
};

export default function TristezaDepressaoFimDeAnoPage() {
  return <LandingPageView campaign="fim-de-ano" />;
}
