import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { storage } from "./storage";
import { financeService } from "./financeService";
import { getFinancialStatus } from "./financialStatusUtils";
import { automationRouter } from "./automationRoutes";
import { getWhatsappSettings, saveWhatsappSettings } from "./whatsappSettings";
import { sendWhatsappMessage } from "./whatsappApi";
import { getAutomationConfig, saveAutomationConfig, getPendingDispatches, markDispatchSent, markAllDispatchesSent, runWhatsappAutomation } from "./whatsappAutomation";
import { calcularComissao, getResumoPorProfessor } from "./commissionService";

const MemoryStoreSession = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    arenaId?: string;
    userType?: "gestor" | "professor" | "aluno";
    userId?: string;
    isAdmin?: boolean;
  }
}

let ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
let ADMIN_SENHA = process.env.ADMIN_SENHA || "admin";

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
  let sessionStore: any;

  if (process.env.REDIS_URL) {
    const redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => console.error("Redis error:", err));
    await redisClient.connect();
    sessionStore = new RedisStore({ client: redisClient, prefix: "arena:sess:" });
    console.log("✅ Redis Session Store ativo");
  } else {
    sessionStore = new MemoryStoreSession({ checkPeriod: 86400000 });
    console.log("⚠️ MemoryStore ativo (modo desenvolvimento)");
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "arena-secret-key",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  // ── Seed default arena on first boot ──────────────────────────────────────
  app.use(async (_req, _res, next) => {
    try {
      const existing = await storage.getArenaByGestorLogin("333");
      if (!existing) {
        const today = new Date().toLocaleDateString("pt-BR");
        const trialDate = new Date();
        trialDate.setDate(trialDate.getDate() + 7);
        const defaultArena = await storage.createArena({
          name: "Arena Beach Sports",
          subscriptionPlan: "premium",
          gestorLogin: "333",
          gestorSenha: "333",
          subscriptionStartDate: today,
          subscriptionValue: "R$ 199,00",
          subscriptionStatus: "Ativo",
          nextBillingDate: trialDate.toLocaleDateString("pt-BR"),
        });
        const p1 = await storage.createPlan({ arenaId: defaultArena.id, titulo: "1x por semana", checkins: 8, valorTexto: null });
        const p2 = await storage.createPlan({ arenaId: defaultArena.id, titulo: "2x por semana", checkins: 12, valorTexto: null });
        await storage.createPlan({ arenaId: defaultArena.id, titulo: "Mensalista", checkins: 0, valorTexto: "R$ 140,00" });
        await storage.createTeacher({ arenaId: defaultArena.id, nome: "Carlos Mendes", login: "222", senha: "222", modalidade: "Beach Tennis" });
        await storage.createTeacher({ arenaId: defaultArena.id, nome: "Fernanda Lima", login: "fernanda", senha: "admin", modalidade: "Vôlei de Praia" });
        await storage.createTeacher({ arenaId: defaultArena.id, nome: "Ricardo Souza", login: "ricardo", senha: "admin", modalidade: "Futevôlei" });
        const a1 = await storage.createStudent({
          arenaId: defaultArena.id, nome: "Maria Santos", login: "111", senha: "111",
          cpf: "987.654.321-00", modalidade: "Beach Tennis",
          planoId: p2.id, planoTitulo: p2.titulo, planoCheckins: p2.checkins, planoValorTexto: null,
          checkinsRealizados: 9, statusMensalidade: "Em dia", aprovado: true, ultimoCheckin: "02/01/2025", photoUrl: null,
        });
        for (const [data, hora] of [
          ["15/12/2024","18:30"],["18/12/2024","19:00"],["22/12/2024","18:45"],
          ["25/12/2024","19:15"],["29/12/2024","18:20"],["30/12/2024","18:00"],
          ["31/12/2024","17:45"],["01/01/2025","19:30"],["02/01/2025","18:30"],
        ]) {
          await storage.addCheckin({ arenaId: defaultArena.id, studentId: a1.id, data, hora });
        }
        const a2 = await storage.createStudent({
          arenaId: defaultArena.id, nome: "Pedro Oliveira", login: "pedro", senha: "admin",
          cpf: "456.789.123-00", modalidade: "Vôlei de Praia",
          planoId: p1.id, planoTitulo: p1.titulo, planoCheckins: p1.checkins, planoValorTexto: null,
          checkinsRealizados: 3, statusMensalidade: "Pendente", aprovado: true, ultimoCheckin: "30/12/2024", photoUrl: null,
        });
        for (const [data, hora] of [
          ["20/12/2024","18:00"],["25/12/2024","19:00"],["30/12/2024","19:00"],
        ]) {
          await storage.addCheckin({ arenaId: defaultArena.id, studentId: a2.id, data, hora });
        }
      }
    } catch (_e) {}

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
  // ── Self-service registration ─────────────────────────────────────────────
  app.post("/api/registro", async (req, res) => {
    const { nome, email, login, senha, nomeArena } = req.body;
    if (!nome?.trim() || !email?.trim() || !login?.trim() || !senha?.trim() || !nomeArena?.trim()) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }
    if (senha.length < 4) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 4 caracteres" });
    }
    const existing = await storage.getArenaByGestorLogin(login.trim());
    if (existing) {
      return res.status(409).json({ message: "Este login já está em uso. Escolha outro." });
    }
    const today = new Date();
    const trialExpira = new Date(today);
    trialExpira.setDate(trialExpira.getDate() + 7);
    const trialExpiraEm = trialExpira.toISOString().split("T")[0];
    const arena = await storage.createArena({
      name: nomeArena.trim(),
      subscriptionPlan: "basic",
      gestorLogin: login.trim(),
      gestorSenha: senha,
      gestorNome: nome.trim(),
      gestorEmail: email.trim(),
      subscriptionStartDate: today.toLocaleDateString("pt-BR"),
      subscriptionValue: "R$ 0,00",
      subscriptionStatus: "Trial",
      nextBillingDate: calcNextBillingDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")),
      statusConta: "trial",
      trialExpiraEm,
    });
    res.json({ ok: true, arenaId: arena.id, arenaName: arena.name });
  });

  app.post("/api/login", async (req, res) => {
    const { login, senha, lembrarDados } = req.body as { login: string; senha: string; lembrarDados?: boolean };
    if (!login || !senha) return res.status(400).json({ message: "Credenciais inválidas" });

    const allArenas = await storage.listArenas();

    for (const arena of allArenas) {
      if (arena.gestorLogin === login && arena.gestorSenha === senha) {
        // Verifica status do trial / conta
        if (arena.statusConta === "vencido") {
          return res.status(403).json({ message: "Acesso bloqueado. Assine um plano para continuar usando o Seven Sports." });
        }
        if (arena.statusConta === "trial" && arena.trialExpiraEm) {
          const expira = new Date(arena.trialExpiraEm);
          expira.setHours(23, 59, 59);
          if (expira < new Date()) {
            await storage.updateArena(arena.id, { statusConta: "vencido" });
            return res.status(403).json({ message: "Seu período de teste expirou. Assine um plano para continuar acessando." });
          }
        }
        req.session.arenaId = arena.id;
        req.session.userType = "gestor";
        req.session.userId = arena.id;
        if (lembrarDados) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        }
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
      return res.json({
        authenticated: true,
        tipo: "gestor",
        arenaId,
        arenaName: arena?.name,
        statusConta: arena?.statusConta ?? "ativo",
        trialExpiraEm: arena?.trialExpiraEm ?? null,
      });
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

  // ── Admin Auth ─────────────────────────────────────────────────────────────
  app.post("/api/admin/login", (req, res) => {
    const { login, senha } = req.body;
    if (login === ADMIN_LOGIN && senha === ADMIN_SENHA) {
      req.session.isAdmin = true;
      return res.json({ success: true });
    }
    return res.status(401).json({ message: "Credenciais de administrador inválidas" });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/admin/session", (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
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

  app.get("/api/recursos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const lista = await storage.listRecursos(arenaId);
    res.json(lista);
  });

  app.post("/api/recursos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, ativo } = req.body;
    if (!nome?.trim()) return res.status(400).json({ message: "Nome é obrigatório" });
    const recurso = await storage.createRecurso({ arenaId, nome: nome.trim(), ativo: ativo ?? true });
    res.json(recurso);
  });

  app.put("/api/recursos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, ativo } = req.body;
    const updated = await storage.updateRecurso(req.params.id, {
      ...(nome !== undefined ? { nome } : {}),
      ...(ativo !== undefined ? { ativo } : {}),
    });
    res.json(updated);
  });

  app.post("/api/professores", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, modalidade, cpf, email, telefone, percentualComissao } = req.body;
    const login = req.body.login?.trim() || gerarLogin(nome);
    const senha = req.body.senha?.trim() || "admin";
    const teacher = await storage.createTeacher({ arenaId, nome, login, senha, cpf: cpf ?? null, email: email ?? null, telefone: telefone ?? null, modalidade, percentualComissao: percentualComissao ?? "0.00" });
    res.json({ ...teacher, senha: undefined, loginGerado: login, senhaGerada: senha });
  });

  app.put("/api/professores/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, cpf, email, telefone, login, senha, modalidade, percentualComissao } = req.body;
    const updateData: Record<string, any> = { nome, modalidade };
    if (cpf !== undefined) updateData.cpf = cpf || null;
    if (email !== undefined) updateData.email = email || null;
    if (telefone !== undefined) updateData.telefone = telefone || null;
    if (login !== undefined) updateData.login = login;
    if (senha) updateData.senha = senha;
    if (percentualComissao !== undefined) updateData.percentualComissao = percentualComissao;
    if (req.body.photoUrl !== undefined) updateData.photoUrl = req.body.photoUrl || null;
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

  app.get("/api/alunos/inativos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const lista = await storage.listInactiveStudents(arenaId);
    res.json(lista);
  });

  app.put("/api/alunos/:id/reativar", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const student = await storage.reactivateStudent(req.params.id);
    res.json(student);
  });

  app.post("/api/alunos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, cpf, modalidade, planoId, email, telefone, integrationType, integrationPlan, mensalistaValor, professorId } = req.body;
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
      professorId: professorId ?? null,
    });

    if (integrationType === "mensalista") {
      const valorFonte = plan.valorTexto ?? (mensalistaValor ? `R$ ${mensalistaValor}` : null);
      if (valorFonte) {
        const now = new Date();
        const refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const dueDay = req.body.diaVencimento ? String(req.body.diaVencimento).padStart(2, "0") : "10";
        const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${dueDay}`;
        const amount = valorFonte.replace(/[^0-9,]/g, "").replace(",", ".");
        await storage.createPayment({
          tenantId: arenaId, studentId: student.id, planId: plan.id,
          description: `Mensalidade ${refMonth}`, amount, referenceMonth: refMonth,
          dueDate, paymentDate: null, status: "pending",
          paymentMethod: req.body.paymentMethod ?? "dinheiro",
          createdBy: "sistema",
        });
      }
    }

    res.json({ ...student, loginGerado: login, senhaGerada: senha, historico: [] });
  });

  app.put("/api/alunos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, cpf, email, telefone, login, senha, modalidade, statusMensalidade, checkinsRealizados, integrationType, integrationPlan, professorId } = req.body;
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
    if (professorId !== undefined) updates.professorId = professorId || null;
    if (req.body.photoUrl !== undefined) updates.photoUrl = req.body.photoUrl || null;
    const student = await storage.updateStudent(req.params.id, updates);
    const integrationChanged =
      (integrationType !== undefined && integrationType !== studentBefore?.integrationType) ||
      (integrationPlan !== undefined && integrationPlan !== studentBefore?.integrationPlan) ||
      (modalidade !== undefined && modalidade !== studentBefore?.modalidade);
    if (integrationChanged) {
      try { await financeService.recalcularReceitaAluno(arenaId, req.params.id); } catch (_e) {}
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
    await storage.deactivateStudent(req.params.id);
    res.json({ ok: true });
  });

  // ── Checkins ──────────────────────────────────────────────────────────────
  app.post("/api/alunos/:id/checkin", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const student = await storage.getStudent(req.params.id);
    if (!student) return res.status(404).json({ message: "Aluno não encontrado" });

    if (student.integrationType === "none") {
      const financialStatus = await getFinancialStatus(student.id, arenaId);
      if (financialStatus === "inadimplente") {
        return res.status(403).json({ message: "Check-in bloqueado: aluno com mensalidade em atraso." });
      }
    }

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

    try {
      await financeService.calcularReceitaCheckin(arenaId, student.id, student.modalidade, checkinEntry.id, data);
    } catch (_e) {}

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
    const data = dataISO ? new Date(dataISO + "T12:00:00").toLocaleDateString("pt-BR") : "";
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

    const allCheckins = await storage.listCheckins(student.id);
    const checkinToRemove = allCheckins[index];
    if (checkinToRemove?.id) {
      try { await storage.cancelCheckinFinanceiro(checkinToRemove.id); } catch (_e) {}
      try { await storage.cancelCommissionByCheckinId(checkinToRemove.id); } catch (_e) {}
    }

    await storage.removeCheckinByIndex(student.id, index);
    const historico = await storage.listCheckins(student.id);
    const updated = await storage.updateStudent(student.id, {
      checkinsRealizados: Math.max(0, student.checkinsRealizados - 1),
      ultimoCheckin: historico.length > 0 ? historico[historico.length - 1].data : null,
    });
    res.json({ ...updated, historico });
  });

  // ── Check-in Log (todos os check-ins da arena, enriquecido) ──────────────
  app.get("/api/checkins/log", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const checkins = await storage.listAllCheckinsByArena(arenaId);
    const students = await storage.listStudents(arenaId);
    const teachers = await storage.listTeachers(arenaId);
    const studentMap = new Map(students.map(s => [s.id, s]));
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const result = checkins.map(c => ({
      ...c,
      alunoNome: studentMap.get(c.studentId ?? "")?.nome ?? "—",
      alunoModalidade: studentMap.get(c.studentId ?? "")?.modalidade ?? "—",
      professorNome: c.professorId ? (teacherMap.get(c.professorId)?.nome ?? "—") : null,
    }));
    res.json(result);
  });

  // ── Atribuir check-in (tipo + professor) ─────────────────────────────────
  app.put("/api/checkins/:id/atribuir", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { tipo, professorId } = req.body;
    if (!tipo) return res.status(400).json({ message: "tipo é obrigatório" });

    const checkin = await storage.getCheckinById(req.params.id);
    if (!checkin) return res.status(404).json({ message: "Check-in não encontrado" });

    const updated = await storage.atribuirCheckin(req.params.id, tipo, professorId ?? null);

    if (tipo === "aula" && professorId) {
      try {
        const finEntry = await storage.getCheckinFinanceiroByCheckinId(req.params.id);
        const valorCheckin = finEntry?.valorTotal ?? "0.00";
        await calcularComissao(arenaId, req.params.id, professorId, checkin.studentId ?? "", valorCheckin, checkin.data);
      } catch (_e) {}
    } else {
      try { await storage.cancelCommissionByCheckinId(req.params.id); } catch (_e) {}
    }

    res.json(updated);
  });

  // ── Comissões ─────────────────────────────────────────────────────────────
  app.get("/api/finance/comissao/resumo", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const resumo = await getResumoPorProfessor(arenaId);
    res.json(resumo);
  });

  app.get("/api/finance/comissao/professor/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const commissions = await storage.listCommissionsByTeacher(req.params.id);
    const students = await storage.listStudents(arenaId);
    const studentMap = new Map(students.map(s => [s.id, s]));
    const result = commissions.map(c => ({
      ...c,
      alunoNome: studentMap.get(c.studentId ?? "")?.nome ?? "—",
    }));
    res.json(result);
  });

  app.get("/api/finance/comissoes", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const commissions = await storage.listCommissionsByArena(arenaId);
    const teachers = await storage.listTeachers(arenaId);
    const students = await storage.listStudents(arenaId);
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const studentMap = new Map(students.map(s => [s.id, s]));
    const result = commissions.map(c => ({
      ...c,
      professorNome: teacherMap.get(c.teacherId ?? "")?.nome ?? "—",
      alunoNome: studentMap.get(c.studentId ?? "")?.nome ?? "—",
    }));
    res.json(result);
  });

  app.put("/api/finance/comissao/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { valorComissao, status, observacao } = req.body;
    const updated = await storage.updateCommission(req.params.id, { valorComissao, status, observacao });
    res.json(updated);
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

    await storage.updateArena(arenaId, { subscriptionStatus: "Ativo", nextBillingDate: nextBilling });
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

  app.get("/api/admin/password-reset-history", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const history = await storage.listPasswordResetTokens();
      res.json(history);
    } catch {
      res.status(500).json({ message: "Erro ao buscar histórico" });
    }
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
    const normalizedGestorLogin = (gestorEmail ?? gestorLogin)?.trim?.() ?? "";
    if (!name || !normalizedGestorLogin || !gestorSenha) {
      return res.status(400).json({ message: "Nome, login e senha são obrigatórios" });
    }
    const planType = subscriptionPlan || "basic";
    const platformPlanList = await storage.listPlatformPlans();
    const platformPlan = platformPlanList.find((p) => p.planType === planType);
    const today = new Date().toLocaleDateString("pt-BR");
    const arena = await storage.createArena({
      name,
      subscriptionPlan: planType,
      gestorLogin: normalizedGestorLogin,
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

  app.post("/api/admin/arenas/rename-existing", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const arenas = await storage.listArenas();
    const updated = [];
    for (const arena of arenas) {
      const nextName = arena.name === "Arena Padrão" || arena.name === "SEVEN SPORTS" ? "Arena Beach Sports" : arena.name;
      if (nextName !== arena.name) {
        updated.push(await storage.updateArena(arena.id, { name: nextName }));
      }
    }
    res.json({ ok: true, updated: updated.length });
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
    if (gestorEmail !== undefined) updates.gestorLogin = gestorEmail;
    else if (gestorLogin !== undefined) updates.gestorLogin = gestorLogin;
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

  // ── Public platform plan (single plan for landing page) ────────────────────
  app.get("/api/platform-plans/public", async (_req, res) => {
    try {
      const [plans, settings] = await Promise.all([
        storage.listPlatformPlans(),
        storage.getAllPlatformSettings(),
      ]);
      const plan = plans.find((p) => p.planType === "premium") ?? plans[0];
      res.json({
        monthlyValue: plan?.monthlyValue ?? "—",
        planNome: settings["plan_nome"] || "Seven Sports",
        planDescricao: settings["plan_descricao"] || "Tudo incluído em um único plano.",
        planFeatures: settings["plan_features"] || "Check-ins digitais ilimitados|Gestão completa de alunos|Financeiro e mensalidades|Professores e comissões|Relatórios e alertas|Acesso pelo celular|Suporte incluso",
      });
    } catch {
      res.status(500).json({ message: "Erro" });
    }
  });

  // ── Platform Plans ─────────────────────────────────────────────────────────
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

  // ── Arena Subscription Payment History ──────────────────────────────────────
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
    const { studentId, planId, amount, referenceMonth, dueDate, status, description, paymentMethod } = req.body;
    if (!studentId || !amount || !referenceMonth || !dueDate) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }
    const payment = await storage.createPayment({
      tenantId: arenaId, studentId, planId: planId ?? null,
      description: description ?? null,
      amount, referenceMonth, dueDate,
      paymentDate: status === "paid" ? new Date().toLocaleDateString("pt-BR") : null,
      status: status ?? "pending",
      paymentMethod: paymentMethod ?? "dinheiro",
      createdBy: req.session.userType ?? "gestor",
    });
    res.json(payment);
  });

  app.put("/api/finance/payments/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { status, paymentDate, paymentMethod } = req.body;
    const payment = await storage.updatePaymentStatus(req.params.id, status, paymentDate, paymentMethod);
    if (status === "paid" && payment?.studentId) {
      const today = paymentDate || new Date().toLocaleDateString("pt-BR");
      await storage.updateStudent(payment.studentId, { ultimoCheckin: today });
    }
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
    if (status === "paid" && charge?.studentId) {
      const today = paymentDate || new Date().toLocaleDateString("pt-BR");
      await storage.updateStudent(charge.studentId, { ultimoCheckin: today });
    }
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
    const { receiverName, pixKey, pixQrcodeImage, banco, agencia, numeroConta, tipoConta, cpfCnpj, bankApiKey, bankWebhookUrl } = req.body;
    const settings = await storage.upsertPaymentSettings({ tenantId: arenaId, receiverName, pixKey, pixQrcodeImage, banco, agencia, numeroConta, tipoConta, cpfCnpj, bankApiKey, bankWebhookUrl });
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

  // ── Receita por Check-in ───────────────────────────────────────────────────
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

  // Legacy dashboard route
  app.get("/api/financeiro/dashboard", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const checkinsFinanceiros = await storage.listCheckinFinanceiro(arenaId) || [];
    const receitaWellhub = checkinsFinanceiros.filter(c => c.integrationType === "wellhub").reduce((acc, c) => acc + Number(c.valorTotal), 0);
    const receitaTotalpass = checkinsFinanceiros.filter(c => c.integrationType === "totalpass").reduce((acc, c) => acc + Number(c.valorTotal), 0);
    const receitaNormal = checkinsFinanceiros.filter(c => c.integrationType === "none").reduce((acc, c) => acc + Number(c.valorTotal), 0);
    res.json({ receitaWellhub, receitaTotalpass, receitaNormal });
  });

  // ── Relatórios Financeiros ────────────────────────────────────────────────

  function parsePtBRDate(dateStr: string): Date | null {
    const parts = dateStr.split("/");
    if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
    return null;
  }

  // Visão Geral Mensal
  app.get("/api/finance/relatorio/visao-geral", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const now = new Date();
      const mesSel = req.query.mes ? parseInt(req.query.mes as string) : now.getMonth() + 1;
      const anoSel = req.query.ano ? parseInt(req.query.ano as string) : now.getFullYear();
      const referenceMonth = `${String(mesSel).padStart(2, "0")}/${anoSel}`;

      const [allPayments, allCheckins, allCheckinFin, students] = await Promise.all([
        storage.listPayments(arenaId),
        storage.listAllCheckinsByArena(arenaId),
        storage.listCheckinFinanceiro(arenaId),
        storage.listStudents(arenaId),
      ]);

      const studentMap = new Map(students.map(s => [s.id, s]));
      const monthPayments = allPayments.filter(p => p.referenceMonth === referenceMonth);
      const monthCheckins = allCheckins.filter(c => {
        const parts = c.data.split("/");
        return parts.length === 3 && parseInt(parts[1]) === mesSel && parseInt(parts[2]) === anoSel;
      });
      const checkinIds = new Set(monthCheckins.map(c => c.id));
      const monthCF = allCheckinFin.filter(cf => cf.checkinId && checkinIds.has(cf.checkinId));
      const cfMap = new Map(monthCF.map(cf => [cf.checkinId, cf]));

      const receitaMensalidades = monthPayments.filter(p => p.status === "paid").reduce((a, p) => a + parseFloat(p.amount?.replace(/[^0-9.]/g, "") || "0"), 0);
      const receitaCheckins = monthCF.reduce((a, cf) => a + parseFloat(cf.valorTotal || "0"), 0);
      const receitaWellhub = monthCF.filter(cf => cf.integrationType === "wellhub").reduce((a, cf) => a + parseFloat(cf.valorTotal || "0"), 0);
      const receitaTotalpass = monthCF.filter(cf => cf.integrationType === "totalpass").reduce((a, cf) => a + parseFloat(cf.valorTotal || "0"), 0);

      const porTipo: Record<string, { count: number; receita: number }> = {};
      const porModalidade: Record<string, { count: number; receita: number; visitantes: Set<string> }> = {};
      const porDia: Record<string, { count: number; receita: number }> = {};

      for (const c of monthCheckins) {
        const tipo = c.tipo || "pendente";
        porTipo[tipo] = porTipo[tipo] || { count: 0, receita: 0 };
        porTipo[tipo].count++;
        const fin = cfMap.get(c.id);
        if (fin) porTipo[tipo].receita += parseFloat(fin.valorTotal || "0");

        const student = studentMap.get(c.studentId ?? "");
        const mod = student?.modalidade ?? "Outros";
        porModalidade[mod] = porModalidade[mod] || { count: 0, receita: 0, visitantes: new Set() };
        porModalidade[mod].count++;
        if (c.studentId) porModalidade[mod].visitantes.add(c.studentId);
        if (fin) porModalidade[mod].receita += parseFloat(fin.valorTotal || "0");

        const dia = c.data.split("/")[0] || "0";
        porDia[dia] = porDia[dia] || { count: 0, receita: 0 };
        porDia[dia].count++;
        if (fin) porDia[dia].receita += parseFloat(fin.valorTotal || "0");
      }

      const visitantesUnicos = new Set(monthCheckins.map(c => c.studentId).filter(Boolean)).size;
      const pagas = monthPayments.filter(p => p.status === "paid").length;
      const pendentes = monthPayments.filter(p => p.status === "pending").length;
      const atrasadas = monthPayments.filter(p => p.status === "overdue").length;

      res.json({
        mes: mesSel, ano: anoSel, referenceMonth,
        totalCheckins: monthCheckins.length,
        visitantesUnicos,
        receitaMensalidades, receitaCheckins, receitaWellhub, receitaTotalpass,
        receitaTotal: receitaMensalidades + receitaCheckins,
        mensalidadesPagas: pagas, mensalidadesPendentes: pendentes, mensalidadesAtrasadas: atrasadas,
        totalMensalidades: monthPayments.length,
        porTipo: Object.entries(porTipo).map(([tipo, d]) => ({ tipo, ...d })),
        porModalidade: Object.entries(porModalidade).map(([modalidade, d]) => ({ modalidade, count: d.count, receita: d.receita, visitantes: d.visitantes.size })),
        porDia: Object.entries(porDia).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([dia, d]) => ({ dia: parseInt(dia), ...d })),
      });
    } catch (e: any) { res.status(500).json({ message: e?.message }); }
  });

  // Pagamento por Visitante
  app.get("/api/finance/relatorio/por-visitante", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { dataInicio, dataFim, busca } = req.query as Record<string, string>;
      const inicio = dataInicio ? new Date(dataInicio + "T00:00:00Z") : null;
      const fim = dataFim ? new Date(dataFim + "T23:59:59Z") : null;

      const [allCheckins, students, allCF] = await Promise.all([
        storage.listAllCheckinsByArena(arenaId),
        storage.listStudents(arenaId),
        storage.listCheckinFinanceiro(arenaId),
      ]);

      const studentMap = new Map(students.map(s => [s.id, s]));
      const cfMap = new Map(allCF.map(cf => [cf.checkinId, cf]));

      const filtered = allCheckins.filter(c => {
        const d = parsePtBRDate(c.data);
        if (!d) return true;
        if (inicio && d < inicio) return false;
        if (fim && d > fim) return false;
        return true;
      });

      const porVisitante: Record<string, any> = {};
      for (const c of filtered) {
        const sid = c.studentId ?? "unknown";
        const student = studentMap.get(sid);
        if (!porVisitante[sid]) {
          porVisitante[sid] = { studentId: sid, nome: student?.nome ?? "—", cpf: student?.cpf ?? null, totalCheckins: 0, receita: 0, porTipo: {} as Record<string, number>, porModalidade: {} as Record<string, number>, ultimoCheckin: c.data };
        }
        const v = porVisitante[sid];
        v.totalCheckins++;
        v.ultimoCheckin = c.data;
        const tipo = c.tipo || "pendente";
        v.porTipo[tipo] = (v.porTipo[tipo] || 0) + 1;
        const mod = student?.modalidade ?? "Outros";
        v.porModalidade[mod] = (v.porModalidade[mod] || 0) + 1;
        const fin = cfMap.get(c.id);
        if (fin) v.receita += parseFloat(fin.valorTotal || "0");
      }

      let result = Object.values(porVisitante).map((v: any) => ({
        ...v,
        porTipo: Object.entries(v.porTipo).map(([tipo, count]) => ({ tipo, count })),
        porModalidade: Object.entries(v.porModalidade).map(([modalidade, count]) => ({ modalidade, count })),
      }));

      if (busca) {
        const q = busca.toLowerCase();
        result = result.filter((v: any) => v.nome.toLowerCase().includes(q) || (v.cpf ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "")));
      }

      result.sort((a: any, b: any) => b.totalCheckins - a.totalCheckins);
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e?.message }); }
  });

  // Detalhes de Check-ins
  app.get("/api/finance/relatorio/detalhes-checkins", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { dataInicio, dataFim } = req.query as Record<string, string>;
      const inicio = dataInicio ? new Date(dataInicio + "T00:00:00Z") : null;
      const fim = dataFim ? new Date(dataFim + "T23:59:59Z") : null;

      const [allCheckins, students, teachers, allCF] = await Promise.all([
        storage.listAllCheckinsByArena(arenaId),
        storage.listStudents(arenaId),
        storage.listTeachers(arenaId),
        storage.listCheckinFinanceiro(arenaId),
      ]);

      const studentMap = new Map(students.map(s => [s.id, s]));
      const teacherMap = new Map(teachers.map(t => [t.id, t]));
      const cfMap = new Map(allCF.map(cf => [cf.checkinId, cf]));

      const filtered = allCheckins.filter(c => {
        const d = parsePtBRDate(c.data);
        if (!d) return true;
        if (inicio && d < inicio) return false;
        if (fim && d > fim) return false;
        return true;
      });

      const result = filtered.map(c => {
        const student = studentMap.get(c.studentId ?? "");
        const teacher = c.professorId ? teacherMap.get(c.professorId) : null;
        const fin = cfMap.get(c.id);
        return {
          id: c.id, data: c.data, hora: c.hora, tipo: c.tipo,
          alunoNome: student?.nome ?? "—", alunoCpf: student?.cpf ?? null,
          modalidade: student?.modalidade ?? "—", integrationType: student?.integrationType ?? "none",
          professorNome: teacher?.nome ?? null,
          valor: parseFloat(fin?.valorTotal || "0"),
          integracao: fin?.integrationType ?? null,
        };
      });

      result.sort((a, b) => {
        const da = parsePtBRDate(a.data), db = parsePtBRDate(b.data);
        if (da && db && da.getTime() !== db.getTime()) return db.getTime() - da.getTime();
        return b.hora.localeCompare(a.hora);
      });

      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e?.message }); }
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

  // ── Analytics ──────────────────────────────────────────────────────────────
  app.get("/api/analytics", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;

    const now = new Date();
    const mesAtual = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const haCatorze = new Date(now);
    haCatorze.setDate(haCatorze.getDate() - 14);

    const [ativos, inativos, allPayments, allCharges, allCheckins] = await Promise.all([
      storage.listStudents(arenaId),
      storage.listInactiveStudents(arenaId),
      storage.listPayments(arenaId),
      storage.listCharges(arenaId),
      storage.listAllCheckins(arenaId),
    ]);

    // Receita do mês (pagamentos + cobranças pagos no mês)
    const receitaMes = [...allPayments, ...allCharges]
      .filter((p) => p.status === "paid" && p.paymentDate?.slice(-7) === mesAtual.split("/").reverse().join("/").slice(-7))
      .reduce((acc, p) => acc + parseFloat((p.amount || "0").replace(",", ".")), 0);

    // Pendentes (apenas pendente ou overdue)
    const pendentesValor = [...allPayments, ...allCharges]
      .filter((p) => p.status === "pending" || p.status === "overdue")
      .reduce((acc, p) => acc + parseFloat((p.amount || "0").replace(",", ".")), 0);

    const cobrancasPendentes = [...allPayments, ...allCharges].filter(
      (p) => p.status === "pending" || p.status === "overdue"
    );

    // Novos este mês
    const novosMes = ativos.filter((s: any) => {
      if (!s.criadoEm) return false;
      const d = new Date(s.criadoEm);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    // Desativados este mês
    const desativadosMes = inativos.filter((s: any) => {
      if (!s.desativadoEm) return false;
      const parts = s.desativadoEm.split("/");
      if (parts.length !== 3) return false;
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    // Check-ins do mês
    const checkinsMes = allCheckins.filter((c: any) => {
      if (!c.data) return false;
      const parts = c.data.split("/");
      if (parts.length !== 3) return false;
      return parts[1] === String(now.getMonth() + 1).padStart(2, "0") && parts[2] === String(now.getFullYear());
    });

    // Distribuição por plano
    const porPlano: Record<string, number> = {};
    ativos.forEach((s: any) => {
      const titulo = s.planoTitulo || "Sem plano";
      porPlano[titulo] = (porPlano[titulo] || 0) + 1;
    });

    // Distribuição por integração
    const porIntegracao: Record<string, number> = {};
    ativos.forEach((s: any) => {
      const tipo = s.integrationType === "none" ? "mensalista" : (s.integrationType || "mensalista");
      porIntegracao[tipo] = (porIntegracao[tipo] || 0) + 1;
    });

    // Alunos com baixa frequência (não vieram há mais de 14 dias ou nunca vieram)
    const baixaFrequencia = ativos.filter((s: any) => {
      if (!s.ultimoCheckin) return true;
      const parts = s.ultimoCheckin.split("/");
      if (parts.length !== 3) return true;
      const ultimo = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return ultimo < haCatorze;
    });

    res.json({
      alunos: {
        total: ativos.length,
        inativos: inativos.length,
        novosMes: novosMes.length,
        desativadosMes: desativadosMes.length,
        baixaFrequencia: baixaFrequencia.length,
        baixaFrequenciaLista: baixaFrequencia.map((s: any) => ({
          id: s.id, nome: s.nome, modalidade: s.modalidade,
          ultimoCheckin: s.ultimoCheckin || null,
        })),
      },
      financeiro: {
        receitaMes: receitaMes.toFixed(2),
        pendentesValor: pendentesValor.toFixed(2),
        cobrancasPendentes: cobrancasPendentes.length,
        pendentesLista: cobrancasPendentes.map((p: any) => ({
          id: p.id, tipo: p.referenceMonth ? "pagamento" : "cobranca",
          studentId: p.studentId, amount: p.amount, status: p.status,
          dueDate: p.dueDate,
        })),
      },
      checkins: {
        totalMes: checkinsMes.length,
      },
      distribuicao: { porPlano, porIntegracao },
    });
  });

  // ── Modalidade Settings ────────────────────────────────────────────────────
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
      valorPorCheckin, planoMinimo, totalpassHabilitado, wellhubHabilitado,
    } = req.body;
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

  // ── Platform Settings (admin) ──────────────────────────────────────────────
  app.get("/api/admin/platform-settings", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const settings = await storage.getAllPlatformSettings();
      res.json(settings);
    } catch {
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  app.put("/api/admin/platform-settings", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const updates: Record<string, string> = req.body;
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === "string") await storage.setPlatformSetting(key, value);
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Erro ao salvar configurações" });
    }
  });

  // ── Public platform settings (for login pages) ────────────────────────────
  app.get("/api/platform-settings/public", async (_req, res) => {
    try {
      const settings = await storage.getAllPlatformSettings();
      res.json({
        suporteEmail: settings["suporte_email"] ?? "",
        suporteTelefone: settings["suporte_telefone"] ?? "",
        suporteWhatsapp: settings["suporte_whatsapp"] ?? "",
        sacTexto: settings["sac_texto"] ?? "",
        resendApiKey: settings["resend_api_key"] ?? "",
      });
    } catch {
      res.status(500).json({ message: "Erro ao buscar configurações públicas" });
    }
  });

  // ── Password Reset ─────────────────────────────────────────────────────────
  app.post("/api/password-reset/request", async (req, res) => {
    const { arenaId, gestorEmail } = req.body;
    if (!arenaId || !gestorEmail) return res.status(400).json({ message: "Dados incompletos" });
    try {
      const arena = await storage.getArena(arenaId);
      if (!arena) return res.status(404).json({ message: "Arena não encontrada" });
      if (!arena.gestorEmail || arena.gestorEmail.toLowerCase() !== gestorEmail.toLowerCase()) {
        return res.status(400).json({ message: "E-mail não corresponde ao cadastrado nesta arena" });
      }
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      await storage.createPasswordResetToken(arenaId, token, expiresAt);

      const resendApiKey = await storage.getPlatformSetting("resend_api_key");
      const suporteEmail = (await storage.getPlatformSetting("suporte_email")) ?? "noreply@sevensports.com.br";
      const resetUrl = `${process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`}/reset-senha?token=${token}`;

      if (resendApiKey) {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: `Seven Sports <${suporteEmail}>`,
          to: gestorEmail,
          subject: "Redefinição de senha — Seven Sports",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#1d4ed8">Seven Sports</h2>
              <p>Olá! Recebemos uma solicitação para redefinir a senha da arena <strong>${arena.name}</strong>.</p>
              <p>Clique no botão abaixo para redefinir sua senha. O link é válido por 2 horas.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">Redefinir minha senha</a>
              <p style="color:#6b7280;font-size:12px">Se você não solicitou isso, ignore este e-mail.</p>
            </div>
          `,
        });
        res.json({ ok: true, emailEnviado: true });
      } else {
        res.json({ ok: true, emailEnviado: false, token });
      }
    } catch (e: any) {
      res.status(500).json({ message: "Erro ao processar solicitação: " + (e?.message ?? "") });
    }
  });

  app.post("/api/password-reset/confirm", async (req, res) => {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ message: "Dados incompletos" });
    try {
      const record = await storage.getPasswordResetToken(token);
      if (!record) return res.status(400).json({ message: "Token inválido" });
      if (record.used) return res.status(400).json({ message: "Token já utilizado" });
      if (new Date() > record.expiresAt) return res.status(400).json({ message: "Token expirado" });
      await storage.updateArena(record.arenaId!, { gestorSenha: novaSenha });
      await storage.markPasswordResetTokenUsed(record.id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });

  // ── Backfill + migrate historical financial records on startup ───────────
  (async () => {
    try {
      const arenas = await storage.listArenas();
      for (const arena of arenas) {
        await financeService.backfillCheckinFinanceiro(arena.id);
        await financeService.migrarCheckinsAntigos(arena.id);
      }
    } catch (_e) {}
  })();

  // ── WhatsApp Settings ───────────────────────────────────────────────
  app.get("/api/whatsapp/settings", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;

    try {
      const settings = await getWhatsappSettings(arenaId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar configurações do WhatsApp" });
    }
  });

  app.post("/api/whatsapp/settings", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;

    const { whatsapp_number, default_message, provider, apiKey, instanceId, apiUrl, webhookToken } = req.body;

    try {
      const saved = await saveWhatsappSettings({
        arenaId,
        whatsapp_number,
        default_message,
        provider,
        apiKey,
        instanceId,
        apiUrl,
        webhookToken,
      });

      res.json(saved);
    } catch (error) {
      res.status(500).json({ message: "Erro ao salvar configurações do WhatsApp" });
    }
  });

  // ── WhatsApp Send (manual link ou API) ────────────────────────────────────
  app.post("/api/whatsapp/send", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { telefone, mensagem } = req.body;
      const settings = await getWhatsappSettings(arenaId);
      const result = await sendWhatsappMessage(settings, telefone, mensagem);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e?.message ?? "Erro ao enviar mensagem" });
    }
  });
  
  // ── WhatsApp Automation Config ───────────────────────────────────────────
  app.get("/api/whatsapp/automation", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const config = await getAutomationConfig(arenaId);
      res.json(config);
    } catch {
      res.status(500).json({ message: "Erro ao buscar configuração de automação" });
    }
  });

  app.post("/api/whatsapp/automation", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const saved = await saveAutomationConfig(arenaId, req.body);
      res.json(saved);
    } catch {
      res.status(500).json({ message: "Erro ao salvar configuração de automação" });
    }
  });

  // ── WhatsApp Dispatch Queue ──────────────────────────────────────────────
  app.get("/api/whatsapp/dispatches", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const dispatches = await getPendingDispatches(arenaId);
      res.json(dispatches);
    } catch {
      res.status(500).json({ message: "Erro ao buscar fila de disparos" });
    }
  });

  app.put("/api/whatsapp/dispatches/:id/sent", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      await markDispatchSent(req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Erro ao marcar disparo como enviado" });
    }
  });

  app.put("/api/whatsapp/dispatches/sent-all", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      await markAllDispatchesSent(arenaId);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Erro ao marcar todos como enviado" });
    }
  });

  app.post("/api/whatsapp/run-automation", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      await runWhatsappAutomation(arenaId);
      const dispatches = await getPendingDispatches(arenaId);
      res.json({ ok: true, novos: dispatches.length });
    } catch (e) {
      res.status(500).json({ message: "Erro ao executar automação" });
    }
  });

  app.use(automationRouter);

  // ── Turmas (Classes / Schedule) ───────────────────────────────────────────
  app.get("/api/turmas", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const lista = await storage.listTurmas(arenaId);
      const teacherList = await storage.listTeachers(arenaId);
      const recursoList = await storage.listRecursos(arenaId);
      const teacherMap = new Map(teacherList.map((t) => [t.id, t]));
      const recursoMap = new Map(recursoList.map((r) => [r.id, r]));
      const result = await Promise.all(
        lista.map(async (t) => {
          const enrollments = await storage.listTurmaAlunos(t.id);
          return {
            ...t,
            professorNome: t.professorId ? (teacherMap.get(t.professorId)?.nome ?? "—") : null,
            recursoNome: t.recursoId ? (recursoMap.get(t.recursoId)?.nome ?? "—") : null,
            alunosCount: enrollments.length,
          };
        })
      );
      res.json(result);
    } catch { res.status(500).json({ message: "Erro ao listar turmas" }); }
  });

  app.post("/api/turmas", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { nome, modalidade, professorId, recursoId, diasSemana, horarioInicio, horarioFim, capacidadeMaxima, cor, dataAula } = req.body;
      const turma = await storage.createTurma({
        arenaId, nome, modalidade,
        professorId: professorId || null,
        recursoId: recursoId || null,
        diasSemana: diasSemana || "",
        horarioInicio, horarioFim,
        capacidadeMaxima: capacidadeMaxima ?? 20,
        cor: cor || "#1565C0",
        ativo: true,
        dataAula: dataAula || null,
      });
      res.json(turma);
    } catch (e) { res.status(400).json({ message: e instanceof Error ? e.message : "Erro ao criar turma" }); }
  });

  app.put("/api/turmas/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { nome, modalidade, professorId, recursoId, diasSemana, horarioInicio, horarioFim, capacidadeMaxima, cor, ativo, dataAula } = req.body;
      const turma = await storage.updateTurma(req.params.id, {
        nome, modalidade,
        professorId: professorId || null,
        recursoId: recursoId || null,
        diasSemana, horarioInicio, horarioFim,
        capacidadeMaxima, cor,
        dataAula: dataAula ?? undefined,
        ...(ativo !== undefined ? { ativo } : {}),
      });
      res.json(turma);
    } catch (e) { res.status(400).json({ message: e instanceof Error ? e.message : "Erro ao atualizar turma" }); }
  });

  app.get("/api/recursos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const list = await storage.listRecursos(arenaId);
      res.json(list);
    } catch {
      res.json([]);
    }
  });

  app.post("/api/recursos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { nome, ativo } = req.body;
      if (!nome?.trim()) return res.status(400).json({ message: "Nome é obrigatório" });
      const recurso = await storage.createRecurso({ arenaId, nome: nome.trim(), ativo: ativo ?? true, tipo: "sala" });
      if (!recurso) return res.status(500).json({ message: "Não foi possível salvar a sala" });
      res.json(recurso);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Não foi possível salvar a sala" });
    }
  });

  app.put("/api/recursos/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { nome, ativo } = req.body;
      const recurso = await storage.updateRecurso(req.params.id, { nome, ativo });
      if (!recurso) return res.status(500).json({ message: "Não foi possível atualizar a sala" });
      res.json(recurso);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Não foi possível atualizar a sala" });
    }
  });

  app.delete("/api/turmas/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      await storage.deleteTurma(req.params.id);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Erro ao excluir turma" }); }
  });

  app.get("/api/turmas/:id/alunos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const enrollments = await storage.listTurmaAlunos(req.params.id);
      const allStudents = await storage.listStudents(arenaId);
      const studentMap = new Map(allStudents.map((s) => [s.id, s]));
      const result = enrollments.map((e) => ({
        ...e,
        aluno: studentMap.get(e.alunoId ?? "") ?? null,
      }));
      res.json(result);
    } catch { res.status(500).json({ message: "Erro ao listar alunos da turma" }); }
  });

  app.post("/api/turmas/:id/alunos", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      const { alunoId } = req.body;
      const today = new Date().toLocaleDateString("pt-BR");
      const enrollment = await storage.enrollAluno({
        arenaId, turmaId: req.params.id, alunoId, dataMatricula: today, ativo: true,
      });
      res.json(enrollment);
    } catch { res.status(500).json({ message: "Erro ao matricular aluno" }); }
  });

  app.delete("/api/turmas/:id/alunos/:alunoId", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    try {
      await storage.unenrollAluno(req.params.id, req.params.alunoId);
      res.json({ ok: true });
    } catch { res.status(500).json({ message: "Erro ao remover aluno da turma" }); }
  });

  app.get("/api/professor/turmas", async (req, res) => {
    if (!req.session.arenaId || req.session.userType !== "professor") {
      return res.status(401).json({ message: "Acesso negado" });
    }
    const professorId = req.session.userId!;
    const arenaId = req.session.arenaId;
    try {
      const lista = await storage.listTurmasByProfessor(professorId);
      const allStudents = await storage.listStudents(arenaId);
      const studentMap = new Map(allStudents.map((s) => [s.id, s]));
      const result = await Promise.all(
        lista.map(async (t) => {
          const enrollments = await storage.listTurmaAlunos(t.id);
          const alunosList = enrollments
            .map((e) => studentMap.get(e.alunoId ?? "") ?? null)
            .filter(Boolean);
          return { ...t, alunos: alunosList, alunosCount: alunosList.length };
        })
      );
      res.json(result);
    } catch { res.status(500).json({ message: "Erro ao buscar turmas do professor" }); }
  });

  app.get("/api/aluno/turma", async (req, res) => {
    if (!req.session.arenaId || req.session.userType !== "aluno") {
      return res.status(401).json({ message: "Acesso negado" });
    }
    const alunoId = req.session.userId!;
    const arenaId = req.session.arenaId;
    try {
      const enrollment = await storage.getAlunoTurma(alunoId);
      if (!enrollment) return res.json(null);
      const turma = await storage.getTurma(enrollment.turmaId!);
      if (!turma) return res.json(null);
      const teacherList = await storage.listTeachers(arenaId);
      const professor = teacherList.find((p) => p.id === turma.professorId);
      res.json({ ...turma, professorNome: professor?.nome ?? null });
    } catch { res.status(500).json({ message: "Erro ao buscar turma do aluno" }); }
  });

  return createServer(app);
}

function gerarLogin(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".");
}
