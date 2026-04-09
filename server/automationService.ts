import { storage } from "./storage";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface PaymentNearDueItem {
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

export interface LowFrequencyStudentItem {
  studentId: string;
  studentName: string;
  arenaId: string;
  integrationType: string;
  planoCheckins: number;
  checkinsLast30Days: number;
  expectedCheckins30Days: number;
  lastCheckinDate: string | null;
  daysSinceLastCheckin: number | null;
}

export interface AutomationReport {
  generatedAt: string;
  arenaId: string;
  paymentsNearDue: PaymentNearDueItem[];
  overduePayments: OverduePaymentItem[];
  lowFrequencyStudents: LowFrequencyStudentItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseBrDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

function diffDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

function isCheckinStudent(integrationType: string): boolean {
  return integrationType === "wellhub" || integrationType === "totalpass";
}

// ── Service ───────────────────────────────────────────────────────────────────

export const automationService = {
  async analyzeArena(
    arenaId: string,
    options: {
      nearDueDaysThreshold?: number;
      lowFrequencyThresholdPct?: number;
    } = {}
  ): Promise<AutomationReport> {
    const nearDueDaysThreshold = options.nearDueDaysThreshold ?? 3;

    // Flag a check-in student if they've done less than this % of expected check-ins
    const lowFrequencyThresholdPct = options.lowFrequencyThresholdPct ?? 50;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoff30Days = new Date(today);
    cutoff30Days.setDate(cutoff30Days.getDate() - 30);

    const [students, payments] = await Promise.all([
      storage.listStudents(arenaId),
      storage.listPayments(arenaId),
    ]);

    const studentMap = new Map(students.map((s) => [s.id, s]));

    // ── 1. Mensalistas: payment alerts ────────────────────────────────────────
    //    Only students with integrationType === "none" pay mensalidades.

    const paymentsNearDue: PaymentNearDueItem[] = [];
    const overduePayments: OverduePaymentItem[] = [];

    for (const payment of payments) {
      if (payment.status === "paid") continue;

      const student = studentMap.get(payment.studentId);
      if (!student) continue;

      // Skip integration students — they don't generate mensalidade payments
      if (isCheckinStudent(student.integrationType)) continue;

      const due = parseBrDate(payment.dueDate);
      if (!due) continue;

      const days = diffDays(today, due);
      const studentName = student.nome;

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

    // ── 2. Check-in students: low frequency ───────────────────────────────────
    //    Only students with integrationType wellhub/totalpass are check-in based.
    //    Expected frequency is derived from their plan's check-in limit per month.
    //    If the plan has no limit (planoCheckins === 0), use a default of 4/month.

    const lowFrequencyStudents: LowFrequencyStudentItem[] = [];

    const checkinStudents = students.filter((s) =>
      isCheckinStudent(s.integrationType)
    );

    for (const student of checkinStudents) {
      const checkins = await storage.listCheckins(student.id);

      const checkinsLast30Days = checkins.filter((c) => {
        const d = parseBrDate(c.data);
        return d !== null && d >= cutoff30Days && d <= today;
      }).length;

      const planoCheckins = student.planoCheckins ?? 0;
      const expectedCheckins30Days = planoCheckins > 0 ? planoCheckins : 4;

      const pct =
        expectedCheckins30Days > 0
          ? (checkinsLast30Days / expectedCheckins30Days) * 100
          : 100;

      if (pct < lowFrequencyThresholdPct) {
        const lastCheckin = student.ultimoCheckin ?? null;
        const lastCheckinDate = lastCheckin ? parseBrDate(lastCheckin) : null;
        const daysSinceLastCheckin =
          lastCheckinDate !== null ? diffDays(lastCheckinDate, today) : null;

        lowFrequencyStudents.push({
          studentId: student.id,
          studentName: student.nome,
          arenaId,
          integrationType: student.integrationType,
          planoCheckins,
          checkinsLast30Days,
          expectedCheckins30Days,
          lastCheckinDate: lastCheckin,
          daysSinceLastCheckin,
        });
      }
    }

    // ── Sort results by urgency ───────────────────────────────────────────────

    paymentsNearDue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    overduePayments.sort((a, b) => b.daysOverdue - a.daysOverdue);
    lowFrequencyStudents.sort(
      (a, b) => a.checkinsLast30Days - b.checkinsLast30Days
    );

    return {
      generatedAt: new Date().toISOString(),
      arenaId,
      paymentsNearDue,
      overduePayments,
      lowFrequencyStudents,
    };
  },
};
