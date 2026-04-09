import { storage } from "./storage";

export type FinancialStatus = "inadimplente" | "ativo";

/**
 * Determines the financial status of a student within a given arena.
 *
 * - Wellhub / TotalPass students are always "ativo" (handled externally).
 * - Mensalistas (integrationType "none") are "inadimplente" if any payment
 *   is overdue (status "overdue", or status "pending" with a past due date).
 *
 * Does not persist anything — purely a read-only calculation.
 */
export async function getFinancialStatus(
  alunoId: string,
  arenaId: string
): Promise<FinancialStatus> {
  const student = await storage.getStudent(alunoId);

  if (!student) return "ativo";

  if (student.integrationType === "wellhub" || student.integrationType === "totalpass") {
    return "ativo";
  }

  const payments = await storage.listStudentPayments(alunoId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasOverdue = payments
    .filter((p) => p.tenantId === arenaId)
    .some((p) => {
      if (p.status === "overdue") return true;
      if (p.status === "pending") {
        const due = new Date(p.dueDate + "T00:00:00");
        return due < today;
      }
      return false;
    });

  return hasOverdue ? "inadimplente" : "ativo";
}
