import { storage } from "./storage";
import { sendNotification, type NotificationResult } from "./notificationService";
import { messageTemplates } from "./messageTemplates";

// 🧠 Anti-spam cache (em memória)
const notificationCache = new Map<string, number>();

function canSendNotification(key: string, intervalMs: number): boolean {
  const lastSent = notificationCache.get(key);
  const now = Date.now();

  if (lastSent && now - lastSent < intervalMs) {
    return false;
  }

  notificationCache.set(key, now);
  return true;
}

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
  notificationsSent: NotificationResult[];
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

    const paymentsNearDue: PaymentNearDueItem[] = [];
    const overduePayments: OverduePaymentItem[] = [];

    for (const payment of payments) {
      if (payment.status === "paid") continue;
      if (!payment.studentId) continue;

      const student = studentMap.get(payment.studentId);
      if (!student) continue;

      if (isCheckinStudent(student.integrationType)) continue;

      const due = parseBrDate(payment.dueDate);
      if (!due) continue;

      const days = diffDays(today, due);
      const studentName = student.nome;
      const studentId = payment.studentId;

      if (days < 0) {
        overduePayments.push({
          studentId,
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
          studentId,
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

    paymentsNearDue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    overduePayments.sort((a, b) => b.daysOverdue - a.daysOverdue);
    lowFrequencyStudents.sort(
      (a, b) => a.checkinsLast30Days - b.checkinsLast30Days
    );

    const notificationsSent: NotificationResult[] = [];

    // 🔔 Vencimento (3 dias)
    for (const item of paymentsNearDue) {
      const student = studentMap.get(item.studentId);
      if (!student) continue;

      const key = `${student.id}-dueSoon`;
      if (!canSendNotification(key, 3 * 24 * 60 * 60 * 1000)) continue;

      const when =
        item.daysUntilDue === 0
          ? "hoje"
          : `em ${item.daysUntilDue} dia(s)`;

      const mensagem = messageTemplates.dueSoonMessage
        .replace("{{nome}}", student.nome)
        .replace("{{valor}}", `R$ ${item.amount}`)
        .replace("{{mes}}", item.referenceMonth)
        .replace("{{quando}}", when);

      const result = await sendNotification(
        {
          id: student.id,
          nome: student.nome,
          telefone: student.telefone,
          email: student.email,
        },
        mensagem
      );

      notificationsSent.push(result);
    }

    // 🔴 Inadimplente (3 dias)
    for (const item of overduePayments) {
      const student = studentMap.get(item.studentId);
      if (!student) continue;

      const key = `${student.id}-overdue`;
      if (!canSendNotification(key, 3 * 24 * 60 * 60 * 1000)) continue;

      const mensagem = messageTemplates.overdueMessage
        .replace("{{nome}}", student.nome);

      const result = await sendNotification(
        {
          id: student.id,
          nome: student.nome,
          telefone: student.telefone,
          email: student.email,
        },
        mensagem
      );

      notificationsSent.push(result);
    }

    // 🔵 Baixa frequência (7 dias)
    for (const item of lowFrequencyStudents) {
      const student = studentMap.get(item.studentId);
      if (!student) continue;

      const key = `${student.id}-lowFrequency`;
      if (!canSendNotification(key, 7 * 24 * 60 * 60 * 1000)) continue;

      const mensagem = messageTemplates.lowFrequencyMessage
        .replace("{{nome}}", student.nome);

      const result = await sendNotification(
        {
          id: student.id,
          nome: student.nome,
          telefone: student.telefone,
          email: student.email,
        },
        mensagem
      );

      notificationsSent.push(result);
    }

    return {
      generatedAt: new Date().toISOString(),
      arenaId,
      paymentsNearDue,
      overduePayments,
      lowFrequencyStudents,
      notificationsSent,
    };
  },
};