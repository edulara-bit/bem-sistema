/**
 * Serviço de Integração Multi-Tenant com Evolution API (WhatsApp)
 * Cada consultório possui sua própria instância isolada com seu número de WhatsApp.
 */

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8082';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'bem_evolution_super_secret_token_2026';

export interface WhatsAppConnectionState {
  instanceName: string;
  state: 'open' | 'connecting' | 'close' | 'refused';
  qrcode?: string | null; // Base64
}

/**
 * Cria ou recupera a instância de WhatsApp para o consultório (tenant)
 */
export async function getOrCreateWhatsAppInstance(tenantSlug: string): Promise<{
  instanceName: string;
  status: string;
  qrcode?: string | null;
}> {
  const instanceName = `bem_${tenantSlug.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

  try {
    // 1. Verifica se a instância já existe
    const statusRes = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
      headers: { apikey: EVOLUTION_KEY },
      cache: 'no-store',
    });

    if (statusRes.ok) {
      const data = await statusRes.json();
      const state = data?.instance?.state || 'close';

      if (state === 'open') {
        return { instanceName, status: 'open' };
      }

      // Se não estiver conectada, tenta pegar o QR code
      const qrRes = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
        headers: { apikey: EVOLUTION_KEY },
        cache: 'no-store',
      });
      const qrData = await qrRes.json();
      return {
        instanceName,
        status: state,
        qrcode: qrData?.base64 || qrData?.code || null,
      };
    }

    // 2. Se não existe, cria a instância para o consultório
    const createRes = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_KEY,
      },
      body: JSON.stringify({
        instanceName,
        token: `${instanceName}_token`,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        rejectCall: false,
      }),
      cache: 'no-store',
    });

    const createData = await createRes.json();
    return {
      instanceName,
      status: 'connecting',
      qrcode: createData?.qrcode?.base64 || null,
    };
  } catch (error: any) {
    console.error(`Erro ao conectar com Evolution API para ${tenantSlug}:`, error.message);
    return {
      instanceName,
      status: 'disconnected',
      qrcode: null,
    };
  }
}

/**
 * Envia uma mensagem de WhatsApp via instância do consultório
 */
export async function sendWhatsAppMessage(
  instanceName: string,
  toPhone: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Formata o número (DDI 55 + DDD + Número)
    let cleanPhone = toPhone.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleanPhone.startsWith('55') && (cleanPhone.length === 10 || cleanPhone.length === 11)) {
      cleanPhone = `55${cleanPhone}`;
    }

    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_KEY,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text,
        delay: 1200, // delay humanizado
        linkPreview: true,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData?.message || 'Falha ao enviar mensagem.' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Desconecta o WhatsApp do consultório (Logout)
 */
export async function logoutWhatsAppInstance(instanceName: string): Promise<boolean> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: { apikey: EVOLUTION_KEY },
    });
    return res.ok;
  } catch {
    return false;
  }
}
