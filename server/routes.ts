import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";

const MemoryStoreSession = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    arenaId?: string;
    userType?: "gestor" | "professor" | "aluno";
    userId?: string;
    isAdmin?: boolean;
  }
}

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "superadmin";
const ADMIN_SENHA = process.env.ADMIN_SENHA || "admin123";

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
        const defaultArena = await storage.createArena({
          name: "Arena Padrão",
          subscriptionPlan: "premium",
          gestorLogin: "333",
          gestorSenha: "333",
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
    next();
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  app.post("/api/login", async (req, res) => {
    const { login, senha } = req.body as { login: string; senha: string };
    if (!login || !senha) return res.status(400).json({ message: "Credenciais inválidas" });

    // Check all arenas for this login/senha combination
    const allArenas = await storage.listArenas();

    for (const arena of allArenas) {
      // Gestor check
      if (arena.gestorLogin === login && arena.gestorSenha === senha) {
        req.session.arenaId = arena.id;
        req.session.userType = "gestor";
        req.session.userId = arena.id;
        return res.json({ tipo: "gestor", arenaId: arena.id, arenaName: arena.name });
      }
      // Teacher check
      const teacher = await storage.getTeacherByLogin(arena.id, login);
      if (teacher && teacher.senha === senha) {
        req.session.arenaId = arena.id;
        req.session.userType = "professor";
        req.session.userId = teacher.id;
        return res.json({ tipo: "professor", professor: { id: teacher.id, nome: teacher.nome, modalidade: teacher.modalidade }, arenaId: arena.id });
      }
      // Student check
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
    // Cascade plan title/checkins to students
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
    const { nome, modalidade } = req.body;
    const login = gerarLogin(nome);
    const teacher = await storage.createTeacher({ arenaId, nome, login, senha: "admin", modalidade });
    res.json({ ...teacher, senha: undefined, loginGerado: login, senhaGerada: "admin" });
  });

  app.put("/api/professores/:id", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const { nome, modalidade } = req.body;
    const teacher = await storage.updateTeacher(req.params.id, { nome, modalidade });
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
    const { nome, cpf, modalidade, planoId } = req.body;
    const plan = await storage.getPlan(planoId);
    if (!plan) return res.status(400).json({ message: "Plano não encontrado" });
    const login = gerarLogin(nome);
    const student = await storage.createStudent({
      arenaId, nome, login, senha: cpf, cpf, modalidade,
      planoId: plan.id, planoTitulo: plan.titulo, planoCheckins: plan.checkins, planoValorTexto: plan.valorTexto ?? null,
      checkinsRealizados: 0, statusMensalidade: "Em dia", aprovado: true, ultimoCheckin: null, photoUrl: null,
    });
    res.json({ ...student, loginGerado: login, senhaGerada: cpf, historico: [] });
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

    const agora = new Date();
    const data = req.body.data
      ? new Date(req.body.data + "T12:00:00").toLocaleDateString("pt-BR")
      : agora.toLocaleDateString("pt-BR");
    const hora = req.body.hora || agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    await storage.addCheckin({ arenaId, studentId: student.id, data, hora });
    const updated = await storage.updateStudent(student.id, {
      checkinsRealizados: student.checkinsRealizados + 1,
      ultimoCheckin: data,
    });
    const historico = await storage.listCheckins(student.id);
    res.json({ ...updated, historico });
  });

  app.delete("/api/alunos/:id/checkin/:index", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;
    const student = await storage.getStudent(req.params.id);
    if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
    const index = parseInt(req.params.index, 10);
    await storage.removeCheckinByIndex(student.id, index);
    const historico = await storage.listCheckins(student.id);
    const updated = await storage.updateStudent(student.id, {
      checkinsRealizados: Math.max(0, student.checkinsRealizados - 1),
      ultimoCheckin: historico.length > 0 ? historico[historico.length - 1].data : null,
    });
    res.json({ ...updated, historico });
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

  app.post("/api/admin/arenas", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { name, subscriptionPlan, gestorLogin, gestorSenha } = req.body;
    const arena = await storage.createArena({ name, subscriptionPlan: subscriptionPlan || "basic", gestorLogin, gestorSenha });
    res.json(arena);
  });

  app.put("/api/admin/arenas/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { name, subscriptionPlan, gestorLogin, gestorSenha } = req.body;
    const arena = await storage.updateArena(req.params.id, { name, subscriptionPlan, gestorLogin, gestorSenha });
    res.json(arena);
  });

  app.delete("/api/admin/arenas/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    await storage.deleteArena(req.params.id);
    res.json({ ok: true });
  });

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
