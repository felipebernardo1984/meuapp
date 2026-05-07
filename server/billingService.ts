import { storage } from "./storage";

async function sendInvoiceEmail(params: {
  gestorEmail: string;
  arenaName: string;
  planType: string;
  amount: string;
  referenceMonth: string;
  dueDate: string;
}): Promise<void> {
  const resendApiKey = await storage.getPlatformSetting("resend_api_key");
  if (!resendApiKey) return;

  const suporteEmail = (await storage.getPlatformSetting("suporte_email")) ?? "noreply@sevenclubsports.com.br";
  const suporteWhatsapp = (await storage.getPlatformSetting("suporte_whatsapp")) ?? "";
  const suporteTelefone = (await storage.getPlatformSetting("suporte_telefone")) ?? "";

  const { Resend } = await import("resend");
  const resend = new Resend(resendApiKey);

  const planLabel = params.planType === "premium" ? "Plano Premium" : "Plano Básico";

  const contatoHtml = [
    suporteEmail ? `<p style="margin:4px 0">E-mail: <a href="mailto:${suporteEmail}" style="color:#1d4ed8">${suporteEmail}</a></p>` : "",
    suporteTelefone ? `<p style="margin:4px 0">Telefone: ${suporteTelefone}</p>` : "",
    suporteWhatsapp ? `<p style="margin:4px 0">WhatsApp: <a href="https://wa.me/${suporteWhatsapp.replace(/\D/g, "")}" style="color:#1d4ed8">${suporteWhatsapp}</a></p>` : "",
  ].filter(Boolean).join("");

  await resend.emails.send({
    from: `Seven Sports <${suporteEmail}>`,
    to: params.gestorEmail,
    subject: `Fatura gerada — ${params.arenaName} · ${params.referenceMonth}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1f2937">
        <div style="background:linear-gradient(90deg,#1565C0,#29B6F6);padding:24px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:2px">SEVEN SPORTS</h1>
          <p style="color:#e0f2fe;margin:4px 0 0;font-size:12px">Sistema de Gestão Esportiva</p>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <h2 style="color:#1d4ed8;margin:0 0 16px">Nova fatura gerada</h2>
          <p style="margin:0 0 20px">Olá! Uma nova fatura foi gerada para a arena <strong>${params.arenaName}</strong>.</p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:16px;margin:0 0 20px">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:4px 0;color:#6b7280">Arena</td><td style="padding:4px 0;text-align:right;font-weight:600">${params.arenaName}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Plano</td><td style="padding:4px 0;text-align:right">${planLabel}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Referência</td><td style="padding:4px 0;text-align:right">${params.referenceMonth}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Vencimento</td><td style="padding:4px 0;text-align:right;color:#d97706;font-weight:600">${params.dueDate}</td></tr>
              <tr style="border-top:1px solid #e2e8f0"><td style="padding:8px 0 4px;font-weight:700;font-size:16px">Valor</td><td style="padding:8px 0 4px;text-align:right;font-weight:700;font-size:18px;color:#1d4ed8">${params.amount}</td></tr>
            </table>
          </div>

          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:12px;margin:0 0 20px;font-size:13px;color:#92400e">
            <strong>⚠️ Atenção:</strong> O acesso à arena foi suspenso até a confirmação do pagamento. Após o pagamento, entre em contato com o suporte para regularizar.
          </div>

          <p style="font-size:13px;color:#6b7280;margin:0 0 8px">Dúvidas ou confirmação de pagamento:</p>
          ${contatoHtml || `<p style="margin:4px 0">E-mail: <a href="mailto:suporte@sevenclubsports.com.br" style="color:#1d4ed8">suporte@sevenclubsports.com.br</a></p>`}
        </div>
      </div>
    `,
  });
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function addMonths(dateISO: string, months: number): string {
  const d = new Date(dateISO);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function currentReferenceMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toBRDate(dateISO: string): string {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

function parseToISO(date: string): string {
  if (!date) return "";
  if (date.includes("/")) {
    const [d, m, y] = date.split("/");
    return `${y}-${m}-${d}`;
  }
  return date;
}

const PREFIX = "[BillingJob]";

export async function runDailyBillingCheck(): Promise<void> {
  const todayStr = todayISO();
  console.log(`${PREFIX} Verificação de cobrança iniciada — ${todayStr}`);

  let arenas: Awaited<ReturnType<typeof storage.listArenas>>;
  let plans: Awaited<ReturnType<typeof storage.listPlatformPlans>>;
  let allPayments: Awaited<ReturnType<typeof storage.listArenaSubscriptionPayments>>;

  try {
    [arenas, plans, allPayments] = await Promise.all([
      storage.listArenas(),
      storage.listPlatformPlans(),
      storage.listArenaSubscriptionPayments(),
    ]);
  } catch (err) {
    console.error(`${PREFIX} Erro ao carregar dados:`, err);
    return;
  }

  const planValueMap: Record<string, string> = {};
  for (const p of plans) planValueMap[p.planType] = p.monthlyValue;

  for (const arena of arenas) {
    try {
      if (arena.gestorLogin === "333") continue;

      const arenaPayments = allPayments.filter((p) => p.arenaId === arena.id);
      const pendingPayments = arenaPayments.filter((p) => p.status === "pending");

      // ── 1. Já tem fatura pendente → manter acesso bloqueado se necessário ───
      if (pendingPayments.length > 0 && arena.statusConta !== "vencido") {
        await storage.updateArena(arena.id, { statusConta: "vencido" });
        console.log(`${PREFIX} Arena "${arena.name}" mantida bloqueada — fatura pendente aguardando pagamento.`);
      }

      if (pendingPayments.length > 0) continue;

      // ── 2. Trial expirado → gerar fatura e bloquear imediatamente ──────────
      if (arena.statusConta === "trial" && arena.trialExpiraEm) {
        const trialExpISO = parseToISO(arena.trialExpiraEm);

        if (trialExpISO <= todayStr) {
          const amount = planValueMap[arena.subscriptionPlan] ?? "R$ 0,00";
          const dueDate = addDays(todayStr, 7);
          const refMonth = currentReferenceMonth();

          await storage.createArenaSubscriptionPayment({
            arenaId: arena.id,
            arenaName: arena.name,
            planType: arena.subscriptionPlan,
            amount,
            referenceMonth: refMonth,
            dueDate,
            paymentDate: null,
            status: "pending",
          });

          await storage.updateArena(arena.id, { statusConta: "vencido" });

          console.log(
            `${PREFIX} Fatura gerada e arena "${arena.name}" bloqueada (trial expirado). Valor: ${amount} — Vencimento: ${toBRDate(dueDate)}`
          );

          if (arena.gestorEmail) {
            sendInvoiceEmail({ gestorEmail: arena.gestorEmail, arenaName: arena.name, planType: arena.subscriptionPlan, amount, referenceMonth: refMonth, dueDate: toBRDate(dueDate) })
              .then(() => console.log(`${PREFIX} E-mail de fatura enviado para ${arena.gestorEmail}`))
              .catch((e) => console.error(`${PREFIX} Falha ao enviar e-mail:`, e));
          }
        }
      }

      // ── 3. Arena ativa → verificar renovação mensal e bloquear ────────────
      if (arena.statusConta === "ativo" && arena.nextBillingDate) {
        const nextISO = parseToISO(arena.nextBillingDate);
        const refMonth = currentReferenceMonth();
        const jaTemEsseMes = arenaPayments.some((p) => p.referenceMonth === refMonth);

        if (nextISO <= todayStr && !jaTemEsseMes) {
          const amount = planValueMap[arena.subscriptionPlan] ?? "R$ 0,00";
          const dueDate = addDays(todayStr, 7);

          await storage.createArenaSubscriptionPayment({
            arenaId: arena.id,
            arenaName: arena.name,
            planType: arena.subscriptionPlan,
            amount,
            referenceMonth: refMonth,
            dueDate,
            paymentDate: null,
            status: "pending",
          });

          await storage.updateArena(arena.id, { statusConta: "vencido" });

          console.log(
            `${PREFIX} Fatura mensal gerada e arena "${arena.name}" bloqueada. Valor: ${amount} — Vencimento: ${toBRDate(dueDate)}`
          );

          if (arena.gestorEmail) {
            sendInvoiceEmail({ gestorEmail: arena.gestorEmail, arenaName: arena.name, planType: arena.subscriptionPlan, amount, referenceMonth: refMonth, dueDate: toBRDate(dueDate) })
              .then(() => console.log(`${PREFIX} E-mail de fatura enviado para ${arena.gestorEmail}`))
              .catch((e) => console.error(`${PREFIX} Falha ao enviar e-mail:`, e));
          }
        }
      }
    } catch (err) {
      console.error(`${PREFIX} Erro ao processar "${arena.name}":`, err);
    }
  }

  console.log(`${PREFIX} Verificação concluída.`);
}

export async function confirmSubscriptionPayment(paymentId: string): Promise<void> {
  const todayStr = todayISO();
  const todayBR = toBRDate(todayStr);

  const payment = await storage.updateArenaSubscriptionPayment(paymentId, {
    status: "paid",
    paymentDate: todayBR,
  });

  if (!payment?.arenaId) return;

  const nextBillingISO = addMonths(todayStr, 1);
  await storage.updateArena(payment.arenaId, {
    statusConta: "ativo",
    nextBillingDate: toBRDate(nextBillingISO),
    subscriptionStatus: "Ativo",
  });
}
