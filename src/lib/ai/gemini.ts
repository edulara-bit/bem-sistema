import { GoogleGenAI } from '@google/genai';

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Sanitiza o rascunho clínico antes de enviar para qualquer IA externa.
 * Remove dados identificáveis de acordo com a LGPD e o Código de Ética do CFP.
 */
export function sanitizeClinicalDraft(draft: string, patientName?: string): string {
  let text = draft;

  // Substitui nome do paciente se informado
  if (patientName) {
    const firstName = patientName.trim().split(/\s+/)[0];
    if (firstName.length > 2) {
      const nameRegex = new RegExp(`\\b${firstName}\\b`, 'gi');
      text = text.replace(nameRegex, '[PACIENTE]');
    }
  }

  // Remove CPFs: 000.000.000-00 ou 00000000000
  text = text.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF]');

  // Remove Telefones BR: (XX) 9XXXX-XXXX, etc.
  text = text.replace(/\b(\+?55\s?)?(\(?\d{2}\)?\s?)?(9?\d{4}[-.\s]?\d{4})\b/g, '[TELEFONE]');

  // Remove E-mails
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  return text;
}

export interface SoapRecord {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * Converte rascunho livre da sessão no formato padrão clínico SOAP.
 */
export async function generateSoapWithAI(
  rawNotes: string,
  patientName?: string
): Promise<SoapRecord> {
  const sanitized = sanitizeClinicalDraft(rawNotes, patientName);
  const ai = getGenAI();

  if (!ai) {
    return {
      subjective: `Relato subjetivo do paciente durante a sessão: "${sanitized.slice(0, 150)}..."`,
      objective: 'Paciente participou ativamente do diálogo clínico, com humor e linguagem preservados.',
      assessment: 'Processamento das demandas trazidas, identificação de padrões e vínculos terapêuticos.',
      plan: 'Manter acompanhamento na próxima sessão agendada com foco nas metas terapêuticas estabelecidas.',
    };
  }

  const prompt = `Você é um assistente técnico especializado em psicologia e terapias integrativas.
Sua função é converter anotações livres de uma sessão terapêutica para o padrão técnico SOAP (Subjetivo, Objetivo, Avaliação, Plano).

Diretrizes Éticas:
- Nunca estabeleça diagnósticos psiquiátricos fechados ou patológicos definitivos.
- Utilize terminologia fenomenológica, descritiva e humanizada.
- Mantenha clareza, concisão e foco terapêutico.

Anotações da Sessão (Anonimizadas):
"""
${sanitized}
"""

Responda OBRIGATORIAMENTE em JSON válido com a seguinte estrutura de chaves:
{
  "subjective": "Queixas verbais, percepções, sentimentos e falas relatadas pelo paciente",
  "objective": "Observações do terapeuta sobre afeto, estado geral, fala, engajamento e pontualidade",
  "assessment": "Avaliação clínica do progresso, hipóteses de trabalho e respostas às intervenções",
  "plan": "Encaminhamentos práticos, tarefas entre sessões e planejamento do próximo atendimento"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      subjective: parsed.subjective || 'Sem relato subjetivo identificado.',
      objective: parsed.objective || 'Observações gerais normativas.',
      assessment: parsed.assessment || 'Evolução em acompanhamento continuado.',
      plan: parsed.plan || 'Manter próxima sessão no horário acordado.',
    };
  } catch (error) {
    console.error('Erro ao chamar Gemini API para SOAP:', error);
    return {
      subjective: sanitized,
      objective: 'Anotação registrada sem análise automatizada por falha de conexão.',
      assessment: 'Revisão pendente pelo profissional.',
      plan: 'Dar continuidade ao plano terapêutico corrente.',
    };
  }
}

/**
 * Gerador de Conteúdo para Redes Sociais do Terapeuta.
 */
export async function generateSocialContentWithAI(
  theme: string,
  format: 'reels' | 'carousel' | 'post' = 'carousel'
) {
  const ai = getGenAI();

  if (!ai) {
    return {
      title: `Como lidar com ${theme}`,
      hook: `Você já sentiu que ${theme} está tomando conta da sua rotina?`,
      slidesOrScript: [
        '1. Reconheça o sintoma no seu corpo.',
        '2. Crie uma pausa de respiração consciente.',
        '3. Estabeleça limites com gentileza.',
      ],
      caption: `Cuidar da sua saúde mental é um compromisso diário. Se precisar de apoio profissional, o link na bio está aberto para agendamentos. #saudemental #${theme.toLowerCase().replace(/\s+/g, '')}`,
    };
  }

  const prompt = `Você é um estrategista de conteúdo e marketing ético para psicólogos e terapeutas.
Crie um roteiro de conteúdo acolhedor, psicoeducativo e que gere conexão genuína com futuros pacientes.

Tema: "${theme}"
Formato: "${format}" (Reels com roteiro visual/fala, Carrossel com 5 slides ou Post de feed com reflexão profunda)

Responda OBRIGATORIAMENTE em JSON com:
{
  "title": "Título cativante",
  "hook": "Gancho inicial para reter atenção nos 3 primeiros segundos",
  "slidesOrScript": ["Slide/Cena 1", "Slide/Cena 2", "Slide/Cena 3", "Slide/Cena 4", "Slide/Cena 5"],
  "caption": "Legenda completa formatada com emojis, parágrafos e chamada para ação ética (link na bio/agendamento)"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error('Erro ao gerar conteúdo:', err);
    throw err;
  }
}

/**
 * Gera mensagem de primeiro contato via WhatsApp para um novo Lead/Interessado.
 */
export async function generateLeadApproachMessageWithAI(
  leadName: string,
  demand: string,
  modality: string
) {
  const ai = getGenAI();
  const firstName = leadName.trim().split(' ')[0];

  if (!ai) {
    return `Olá ${firstName}! Tudo bem? Sou o Eduardo Lara. Vi que você entrou em contato buscando apoio terapêutico em relação a "${demand}". O espaço terapêutico é justamente um lugar seguro e sem julgamentos para acolher esse momento. Como você prefere atender: online ou presencial? Fico à disposição para alinharmos um horário!`;
  }

  const prompt = `Você é um terapeuta humanizado, acolhedor e profissional chamado Eduardo Lara.
Um novo paciente em potencial preencheu o formulário de contato do seu site com os seguintes dados:
- Nome: "${firstName}"
- Motivo/Queixa trazida: "${demand}"
- Modalidade de preferência: "${modality === 'online' ? 'Online' : 'Presencial'}"

Escreva uma mensagem calorosa, empática e ética para enviar no WhatsApp dele(a).
Diretrizes:
- Cumprimente pelo primeiro nome de forma afetuosa e respeitosa.
- Demonstre acolhimento em relação à dor trazida sem fazer promessas milagrosas de cura.
- Explique brevemente que a primeira conversa/sessão serve para se conhecerem e alinharem o formato.
- Termine com uma pergunta aberta e suave sobre horários disponíveis.
- Máximo de 3 parágrafos curtos, pronta para copiar e colar no WhatsApp.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return response.text?.trim() || `Olá ${firstName}! Sou o Eduardo Lara. Recebi seu contato sobre ${demand}. Quando você teria disponibilidade para conversar?`;
  } catch (err) {
    console.error('Erro ao gerar abordagem de lead:', err);
    return `Olá ${firstName}! Tudo bem? Recebi sua solicitação de atendimento. Como posso te ajudar melhor?`;
  }
}
