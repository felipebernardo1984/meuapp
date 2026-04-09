import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { storage } from "./storage";
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

// 🔒 LOGIN FIXO ADMIN
const ADMIN_LOGIN = "admin";
const ADMIN_SENHA = "admin";

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

  const d = new Date(
    parseInt(parts[2]),
    parseInt(parts[1]) - 1,
    parseInt(parts[0])
  );

  d.setMonth(d.getMonth() + 1);

  return d.toLocaleDateString("pt-BR");
}

export async function registerRoutes(app: Express): Promise<Server> {
  let sessionStore: any;

  if (process.env.REDIS_URL) {
    const redisClient = createClient({ url: process.env.REDIS_URL });

    redisClient.on("error", (err) =>
      console.error("Redis error:", err)
    );

    await redisClient.connect();

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
      saveUninitialized: true, // 🔥 CORREÇÃO
      store: sessionStore,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // 🔐 LOGIN ADMIN
  app.post("/api/admin/login", (req, res) => {
    const { login, senha } = req.body;

    if (login === ADMIN_LOGIN && senha === ADMIN_SENHA) {
      req.session.isAdmin = true;
      return res.json({ success: true });
    }

    return res.status(401).json({ message: "Login inválido" });
  });

  // 🔐 VALIDAR SESSÃO
  app.get("/api/admin/me", (req, res) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ logged: false });
    }

    res.json({ logged: true });
  });

  // 🔐 LOGOUT
  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // SEED
  app.use(async (_req, _res, next) => {
    try {
      const existing = await storage.getArenaByGestorLogin("333");

      if (!existing) {
        const today = new Date().toLocaleDateString("pt-BR");

        const arena = await storage.createArena({
          name: "Arena Padrão",
          subscriptionPlan: "premium",
          gestorLogin: "333",
          gestorSenha: "333",
          subscriptionStartDate: today,
          subscriptionValue: "R$ 199,00",
          subscriptionStatus: "Ativo",
          nextBillingDate: calcNextBillingDate(today),
        });

        const plano = await storage.createPlan({
          arenaId: arena.id,
          titulo: "2x por semana",
          checkins: 12,
          valorTexto: null,
        });

        await storage.createPlan({
          arenaId: arena.id,
          titulo: "Mensalista",
          checkins: 0,
          valorTexto: "R$ 140,00",
        });

        await storage.createTeacher({
          arenaId: arena.id,
          nome: "Carlos Mendes",
          login: "222",
          senha: "222",
          modalidade: "Beach Tennis",
        });

        const aluno = await storage.createStudent({
          arenaId: arena.id,
          nome: "Maria Santos",
          login: "111",
          senha: "111",
          cpf: "987.654.321-00",
          modalidade: "Beach Tennis",
          planoId: plano.id,
          planoTitulo: plano.titulo,
          planoCheckins: plano.checkins,
          planoValorTexto: null,
          checkinsRealizados: 0,
          statusMensalidade: "Em dia",
          aprovado: true,
          ultimoCheckin: null,
          photoUrl: null,
        });

        const datas = ["15/12/2024","18/12/2024","22/12/2024","25/12/2024"];

        for (const d of datas) {
          await storage.addCheckin({
            arenaId: arena.id,
            studentId: aluno.id,
            data: d,
            hora: "18:30",
          });
        }
      }
    } catch (err) {
      console.error("Erro seed arena:", err);
    }

    next();
  });

  // DASHBOARD
  app.get("/api/financeiro/dashboard", async (req, res) => {
    const arenaId = requireArena(req, res);
    if (!arenaId) return;

    try {
      const payments = await storage.listPayments(arenaId) || [];
      const checkinsFinanceiros =
        await storage.listCheckinFinanceiro(arenaId) || [];

      const agora = new Date();
      const mes = agora.getMonth();
      const ano = agora.getFullYear();

      const pagamentosMes = payments.filter(p => {
        if (!p.paymentDate) return false;
        const data = new Date(p.paymentDate);
        return data.getMonth() === mes && data.getFullYear() === ano;
      });

      const receitaMensalidades =
        pagamentosMes.reduce((acc, p) => acc + Number(p.amount), 0);

      const checkinsMes = checkinsFinanceiros.filter(c => {
        const data = new Date(c.dataCheckin);
        return data.getMonth() === mes && data.getFullYear() === ano;
      });

      const receitaWellhub =
        checkinsMes.filter(c => c.integrationType === "wellhub")
          .reduce((acc, c) => acc + Number(c.valorTotal), 0);

      const receitaTotalpass =
        checkinsMes.filter(c => c.integrationType === "totalpass")
          .reduce((acc, c) => acc + Number(c.valorTotal), 0);

      const receitaNormal =
        checkinsMes.filter(c => c.integrationType === "none")
          .reduce((acc, c) => acc + Number(c.valorTotal), 0);

      const receitaCheckin =
        receitaWellhub + receitaTotalpass + receitaNormal;

      res.json({
        faturamentoMes: receitaMensalidades + receitaCheckin,
        receitaMensalidades,
        receitaCheckin,
        receitaWellhub,
        receitaTotalpass,
        receitaNormal,
        totalCheckins: checkinsMes.length
      });

    } catch (err) {
      console.error("Erro dashboard financeiro:", err);
      res.status(500).json({ error: "Erro ao gerar dashboard financeiro" });
    }
  });

  app.use(automationRouter);

  return createServer(app);
}