export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureAiTables } = await import('@/lib/ai/init-db');
    await ensureAiTables();
  }
}
