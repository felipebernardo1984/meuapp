import { storage } from "./storage";

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

    await storage.createCheckinFinanceiro({
      arenaId,
      checkinId,
      studentId,
      modalidade,
      valorUnitario: valorUnitario.toFixed(2),
      valorTotal: valorUnitario.toFixed(2),
      dataCheckin,
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

    // Track which students already have financial records
    const studentsWithFinancialRecords = new Set(
      allFinancialRecords.map((r) => r.studentId).filter(Boolean) as string[]
    );

    const modalidadeMap = new Map<string, { checkins: number; receita: number }>();
    const alunoMap = new Map<string, { nome: string; modalidade: string; checkins: number; receita: number }>();

    let totalCheckins = 0;
    let receitaTotal = 0;

    // Process financial records (new check-ins with snapshots)
    for (const r of allFinancialRecords) {
      // Filter by createdAt timestamp
      const recordDate = r.createdAt ? new Date(r.createdAt) : null;
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
        alunoMap.set(sid, { nome: student?.nome ?? "—", modalidade: mod, checkins: 0, receita: 0 });
      }
      alunoMap.get(sid)!.checkins += 1;
      alunoMap.get(sid)!.receita += valor;
    }

    // For students WITHOUT financial records, fall back to checkin_history
    const studentsWithoutFinancial = allStudents.filter(
      (s) => !studentsWithFinancialRecords.has(s.id)
    );

    for (const student of studentsWithoutFinancial) {
      const modalidadeSetting = await storage.getModalidadeSetting(arenaId, student.modalidade);
      const valorPorCheckin = modalidadeSetting ? parseFloat(modalidadeSetting.valorPorCheckin || "0") : 0;
      if (valorPorCheckin <= 0) continue;

      const historico = await storage.listCheckins(student.id);
      const filtered = historico.filter((h) => {
        const d = parsePtBRDate(h.data);
        return isInRange(d, inicio, fim);
      });

      if (filtered.length === 0) continue;

      const receita = filtered.length * valorPorCheckin;
      totalCheckins += filtered.length;
      receitaTotal += receita;

      const mod = student.modalidade;
      if (!modalidadeMap.has(mod)) modalidadeMap.set(mod, { checkins: 0, receita: 0 });
      modalidadeMap.get(mod)!.checkins += filtered.length;
      modalidadeMap.get(mod)!.receita += receita;

      if (!alunoMap.has(student.id)) {
        alunoMap.set(student.id, { nome: student.nome, modalidade: mod, checkins: 0, receita: 0 });
      }
      alunoMap.get(student.id)!.checkins += filtered.length;
      alunoMap.get(student.id)!.receita += receita;
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
    const records = await storage.listCheckinFinanceiroByStudent(studentId);
    const student = await storage.getStudent(studentId);

    const modalidadeSetting = student
      ? await storage.getModalidadeSetting(arenaId, student.modalidade)
      : undefined;
    const valorAtual = modalidadeSetting ? parseFloat(modalidadeSetting.valorPorCheckin || "0") : 0;

    // If financial records exist, use them (historical snapshot)
    if (records.length > 0) {
      const checkins = records.length;
      const receitaTotal = records.reduce((acc, r) => acc + parseFloat(r.valorTotal || "0"), 0);
      return {
        studentId,
        nome: student?.nome ?? "—",
        modalidade: student?.modalidade ?? "—",
        checkins,
        valorUnitario: valorAtual,
        receitaTotal,
      };
    }

    // Fall back to student.checkinsRealizados * current valorPorCheckin for legacy data
    const checkinsRealizados = student?.checkinsRealizados ?? 0;
    return {
      studentId,
      nome: student?.nome ?? "—",
      modalidade: student?.modalidade ?? "—",
      checkins: checkinsRealizados,
      valorUnitario: valorAtual,
      receitaTotal: checkinsRealizados * valorAtual,
    };
  },
};
