// ── Notification Service ──────────────────────────────────────────────────────
// Automatically selects the active provider based on environment variables:
//   - TwilioProvider  → when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM are set
//   - MockProvider    → fallback when any credential is missing (system keeps running normally)
//
// To enable real WhatsApp: add the three secrets above. No code changes needed.

export interface NotificationRecipient {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
}

export interface NotificationResult {
  recipientId: string;
  provider: "twilio" | "mock";
  channel: "whatsapp" | "mock";
  message: string;
  sentAt: string;
  success: boolean;
  error?: string;
}

// ── Providers ─────────────────────────────────────────────────────────────────

async function sendViaMock(
  aluno: NotificationRecipient,
  mensagem: string
): Promise<NotificationResult> {
  console.log(
    `[NotificationService] [MOCK] → ${aluno.nome}` +
      (aluno.telefone ? ` (${aluno.telefone})` : " (sem telefone)") +
      ` | "${mensagem}"`
  );

  return {
    recipientId: aluno.id,
    provider: "mock",
    channel: "mock",
    message: mensagem,
    sentAt: new Date().toISOString(),
    success: true,
  };
}

async function sendViaTwilio(
  aluno: NotificationRecipient,
  mensagem: string,
  accountSid: string,
  authToken: string,
  fromNumber: string
): Promise<NotificationResult> {
  const to = aluno.telefone?.trim();

  if (!to) {
    console.warn(
      `[NotificationService] [Twilio] Aluno "${aluno.nome}" sem telefone — ignorando envio.`
    );
    return {
      recipientId: aluno.id,
      provider: "twilio",
      channel: "whatsapp",
      message: mensagem,
      sentAt: new Date().toISOString(),
      success: false,
      error: "Telefone não cadastrado",
    };
  }

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);

    const toWhatsapp = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    await client.messages.create({
      from: fromNumber,
      to: toWhatsapp,
      body: mensagem,
    });

    console.log(
      `[NotificationService] [Twilio] ✓ Mensagem enviada → ${aluno.nome} (${toWhatsapp})`
    );

    return {
      recipientId: aluno.id,
      provider: "twilio",
      channel: "whatsapp",
      message: mensagem,
      sentAt: new Date().toISOString(),
      success: true,
    };
  } catch (err: any) {
    const errorMsg = err?.message ?? String(err);
    console.error(
      `[NotificationService] [Twilio] ✗ Falha ao enviar para "${aluno.nome}": ${errorMsg}`
    );

    return {
      recipientId: aluno.id,
      provider: "twilio",
      channel: "whatsapp",
      message: mensagem,
      sentAt: new Date().toISOString(),
      success: false,
      error: errorMsg,
    };
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  );
}

export async function sendNotification(
  aluno: NotificationRecipient,
  mensagem: string
): Promise<NotificationResult> {
  if (isTwilioConfigured()) {
    return sendViaTwilio(
      aluno,
      mensagem,
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
      process.env.TWILIO_WHATSAPP_FROM!
    );
  }

  return sendViaMock(aluno, mensagem);
}
