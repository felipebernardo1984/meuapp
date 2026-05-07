import { storage } from "./storage";

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
