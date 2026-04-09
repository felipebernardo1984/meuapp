import { eq, and } from "drizzle-orm";
import { db } from "./db";
import {
  users, arenas, plans, teachers, students, checkinHistory,
  payments, charges, messageSettings, paymentSettings, platformPlans, arenaSubscriptionPayments, modalidadeSettings,
  checkinFinanceiro, integrationPlans, integrationSettings,
  type User, type InsertUser,
  type Arena, type InsertArena,
  type Plan, type InsertPlan,
  type Teacher, type InsertTeacher,
  type Student, type InsertStudent,
  type CheckinEntry, type InsertCheckin,
  type Payment, type InsertPayment,
  type Charge, type InsertCharge,
  type MessageSettings, type InsertMessageSettings,
  type PaymentSettings, type InsertPaymentSettings,
  type PlatformPlan, type InsertPlatformPlan,
  type ArenaSubscriptionPayment, type InsertArenaSubscriptionPayment,
  type ModalidadeSettings, type InsertModalidadeSettings,
  type CheckinFinanceiro, type InsertCheckinFinanceiro,
  type IntegrationPlan, type InsertIntegrationPlan,
  type IntegrationSettings, type InsertIntegrationSettings,
} from "@shared/schema";

export interface IStorage {

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  listArenas(): Promise<Arena[]>;
  getArena(id: string): Promise<Arena | undefined>;
  getArenaByGestorLogin(login: string): Promise<Arena | undefined>;
  createArena(arena: InsertArena): Promise<Arena>;
  updateArena(id: string, data: Partial<InsertArena>): Promise<Arena>;
  deleteArena(id: string): Promise<void>;

  listPlatformPlans(): Promise<PlatformPlan[]>;
  upsertPlatformPlan(data: InsertPlatformPlan): Promise<PlatformPlan>;

  listArenaSubscriptionPayments(): Promise<ArenaSubscriptionPayment[]>;
  createArenaSubscriptionPayment(data: InsertArenaSubscriptionPayment): Promise<ArenaSubscriptionPayment>;

  listPlans(arenaId: string): Promise<Plan[]>;
  getPlan(id: string): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: string, data: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: string): Promise<void>;

  listTeachers(arenaId: string): Promise<Teacher[]>;
  getTeacher(id: string): Promise<Teacher | undefined>;
  getTeacherByLogin(arenaId: string, login: string): Promise<Teacher | undefined>;
  createTeacher(teacher: InsertTeacher): Promise<Teacher>;
  updateTeacher(id: string, data: Partial<InsertTeacher>): Promise<Teacher>;
  deleteTeacher(id: string): Promise<void>;

  listStudents(arenaId: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByLogin(arenaId: string, login: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, data: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  listCheckins(studentId: string): Promise<CheckinEntry[]>;
  addCheckin(checkin: InsertCheckin): Promise<CheckinEntry>;
  removeCheckin(id: string): Promise<void>;
  removeCheckinByIndex(studentId: string, index: number): Promise<void>;

  listPayments(tenantId: string): Promise<Payment[]>;
  listStudentPayments(studentId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: string, status: string, paymentDate?: string): Promise<Payment>;
  deletePayment(id: string): Promise<void>;

  listCharges(tenantId: string): Promise<Charge[]>;
  listStudentCharges(studentId: string): Promise<Charge[]>;
  createCharge(charge: InsertCharge): Promise<Charge>;
  updateChargeStatus(id: string, status: string, paymentDate?: string): Promise<Charge>;
  deleteCharge(id: string): Promise<void>;

  getMessageSettings(tenantId: string): Promise<MessageSettings | undefined>;
  upsertMessageSettings(data: InsertMessageSettings): Promise<MessageSettings>;

  getPaymentSettings(tenantId: string): Promise<PaymentSettings | undefined>;
  upsertPaymentSettings(settings: InsertPaymentSettings): Promise<PaymentSettings>;

  listModalidadeSettings(arenaId: string): Promise<ModalidadeSettings[]>;
  getModalidadeSetting(arenaId: string, modalidade: string): Promise<ModalidadeSettings | undefined>;
  upsertModalidadeSetting(data: InsertModalidadeSettings): Promise<ModalidadeSettings>;

  createCheckinFinanceiro(data: InsertCheckinFinanceiro): Promise<CheckinFinanceiro>;
  listCheckinFinanceiro(arenaId: string): Promise<CheckinFinanceiro[]>;
  listCheckinFinanceiroByStudent(studentId: string): Promise<CheckinFinanceiro[]>;
  getCheckinFinanceiroByCheckinId(checkinId: string): Promise<CheckinFinanceiro | undefined>;
  cancelCheckinFinanceiro(checkinId: string): Promise<void>;
  updateCheckinFinanceiroValues(studentId: string, valorUnitario: string, integrationType: string): Promise<void>;

  listIntegrationPlans(arenaId: string): Promise<IntegrationPlan[]>;
  createIntegrationPlan(data: InsertIntegrationPlan): Promise<IntegrationPlan>;
  updateIntegrationPlan(id: string, data: Partial<InsertIntegrationPlan>): Promise<IntegrationPlan>;
  deleteIntegrationPlan(id: string): Promise<void>;

  getIntegrationSettings(arenaId: string, provider: string): Promise<IntegrationSettings | undefined>;
  upsertIntegrationSettings(data: InsertIntegrationSettings): Promise<IntegrationSettings>;
}

export class DatabaseStorage implements IStorage {

  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async listArenas() {
    return db.select().from(arenas);
  }

  async getArena(id: string) {
    const [arena] = await db.select().from(arenas).where(eq(arenas.id, id));
    return arena;
  }

  async createArena(data: InsertArena) {
    const [arena] = await db.insert(arenas).values(data).returning();
    return arena;
  }

  async listStudents(arenaId: string) {
    return db.select().from(students).where(eq(students.arenaId, arenaId));
  }

  async getStudent(id: string) {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async createStudent(data: InsertStudent) {
    const [student] = await db.insert(students).values(data).returning();
    return student;
  }

  async listCheckins(studentId: string) {
    return db.select().from(checkinHistory).where(eq(checkinHistory.studentId, studentId));
  }

  // 🔥 CORREÇÃO PRINCIPAL
  async addCheckin(data: InsertCheckin): Promise<CheckinEntry> {

    const [entry] = await db.insert(checkinHistory).values(data).returning();

    try {

      const student = await this.getStudent(data.studentId);
      if (!student) return entry;

      const modalidadeConfig = await this.getModalidadeSetting(
        student.arenaId,
        student.modalidade
      );

      if (!modalidadeConfig) return entry;

      let valorUnitario = modalidadeConfig.valorPorCheckin;

      if (
        student.integrationType === "wellhub" &&
        modalidadeConfig.wellhubValorCheckin
      ) {
        valorUnitario = modalidadeConfig.wellhubValorCheckin;
      }

      if (
        student.integrationType === "totalpass" &&
        modalidadeConfig.totalpassValorCheckin
      ) {
        valorUnitario = modalidadeConfig.totalpassValorCheckin;
      }

      await this.createCheckinFinanceiro({
        arenaId: student.arenaId,
        studentId: student.id,
        checkinId: entry.id,
        modalidade: student.modalidade,
        integrationType: student.integrationType || "normal",
        valorUnitario: valorUnitario,
        valorTotal: valorUnitario,
        dataCheckin: data.data,
        status: "ativo",
      });

    } catch (error) {

      console.error("Erro ao criar financeiro do checkin:", error);

    }

    return entry;
  }

}

export const storage = new DatabaseStorage();