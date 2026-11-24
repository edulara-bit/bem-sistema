import protocolsData from './protocols-data.json';

export interface ProtocolItem {
  id: number;
  title: string;
  parentId: number;
}

export interface ProtocolCategory {
  id: number;
  name: string;
  items?: { id: number; title: string }[];
  subcategories?: {
    id: number;
    name: string;
    items: { id: number; title: string }[];
  }[];
}

export const PROTOCOL_CATEGORIES: ProtocolCategory[] = (protocolsData as any).categories || [];

export const PROTOCOL_FLAT_ITEMS: ProtocolItem[] = (protocolsData as any).protocols || [];

/**
 * Retorna as categorias de nível superior disponíveis
 */
export function getRootCategories(): string[] {
  return ['Medos', 'Relacionamento', 'Timeline'];
}

/**
 * Retorna situações/subcategorias com base na categoria selecionada
 */
export function getSituationsByCategory(category: string): { title: string; group?: string }[] {
  if (category === 'Medos') {
    return [
      { title: 'Abandono' },
      { title: 'Rejeição' },
      { title: 'Crítica' },
      { title: 'Saúde' },
      { title: 'Financeiro' },
      { title: 'Fracasso' },
      { title: 'Sucesso' },
      { title: 'Perda Liberdade' },
      { title: 'Envelhecer' },
      { title: 'Responsabilidade' },
      { title: 'Amar' },
      { title: 'Se entregar' },
      { title: 'Morrer' },
    ];
  }

  if (category === 'Relacionamento') {
    return [
      { title: 'Família' },
      { title: 'Amoroso' },
      { title: 'Trabalho' },
      { title: 'Consigo mesmo' },
      { title: 'Dinheiro' },
      { title: 'Tempo' },
      { title: 'Deus' },
    ];
  }

  if (category === 'Timeline') {
    return [
      { title: 'Passado: Pré-concepção (Pai / Mãe)' },
      { title: 'Passado: Gestação (Mês / Parto)' },
      { title: 'Passado: Data / Evento Marcante' },
      { title: 'Passado: Experiência Traumática / Pessoas' },
      { title: 'Presente: Físico (Dores / Sintomas / Diagnóstico)' },
      { title: 'Presente: Físico (Body in Sync / N.S. Balance / Unwind)' },
      { title: 'Presente: Emocional' },
      { title: 'Presente: Mental (Pensamento Recorrente / Condenação)' },
      { title: 'Presente: Mental (Projeção / Negação / Dúvida / Desejo)' },
      { title: 'Futuro: Projeção de Cenários / Metas' },
    ];
  }

  return [];
}
