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
  gestorNome: text("gestor_nome"),
  gestorCpf: text("gestor_cpf"),
  gestorEmail: text("gestor_email"),
  gestorTelefone: text("gestor_telefone"),
  subscriptionStartDate: text("subscription_start_date"),
  subscriptionValue: text("subscription_value"),
  subscriptionStatus: text("subscription_status").notNull().default("Ativo"),
  nextBillingDate: text("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertArenaSchema = createInsertSchema(arenas).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArena = z.infer<typeof insertArenaSchema>;
export type Arena = typeof arenas.$inferSelect;

// ── Platform Plans (prices defined by admin) ─────────────────────────────────
export const platformPlans = pgTable("platform_plans", {
  planType: varchar("plan_type").primaryKey(),
  monthlyValue: text("monthly_value").notNull().default("0"),
});

export const insertPlatformPlanSchema = createInsertSchema(platformPlans);
export type InsertPlatformPlan = z.infer<typeof insertPlatformPlanSchema>;
export type PlatformPlan = typeof platformPlans.$inferSelect;

// ── Arena Subscription Payments ───────────────────────────────────────────────
export const arenaSubscriptionPayments = pgTable("arena_subscription_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  arenaName: text("arena_name").notNull(),
  planType: text("plan_type").notNull(),
  amount: text("amount").notNull(),
  referenceMonth: text("reference_month").notNull(),
  paymentDate: text("payment_date"),
  status: text("status").notNull().default("paid"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertArenaSubscriptionPaymentSchema = createInsertSchema(arenaSubscriptionPayments).omit({ id: true, createdAt: true });
export type InsertArenaSubscriptionPayment = z.infer<typeof insertArenaSubscriptionPaymentSchema>;
export type ArenaSubscriptionPayment = typeof arenaSubscriptionPayments.$inferSelect;

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
  cpf: text("cpf"),
  email: text("email"),
  telefone: text("telefone"),
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
  email: text("email"),
  telefone: text("telefone"),
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
  // Integração (fonte única de verdade para cálculo financeiro)
  integrationType: text("integration_type").notNull().default("none"), // 'wellhub' | 'totalpass' | 'none'
  integrationPlan: text("integration_plan"),                           // ex: TP1, TP2, GP1...
  // Ciclo de vida do aluno
  ativo: boolean("ativo").notNull().default(true),
  desativadoEm: text("desativado_em"),
  criadoEm: timestamp("criado_em").defaultNow(),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

// ── Payments (Mensalidades) ──────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => arenas.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").references(() => students.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").references(() => plans.id, { onDelete: "set null" }),
  description: text("description"),
  amount: text("amount").notNull(),
  referenceMonth: text("reference_month").notNull(),
  dueDate: text("due_date").notNull(),
  paymentDate: text("payment_date"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: text("created_by"),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ── Charges (Cobranças extras) ────────────────────────────────────────────────
export const charges = pgTable("charges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => arenas.id, { onDelete: "cascade" }),
  studentId: varchar("student_id").references(() => students.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: text("due_date").notNull(),
  paymentDate: text("payment_date"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChargeSchema = createInsertSchema(charges).omit({ id: true, createdAt: true });
export type InsertCharge = z.infer<typeof insertChargeSchema>;
export type Charge = typeof charges.$inferSelect;

// ── Message Settings (Mensagens de notificação) ───────────────────────────────
export const messageSettings = pgTable("message_settings", {
  tenantId: varchar("tenant_id").primaryKey().references(() => arenas.id, { onDelete: "cascade" }),
  overdueMessage: text("overdue_message"),
  dueSoonMessage: text("due_soon_message"),
  lowFrequencyMessage: text("low_frequency_message"),
});

export const insertMessageSettingsSchema = createInsertSchema(messageSettings);
export type InsertMessageSettings = z.infer<typeof insertMessageSettingsSchema>;
export type MessageSettings = typeof messageSettings.$inferSelect;

// ── Payment Settings (Configurações PIX) ─────────────────────────────────────
export const paymentSettings = pgTable("payment_settings", {
  tenantId: varchar("tenant_id").primaryKey().references(() => arenas.id, { onDelete: "cascade" }),
  receiverName: text("receiver_name"),
  pixKey: text("pix_key"),
  pixQrcodeImage: text("pix_qrcode_image"),
});

export const insertPaymentSettingsSchema = createInsertSchema(paymentSettings);
export type InsertPaymentSettings = z.infer<typeof insertPaymentSettingsSchema>;
export type PaymentSettings = typeof paymentSettings.$inferSelect;

// ── Modalidade Settings (valor por check-in e integrações) ───────────────────
export const modalidadeSettings = pgTable("modalidade_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  modalidade: text("modalidade").notNull(),
  // Legado — mantido para compatibilidade com dados existentes
  valorPorCheckin: text("valor_por_checkin").notNull().default("0.00"),
  planoMinimo: text("plano_minimo"),
  totalpassHabilitado: boolean("totalpass_habilitado").notNull().default(false),
  wellhubHabilitado: boolean("wellhub_habilitado").notNull().default(false),
  // Wellhub (Gympass)
  wellhubPlanoMinimo: text("wellhub_plano_minimo"),
  wellhubValorCheckin: text("wellhub_valor_checkin").notNull().default("0.00"),
  // TotalPass
  totalpassPlanoMinimo: text("totalpass_plano_minimo"),
  totalpassValorCheckin: text("totalpass_valor_checkin").notNull().default("0.00"),
});

export const insertModalidadeSettingsSchema = createInsertSchema(modalidadeSettings).omit({ id: true });
export type InsertModalidadeSettings = z.infer<typeof insertModalidadeSettingsSchema>;
export type ModalidadeSettings = typeof modalidadeSettings.$inferSelect;

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

// ── Checkin Financeiro (receita por check-in) ─────────────────────────────────
export const checkinFinanceiro = pgTable("checkin_financeiro", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  checkinId: varchar("checkin_id").references(() => checkinHistory.id, { onDelete: "set null" }).unique(),
  studentId: varchar("student_id").references(() => students.id, { onDelete: "cascade" }),
  modalidade: text("modalidade").notNull(),
  integrationType: text("integration_type").notNull().default("none"), // snapshot: 'wellhub' | 'totalpass' | 'none'
  valorUnitario: text("valor_unitario").notNull().default("0.00"),
  valorTotal: text("valor_total").notNull().default("0.00"),
  dataCheckin: text("data_checkin").notNull(),
  status: text("status").notNull().default("ativo"),                   // 'ativo' | 'cancelado'
  tipoPlanoNoMomento: text("tipo_plano_no_momento"),                   // snapshot: 'checkin' | 'mensalista' — nullable for backwards compat
  valorOriginal: text("valor_original"),                               // snapshot do valor calculado no momento — nullable for backwards compat
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCheckinFinanceiroSchema = createInsertSchema(checkinFinanceiro).omit({ id: true, createdAt: true });
export type InsertCheckinFinanceiro = z.infer<typeof insertCheckinFinanceiroSchema>;
export type CheckinFinanceiro = typeof checkinFinanceiro.$inferSelect;

// ── Integration Plans (TotalPass / Wellhub) ───────────────────────────────────
export const integrationPlans = pgTable("integration_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  valor: text("valor").notNull().default("0.00"),
  provider: text("provider").notNull(),
});

export const insertIntegrationPlanSchema = createInsertSchema(integrationPlans).omit({ id: true });
export type InsertIntegrationPlan = z.infer<typeof insertIntegrationPlanSchema>;
export type IntegrationPlan = typeof integrationPlans.$inferSelect;

// ── Integration Settings (API keys por provider) ──────────────────────────────
export const integrationSettings = pgTable("integration_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  apiKey: text("api_key"),
  habilitado: boolean("habilitado").notNull().default(false),
});

export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings).omit({ id: true });
export type InsertIntegrationSettings = z.infer<typeof insertIntegrationSettingsSchema>;
export type IntegrationSettings = typeof integrationSettings.$inferSelect;

// ── WhatsApp Settings (configuração por tenant) ──────────────────────────────
export const whatsappSettings = pgTable("whatsapp_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  whatsapp_number: text("whatsapp_number"),
  default_message: text("default_message"),
  created_at: timestamp("created_at").defaultNow(),
});

// ── WhatsApp Automation Config ────────────────────────────────────────────────
export const whatsappAutomation = pgTable("whatsapp_automation", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  // Cobrança
  cobranca_ativo: boolean("cobranca_ativo").default(false),
  cobranca_dias_apos_vencimento: integer("cobranca_dias_apos_vencimento").default(1),
  cobranca_num_disparos: integer("cobranca_num_disparos").default(3),
  cobranca_intervalo_dias: integer("cobranca_intervalo_dias").default(3),
  cobranca_mensagem: text("cobranca_mensagem").default("Olá {{nome}}, sua mensalidade está em atraso. Por favor, regularize o quanto antes."),
  // Assiduidade
  assiduidade_ativo: boolean("assiduidade_ativo").default(false),
  assiduidade_dias_sem_checkin: integer("assiduidade_dias_sem_checkin").default(7),
  assiduidade_num_disparos: integer("assiduidade_num_disparos").default(3),
  assiduidade_intervalo_dias: integer("assiduidade_intervalo_dias").default(7),
  assiduidade_mensagem: text("assiduidade_mensagem").default("Olá {{nome}}, sentimos sua falta! Que tal voltar a treinar essa semana?"),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ── WhatsApp Dispatch Log ─────────────────────────────────────────────────────
export const whatsappDispatchLog = pgTable("whatsapp_dispatch_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  arenaId: varchar("arena_id").references(() => arenas.id, { onDelete: "cascade" }),
  alunoId: varchar("aluno_id").references(() => students.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(), // "cobranca" | "assiduidade"
  mensagem: text("mensagem").notNull(),
  status: text("status").default("pendente"), // "pendente" | "enviado"
  disparo_num: integer("disparo_num").default(1),
  criado_em: timestamp("criado_em").defaultNow(),
  enviado_em: timestamp("enviado_em"),
});