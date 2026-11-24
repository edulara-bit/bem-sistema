import type { Metadata } from 'next';
import { LandingPageView } from '@/components/LandingPageView';

export const metadata: Metadata = {
  title: 'Tratamento da Ansiedade e do Medo com a Medicina da Bioenergética – Conheça esta técnica inovadora que já ajudou milhares de pessoas em todo o Brasil',
  description: 'Recupere sua energia, equilibre sua carreira com sua vida pessoal e transforme sua rotina com clareza e propósito! Atendimento presencial e personalizado em Piracicaba.',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  verification: {
    other: {
      'facebook-domain-verification': ['nec1h8f83bwlof0sbh55e2g27vfthk'],
    },
  },
  openGraph: {
    title: 'Tratamento da Ansiedade e do Medo com a Medicina da Bioenergética',
    description: 'Descubra como o estresse e a pressão estão afetando sua energia, desempenho e qualidade de vida! Atendimento presencial em Piracicaba.',
    url: 'https://bem.edulara.com.br/bioenergetica',
    siteName: 'B.E.M.® Medicina da Bioenergética',
    locale: 'pt_BR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://bem.edulara.com.br/bioenergetica',
  },
};

export default function BioenergeticaPage() {
  return <LandingPageView />;
}
