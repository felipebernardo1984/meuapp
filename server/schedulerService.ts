import { storage } from "./storage";
import { automationService } from "./automationService";

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

function prefix(): string {
  return `[AutomationJob ${new Date().toISOString()}]`;
}

function logReport(arenaId: string, arenaName: string, report: Awaited<ReturnType<typeof automationService.analyzeArena>>): void {
  const p = prefix();

  const totalAlerts =
    report.paymentsNearDue.length +
    report.overduePayments.length +
    report.inactiveStudents.length;

  console.log(`${p} Arena "${arenaName}" (${arenaId}) — ${totalAlerts} alerta(s) encontrado(s)`);

  if (report.paymentsNearDue.length > 0) {
    console.log(`${p}   Pagamentos próximos do vencimento (${report.paymentsNearDue.length}):`);
    for (const item of report.paymentsNearDue) {
      console.log(
        `${p}     • ${item.studentName} — R$ ${item.amount} — vence em ${item.daysUntilDue} dia(s) (${item.dueDate}) [${item.referenceMonth}]`
      );
    }
  }

  if (report.overduePayments.length > 0) {
    console.log(`${p}   Pagamentos atrasados (${report.overduePayments.length}):`);
    for (const item of report.overduePayments) {
      console.log(
        `${p}     • ${item.studentName} — R$ ${item.amount} — ${item.daysOverdue} dia(s) em atraso (venceu ${item.dueDate}) [${item.referenceMonth}]`
      );
    }
  }

  if (report.inactiveStudents.length > 0) {
    console.log(`${p}   Alunos sem check-in recente (${report.inactiveStudents.length}):`);
    for (const item of report.inactiveStudents) {
      const since = item.daysSinceLastCheckin !== null
        ? `${item.daysSinceLastCheckin} dia(s) sem check-in (último: ${item.lastCheckinDate})`
        : "nunca realizou check-in";
      console.log(`${p}     • ${item.studentName} — ${since}`);
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
    return;
  }

  console.log(`${prefix()} Analisando ${arenas.length} arena(s)...`);

  for (const arena of arenas) {
    try {
      const report = await automationService.analyzeArena(arena.id);
      logReport(arena.id, arena.name, report);
    } catch (err) {
      console.error(`${prefix()} Erro ao analisar arena "${arena.name}" (${arena.id}):`, err);
    }
  }

  console.log(`${prefix()} Análise diária concluída.`);
}

export function startDailyAutomationJob(): void {
  runJob();
  setInterval(runJob, DAILY_INTERVAL_MS);
  console.log(`[AutomationJob] Job diário registrado — próxima execução em 24h.`);
}
