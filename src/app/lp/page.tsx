import type { Metadata } from 'next';
import { LandingPageView } from '@/components/LandingPageView';

export const metadata: Metadata = {
  title: 'Tratamento da Ansiedade e do Medo com a Medicina da Bioenergética',
  description: 'Conheça esta técnica inovadora que já ajudou milhares de pessoas em todo o Brasil. Atendimento presencial em Piracicaba.',
};

export default function LpPage() {
  return <LandingPageView />;
}
