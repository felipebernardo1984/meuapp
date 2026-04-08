import { eq } from "drizzle-orm";
import { db } from "./db";
import { checkinFinanceiro } from "@shared/schema";
import { storage } from "./storage";
import type { Student, ModalidadeSettings } from "@shared/schema";

export interface ReceitaPeriodo {
  totalCheckins: number;
  receitaTotal: number;
  porModalidade: Array<{ modalidade: string; checkins: number; receita: number }>;
  porAluno: Array<{ studentId: string; nome: string; modalidade: string; integrationType: string; checkins: number; receita: number }>;
}

export interface ReceitaAluno {
  studentId: string;
  nome: string;
  modalidade: string;
  integrationType: string;
  integrationPlan: string | null;
  checkins: number;
  valorUnitario: number;
  receitaTotal: number;
}

export interface PlanMinimumResult {
  allowed: boolean;
  reason?: string;
}

// Parse "DD/MM/YYYY" from checkin_history into a Date
function parsePtBRDate(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
  }
  return null;
}

// Parse "YYYY-MM-DD" from query params into a Date
function parseISODate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  return isNaN(d.getTime()) ? null : d;
}

function isInRange(date: Date | null, inicio: Date | null, fim: Date | null): boolean {
  if (!date) return true;
  if (inicio && date < inicio) return false;
  if (fim) {
    const endOfDay = new Date(fim);
    endOfDay.setUTCHours(23, 59, 59, 999);
    if (date > endOfDay) return false;
  }
  return true;
}

// Central function: determines the check-in revenue value for a student given their integration type
function getValorCheckin(modalidadeSetting: ModalidadeSettings | undefined, student: Student): number {
  if (!modalidadeSetting) return 0;

  const integrationType = student.integrationType ?? "none";

  if (integrationType === "wellhub") {
    return parseFloat(modalidadeSetting.wellhubValorCheckin || "0");
  }
  if (integrationType === "totalpass") {
    return parseFloat(modalidadeSetting.totalpassValorCheckin || "0");
  }
  // 'none' — no integration revenue
  return 0;
}

// Validate minimum plan requirement
function validatePlanMinimum(
  modalidadeSetting: ModalidadeSettings | undefined,
  student: Student
): PlanMinimumResult {
  if (!modalidadeSetting) return { allowed: true };

  const integrationType = student.integrationType ?? "none";
  const studentPlan = (student.integrationPlan ?? "").trim().toUpperCase();

  if (integrationType === "wellhub") {
    const minPlan = (modalidadeSetting.wellhubPlanoMinimo ?? "").trim().toUpperCase();
    if (minPlan && studentPlan && studentPlan < minPlan) {
      return { allowed: false, reason: `Plano Wellhub mínimo exigido: ${minPlan}. Plano do aluno: ${studentPlan || "não definido"}` };
    }
  }

  if (integrationType === "totalpass") {
    const minPlan = (modalidadeSetting.totalpassPlanoMinimo ?? "").trim().toUpperCase();
    if (minPlan && studentPlan && studentPlan < minPlan) {
      return { allowed: false, reason: `Plano TotalPass mínimo exigido: ${minPlan}. Plano do aluno: ${studentPlan || "não definido"}` };
    }
  }

  return { allowed: true };
}

