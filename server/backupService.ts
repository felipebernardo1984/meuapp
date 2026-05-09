import fs from "fs";
import path from "path";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  arenas,
  students,
  teachers,
  plans,
  checkinHistory,
  payments,
  charges,
  despesas,
  turmas,
  turmaAlunos,
  recursos,
} from "@shared/schema";

export const BACKUP_DIR = path.join(process.cwd(), "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// ── List available backups ────────────────────────────────────────────────────
export function listBackups(): { filename: string; date: string; sizeKb: number }[] {
  ensureBackupDir();
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup_") && f.endsWith(".json"))
      .map((filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(filePath);
        const dateMatch = filename.match(/backup_(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : filename;
        return { filename, date, sizeKb: Math.round(stat.size / 1024) };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    return files;
  } catch {
    return [];
  }
}

// ── Read backup file ──────────────────────────────────────────────────────────
function readBackup(filename: string): any {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error(`Backup não encontrado: ${filename}`);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

// ── Preview: counts for a specific arena in a backup ─────────────────────────
export function getArenaBackupPreview(arenaId: string, filename: string): Record<string, number> {
  const data = readBackup(filename);
  return {
    planos:     (data.plans     ?? []).filter((r: any) => r.arenaId   === arenaId || r.arena_id   === arenaId).length,
    professores:(data.teachers  ?? []).filter((r: any) => r.arenaId   === arenaId || r.arena_id   === arenaId).length,
    alunos:     (data.students  ?? []).filter((r: any) => r.arenaId   === arenaId || r.arena_id   === arenaId).length,
    checkins:   (data.checkins  ?? []).filter((r: any) => r.arenaId   === arenaId || r.arena_id   === arenaId).length,
    pagamentos: (data.payments  ?? []).filter((r: any) => r.tenantId  === arenaId || r.tenant_id  === arenaId).length,
    cobranças:  (data.charges   ?? []).filter((r: any) => r.tenantId  === arenaId || r.tenant_id  === arenaId).length,
    despesas:   (data.despesas  ?? []).filter((r: any) => r.arenaId   === arenaId || r.arena_id   === arenaId).length,
    turmas:     (data.turmas    ?? []).filter((r: any) => r.arenaId   === arenaId || r.arena_id   === arenaId).length,
    recursos:   (data.recursos  ?? []).filter((r: any) => r.arenaId   === arenaId || r.arena_id   === arenaId).length,
  };
}

// ── Restore arena from backup ─────────────────────────────────────────────────
export async function restoreArenaFromBackup(
  arenaId: string,
  filename: string
): Promise<{ restored: Record<string, number> }> {
  const data = readBackup(filename);

  const filterArena  = (arr: any[]) => (arr ?? []).filter((r) => r.arenaId  === arenaId || r.arena_id  === arenaId);
  const filterTenant = (arr: any[]) => (arr ?? []).filter((r) => r.tenantId === arenaId || r.tenant_id === arenaId);

  const backupPlans      = filterArena(data.plans     ?? []);
  const backupTeachers   = filterArena(data.teachers  ?? []);
  const backupStudents   = filterArena(data.students  ?? []);
  const backupCheckins   = filterArena(data.checkins  ?? []);
  const backupPayments   = filterTenant(data.payments ?? []);
  const backupCharges    = filterTenant(data.charges  ?? []);
  const backupDespesas   = filterArena(data.despesas  ?? []);
  const backupTurmas     = filterArena(data.turmas    ?? []);
  const backupTurmaAlunos= (data.turmaAlunos ?? data.turma_alunos ?? []).filter(
    (r: any) => r.arenaId === arenaId || r.arena_id === arenaId
  );
  const backupRecursos   = filterArena(data.recursos  ?? []);

  // ── 1. Delete existing data (FK-safe order: children first) ──────────────
  await db.delete(turmaAlunos).where(eq(turmaAlunos.arenaId, arenaId));
  await db.delete(turmas).where(eq(turmas.arenaId, arenaId));
  await db.delete(charges).where(eq(charges.tenantId, arenaId));
  await db.delete(payments).where(eq(payments.tenantId, arenaId));
  await db.delete(checkinHistory).where(eq(checkinHistory.arenaId, arenaId));
  await db.delete(despesas).where(eq(despesas.arenaId, arenaId));
  await db.delete(recursos).where(eq(recursos.arenaId, arenaId));
  await db.delete(students).where(eq(students.arenaId, arenaId));
  await db.delete(teachers).where(eq(teachers.arenaId, arenaId));
  await db.delete(plans).where(eq(plans.arenaId, arenaId));

  // ── 2. Re-insert from backup (FK-safe order: parents first) ──────────────
  const normalize = (r: any, fields: string[]): any => {
    const out: any = {};
    for (const f of fields) {
      const camel = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      out[camel] = r[camel] ?? r[f] ?? null;
    }
    return out;
  };

  if (backupPlans.length)
    await db.insert(plans).values(backupPlans.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      titulo: r.titulo, checkins: r.checkins, valorTexto: r.valorTexto ?? r.valor_texto ?? null,
    })));

  if (backupTeachers.length)
    await db.insert(teachers).values(backupTeachers.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      nome: r.nome, login: r.login, senha: r.senha,
      cpf: r.cpf ?? null, email: r.email ?? null, telefone: r.telefone ?? null,
      modalidade: r.modalidade, percentualComissao: r.percentualComissao ?? r.percentual_comissao ?? "0.00",
      photoUrl: r.photoUrl ?? r.photo_url ?? null,
    })));

  if (backupStudents.length)
    await db.insert(students).values(backupStudents.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      nome: r.nome, login: r.login, senha: r.senha,
      cpf: r.cpf ?? "", email: r.email ?? null, telefone: r.telefone ?? null,
      modalidade: r.modalidade,
      planoId: r.planoId ?? r.plano_id ?? null,
      planoTitulo: r.planoTitulo ?? r.plano_titulo ?? "",
      planoCheckins: r.planoCheckins ?? r.plano_checkins ?? 0,
      planoValorTexto: r.planoValorTexto ?? r.plano_valor_texto ?? null,
      checkinsRealizados: r.checkinsRealizados ?? r.checkins_realizados ?? 0,
      statusMensalidade: r.statusMensalidade ?? r.status_mensalidade ?? "Em dia",
      aprovado: r.aprovado ?? true,
      ultimoCheckin: r.ultimoCheckin ?? r.ultimo_checkin ?? null,
      photoUrl: r.photoUrl ?? r.photo_url ?? null,
      integrationType: r.integrationType ?? r.integration_type ?? "none",
      integrationPlan: r.integrationPlan ?? r.integration_plan ?? null,
      professorId: r.professorId ?? r.professor_id ?? null,
      ativo: r.ativo ?? true,
      desativadoEm: r.desativadoEm ?? r.desativado_em ?? null,
    })));

  if (backupCheckins.length)
    await db.insert(checkinHistory).values(backupCheckins.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      studentId: r.studentId ?? r.student_id,
      data: r.data, hora: r.hora,
      tipo: r.tipo ?? "pendente",
      professorId: r.professorId ?? r.professor_id ?? null,
    })));

  if (backupPayments.length)
    await db.insert(payments).values(backupPayments.map((r: any) => ({
      id: r.id, tenantId: r.tenantId ?? r.tenant_id,
      studentId: r.studentId ?? r.student_id,
      planId: r.planId ?? r.plan_id ?? null,
      description: r.description ?? null,
      amount: r.amount, referenceMonth: r.referenceMonth ?? r.reference_month,
      dueDate: r.dueDate ?? r.due_date,
      paymentDate: r.paymentDate ?? r.payment_date ?? null,
      status: r.status ?? "pending",
      paymentMethod: r.paymentMethod ?? r.payment_method ?? "dinheiro",
      pagamentoToken: r.pagamentoToken ?? r.pagamento_token ?? null,
      createdBy: r.createdBy ?? r.created_by ?? null,
    })));

  if (backupCharges.length)
    await db.insert(charges).values(backupCharges.map((r: any) => ({
      id: r.id, tenantId: r.tenantId ?? r.tenant_id,
      studentId: r.studentId ?? r.student_id,
      description: r.description,
      amount: r.amount, status: r.status ?? "pending",
      dueDate: r.dueDate ?? r.due_date,
      paymentDate: r.paymentDate ?? r.payment_date ?? null,
      createdBy: r.createdBy ?? r.created_by ?? null,
    })));

  if (backupDespesas.length)
    await db.insert(despesas).values(backupDespesas.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      categoria: r.categoria, descricao: r.descricao ?? null,
      valor: r.valor, data: r.data,
    })));

  if (backupRecursos.length)
    await db.insert(recursos).values(backupRecursos.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      nome: r.nome, tipo: r.tipo ?? "sala",
      ativo: r.ativo ?? true,
    })));

  if (backupTurmas.length)
    await db.insert(turmas).values(backupTurmas.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      professorId: r.professorId ?? r.professor_id ?? null,
      nome: r.nome, modalidade: r.modalidade,
      diasSemana: r.diasSemana ?? r.dias_semana ?? "",
      horarioInicio: r.horarioInicio ?? r.horario_inicio ?? "",
      horarioFim: r.horarioFim ?? r.horario_fim ?? "",
      capacidadeMaxima: r.capacidadeMaxima ?? r.capacidade_maxima ?? null,
      cor: r.cor ?? "#1565C0", ativo: r.ativo ?? true,
    })));

  if (backupTurmaAlunos.length)
    await db.insert(turmaAlunos).values(backupTurmaAlunos.map((r: any) => ({
      id: r.id, arenaId: r.arenaId ?? r.arena_id,
      turmaId: r.turmaId ?? r.turma_id,
      alunoId: r.alunoId ?? r.aluno_id,
      dataMatricula: r.dataMatricula ?? r.data_matricula ?? new Date().toLocaleDateString("pt-BR"),
      ativo: r.ativo ?? true,
    })));

  return {
    restored: {
      planos: backupPlans.length,
      professores: backupTeachers.length,
      alunos: backupStudents.length,
      checkins: backupCheckins.length,
      pagamentos: backupPayments.length,
      cobranças: backupCharges.length,
      despesas: backupDespesas.length,
      turmas: backupTurmas.length,
      recursos: backupRecursos.length,
    },
  };
}

// ── Full DB backup (extended) ─────────────────────────────────────────────────
export async function runDatabaseBackup() {
  try {
    ensureBackupDir();
    const date = new Date().toISOString().split("T")[0];
    const backupFile = path.join(BACKUP_DIR, `backup_${date}.json`);

    const data = {
      createdAt: new Date().toISOString(),
      arenas:    await db.select().from(arenas),
      plans:     await db.select().from(plans),
      teachers:  await db.select().from(teachers),
      students:  await db.select().from(students),
      checkins:  await db.select().from(checkinHistory),
      payments:  await db.select().from(payments),
      charges:   await db.select().from(charges),
      despesas:  await db.select().from(despesas),
      turmas:    await db.select().from(turmas),
      turmaAlunos: await db.select().from(turmaAlunos),
      recursos:  await db.select().from(recursos),
    };

    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2), "utf8");
    console.log("✅ Backup criado:", backupFile);
  } catch (error) {
    console.error("❌ Erro ao gerar backup:", error);
  }
}
