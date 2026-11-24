'use server';

import { generateSocialContentWithAI } from '@/lib/ai/gemini';

export async function generateContentAction(
  theme: string,
  format: 'reels' | 'carousel' | 'post' = 'carousel'
) {
  if (!theme || theme.trim().length < 3) {
    throw new Error('Informe um tema válido para a geração.');
  }

  return await generateSocialContentWithAI(theme, format);
}

