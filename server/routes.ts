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

let ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
let ADMIN_SENHA = process.env.ADMIN_SENHA || "admin";

function requireArena(req: Request, res: Response): string | null {
  if (!req.session.arenaId) {
    res.status(401).json({ message: "Não autenticado" });
    return null;
  }
  return req.session.arenaId;
}

// 🔐 NOVA FUNÇÃO SEGURA (CRÍTICO PARA MULTI-TENANT)
function getArenaOrFail(req: Request): string {
  if (!req.session.arenaId) {
    throw new Error("Arena não autenticada");
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

  // ── Seed default arena ─────────────────────────

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

    next();

  });

  // ───────────────── DASHBOARD FINANCEIRO ─────────────────

  app.get("/api/financeiro/dashboard", async (req, res) => {

    const arenaId = requireArena(req, res);
    if (!arenaId) return;

    try {

      const payments = await storage.listPayments(arenaId);
      const checkinsFinanceiros = await storage.listCheckinFinanceiro(arenaId);

      const agora = new Date();
      const mesAtual = agora.getMonth();
      const anoAtual = agora.getFullYear();

      const pagamentosMes = payments.filter(p => {
        if (!p.paymentDate) return false;
        const data = new Date(p.paymentDate);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      });

      const receitaMensalidades = pagamentosMes.reduce(
        (acc, p) => acc + Number(p.amount),
        0
      );

      const checkinsMes = checkinsFinanceiros.filter(c => {
        const data = new Date(c.dataCheckin);
        return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
      });

      const receitaCheckin = checkinsMes.reduce(
        (acc, c) => acc + Number(c.valorTotal),
        0
      );

      const receitaWellhub = checkinsMes
        .filter(c => c.integrationType === "wellhub")
        .reduce((acc, c) => acc + Number(c.valorTotal), 0);

      const receitaTotalpass = checkinsMes
        .filter(c => c.integrationType === "totalpass")
        .reduce((acc, c) => acc + Number(c.valorTotal), 0);

      res.json({
        faturamentoMes: receitaMensalidades + receitaCheckin,
        receitaMensalidades,
        receitaCheckin,
        receitaWellhub,
        receitaTotalpass,
        totalCheckins: checkinsMes.length
      });

    } catch (error) {

      console.error("Erro dashboard financeiro:", error);

      res.status(500).json({
        error: "Erro ao gerar dashboard financeiro"
      });

    }

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