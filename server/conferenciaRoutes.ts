import type { Express } from "express";
import * as XLSX from "xlsx";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  conferenciaSessoes,
  conferenciaRegistros,
  conferenciaAliases,
  students,
  teachers,
} from "@shared/schema";

// ── Fuzzy matching (pure JS — no external AI/API) ─────────────────────────────

function normalizeNome(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function stringSim(a: string, b: string): number {
  const na = normalizeNome(a), nb = normalizeNome(b);
  if (na === nb) return 100;
  if (!na || !nb) return 0;
  const dist = levenshtein(na, nb);
  return Math.round((1 - dist / Math.max(na.length, nb.length)) * 100);
}

function tokenSetSim(a: string, b: string): number {
  const na = normalizeNome(a).split(" ").sort().join(" ");
  const nb = normalizeNome(b).split(" ").sort().join(" ");
  return stringSim(na, nb);
}

function bestSim(a: string, b: string): number {
  return Math.max(stringSim(a, b), tokenSetSim(a, b));
}

// ── Column detection for flexible Excel formats ──────────────────────────────

type ColMap = { nameIdx: number; valueIdx: number; dateIdx: number; checkinsIdx: number };

function detectColumns(headers: string[]): ColMap {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = headers.findIndex((h) => norm(h).includes(p));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  return {
    nameIdx: find(["nome", "aluno", "cliente", "name", "usuario", "user", "membro"]),
    valueIdx: find(["valor", "repasse", "value", "amount", "total", "receita"]),
    dateIdx: find(["data", "date", "periodo", "mes", "competencia"]),
    checkinsIdx: find(["visita", "checkin", "check-in", "acesso", "session", "frequencia", "quantidade", "qtd"]),
  };
}

function parseExcelRows(buffer: Buffer): Array<Record<string, unknown>> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function registerConferenciaRoutes(app: Express): void {
  // POST /api/conferencia/upload — parse Excel + fuzzy match + save session
  app.post("/api/conferencia/upload", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { filename, platform, content } = req.body as {
      filename: string;
      platform: string;
      content: string;
    };
    if (!filename || !platform || !content) {
      return res.status(400).json({ message: "filename, platform e content são obrigatórios" });
    }

    try {
      const buffer = Buffer.from(content, "base64");
      const rows = parseExcelRows(buffer);
      if (!rows.length) {
        return res.status(400).json({ message: "Arquivo vazio ou sem dados reconhecidos" });
      }

      const headers = Object.keys(rows[0]);
      const cols = detectColumns(headers);

      // Load arena data for matching
      const alunosDb = await db
        .select()
        .from(students)
        .where(eq(students.arenaId, arenaId));

      const aliasesDb = await db
        .select()
        .from(conferenciaAliases)
        .where(eq(conferenciaAliases.arenaId, arenaId));

      const professoresDb = await db
        .select()
        .from(teachers)
        .where(eq(teachers.arenaId, arenaId));
      const profMap = new Map(professoresDb.map((p) => [p.id, p]));

      // alias → studentId for exact alias lookup
      const aliasToStudentId = new Map(
        aliasesDb.map((a) => [normalizeNome(a.alias), a.studentId])
      );

      function matchAluno(nomePlataforma: string) {
        const normInput = normalizeNome(nomePlataforma);

        // Exact alias match first
        const aliasStudentId = aliasToStudentId.get(normInput);
        if (aliasStudentId) {
          const aluno = alunosDb.find((a) => a.id === aliasStudentId);
          if (aluno) return { aluno, score: 100, status: "confirmado" };
        }

        // Fuzzy match against student names
        let bestScore = 0;
        let bestAluno: (typeof alunosDb)[0] | null = null;

        for (const aluno of alunosDb) {
          const score = bestSim(nomePlataforma, aluno.nome);
          if (score > bestScore) {
            bestScore = score;
            bestAluno = aluno;
          }
          // Also check saved aliases for this student
          for (const alias of aliasesDb.filter((a) => a.studentId === aluno.id)) {
            const aliasScore = bestSim(nomePlataforma, alias.alias);
            if (aliasScore > bestScore) {
              bestScore = aliasScore;
              bestAluno = aluno;
            }
          }
        }

        if (bestScore >= 90) return { aluno: bestAluno!, score: bestScore, status: "confirmado" };
        if (bestScore >= 70) return { aluno: bestAluno!, score: bestScore, status: "pendente" };
        return { aluno: null as null, score: bestScore, status: "nao_encontrado" };
      }

      let encontrados = 0, possiveis = 0, naoEncontrados = 0;

      const registrosToInsert = rows
        .map((row) => {
          const nomePlataforma = String(
            cols.nameIdx >= 0 ? row[headers[cols.nameIdx]] : ""
          ).trim();
          if (!nomePlataforma) return null;

          const valorRaw = String(cols.valueIdx >= 0 ? row[headers[cols.valueIdx]] : "0");
          const valor = String(
            Math.round((parseFloat(valorRaw.replace(",", ".")) || 0) * 100) / 100
          );
          const data =
            cols.dateIdx >= 0 ? String(row[headers[cols.dateIdx]]) : "";
          const checkinsRaw =
            cols.checkinsIdx >= 0
              ? parseInt(String(row[headers[cols.checkinsIdx]]))
              : 1;
          const checkins = isNaN(checkinsRaw) ? 1 : Math.max(1, checkinsRaw);

          const match = matchAluno(nomePlataforma);

          let professorId: string | undefined;
          let percentual = "50";
          let valorProfessor = "0";
          let valorArena = valor;

          if (match.aluno) {
            if (match.status === "confirmado") encontrados++;
            else possiveis++;

            professorId = match.aluno.professorId || undefined;
            if (professorId) {
              const prof = profMap.get(professorId);
              if (prof?.percentualComissao) {
                percentual = String(prof.percentualComissao);
                const pct = parseFloat(percentual) / 100;
                valorProfessor = String(Math.round(parseFloat(valor) * pct * 100) / 100);
                valorArena = String(Math.round(parseFloat(valor) * (1 - pct) * 100) / 100);
              }
            }
          } else {
            naoEncontrados++;
          }

          return {
            arenaId,
            sessaoId: "__PLACEHOLDER__",
            nomePlataforma,
            studentId: match.aluno?.id ?? null,
            alunoNomeMatch: match.aluno?.nome ?? null,
            similaridade: match.score,
            valor,
            data,
            checkins,
            plataforma: platform,
            status: match.status as string,
            categoria: "comissao" as string,
            professorId: professorId ?? null,
            percentual,
            valorProfessor,
            valorArena,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      // Insert session
      const [sessao] = await db
        .insert(conferenciaSessoes)
        .values({
          arenaId,
          plataforma: platform,
          nomeArquivo: filename,
          totalRegistros: registrosToInsert.length,
          encontrados,
          possiveis,
          naoEncontrados,
        })
        .returning();

      // Insert records with real sessaoId
      if (registrosToInsert.length > 0) {
        await db
          .insert(conferenciaRegistros)
          .values(registrosToInsert.map((r) => ({ ...r, sessaoId: sessao.id })));
      }

      const registros = await db
        .select()
        .from(conferenciaRegistros)
        .where(eq(conferenciaRegistros.sessaoId, sessao.id));

      const enriched = registros.map((r) => ({
        ...r,
        professorNome: r.professorId ? (profMap.get(r.professorId)?.nome ?? null) : null,
      }));

      res.json({ ...sessao, registros: enriched });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivo";
      console.error("[Conferência] Upload error:", err);
      res.status(500).json({ message: msg });
    }
  });

  // GET /api/conferencia/sessoes
  app.get("/api/conferencia/sessoes", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const sessoes = await db
      .select()
      .from(conferenciaSessoes)
      .where(eq(conferenciaSessoes.arenaId, arenaId))
      .orderBy(desc(conferenciaSessoes.criadoEm));
    res.json(sessoes);
  });

  // GET /api/conferencia/sessao/:id
  app.get("/api/conferencia/sessao/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const [sessao] = await db
      .select()
      .from(conferenciaSessoes)
      .where(
        and(
          eq(conferenciaSessoes.id, req.params.id),
          eq(conferenciaSessoes.arenaId, arenaId)
        )
      );
    if (!sessao) return res.status(404).json({ message: "Sessão não encontrada" });

    const registros = await db
      .select()
      .from(conferenciaRegistros)
      .where(eq(conferenciaRegistros.sessaoId, sessao.id));

    const professoresDb = await db
      .select()
      .from(teachers)
      .where(eq(teachers.arenaId, arenaId));
    const profMap = new Map(professoresDb.map((p) => [p.id, p]));

    const enriched = registros.map((r) => ({
      ...r,
      professorNome: r.professorId ? (profMap.get(r.professorId)?.nome ?? null) : null,
    }));

    res.json({ ...sessao, registros: enriched });
  });

  // PUT /api/conferencia/registro/:id — confirm/update a record
  app.put("/api/conferencia/registro/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { studentId, status, categoria, percentual, professorId, observacao, salvarAlias } =
      req.body as Record<string, unknown>;

    const [registro] = await db
      .select()
      .from(conferenciaRegistros)
      .where(
        and(
          eq(conferenciaRegistros.id, req.params.id),
          eq(conferenciaRegistros.arenaId, arenaId)
        )
      );
    if (!registro) return res.status(404).json({ message: "Registro não encontrado" });

    const pct = parseFloat(String(percentual ?? registro.percentual ?? "50")) / 100;
    const valorNum = parseFloat(registro.valor || "0");
    const newValorProf = String(Math.round(valorNum * pct * 100) / 100);
    const newValorArena = String(Math.round(valorNum * (1 - pct) * 100) / 100);

    const updates: Record<string, unknown> = {
      status: status ?? registro.status,
      categoria: categoria ?? registro.categoria,
      percentual: String(percentual ?? registro.percentual),
      valorProfessor: newValorProf,
      valorArena: newValorArena,
      observacao: observacao !== undefined ? observacao : registro.observacao,
    };

    const professoresDb = await db
      .select()
      .from(teachers)
      .where(eq(teachers.arenaId, arenaId));
    const profMap = new Map(professoresDb.map((p) => [p.id, p]));

    if (studentId !== undefined) {
      updates.studentId = studentId || null;
      if (studentId) {
        const [aluno] = await db
          .select()
          .from(students)
          .where(eq(students.id, String(studentId)));
        if (aluno) {
          updates.alunoNomeMatch = aluno.nome;
          const resolvedProfId =
            professorId !== undefined ? String(professorId) : aluno.professorId;
          if (resolvedProfId) {
            updates.professorId = resolvedProfId;
            const prof = profMap.get(resolvedProfId);
            if (prof?.percentualComissao) {
              const pct2 = prof.percentualComissao / 100;
              updates.percentual = String(prof.percentualComissao);
              updates.valorProfessor = String(Math.round(valorNum * pct2 * 100) / 100);
              updates.valorArena = String(Math.round(valorNum * (1 - pct2) * 100) / 100);
            }
          }
        }
      }
    }

    if (professorId !== undefined && studentId === undefined) {
      updates.professorId = professorId || null;
    }

    const [updated] = await db
      .update(conferenciaRegistros)
      .set(updates)
      .where(eq(conferenciaRegistros.id, req.params.id))
      .returning();

    // Save alias if requested (for faster future matching)
    if (salvarAlias && updates.studentId && registro.nomePlataforma) {
      const existing = await db
        .select()
        .from(conferenciaAliases)
        .where(
          and(
            eq(conferenciaAliases.arenaId, arenaId),
            eq(conferenciaAliases.studentId, String(updates.studentId)),
            eq(conferenciaAliases.alias, registro.nomePlataforma)
          )
        );
      if (!existing.length) {
        await db.insert(conferenciaAliases).values({
          arenaId,
          studentId: String(updates.studentId),
          alias: registro.nomePlataforma,
        });
      }
    }

    // Re-compute session counters
    const allRegs = await db
      .select()
      .from(conferenciaRegistros)
      .where(eq(conferenciaRegistros.sessaoId, registro.sessaoId));
    await db
      .update(conferenciaSessoes)
      .set({
        encontrados: allRegs.filter((r) => r.status === "confirmado").length,
        possiveis: allRegs.filter((r) => r.status === "pendente").length,
        naoEncontrados: allRegs.filter((r) => r.status === "nao_encontrado").length,
      })
      .where(eq(conferenciaSessoes.id, registro.sessaoId));

    res.json({
      ...updated,
      professorNome: updated.professorId ? (profMap.get(updated.professorId)?.nome ?? null) : null,
    });
  });

  // DELETE /api/conferencia/sessao/:id
  app.delete("/api/conferencia/sessao/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    await db
      .delete(conferenciaRegistros)
      .where(eq(conferenciaRegistros.sessaoId, req.params.id));
    await db
      .delete(conferenciaSessoes)
      .where(
        and(
          eq(conferenciaSessoes.id, req.params.id),
          eq(conferenciaSessoes.arenaId, arenaId)
        )
      );
    res.json({ ok: true });
  });

  // GET /api/conferencia/export/:id — CSV download
  app.get("/api/conferencia/export/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const [sessao] = await db
      .select()
      .from(conferenciaSessoes)
      .where(
        and(
          eq(conferenciaSessoes.id, req.params.id),
          eq(conferenciaSessoes.arenaId, arenaId)
        )
      );
    if (!sessao) return res.status(404).json({ message: "Sessão não encontrada" });

    const registros = await db
      .select()
      .from(conferenciaRegistros)
      .where(eq(conferenciaRegistros.sessaoId, req.params.id));

    const professoresDb = await db
      .select()
      .from(teachers)
      .where(eq(teachers.arenaId, arenaId));
    const profMap = new Map(professoresDb.map((p) => [p.id, p]));

    const headers = [
      "Nome Plataforma",
      "Aluno Correspondido",
      "Similaridade %",
      "Professor",
      "Plataforma",
      "Valor (R$)",
      "Check-ins",
      "Data",
      "Status",
      "Categoria",
      "% Comissão",
      "Valor Professor (R$)",
      "Valor Arena (R$)",
      "Observação",
    ];

    const lines = [
      headers.join(";"),
      ...registros.map((r) =>
        [
          `"${r.nomePlataforma}"`,
          `"${r.alunoNomeMatch ?? ""}"`,
          r.similaridade ?? "",
          `"${r.professorId ? (profMap.get(r.professorId)?.nome ?? "") : ""}"`,
          r.plataforma,
          r.valor,
          r.checkins,
          `"${r.data ?? ""}"`,
          r.status,
          r.categoria,
          r.percentual,
          r.valorProfessor,
          r.valorArena,
          `"${r.observacao ?? ""}"`,
        ].join(";")
      ),
    ];

    const dateStr = sessao.criadoEm?.toISOString().slice(0, 10) ?? "export";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="conferencia_${sessao.plataforma}_${dateStr}.csv"`
    );
    res.send("\uFEFF" + lines.join("\n"));
  });

  // GET /api/conferencia/alunos — list arena students for manual linking picker
  app.get("/api/conferencia/alunos", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const alunosDb = await db
      .select({
        id: students.id,
        nome: students.nome,
        professorId: students.professorId,
      })
      .from(students)
      .where(eq(students.arenaId, arenaId));

    const professoresDb = await db
      .select()
      .from(teachers)
      .where(eq(teachers.arenaId, arenaId));
    const profMap = new Map(professoresDb.map((p) => [p.id, p]));

    res.json(
      alunosDb.map((a) => ({
        ...a,
        professorNome: a.professorId ? (profMap.get(a.professorId)?.nome ?? null) : null,
      }))
    );
  });
}