export const financeService = {
  // Exposed for routes to use
  validatePlanMinimum,

  async calcularReceitaCheckin(
    arenaId: string,
    studentId: string,
    modalidade: string,
    checkinId: string,
    dataCheckin: string
  ): Promise<void> {
    const [student, modalidadeSetting] = await Promise.all([
      storage.getStudent(studentId),
      storage.getModalidadeSetting(arenaId, modalidade),
    ]);

    if (!student) return;

    // Check for duplicate (unique constraint via checkinId)
    const existing = await storage.getCheckinFinanceiroByCheckinId(checkinId);
    if (existing) return;

    const integrationType = student.integrationType ?? "none";
    const valorUnitario = getValorCheckin(modalidadeSetting, student);

    // Always save the snapshot — including when valorUnitario is 0 (tracks 'none' check-ins)
    await storage.createCheckinFinanceiro({
      arenaId,
      checkinId,
      studentId,
      modalidade,
      integrationType,
      valorUnitario: valorUnitario.toFixed(2),
      valorTotal: valorUnitario.toFixed(2),
      dataCheckin,
      status: "ativo",
    });
  },

  async getReceitaTotalPeriodo(
    arenaId: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<ReceitaPeriodo> {
    const inicio = parseISODate(dataInicio);
    const fim = parseISODate(dataFim);

    const allFinancialRecords = await storage.listCheckinFinanceiro(arenaId);
    const allStudents = await storage.listStudents(arenaId);
    const studentMap = new Map(allStudents.map((s) => [s.id, s]));

    const modalidadeMap = new Map<string, { checkins: number; receita: number }>();
    const alunoMap = new Map<string, { nome: string; modalidade: string; integrationType: string; checkins: number; receita: number }>();

    let totalCheckins = 0;
    let receitaTotal = 0;

    for (const r of allFinancialRecords) {
      // Only count active records
      if (r.status === "cancelado") continue;

      // Filter by date of checkin (not createdAt)
      const recordDate = parsePtBRDate(r.dataCheckin);
      if (!isInRange(recordDate, inicio, fim)) continue;

      const valor = parseFloat(r.valorTotal || "0");
      totalCheckins += 1;
      receitaTotal += valor;

      const mod = r.modalidade;
      if (!modalidadeMap.has(mod)) modalidadeMap.set(mod, { checkins: 0, receita: 0 });
      modalidadeMap.get(mod)!.checkins += 1;
      modalidadeMap.get(mod)!.receita += valor;

      const sid = r.studentId!;
      if (!alunoMap.has(sid)) {
        const student = studentMap.get(sid);
        alunoMap.set(sid, {
          nome: student?.nome ?? "—",
          modalidade: mod,
          integrationType: r.integrationType ?? "none",
          checkins: 0,
          receita: 0,
        });
      }
      alunoMap.get(sid)!.checkins += 1;
      alunoMap.get(sid)!.receita += valor;
    }

    return {
      totalCheckins,
      receitaTotal,
      porModalidade: Array.from(modalidadeMap.entries())
        .map(([modalidade, v]) => ({ modalidade, ...v }))
        .sort((a, b) => b.receita - a.receita),
      porAluno: Array.from(alunoMap.entries())
        .map(([studentId, v]) => ({ studentId, ...v }))
        .sort((a, b) => b.receita - a.receita),
    };
  },

  async getReceitaPorAluno(arenaId: string, studentId: string): Promise<ReceitaAluno> {
    const [records, student, modalidadeSetting] = await Promise.all([
      storage.listCheckinFinanceiroByStudent(studentId),
      storage.getStudent(studentId),
      storage.getStudent(studentId).then((s) =>
        s ? storage.getModalidadeSetting(arenaId, s.modalidade) : undefined
      ),
    ]);

    const integrationType = student?.integrationType ?? "none";
    const integrationPlan = student?.integrationPlan ?? null;

    // Only count active records
    const activeRecords = records.filter((r) => r.status !== "cancelado");

    // Current per-check-in value based on student's integration type
    const valorUnitario = student && modalidadeSetting
      ? getValorCheckin(modalidadeSetting, student)
      : 0;

    const checkins = activeRecords.length;
    const receitaTotal = activeRecords.reduce((acc, r) => acc + parseFloat(r.valorTotal || "0"), 0);

    return {
      studentId,
      nome: student?.nome ?? "—",
      modalidade: student?.modalidade ?? "—",
      integrationType,
      integrationPlan,
      checkins,
      valorUnitario,
      receitaTotal,
    };
  },
};
