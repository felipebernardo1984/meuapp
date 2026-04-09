import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users, arenas, plans, teachers, students, checkinHistory,
  payments, charges, messageSettings, paymentSettings,
  platformPlans, arenaSubscriptionPayments, modalidadeSettings,
  checkinFinanceiro, integrationPlans, integrationSettings,
} from "@shared/schema";

export class DatabaseStorage {

  // USERS
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(data: any) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  // ARENAS
  async listArenas() {
    return db.select().from(arenas);
  }

  async getArena(id: string) {
    const [arena] = await db.select().from(arenas).where(eq(arenas.id, id));
    return arena;
  }

  async getArenaByGestorLogin(login: string) {
    const [arena] = await db.select().from(arenas).where(eq(arenas.gestorLogin, login));
    return arena;
  }

  async createArena(data: any) {
    const [arena] = await db.insert(arenas).values(data).returning();
    return arena;
  }

  // STUDENTS
  async listStudents(arenaId: string) {
    return db.select().from(students).where(eq(students.arenaId, arenaId));
  }

  async getStudent(id: string) {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async createStudent(data: any) {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  // CHECKINS
  async listCheckins(studentId: string) {
    return db.select().from(checkinHistory).where(eq(checkinHistory.studentId, studentId));
  }

  async addCheckin(data: any) {
    const [entry] = await db.insert(checkinHistory).values(data).returning();

    try {
      const student = await this.getStudent(data.studentId);
      if (!student) return entry;

      const config = await this.getModalidadeSetting(
        student.arenaId,
        student.modalidade
      );

      if (!config) return entry;

      let valor = config.valorPorCheckin;

      if (student.integrationType === "wellhub") {
        valor = config.wellhubValorCheckin;
      }

      if (student.integrationType === "totalpass") {
        valor = config.totalpassValorCheckin;
      }

      await this.createCheckinFinanceiro({
        arenaId: student.arenaId,
        studentId: student.id,
        checkinId: entry.id,
        modalidade: student.modalidade,
        integrationType: student.integrationType || "none",
        valorUnitario: valor,
        valorTotal: valor,
        dataCheckin: data.data,
        status: "ativo",
      });

    } catch (err) {
      console.error("Erro financeiro checkin:", err);
    }

    return entry;
  }

  // FINANCEIRO CHECKIN
  async createCheckinFinanceiro(data: any) {
    const [row] = await db.insert(checkinFinanceiro).values(data).returning();
    return row;
  }

  async listCheckinFinanceiro(arenaId: string) {
    return db.select().from(checkinFinanceiro).where(eq(checkinFinanceiro.arenaId, arenaId));
  }

  async listCheckinFinanceiroByStudent(studentId: string) {
    return db.select().from(checkinFinanceiro).where(eq(checkinFinanceiro.studentId, studentId));
  }

  // PAYMENTS (🔥 CORREÇÃO DO ERRO)
  async listPayments(tenantId: string) {
    return db.select().from(payments).where(eq(payments.tenantId, tenantId));
  }

  async listStudentPayments(studentId: string) {
    return db.select().from(payments).where(eq(payments.studentId, studentId));
  }

  async createPayment(data: any) {
    const [p] = await db.insert(payments).values(data).returning();
    return p;
  }

  async updatePaymentStatus(id: string, status: string, paymentDate?: string) {
    const [p] = await db.update(payments)
      .set({ status, paymentDate })
      .where(eq(payments.id, id))
      .returning();

    return p;
  }

  async deletePayment(id: string) {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // CHARGES
  async listCharges(tenantId: string) {
    return db.select().from(charges).where(eq(charges.tenantId, tenantId));
  }

  async createCharge(data: any) {
    const [c] = await db.insert(charges).values(data).returning();
    return c;
  }

  // MODALIDADE
  async getModalidadeSetting(arenaId: string, modalidade: string) {
    const [config] = await db
      .select()
      .from(modalidadeSettings)
      .where(eq(modalidadeSettings.arenaId, arenaId));

    return config;
  }

}
export const storage = new DatabaseStorage();