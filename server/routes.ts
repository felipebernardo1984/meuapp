import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { financeService } from "./financeService";
import { getFinancialStatus } from "./financialStatusUtils";
import { automationRouter } from "./automationRoutes";

const MemoryStoreSession = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    arenaId?: string;
    userType?: "gestor" | "professor" | "aluno";
    userId?: string;
    isAdmin?: boolean;
  }
}

let ADMIN_LOGIN = process.env.ADMIN_LOGIN || "superadmin";
let ADMIN_SENHA = process.env.ADMIN_SENHA || "superadmin";

function requireArena(req: Request, res: Response): string | null {
  if (!req.session.arenaId) {
    res.status(401).json({ message: "Não autenticado" });
    return null;
  }
  return req.session.arenaId;
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.session.isAdmin) {
    res.status(401).json({ message: "Acesso negado" });
    return false;
  }
  return true;
}

function calcNextBillingDate(startDate: string): string {
  const parts = startDate.split("/");
  const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("pt-BR");
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "arena-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStoreSession({ checkPeriod: 86400000 }),
      cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  // ── Seed default arena on first boot ──────────────────────────────────────
  app.use(async (_req, _res, next) => {
    try {
      const existing = await storage.getArenaByGestorLogin("333");
      if (!existing) {
        const today = new Date().toLocaleDateString("pt-BR");
        const defaultArena = await storage.createArena({
          name: "Arena Padrão",
          subscriptionPlan: "premium",
          gestorLogin: "333",
          gestorSenha: "333",
          subscriptionStartDate: today,
          subscriptionValue: "R$ 199,00",
          subscriptionStatus: "Ativo",
          nextBillingDate: calcNextBillingDate(today),
        });
        // Seed default plans
        const p1 = await storage.createPlan({ arenaId: defaultArena.id, titulo: "1x por semana", checkins: 8, valorTexto: null });
        const p2 = await storage.createPlan({ arenaId: defaultArena.id, titulo: "2x por semana", checkins: 12, valorTexto: null });
        await storage.createPlan({ arenaId: defaultArena.id, titulo: "Mensalista", checkins: 0, valorTexto: "R$ 140,00" });
        // Seed default teachers
        await storage.createTeacher({ arenaId: defaultArena.id, nome: "Carlos Mendes", login: "222", senha: "222", modalidade: "Beach Tennis" });
        await storage.createTeacher({ arenaId: defaultArena.id, nome: "Fernanda Lima", login: "fernanda", senha: "admin", modalidade: "Vôlei de Praia" });
        await storage.createTeacher({ arenaId: defaultArena.id, nome: "Ricardo Souza", login: "ricardo", senha: "admin", modalidade: "Futevôlei" });
        // Seed default students
        const a1 = await storage.createStudent({
          arenaId: defaultArena.id, nome: "Maria Santos", login: "111", senha: "111",
          cpf: "987.654.321-00", modalidade: "Beach Tennis",
          planoId: p2.id, planoTitulo: p2.titulo, planoCheckins: p2.checkins, planoValorTexto: null,
          checkinsRealizados: 9, statusMensalidade: "Em dia", aprovado: true, ultimoCheckin: "02/01/2025", photoUrl: null,
        });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "15/12/2024", hora: "18:30" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "18/12/2024", hora: "19:00" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "22/12/2024", hora: "18:45" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "25/12/2024", hora: "19:15" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "29/12/2024", hora: "18:20" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "30/12/2024", hora: "18:00" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "31/12/2024", hora: "17:45" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "01/01/2025", hora: "19:30" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data: "02/01/2025", hora: "18:30" });

        const a2 = await storage.createStudent({
          arenaId: defaultArena.id, nome: "Pedro Oliveira", login: "pedro", senha: "admin",
          cpf: "456.789.123-00", modalidade: "Vôlei de Praia",
          planoId: p1.id, planoTitulo: p1.titulo, planoCheckins: p1.checkins, planoValorTexto: null,
          checkinsRealizados: 3, statusMensalidade: "Pendente", aprovado: true, ultimoCheckin: "30/12/2024", photoUrl: null,
        });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a2.id, data: "20/12/2024", hora: "18:00" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a2.id, data: "25/12/2024", hora: "19:00" });
        await storage.addCheckin({ arenaId: defaultArena.id, studentId: a2.id, data: "30/12/2024", hora: "19:00" });

      }

    } catch (_e) {
      // ignore seed errors (already seeded)
    }

    // Always ensure platform plan prices exist
    try {
      const existingPlans = await storage.listPlatformPlans();
      if (existingPlans.length === 0) {
        await storage.upsertPlatformPlan({ planType: "basic", monthlyValue: "R$ 99,00" });
        await storage.upsertPlatformPlan({ planType: "premium", monthlyValue: "R$ 199,00" });
      }
    } catch (_e) {}

    next();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/login", async (req, res) => {
    const { login, senha } = req.body as { login: string; senha: string };
    if (!login || !senha) return res.status(400).json({ message: "Credenciais inválidas" });

    const allArenas = await storage.listArenas();

    for (const arena of allArenas) {
      if (arena.gestorLogin === login && arena.gestorSenha === senha) {
        req.session.arenaId = arena.id;
        req.session.userType = "gestor";
        req.session.userId = arena.id;
        return res.json({ tipo: "gestor", arenaId: arena.id, arenaName: arena.name });
      }
      const teacher = await storage.getTeacherByLogin(arena.id, login);
      if (teacher && teacher.senha === senha) {
        req.session.arenaId = arena.id;
        req.session.userType = "professor";
        req.session.userId = teacher.id;
        return res.json({ tipo: "professor", professor: { id: teacher.id, nome: teacher.nome, modalidade: teacher.modalidade }, arenaId: arena.id });
      }
      const student = await storage.getStudentByLogin(arena.id, login);
      if (student && student.senha === senha && student.aprovado) {
        req.session.arenaId = arena.id;
        req.session.userType = "aluno";
        req.session.userId = student.id;
        const historico = await storage.listCheckins(student.id);
        return res.json({ tipo: "aluno", aluno: { ...student, historico }, arenaId: arena.id });
      }
    }

    return res.status(401).json({ message: "Usuário ou senha incorretos" });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/session", async (req, res) => {
    if (!req.session.arenaId) return res.json({ authenticated: false });
    const { arenaId, userType, userId } = req.session;
    if (userType === "gestor") {
      const arena = await storage.getArena(arenaId!);
      return res.json({ authenticated: true, tipo: "gestor", arenaId, arenaName: arena?.name });
    }
    if (userType === "professor") {
      const teacher = await storage.getTeacher(userId!);
      return res.json({ authenticated: true, tipo: "professor", professor: teacher, arenaId });
    }
    if (userType === "aluno") {
      const student = await storage.getStudent(userId!);
      if (!student) return res.json({ authenticated: false });
      const historico = await storage.listCheckins(student.id);
      return res.json({ authenticated: true, tipo: "aluno", aluno: { ...student, historico }, arenaId });
    }
    return res.json({ authenticated: false });
  });

  // ── Plans ─────────────────────────────────────────────────────────────────
  app.get("/api/planos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const lista = await storage.listPlans(arenaId);
    res.json(lista);
  });

  app.post("/api/planos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { titulo, checkins, valorTexto } = req.body;
    const plan = await storage.createPlan({ arenaId, titulo, checkins: checkins ?? 0, valorTexto: valorTexto ?? null });
    res.json(plan);
  });

  app.put("/api/planos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { titulo, checkins, valorTexto } = req.body;
    const plan = await storage.updatePlan(req.params.id, { titulo, checkins, valorTexto });
    const allStudents = await storage.listStudents(arenaId);
    for (const s of allStudents) {
      if (s.planoId === req.params.id) {
        await storage.updateStudent(s.id, { planoTitulo: titulo, planoCheckins: checkins, planoValorTexto: valorTexto });
      }
    }
    res.json(plan);
  });

  app.delete("/api/planos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    await storage.deletePlan(req.params.id);
    res.json({ ok: true });
  });

  // ── Teachers ──────────────────────────────────────────────────────────────
  app.get("/api/professores", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const lista = await storage.listTeachers(arenaId);
    res.json(lista.map(({ senha: _s, ...t }) => t));
  });

  app.post("/api/professores", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, modalidade, cpf, email, telefone } = req.body;
    const login = req.body.login?.trim() || gerarLogin(nome);
    const senha = req.body.senha?.trim() || "admin";
    const teacher = await storage.createTeacher({ arenaId, nome, login, senha, cpf: cpf ?? null, email: email ?? null, telefone: telefone ?? null, modalidade });
    res.json({ ...teacher, senha: undefined, loginGerado: login, senhaGerada: senha });
  });

  app.put("/api/professores/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, cpf, email, telefone, login, senha, modalidade } = req.body;
    const updateData: Partial<{ nome: string; cpf: string | null; email: string | null; telefone: string | null; login: string; senha: string; modalidade: string }> = { nome, modalidade };
    if (cpf !== undefined) updateData.cpf = cpf || null;
    if (email !== undefined) updateData.email = email || null;
    if (telefone !== undefined) updateData.telefone = telefone || null;
    if (login !== undefined) updateData.login = login;
    if (senha) updateData.senha = senha;
    const teacher = await storage.updateTeacher(req.params.id, updateData);
    res.json(teacher);
  });

  app.delete("/api/professores/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    await storage.deleteTeacher(req.params.id);
    res.json({ ok: true });
  });

  // ── Students ──────────────────────────────────────────────────────────────
  app.get("/api/alunos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const lista = await storage.listStudents(arenaId);
    const result = await Promise.all(
      lista.map(async (s) => ({ ...s, historico: await storage.listCheckins(s.id) }))
    );
    res.json(result);
  });

  app.post("/api/alunos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, cpf, modalidade, planoId, email, telefone, integrationType, integrationPlan } = req.body;
    const plan = await storage.getPlan(planoId);
    if (!plan) return res.status(400).json({ message: "Plano não encontrado" });
    const login = req.body.login?.trim() || gerarLogin(nome);
    const senha = req.body.senha?.trim() || cpf;
    const student = await storage.createStudent({
      arenaId, nome, login, senha, cpf, email: email ?? null, telefone: telefone ?? null, modalidade,
      planoId: plan.id, planoTitulo: plan.titulo, planoCheckins: plan.checkins, planoValorTexto: plan.valorTexto ?? null,
      checkinsRealizados: 0, statusMensalidade: "Em dia", aprovado: true, ultimoCheckin: null, photoUrl: null,
      integrationType: integrationType ?? "none",
      integrationPlan: integrationPlan ?? null,
    });
    res.json({ ...student, loginGerado: login, senhaGerada: senha, historico: [] });
  });

  app.put("/api/alunos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, cpf, email, telefone, login, senha, modalidade, statusMensalidade, checkinsRealizados, integrationType, integrationPlan } = req.body;
    const studentBefore = await storage.getStudent(req.params.id);
    const updates: Record<string, any> = {};
    if (nome !== undefined) updates.nome = nome;
    if (cpf !== undefined) updates.cpf = cpf;
    if (email !== undefined) updates.email = email || null;
    if (telefone !== undefined) updates.telefone = telefone || null;
    if (login !== undefined) updates.login = login;
    if (senha) updates.senha = senha;
    if (modalidade !== undefined) updates.modalidade = modalidade;
    if (statusMensalidade !== undefined) updates.statusMensalidade = statusMensalidade;
    if (checkinsRealizados !== undefined) updates.checkinsRealizados = Number(checkinsRealizados);
    if (integrationType !== undefined) updates.integrationType = integrationType;
    if (integrationPlan !== undefined) updates.integrationPlan = integrationPlan || null;
    const student = await storage.updateStudent(req.params.id, updates);
    // Recalculate financial records if integration settings changed
    const integrationChanged =
      (integrationType !== undefined && integrationType !== studentBefore?.integrationType) ||
      (integrationPlan !== undefined && integrationPlan !== studentBefore?.integrationPlan) ||
      (modalidade !== undefined && modalidade !== studentBefore?.modalidade);
    if (integrationChanged) {
      try {
        await financeService.recalcularReceitaAluno(arenaId, req.params.id);
      } catch (_e) {}
    }
    res.json(student);
  });

  app.put("/api/alunos/:id/plano", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { planoId } = req.body;
    const plan = await storage.getPlan(planoId);
    if (!plan) return res.status(400).json({ message: "Plano não encontrado" });
    const student = await storage.updateStudent(req.params.id, {
      planoId: plan.id, planoTitulo: plan.titulo, planoCheckins: plan.checkins, planoValorTexto: plan.valorTexto ?? null,
    });
    res.json(student);
  });

  app.put("/api/alunos/:id/aprovar", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const student = await storage.updateStudent(req.params.id, { aprovado: true });
    res.json(student);
  });

  app.delete("/api/alunos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    await storage.deleteStudent(req.params.id);
    res.json({ ok: true });
  });

  // ── Checkins ──────────────────────────────────────────────────────────────
  app.post("/api/alunos/:id/checkin", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const student = await storage.getStudent(req.params.id);
    if (!student) return res.status(404).json({ message: "Aluno não encontrado" });

    // Block check-in only for mensalistas with overdue payments
    if (student.integrationType === "none") {
      const financialStatus = await getFinancialStatus(student.id, arenaId);
      if (financialStatus === "inadimplente") {
        return res.status(403).json({ message: "Check-in bloqueado: aluno com mensalidade em atraso." });
      }
    }

    // Validate plan minimum (warn but do not block check-in)
    let planWarning: string | undefined;
    try {
      const modalidadeSetting = await storage.getModalidadeSetting(arenaId, student.modalidade);
      const planCheck = financeService.validatePlanMinimum(modalidadeSetting, student);
      if (!planCheck.allowed) planWarning = planCheck.reason;
    } catch (_e) {}

    const agora = new Date();
    const data = req.body.data
      ? new Date(req.body.data + "T12:00:00").toLocaleDateString("pt-BR")
      : agora.toLocaleDateString("pt-BR");
    const hora = req.body.hora || agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const checkinEntry = await storage.addCheckin({ arenaId, studentId: student.id, data, hora });
    const updated = await storage.updateStudent(student.id, {
      checkinsRealizados: student.checkinsRealizados + 1,
      ultimoCheckin: data,
    });

    // Registrar receita financeira automaticamente (sem alterar lógica de check-in)
    try {
      await financeService.calcularReceitaCheckin(arenaId, student.id, student.modalidade, checkinEntry.id, data);
    } catch (_e) {
      // Não bloquear check-in se a gravação financeira falhar
    }

    const historico = await storage.listCheckins(student.id);
    res.json({ ...updated, historico, planWarning });
  });

  app.put("/api/alunos/:id/checkin/:index", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const student = await storage.getStudent(req.params.id);
    if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
    const index = parseInt(req.params.index, 10);
    const { data: dataISO, hora } = req.body;
    const data = dataISO
      ? new Date(dataISO + "T12:00:00").toLocaleDateString("pt-BR")
      : "";
    await storage.updateCheckinByIndex(student.id, index, data, hora);
    const historico = await storage.listCheckins(student.id);
    res.json({ historico });
  });

  app.delete("/api/alunos/:id/checkin/:index", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const student = await storage.getStudent(req.params.id);
    if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
    const index = parseInt(req.params.index, 10);

    // Get the checkin entry before deleting so we can cancel the financial record
    const allCheckins = await storage.listCheckins(student.id);
    const checkinToRemove = allCheckins[index];
    if (checkinToRemove?.id) {
      try {
        await storage.cancelCheckinFinanceiro(checkinToRemove.id);
      } catch (_e) {
        // Don't block removal if cancel fails
      }
    }

    await storage.removeCheckinByIndex(student.id, index);
    const historico = await storage.listCheckins(student.id);
    const updated = await storage.updateStudent(student.id, {
      checkinsRealizados: Math.max(0, student.checkinsRealizados - 1),
      ultimoCheckin: historico.length > 0 ? historico[historico.length - 1].data : null,
    });
    res.json({ ...updated, historico });
  });

  // ── Arena subscription info (for gestor) ──────────────────────────────────
  app.get("/api/subscription", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const arena = await storage.getArena(arenaId);
    if (!arena) return res.status(404).json({ message: "Arena não encontrada" });
    res.json({
      subscriptionPlan: arena.subscriptionPlan,
      subscriptionStartDate: arena.subscriptionStartDate,
      subscriptionValue: arena.subscriptionValue,
      subscriptionStatus: arena.subscriptionStatus,
      nextBillingDate: arena.nextBillingDate,
    });
  });

  app.post("/api/subscription/pay", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const arena = await storage.getArena(arenaId);
    if (!arena) return res.status(404).json({ message: "Arena não encontrada" });

    const today = new Date().toLocaleDateString("pt-BR");
    const nextBilling = calcNextBillingDate(today);
    const now = new Date();
    const referenceMonth = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

    await storage.updateArena(arenaId, {
      subscriptionStatus: "Ativo",
      nextBillingDate: nextBilling,
    });

    await storage.createArenaSubscriptionPayment({
      arenaId,
      arenaName: arena.name,
      planType: arena.subscriptionPlan,
      amount: arena.subscriptionValue ?? "R$ 0,00",
      referenceMonth,
      paymentDate: today,
      status: "paid",
    });

    res.json({ ok: true, nextBillingDate: nextBilling });
  });

  // ── Admin Panel ───────────────────────────────────────────────────────────
  app.post("/api/admin/login", (req, res) => {
    const { login, senha } = req.body;
    if (login === ADMIN_LOGIN && senha === ADMIN_SENHA) {
      req.session.isAdmin = true;
      return res.json({ ok: true });
    }
    return res.status(401).json({ message: "Credenciais de administrador inválidas" });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.isAdmin = false;
    res.json({ ok: true });
  });

  app.get("/api/admin/session", (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
  });

  app.get("/api/admin/arenas", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const lista = await storage.listArenas();
    const result = await Promise.all(
      lista.map(async (arena) => {
        const [teacherList, studentList, planList] = await Promise.all([
          storage.listTeachers(arena.id),
          storage.listStudents(arena.id),
          storage.listPlans(arena.id),
        ]);
        return {
          ...arena,
          stats: {
            professores: teacherList.length,
            alunos: studentList.length,
            planos: planList.length,
            alunosAtivos: studentList.filter((s) => s.aprovado).length,
          },
        };
      })
    );
    res.json(result);
  });

  app.get("/api/admin/arenas/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const arena = await storage.getArena(req.params.id);
    if (!arena) return res.status(404).json({ message: "Arena não encontrada" });
    const [teacherList, studentList, planList] = await Promise.all([
      storage.listTeachers(arena.id),
      storage.listStudents(arena.id),
      storage.listPlans(arena.id),
    ]);
    const studentsWithHistory = await Promise.all(
      studentList.map(async (s) => ({ ...s, historico: await storage.listCheckins(s.id) }))
    );
    res.json({
      ...arena,
      professores: teacherList.map(({ senha: _s, ...t }) => t),
      alunos: studentsWithHistory,
      planos: planList,
      stats: {
        professores: teacherList.length,
        alunos: studentList.length,
        planos: planList.length,
        alunosAtivos: studentList.filter((s) => s.aprovado).length,
        totalCheckins: studentsWithHistory.reduce((acc, s) => acc + (s.historico?.length ?? 0), 0),
      },
    });
  });

  app.post("/api/admin/arenas", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { name, subscriptionPlan, gestorLogin, gestorSenha, gestorNome, gestorCpf, gestorEmail, gestorTelefone } = req.body;
    if (!name || !gestorLogin || !gestorSenha) {
      return res.status(400).json({ message: "Nome, login e senha são obrigatórios" });
    }
    const planType = subscriptionPlan || "basic";
    const platformPlanList = await storage.listPlatformPlans();
    const platformPlan = platformPlanList.find((p) => p.planType === planType);
    const today = new Date().toLocaleDateString("pt-BR");
    const arena = await storage.createArena({
      name,
      subscriptionPlan: planType,
      gestorLogin,
      gestorSenha,
      gestorNome: gestorNome ?? null,
      gestorCpf: gestorCpf ?? null,
      gestorEmail: gestorEmail ?? null,
      gestorTelefone: gestorTelefone ?? null,
      subscriptionStartDate: today,
      subscriptionValue: platformPlan?.monthlyValue ?? "R$ 0,00",
      subscriptionStatus: "Ativo",
      nextBillingDate: calcNextBillingDate(today),
    });
    res.json(arena);
  });

  app.put("/api/admin/credentials", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { login, senha } = req.body;
    if (!login || !senha) return res.status(400).json({ message: "Login e senha são obrigatórios" });
    ADMIN_LOGIN = login;
    ADMIN_SENHA = senha;
    res.json({ ok: true });
  });

  app.put("/api/admin/arenas/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { name, subscriptionPlan, gestorLogin, gestorSenha, gestorNome, gestorCpf, gestorEmail, gestorTelefone } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (gestorLogin !== undefined) updates.gestorLogin = gestorLogin;
    if (gestorSenha) updates.gestorSenha = gestorSenha;
    if (gestorNome !== undefined) updates.gestorNome = gestorNome;
    if (gestorCpf !== undefined) updates.gestorCpf = gestorCpf;
    if (gestorEmail !== undefined) updates.gestorEmail = gestorEmail;
    if (gestorTelefone !== undefined) updates.gestorTelefone = gestorTelefone;
    if (subscriptionPlan !== undefined) {
      updates.subscriptionPlan = subscriptionPlan;
      const platformPlanList = await storage.listPlatformPlans();
      const platformPlan = platformPlanList.find((p) => p.planType === subscriptionPlan);
      if (platformPlan) updates.subscriptionValue = platformPlan.monthlyValue;
    }
    const arena = await storage.updateArena(req.params.id, updates);
    res.json(arena);
  });

  app.delete("/api/admin/arenas/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await storage.deleteArena(req.params.id);
    res.json({ ok: true });
  });

  app.post("/api/admin/impersonate/:arenaId", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const arena = await storage.getArena(req.params.arenaId);
    if (!arena) return res.status(404).json({ message: "Arena não encontrada" });
    req.session.arenaId = arena.id;
    req.session.userType = "gestor";
    req.session.userId = arena.id;
    res.json({ ok: true, arenaId: arena.id, arenaName: arena.name });
  });

  // ── Platform Plans (admin sets pricing) ───────────────────────────────────
  app.get("/api/admin/platform-plans", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const plans = await storage.listPlatformPlans();
    res.json(plans);
  });

  app.put("/api/admin/platform-plans/:type", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { monthlyValue } = req.body;
    if (!monthlyValue) return res.status(400).json({ message: "Valor mensal é obrigatório" });
    const plan = await storage.upsertPlatformPlan({ planType: req.params.type, monthlyValue });
    res.json(plan);
  });

  // ── Arena Subscription Payment History (admin) ─────────────────────────────
  app.get("/api/admin/subscription-payments", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const payments = await storage.listArenaSubscriptionPayments();
    res.json(payments);
  });

  // ── Financial Routes ──────────────────────────────────────────────────────
  app.get("/api/finance/payments", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const list = await storage.listPayments(arenaId);
    res.json(list);
  });

  app.post("/api/finance/payments", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { studentId, planId, amount, referenceMonth, dueDate, status, description } = req.body;
    if (!studentId || !amount || !referenceMonth || !dueDate) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }
    const payment = await storage.createPayment({
      tenantId: arenaId, studentId, planId: planId ?? null,
      description: description ?? null,
      amount, referenceMonth, dueDate,
      paymentDate: status === "paid" ? new Date().toLocaleDateString("pt-BR") : null,
      status: status ?? "pending",
      createdBy: req.session.userType ?? "gestor",
    });
    res.json(payment);
  });

  app.put("/api/finance/payments/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { status, paymentDate } = req.body;
    const payment = await storage.updatePaymentStatus(req.params.id, status, paymentDate);
    res.json(payment);
  });

  app.delete("/api/finance/payments/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    await storage.deletePayment(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/finance/student/payments", async (req, res) => {
    if (!req.session.arenaId || !req.session.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const list = await storage.listStudentPayments(req.session.userId);
    res.json(list);
  });

  app.get("/api/finance/charges", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const list = await storage.listCharges(arenaId);
    res.json(list);
  });

  app.post("/api/finance/charges", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { studentId, description, amount, dueDate } = req.body;
    if (!studentId || !description || !amount || !dueDate) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }
    const charge = await storage.createCharge({
      tenantId: arenaId, studentId, description, amount,
      status: "pending", dueDate, paymentDate: null,
      createdBy: req.session.userType ?? "gestor",
    });
    res.json(charge);
  });

  app.put("/api/finance/charges/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { status, paymentDate } = req.body;
    const charge = await storage.updateChargeStatus(req.params.id, status, paymentDate);
    res.json(charge);
  });

  app.delete("/api/finance/charges/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    await storage.deleteCharge(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/finance/student/charges", async (req, res) => {
    if (!req.session.arenaId || !req.session.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const list = await storage.listStudentCharges(req.session.userId);
    res.json(list);
  });

  app.get("/api/finance/settings", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const settings = await storage.getPaymentSettings(arenaId);
    res.json(settings ?? { tenantId: arenaId, receiverName: null, pixKey: null, pixQrcodeImage: null });
  });

  app.put("/api/finance/settings", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { receiverName, pixKey, pixQrcodeImage } = req.body;
    const settings = await storage.upsertPaymentSettings({ tenantId: arenaId, receiverName, pixKey, pixQrcodeImage });
    res.json(settings);
  });

  app.get("/api/finance/summary", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const now = new Date();
    const currentMonth = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const [allPayments, allCharges] = await Promise.all([
      storage.listPayments(arenaId),
      storage.listCharges(arenaId),
    ]);
    const monthPayments = allPayments.filter((p) => p.referenceMonth === currentMonth);
    const summary = {
      faturamentoMes: monthPayments.filter((p) => p.status === "paid").reduce((acc, p) => acc + parseFloat(p.amount.replace(/[^0-9.]/g, "") || "0"), 0),
      mensalidadesPagas: monthPayments.filter((p) => p.status === "paid").length,
      mensalidadesPendentes: allPayments.filter((p) => p.status === "pending").length,
      mensalidadesAtrasadas: allPayments.filter((p) => p.status === "overdue").length,
      totalCobranças: allCharges.filter((c) => c.status === "pending").length,
    };
    res.json(summary);
  });

  // ── Receita por Check-in (dados reais do checkinFinanceiro) ──────────────
  app.get("/api/finance/receita/summary", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { dataInicio, dataFim } = req.query as { dataInicio?: string; dataFim?: string };
    const result = await financeService.getReceitaTotalPeriodo(arenaId, dataInicio, dataFim);
    res.json(result);
  });

  app.get("/api/finance/receita/aluno/:studentId", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const result = await financeService.getReceitaPorAluno(arenaId, req.params.studentId);
    res.json(result);
  });

  // ── /financeiro/resumo — summary endpoint with explicit field naming ────────
  app.get("/api/financeiro/resumo", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { dataInicio, dataFim } = req.query as { dataInicio?: string; dataFim?: string };
    const result = await financeService.getReceitaTotalPeriodo(arenaId, dataInicio, dataFim);
    res.json({
      totalCheckins: result.totalCheckins,
      receitaTotal: result.receitaTotal,
      receitaPorModalidade: result.porModalidade,
      receitaPorAluno: result.porAluno,
    });
  });

  // ── Integration Plans ──────────────────────────────────────────────────────
  app.get("/api/integracoes/planos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const lista = await storage.listIntegrationPlans(arenaId);
    res.json(lista);
  });

  app.post("/api/integracoes/planos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, valor, provider } = req.body;
    if (!nome || !provider) return res.status(400).json({ message: "Nome e provider são obrigatórios" });
    const plan = await storage.createIntegrationPlan({ arenaId, nome, valor: valor ?? "0.00", provider });
    res.json(plan);
  });

  app.put("/api/integracoes/planos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, valor } = req.body;
    const plan = await storage.updateIntegrationPlan(req.params.id, { nome, valor });
    res.json(plan);
  });

  app.delete("/api/integracoes/planos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    await storage.deleteIntegrationPlan(req.params.id);
    res.json({ ok: true });
  });

  // ── Integration Settings ───────────────────────────────────────────────────
  app.get("/api/integracoes/settings/:provider", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const settings = await storage.getIntegrationSettings(arenaId, req.params.provider);
    res.json(settings ?? { arenaId, provider: req.params.provider, apiKey: null, habilitado: false });
  });

  app.put("/api/integracoes/settings/:provider", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { apiKey, habilitado } = req.body;
    const settings = await storage.upsertIntegrationSettings({
      arenaId,
      provider: req.params.provider,
      apiKey: apiKey ?? null,
      habilitado: habilitado ?? false,
    });
    res.json(settings);
  });

  // ── Configurações do Sistema (Modalidade Settings) ────────────────────────
  app.get("/api/configuracoes/modalidades", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const lista = await storage.listModalidadeSettings(arenaId);
    res.json(lista);
  });

  app.put("/api/configuracoes/modalidades/:modalidade", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { modalidade } = req.params;
    const {
      wellhubPlanoMinimo, wellhubValorCheckin,
      totalpassPlanoMinimo, totalpassValorCheckin,
      // legado — mantido para compatibilidade
      valorPorCheckin, planoMinimo, totalpassHabilitado, wellhubHabilitado,
    } = req.body;

    // Auto-derive legado valorPorCheckin from the highest integration value, for backward compat
    const whVal = parseFloat(wellhubValorCheckin ?? "0") || 0;
    const tpVal = parseFloat(totalpassValorCheckin ?? "0") || 0;
    const derivedValor = Math.max(whVal, tpVal);

    const setting = await storage.upsertModalidadeSetting({
      arenaId,
      modalidade,
      valorPorCheckin: derivedValor > 0 ? derivedValor.toFixed(2) : (valorPorCheckin ?? "0.00"),
      planoMinimo: planoMinimo ?? null,
      totalpassHabilitado: totalpassHabilitado ?? tpVal > 0,
      wellhubHabilitado: wellhubHabilitado ?? whVal > 0,
      wellhubPlanoMinimo: wellhubPlanoMinimo ?? null,
      wellhubValorCheckin: wellhubValorCheckin ?? "0.00",
      totalpassPlanoMinimo: totalpassPlanoMinimo ?? null,
      totalpassValorCheckin: totalpassValorCheckin ?? "0.00",
    });
    res.json(setting);
  });

  app.get("/api/arena/:id", async (req, res) => {
    const arena = await storage.getArena(req.params.id);
    if (!arena) return res.status(404).json({ message: "Arena não encontrada" });
    res.json({ id: arena.id, name: arena.name, subscriptionPlan: arena.subscriptionPlan });
  });

  // ── Startup: backfill missing financial records for historical check-ins ──
  (async () => {
    try {
      const arenas = await storage.listArenas();
      for (const arena of arenas) {
        await financeService.backfillCheckinFinanceiro(arena.id);
      }
    } catch (_e) {}
  })();

  app.use(automationRouter);

  const httpServer = createServer(app);
  return httpServer;
}

function gerarLogin(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".");
}
