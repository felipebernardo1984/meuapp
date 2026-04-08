import { db } from "./db";
import { checkinFinanceiro, students } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { storage } from "./storage";
import type { InsertCheckinFinanceiro } from "@shared/schema";

export interface ReceitaPeriodo {
  totalCheckins: number;
  receitaTotal: number;
  porModalidade: Array<{ modalidade: string; checkins: number; receita: number }>;
  porAluno: Array<{ studentId: string; nome: string; modalidade: string; checkins: number; receita: number }>;
}

export interface ReceitaAluno {
  studentId: string;
  nome: string;
  modalidade: string;
  checkins: number;
  valorUnitario: number;
  receitaTotal: number;
}

function parseData(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export const financeService = {
  async calcularReceitaCheckin(
    arenaId: string,
    studentId: string,
    modalidade: string,
    checkinId: string,
    dataCheckin: string
  ): Promise<void> {
    const modalidadeSetting = await storage.getModalidadeSetting(arenaId, modalidade);
    const valorUnitario = modalidadeSetting ? parseFloat(modalidadeSetting.valorPorCheckin || "0") : 0;
    if (valorUnitario <= 0) return;

    const valorTotal = valorUnitario;
    await storage.createCheckinFinanceiro({
      arenaId,
      checkinId,
      studentId,
      modalidade,
      valorUnitario: valorUnitario.toFixed(2),
      valorTotal: valorTotal.toFixed(2),
      dataCheckin,
    });
  },

  async getReceitaTotalPeriodo(
    arenaId: string,
    dataInicio?: string,
    dataFim?: string
  ): Promise<ReceitaPeriodo> {
    const allRecords = await storage.listCheckinFinanceiro(arenaId);

    const inicio = parseData(dataInicio);
    const fim = dataFim ? parseData(dataFim) : null;

    const filtered = allRecords.filter((r) => {
      if (!inicio && !fim) return true;
      const recordDate = r.createdAt ? new Date(r.createdAt) : null;
      if (!recordDate) return true;
      if (inicio && recordDate < inicio) return false;
      if (fim) {
        const endOfDay = new Date(fim);
        endOfDay.setHours(23, 59, 59, 999);
        if (recordDate > endOfDay) return false;
      }
      return true;
    });

    const allStudents = await storage.listStudents(arenaId);
    const studentMap = new Map(allStudents.map((s) => [s.id, s]));

    const modalidadeMap = new Map<string, { checkins: number; receita: number }>();
    const alunoMap = new Map<string, { nome: string; modalidade: string; checkins: number; receita: number }>();

    let totalCheckins = 0;
    let receitaTotal = 0;

    for (const r of filtered) {
      const valor = parseFloat(r.valorTotal || "0");
      totalCheckins += 1;
      receitaTotal += valor;

      const mod = r.modalidade;
      if (!modalidadeMap.has(mod)) modalidadeMap.set(mod, { checkins: 0, receita: 0 });
      const modEntry = modalidadeMap.get(mod)!;
      modEntry.checkins += 1;
      modEntry.receita += valor;

      const sid = r.studentId!;
      if (!alunoMap.has(sid)) {
        const student = studentMap.get(sid);
        alunoMap.set(sid, { nome: student?.nome ?? "—", modalidade: mod, checkins: 0, receita: 0 });
      }
      const alunoEntry = alunoMap.get(sid)!;
      alunoEntry.checkins += 1;
      alunoEntry.receita += valor;
    }

    return {
      totalCheckins,
      receitaTotal,
      porModalidade: Array.from(modalidadeMap.entries()).map(([modalidade, v]) => ({ modalidade, ...v })).sort((a, b) => b.receita - a.receita),
      porAluno: Array.from(alunoMap.entries()).map(([studentId, v]) => ({ studentId, ...v })).sort((a, b) => b.receita - a.receita),
    };
  },

  async getReceitaPorAluno(arenaId: string, studentId: string): Promise<ReceitaAluno> {
    const records = await storage.listCheckinFinanceiroByStudent(studentId);
    const student = await storage.getStudent(studentId);

    const checkins = records.length;
    const receitaTotal = records.reduce((acc, r) => acc + parseFloat(r.valorTotal || "0"), 0);
    const valorUnitario = records.length > 0 ? parseFloat(records[0].valorUnitario || "0") : 0;

    const modalidadeSetting = student
      ? await storage.getModalidadeSetting(arenaId, student.modalidade)
      : undefined;
    const valorAtual = modalidadeSetting ? parseFloat(modalidadeSetting.valorPorCheckin || "0") : valorUnitario;

    return {
      studentId,
      nome: student?.nome ?? "—",
      modalidade: student?.modalidade ?? "—",
      checkins,
      valorUnitario: valorAtual,
      receitaTotal,
    };
  },
};
