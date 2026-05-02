/**
 * WhatsApp API integration layer.
 * Supports: Evolution API, Z-API, 360dialog (Meta)
 * Falls back to manual (wa.me link) when provider = "manual" or not configured.
 */

type WhatsappSettings = {
  provider?: string | null;
  apiKey?: string | null;
  instanceId?: string | null;
  apiUrl?: string | null;
};

export type SendResult =
  | { mode: "api"; ok: true }
  | { mode: "manual"; link: string }
  | { mode: "no_phone" };

export async function sendWhatsappMessage(
  settings: WhatsappSettings | null,
  telefone: string | null | undefined,
  mensagem: string
): Promise<SendResult> {
  const numero = (telefone ?? "").replace(/\D/g, "");

  if (!numero) {
    return { mode: "no_phone" };
  }

  const provider = settings?.provider ?? "manual";

  if (provider === "manual" || !settings?.apiKey) {
    const link = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
    return { mode: "manual", link };
  }

  if (provider === "evolution") {
    await sendEvolution(settings, numero, mensagem);
    return { mode: "api", ok: true };
  }

  if (provider === "zapi") {
    await sendZApi(settings, numero, mensagem);
    return { mode: "api", ok: true };
  }

  if (provider === "360dialog") {
    await send360Dialog(settings, numero, mensagem);
    return { mode: "api", ok: true };
  }

  // Unknown provider — fallback to manual
  const link = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  return { mode: "manual", link };
}

// ── Evolution API ─────────────────────────────────────────────────────────────
async function sendEvolution(settings: WhatsappSettings, numero: string, mensagem: string) {
  const baseUrl = (settings.apiUrl ?? "").replace(/\/$/, "");
  const instance = settings.instanceId ?? "";
  const url = `${baseUrl}/message/sendText/${instance}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": settings.apiKey ?? "",
    },
    body: JSON.stringify({
      number: numero,
      options: { delay: 1200 },
      textMessage: { text: mensagem },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evolution API (${response.status}): ${body}`);
  }
}

// ── Z-API ─────────────────────────────────────────────────────────────────────
async function sendZApi(settings: WhatsappSettings, numero: string, mensagem: string) {
  const instance = settings.instanceId ?? "";
  const token = settings.apiKey ?? "";
  const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: numero, message: mensagem }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Z-API (${response.status}): ${body}`);
  }
}

// ── 360dialog (Meta) ──────────────────────────────────────────────────────────
async function send360Dialog(settings: WhatsappSettings, numero: string, mensagem: string) {
  const url = "https://waba.360dialog.io/v1/messages";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "D360-API-KEY": settings.apiKey ?? "",
    },
    body: JSON.stringify({
      to: numero,
      type: "text",
      text: { body: mensagem },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`360dialog (${response.status}): ${body}`);
  }
}
