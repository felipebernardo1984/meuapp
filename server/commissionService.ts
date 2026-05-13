import { storage } from "./storage";

export async function calcularComissao(
  arenaId: string,
  checkinId: string,
  teacherId: string,
  studentId: string,
  valorCheckin: string,
  data: string
): Promise<void> {
  try {
    const teacher = await storage.getTeacher(teacherId);
    if (!teacher) return;

    const percentual = parseFloat(teacher.percentualComissao ?? "0") || 0;
    const valor = parseFloat(valorCheckin) || 0;
    const valorComissao = ((valor * percentual) / 100).toFixed(2);

    const existing = await storage.getCommissionByCheckinId(checkinId);
    if (existing) return;

    await storage.createCommission({
      arenaId,
      teacherId,
      checkinId,
      studentId,
      valorCheckin: valor.toFixed(2),
      percentual: percentual.toFixed(2),
      valorComissao,
      status: "pendente",
      tipo: "checkin",
      data,
    });
  } catch (err) {
    console.error("Erro ao calcular comissão:", err);
  }
}

export async function calcularComissaoMensalidade(
  arenaId: string,
  paymentId: string,
  teacherId: string,
  studentId: string,
  valorPagamento: string,
  data: string
): Promise<void> {
  try {
    const teacher = await storage.getTeacher(teacherId);
    if (!teacher) return;

    const percentual = parseFloat(teacher.percentualComissao ?? "0") || 0;
    if (percentual === 0) return;

    const valor = parseFloat(valorPagamento.replace(/[^0-9.]/g, "")) || 0;
    const valorComissao = ((valor * percentual) / 100).toFixed(2);

    const existing = await storage.getCommissionByPaymentId(paymentId);
    if (existing) return;

    await storage.createCommission({
      arenaId,
      teacherId,
      paymentId,
      studentId,
      valorCheckin: valor.toFixed(2),
      percentual: percentual.toFixed(2),
      valorComissao,
      status: "pendente",
      tipo: "mensalidade",
      data,
    });
  } catch (err) {
    console.error("Erro ao calcular comissão de mensalidade:", err);
  }
}

export async function getResumoPorProfessor(arenaId: string) {
  const commissions = await storage.listCommissionsByArena(arenaId);
  const teachers = await storage.listTeachers(arenaId);

  const map = new Map<string, {
    teacherId: string;
    nome: string;
    percentual: string;
    totalCheckins: number;
    totalReceita: number;
    totalComissao: number;
    pendente: number;
    aprovado: number;
  }>();

  for (const t of teachers) {
    map.set(t.id, {
      teacherId: t.id,
      nome: t.nome,
      percentual: t.percentualComissao ?? "0.00",
      totalCheckins: 0,
      totalReceita: 0,
      totalComissao: 0,
      pendente: 0,
      aprovado: 0,
    });
  }

  for (const c of commissions) {
    if (c.status === "cancelado") continue;
    const entry = map.get(c.teacherId ?? "");
    if (!entry) continue;
    entry.totalCheckins += 1;
    entry.totalReceita += parseFloat(c.valorCheckin) || 0;
    entry.totalComissao += parseFloat(c.valorComissao) || 0;
    if (c.status === "pendente") entry.pendente += 1;
    if (c.status === "aprovado" || c.status === "editado") entry.aprovado += 1;
  }

  return Array.from(map.values());
}
