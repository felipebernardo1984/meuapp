import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { createClient } from "redis";
import connectRedis from "connect-redis";
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

  // ───────────────── SESSION STORE PROFISSIONAL ─────────────────

  let sessionStore: any;

  if (process.env.REDIS_URL) {
    const RedisStore = connectRedis(session);

    const redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    redisClient.connect().catch(console.error);

    sessionStore = new RedisStore({
      client: redisClient,
      prefix: "arena:sess:",
    });

    console.log("✅ Redis Session Store ativo");
  } else {
    sessionStore = new MemoryStoreSession({
      checkPeriod: 86400000,
    });

    console.log("⚠️ MemoryStore ativo (modo desenvolvimento)");
  }

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "arena-secret-key",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
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

        const p1 = await storage.createPlan({
          arenaId: defaultArena.id,
          titulo: "1x por semana",
          checkins: 8,
          valorTexto: null,
        });

        const p2 = await storage.createPlan({
          arenaId: defaultArena.id,
          titulo: "2x por semana",
          checkins: 12,
          valorTexto: null,
        });

        await storage.createPlan({
          arenaId: defaultArena.id,
          titulo: "Mensalista",
          checkins: 0,
          valorTexto: "R$ 140,00",
        });

        await storage.createTeacher({
          arenaId: defaultArena.id,
          nome: "Carlos Mendes",
          login: "222",
          senha: "222",
          modalidade: "Beach Tennis",
        });

        await storage.createTeacher({
          arenaId: defaultArena.id,
          nome: "Fernanda Lima",
          login: "fernanda",
          senha: "admin",
          modalidade: "Vôlei de Praia",
        });

        await storage.createTeacher({
          arenaId: defaultArena.id,
          nome: "Ricardo Souza",
          login: "ricardo",
          senha: "admin",
          modalidade: "Futevôlei",
        });

        const a1 = await storage.createStudent({
          arenaId: defaultArena.id,
          nome: "Maria Santos",
          login: "111",
          senha: "111",
          cpf: "987.654.321-00",
          modalidade: "Beach Tennis",
          planoId: p2.id,
          planoTitulo: p2.titulo,
          planoCheckins: p2.checkins,
          planoValorTexto: null,
          checkinsRealizados: 9,
          statusMensalidade: "Em dia",
          aprovado: true,
          ultimoCheckin: "02/01/2025",
          photoUrl: null,
        });

        const datas = [
          "15/12/2024",
          "18/12/2024",
          "22/12/2024",
          "25/12/2024",
          "29/12/2024",
          "30/12/2024",
          "31/12/2024",
          "01/01/2025",
          "02/01/2025",
        ];

        for (const d of datas) {
          await storage.addCheckin({
            arenaId: defaultArena.id,
            studentId: a1.id,
            data: d,
            hora: "18:30",
          });
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
  app.post("/api/login", async (req, res) => {
    const { login, senha } = req.body;

    if (!login || !senha) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    const arenas = await storage.listArenas();

    for (const arena of arenas) {

      if (arena.gestorLogin === login && arena.gestorSenha === senha) {
        req.session.arenaId = arena.id;
        req.session.userType = "gestor";
        req.session.userId = arena.id;

        return res.json({
          tipo: "gestor",
          arenaId: arena.id,
          arenaName: arena.name,
        });
      }

      const teacher = await storage.getTeacherByLogin(arena.id, login);

      if (teacher && teacher.senha === senha) {
        req.session.arenaId = arena.id;
        req.session.userType = "professor";
        req.session.userId = teacher.id;

        return res.json({
          tipo: "professor",
          professor: {
            id: teacher.id,
            nome: teacher.nome,
            modalidade: teacher.modalidade,
          },
          arenaId: arena.id,
        });
      }

      const student = await storage.getStudentByLogin(arena.id, login);

      if (student && student.senha === senha && student.aprovado) {
        req.session.arenaId = arena.id;
        req.session.userType = "aluno";
        req.session.userId = student.id;

        const historico = await storage.listCheckins(student.id);

        return res.json({
          tipo: "aluno",
          aluno: { ...student, historico },
          arenaId: arena.id,
        });
      }
    }

    return res.status(401).json({
      message: "Usuário ou senha incorretos",
    });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/session", async (req, res) => {
    if (!req.session.arenaId) {
      return res.json({ authenticated: false });
    }

    const { arenaId, userType, userId } = req.session;

    if (userType === "gestor") {
      const arena = await storage.getArena(arenaId!);

      return res.json({
        authenticated: true,
        tipo: "gestor",
        arenaId,
        arenaName: arena?.name,
      });
    }

    if (userType === "professor") {
      const teacher = await storage.getTeacher(userId!);

      return res.json({
        authenticated: true,
        tipo: "professor",
        professor: teacher,
        arenaId,
      });
    }

    if (userType === "aluno") {
      const student = await storage.getStudent(userId!);

      if (!student) {
        return res.json({ authenticated: false });
      }

      const historico = await storage.listCheckins(student.id);

      return res.json({
        authenticated: true,
        tipo: "aluno",
        aluno: { ...student, historico },
        arenaId,
      });
    }

    return res.json({ authenticated: false });
  });

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