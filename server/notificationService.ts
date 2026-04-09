// ── Notification Service ──────────────────────────────────────────────────────
// Mock implementation. Replace the body of `sendNotification` with a real
// WhatsApp / SMS / e-mail integration when ready. The signature must not change.

export interface NotificationRecipient {
  id: string;
  nome: string;
  telefone?: string | null;
  email?: string | null;
}

export interface NotificationResult {
  recipientId: string;
  channel: "whatsapp" | "email" | "mock";
  message: string;
  sentAt: string;
  success: boolean;
  mock: boolean;
}

export async function sendNotification(
  aluno: NotificationRecipient,
  mensagem: string
): Promise<NotificationResult> {
  const result: NotificationResult = {
    recipientId: aluno.id,
    channel: "mock",
    message: mensagem,
    sentAt: new Date().toISOString(),
    success: true,
    mock: true,
  };

  console.log(
    `[NotificationService] [MOCK] → ${aluno.nome}` +
      (aluno.telefone ? ` (${aluno.telefone})` : "") +
      ` | "${mensagem}"`
  );

  return result;
}
