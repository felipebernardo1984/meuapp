import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users (system auth, kept for compatibility) ──────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({ username: true, password: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Arenas ───────────────────────────────────────────────────────────────────
export const arenas = pgTable("arenas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  subscriptionPlan: text("subscription_plan").notNull().default("basic"),
  gestorLogin: text("gestor_login").notNull(),
  gestorSenha: text("gestor_senha").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertArenaSchema = createInsertSchema(arenas).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArena = z.infer<typeof insertArenaSchema>;
export type Arena = typeof arenas.$inferSelect;

// ── Plans (Planos) ───────────────────────────────────────────────────────────
export const plans = pgTable("plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  checkins: integer("checkins").notNull().default(0),
  valorTexto: text("valor_texto"),
});

export const insertPlanSchema = createInsertSchema(plans).omit({ id: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

// ── Teachers (Professores) ───────────────────────────────────────────────────
export const teachers = pgTable("teachers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  login: text("login").notNull(),
  senha: text("senha").notNull(),
  modalidade: text("modalidade").notNull(),
});

export const insertTeacherSchema = createInsertSchema(teachers).omit({ id: true });
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachers.$inferSelect;

// ── Students (Alunos) ────────────────────────────────────────────────────────
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  login: text("login").notNull(),
  senha: text("senha").notNull(),
  cpf: text("cpf").notNull(),
  modalidade: text("modalidade").notNull(),
  planoId: varchar("plano_id").references(() => plans.id, { onDelete: "set null" }),
  planoTitulo: text("plano_titulo").notNull().default(""),
  planoCheckins: integer("plano_checkins").notNull().default(0),
  planoValorTexto: text("plano_valor_texto"),
  checkinsRealizados: integer("checkins_realizados").notNull().default(0),
  statusMensalidade: text("status_mensalidade").notNull().default("Em dia"),
  aprovado: boolean("aprovado").notNull().default(false),
  ultimoCheckin: text("ultimo_checkin"),
  photoUrl: text("photo_url"),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// ── Checkin History ──────────────────────────────────────────────────────────
export const checkinHistory = pgTable("checkin_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").references(() => students.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  hora: text("hora").notNull(),
});

export const insertCheckinSchema = createInsertSchema(checkinHistory).omit({ id: true });
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type CheckinEntry = typeof checkinHistory.$inferSelect;
