import { eq, and } from "drizzle-orm";
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

  async updateArena(id: string, data: any) {
    const [arena] = await db.update(arenas).set(data).where(eq(arenas.id, id)).returning();
    return arena;
  }

  async deleteArena(id: string) {
    await db.delete(arenas).where(eq(arenas.id, id));
  }

  // PLATFORM PLANS
  async listPlatformPlans() {
    return db.select().from(platformPlans);
  }

  async upsertPlatformPlan(data: { planType: string; monthlyValue: string }) {
    const [plan] = await db
      .insert(platformPlans)
      .values(data)
      .onConflictDoUpdate({ target: platformPlans.planType, set: { monthlyValue: data.monthlyValue } })
      .returning();
    return plan;
  }

  // ARENA SUBSCRIPTION PAYMENTS
  async listArenaSubscriptionPayments() {
    return db.select().from(arenaSubscriptionPayments);
  }

  async createArenaSubscriptionPayment(data: any) {
    const [payment] = await db.insert(arenaSubscriptionPayments).values(data).returning();
    return payment;
  }

  // PLANS
  async listPlans(arenaId: string) {
    return db.select().from(plans).where(eq(plans.arenaId, arenaId));
  }

  async getPlan(id: string) {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async createPlan(data: any) {
    const [plan] = await db.insert(plans).values(data).returning();
    return plan;
  }

  async updatePlan(id: string, data: any) {
    const [plan] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return plan;
  }

  async deletePlan(id: string) {
    await db.delete(plans).where(eq(plans.id, id));
  }

  // TEACHERS
  async listTeachers(arenaId: string) {
    return db.select().from(teachers).where(eq(teachers.arenaId, arenaId));
  }

  async getTeacher(id: string) {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
    return teacher;
  }

  async getTeacherByLogin(arenaId: string, login: string) {
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(and(eq(teachers.arenaId, arenaId), eq(teachers.login, login)));
    return teacher;
  }

  async createTeacher(data: any) {
    const [teacher] = await db.insert(teachers).values(data).returning();
    return teacher;
  }

  async updateTeacher(id: string, data: any) {
    const [teacher] = await db.update(teachers).set(data).where(eq(teachers.id, id)).returning();
    return teacher;
  }

  async deleteTeacher(id: string) {
    await db.delete(teachers).where(eq(teachers.id, id));
  }

  // STUDENTS
  async listStudents(arenaId: string) {
    return db.select().from(students).where(eq(students.arenaId, arenaId));
  }

  async getStudent(id: string) {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByLogin(arenaId: string, login: string) {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.arenaId, arenaId), eq(students.login, login)));
    return student;
  }

  async createStudent(data: any) {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  async updateStudent(id: string, data: any) {
    const [student] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return student;
  }

  async deleteStudent(id: string) {
    await db.delete(students).where(eq(students.id, id));
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

      const config = await this.getModalidadeSetting(student.arenaId, student.modalidade);
      if (!config) return entry;

      let valor = config.valorPorCheckin;
      if (student.integrationType === "wellhub") valor = config.wellhubValorCheckin;
      if (student.integrationType === "totalpass") valor = config.totalpassValorCheckin;

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

  async updateCheckinByIndex(studentId: string, index: number, data: string, hora: string) {
    const list = await db.select().from(checkinHistory).where(eq(checkinHistory.studentId, studentId));
    if (list[index]) {
      await db.update(checkinHistory).set({ data, hora }).where(eq(checkinHistory.id, list[index].id));
    }
  }

  async removeCheckinByIndex(studentId: string, index: number) {
    const list = await db.select().from(checkinHistory).where(eq(checkinHistory.studentId, studentId));
    if (list[index]) {
      await db.delete(checkinHistory).where(eq(checkinHistory.id, list[index].id));
    }
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

  async cancelCheckinFinanceiro(checkinId: string) {
    await db
      .update(checkinFinanceiro)
      .set({ status: "cancelado" })
      .where(eq(checkinFinanceiro.checkinId, checkinId));
  }

  // PAYMENTS
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
    const [p] = await db
      .update(payments)
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

  async listStudentCharges(studentId: string) {
    return db.select().from(charges).where(eq(charges.studentId, studentId));
  }

  async createCharge(data: any) {
    const [c] = await db.insert(charges).values(data).returning();
    return c;
  }

  async updateChargeStatus(id: string, status: string, paymentDate?: string) {
    const [c] = await db
      .update(charges)
      .set({ status, paymentDate })
      .where(eq(charges.id, id))
      .returning();
    return c;
  }

  async deleteCharge(id: string) {
    await db.delete(charges).where(eq(charges.id, id));
  }

  // PAYMENT SETTINGS (PIX)
  async getPaymentSettings(tenantId: string) {
    const [settings] = await db.select().from(paymentSettings).where(eq(paymentSettings.tenantId, tenantId));
    return settings;
  }

  async upsertPaymentSettings(data: any) {
    const [settings] = await db
      .insert(paymentSettings)
      .values(data)
      .onConflictDoUpdate({
        target: paymentSettings.tenantId,
        set: { receiverName: data.receiverName, pixKey: data.pixKey, pixQrcodeImage: data.pixQrcodeImage },
      })
      .returning();
    return settings;
  }

  // MODALIDADE SETTINGS
  async listModalidadeSettings(arenaId: string) {
    return db.select().from(modalidadeSettings).where(eq(modalidadeSettings.arenaId, arenaId));
  }

  async getModalidadeSetting(arenaId: string, modalidade: string) {
    const [config] = await db
      .select()
      .from(modalidadeSettings)
      .where(and(eq(modalidadeSettings.arenaId, arenaId), eq(modalidadeSettings.modalidade, modalidade)));
    return config;
  }

  async upsertModalidadeSetting(data: any) {
    const existing = await this.getModalidadeSetting(data.arenaId, data.modalidade);
    if (existing) {
      const [updated] = await db
        .update(modalidadeSettings)
        .set(data)
        .where(eq(modalidadeSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(modalidadeSettings).values(data).returning();
    return created;
  }

  // INTEGRATION PLANS
  async listIntegrationPlans(arenaId: string) {
    return db.select().from(integrationPlans).where(eq(integrationPlans.arenaId, arenaId));
  }

  async createIntegrationPlan(data: any) {
    const [plan] = await db.insert(integrationPlans).values(data).returning();
    return plan;
  }

  async updateIntegrationPlan(id: string, data: any) {
    const [plan] = await db.update(integrationPlans).set(data).where(eq(integrationPlans.id, id)).returning();
    return plan;
  }

  async deleteIntegrationPlan(id: string) {
    await db.delete(integrationPlans).where(eq(integrationPlans.id, id));
  }

  // INTEGRATION SETTINGS
  async getIntegrationSettings(arenaId: string, provider: string) {
    const [settings] = await db
      .select()
      .from(integrationSettings)
      .where(and(eq(integrationSettings.arenaId, arenaId), eq(integrationSettings.provider, provider)));
    return settings;
  }

  async upsertIntegrationSettings(data: any) {
    const existing = await this.getIntegrationSettings(data.arenaId, data.provider);
    if (existing) {
      const [updated] = await db
        .update(integrationSettings)
        .set(data)
        .where(eq(integrationSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(integrationSettings).values(data).returning();
    return created;
  }

}

export const storage = new DatabaseStorage();
