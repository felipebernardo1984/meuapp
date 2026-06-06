import type { Express } from "express";
import * as XLSX from "xlsx";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  conferenciaSessoes,
  conferenciaRegistros,
  conferenciaAliases,
  conferenciaProfessores,
  conferenciaProfessorAlunos,
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

/** Word-overlap similarity — handles extra middle names common in TotalPass/Wellhub exports.
 *  "Gustavo Pereira" vs "GUSTAVO HENRIQUE PEREIRA" → 100% containment → 88 → confirmado */
function wordOverlapSim(a: string, b: string): number {
  const STOPS = new Set(["de", "da", "do", "dos", "das", "di", "e"]);
  const wa = new Set(
    normalizeNome(a).split(" ").filter((w) => w.length > 2 && !STOPS.has(w))
  );
  const wb = new Set(
    normalizeNome(b).split(" ").filter((w) => w.length > 2 && !STOPS.has(w))
  );
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  const containment = overlap / wa.size; // % of registered words found in platform name
  const union = wa.size + wb.size - overlap;
  const jaccard = union > 0 ? overlap / union : 0;
  return Math.round(Math.max(containment * 88, jaccard * 100));
}

function bestSim(a: string, b: string): number {
  return Math.max(stringSim(a, b), tokenSetSim(a, b), wordOverlapSim(a, b));
}

// ── Column detection for flexible Excel formats ──────────────────────────────

type ColMap = {
  nameIdx: number;
  valueIdx: number;
  dateIdx: number;
  checkinsIdx: number;
  debug: { nameCol: string | null; valueCol: string | null; allHeaders: string[] };
};

function normHeader(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
}

