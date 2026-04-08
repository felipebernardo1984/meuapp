import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  users, arenas, plans, teachers, students, checkinHistory,
  payments, charges, paymentSettings, platformPlans, arenaSubscriptionPayments, modalidadeSettings,
  checkinFinanceiro, integrationPlans, integrationSettings,
  type User, type InsertUser,
  type Arena, type InsertArena,
  type Plan, type InsertPlan,
  type Teacher, type InsertTeacher,
  type Student, type InsertStudent,
  type CheckinEntry, type InsertCheckin,
  type Payment, type InsertPayment,
  type Charge, type InsertCharge,
  type PaymentSettings, type InsertPaymentSettings,
  type PlatformPlan, type InsertPlatformPlan,
  type ArenaSubscriptionPayment, type InsertArenaSubscriptionPayment,
  type ModalidadeSettings, type InsertModalidadeSettings,
  type CheckinFinanceiro, type InsertCheckinFinanceiro,
  type IntegrationPlan, type InsertIntegrationPlan,
  type IntegrationSettings, type InsertIntegrationSettings,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Arenas
  listArenas(): Promise<Arena[]>;
  getArena(id: string): Promise<Arena | undefined>;
  getArenaByGestorLogin(login: string): Promise<Arena | undefined>;
  createArena(arena: InsertArena): Promise<Arena>;
  updateArena(id: string, data: Partial<InsertArena>): Promise<Arena>;
  deleteArena(id: string): Promise<void>;

  // Platform Plans (admin-defined prices)
  listPlatformPlans(): Promise<PlatformPlan[]>;
  upsertPlatformPlan(data: InsertPlatformPlan): Promise<PlatformPlan>;

  // Arena Subscription Payments
  listArenaSubscriptionPayments(): Promise<ArenaSubscriptionPayment[]>;
  createArenaSubscriptionPayment(data: InsertArenaSubscriptionPayment): Promise<ArenaSubscriptionPayment>;

  // Plans
  listPlans(arenaId: string): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: string): Promise<void>;

  // Teachers
  listTeachers(arenaId: string): Promise<Teacher[]>;
  getTeacher(id: string): Promise<Teacher | undefined>;
  getTeacherByLogin(arenaId: string, login: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: string, data: Partial<InsertTeacher>): Promise<Teacher>;
  deleteTeacher(id: string): Promise<void>;

  // Students
  listStudents(arenaId: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByLogin(arenaId: string, login: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, data: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  // Checkin History
  listCheckins(studentId: string): Promise<CheckinEntry[]>;
  addCheckin(checkin: InsertCheckin): Promise<CheckinEntry>;
  removeCheckin(id: string): Promise<void>;
  removeCheckinByIndex(studentId: string, index: number): Promise<void>;

  // Payments
  listPayments(tenantId: string): Promise<Payment[]>;
  listStudentPayments(studentId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: string, status: string, paymentDate?: string): Promise<Payment>;
  deletePayment(id: string): Promise<void>;

  // Charges
  listCharges(tenantId: string): Promise<Charge[]>;
  listStudentCharges(studentId: string): Promise<Charge[]>;
  createCharge(charge: InsertCharge): Promise<Charge>;
  updateChargeStatus(id: string, status: string, paymentDate?: string): Promise<Charge>;
  deleteCharge(id: string): Promise<void>;

  // Payment Settings
  getPaymentSettings(tenantId: string): Promise<PaymentSettings | undefined>;
  upsertPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings>;

  // Modalidade Settings (valor por check-in)
  listModalidadeSettings(arenaId: string): Promise<ModalidadeSettings[]>;
  getModalidadeSetting(arenaId: string, modalidade: string): Promise<ModalidadeSettings | undefined>;
  upsertModalidadeSetting(data: InsertModalidadeSettings): Promise<ModalidadeSettings>;

  // Checkin Financeiro
  createCheckinFinanceiro(data: InsertCheckinFinanceiro): Promise<CheckinFinanceiro>;
  listCheckinFinanceiro(arenaId: string): Promise<CheckinFinanceiro[]>;
  listCheckinFinanceiroByStudent(studentId: string): Promise<CheckinFinanceiro[]>;

  // Integration Plans
  listIntegrationPlans(arenaId: string): Promise<IntegrationPlan[]>;
  createIntegrationPlan(data: InsertIntegrationPlan): Promise<IntegrationPlan>;
  updateIntegrationPlan(id: string, data: Partial<InsertIntegrationPlan>): Promise<IntegrationPlan>;
  deleteIntegrationPlan(id: string): Promise<void>;

  // Integration Settings
  getIntegrationSettings(arenaId: string, provider: string): Promise<IntegrationSettings | undefined>;
  upsertIntegrationSettings(data: InsertIntegrationSettings): Promise<IntegrationSettings>;
}

export class DatabaseStorage implements IStorage {
  // ── Users ─────────────────────────────────────────────────────────────────
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // ── Arenas ────────────────────────────────────────────────────────────────
  async listArenas(): Promise<Arena[]> {
    return db.select().from(arenas).orderBy(arenas.createdAt);
  }

  async getArena(id: string): Promise<Arena | undefined> {
    const [arena] = await db.select().from(arenas).where(eq(arenas.id, id));
    return arena;
  }

  async getArenaByGestorLogin(login: string): Promise<Arena | undefined> {
    const [arena] = await db.select().from(arenas).where(eq(arenas.gestorLogin, login));
    return arena;
  }

  async createArena(data: InsertArena): Promise<Arena> {
    const [arena] = await db.insert(arenas).values(data).returning();
    return arena;
  }

  async updateArena(id: string, data: Partial<InsertArena>): Promise<Arena> {
    const [arena] = await db
      .update(arenas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(arenas.id, id))
      .returning();
    return arena;
  }

  async deleteArena(id: string): Promise<void> {
    await db.delete(arenas).where(eq(arenas.id, id));
  }

  // ── Platform Plans ────────────────────────────────────────────────────────
  async listPlatformPlans(): Promise<PlatformPlan[]> {
    return db.select().from(platformPlans);
  }

  async upsertPlatformPlan(data: InsertPlatformPlan): Promise<PlatformPlan> {
    const [plan] = await db
      .insert(platformPlans)
      .values(data)
      .onConflictDoUpdate({ target: platformPlans.planType, set: { monthlyValue: data.monthlyValue } })
      .returning();
    return plan;
  }

  // ── Arena Subscription Payments ────────────────────────────────────────────
  async listArenaSubscriptionPayments(): Promise<ArenaSubscriptionPayment[]> {
    return db.select().from(arenaSubscriptionPayments).orderBy(arenaSubscriptionPayments.createdAt);
  }

  async createArenaSubscriptionPayment(data: InsertArenaSubscriptionPayment): Promise<ArenaSubscriptionPayment> {
    const [payment] = await db.insert(arenaSubscriptionPayments).values(data).returning();
    return payment;
  }

  // ── Plans ─────────────────────────────────────────────────────────────────
  async listPlans(arenaId: string): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.arenaId, arenaId));
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async createPlan(data: InsertPlan): Promise<Plan> {
    const [plan] = await db.insert(plans).values(data).returning();
    return plan;
  }

  async updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan> {
    const [plan] = await db.update(plans).set(data).where(eq(plans.id, id)).returning();
    return plan;
  }

  async deletePlan(id: string): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  // ── Teachers ──────────────────────────────────────────────────────────────
  async listTeachers(arenaId: string): Promise<Teacher[]> {
    return db.select().from(teachers).where(eq(teachers.arenaId, arenaId));
  }

  async getTeacher(id: string): Promise<Teacher | undefined> {
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, id));
    return teacher;
  }

  async getTeacherByLogin(arenaId: string, login: string): Promise<Teacher | undefined> {
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(and(eq(teachers.arenaId, arenaId), eq(teachers.login, login)));
    return teacher;
  }

  async createTeacher(data: InsertTeacher): Promise<Teacher> {
    const [teacher] = await db.insert(teachers).values(data).returning();
    return teacher;
  }

  async updateTeacher(id: string, data: Partial<InsertTeacher>): Promise<Teacher> {
    const [teacher] = await db.update(teachers).set(data).where(eq(teachers.id, id)).returning();
    return teacher;
  }

  async deleteTeacher(id: string): Promise<void> {
    await db.delete(teachers).where(eq(teachers.id, id));
  }

  // ── Students ──────────────────────────────────────────────────────────────
  async listStudents(arenaId: string): Promise<Student[]> {
    return db.select().from(students).where(eq(students.arenaId, arenaId));
  }

  async getStudent(id: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByLogin(arenaId: string, login: string): Promise<Student | undefined> {
    const [student] = await db
      .select()
      .from(students)
      .where(and(eq(students.arenaId, arenaId), eq(students.login, login)));
    return student;
  }

  async createStudent(data: InsertStudent): Promise<Student> {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  async updateStudent(id: string, data: Partial<InsertStudent>): Promise<Student> {
    const [student] = await db.update(students).set(data).where(eq(students.id, id)).returning();
    return student;
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  // ── Checkin History ───────────────────────────────────────────────────────
  async listCheckins(studentId: string): Promise<CheckinEntry[]> {
    return db.select().from(checkinHistory).where(eq(checkinHistory.studentId, studentId));
  }

  async addCheckin(data: InsertCheckin): Promise<CheckinEntry> {
    const [entry] = await db.insert(checkinHistory).values(data).returning();
    return entry;
  }

  async removeCheckin(id: string): Promise<void> {
    await db.delete(checkinHistory).where(eq(checkinHistory.id, id));
  }

  async removeCheckinByIndex(studentId: string, index: number): Promise<void> {
    const all = await this.listCheckins(studentId);
    if (index >= 0 && index < all.length) {
      await this.removeCheckin(all[index].id);
    }
  }

  async updateCheckinByIndex(studentId: string, index: number, data: string, hora: string): Promise<void> {
    const all = await this.listCheckins(studentId);
    if (index >= 0 && index < all.length) {
      await db.update(checkinHistory).set({ data, hora }).where(eq(checkinHistory.id, all[index].id));
    }
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  async listPayments(tenantId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.tenantId, tenantId));
  }

  async listStudentPayments(studentId: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.studentId, studentId));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async updatePaymentStatus(id: string, status: string, paymentDate?: string): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ status, ...(paymentDate ? { paymentDate } : {}) })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async deletePayment(id: string): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // ── Charges ───────────────────────────────────────────────────────────────
  async listCharges(tenantId: string): Promise<Charge[]> {
    return db.select().from(charges).where(eq(charges.tenantId, tenantId));
  }

  async listStudentCharges(studentId: string): Promise<Charge[]> {
    return db.select().from(charges).where(eq(charges.studentId, studentId));
  }

  async createCharge(data: InsertCharge): Promise<Charge> {
    const [charge] = await db.insert(charges).values(data).returning();
    return charge;
  }

  async updateChargeStatus(id: string, status: string, paymentDate?: string): Promise<Charge> {
    const [charge] = await db
      .update(charges)
      .set({ status, ...(paymentDate ? { paymentDate } : {}) })
      .where(eq(charges.id, id))
      .returning();
    return charge;
  }

  async deleteCharge(id: string): Promise<void> {
    await db.delete(charges).where(eq(charges.id, id));
  }

  // ── Payment Settings ──────────────────────────────────────────────────────
  async getPaymentSettings(tenantId: string): Promise<PaymentSettings | undefined> {
    const [settings] = await db.select().from(paymentSettings).where(eq(paymentSettings.tenantId, tenantId));
    return settings;
  }

  async upsertPaymentSettings(data: InsertPaymentSettings): Promise<PaymentSettings> {
    const [settings] = await db
      .insert(paymentSettings)
      .values(data)
      .onConflictDoUpdate({ target: paymentSettings.tenantId, set: { receiverName: data.receiverName, pixKey: data.pixKey, pixQrcodeImage: data.pixQrcodeImage } })
      .returning();
    return settings;
  }

  // ── Modalidade Settings ───────────────────────────────────────────────────
  async listModalidadeSettings(arenaId: string): Promise<ModalidadeSettings[]> {
    return db.select().from(modalidadeSettings).where(eq(modalidadeSettings.arenaId, arenaId));
  }

  async getModalidadeSetting(arenaId: string, modalidade: string): Promise<ModalidadeSettings | undefined> {
    const [setting] = await db
      .select()
      .from(modalidadeSettings)
      .where(and(eq(modalidadeSettings.arenaId, arenaId), eq(modalidadeSettings.modalidade, modalidade)));
    return setting;
  }

  async upsertModalidadeSetting(data: InsertModalidadeSettings): Promise<ModalidadeSettings> {
    const existing = await this.getModalidadeSetting(data.arenaId!, data.modalidade);
    if (existing) {
      const [updated] = await db
        .update(modalidadeSettings)
        .set({ valorPorCheckin: data.valorPorCheckin, planoMinimo: data.planoMinimo, totalpassHabilitado: data.totalpassHabilitado, wellhubHabilitado: data.wellhubHabilitado })
        .where(eq(modalidadeSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(modalidadeSettings).values(data).returning();
    return created;
  }

  // ── Checkin Financeiro ────────────────────────────────────────────────────
  async createCheckinFinanceiro(data: InsertCheckinFinanceiro): Promise<CheckinFinanceiro> {
    const [record] = await db.insert(checkinFinanceiro).values(data).returning();
    return record;
  }

  async listCheckinFinanceiro(arenaId: string): Promise<CheckinFinanceiro[]> {
    return db.select().from(checkinFinanceiro).where(eq(checkinFinanceiro.arenaId, arenaId));
  }

  async listCheckinFinanceiroByStudent(studentId: string): Promise<CheckinFinanceiro[]> {
    return db.select().from(checkinFinanceiro).where(eq(checkinFinanceiro.studentId, studentId));
  }

  // ── Integration Plans ─────────────────────────────────────────────────────
  async listIntegrationPlans(arenaId: string): Promise<IntegrationPlan[]> {
    return db.select().from(integrationPlans).where(eq(integrationPlans.arenaId, arenaId));
  }

  async createIntegrationPlan(data: InsertIntegrationPlan): Promise<IntegrationPlan> {
    const [plan] = await db.insert(integrationPlans).values(data).returning();
    return plan;
  }

  async updateIntegrationPlan(id: string, data: Partial<InsertIntegrationPlan>): Promise<IntegrationPlan> {
    const [plan] = await db.update(integrationPlans).set(data).where(eq(integrationPlans.id, id)).returning();
    return plan;
  }

  async deleteIntegrationPlan(id: string): Promise<void> {
    await db.delete(integrationPlans).where(eq(integrationPlans.id, id));
  }

  // ── Integration Settings ──────────────────────────────────────────────────
  async getIntegrationSettings(arenaId: string, provider: string): Promise<IntegrationSettings | undefined> {
    const [setting] = await db
      .select()
      .from(integrationSettings)
      .where(and(eq(integrationSettings.arenaId, arenaId), eq(integrationSettings.provider, provider)));
    return setting;
  }

  async upsertIntegrationSettings(data: InsertIntegrationSettings): Promise<IntegrationSettings> {
    const existing = await this.getIntegrationSettings(data.arenaId!, data.provider);
    if (existing) {
      const [updated] = await db
        .update(integrationSettings)
        .set({ apiKey: data.apiKey, habilitado: data.habilitado })
        .where(eq(integrationSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(integrationSettings).values(data).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
