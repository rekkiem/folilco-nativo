import { logger } from "./logger";

function isConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  if (token.includes("tu-") || chat.includes("tu-")) return false;
  return true;
}

/**
 * Envía alerta al chat del equipo. Nunca lanza: falla en log.
 */
export async function enviarTelegram(texto: string): Promise<{ ok: boolean }> {
  if (!isConfigured()) {
    logger.warn("[Telegram] No configurado – mensaje omitido", { preview: texto.slice(0, 80) });
    return { ok: false };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error("[Telegram] Error API", { status: res.status, body: body.slice(0, 200) });
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    logger.error("[Telegram] Fallo de red", err);
    return { ok: false };
  }
}

export function telegramConfigurado(): boolean {
  return isConfigured();
}
