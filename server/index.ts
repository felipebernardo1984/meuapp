import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startDailyAutomationJob } from "./schedulerService";

const app = express();

/**
 * Segurança básica de payload
 */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

/**
 * Logger inteligente para API
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;

  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (path.startsWith("/api")) {

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {

        const jsonPreview = JSON.stringify(capturedJsonResponse);

        if (jsonPreview.length < 200) {
          logLine += ` :: ${jsonPreview}`;
        } else {
          logLine += ` :: [large-response]`;
        }
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Inicialização do servidor
 */
(async () => {

  const server = await registerRoutes(app);

  /**
   * Error Handler profissional
   */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`API Error ${status}: ${message}`);

    res.status(status).json({
      message,
    });

  });

  /**
   * Setup frontend
   */
  if (app.get("env") === "development") {

    await setupVite(app, server);

  } else {

    serveStatic(app);

  }

  /**
   * Porta do servidor
   */
  const port = parseInt(process.env.PORT || "5000", 10);

  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {

      log(`serving on port ${port}`);

      startDailyAutomationJob();

    }
  );

})();

/**
 * Proteção contra crash global
 */

process.on("unhandledRejection", (reason) => {

  log(`Unhandled Promise Rejection: ${reason}`);

});

process.on("uncaughtException", (error) => {

  log(`Uncaught Exception: ${error.message}`);

});