function findByHeader(headers: string[], patterns: string[]): number {
  for (const p of patterns) {
    const idx = headers.findIndex((h) => normHeader(h).includes(p));
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Returns true if the string looks like a Brazilian person name */
function looksLikeName(val: string): boolean {
  if (!val || val.length < 4 || val.length > 120) return false;
  // Strip CPF before analysis
  const cleaned = val
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "")
    .replace(/\b\d{11}\b/g, "")
    .trim();
  if (!cleaned || cleaned.length < 4) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  // First word must start with a capital letter
  if (!/^[A-ZÀ-Ü]/.test(words[0])) return false;
  // At least 70% of characters are letters or spaces
  const letters = cleaned.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
  return letters.length >= cleaned.length * 0.65;
}

/** Returns true if the string looks like a monetary value */
function looksLikeMonetary(val: string): boolean {
  if (!val) return false;
  // Handle strings like "R$ 12,50" or "12.50" or "12,50"
  const clean = val.replace(/R\$\s*/gi, "").replace(/\./g, "").replace(",", ".").trim();
  if (!clean) return false;
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return false;
  // Reasonable monetary range (R$ 0.01 – R$ 99999)
  return num < 100000 && (val.includes(",") || /R\$/.test(val) || val.includes("."));
}

/** Detect which column index is most likely to be person names by analyzing rows */
function detectNameColumnByContent(headers: string[], rows: Array<Record<string, unknown>>): number {
  const sample = rows.slice(0, Math.min(40, rows.length));
  if (sample.length === 0) return -1;
  let bestScore = -1;
  let bestIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    let score = 0;
    for (const row of sample) {
      const val = String(row[headers[i]] ?? "").trim();
      if (looksLikeName(val)) score++;
    }
    // Need at least 25% of rows to look like names
    if (score > bestScore && score >= Math.max(2, sample.length * 0.25)) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Detect which column index is most likely to be monetary values by analyzing rows */
function detectValueColumnByContent(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  excludeIdx: number
): number {
  const sample = rows.slice(0, Math.min(40, rows.length));
  if (sample.length === 0) return -1;
  let bestScore = -1;
  let bestIdx = -1;

  for (let i = 0; i < headers.length; i++) {
    if (i === excludeIdx) continue;
    let score = 0;
    let totalVal = 0;

    for (const row of sample) {
      const val = String(row[headers[i]] ?? "").trim();
      if (looksLikeMonetary(val)) {
        score++;
        const clean = val.replace(/R\$\s*/gi, "").replace(/\./g, "").replace(",", ".").trim();
        totalVal += parseFloat(clean) || 0;
      }
    }

    // Prefer columns where avg value > R$ 1 (not just check-in counts)
    const avgVal = score > 0 ? totalVal / score : 0;
    if (score > bestScore && score >= Math.max(2, sample.length * 0.25) && avgVal > 1) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function detectColumns(headers: string[], rows: Array<Record<string, unknown>>): ColMap {
  // Step 1: Try expanded header keyword matching
  const nameByHeader = findByHeader(headers, [
    "nome", "aluno", "cliente", "name", "usuario", "user", "membro",
    "participante", "employee", "associado", "beneficiario", "titular", "socio",
  ]);
  const valueByHeader = findByHeader(headers, [
    "valor", "repasse", "value", "amount", "total", "receita",
    "pagamento", "tarifa", "preco", "custo", "mensalidade", "net", "bruto",
  ]);
  const dateIdx = findByHeader(headers, [
    "data", "date", "periodo", "mes", "competencia", "month", "vigencia",
  ]);
  const checkinsIdx = findByHeader(headers, [
    "visita", "checkin", "check-in", "acesso", "session", "frequencia",
    "quantidade", "qtd", "sessions", "visits", "utilizacao", "uso",
  ]);

  // Step 2: Fall back to content-based detection if header matching fails
  const nameIdx =
    nameByHeader >= 0 ? nameByHeader : detectNameColumnByContent(headers, rows);

  const valueIdx =
    valueByHeader >= 0 ? valueByHeader : detectValueColumnByContent(headers, rows, nameIdx);

  return {
    nameIdx,
    valueIdx,
    dateIdx,
    checkinsIdx,
    debug: {
      nameCol: nameIdx >= 0 ? headers[nameIdx] : null,
      valueCol: valueIdx >= 0 ? headers[valueIdx] : null,
      allHeaders: headers,
    },
  };
}

function parseExcelRows(buffer: Buffer): Array<Record<string, unknown>> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  // Read all rows as arrays first so we can find the real header row.
  // TotalPass / Wellhub exports often have 1-3 title rows before the actual header.
  const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (allRows.length < 2) return [];

  const HEADER_KEYWORDS = [
    "nome", "cpf", "usuario", "cliente", "beneficiario", "titular", "membro",
    "valor", "repasse", "receita", "tarifa", "preco", "custo",
    "data", "periodo", "competencia", "mes", "vigencia",
    "visita", "checkin", "check-in", "acesso", "frequencia", "sessao",
    "empresa", "plano", "status",
  ];

  // Pick the row (among the first 15) that contains the most header keywords.
  let headerRowIdx = 0;
  let bestScore = 0;

  for (let i = 0; i < Math.min(15, allRows.length); i++) {
    const row = allRows[i] as unknown[];
    const cells = row.map((c) =>
      String(c ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );
    const score = HEADER_KEYWORDS.filter((kw) =>
      cells.some((cell) => cell.includes(kw))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      headerRowIdx = i;
    }
  }

  // If no keywords matched at all, fall back to the row with the most non-empty cells.
  if (bestScore === 0) {
    for (let i = 0; i < Math.min(10, allRows.length); i++) {
      const nonEmpty = (allRows[i] as unknown[]).filter((c) => c !== "").length;
      const curBest = (allRows[headerRowIdx] as unknown[]).filter((c) => c !== "").length;
      if (nonEmpty > curBest) headerRowIdx = i;
    }
  }

  console.log(`[Conferência] Header row auto-detected at index ${headerRowIdx} (score ${bestScore})`);

  // Build column names from that row.
  const headers = (allRows[headerRowIdx] as unknown[]).map((h, i) => {
    const s = String(h ?? "").trim();
    return s || `col_${i}`;
  });

  // Convert subsequent rows to objects, skipping fully-empty rows.
  return allRows
    .slice(headerRowIdx + 1)
    .map((row) => {
      const obj: Record<string, unknown> = {};
      (row as unknown[]).forEach((val, i) => {
        obj[headers[i] ?? `col_${i}`] = val;
      });
      return obj;
    })
    .filter((row) => Object.values(row).some((v) => v !== "" && v != null));
}

// Strip CPF (11-digit number, with or without formatting) and trailing noise from names
// e.g. "Isadora Vichi Silva 48837526822" → "Isadora Vichi Silva"
// e.g. "Beatriz Franco 430.951.058-27" → "Beatriz Franco"
function cleanName(raw: string): string {
  return raw
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "") // CPF formatted: XXX.XXX.XXX-XX
    .replace(/\b\d{11}\b/g, "")                  // CPF unformatted: 11 consecutive digits
    .replace(/\(.*?\)/g, "")                      // parenthetical notes: (...)
    .trim()
    .replace(/\s+/g, " ");
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function registerConferenciaRoutes(app: Express): void {

  // ── Professor CRUD ─────────────────────────────────────────────────────────

  // GET /api/conferencia/professores — list with their students
  app.get("/api/conferencia/professores", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const profs = await db
      .select()
      .from(conferenciaProfessores)
      .where(eq(conferenciaProfessores.arenaId, arenaId))
      .orderBy(conferenciaProfessores.criadoEm);

    const alunos = await db
      .select()
      .from(conferenciaProfessorAlunos)
      .where(eq(conferenciaProfessorAlunos.arenaId, arenaId));

    res.json(
      profs.map((p) => ({
        ...p,
        alunos: alunos.filter((a) => a.professorId === p.id),
      }))
    );
  });

  // POST /api/conferencia/professores
  app.post("/api/conferencia/professores", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const { nome, percentualComissao } = req.body as { nome: string; percentualComissao?: string };
    if (!nome?.trim()) return res.status(400).json({ message: "Nome obrigatório" });

    const [prof] = await db
      .insert(conferenciaProfessores)
      .values({ arenaId, nome: nome.trim(), percentualComissao: String(percentualComissao ?? "0") })
      .returning();
    res.json({ ...prof, alunos: [] });
  });

  // PUT /api/conferencia/professores/:id
  app.put("/api/conferencia/professores/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const { nome, percentualComissao } = req.body as { nome: string; percentualComissao?: string };
    const [prof] = await db
      .update(conferenciaProfessores)
      .set({ nome: nome.trim(), percentualComissao: String(percentualComissao ?? "0") })
      .where(and(eq(conferenciaProfessores.id, req.params.id), eq(conferenciaProfessores.arenaId, arenaId)))
      .returning();
    if (!prof) return res.status(404).json({ message: "Professor não encontrado" });
    res.json(prof);
  });

  // DELETE /api/conferencia/professores/:id
  app.delete("/api/conferencia/professores/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    await db
      .delete(conferenciaProfessorAlunos)
      .where(
        and(
          eq(conferenciaProfessorAlunos.professorId, req.params.id),
          eq(conferenciaProfessorAlunos.arenaId, arenaId)
        )
      );
    await db
      .delete(conferenciaProfessores)
      .where(and(eq(conferenciaProfessores.id, req.params.id), eq(conferenciaProfessores.arenaId, arenaId)));
    res.json({ ok: true });
  });

  // POST /api/conferencia/professores/:id/alunos
  app.post("/api/conferencia/professores/:id/alunos", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const { nome } = req.body as { nome: string };
    if (!nome?.trim()) return res.status(400).json({ message: "Nome obrigatório" });

    const [aluno] = await db
      .insert(conferenciaProfessorAlunos)
      .values({ arenaId, professorId: req.params.id, nome: nome.trim() })
      .returning();
    res.json(aluno);
  });

  // POST /api/conferencia/professores/:id/alunos/lote — bulk add
  app.post("/api/conferencia/professores/:id/alunos/lote", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    try {
      const { nomes } = req.body as { nomes: string[] };
      if (!Array.isArray(nomes) || nomes.length === 0) {
        return res.status(400).json({ message: "Lista de nomes obrigatória" });
      }
      const validos = nomes.map((n) => String(n).trim()).filter(Boolean);
      if (validos.length === 0) {
        return res.status(400).json({ message: "Nenhum nome válido encontrado" });
      }
      const professorId = req.params.id;
      // Insert in batches of 50 to avoid DB limits
      let total = 0;
      const batchSize = 50;
      for (let i = 0; i < validos.length; i += batchSize) {
        const batch = validos.slice(i, i + batchSize);
        await db
          .insert(conferenciaProfessorAlunos)
          .values(batch.map((nome) => ({ arenaId, professorId, nome })));
        total += batch.length;
      }
      return res.json({ adicionados: total });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao inserir alunos";
      console.error("[Conferência] Lote error:", err);
      return res.status(500).json({ message: msg });
    }
  });

  // DELETE /api/conferencia/professor-alunos/:id
  app.delete("/api/conferencia/professor-alunos/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    await db
      .delete(conferenciaProfessorAlunos)
      .where(
        and(
          eq(conferenciaProfessorAlunos.id, req.params.id),
          eq(conferenciaProfessorAlunos.arenaId, arenaId)
        )
      );
    res.json({ ok: true });
  });

  // GET /api/conferencia/alunos — flat list of all conferencia alunos (for LinkDialog)
  app.get("/api/conferencia/alunos", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const profs = await db
      .select()
      .from(conferenciaProfessores)
      .where(eq(conferenciaProfessores.arenaId, arenaId));
    const profMap = new Map(profs.map((p) => [p.id, p]));

    const alunos = await db
      .select()
      .from(conferenciaProfessorAlunos)
      .where(eq(conferenciaProfessorAlunos.arenaId, arenaId));

    res.json(
      alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        professorId: a.professorId,
        professorNome: profMap.get(a.professorId)?.nome ?? null,
      }))
    );
  });

  // ── Upload ────────────────────────────────────────────────────────────────

  app.post("/api/conferencia/upload", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { filename, content, platform: platformBody } = req.body as {
      filename: string;
      content: string;
      platform?: string;
    };
    if (!filename || !content) {
      return res.status(400).json({ message: "filename e content são obrigatórios" });
    }

    // Platform must be explicitly selected
    const platform = platformBody?.trim() || "outro";

    try {
      const buffer = Buffer.from(content, "base64");
      const rows = parseExcelRows(buffer);
      if (!rows.length) {
        return res.status(400).json({ message: "Arquivo vazio ou sem dados reconhecidos" });
      }

      const headers = Object.keys(rows[0]);
      const cols = detectColumns(headers, rows);
      console.log(`[Conferência] Arquivo: ${filename} | Colunas — nome: "${cols.debug.nameCol ?? "NÃO DETECTADA"}" | valor: "${cols.debug.valueCol ?? "NÃO DETECTADA"}" | headers: [${cols.debug.allHeaders.join(", ")}]`);

      // Load conferencia-specific data (standalone — no connection to arena students/teachers)
      const profsDb = await db
        .select()
        .from(conferenciaProfessores)
        .where(eq(conferenciaProfessores.arenaId, arenaId));
      const profMap = new Map(profsDb.map((p) => [p.id, p]));

      const alunosDb = await db
        .select()
        .from(conferenciaProfessorAlunos)
        .where(eq(conferenciaProfessorAlunos.arenaId, arenaId));

      const aliasesDb = await db
        .select()
        .from(conferenciaAliases)
        .where(eq(conferenciaAliases.arenaId, arenaId));

      // alias → confAlunoId
      const aliasToAlunoId = new Map(
        aliasesDb.map((a) => [normalizeNome(a.alias), a.studentId])
      );

      function matchAluno(nomePlataforma: string) {
        const normInput = normalizeNome(nomePlataforma);

        // Exact alias match first
        const aliasAlunoId = aliasToAlunoId.get(normInput);
        if (aliasAlunoId) {
          const aluno = alunosDb.find((a) => a.id === aliasAlunoId);
          if (aluno) return { aluno, score: 100, status: "confirmado" };
        }

        // Fuzzy match against conferencia student names
        let bestScore = 0;
        let bestAluno: (typeof alunosDb)[0] | null = null;

        for (const aluno of alunosDb) {
          const score = bestSim(nomePlataforma, aluno.nome);
          if (score > bestScore) {
            bestScore = score;
            bestAluno = aluno;
          }
          // Also check aliases for this aluno
          for (const alias of aliasesDb.filter((a) => a.studentId === aluno.id)) {
            const aliasScore = bestSim(nomePlataforma, alias.alias);
            if (aliasScore > bestScore) {
              bestScore = aliasScore;
              bestAluno = aluno;
            }
          }
        }

        if (bestScore >= 82) return { aluno: bestAluno!, score: bestScore, status: "confirmado" };
        if (bestScore >= 55) return { aluno: bestAluno!, score: bestScore, status: "pendente" };
        return { aluno: null as null, score: bestScore, status: "nao_encontrado" };
      }

      let encontrados = 0, possiveis = 0, naoEncontrados = 0;

      const registrosToInsert = rows
        .map((row) => {
          const nomePlataforma = cleanName(
            String(cols.nameIdx >= 0 ? row[headers[cols.nameIdx]] : "")
          );
          if (!nomePlataforma) return null;

          const valorRaw = String(cols.valueIdx >= 0 ? row[headers[cols.valueIdx]] : "0");
          const valor = String(
            Math.round((parseFloat(valorRaw.replace(",", ".")) || 0) * 100) / 100
          );
          const data = cols.dateIdx >= 0 ? String(row[headers[cols.dateIdx]]) : "";
          const checkinsRaw =
            cols.checkinsIdx >= 0
              ? parseInt(String(row[headers[cols.checkinsIdx]]))
              : 1;
          const checkins = isNaN(checkinsRaw) ? 1 : Math.max(1, checkinsRaw);

          const match = matchAluno(nomePlataforma);

          let professorId: string | undefined;
          let percentual = "0";
          let valorProfessor = "0";
          let valorArena = valor;

          if (match.aluno) {
            if (match.status === "confirmado") encontrados++;
            else possiveis++;

            professorId = match.aluno.professorId;
            const prof = profMap.get(professorId!);
            if (prof?.percentualComissao && parseFloat(prof.percentualComissao) > 0) {
              percentual = String(prof.percentualComissao);
              const pct = parseFloat(percentual) / 100;
              valorProfessor = String(Math.round(parseFloat(valor) * pct * 100) / 100);
              valorArena = String(Math.round(parseFloat(valor) * (1 - pct) * 100) / 100);
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
            plataforma: platform!,
            status: match.status as string,
            categoria: "comissao" as string,
            professorId: professorId ?? null,
            percentual,
            valorProfessor,
            valorArena,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      const [sessao] = await db
        .insert(conferenciaSessoes)
        .values({
          arenaId,
          plataforma: platform!,
          nomeArquivo: filename,
          totalRegistros: registrosToInsert.length,
          encontrados,
          possiveis,
          naoEncontrados,
        })
        .returning();

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

      res.json({ ...sessao, registros: enriched, debug: cols.debug });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivo";
      console.error("[Conferência] Upload error:", err);
      res.status(500).json({ message: msg });
    }
  });

  // ── Session routes ─────────────────────────────────────────────────────────

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

  app.get("/api/conferencia/sessao/:id", async (req, res) => {
    const arenaId = req.session.arenaId;
    if (!arenaId || req.session.userType !== "gestor") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const [sessao] = await db
      .select()
      .from(conferenciaSessoes)
      .where(and(eq(conferenciaSessoes.id, req.params.id), eq(conferenciaSessoes.arenaId, arenaId)));
    if (!sessao) return res.status(404).json({ message: "Sessão não encontrada" });

    const registros = await db
      .select()
      .from(conferenciaRegistros)
      .where(eq(conferenciaRegistros.sessaoId, sessao.id));

    const profsDb = await db
      .select()
      .from(conferenciaProfessores)
      .where(eq(conferenciaProfessores.arenaId, arenaId));
    const profMap = new Map(profsDb.map((p) => [p.id, p]));

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
      .where(and(eq(conferenciaRegistros.id, req.params.id), eq(conferenciaRegistros.arenaId, arenaId)));
    if (!registro) return res.status(404).json({ message: "Registro não encontrado" });

    const pct = parseFloat(String(percentual ?? registro.percentual ?? "0")) / 100;
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

    const profsDb = await db
      .select()
      .from(conferenciaProfessores)
      .where(eq(conferenciaProfessores.arenaId, arenaId));
    const profMap = new Map(profsDb.map((p) => [p.id, p]));

    // If linking to a conferencia aluno
    if (studentId !== undefined) {
      updates.studentId = studentId || null;
      if (studentId) {
        const [confAluno] = await db
          .select()
          .from(conferenciaProfessorAlunos)
          .where(eq(conferenciaProfessorAlunos.id, String(studentId)));
        if (confAluno) {
          updates.alunoNomeMatch = confAluno.nome;
          const resolvedProfId =
            professorId !== undefined ? String(professorId) : confAluno.professorId;
          if (resolvedProfId) {
            updates.professorId = resolvedProfId;
            const prof = profMap.get(resolvedProfId);
            if (prof?.percentualComissao && parseFloat(prof.percentualComissao) > 0) {
              const pct2 = parseFloat(prof.percentualComissao) / 100;
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

    // Save alias if requested
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
      .where(and(eq(conferenciaSessoes.id, req.params.id), eq(conferenciaSessoes.arenaId, arenaId)));
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
      .where(and(eq(conferenciaSessoes.id, req.params.id), eq(conferenciaSessoes.arenaId, arenaId)));
    if (!sessao) return res.status(404).json({ message: "Sessão não encontrada" });

    const registros = await db
      .select()
      .from(conferenciaRegistros)
      .where(eq(conferenciaRegistros.sessaoId, req.params.id));

    const profsDb = await db
      .select()
      .from(conferenciaProfessores)
      .where(eq(conferenciaProfessores.arenaId, arenaId));
    const profMap = new Map(profsDb.map((p) => [p.id, p]));

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
}
