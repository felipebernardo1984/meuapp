import { storage } from "./storage";

export interface PaymentAlertItem {
  studentId: string;
  studentName: string;
  arenaId: string;
  paymentId: string;
  amount: string;
  dueDate: string;
  referenceMonth: string;
  daysUntilDue: number;
}

export interface OverduePaymentItem {
  studentId: string;
  studentName: string;
  arenaId: string;
  paymentId: string;
  amount: string;
  dueDate: string;
  referenceMonth: string;
  daysOverdue: number;
}

export interface InactiveStudentItem {
  studentId: string;
  studentName: string;
  arenaId: string;
  lastCheckinDate: string | null;
  daysSinceLastCheckin: number | null;
}

export interface AutomationReport {
  generatedAt: string;
  arenaId: string;
  paymentsNearDue: PaymentAlertItem[];
  overduePayments: OverduePaymentItem[];
  inactiveStudents: InactiveStudentItem[];
}

function parseBrDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function diffDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

export const automationService = {
  async analyzeArena(
    arenaId: string,
    options: {
      nearDueDaysThreshold?: number;
      inactiveDaysThreshold?: number;
    } = {}
  ): Promise<AutomationReport> {
    const nearDueDaysThreshold = options.nearDueDaysThreshold ?? 3;
    const inactiveDaysThreshold = options.inactiveDaysThreshold ?? 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [students, payments] = await Promise.all([
      storage.listStudents(arenaId),
      storage.listPayments(arenaId),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const paymentsNearDue: PaymentAlertItem[] = [];
    const overduePayments: OverduePaymentItem[] = [];

    for (const payment of payments) {
      if (payment.status === "paid") continue;

      const due = parseBrDate(payment.dueDate);
      if (!due) continue;

      const days = diffDays(today, due);
      const student = studentMap.get(payment.studentId);
      const studentName = student?.nome ?? "Desconhecido";

      if (days < 0) {
        overduePayments.push({
          studentId: payment.studentId,
          studentName,
          arenaId,
          paymentId: payment.id,
          amount: payment.amount,
          dueDate: payment.dueDate,
          referenceMonth: payment.referenceMonth,
          daysOverdue: Math.abs(days),
        });
      } else if (days <= nearDueDaysThreshold) {
        paymentsNearDue.push({
          studentId: payment.studentId,
          studentName,
          arenaId,
          paymentId: payment.id,
          amount: payment.amount,
          dueDate: payment.dueDate,
          referenceMonth: payment.referenceMonth,
          daysUntilDue: days,
        });
      }
    }

    const inactiveStudents: InactiveStudentItem[] = [];

    for (const student of students) {
      if (!student.ultimoCheckin) {
        inactiveStudents.push({
          studentId: student.id,
          studentName: student.nome,
          arenaId,
          lastCheckinDate: null,
          daysSinceLastCheckin: null,
        });
        continue;
      }

      const lastCheckin = parseBrDate(student.ultimoCheckin);
      if (!lastCheckin) continue;

      const daysSince = diffDays(lastCheckin, today);
      if (daysSince >= inactiveDaysThreshold) {
        inactiveStudents.push({
          studentId: student.id,
          studentName: student.nome,
          arenaId,
          lastCheckinDate: student.ultimoCheckin,
          daysSinceLastCheckin: daysSince,
        });
      }
    }

    paymentsNearDue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    overduePayments.sort((a, b) => b.daysOverdue - a.daysOverdue);
    inactiveStudents.sort((a, b) => {
      const da = a.daysSinceLastCheckin ?? Infinity;
      const db = b.daysSinceLastCheckin ?? Infinity;
      return db - da;
    });

    return {
      generatedAt: new Date().toISOString(),
      arenaId,
      paymentsNearDue,
      overduePayments,
      inactiveStudents,
    };
  },
};
