import { storage } from "./storage";
import { sendNotification } from "./notificationService";

export type FrequenciaStatus = "normal" | "baixa";

const LOW_FREQUENCY_THRESHOLD_PCT = 50;
const DEFAULT_EXPECTED_CHECKINS = 4;

const MENSAGEM_BAIXA_FREQUENCIA =
  "Sentimos sua falta! Você quase não tem vindo treinar. Que tal voltar essa semana? 💪";

function parseBrDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

/**
 * Determines the check-in frequency status of a student over the last 30 days.
 *
 * Uses the same logic as the daily automation job:
 *   - Expected check-ins = planoCheckins if > 0, otherwise 4 per month
 *   - "baixa" if the student completed < 50% of expected check-ins
 *   - "normal" otherwise
 *
 * When status is "baixa", a friendly notification is sent via notificationService
 * (fire-and-forget — never blocks the caller).
 */
export async function getFrequenciaStatus(alunoId: string): Promise<FrequenciaStatus> {
  const student = await storage.getStudent(alunoId);
  if (!student) return "normal";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cutoff30Days = new Date(today);
  cutoff30Days.setDate(cutoff30Days.getDate() - 30);

  const checkins = await storage.listCheckins(alunoId);

  const checkinsLast30Days = checkins.filter((c) => {
    const d = parseBrDate(c.data);
    return d !== null && d >= cutoff30Days && d <= today;
  }).length;

  const planoCheckins = student.planoCheckins ?? 0;
  const expectedCheckins = planoCheckins > 0 ? planoCheckins : DEFAULT_EXPECTED_CHECKINS;

  const pct = (checkinsLast30Days / expectedCheckins) * 100;
  const status: FrequenciaStatus = pct < LOW_FREQUENCY_THRESHOLD_PCT ? "baixa" : "normal";

  if (status === "baixa") {
    sendNotification(
      { id: student.id, nome: student.nome, telefone: student.telefone, email: student.email },
      MENSAGEM_BAIXA_FREQUENCIA
    ).catch(() => {});
  }

  return status;
}
