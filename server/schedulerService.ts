import { storage } from "./storage";
import { automationService } from "./automationService";
import { runDatabaseBackup } from "./backupService";

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

function prefix(): string {
  return `[AutomationJob ${new Date().toISOString()}]`;
}

function logReport(
  arenaId: string,
  arenaName: string,
  report: Awaited<ReturnType<typeof automationService.analyzeArena>>
): void {
  const p = prefix();

  const totalAlerts =
    report.paymentsNearDue.length +
    report.overduePayments.length +
    report.lowFrequencyStudents.length;

  console.log(
    `${p} Arena "${arenaName}" (${arenaId}) — ${totalAlerts} alerta(s) encontrado(s)`
  );

  if (report.paymentsNearDue.length > 0) {
    console.log(
      `${p}   Mensalistas com vencimento próximo (${report.paymentsNearDue.length}):`
    );
    for (const item of report.paymentsNearDue) {
      const when =
        item.daysUntilDue === 0 ? "hoje" : `em ${item.daysUntilDue} dia(s)`;
      console.log(
        `${p}     • ${item.studentName} — R$ ${item.amount} — vence ${when} (${item.dueDate}) [${item.referenceMonth}]`
      );
    }
  }

  if (report.overduePayments.length > 0) {
    console.log(
      `${p}   Mensalistas com pagamento atrasado (${report.overduePayments.length}):`
    );
    for (const item of report.overduePayments) {
      console.log(
        `${p}     • ${item.studentName} — R$ ${item.amount} — ${item.daysOverdue} dia(s) em atraso (venceu ${item.dueDate}) [${item.referenceMonth}]`
      );
    }
  }

  if (report.lowFrequencyStudents.length > 0) {
    console.log(
      `${p}   Alunos de check-in com baixa frequência (${report.lowFrequencyStudents.length}):`
    );
    for (const item of report.lowFrequencyStudents) {
      const lastSeen = item.lastCheckinDate
        ? `último check-in: ${item.lastCheckinDate} (${item.daysSinceLastCheckin}d atrás)`
        : "nunca realizou check-in";
      console.log(
        `${p}     • ${item.studentName} [${item.integrationType}] — ${item.checkinsLast30Days}/${item.expectedCheckins30Days} check-ins nos últimos 30 dias — ${lastSeen}`
      );
    }
  }

  if (report.notificationsSent.length > 0) {
    console.log(
      `${p}   Notificações enviadas (${report.notificationsSent.length}):`
    );
    for (const n of report.notificationsSent) {
      const status = n.success ? "✓" : "✗";
      const tag = n.mock ? " [MOCK]" : "";
      console.log(
        `${p}     ${status}${tag} ID ${n.recipientId} — "${n.message.slice(
          0,
          60
        )}…"`
      );
    }
  }

  if (totalAlerts === 0) {
    console.log(`${p}   Nenhum alerta. Arena em dia.`);
  }
}

async function runJob(): Promise<void> {
  console.log(`${prefix()} Iniciando análise diária...`);

  let arenas: Awaited<ReturnType<typeof storage.listArenas>>;

  try {
    arenas = await storage.listArenas();
  } catch (err) {
    console.error(`${prefix()} Erro ao listar arenas:`, err);
    return;
  }

  if (arenas.length === 0) {
    console.log(`${prefix()} Nenhuma arena encontrada. Nada a analisar.`);
  } else {
    console.log(`${prefix()} Analisando ${arenas.length} arena(s)...`);

    for (const arena of arenas) {
      try {
        const report = await automationService.analyzeArena(arena.id);
        logReport(arena.id, arena.name, report);
      } catch (err) {
        console.error(
          `${prefix()} Erro ao analisar arena "${arena.name}" (${arena.id}):`,
          err
        );
      }
    }
  }

  /**
   * Backup automático do banco
   */

  try {

    console.log(`${prefix()} Iniciando backup automático do banco...`);

    await runDatabaseBackup();

    console.log(`${prefix()} Backup concluído com sucesso.`);

  } catch (err) {

    console.error(`${prefix()} Erro ao executar backup:`, err);

  }

  console.log(`${prefix()} Job diário finalizado.`);
}

export function startDailyAutomationJob(): void {

  runJob();

  setInterval(runJob, DAILY_INTERVAL_MS);

  console.log(
    `[AutomationJob] Job diário registrado — próxima execução em 24h.`
  );

}