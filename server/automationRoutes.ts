import { Router, type Request, type Response } from "express";
import { automationService } from "./automationService";

export const automationRouter = Router();

automationRouter.get(
  "/api/automation/report/:arenaId",
  async (req: Request, res: Response) => {
    const { arenaId } = req.params;

    if (!req.session.arenaId && !req.session.isAdmin) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    if (!req.session.isAdmin && req.session.arenaId !== arenaId) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const nearDueDays = req.query.nearDueDays
      ? parseInt(req.query.nearDueDays as string, 10)
      : undefined;
    const inactiveDays = req.query.inactiveDays
      ? parseInt(req.query.inactiveDays as string, 10)
      : undefined;

    try {
      const report = await automationService.analyzeArena(arenaId, {
        nearDueDaysThreshold: nearDueDays,
        inactiveDaysThreshold: inactiveDays,
      });
      return res.json(report);
    } catch (err) {
      console.error("[AutomationService] Erro ao gerar relatório:", err);
      return res.status(500).json({ message: "Erro ao gerar relatório de automação" });
    }
  }
);
