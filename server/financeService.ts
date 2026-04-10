import { eq } from "drizzle-orm";
import { db } from "./db";
import { checkinFinanceiro, payments } from "@shared/schema";
import { storage } from "./storage";
import type { Student, ModalidadeSettings } from "@shared/schema";

export interface ReceitaPeriodo {
  totalCheckins: number;
  receitaTotal: number;
  receitaCheckins: number;
  receitaMensalidades: number;
  porModalidade: Array<{ modalidade: string; integrationType: string; checkins: number; receita: number; valorUnitario: number }>;
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
  receitaCheckins: number;
  receitaMensalidades: number;
  receitaCobranças: number;
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

// Snapshot: determine plan type at check-in time
function getTipoPlanoNoMomento(student: Student): "checkin" | "mensalista" {
  return (student.planoCheckins ?? 0) === 0 ? "mensalista" : "checkin";
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

  // Backfill financial records for all check-ins that don't have one yet
  async backfillCheckinFinanceiro(arenaId: string): Promise<void> {
    const allStudents = await storage.listStudents(arenaId);
    for (const student of allStudents) {
      const checkins = await storage.listCheckins(student.id);
      if (!checkins.length) continue;
      const modalidadeSetting = await storage.getModalidadeSetting(arenaId, student.modalidade);
      const valorUnitario = getValorCheckin(modalidadeSetting, student);
      const tipoPlanoNoMomento = getTipoPlanoNoMomento(student);
      for (const checkin of checkins) {
        const existing = await storage.getCheckinFinanceiroByCheckinId(checkin.id);
        if (existing) continue;
        await storage.createCheckinFinanceiro({
          arenaId,
          checkinId: checkin.id,
          studentId: student.id,
          modalidade: student.modalidade,
          integrationType: student.integrationType ?? "none",
          valorUnitario: valorUnitario.toFixed(2),
          valorTotal: valorUnitario.toFixed(2),
          dataCheckin: checkin.data,
          status: "ativo",
          tipoPlanoNoMomento,
          valorOriginal: valorUnitario.toFixed(2),
        });
      }
    }
  },

  // Recalculate all active financial records for a student — skips records that have valorOriginal (immutable snapshots)
  async recalcularReceitaAluno(arenaId: string, studentId: string): Promise<void> {
    const student = await storage.getStudent(studentId);
    if (!student) return;
    const modalidadeSetting = await storage.getModalidadeSetting(arenaId, student.modalidade);
    const valorUnitario = getValorCheckin(modalidadeSetting, student);
    await storage.updateCheckinFinanceiroValues(
      studentId,
      valorUnitario.toFixed(2),
      student.integrationType ?? "none"
    );
  },

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
    const tipoPlanoNoMomento = getTipoPlanoNoMomento(student);

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
      tipoPlanoNoMomento,
      valorOriginal: valorUnitario.toFixed(2),
    });
  },

  // Migrate old records that don't have tipoPlanoNoMomento — safe, runs once, fills only null fields
  async migrarCheckinsAntigos(arenaId: string): Promise<void> {
    const registrosSemTipo = await storage.listCheckinFinanceiroSemTipoPlano(arenaId);
    for (const r of registrosSemTipo) {
      if (!r.tipoPlanoNoMomento) {
        await storage.updateCheckinFinanceiroTipoPlano(r.id, "checkin", r.valorTotal);
      }
    }
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
    const allPayments = await storage.listPayments(arenaId);
    const studentMap = new Map(allStudents.map((s) => [s.id, s]));

    const modalidadeMap = new Map<string, { modalidade: string; integrationType: string; checkins: number; receita: number; valorUnitario: number }>();
    const alunoMap = new Map<string, { nome: string; modalidade: string; integrationType: string; checkins: number; receita: number }>();

    let totalCheckins = 0;
    let receitaCheckins = 0;

    for (const r of allFinancialRecords) {
      if (r.status === "cancelado") continue;

      const recordDate = parsePtBRDate(r.dataCheckin);
      if (!isInRange(recordDate, inicio, fim)) continue;

      totalCheckins += 1;

      // Use snapshot to determine if this was a mensalista check-in — mensalistas don't generate check-in revenue
      const tipoPlano = r.tipoPlanoNoMomento ?? "checkin";
      if (tipoPlano === "mensalista") continue;

      const valor = parseFloat(r.valorTotal || "0");
      const integrationType = r.integrationType ?? "none";
      receitaCheckins += valor;

      if (valor > 0) {
        const mod = r.modalidade;
        const key = `${mod}|${integrationType}`;
        if (!modalidadeMap.has(key)) {
          modalidadeMap.set(key, { modalidade: mod, integrationType, checkins: 0, receita: 0, valorUnitario: valor });
        }
        const entry = modalidadeMap.get(key)!;
        entry.checkins += 1;
        entry.receita += valor;
        entry.valorUnitario = valor;
      }

      const sid = r.studentId!;
      if (!alunoMap.has(sid)) {
        const student = studentMap.get(sid);
        alunoMap.set(sid, {
          nome: student?.nome ?? "—",
          modalidade: r.modalidade,
          integrationType,
          checkins: 0,
          receita: 0,
        });
      }
      alunoMap.get(sid)!.checkins += 1;
      alunoMap.get(sid)!.receita += valor;
    }

    // Mensalidade revenue: paid payments in the period
    const now = new Date();
    const receitaMensalidades = allPayments
      .filter((p) => {
        if (p.status !== "paid") return false;
        if (!p.paymentDate) return false;
        const pDate = parsePtBRDate(p.paymentDate);
        return isInRange(pDate, inicio, fim);
      })
      .reduce((acc, p) => acc + parseFloat(p.amount.replace(/[^0-9.]/g, "") || "0"), 0);

    return {
      totalCheckins,
      receitaTotal: receitaCheckins + receitaMensalidades,
      receitaCheckins,
      receitaMensalidades,
      porModalidade: Array.from(modalidadeMap.values())
        .sort((a, b) => b.receita - a.receita),
      porAluno: Array.from(alunoMap.entries())
        .map(([studentId, v]) => ({ studentId, ...v }))
        .sort((a, b) => b.receita - a.receita),
    };
  },

  async getReceitaPorModalidade(
    arenaId: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<ReceitaPeriodo["porModalidade"]> {
    const result = await financeService.getReceitaTotalPeriodo(arenaId, dataInicio, dataFim);
    return result.porModalidade;
  },

  async getTotalCheckins(
    arenaId: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<number> {
    const result = await financeService.getReceitaTotalPeriodo(arenaId, dataInicio, dataFim);
    return result.totalCheckins;
  },

  async getReceitaPorAluno(arenaId: string, studentId: string): Promise<ReceitaAluno> {
    const [records, student, modalidadeSetting, studentPayments, studentCharges] = await Promise.all([
      storage.listCheckinFinanceiroByStudent(studentId),
      storage.getStudent(studentId),
      storage.getStudent(studentId).then((s) =>
        s ? storage.getModalidadeSetting(arenaId, s.modalidade) : undefined
      ),
      storage.listStudentPayments(studentId),
      storage.listStudentCharges(studentId),
    ]);

    const integrationType = student?.integrationType ?? "none";
    const integrationPlan = student?.integrationPlan ?? null;

    // Only count active check-in records from students that were in checkin mode at the time
    const activeCheckinRecords = records.filter((r) => {
      if (r.status === "cancelado") return false;
      const tipoPlano = r.tipoPlanoNoMomento ?? "checkin";
      return tipoPlano !== "mensalista";
    });

    const valorUnitario = student && modalidadeSetting
      ? getValorCheckin(modalidadeSetting, student)
      : 0;

    const checkins = activeCheckinRecords.length;
    const receitaCheckins = activeCheckinRecords.reduce((acc, r) => acc + parseFloat(r.valorTotal || "0"), 0);

    const receitaMensalidades = studentPayments
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + parseFloat(p.amount || "0"), 0);

    const receitaCobranças = studentCharges
      .filter((c) => c.status === "paid")
      .reduce((acc, c) => acc + parseFloat(c.amount || "0"), 0);

    const receitaTotal = receitaCheckins + receitaMensalidades + receitaCobranças;

    return {
      studentId,
      nome: student?.nome ?? "—",
      modalidade: student?.modalidade ?? "—",
      integrationType,
      integrationPlan,
      checkins,
      valorUnitario,
      receitaTotal,
      receitaCheckins,
      receitaMensalidades,
      receitaCobranças,
    };
  },
};
