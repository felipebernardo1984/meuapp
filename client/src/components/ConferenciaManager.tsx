import { useState, useRef, useEffect } from "react";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Trash2,
  Search,
  FileSpreadsheet,
  Users,
  TrendingUp,
  Building2,
  RefreshCw,
  ChevronRight,
  Plus,
  Pencil,
  X,
  Printer,
  CalendarDays,
  RotateCcw,
  RotateCw,
  Link2,
  Settings2,
  ImageIcon,
  UserPlus,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColMapping {
  colNome: string;
  colValor: string;
  colModalidade: string;
  colData: string;
  colCheckins: string;
}

interface PreviewResponse {
  headers: string[];
  samples: Record<string, string[]>;
  totalRows: number;
  sugestoes: {
    colNome: string | null;
    colValor: string | null;
    colModalidade: string | null;
    colData: string | null;
    colCheckins: string | null;
  };
}

interface PendingMapFile {
  file: File;
  content: string;
  platform: string;
  preview: PreviewResponse;
}

interface Sessao {
  id: string;
  plataforma: string;
  nomeArquivo: string;
  totalRegistros: number;
  encontrados: number;
  possiveis: number;
  naoEncontrados: number;
  criadoEm: string;
  periodoInicio?: string | null;
  periodoFim?: string | null;
}

interface Registro {
  id: string;
  nomePlataforma: string;
  studentId: string | null;
  alunoNomeMatch: string | null;
  similaridade: number | null;
  valor: string;
  data: string | null;
  checkins: number;
  plataforma: string;
  modalidade: string | null;
  status: string;
  categoria: string;
  professorId: string | null;
  professorNome: string | null;
  percentual: string;
  valorProfessor: string;
  valorArena: string;
  observacao: string | null;
  comprovante?: string | null;
}

interface SessaoDetalhe extends Sessao {
  registros: Registro[];
  debug?: { nameCol: string | null; valueCol: string | null; allHeaders: string[] };
}

interface ConfAluno {
  id: string;
  nome: string;
  professorId: string;
  professorNome?: string | null;
  tipo?: string | null;
}

interface ConfProfessor {
  id: string;
  nome: string;
  percentualComissao: string;
  alunos: ConfAluno[];
}

interface RepasseConfig {
  pctArena: string;
  pctGestao: string;
  gestaoTipo: string;
  gestaoProfessorId: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(v: string | null | undefined): string {
  const n = parseFloat(v || "0");
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function plataformaLabel(p: string): string {
  if (p === "totalpass") return "TotalPass";
  if (p === "wellhub") return "Wellhub";
  if (p === "manual") return "Mensalistas";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function statusInfo(status: string) {
  switch (status) {
    case "confirmado":
      return {
        label: "Confirmado",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
        dot: "bg-emerald-500",
      };
    case "pendente":
      return {
        label: "Possível",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
        dot: "bg-amber-500",
      };
    case "nao_encontrado":
      return {
        label: "Não encontrado",
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800",
        dot: "bg-red-500",
      };
    case "ignorado":
      return {
        label: "Ignorado",
        color: "text-gray-500",
        bg: "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700",
        dot: "bg-gray-400",
      };
    default:
      return { label: status, color: "text-gray-500", bg: "", dot: "bg-gray-400" };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function initials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Detecta a plataforma automaticamente pelo nome do arquivo */
function detectPlatformFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("totalpass")) return "totalpass";
  if (lower.includes("wellhub") || lower.includes("gympass")) return "wellhub";
  return "";
}

// ── Column Mapping Dialog ─────────────────────────────────────────────────────

function ColMapDialog({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingMapFile;
  onConfirm: (mapping: ColMapping) => void;
  onCancel: () => void;
}) {
  const { preview, file, platform } = pending;
  const { headers, samples, totalRows, sugestoes } = preview;

  const NONE = "__nenhuma__";

  const PLATFORM_KEYWORDS: Record<string, { nome: string; valor: string; modalidade: string; data: string }> = {
    totalpass: { nome: "colaborador", valor: "repasse", modalidade: "plano da academia", data: "validado" },
    wellhub:   { nome: "visitante",   valor: "pagamento", modalidade: "produto",          data: "data"     },
  };

  function findHeader(keyword: string): string {
    const kw = keyword.toLowerCase();
    return headers.find((h) => h.toLowerCase().includes(kw)) ?? "";
  }

  function bestDefault(keyword: string, sugestao: string | null): string {
    const found = findHeader(keyword);
    if (found) return found;
    return sugestao ?? "";
  }

  const kws = PLATFORM_KEYWORDS[platform];

  const [colNome, setColNome] = useState(kws ? bestDefault(kws.nome, sugestoes.colNome) : (sugestoes.colNome ?? ""));
  const [colValor, setColValor] = useState(kws ? bestDefault(kws.valor, sugestoes.colValor) : (sugestoes.colValor ?? ""));
  const [colModalidade, setColModalidade] = useState(kws ? bestDefault(kws.modalidade, sugestoes.colModalidade) : (sugestoes.colModalidade ?? ""));
  const [colData, setColData] = useState(kws ? bestDefault(kws.data, sugestoes.colData) : (sugestoes.colData ?? ""));

  const fields = [
    {
      key: "colNome" as const,
      label: "Nome do Aluno",
      required: true,
      value: colNome,
      set: setColNome,
    },
    {
      key: "colValor" as const,
      label: "Pagamento",
      required: true,
      value: colValor,
      set: setColValor,
    },
    {
      key: "colModalidade" as const,
      label: "Modalidade ou Plano",
      required: false,
      value: colModalidade,
      set: setColModalidade,
    },
    {
      key: "colData" as const,
      label: "Data check-in",
      required: false,
      value: colData,
      set: setColData,
    },
  ];

  const canConfirm = !!colNome && !!colValor;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Mapeamento de Colunas
          </DialogTitle>
        </DialogHeader>

        {/* File info */}
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {totalRows} linhas · {headers.length} colunas · {plataformaLabel(platform)}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground -mt-1">
          Indique qual coluna da planilha corresponde a cada campo.
        </p>

        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground w-52 shrink-0 flex items-center gap-1">
                {f.label}
                {f.required && <span className="text-destructive font-semibold">*</span>}
              </label>
              <Select
                value={f.value || NONE}
                onValueChange={(v) => f.set(v === NONE ? "" : v)}
              >
                <SelectTrigger
                  className={cn(
                    "h-9 flex-1",
                    f.required && !f.value && "border-destructive/50"
                  )}
                  data-testid={`select-col-${f.key}`}
                >
                  <SelectValue placeholder="Selecione uma coluna…" />
                </SelectTrigger>
                <SelectContent>
                  {!f.required && (
                    <SelectItem value={NONE}>
                      <span className="text-muted-foreground italic">— Não usar —</span>
                    </SelectItem>
                  )}
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-colmap-cancelar">
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onConfirm({ colNome, colValor, colModalidade, colData, colCheckins: "" })
            }
            disabled={!canConfirm}
            data-testid="button-colmap-processar"
          >
            Processar planilha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────

function parseDataSort(d: string | null | undefined): string {
  if (!d) return "";
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})(.*)/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}${m[4] ?? ""}`;
  return d;
}

function fmtData(d: string | null | undefined): string {
  if (!d || d === "undefined") return "—";
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+([\d:]+)/);
  if (m) return `${m[1]}/${m[2]}/${m[3]} ${m[4]}`;
  const m2 = d.match(/^(\d{4})-(\d{2})-(\d{2})T([\d:]+)/);
  if (m2) return `${m2[3]}/${m2[2]}/${m2[1]} ${m2[4]}`;
  return d;
}

function exportToPDFComprovante(sessao: SessaoDetalhe, professorKey: string, professorNome: string) {
  const allRegsForProf = sessao.registros.filter(
    (r) => r.status === "confirmado" && (professorKey === "__arena__" ? !r.professorId : r.professorId === professorKey)
  );
  // Platform records (TotalPass / Wellhub) — mensalistas are excluded from main calc
  const regs = allRegsForProf.filter((r) => r.categoria !== "mensalista");
  // Mensalistas: separate comprovante card
  const mensalistaRegs = allRegsForProf.filter((r) => r.categoria === "mensalista");

  if (regs.length === 0 && mensalistaRegs.length === 0) return;

  const pct = (regs[0] ?? mensalistaRegs[0])?.percentual ?? "0";
  const subtotal = regs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const comissao = regs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const arena    = regs.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
  const chks     = regs.reduce((s, r) => s + (r.checkins ?? 1), 0);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dataStr = new Date(sessao.criadoEm).toLocaleDateString("pt-BR");

  // Group platform records by modalidade
  const byMod = new Map<string, typeof regs>();
  for (const r of [...regs].sort((a, b) => {
    const mc = (a.modalidade ?? "—").localeCompare(b.modalidade ?? "—", "pt-BR");
    if (mc !== 0) return mc;
    const nc = a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR");
    return nc !== 0 ? nc : parseDataSort(a.data).localeCompare(parseDataSort(b.data));
  })) {
    const mod = r.modalidade ?? "—";
    if (!byMod.has(mod)) byMod.set(mod, []);
    byMod.get(mod)!.push(r);
  }

  const modBlocks = regs.length === 0 ? "" : Array.from(byMod.entries())
    .map(([mod, mrs]) => {
      const modChks    = mrs.reduce((s, r) => s + (r.checkins ?? 1), 0);
      const modAlunos  = new Set(mrs.map(r => r.nomePlataforma)).size;
      const modReceita = mrs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
      const modComissao = mrs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
      const modRows = mrs.map((r) => `
        <tr>
          <td>${r.nomePlataforma}</td>
          <td style="text-align:center">${fmtData(r.data)}</td>
          <td style="text-align:center">${r.checkins ?? 1}</td>
          <td style="text-align:right">${fmt(parseFloat(r.valor || "0"))}</td>
          ${professorKey !== "__arena__" ? `<td style="text-align:right;color:#059669">${fmt(parseFloat(r.valorProfessor || "0"))}</td>` : ""}
        </tr>`).join("");
      return `
      <div class="mod-block">
        <div class="mod-header">
          <span class="mod-name">${mod}</span>
          <span class="mod-summary">${modAlunos} aluno${modAlunos !== 1 ? "s" : ""} · ${modChks} check-in${modChks !== 1 ? "s" : ""} · ${fmt(modReceita)}${professorKey !== "__arena__" ? ` · Comissão: ${fmt(modComissao)}` : ""}</span>
        </div>
        <table>
          <thead><tr>
            <th>Nome na Plataforma</th>
            <th style="text-align:center">Data/Horário</th>
            <th style="text-align:center">Check-ins</th>
            <th style="text-align:right">Valor</th>
            ${professorKey !== "__arena__" ? `<th style="text-align:right">Comissão</th>` : ""}
          </tr></thead>
          <tbody>${modRows}</tbody>
          <tfoot><tr>
            <td colspan="3"><strong>Subtotal ${mod}</strong></td>
            <td style="text-align:right"><strong>${fmt(modReceita)}</strong></td>
            ${professorKey !== "__arena__" ? `<td style="text-align:right"><strong style="color:#059669">${fmt(modComissao)}</strong></td>` : ""}
          </tr></tfoot>
        </table>
      </div>`;
    }).join("");

  // ── Mensalistas block (separate card) ──────────────────────────────────────
  const mSubtotal  = mensalistaRegs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const mComissao  = mensalistaRegs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const mArena     = mensalistaRegs.reduce((s, r) => s + Math.max(0, parseFloat(r.valor || "0") - parseFloat(r.valorProfessor || "0")), 0);
  const mensalistaRows = mensalistaRegs
    .sort((a, b) => a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR"))
    .map((r) => {
      const rv = Math.max(0, parseFloat(r.valor || "0") - parseFloat(r.valorProfessor || "0"));
      return `
      <tr>
        <td>${r.nomePlataforma}</td>
        <td style="text-align:right">${fmt(parseFloat(r.valor || "0"))}</td>
        ${professorKey !== "__arena__" ? `<td style="text-align:right;color:#059669">${fmt(parseFloat(r.valorProfessor || "0"))}</td><td style="text-align:right;color:#2563eb">${fmt(rv)}</td>` : ""}
      </tr>`;
    }).join("");
  const mensalistaBlock = mensalistaRegs.length === 0 ? "" : `
  <div class="mensalista-block">
    <div class="mensalista-header">
      <span class="mensalista-badge">Mensalistas Manuais</span>
      <span class="mensalista-summary">${mensalistaRegs.length} aluno${mensalistaRegs.length !== 1 ? "s" : ""} · ${fmt(mSubtotal)}${professorKey !== "__arena__" ? ` · Comissão: ${fmt(mComissao)} · Arena: ${fmt(mArena)}` : ""}</span>
    </div>
    <table>
      <thead><tr>
        <th>Aluno</th>
        <th style="text-align:right">Mensalidade</th>
        ${professorKey !== "__arena__" ? `<th style="text-align:right">Comissão</th><th style="text-align:right">Arena</th>` : ""}
      </tr></thead>
      <tbody>${mensalistaRows}</tbody>
      <tfoot><tr>
        <td><strong>Subtotal Mensalistas</strong></td>
        <td style="text-align:right"><strong>${fmt(mSubtotal)}</strong></td>
        ${professorKey !== "__arena__" ? `<td style="text-align:right"><strong style="color:#059669">${fmt(mComissao)}</strong></td><td style="text-align:right"><strong style="color:#2563eb">${fmt(mArena)}</strong></td>` : ""}
      </tr></tfoot>
    </table>
  </div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Comprovante — ${professorNome}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:Arial,sans-serif;font-size:10px;color:#111; }
  h1 { font-size:16px;font-weight:700;margin-bottom:2px; }
  .subtitle { color:#64748b;font-size:9px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #e2e8f0; }
  .badge { display:inline-block;background:#e0e7ff;color:#3730a3;font-size:8.5px;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:bold; }
  .summary-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px; }
  .summary-card { border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;background:#f8fafc; }
  .summary-card .val { font-size:13px;font-weight:700;margin-bottom:2px; }
  .summary-card .lbl { font-size:8px;color:#94a3b8; }
  .mod-block { margin-bottom:18px; }
  .mod-header { display:flex;align-items:center;gap:8px;background:#f1f5f9;padding:5px 9px;border-radius:4px 4px 0 0;border:1px solid #e2e8f0;border-bottom:none; }
  .mod-name { font-weight:700;font-size:9.5px;color:#1e293b; }
  .mod-summary { color:#64748b;font-size:8.5px;margin-left:auto; }
  table { width:100%;border-collapse:collapse;border:1px solid #e2e8f0; }
  th { background:#f8fafc;text-align:left;padding:4px 8px;font-size:8.5px;border-bottom:1px solid #e2e8f0;color:#475569;font-weight:600; }
  td { padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:8.5px; }
  tr:last-child td { border-bottom:none; }
  tfoot td { background:#f1f5f9;border-top:1px solid #e2e8f0; }
  .total-row { background:#1e293b;color:white;border-radius:6px;padding:8px 12px;margin-top:18px;font-size:9.5px; }
  .mensalista-block { margin-top:18px;border:1px solid #c4b5fd;border-radius:6px;overflow:hidden; }
  .mensalista-header { background:#f5f3ff;padding:6px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #c4b5fd; }
  .mensalista-badge { background:#7c3aed;color:white;font-size:8.5px;padding:2px 8px;border-radius:20px;font-weight:bold;white-space:nowrap; }
  .mensalista-summary { color:#6d28d9;font-size:8.5px;margin-left:auto; }
  .mensalista-block table { border:none; }
  .mensalista-block td { border-color:#ede9fe; }
  .mensalista-block tfoot td { background:#ede9fe;border-top:1px solid #c4b5fd; }
</style>
</head>
<body>
  <h1>${professorNome}${professorKey !== "__arena__" ? `<span class="badge">${pct}% comissão</span>` : ""}</h1>
  <div class="subtitle">Comprovante de receita — ${plataformaLabel(sessao.plataforma)} · ${sessao.nomeArquivo} · ${dataStr}</div>
  ${regs.length > 0 ? `
  <div class="summary-grid">
    <div class="summary-card"><div class="val">${new Set(regs.map(r => r.nomePlataforma)).size}</div><div class="lbl">Alunos Plataforma</div></div>
    <div class="summary-card"><div class="val">${chks}</div><div class="lbl">Check-ins</div></div>
    <div class="summary-card"><div class="val">${fmt(subtotal)}</div><div class="lbl">Receita Plataforma</div></div>
    ${professorKey !== "__arena__" ? `<div class="summary-card" style="border-color:#6ee7b7"><div class="val" style="color:#059669">${fmt(comissao)}</div><div class="lbl">Sua Comissão (${pct}%)</div></div>` : `<div class="summary-card"><div class="val">${fmt(arena)}</div><div class="lbl">Valor Arena</div></div>`}
  </div>
  ${modBlocks}
  <div class="total-row">
    <strong>${fmt(subtotal)}</strong> total plataforma · ${chks} check-in${chks !== 1 ? "s" : ""}${professorKey !== "__arena__" ? ` · Comissão: <strong>${fmt(comissao)}</strong> · Arena: ${fmt(arena)}` : ""}
  </div>` : ""}
  ${mensalistaBlock}
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

function exportComprovanteConsolidado(
  sessoes: SessaoDetalhe[],
  professorId: string,
  professorNome: string,
  percentualComissao: string,
  mesLabel: string
) {
  // Platform records only (exclude mensalistas from platform calc)
  const sections = sessoes
    .map((s) => ({
      sessao: s,
      regs: s.registros.filter(
        (r) =>
          r.status === "confirmado" &&
          r.categoria !== "mensalista" &&
          (professorId === "__arena__" ? !r.professorId : r.professorId === professorId)
      ),
    }))
    .filter((sec) => sec.regs.length > 0);

  // Mensalistas: all sessions, separate card
  const allMensalistas = sessoes.flatMap((s) =>
    s.registros.filter(
      (r) =>
        r.status === "confirmado" &&
        r.categoria === "mensalista" &&
        (professorId === "__arena__" ? !r.professorId : r.professorId === professorId)
    )
  );

  if (sections.length === 0 && allMensalistas.length === 0) return;

  const pct = percentualComissao;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Grand totals — platform only
  const allRegs = sections.flatMap((s) => s.regs);
  const totalAlunos   = new Set(allRegs.map((r) => r.nomePlataforma)).size;
  const totalChks     = allRegs.reduce((s, r) => s + (r.checkins ?? 1), 0);
  const totalReceita  = allRegs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalComissao = allRegs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const totalArena    = allRegs.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);

  // Build one section block per platform/arquivo
  const sectionBlocks = sections
    .map(({ sessao, regs }) => {
      const secAlunos   = new Set(regs.map((r) => r.nomePlataforma)).size;
      const secChks     = regs.reduce((s, r) => s + (r.checkins ?? 1), 0);
      const secReceita  = regs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
      const secComissao = regs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
      const secArena    = regs.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);

      // Group platform records by modalidade (no mensalistas here)
      const byMod = new Map<string, typeof regs>();
      for (const r of [...regs].sort((a, b) => {
        const mc = (a.modalidade ?? "—").localeCompare(b.modalidade ?? "—", "pt-BR");
        if (mc !== 0) return mc;
        const nc = a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR");
        return nc !== 0 ? nc : parseDataSort(a.data).localeCompare(parseDataSort(b.data));
      })) {
        const mod = r.modalidade ?? "—";
        if (!byMod.has(mod)) byMod.set(mod, []);
        byMod.get(mod)!.push(r);
      }

      const secModBlocks = Array.from(byMod.entries()).map(([mod, mrs]) => {
        const mChks    = mrs.reduce((s, r) => s + (r.checkins ?? 1), 0);
        const mAlunos  = new Set(mrs.map(r => r.nomePlataforma)).size;
        const mReceita = mrs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
        const mComissao = mrs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
        const mRows = mrs.map((r) => `
          <tr>
            <td>${r.nomePlataforma}</td>
            <td style="text-align:center">${fmtData(r.data)}</td>
            <td style="text-align:center">${r.checkins ?? 1}</td>
            <td style="text-align:right">${fmt(parseFloat(r.valor || "0"))}</td>
            ${professorId !== "__arena__" ? `<td style="text-align:right;color:#059669">${fmt(parseFloat(r.valorProfessor || "0"))}</td>` : ""}
          </tr>`).join("");
        return `
        <div class="mod-block">
          <div class="mod-header">
            <span class="mod-name">${mod}</span>
            <span class="mod-summary">${mAlunos} aluno${mAlunos !== 1 ? "s" : ""} · ${mChks} check-in${mChks !== 1 ? "s" : ""} · ${fmt(mReceita)}${professorId !== "__arena__" ? ` · Comissão: ${fmt(mComissao)}` : ""}</span>
          </div>
          <table>
            <thead><tr>
              <th>Nome na Plataforma</th>
              <th style="text-align:center">Data/Horário</th>
              <th style="text-align:center">Check-ins</th>
              <th style="text-align:right">Valor</th>
              ${professorId !== "__arena__" ? `<th style="text-align:right">Comissão</th>` : ""}
            </tr></thead>
            <tbody>${mRows}</tbody>
            <tfoot><tr>
              <td colspan="3"><strong>Subtotal ${mod}</strong></td>
              <td style="text-align:right"><strong>${fmt(mReceita)}</strong></td>
              ${professorId !== "__arena__" ? `<td style="text-align:right"><strong style="color:#059669">${fmt(mComissao)}</strong></td>` : ""}
            </tr></tfoot>
          </table>
        </div>`;
      }).join("");

      return `
      <div class="section">
        <div class="section-header">
          <span class="section-platform">${plataformaLabel(sessao.plataforma).toUpperCase()}</span>
          <span class="section-file">${sessao.nomeArquivo}</span>
        </div>
        <div class="section-summary">
          <span>${secAlunos} aluno${secAlunos !== 1 ? "s" : ""}</span>
          <span>${secChks} check-in${secChks !== 1 ? "s" : ""}</span>
          <span>Receita: <strong>${fmt(secReceita)}</strong></span>
          ${professorId !== "__arena__" ? `<span style="color:#059669">Comissão: <strong>${fmt(secComissao)}</strong></span><span>Arena: ${fmt(secArena)}</span>` : `<span>Arena: ${fmt(secArena)}</span>`}
        </div>
        ${secModBlocks}
        <div class="section-total">
          <strong>${fmt(secReceita)}</strong> · ${secChks} check-in${secChks !== 1 ? "s" : ""}${professorId !== "__arena__" ? ` · Comissão: <strong>${fmt(secComissao)}</strong>` : ""}
        </div>
      </div>`;
    })
    .join(sections.length > 1 ? '<div class="page-break"></div>' : "");

  // ── Mensalistas block (separate card, outside platform sections) ───────────
  const mTotal    = allMensalistas.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const mComissao = allMensalistas.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const mArena    = allMensalistas.reduce((s, r) => s + Math.max(0, parseFloat(r.valor || "0") - parseFloat(r.valorProfessor || "0")), 0);
  const mensalistaRows = allMensalistas
    .sort((a, b) => a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR"))
    .map((r) => {
      const rv = Math.max(0, parseFloat(r.valor || "0") - parseFloat(r.valorProfessor || "0"));
      return `
      <tr>
        <td>${r.nomePlataforma}</td>
        <td style="text-align:right">${fmt(parseFloat(r.valor || "0"))}</td>
        ${professorId !== "__arena__" ? `<td style="text-align:right;color:#059669">${fmt(parseFloat(r.valorProfessor || "0"))}</td><td style="text-align:right;color:#2563eb">${fmt(rv)}</td>` : ""}
      </tr>`;
    }).join("");
  const mensalistasBlock = allMensalistas.length === 0 ? "" : `
  <div class="mensalista-block">
    <div class="mensalista-header">
      <span class="mensalista-badge">Mensalistas Manuais</span>
      <span class="mensalista-summary">${allMensalistas.length} aluno${allMensalistas.length !== 1 ? "s" : ""} · ${fmt(mTotal)}${professorId !== "__arena__" ? ` · Comissão: ${fmt(mComissao)} · Arena: ${fmt(mArena)}` : ""}</span>
    </div>
    <table>
      <thead><tr>
        <th>Aluno</th>
        <th style="text-align:right">Mensalidade</th>
        ${professorId !== "__arena__" ? `<th style="text-align:right">Comissão</th><th style="text-align:right">Arena</th>` : ""}
      </tr></thead>
      <tbody>${mensalistaRows}</tbody>
      <tfoot><tr>
        <td><strong>Subtotal Mensalistas</strong></td>
        <td style="text-align:right"><strong>${fmt(mTotal)}</strong></td>
        ${professorId !== "__arena__" ? `<td style="text-align:right"><strong style="color:#059669">${fmt(mComissao)}</strong></td><td style="text-align:right"><strong style="color:#2563eb">${fmt(mArena)}</strong></td>` : ""}
      </tr></tfoot>
    </table>
  </div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Comprovante Consolidado — ${professorNome}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:Arial,sans-serif;font-size:10px;color:#111; }
  h1 { font-size:16px;font-weight:700;margin-bottom:2px; }
  .subtitle { color:#64748b;font-size:9px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #e2e8f0; }
  .badge { display:inline-block;background:#e0e7ff;color:#3730a3;font-size:8.5px;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:bold; }
  .badge-consolidated { display:inline-block;background:#fef3c7;color:#92400e;font-size:8.5px;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:bold; }
  .grand-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px; }
  .grand-card { border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;background:#f8fafc; }
  .grand-card .val { font-size:13px;font-weight:700;margin-bottom:2px; }
  .grand-card .lbl { font-size:8px;color:#94a3b8; }
  .section { margin-bottom:22px;padding-top:16px;border-top:1px solid #e2e8f0; }
  .section:first-of-type { border-top:none;padding-top:0; }
  .section-header { display:flex;align-items:baseline;gap:8px;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #1e293b; }
  .section-platform { font-size:11px;font-weight:900;color:#1e293b;letter-spacing:0.04em; }
  .section-file { font-size:8.5px;color:#64748b; }
  .section-summary { display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;font-size:8.5px;color:#475569; }
  .mod-block { margin-bottom:14px; }
  .mod-header { display:flex;align-items:center;gap:8px;background:#f1f5f9;padding:5px 9px;border-radius:4px 4px 0 0;border:1px solid #e2e8f0;border-bottom:none; }
  .mod-name { font-weight:700;font-size:9.5px;color:#1e293b; }
  .mod-summary { color:#64748b;font-size:8.5px;margin-left:auto; }
  table { width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:4px; }
  th { background:#f8fafc;text-align:left;padding:4px 8px;font-size:8.5px;border-bottom:1px solid #e2e8f0;color:#475569;font-weight:600; }
  td { padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:8.5px; }
  tr:last-child td { border-bottom:none; }
  tfoot td { background:#f1f5f9;border-top:1px solid #e2e8f0; }
  .section-total { background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:4px 10px;font-size:8.5px;color:#334155;margin-top:4px; }
  .grand-total { background:#1e293b;color:white;border-radius:6px;padding:10px 14px;margin-top:20px;font-size:10px; }
  .mensalista-block { margin-top:20px;border:1px solid #c4b5fd;border-radius:6px;overflow:hidden; }
  .mensalista-header { background:#f5f3ff;padding:6px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #c4b5fd; }
  .mensalista-badge { background:#7c3aed;color:white;font-size:8.5px;padding:2px 8px;border-radius:20px;font-weight:bold;white-space:nowrap; }
  .mensalista-summary { color:#6d28d9;font-size:8.5px;margin-left:auto; }
  .mensalista-block table { border:none; }
  .mensalista-block td { border-color:#ede9fe; }
  .mensalista-block tfoot td { background:#ede9fe;border-top:1px solid #c4b5fd; }
</style>
</head>
<body>
  <h1>${professorNome}${professorId !== "__arena__" ? `<span class="badge">${pct}% comissão</span>` : ""}<span class="badge-consolidated">Consolidado</span></h1>
  <div class="subtitle">Comprovante de receita consolidado — ${mesLabel} · ${sections.length} plataforma${sections.length !== 1 ? "s" : ""}${allMensalistas.length > 0 ? ` · ${allMensalistas.length} mensalista${allMensalistas.length !== 1 ? "s" : ""}` : ""}</div>

  ${sections.length > 0 ? `
  <div class="grand-grid">
    <div class="grand-card"><div class="val">${totalAlunos}</div><div class="lbl">Alunos Plataforma</div></div>
    <div class="grand-card"><div class="val">${totalChks}</div><div class="lbl">Check-ins totais</div></div>
    <div class="grand-card"><div class="val">${fmt(totalReceita)}</div><div class="lbl">Receita Plataforma</div></div>
    ${professorId !== "__arena__" ? `<div class="grand-card" style="border-color:#6ee7b7"><div class="val" style="color:#059669">${fmt(totalComissao)}</div><div class="lbl">Comissão Total (${pct}%)</div></div>` : `<div class="grand-card"><div class="val">${fmt(totalArena)}</div><div class="lbl">Valor Arena</div></div>`}
  </div>
  ${sectionBlocks}
  <div class="grand-total">
    TOTAL PLATAFORMA — <strong>${fmt(totalReceita)}</strong> · ${totalChks} check-in${totalChks !== 1 ? "s" : ""}${professorId !== "__arena__" ? ` · Comissão: <strong>${fmt(totalComissao)}</strong> · Arena: ${fmt(totalArena)}` : ""}
  </div>` : ""}

  ${mensalistasBlock}
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

// ── Arena Monthly Report PDF ───────────────────────────────────────────────────
function exportArenaRelatorio(
  sessoes: SessaoDetalhe[],
  allMensalistas: Registro[],
  mesLabel: string,
  pctArena: number
) {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Group confirmed platform records by plataforma
  const byPlat = new Map<string, { label: string; regs: Registro[] }>();
  for (const s of sessoes) {
    const platRegs = (s.registros ?? []).filter(
      (r) => r.status === "confirmado" && r.categoria !== "mensalista"
    );
    if (platRegs.length === 0) continue;
    const key = s.plataforma;
    if (!byPlat.has(key)) byPlat.set(key, { label: plataformaLabel(key), regs: [] });
    byPlat.get(key)!.regs.push(...platRegs);
  }

  const totalPlataforma = Array.from(byPlat.values()).flatMap((p) => p.regs)
    .reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalMensalistas = allMensalistas.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalGeral = totalPlataforma + totalMensalistas;
  const valorArena = totalGeral * (pctArena / 100);

  if (totalGeral === 0) return;

  // One block per platform
  const platBlocks = Array.from(byPlat.entries()).map(([, { label, regs }]) => {
    const receita = regs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
    const chks    = regs.reduce((s, r) => s + (r.checkins ?? 1), 0);
    const alunos  = new Set(regs.map((r) => r.nomePlataforma)).size;
    const byMod   = new Map<string, Registro[]>();
    for (const r of regs) {
      const mod = r.modalidade ?? "—";
      if (!byMod.has(mod)) byMod.set(mod, []);
      byMod.get(mod)!.push(r);
    }
    const modRows = Array.from(byMod.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
      .map(([mod, mrs]) => {
        const mRec   = mrs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
        const mChks  = mrs.reduce((s, r) => s + (r.checkins ?? 1), 0);
        const mAl    = new Set(mrs.map((r) => r.nomePlataforma)).size;
        return `<tr><td>${mod}</td><td style="text-align:center">${mAl}</td><td style="text-align:center">${mChks}</td><td style="text-align:right"><strong>${fmt(mRec)}</strong></td></tr>`;
      }).join("");
    return `
    <div class="section">
      <div class="section-header">
        <span class="section-platform">${label.toUpperCase()}</span>
        <span class="section-meta">${alunos} aluno${alunos !== 1 ? "s" : ""} · ${chks} check-in${chks !== 1 ? "s" : ""} · ${fmt(receita)}</span>
      </div>
      <table>
        <thead><tr>
          <th>Modalidade</th>
          <th style="text-align:center">Alunos</th>
          <th style="text-align:center">Check-ins</th>
          <th style="text-align:right">Receita</th>
        </tr></thead>
        <tbody>${modRows}</tbody>
        <tfoot><tr>
          <td colspan="3"><strong>Subtotal ${label}</strong></td>
          <td style="text-align:right"><strong>${fmt(receita)}</strong></td>
        </tr></tfoot>
      </table>
    </div>`;
  }).join("");

  // Mensalistas block
  const mensalistaRows = [...allMensalistas]
    .sort((a, b) => a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR"))
    .map((r) => `<tr><td>${r.nomePlataforma}</td><td style="text-align:right">${fmt(parseFloat(r.valor || "0"))}</td></tr>`)
    .join("");
  const mensalistasBlock = allMensalistas.length === 0 ? "" : `
  <div class="mensalista-block">
    <div class="mensalista-header">
      <span class="mensalista-badge">Mensalistas Manuais</span>
      <span class="mensalista-meta">${allMensalistas.length} aluno${allMensalistas.length !== 1 ? "s" : ""} · ${fmt(totalMensalistas)}</span>
    </div>
    <table>
      <thead><tr><th>Aluno</th><th style="text-align:right">Mensalidade</th></tr></thead>
      <tbody>${mensalistaRows}</tbody>
      <tfoot><tr><td><strong>Subtotal Mensalistas</strong></td><td style="text-align:right"><strong>${fmt(totalMensalistas)}</strong></td></tr></tfoot>
    </table>
  </div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório Arena — ${mesLabel}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { margin:0;padding:0;box-sizing:border-box; }
  body { font-family:Arial,sans-serif;font-size:10px;color:#111; }
  h1 { font-size:16px;font-weight:700;margin-bottom:2px; }
  .subtitle { color:#64748b;font-size:9px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #e2e8f0; }
  .badge-arena { display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:8.5px;padding:2px 8px;border-radius:20px;margin-left:6px;font-weight:bold; }
  .kpi-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px; }
  .kpi-card { border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;background:#f8fafc; }
  .kpi-card .val { font-size:13px;font-weight:700;margin-bottom:2px; }
  .kpi-card .lbl { font-size:8px;color:#94a3b8; }
  .section { margin-bottom:22px;padding-top:16px;border-top:1px solid #e2e8f0; }
  .section:first-of-type { border-top:none;padding-top:0; }
  .section-header { display:flex;align-items:baseline;gap:8px;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #1e293b; }
  .section-platform { font-size:11px;font-weight:900;color:#1e293b;letter-spacing:0.04em; }
  .section-meta { font-size:8.5px;color:#64748b;margin-left:auto; }
  table { width:100%;border-collapse:collapse;border:1px solid #e2e8f0; }
  th { background:#f8fafc;text-align:left;padding:4px 8px;font-size:8.5px;border-bottom:1px solid #e2e8f0;color:#475569;font-weight:600; }
  td { padding:4px 8px;border-bottom:1px solid #f1f5f9;font-size:8.5px; }
  tr:last-child td { border-bottom:none; }
  tfoot td { background:#f1f5f9;border-top:1px solid #e2e8f0; }
  .mensalista-block { margin-top:20px;border:1px solid #c4b5fd;border-radius:6px;overflow:hidden; }
  .mensalista-header { background:#f5f3ff;padding:6px 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #c4b5fd; }
  .mensalista-badge { background:#7c3aed;color:white;font-size:8.5px;padding:2px 8px;border-radius:20px;font-weight:bold; }
  .mensalista-meta { color:#6d28d9;font-size:8.5px;margin-left:auto; }
  .mensalista-block table { border:none; }
  .mensalista-block td { border-color:#ede9fe; }
  .mensalista-block tfoot td { background:#ede9fe;border-top:1px solid #c4b5fd; }
  .grand-total { background:#1e293b;color:white;border-radius:6px;padding:10px 14px;margin-top:20px;font-size:10px; }
  .arena-repasse { font-size:13px;font-weight:bold;color:#93c5fd;margin-top:5px; }
</style>
</head>
<body>
  <h1>Relatório Financeiro<span class="badge-arena">Arena · ${pctArena}%</span></h1>
  <div class="subtitle">Período: ${mesLabel} · Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>

  <div class="kpi-grid">
    <div class="kpi-card" style="border-color:#93c5fd"><div class="val" style="color:#1d4ed8">${fmt(valorArena)}</div><div class="lbl">Repasse Arena (${pctArena}%)</div></div>
    <div class="kpi-card"><div class="val">${fmt(totalGeral)}</div><div class="lbl">Total Geral</div></div>
    <div class="kpi-card"><div class="val">${fmt(totalPlataforma)}</div><div class="lbl">Plataformas</div></div>
    <div class="kpi-card" style="border-color:#c4b5fd"><div class="val" style="color:#7c3aed">${fmt(totalMensalistas)}</div><div class="lbl">Mensalistas</div></div>
  </div>

  ${platBlocks}
  ${mensalistasBlock}

  <div class="grand-total">
    TOTAL GERAL — <strong>${fmt(totalGeral)}</strong>${byPlat.size > 0 ? ` · Plataformas: ${fmt(totalPlataforma)}` : ""}${allMensalistas.length > 0 ? ` · Mensalistas: ${fmt(totalMensalistas)}` : ""}
    <div class="arena-repasse">REPASSE ARENA (${pctArena}%) — ${fmt(valorArena)}</div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
}

function exportToPDF(sessao: SessaoDetalhe) {
  const confirmados = sessao.registros.filter((r) => r.status === "confirmado");
  const totalRecebido = confirmados.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalProfessores = confirmados.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const totalArena = confirmados.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
  const totalCheckins = confirmados.reduce((s, r) => s + (r.checkins ?? 1), 0);
  const naoEncontrados = sessao.registros.filter((r) => r.status === "nao_encontrado");

  const byProf = new Map<string, { nome: string; registros: Registro[] }>();
  for (const r of confirmados) {
    const key = r.professorId ?? "__arena__";
    if (!byProf.has(key)) {
      byProf.set(key, { nome: r.professorNome ?? "Arena (sem professor)", registros: [] });
    }
    byProf.get(key)!.registros.push(r);
  }
  const profGroups = Array.from(byProf.entries()).sort((a, b) =>
    a[1].nome.localeCompare(b[1].nome)
  );

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dataStr = new Date(sessao.criadoEm).toLocaleDateString("pt-BR");

  const profBlocks = profGroups
    .map(([key, g]) => {
      const subtotal = g.registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
      const comissao = g.registros.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
      const arena = g.registros.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
      const chks = g.registros.reduce((s, r) => s + (r.checkins ?? 1), 0);
      const pct = g.registros[0]?.percentual ?? "0";

      const rows = g.registros
        .map(
          (r) => `
        <tr>
          <td>${r.nomePlataforma}</td>
          <td>${r.modalidade ?? "—"}</td>
          <td style="text-align:center">${r.checkins ?? 1}</td>
          <td style="text-align:right">${fmt(parseFloat(r.valor || "0"))}</td>
          <td style="text-align:right">${fmt(parseFloat(r.valorProfessor || "0"))}</td>
          <td style="text-align:right">${fmt(parseFloat(r.valorArena || "0"))}</td>
        </tr>`
        )
        .join("");

      const isArena = key === "__arena__";
      return `
      <div class="prof-block">
        <div class="prof-header">
          <span class="prof-name">${g.nome}</span>
          ${!isArena ? `<span class="prof-pct">${pct}% comissão</span>` : ""}
          <span class="prof-summary">${new Set(g.registros.map((r: Registro) => r.nomePlataforma)).size} aluno${new Set(g.registros.map((r: Registro) => r.nomePlataforma)).size !== 1 ? "s" : ""} · ${chks} check-in${chks !== 1 ? "s" : ""}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome na Plataforma</th>
              <th>Aluno Correspondido</th>
              <th style="text-align:center">Check-ins</th>
              <th style="text-align:right">Valor Total</th>
              <th style="text-align:right">Prof.</th>
              <th style="text-align:right">Arena</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Subtotal ${g.nome}</strong></td>
              <td style="text-align:right"><strong>${fmt(subtotal)}</strong></td>
              <td style="text-align:right"><strong>${fmt(comissao)}</strong></td>
              <td style="text-align:right"><strong>${fmt(arena)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    })
    .join("");

  const naoEncontradasBlock =
    naoEncontrados.length > 0
      ? `<div class="nao-encontrados">
        <div class="section-title">Não Encontrados (${naoEncontrados.length})</div>
        <table>
          <thead><tr><th>Nome na Plataforma</th><th style="text-align:right">Valor</th><th style="text-align:center">Check-ins</th></tr></thead>
          <tbody>${naoEncontrados
            .map(
              (r) =>
                `<tr><td>${r.nomePlataforma}</td><td style="text-align:right">${fmt(parseFloat(r.valor || "0"))}</td><td style="text-align:center">${r.checkins ?? 1}</td></tr>`
            )
            .join("")}</tbody>
        </table>
      </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Conferência — ${plataformaLabel(sessao.plataforma)} — ${dataStr}</title>
<style>
  @page { size: A4 portrait; margin: 16mm 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
  h1 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
  .subtitle { color: #64748b; font-size: 9px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
  .summary-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
  .summary-card .val { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
  .summary-card .lbl { font-size: 8px; color: #94a3b8; }
  .total-row { display: flex; gap: 16px; background: #1e293b; color: white; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; flex-wrap: wrap; }
  .total-item .lbl { font-size: 8px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
  .total-item .val { font-size: 12px; font-weight: 700; }
  .prof-block { margin-bottom: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .prof-block:first-of-type { border-top: none; padding-top: 0; }
  .prof-header { display: flex; align-items: center; gap: 10px; background: #f1f5f9; padding: 6px 10px; border-radius: 5px 5px 0 0; border: 1px solid #e2e8f0; border-bottom: none; }
  .prof-name { font-weight: 700; font-size: 11px; color: #1e293b; }
  .prof-pct { background: #e0e7ff; color: #3730a3; font-size: 9px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
  .prof-summary { color: #64748b; font-size: 9px; margin-left: auto; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; }
  th { background: #f8fafc; text-align: left; padding: 4px 8px; font-size: 8.5px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; }
  td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; font-size: 8.5px; }
  tr:last-child td { border-bottom: none; }
  tfoot td { background: #f1f5f9; border-top: 1px solid #e2e8f0; }
  .section-title { font-weight: 700; font-size: 11px; margin: 20px 0 8px; color: #dc2626; padding-top: 16px; border-top: 1px solid #fee2e2; }
  .nao-encontrados table { border-color: #fca5a5; }
  .nao-encontrados th { background: #fff5f5; border-color: #fca5a5; color: #991b1b; }
  .nao-encontrados td { border-color: #fee2e2; }
</style>
</head>
<body>
  <h1>Relatório de Conferência — ${plataformaLabel(sessao.plataforma)}</h1>
  <div class="subtitle">${sessao.nomeArquivo} · Gerado em ${dataStr} · ${sessao.totalRegistros} registros · ${confirmados.length} confirmados</div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="val">${fmt(totalRecebido)}</div>
      <div class="lbl">Total Recebido</div>
    </div>
    <div class="summary-card">
      <div class="val">${fmt(totalProfessores)}</div>
      <div class="lbl">Comissões Professores</div>
    </div>
    <div class="summary-card">
      <div class="val">${fmt(totalArena)}</div>
      <div class="lbl">Valor Arena</div>
    </div>
    <div class="summary-card">
      <div class="val">${totalCheckins}</div>
      <div class="lbl">Total Check-ins</div>
    </div>
  </div>

  <div class="total-row">
    <div class="total-item"><div class="lbl">TOTAL RECEBIDO</div><div class="val">${fmt(totalRecebido)}</div></div>
    <div class="total-item"><div class="lbl">PROFESSORES</div><div class="val">${fmt(totalProfessores)}</div></div>
    <div class="total-item"><div class="lbl">ARENA</div><div class="val">${fmt(totalArena)}</div></div>
    <div class="total-item"><div class="lbl">CHECK-INS</div><div class="val">${totalCheckins}</div></div>
    <div class="total-item"><div class="lbl">NÃO ENCONTRADOS</div><div class="val">${naoEncontrados.length}</div></div>
  </div>

  ${profBlocks}
  ${naoEncontradasBlock}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  arenaId: string;
  onTitleChange?: (title: string) => void;
}

interface MesRef {
  ano: number;
  mes: number;
}

export default function ConferenciaManager({ arenaId, onTitleChange }: Props) {
  const [view, setView] = useState<"landing" | "mes" | "sessao">("landing");
  const [mesSel, setMesSel] = useState<MesRef | null>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);

  useEffect(() => {
    if (view === "mes" && mesSel) {
      onTitleChange?.(`${MESES_PT[mesSel.mes - 1]} ${mesSel.ano}`);
    } else {
      onTitleChange?.("Conferência");
    }
  }, [view, mesSel]);

  if (view === "sessao" && sessaoId) {
    return (
      <SessaoView
        sessaoId={sessaoId}
        arenaId={arenaId}
        onVoltar={() => {
          setSessaoId(null);
          setView(mesSel ? "mes" : "landing");
        }}
      />
    );
  }

  if (view === "mes" && mesSel) {
    return (
      <MesView
        mes={mesSel}
        arenaId={arenaId}
        onVoltar={() => setView("landing")}
        onSelectSessao={(id) => { setSessaoId(id); setView("sessao"); }}
      />
    );
  }

  return (
    <LandingView
      arenaId={arenaId}
      onEntrarMes={(mes) => { setMesSel(mes); setView("mes"); }}
    />
  );
}

// ── Shared types for upload ───────────────────────────────────────────────────

interface UploadingFile {
  name: string;
  platform: string;
  status: "processing" | "done" | "error";
  error?: string;
  debug?: { nameCol: string | null; valueCol: string | null };
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatPeriodoSessao(s: Sessao): string | null {
  if (!s.periodoInicio) return null;
  const d = new Date(s.periodoInicio + "T12:00:00");
  return `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`;
}

const ARENA_ONLY_MODS_FE = [
  "day use", "dayuse", "day-use", "esportes coletivos",
  "utilizacao livre", "coletivo livre", "atividade livre", "livre",
];

function isArenaOnlyMod(mod: string): boolean {
  if (!mod) return false;
  const norm = mod.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return ARENA_ONLY_MODS_FE.some((k) => norm.includes(k));
}

// ── groupByMonth helper ───────────────────────────────────────────────────────

interface MesGroup {
  mes: MesRef;
  label: string;
  sessoes: Sessao[];
}

function groupByMonth(sessoes: Sessao[]): MesGroup[] {
  const map = new Map<string, MesGroup>();
  for (const s of sessoes) {
    if (!s.periodoInicio) continue;
    const d = new Date(s.periodoInicio + "T12:00:00");
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!map.has(key)) {
      map.set(key, {
        mes: { ano: d.getFullYear(), mes: d.getMonth() + 1 },
        label: `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`,
        sessoes: [],
      });
    }
    map.get(key)!.sessoes.push(s);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.mes.ano - a.mes.ano || b.mes.mes - a.mes.mes
  );
}

// ── Landing View ──────────────────────────────────────────────────────────────

function LandingView({
  arenaId,
  onEntrarMes,
}: {
  arenaId: string;
  onEntrarMes: (mes: MesRef) => void;
}) {
  const hoje = new Date();
  const prevMonth = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const [mesSel, setMesSel] = useState(prevMonth.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(prevMonth.getFullYear());
  const curYear = hoje.getFullYear();
  const anos = [curYear - 2, curYear - 1, curYear, curYear + 1];

  const { data: sessoes = [], isLoading } = useQuery<Sessao[]>({
    queryKey: ["/api/conferencia/sessoes"],
  });

  const { data: profPeriodos = [] } = useQuery<string[]>({
    queryKey: ["/api/conferencia/periodos-professores"],
  });

  // Filter out month groups that are ONLY empty manual sessions (no real data)
  const rawGroups = groupByMonth(sessoes);
  const sessoesGroups = rawGroups.filter((g) => {
    const hasRealFile = g.sessoes.some((s) => s.plataforma !== "manual");
    if (hasRealFile) return true;
    // manual-only: keep only if it has at least one registro (encontrados+possiveis+nao > 0)
    return g.sessoes.some((s) => s.plataforma === "manual" && (s.encontrados + s.possiveis + s.naoEncontrados) > 0);
  });

  // Professor-only months: periods with professors but no session data
  const professorOnlyKeys = profPeriodos.filter(
    (p) => !sessoesGroups.some((g) => `${g.mes.ano}-${String(g.mes.mes).padStart(2, "0")}` === p)
  );
  const professorOnlyGroups: MesGroup[] = professorOnlyKeys
    .map((p) => {
      const d = new Date(p + "-01T12:00:00");
      if (isNaN(d.getTime())) return null;
      return {
        mes: { ano: d.getFullYear(), mes: d.getMonth() + 1 },
        label: `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`,
        sessoes: [],
      } as MesGroup;
    })
    .filter(Boolean) as MesGroup[];

  const mesGroups = [...sessoesGroups, ...professorOnlyGroups].sort(
    (a, b) => b.mes.ano - a.mes.ano || b.mes.mes - a.mes.mes
  );

  return (
    <div className="space-y-6">
      {/* Month entry card */}
      <Card className="border-primary/20">
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-3">Selecione o mês para conferir</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(mesSel)} onValueChange={(v) => setMesSel(Number(v))}>
              <SelectTrigger className="h-9 w-40" data-testid="select-mes-landing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESES_PT.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(anoSel)} onValueChange={(v) => setAnoSel(Number(v))}>
              <SelectTrigger className="h-9 w-24" data-testid="select-ano-landing">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anos.map((a) => (
                  <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => onEntrarMes({ mes: mesSel, ano: anoSel })}
              className="gap-1.5"
              data-testid="button-conferir-mes"
            >
              Conferir {MESES_PT[mesSel - 1]} {anoSel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Dentro do mês você envia os arquivos, configura professores e visualiza os repasses calculados.
          </p>
        </CardContent>
      </Card>

      {/* Past months list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando…</div>
      ) : mesGroups.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
            Meses conferidos
          </p>
          {mesGroups.map((g) => {
            const platformSessoes = g.sessoes.filter((ss) => ss.plataforma !== "manual");
            const hasMensalistas = g.sessoes.some((ss) => ss.plataforma === "manual");
            const isProfessorOnly = g.sessoes.length === 0;
            const totalEncontrados = platformSessoes.reduce((s, ss) => s + ss.encontrados, 0);
            const totalPossiveis   = platformSessoes.reduce((s, ss) => s + ss.possiveis, 0);
            const totalNao         = platformSessoes.reduce((s, ss) => s + ss.naoEncontrados, 0);
            const plataformas = isProfessorOnly ? "Professores" : [
              ...Array.from(new Set(platformSessoes.map((ss) => plataformaLabel(ss.plataforma)))),
              ...(hasMensalistas ? ["Mensalistas"] : []),
            ].join(" + ");
            return (
              <Card
                key={`${g.mes.ano}-${g.mes.mes}`}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onEntrarMes(g.mes)}
                data-testid={`mes-card-${g.mes.ano}-${g.mes.mes}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{g.label}</p>
                        <Badge variant="secondary" className="text-xs">{plataformas}</Badge>
                        {platformSessoes.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {platformSessoes.length} arquivo{platformSessoes.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      {!isProfessorOnly && (
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" /> {totalEncontrados} confirmados
                          </span>
                          {totalPossiveis > 0 && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-3 w-3" /> {totalPossiveis} possíveis
                            </span>
                          )}
                          {totalNao > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                              <XCircle className="h-3 w-3" /> {totalNao} não encontrados
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground text-sm border border-dashed rounded-xl">
          Nenhuma conferência realizada ainda.<br />
          Selecione um mês acima para começar.
        </div>
      )}
    </div>
  );
}

// ── Mes View (workspace for a specific month) ─────────────────────────────────

function MesView({
  mes,
  arenaId,
  onVoltar,
  onSelectSessao,
}: {
  mes: MesRef;
  arenaId: string;
  onVoltar: () => void;
  onSelectSessao: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [pendingMap, setPendingMap] = useState<PendingMapFile | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const mesLabel = `${MESES_PT[mes.mes - 1]} ${mes.ano}`;
  const monthKey = `${mes.ano}-${String(mes.mes).padStart(2, "0")}`;
  const dataInicio = `${monthKey}-01`;
  const lastDay = new Date(mes.ano, mes.mes, 0).getDate();
  const dataFim = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

  const { data: sessoes = [], isLoading } = useQuery<Sessao[]>({
    queryKey: ["/api/conferencia/sessoes"],
  });

  const mesSessoes = sessoes.filter((s) => s.periodoInicio?.startsWith(monthKey));
  const platformSessoes = mesSessoes.filter((s) => s.plataforma !== "manual");

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/conferencia/sessao/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] }),
  });

  const isUploading = uploadingFiles.some((f) => f.status === "processing");

  // Step 1: preview headers — called right after file selection
  // Extracts a human-readable message from API errors.
  // throwIfResNotOk throws Error("STATUS: {json_body}") — we parse the JSON to get the actual message.
  const parseApiError = (err: unknown): string => {
    if (!(err instanceof Error)) return "Erro desconhecido";
    const raw = err.message;
    // Format: "403: {"message":"Acesso negado"}" or "500: {"message":"..."}"
    const match = raw.match(/^\d+:\s*(\{[\s\S]*\})$/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.message) return parsed.message;
      } catch {
        // not JSON — fall through
      }
    }
    // Session/auth errors
    if (raw.startsWith("401") || raw.startsWith("403")) {
      return "Sessão expirada. Faça login novamente e tente de novo.";
    }
    // Network / body-too-large errors
    if (raw === "Failed to fetch" || raw.includes("NetworkError") || raw.includes("fetch")) {
      return "Arquivo grande demais ou falha de rede. Verifique sua conexão e tente novamente.";
    }
    return raw;
  };

  const previewFile = async (file: File): Promise<void> => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({ title: "Formato inválido", description: `${file.name}: envie .xlsx ou .xls`, variant: "destructive" });
      return;
    }
    setIsPreviewing(true);
    try {
      const content = await fileToBase64(file);
      const platform = detectPlatformFromFilename(file.name) || "outro";
      const res = await apiRequest("POST", "/api/conferencia/preview-headers", {
        filename: file.name,
        content,
      });
      let preview: PreviewResponse;
      try {
        preview = await res.json();
      } catch {
        throw new Error("O servidor retornou uma resposta inválida. Tente novamente.");
      }
      if (!preview?.headers?.length) {
        throw new Error("Nenhuma coluna encontrada no arquivo. Verifique se é um arquivo Excel válido.");
      }
      setPendingMap({ file, content, platform, preview });
    } catch (err: unknown) {
      const msg = parseApiError(err);
      toast({ title: `Erro ao ler ${file.name}`, description: msg, variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  // Step 2: upload with confirmed column mapping
  const doUploadWithMapping = async (mapping: ColMapping): Promise<void> => {
    if (!pendingMap) return;
    const { file, content, platform } = pendingMap;
    setPendingMap(null);

    setUploadingFiles((prev) => [...prev, { name: file.name, platform, status: "processing" }]);
    try {
      const res = await apiRequest("POST", "/api/conferencia/upload", {
        filename: file.name,
        content,
        platform,
        dataInicio,
        dataFim,
        colNome: mapping.colNome || undefined,
        colValor: mapping.colValor || undefined,
        colModalidade: mapping.colModalidade || undefined,
        colData: mapping.colData || undefined,
        colCheckins: mapping.colCheckins || undefined,
      });
      let sessao: SessaoDetalhe;
      try {
        sessao = await res.json();
      } catch {
        throw new Error("O servidor retornou uma resposta inválida ao processar o arquivo.");
      }
      qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
      qc.setQueryData(["/api/conferencia/sessao", sessao.id], sessao);
      setUploadingFiles((prev) =>
        prev.map((f) => f.name === file.name ? { ...f, status: "done", debug: sessao.debug } : f)
      );
      const total = sessao.encontrados + sessao.possiveis;
      toast({
        title: `${total} correspondência${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`,
        description: `${sessao.encontrados} confirmados · ${sessao.possiveis} possíveis · ${sessao.naoEncontrados} não encontrados`,
      });
      onSelectSessao(sessao.id);
    } catch (err: unknown) {
      const msg = parseApiError(err);
      setUploadingFiles((prev) =>
        prev.map((f) => f.name === file.name ? { ...f, status: "error", error: msg } : f)
      );
      toast({ title: `Erro: ${file.name}`, description: msg, variant: "destructive" });
    }
  };

  // Stage files for review before processing (user can remove wrong files)
  const stageFiles = (files: File[]) => {
    const valid = files.filter((f) => f.name.match(/\.(xlsx|xls)$/i));
    if (valid.length === 0) {
      toast({ title: "Formato inválido", description: "Envie arquivos .xlsx ou .xls", variant: "destructive" });
      return;
    }
    setStagedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !existingNames.has(f.name))];
    });
  };

  // Remove a staged file without processing
  const removeStagedFile = (file: File) => {
    setStagedFiles((prev) => prev.filter((f) => f !== file));
  };

  // Process one staged file: show column mapping dialog → upload
  const processStagedFile = async (file: File) => {
    setStagedFiles((prev) => prev.filter((f) => f !== file));
    await previewFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Column mapping dialog — shown before upload */}
      {pendingMap && (
        <ColMapDialog
          pending={pendingMap}
          onConfirm={(mapping) => doUploadWithMapping(mapping)}
          onCancel={() => setPendingMap(null)}
        />
      )}

      {/* ── Professores (first) ─────────────────────────────────────────── */}
      <ConfiguracaoView arenaId={arenaId} periodo={monthKey} sessaoIds={mesSessoes.map((s) => s.id)} mesLabel={mesLabel} />

      {/* ── Arquivos (below) ────────────────────────────────────────────── */}
      <div className="border-t pt-5">
        <Card className="border">
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-0.5">Arquivos do mês</p>
              <p className="text-xs text-muted-foreground">
                Arraste o Excel do TotalPass ou Wellhub referente a <strong>{mesLabel}</strong>.
                As colunas serão mapeadas antes de processar.
              </p>
            </div>

            {/* Upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                stageFiles(Array.from(e.dataTransfer.files));
              }}
              onClick={() => fileRef.current?.click()}
              data-testid="upload-zone-conferir"
              className={cn(
                "border-2 border-dashed rounded-lg px-4 py-7 flex flex-col items-center justify-center transition-colors select-none cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <Upload className="h-7 w-7 text-muted-foreground mb-1.5" />
              <span className="text-sm font-medium">Arraste os arquivos ou clique para selecionar</span>
              <span className="text-xs text-muted-foreground mt-0.5">.xlsx ou .xls · TotalPass e/ou Wellhub</span>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => {
                  stageFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </div>

            {/* Staged files — waiting to be processed */}
            {stagedFiles.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Arquivos selecionados — clique em Processar para enviar
                </p>
                {stagedFiles.map((file) => {
                  const platform = detectPlatformFromFilename(file.name) || "outro";
                  return (
                    <div
                      key={file.name}
                      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1 text-sm">{file.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{plataformaLabel(platform)}</Badge>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-3 text-xs shrink-0"
                        disabled={isPreviewing || isUploading}
                        onClick={() => processStagedFile(file)}
                        data-testid={`button-processar-${file.name}`}
                      >
                        {isPreviewing ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Processar"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeStagedFile(file)}
                        data-testid={`button-remover-staged-${file.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Processing / done / error status */}
            {uploadingFiles.length > 0 && (
              <div className="space-y-1.5">
                {uploadingFiles.map((f) => (
                  <div
                    key={f.name}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                      f.status === "processing" && "bg-muted",
                      f.status === "done" && "bg-emerald-50 dark:bg-emerald-950/40",
                      f.status === "error" && "bg-red-50 dark:bg-red-950/40"
                    )}
                  >
                    {f.status === "processing" && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
                    {f.status === "done" && <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    {f.status === "error" && <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                    <span className="truncate flex-1">{f.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{plataformaLabel(f.platform || "outro")}</Badge>
                    {f.status === "error" && f.error && (
                      <span className="text-red-600 shrink-0 max-w-[200px] truncate">{f.error}</span>
                    )}
                    {f.status === "done" && f.debug && (
                      <span className="text-emerald-700 dark:text-emerald-400 shrink-0 text-xs">
                        nome: <strong>{f.debug.nameCol ?? "?"}</strong> · valor:{" "}
                        <strong>{f.debug.valueCol ?? "?"}</strong>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sessions for this month — inside the same card (manual sessions excluded) */}
            {isLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Carregando…</div>
            ) : platformSessoes.length > 0 ? (
              <div className="space-y-1.5 border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Arquivos enviados — {mesLabel}
                </p>
                {platformSessoes.map((s) => (
                  <div
                    key={s.id}
                    className="grid items-center gap-x-4 cursor-pointer rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:shadow-sm transition-all px-3 py-2"
                    style={{ gridTemplateColumns: "1fr 86px auto auto auto auto auto" }}
                    onClick={() => onSelectSessao(s.id)}
                    data-testid={`sessao-card-${s.id}`}
                  >
                    {/* Col 1: filename */}
                    <div className="flex items-center gap-2 min-w-0">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{s.nomeArquivo}</span>
                    </div>

                    {/* Col 2: platform badge — flex fills the full 86px column */}
                    <Badge
                      variant="secondary"
                      className="text-xs flex justify-center"
                    >
                      {plataformaLabel(s.plataforma)}
                    </Badge>

                    {/* Col 3: encontrados */}
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <CheckCircle className="h-3 w-3 shrink-0" /> {s.encontrados} enc.
                    </span>

                    {/* Col 4: possiveis */}
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {s.possiveis} pos.
                    </span>

                    {/* Col 5: não encontrados */}
                    <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
                      <XCircle className="h-3 w-3 shrink-0" /> {s.naoEncontrados} não enc.
                    </span>

                    {/* Col 6: total registros */}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.totalRegistros} reg
                    </span>

                    {/* Col 7: actions */}
                    <div className="flex items-center gap-0.5 shrink-0 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(s.id);
                        }}
                        data-testid={`button-delete-sessao-${s.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !isUploading && (
              <div className="border-t pt-4">
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                  Nenhum arquivo enviado para {mesLabel}.<br />
                  Arraste os arquivos acima para começar.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mensalistas manuais card — always shown */}
        <MensalistaCard
          mesSessoes={mesSessoes}
          arenaId={arenaId}
          periodo={monthKey}
          dataInicio={dataInicio}
          dataFim={dataFim}
        />

        {/* Arena financial report card — shown when there is data */}
        {mesSessoes.length > 0 && (
          <ArenaRelatorioCard mesSessoes={mesSessoes} arenaId={arenaId} periodo={monthKey} mesLabel={mesLabel} />
        )}
      </div>
    </div>
  );
}

// ── Mensalista Card ────────────────────────────────────────────────────────────

function MensalistaCard({
  mesSessoes,
  arenaId: _arenaId,
  periodo,
  dataInicio,
  dataFim,
}: {
  mesSessoes: Sessao[];
  arenaId: string;
  periodo: string;
  dataInicio: string;
  dataFim: string;
}) {
  const [open, setOpen] = useState(false);
  const [mAlunoId, setMAlunoId] = useState("");
  const [mAlunoNome, setMAlunoNome] = useState("");
  const [mProfId, setMProfId] = useState("");
  const [mValor, setMValor] = useState("");
  const [mComprovante, setMComprovante] = useState<string | null>(null);
  const [mComboOpen, setMComboOpen] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editReg, setEditReg] = useState<Registro | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editProfId, setEditProfId] = useState("");
  const [editComprovante, setEditComprovante] = useState<string | null>(null);

  const { toast } = useToast();
  const qc = useQueryClient();

  // Always use/create the dedicated manual session for mensalistas
  const manualSessao = mesSessoes.find((s) => s.plataforma === "manual");

  const reset = () => {
    setMAlunoId(""); setMAlunoNome(""); setMProfId("");
    setMValor(""); setMComprovante(null); setMComboOpen(false);
  };

  // Fetch all session details to aggregate mensalistas
  const sessaoIdsKey = mesSessoes.map((s) => s.id).join(",");
  const { data: allDetails = [], refetch: refetchDetails } = useQuery<SessaoDetalhe[]>({
    queryKey: ["/api/conferencia/mensalistas-card", periodo, sessaoIdsKey],
    queryFn: async () => {
      if (mesSessoes.length === 0) return [];
      const results = await Promise.all(
        mesSessoes.map((s) => fetch(`/api/conferencia/sessao/${s.id}`).then((r) => r.json()))
      );
      return results as SessaoDetalhe[];
    },
    enabled: mesSessoes.length > 0,
  });

  const allMensalistas = allDetails.flatMap((d) =>
    (d?.registros ?? []).filter((r) => r.categoria === "mensalista")
  );

  const totalValor = allMensalistas.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalProf  = allMensalistas.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const totalArena = Math.max(0, totalValor - totalProf);

  // Professor list (for dialog)
  const { data: confsProfs = [] } = useQuery<ConfProfessor[]>({
    queryKey: ["/api/conferencia/professores", periodo],
    queryFn: () => fetch(`/api/conferencia/professores?periodo=${periodo}`).then((r) => r.json()),
  });

  // Arena students (autocomplete, only fetched when dialog is open)
  const { data: arenaStudents = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ["/api/students"],
    queryFn: () => fetch("/api/students").then((r) => r.json()),
    enabled: open,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
    qc.invalidateQueries({ queryKey: ["/api/conferencia/mensalistas-card", periodo] });
    qc.invalidateQueries({ queryKey: ["/api/conferencia/arena-relatorio", periodo] });
    qc.invalidateQueries({ queryKey: ["/api/conferencia/professores", periodo] });
    void refetchDetails();
  };

  const addMutation = useMutation({
    mutationFn: async (body: {
      studentId: string; alunoNome: string; professorId: string; valor: string; comprovante?: string | null;
    }) => {
      // Ensure we have a manual session — create one if needed
      let sessaoId = manualSessao?.id;
      if (!sessaoId) {
        const sessRes = await apiRequest("POST", "/api/conferencia/sessao-manual", { dataInicio, dataFim });
        const sessData = await sessRes.json() as { id: string };
        sessaoId = sessData.id;
        await qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
      }
      const res = await apiRequest("POST", `/api/conferencia/sessao/${sessaoId}/mensalista`, body);
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Resposta inesperada do servidor (${res.status}): ${txt.slice(0, 120)}`);
      }
      return res.json() as Promise<Registro>;
    },
    onSuccess: (novo: Registro) => {
      invalidateAll();
      toast({ title: "Mensalista adicionado", description: novo.nomePlataforma });
      setOpen(false);
      reset();
    },
    onError: (err: Error) => toast({ title: "Erro ao adicionar mensalista", description: err.message, variant: "destructive" }),
  });

  const editMutation = useMutation({
    mutationFn: async (body: { id: string; alunoNome: string; valor: string; professorId: string; comprovante?: string | null }) => {
      const res = await apiRequest("PUT", `/api/conferencia/registro/${body.id}/mensalista`, {
        alunoNome: body.alunoNome,
        valor: body.valor,
        professorId: body.professorId || null,
        comprovante: body.comprovante,
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        const txt = await res.text();
        throw new Error(`Resposta inesperada do servidor (${res.status}): ${txt.slice(0, 120)}`);
      }
      return res.json() as Promise<Registro>;
    },
    onSuccess: (updated: Registro) => {
      invalidateAll();
      toast({ title: "Mensalista atualizado", description: updated.nomePlataforma });
      setEditOpen(false);
      setEditReg(null);
    },
    onError: (err: Error) => toast({ title: "Erro ao editar mensalista", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/conferencia/registro/${id}`).then((r) => r.json()),
    onSuccess: (_: unknown, id: string) => {
      for (const s of mesSessoes) {
        qc.setQueryData<SessaoDetalhe>(["/api/conferencia/sessao", s.id], (old) => {
          if (!old) return old;
          const newRegs = old.registros.filter((r) => r.id !== id);
          return {
            ...old, registros: newRegs,
            encontrados: newRegs.filter((r) => r.status === "confirmado").length,
            possiveis:   newRegs.filter((r) => r.status === "pendente").length,
            naoEncontrados: newRegs.filter((r) => r.status === "nao_encontrado").length,
          };
        });
      }
      invalidateAll();
      toast({ title: "Mensalista removido" });
    },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  return (
    <>
      <Card className="border border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0 h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold">Mensalistas Manuais</CardTitle>
                {allMensalistas.length > 0 ? (
                  <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="font-medium text-foreground">
                      {allMensalistas.length} aluno{allMensalistas.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="font-medium text-foreground">{fmtVal(String(totalValor))}</span>
                    {totalProf > 0 && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <span>Prof: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtVal(String(totalProf))}</span></span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>Arena: <span className="text-blue-600 dark:text-blue-400 font-medium">{fmtVal(String(totalArena))}</span></span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">Nenhum mensalista adicionado</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7 shrink-0"
              onClick={() => setOpen(true)}
              data-testid="button-add-mensalista"
            >
              <UserPlus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardHeader>

        {allMensalistas.length > 0 && (
          <CardContent className="px-4 pb-4 pt-0">
            <div className="border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs py-2">Aluno</TableHead>
                    <TableHead className="text-xs py-2 text-right">Total</TableHead>
                    <TableHead className="text-xs py-2 text-right">Prof.</TableHead>
                    <TableHead className="text-xs py-2 text-right">Arena</TableHead>
                    <TableHead className="text-xs py-2 text-center w-12">Comp.</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...allMensalistas]
                    .sort((a, b) => a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR"))
                    .map((r) => {
                      const arenaVal = Math.max(0, parseFloat(r.valor || "0") - parseFloat(r.valorProfessor || "0"));
                      return (
                        <TableRow key={r.id} className="text-xs">
                          <TableCell className="py-2 font-medium max-w-[140px]">
                            <span className="block truncate" title={r.nomePlataforma}>{r.nomePlataforma}</span>
                          </TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums">{fmtVal(r.valor)}</TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{fmtVal(r.valorProfessor)}</TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">{fmtVal(String(arenaVal))}</TableCell>
                          <TableCell className="py-2 text-center">
                            {r.comprovante ? (
                              <button
                                onClick={() => window.open(r.comprovante!, "_blank")}
                                className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                                title="Ver comprovante"
                              >
                                <ImageIcon className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setEditReg(r);
                                  setEditNome(r.nomePlataforma);
                                  setEditValor(r.valor);
                                  setEditProfId(r.professorId ?? "");
                                  setEditComprovante(r.comprovante ?? null);
                                  setEditOpen(true);
                                }}
                                data-testid={`button-edit-mensalista-${r.id}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteMutation.mutate(r.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-mensalista-${r.id}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Add dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Mensalista
            </DialogTitle>
            <DialogDescription className="sr-only">
              Adicionar aluno mensalista manualmente à conferência
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do aluno</Label>
              <div className="relative">
                <Input
                  placeholder="Digite o nome…"
                  value={mAlunoNome}
                  onChange={(e) => {
                    setMAlunoNome(e.target.value);
                    setMAlunoId("");
                    setMComboOpen(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => { if (mAlunoNome.trim()) setMComboOpen(true); }}
                  onBlur={() => setTimeout(() => setMComboOpen(false), 150)}
                  className="h-9 text-sm"
                  data-testid="input-mensalista-nome"
                  autoComplete="off"
                />
                {mComboOpen && (() => {
                  const matches = [...arenaStudents]
                    .filter((s) => s.nome.toLowerCase().includes(mAlunoNome.toLowerCase().trim()))
                    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                    .slice(0, 8);
                  if (matches.length === 0) return null;
                  return (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md shadow-md bg-popover overflow-hidden">
                      {matches.map((s) => (
                        <button
                          key={s.id}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setMAlunoId(s.id);
                            setMAlunoNome(s.nome);
                            setMComboOpen(false);
                          }}
                        >
                          {s.nome}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {mAlunoId && (
                <p className="text-[11px] text-muted-foreground">✓ Vinculado ao cadastro da arena</p>
              )}
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={mValor}
                onChange={(e) => setMValor(e.target.value)}
                className="h-9 text-sm"
                data-testid="input-mensalista-valor"
              />
            </div>

            {/* Professor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Professor responsável (opcional)</Label>
              <Select value={mProfId} onValueChange={setMProfId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sem professor (100% arena)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem professor (100% arena)</SelectItem>
                  {confsProfs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}{parseFloat(p.percentualComissao) > 0 ? ` — ${p.percentualComissao}% comissão` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mProfId && mProfId !== "__none__" && (() => {
                const prof = confsProfs.find((p) => p.id === mProfId);
                const pct = parseFloat(prof?.percentualComissao ?? "0");
                const val = parseFloat(mValor) || 0;
                if (pct > 0 && val > 0) {
                  const vp = Math.round(val * pct / 100 * 100) / 100;
                  const va = Math.round((val - vp) * 100) / 100;
                  return (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Prof: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtVal(String(vp))}</span>
                      {" · "}
                      Arena: <span className="text-blue-600 dark:text-blue-400 font-medium">{fmtVal(String(va))}</span>
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Comprovante */}
            <div className="space-y-1.5">
              <Label className="text-xs">Comprovante PIX (opcional)</Label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="comprovante-upload-card"
                  className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {mComprovante ? "Imagem carregada ✓" : "Selecionar imagem…"}
                </label>
                <input
                  id="comprovante-upload-card"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setMComprovante(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
                {mComprovante && (
                  <button onClick={() => setMComprovante(null)} className="text-xs text-destructive hover:underline">remover</button>
                )}
              </div>
              {mComprovante && (
                <img src={mComprovante} alt="comprovante" className="max-h-28 rounded border object-contain mt-1" />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancelar</Button>
            <Button
              disabled={
                !mAlunoNome.trim() ||
                !mValor ||
                isNaN(parseFloat(mValor)) ||
                parseFloat(mValor) <= 0 ||
                addMutation.isPending
              }
              onClick={() =>
                addMutation.mutate({
                  studentId: mAlunoId,
                  alunoNome: mAlunoNome,
                  professorId: mProfId && mProfId !== "__none__" ? mProfId : "",
                  valor: mValor,
                  comprovante: mComprovante,
                })
              }
              data-testid="button-confirmar-mensalista"
            >
              {addMutation.isPending ? "Salvando…" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditReg(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Editar Mensalista
            </DialogTitle>
            <DialogDescription className="sr-only">
              Editar dados do aluno mensalista
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do aluno</Label>
              <Input
                placeholder="Nome do aluno…"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="h-9 text-sm"
                data-testid="input-edit-mensalista-nome"
              />
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={editValor}
                onChange={(e) => setEditValor(e.target.value)}
                className="h-9 text-sm"
                data-testid="input-edit-mensalista-valor"
              />
            </div>

            {/* Professor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Professor responsável (opcional)</Label>
              <Select value={editProfId || "__none__"} onValueChange={(v) => setEditProfId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Sem professor (100% arena)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem professor (100% arena)</SelectItem>
                  {confsProfs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}{parseFloat(p.percentualComissao) > 0 ? ` — ${p.percentualComissao}% comissão` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editProfId && editProfId !== "__none__" && (() => {
                const prof = confsProfs.find((p) => p.id === editProfId);
                const pct = parseFloat(prof?.percentualComissao ?? "0");
                const val = parseFloat(editValor) || 0;
                if (pct > 0 && val > 0) {
                  const vp = Math.round(val * pct / 100 * 100) / 100;
                  const va = Math.round((val - vp) * 100) / 100;
                  return (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Prof: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtVal(String(vp))}</span>
                      {" · "}
                      Arena: <span className="text-blue-600 dark:text-blue-400 font-medium">{fmtVal(String(va))}</span>
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Comprovante */}
            <div className="space-y-1.5">
              <Label className="text-xs">Comprovante PIX (opcional)</Label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="edit-comprovante-upload"
                  className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  {editComprovante ? "Imagem carregada ✓" : "Selecionar imagem…"}
                </label>
                <input
                  id="edit-comprovante-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setEditComprovante(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
                {editComprovante && (
                  <button onClick={() => setEditComprovante(null)} className="text-xs text-destructive hover:underline">remover</button>
                )}
              </div>
              {editComprovante && (
                <img src={editComprovante} alt="comprovante" className="max-h-28 rounded border object-contain mt-1" />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setEditOpen(false); setEditReg(null); }}>Cancelar</Button>
            <Button
              disabled={
                !editNome.trim() ||
                !editValor ||
                isNaN(parseFloat(editValor)) ||
                parseFloat(editValor) <= 0 ||
                editMutation.isPending
              }
              onClick={() => {
                if (!editReg) return;
                editMutation.mutate({
                  id: editReg.id,
                  alunoNome: editNome,
                  valor: editValor,
                  professorId: editProfId && editProfId !== "__none__" ? editProfId : "",
                  comprovante: editComprovante,
                });
              }}
              data-testid="button-salvar-edit-mensalista"
            >
              {editMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Arena Relatório Card ──────────────────────────────────────────────────────
function ArenaRelatorioCard({
  mesSessoes,
  arenaId: _arenaId,
  periodo,
  mesLabel,
}: {
  mesSessoes: Sessao[];
  arenaId: string;
  periodo: string;
  mesLabel: string;
}) {
  const [pctArena, setPctArena] = useState("70");

  const arenaRelSessaoKey = mesSessoes.map((s) => s.id).join(",");
  const { data: allDetails = [] } = useQuery<SessaoDetalhe[]>({
    queryKey: ["/api/conferencia/arena-relatorio", periodo, arenaRelSessaoKey],
    queryFn: async () => {
      if (mesSessoes.length === 0) return [];
      const results = await Promise.all(
        mesSessoes.map((s) => fetch(`/api/conferencia/sessao/${s.id}`).then((r) => r.json()))
      );
      return results as SessaoDetalhe[];
    },
    enabled: mesSessoes.length > 0,
  });

  const { data: repasseCfg } = useQuery<RepasseConfig>({
    queryKey: ["/api/conferencia/repasse-config", periodo],
    queryFn: () => fetch(`/api/conferencia/repasse-config?periodo=${periodo}`).then((r) => r.json()),
    enabled: !!periodo,
  });

  useEffect(() => {
    if (repasseCfg?.pctArena) setPctArena(repasseCfg.pctArena);
  }, [repasseCfg]);

  const allPlatformRegs = allDetails.flatMap((d) =>
    (d?.registros ?? []).filter((r) => r.status === "confirmado" && r.categoria !== "mensalista")
  );
  const allMensalistas = allDetails.flatMap((d) =>
    (d?.registros ?? []).filter((r) => r.categoria === "mensalista")
  );

  const totalPlataforma  = allPlatformRegs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalMensalistas = allMensalistas.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalGeral       = totalPlataforma + totalMensalistas;
  const pct              = parseFloat(pctArena) || 0;
  const valorArena       = totalGeral * (pct / 100);

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">Relatório Arena</CardTitle>
              {totalGeral > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total <span className="font-medium text-foreground">{fmtVal(String(totalGeral))}</span>
                  {" · "}Arena: <span className="text-blue-600 dark:text-blue-400 font-medium">{fmtVal(String(valorArena))}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Nenhum dado para este mês</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">% Arena:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={pctArena}
                onChange={(e) => setPctArena(e.target.value)}
                className="w-14 h-7 text-xs border border-border rounded px-2 bg-background text-foreground"
                data-testid="input-pct-arena-relatorio"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7 shrink-0"
              disabled={totalGeral === 0}
              onClick={() => exportArenaRelatorio(allDetails, allMensalistas, mesLabel, pct)}
              data-testid="button-gerar-relatorio-arena"
            >
              <Printer className="h-3.5 w-3.5" /> Relatório
            </Button>
          </div>
        </div>
      </CardHeader>
      {totalGeral > 0 && (
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: `Arena (${pctArena}%)`, val: fmtVal(String(valorArena)), color: "text-blue-600 dark:text-blue-400" },
              { label: "Total Geral", val: fmtVal(String(totalGeral)), color: "text-foreground" },
              { label: "Plataformas", val: fmtVal(String(totalPlataforma)), color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Mensalistas", val: fmtVal(String(totalMensalistas)), color: "text-violet-600 dark:text-violet-400" },
            ].map((i) => (
              <div key={i.label} className="bg-muted/40 rounded-md px-2.5 py-1.5 text-center">
                <div className={cn("font-bold text-sm", i.color)}>{i.val}</div>
                <div className="text-xs text-muted-foreground">{i.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Configuração View ─────────────────────────────────────────────────────────

function RepasseConfigCard({ arenaId: _arenaId, periodo }: { arenaId: string; periodo: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: professores = [] } = useQuery<ConfProfessor[]>({
    queryKey: ["/api/conferencia/professores", periodo],
    queryFn: () => fetch(`/api/conferencia/professores?periodo=${periodo}`).then((r) => r.json()),
  });

  const { data: config } = useQuery<RepasseConfig>({
    queryKey: ["/api/conferencia/repasse-config", periodo],
    queryFn: () => fetch(`/api/conferencia/repasse-config?periodo=${periodo}`).then((r) => r.json()),
  });

  const [localPctArena, setLocalPctArena] = useState<string>("100");

  useEffect(() => {
    if (config === undefined) return;
    setLocalPctArena(String(parseFloat(config.pctArena) || 100));
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (vals: RepasseConfig & { periodo: string }) =>
      apiRequest("PUT", "/api/conferencia/repasse-config", vals).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/conferencia/repasse-config", periodo] }),
    onError: () => toast({ title: "Erro ao salvar configuração de repasse", variant: "destructive" }),
  });

  const gestaoTipo = config?.gestaoTipo ?? "caixa";
  const gestaoProfessorId = config?.gestaoProfessorId ?? null;
  const pctArenaNum = parseFloat(localPctArena) || 0;
  const gestaoAtiva = pctArenaNum < 100;

  const save = (patch: Partial<RepasseConfig & { pctArena: string }>) =>
    saveMutation.mutate({
      periodo,
      pctArena: patch.pctArena ?? localPctArena,
      pctGestao: "0",
      gestaoTipo: patch.gestaoTipo ?? gestaoTipo,
      gestaoProfessorId: "gestaoProfessorId" in patch ? (patch.gestaoProfessorId ?? null) : gestaoProfessorId,
    });

  const [showGestaoConfig, setShowGestaoConfig] = useState(false);

  return (
    <Card className="border">
      <CardContent className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold text-foreground whitespace-nowrap">Repasse &amp; Gestão</p>

          {/* % Arena */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">% Arena</span>
            <div className="relative w-20">
              <Input
                type="number" min="0" max="100"
                value={localPctArena}
                onChange={(e) => setLocalPctArena(e.target.value)}
                onBlur={() => save({ pctArena: localPctArena })}
                className="pr-6 h-8 text-sm"
                data-testid="input-pct-arena"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
            </div>
          </div>

          {/* Gestão = sobra + gear icon */}
          {gestaoAtiva && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Gestão: sobra</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowGestaoConfig((v) => !v)}
                data-testid="btn-gestao-config"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Destino da Gestão — expandido ao clicar na engrenagem */}
          {gestaoAtiva && showGestaoConfig && (
            <>
              <Select
                value={gestaoTipo}
                onValueChange={(v) => save({ gestaoTipo: v, gestaoProfessorId: v === "caixa" ? null : gestaoProfessorId })}
              >
                <SelectTrigger className="h-8 text-xs w-44" data-testid="select-gestao-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa gestão (separado)</SelectItem>
                  <SelectItem value="professor">Professor específico</SelectItem>
                </SelectContent>
              </Select>

              {gestaoTipo === "professor" && (
                <Select
                  value={gestaoProfessorId ?? ""}
                  onValueChange={(v) => save({ gestaoProfessorId: v || null })}
                >
                  <SelectTrigger className="h-8 text-xs w-40" data-testid="select-gestao-professor">
                    <SelectValue placeholder="Selecionar professor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {professores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ConfiguracaoView({ arenaId, periodo, sessaoIds = [], mesLabel = "" }: { arenaId: string; periodo: string; sessaoIds?: string[]; mesLabel?: string }) {
  const [novoProfNome, setNovoProfNome] = useState("");
  const [novoProfPct, setNovoProfPct] = useState("0");
  const [editingProf, setEditingProf] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editPct, setEditPct] = useState("0");
  const [comprovanteLoading, setComprovanteLoading] = useState<string | null>(null);
  const qcOuter = useQueryClient();
  const [listaTexto, setListaTexto] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const profQueryKey = ["/api/conferencia/professores", periodo];

  const { data: professores = [], isLoading } = useQuery<ConfProfessor[]>({
    queryKey: profQueryKey,
    queryFn: () =>
      fetch(`/api/conferencia/professores?periodo=${periodo}`).then((r) => r.json()),
    placeholderData: keepPreviousData,
  });

  const handleComprovanteConsolidado = async (prof: ConfProfessor) => {
    if (sessaoIds.length === 0) {
      toast({ title: "Nenhum arquivo enviado", description: "Envie os arquivos do mês antes de gerar o comprovante.", variant: "destructive" });
      return;
    }
    setComprovanteLoading(prof.id);
    try {
      const sessoes = await Promise.all(
        sessaoIds.map((id) => {
          const cached = qcOuter.getQueryData<SessaoDetalhe>(["/api/conferencia/sessao", id]);
          if (cached) return Promise.resolve(cached);
          return fetch(`/api/conferencia/sessao/${id}`).then((r) => r.json() as Promise<SessaoDetalhe>);
        })
      );
      exportComprovanteConsolidado(sessoes, prof.id, prof.nome, prof.percentualComissao, mesLabel);
    } catch {
      toast({ title: "Erro ao gerar comprovante", variant: "destructive" });
    } finally {
      setComprovanteLoading(null);
    }
  };

  const addProfMutation = useMutation({
    mutationFn: (data: { nome: string; percentualComissao: string }) =>
      apiRequest("POST", "/api/conferencia/professores", { ...data, periodo }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profQueryKey });
      qc.invalidateQueries({ queryKey: ["/api/conferencia/periodos-professores"] });
      setNovoProfNome("");
      setNovoProfPct("0");
      toast({ title: "Professor adicionado!" });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao adicionar professor",
        description: err.message,
        variant: "destructive",
      }),
  });

  const editProfMutation = useMutation({
    mutationFn: ({
      id,
      nome,
      percentualComissao,
    }: {
      id: string;
      nome: string;
      percentualComissao: string;
    }) =>
      apiRequest("PUT", `/api/conferencia/professores/${id}`, {
        nome,
        percentualComissao,
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profQueryKey });
      setEditingProf(null);
      toast({ title: "Professor atualizado!" });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao editar professor",
        description: err.message,
        variant: "destructive",
      }),
  });

  const delProfMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/conferencia/professores/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profQueryKey });
      qc.invalidateQueries({ queryKey: ["/api/conferencia/periodos-professores"] });
      toast({ title: "Professor removido" });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao remover professor",
        description: err.message,
        variant: "destructive",
      }),
  });

  const addAlunosLoteMutation = useMutation({
    mutationFn: ({ profId, nomes }: { profId: string; nomes: string[] }) =>
      apiRequest("POST", `/api/conferencia/professores/${profId}/alunos/lote`, { nomes }).then(
        (r) => r.json()
      ),
    onSuccess: (data: { adicionados: number; ignorados?: number }, vars) => {
      qc.invalidateQueries({ queryKey: profQueryKey });
      setListaTexto((prev) => ({ ...prev, [vars.profId]: "" }));
      const ignorados = data.ignorados ?? 0;
      const desc = ignorados > 0 ? `${ignorados} já existia${ignorados !== 1 ? "m" : ""} e foi${ignorados !== 1 ? "ram" : ""} ignorado${ignorados !== 1 ? "s" : ""}` : undefined;
      toast({ title: `${data.adicionados} aluno${data.adicionados !== 1 ? "s" : ""} adicionado${data.adicionados !== 1 ? "s" : ""}!`, description: desc });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao adicionar alunos",
        description: err.message,
        variant: "destructive",
      }),
  });

  const delAlunoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/conferencia/professor-alunos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profQueryKey });
      // Mensalista alunos also have registros — invalidate related caches
      qc.invalidateQueries({ queryKey: ["/api/conferencia/mensalistas-card", periodo] });
      qc.invalidateQueries({ queryKey: ["/api/conferencia/arena-relatorio", periodo] });
      qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao remover aluno",
        description: err.message,
        variant: "destructive",
      }),
  });

  const handleAddProf = () => {
    const nome = novoProfNome.trim();
    if (!nome) return;
    addProfMutation.mutate({ nome, percentualComissao: novoProfPct });
  };

  const [expandedProf, setExpandedProf] = useState<Set<string>>(new Set());
  const [expandedSubSection, setExpandedSubSection] = useState<string | null>(null);

  const toggleProf = (id: string) => {
    setExpandedProf((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setExpandedSubSection(null); }
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">

      {/* ── Header + inline add form ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">Professores da Conferência</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure os professores e vincule os alunos de cada um para o cruzamento automático.
          </p>
        </div>
      </div>

      {/* ── Add-professor inline form ──────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Nome</p>
              <Input
                placeholder="Nome do professor…"
                value={novoProfNome}
                onChange={(e) => setNovoProfNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddProf()}
                data-testid="input-novo-prof-nome"
              />
            </div>
            <div className="w-36">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">% Comissão</p>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={novoProfPct}
                  onChange={(e) => setNovoProfPct(e.target.value)}
                  className="pr-7"
                  data-testid="input-novo-prof-pct"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
              </div>
            </div>
            <Button
              onClick={handleAddProf}
              disabled={!novoProfNome.trim() || addProfMutation.isPending}
              className="shrink-0"
              data-testid="button-add-professor"
            >
              {addProfMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Adicionar Professor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Professor table / list ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" /> Carregando professores…
        </div>
      ) : professores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-xl">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Nenhum professor cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Use o formulário acima para adicionar o primeiro professor.</p>
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {professores.map((prof) => {
              const isEditing = editingProf === prof.id;
              const isExpanded = expandedProf.has(prof.id);
              const pctNum = parseFloat(prof.percentualComissao || "0");
              return (
                <div key={prof.id} data-testid={`card-prof-${prof.id}`}>
                  {/* ── Row ── */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 select-none">
                      {initials(prof.nome)}
                    </div>

                    {/* Name / edit inline */}
                    {isEditing ? (
                      <div className="flex-1 flex gap-2 items-center flex-wrap">
                        <Input
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          className="flex-1 min-w-[150px] h-8 text-sm"
                          autoFocus
                          data-testid={`input-edit-prof-nome-${prof.id}`}
                        />
                        <div className="relative w-24">
                          <Input
                            type="number"
                            value={editPct}
                            onChange={(e) => setEditPct(e.target.value)}
                            className="h-8 text-sm pr-6"
                            placeholder="0"
                            data-testid={`input-edit-prof-pct-${prof.id}`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                        </div>
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => editProfMutation.mutate({ id: prof.id, nome: editNome, percentualComissao: editPct })}
                          disabled={editProfMutation.isPending}
                          data-testid={`button-save-prof-${prof.id}`}
                        >
                          {editProfMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Salvar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingProf(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 grid items-center min-w-0" style={{ gridTemplateColumns: "1fr 130px 80px" }}>
                        <span className="font-medium text-sm text-foreground truncate pr-3">{prof.nome}</span>
                        <div className="flex justify-start">
                          <Badge
                            variant={pctNum > 0 ? "default" : "secondary"}
                            className="text-xs tabular-nums"
                          >
                            {pctNum > 0 ? `${pctNum}% comissão` : "Sem comissão"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {prof.alunos.length} aluno{prof.alunos.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        {sessaoIds.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => handleComprovanteConsolidado(prof)}
                            disabled={comprovanteLoading === prof.id}
                            data-testid={`button-comprovante-consolidado-${prof.id}`}
                          >
                            {comprovanteLoading === prof.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Printer className="h-3 w-3" />
                            )}
                            Comprovante
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleProf(prof.id)}
                          data-testid={`button-expand-prof-${prof.id}`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          Alunos
                          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingProf(prof.id); setEditNome(prof.nome); setEditPct(prof.percentualComissao); }}
                          data-testid={`button-edit-prof-${prof.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => delProfMutation.mutate(prof.id)}
                          disabled={delProfMutation.isPending}
                          data-testid={`button-del-prof-${prof.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* ── Expanded: student management ── */}
                  {isExpanded && (() => {
                    const platAlunos = prof.alunos.filter((a) => a.tipo !== "mensalista");
                    const mensAlunos = prof.alunos.filter((a) => a.tipo === "mensalista");
                    const platKey = `plat-${prof.id}`;
                    const mensKey = `mens-${prof.id}`;
                    return (
                    <div className="border-t bg-muted/30 px-4 py-4 space-y-4">

                      {/* ── Plataforma alunos ── */}
                      <div className="space-y-2">
                        <button
                          onClick={() => setExpandedSubSection((prev) => prev === platKey ? null : platKey)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`toggle-plataforma-${prof.id}`}
                        >
                          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedSubSection === platKey && "rotate-90")} />
                          Alunos Plataforma
                          <span className="ml-1 text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded-full">
                            {platAlunos.length}
                          </span>
                        </button>
                        {expandedSubSection === platKey && (
                          <div className="flex flex-wrap gap-1.5 pl-5">
                            {platAlunos.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Nenhum aluno de plataforma</p>
                            ) : platAlunos.map((a) => (
                              <div
                                key={a.id}
                                className="flex items-center gap-1 bg-background border rounded-full pl-3 pr-1.5 py-0.5 text-xs shadow-sm"
                                data-testid={`tag-aluno-${a.id}`}
                              >
                                <span className="text-foreground">{a.nome}</span>
                                <button
                                  onClick={() => delAlunoMutation.mutate(a.id)}
                                  className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                  data-testid={`button-del-aluno-${a.id}`}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ── Mensalistas ── */}
                      <div className="space-y-2">
                        <button
                          onClick={() => setExpandedSubSection((prev) => prev === mensKey ? null : mensKey)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`toggle-mensalistas-${prof.id}`}
                        >
                          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedSubSection === mensKey && "rotate-90")} />
                          Mensalistas
                          <span className="ml-1 text-[10px] font-normal bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0.5 rounded-full">
                            {mensAlunos.length}
                          </span>
                        </button>
                        {expandedSubSection === mensKey && (
                          <div className="flex flex-wrap gap-1.5 pl-5">
                            {mensAlunos.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">Nenhum mensalista cadastrado</p>
                            ) : mensAlunos.map((a) => (
                              <div
                                key={a.id}
                                className="flex items-center gap-1 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-full pl-3 pr-1.5 py-0.5 text-xs shadow-sm"
                                data-testid={`tag-mensalista-${a.id}`}
                              >
                                <span className="text-violet-700 dark:text-violet-300">{a.nome}</span>
                                <button
                                  onClick={() => delAlunoMutation.mutate(a.id)}
                                  className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-destructive/20 text-violet-400 hover:text-destructive transition-colors"
                                  title="Remover mensalista (também remove o registro financeiro)"
                                  data-testid={`button-del-mensalista-${a.id}`}
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add students — textarea accepts one or many names */}
                      {(() => {
                        const nomes = (listaTexto[prof.id] ?? "").split("\n").map((n) => n.trim()).filter(Boolean);
                        return (
                          <div className="space-y-2">
                            <textarea
                              placeholder={"Nome como aparece no Excel (um por linha):\n\nJoão da Silva\nMaria Souza\nPedro Alves\n…"}
                              value={listaTexto[prof.id] ?? ""}
                              onChange={(e) => setListaTexto((prev) => ({ ...prev, [prof.id]: e.target.value }))}
                              rows={4}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                              data-testid={`textarea-lista-alunos-${prof.id}`}
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {nomes.length > 0 ? `${nomes.length} nome${nomes.length !== 1 ? "s" : ""} detectado${nomes.length !== 1 ? "s" : ""}` : "Um nome por linha"}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => nomes.length > 0 && addAlunosLoteMutation.mutate({ profId: prof.id, nomes })}
                                disabled={nomes.length === 0 || addAlunosLoteMutation.isPending}
                                data-testid={`button-add-lote-${prof.id}`}
                              >
                                {addAlunosLoteMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                                Adicionar {nomes.length > 1 ? `${nomes.length} alunos` : "aluno"}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                  })()}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Session Detail View ────────────────────────────────────────────────────────

function SessaoView({
  sessaoId,
  arenaId,
  onVoltar,
}: {
  sessaoId: string;
  arenaId: string;
  onVoltar: () => void;
}) {
  const [tab, setTab] = useState<"conferencia" | "relatorio">("conferencia");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroProfessor, setFiltroProfessor] = useState("");
  const [buscaNome, setBuscaNome] = useState("");
  const [linkDialog, setLinkDialog] = useState<Registro | null>(null);
  const [destinarPara, setDestinarPara] = useState("");
  const [redirectModalidade, setRedirectModalidade] = useState("");
  const [redirectAProf, setRedirectAProf] = useState("");
  const [showArenaList, setShowArenaList] = useState(false);
  const [manuallyLinked, setManuallyLinked] = useState<Set<string>>(new Set());
  const [histPast, setHistPast] = useState<Array<{ id: string; snap: Record<string, unknown> }>>([]);
  const [histFuture, setHistFuture] = useState<Array<{ id: string; snap: Record<string, unknown> }>>([]);
  const prevProfTotal = useRef(-1);
  const { toast } = useToast();
  const qc = useQueryClient();


  const { data: sessao, isLoading } = useQuery<SessaoDetalhe>({
    queryKey: ["/api/conferencia/sessao", sessaoId],
    queryFn: async () => {
      const res = await fetch(`/api/conferencia/sessao/${sessaoId}`);
      if (!res.ok) throw new Error("Erro ao carregar sessão");
      return res.json();
    },
  });

  const periodo = sessao?.periodoInicio ? sessao.periodoInicio.substring(0, 7) : undefined;

  const { data: confsProfs = [] } = useQuery<ConfProfessor[]>({
    queryKey: ["/api/conferencia/professores", periodo],
    queryFn: () =>
      fetch(`/api/conferencia/professores${periodo ? `?periodo=${periodo}` : ""}`).then((r) =>
        r.json()
      ),
    enabled: !!sessao,
  });

  const rematchMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/conferencia/sessao/${sessaoId}/rematch`).then((r) => r.json()),
    onSuccess: (result: { updated: number; dayuseDetected: number; encontrados: number; possiveis: number; naoEncontrados: number }) => {
      qc.invalidateQueries({ queryKey: ["/api/conferencia/sessao", sessaoId] });
      const msg = result.updated === 0
        ? "Nenhum registro pendente para atualizar"
        : `${result.updated} registro${result.updated !== 1 ? "s" : ""} atualizado${result.updated !== 1 ? "s" : ""}${result.dayuseDetected > 0 ? ` · ${result.dayuseDetected} day use detectado${result.dayuseDetected !== 1 ? "s" : ""}` : ""}`;
      toast({ title: "Conferência atualizada", description: msg });
    },
    onError: (err: unknown) => {
      const isAuth = err instanceof Error && err.message.includes("403");
      toast({
        title: isAuth ? "Sessão expirada" : "Erro ao atualizar",
        description: isAuth ? "Faça login novamente para continuar." : undefined,
        variant: "destructive",
      });
    },
  });

  // Link multiple records with the same nomePlataforma at once (full refresh)
  const linkProfMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/conferencia/registro/${id}`, data).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/conferencia/sessao", sessaoId] });
    },
    onError: () => toast({ title: "Erro ao vincular", variant: "destructive" }),
  });

  // Auto-rematch whenever professors or students change (add OR remove)
  useEffect(() => {
    const total = confsProfs.reduce((s, p) => s + p.alunos.length, 0) + confsProfs.length;
    if (prevProfTotal.current >= 0 && total !== prevProfTotal.current && sessao && !rematchMutation.isPending) {
      rematchMutation.mutate();
    }
    prevProfTotal.current = total;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confsProfs]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/conferencia/registro/${id}`, data).then((r) => r.json()),
    onSuccess: (updated: Registro) => {
      qc.setQueryData<SessaoDetalhe>(["/api/conferencia/sessao", sessaoId], (old) => {
        if (!old) return old;
        const newRegs = old.registros.map((r) =>
          r.id === updated.id
            ? { ...updated, professorNome: confsProfs.find((p) => p.id === updated.professorId)?.nome ?? r.professorNome }
            : r
        );
        return {
          ...old,
          encontrados: newRegs.filter((r) => r.status === "confirmado").length,
          possiveis: newRegs.filter((r) => r.status === "pendente").length,
          naoEncontrados: newRegs.filter((r) => r.status === "nao_encontrado").length,
          registros: newRegs,
        };
      });
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });


  if (isLoading || !sessao) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }

  const registros = sessao.registros ?? [];

  const filteredProfs = Array.from(
    new Map(registros.filter((r) => r.professorNome).map((r) => [r.professorId, r.professorNome])).entries()
  ).map(([id, nome]) => ({ id: id!, nome: nome! }));

  const filtered = registros
    .filter((r) => {
      if (filtroStatus && r.status !== filtroStatus) return false;
      if (filtroProfessor && r.professorId !== filtroProfessor) return false;
      if (buscaNome && !r.nomePlataforma.toLowerCase().includes(buscaNome.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const nc = a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR");
      if (nc !== 0) return nc;
      return parseDataSort(a.data).localeCompare(parseDataSort(b.data));
    });

  const confirmedValor = registros.filter((r) => r.status === "confirmado").reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const pendenteValor = registros.filter((r) => r.status === "pendente").reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const naoEncontradoValor = registros.filter((r) => r.status === "nao_encontrado").reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalValor = confirmedValor + pendenteValor + naoEncontradoValor;
  const naoEncontradosCount = registros.filter((r) => r.status === "nao_encontrado").length;

  // Arena = valor - valorProfessor (o que sobra após comissão do professor)
  const calcDisplayValores = (r: Registro) => {
    const v = parseFloat(r.valor || "0");
    const vProf = parseFloat(r.valorProfessor || "0");
    const vArena = Math.max(0, v - vProf);
    return { vArena };
  };

  const confirmedRegs = registros.filter((r) => r.status === "confirmado");
  const totalProfessorAgg = confirmedRegs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const totalArenaDisplay = confirmedRegs.reduce((s, r) => s + calcDisplayValores(r).vArena, 0);

  const snapReg = (r: Registro) => ({
    status: r.status,
    studentId: r.studentId,
    professorId: r.professorId,
    percentual: r.percentual,
    categoria: r.categoria,
    alunoNomeMatch: r.alunoNomeMatch,
    valorProfessor: r.valorProfessor,
    valorArena: r.valorArena,
  });

  const doUpdate = (id: string, data: Record<string, unknown>) => {
    const cur = registros.find(r => r.id === id);
    if (cur) {
      setHistPast(prev => [...prev.slice(-49), { id, snap: snapReg(cur) }]);
      setHistFuture([]);
    }
    updateMutation.mutate({ id, data });
  };

  const handleUndo = () => {
    const last = histPast.at(-1);
    if (!last) return;
    const cur = registros.find(r => r.id === last.id);
    if (cur) setHistFuture(prev => [...prev, { id: last.id, snap: snapReg(cur) }]);
    setHistPast(prev => prev.slice(0, -1));
    updateMutation.mutate({ id: last.id, data: last.snap });
  };

  const handleRedo = () => {
    const nxt = histFuture.at(-1);
    if (!nxt) return;
    const cur = registros.find(r => r.id === nxt.id);
    if (cur) setHistPast(prev => [...prev, { id: nxt.id, snap: snapReg(cur) }]);
    setHistFuture(prev => prev.slice(0, -1));
    updateMutation.mutate({ id: nxt.id, data: nxt.snap });
  };

  const handleConfirmar = (r: Registro) => {
    doUpdate(r.id, { status: "confirmado", salvarAlias: true });
  };

  const handleIgnorar = (r: Registro) => {
    doUpdate(r.id, { status: "ignorado" });
  };

  const handleDestinar = (registroId: string, professorId: string | null) => {
    const prof = confsProfs.find((p) => p.id === professorId);
    const percentual = prof?.percentualComissao ?? "0";
    const categoria = parseFloat(percentual) > 0 ? "comissao" : "arena";
    doUpdate(registroId, { professorId, percentual, status: "confirmado", categoria });
  };

  const handleBulkDestinar = () => {
    if (!destinarPara) return;
    const naoEnc = registros.filter((r) => r.status === "nao_encontrado");
    const professorId = destinarPara === "arena" ? null : destinarPara;
    const prof = confsProfs.find((p) => p.id === professorId);
    const percentual = prof?.percentualComissao ?? "0";
    const categoria = parseFloat(percentual) > 0 ? "comissao" : "arena";
    naoEnc.forEach((r) => {
      updateMutation.mutate({ id: r.id, data: { professorId, percentual, status: "confirmado", categoria } });
    });
    toast({ title: `${naoEnc.length} registro${naoEnc.length !== 1 ? "s" : ""} confirmado${naoEnc.length !== 1 ? "s" : ""} e destinado${naoEnc.length !== 1 ? "s" : ""}` });
  };

  const arenaRecords = registros.filter(
    (r) => r.status === "confirmado" && r.categoria === "arena" && !r.professorId
  );
  const arenaModalidades = Array.from(new Set(arenaRecords.map((r) => r.modalidade).filter(Boolean))) as string[];

  const handleBulkRedirectArena = () => {
    if (!redirectAProf) return;
    const toRedirect = redirectModalidade && redirectModalidade !== "__todos__"
      ? arenaRecords.filter((r) => r.modalidade === redirectModalidade)
      : arenaRecords;
    if (toRedirect.length === 0) return;
    const professorId = redirectAProf;
    const prof = confsProfs.find((p) => p.id === professorId);
    const percentual = prof?.percentualComissao ?? "0";
    const categoria = parseFloat(percentual) > 0 ? "comissao" : "arena";
    toRedirect.forEach((r) => {
      updateMutation.mutate({ id: r.id, data: { professorId, percentual, categoria } });
    });
    toast({ title: `${toRedirect.length} registro${toRedirect.length !== 1 ? "s" : ""} redirecionado${toRedirect.length !== 1 ? "s" : ""} para ${prof?.nome ?? "professor"}` });
    setRedirectModalidade("");
    setRedirectAProf("");
  };

  const handleExportCSV = () => {
    const w = window.open(`/api/conferencia/export/${sessaoId}`, "_blank");
    if (!w) window.location.href = `/api/conferencia/export/${sessaoId}`;
  };
  const handleExportPDF = () => exportToPDF(sessao);

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-base sm:text-lg truncate">{sessao.nomeArquivo}</h1>
            <Badge variant="secondary" className="text-xs shrink-0">{plataformaLabel(sessao.plataforma)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(sessao.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            {" · "}{sessao.totalRegistros} registros
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs" data-testid="button-export-pdf">
            <Printer className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => rematchMutation.mutate()}
            disabled={rematchMutation.isPending}
            className="gap-1.5 text-xs"
            data-testid="button-rematch"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", rematchMutation.isPending && "animate-spin")} />
            {rematchMutation.isPending ? "Atualizando…" : "Atualizar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={histPast.length === 0 || updateMutation.isPending}
            className="h-8 w-8 p-0"
            title="Desfazer última ação"
            data-testid="button-undo"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={histFuture.length === 0 || updateMutation.isPending}
            className="h-8 w-8 p-0"
            title="Refazer"
            data-testid="button-redo"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-px -m-px overflow-visible">
        <Card
          className={cn("border shadow-none bg-muted/30 cursor-pointer transition-all hover:shadow-sm select-none", filtroStatus === "" && "ring-2 ring-primary/50")}
          onClick={() => setFiltroStatus("")}
          data-testid="kpi-total"
        >
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Total planilha</p>
            <p className="text-lg font-bold text-foreground leading-none">{fmtVal(String(totalValor))}</p>
            <p className="text-xs text-muted-foreground mt-1">{sessao.totalRegistros} registros</p>
          </CardContent>
        </Card>
        <Card
          className={cn("border shadow-none bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40 cursor-pointer transition-all hover:shadow-sm select-none", filtroStatus === "confirmado" && "ring-2 ring-emerald-500/60")}
          onClick={() => setFiltroStatus(filtroStatus === "confirmado" ? "" : "confirmado")}
          data-testid="kpi-confirmados"
        >
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Confirmados</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-none">{sessao.encontrados}</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-1">{fmtVal(String(confirmedValor))}</p>
          </CardContent>
        </Card>
        <Card
          className={cn("border shadow-none bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/40 cursor-pointer transition-all hover:shadow-sm select-none", filtroStatus === "pendente" && "ring-2 ring-amber-500/60")}
          onClick={() => setFiltroStatus(filtroStatus === "pendente" ? "" : "pendente")}
          data-testid="kpi-possiveis"
        >
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5">Possíveis</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 leading-none">{sessao.possiveis}</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">{fmtVal(String(pendenteValor))}</p>
          </CardContent>
        </Card>
        <Card
          className={cn("border shadow-none cursor-pointer transition-all hover:shadow-sm select-none", naoEncontradosCount > 0 ? "bg-red-50/60 dark:bg-red-950/30 border-red-200/70 dark:border-red-800/40" : "bg-muted/30", filtroStatus === "nao_encontrado" && "ring-2 ring-red-500/60")}
          onClick={() => setFiltroStatus(filtroStatus === "nao_encontrado" ? "" : "nao_encontrado")}
          data-testid="kpi-nao-encontrados"
        >
          <CardContent className="p-4">
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1.5", naoEncontradosCount > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>Não encontrados</p>
            <p className={cn("text-lg font-bold leading-none", naoEncontradosCount > 0 ? "text-red-700 dark:text-red-400" : "text-foreground")}>{sessao.naoEncontrados}</p>
            <p className={cn("text-xs mt-1", naoEncontradosCount > 0 ? "text-red-600/80 dark:text-red-500/80" : "text-muted-foreground")}>{fmtVal(String(naoEncontradoValor))}</p>
          </CardContent>
        </Card>
      </div>


      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b">
        {(["conferencia", "relatorio"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-${t}`}
          >
            {t === "conferencia" ? "Conferência" : "Relatório por Professor"}
          </button>
        ))}
      </div>

      {/* ── Conferência Tab ── */}
      {tab === "conferencia" && (
        <div className="space-y-3">

          {/* Bulk destinar bar — não encontrados */}
          {naoEncontradosCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300 flex-1 min-w-0">
                <strong>{naoEncontradosCount}</strong> sem correspondência — destinar receita para:
              </p>
              <Select value={destinarPara} onValueChange={setDestinarPara}>
                <SelectTrigger className="h-8 w-52 text-xs bg-white dark:bg-background" data-testid="select-destinar-bulk">
                  <SelectValue placeholder="Selecionar destino…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arena">Arena (sem comissão)</SelectItem>
                  {confsProfs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}{parseFloat(p.percentualComissao) > 0 ? ` (${p.percentualComissao}%)` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkDestinar} disabled={!destinarPara || updateMutation.isPending} data-testid="button-bulk-destinar">
                Aplicar a todos
              </Button>
            </div>
          )}

          {/* Bulk redirecionar bar — registros de arena sem professor */}
          {arenaRecords.length > 0 && confsProfs.length > 0 && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap p-3">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-300 flex-1 min-w-0">
                  <strong>{arenaRecords.length}</strong> registro{arenaRecords.length !== 1 ? "s" : ""} sem professor — redirecionar para:
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 shrink-0"
                  onClick={() => setShowArenaList((v) => !v)}
                  data-testid="button-toggle-arena-list"
                >
                  {showArenaList ? "Ocultar lista" : "Ver alunos"}
                </Button>
                {arenaModalidades.length > 1 && (
                  <Select value={redirectModalidade} onValueChange={setRedirectModalidade} data-testid="select-redirect-modalidade">
                    <SelectTrigger className="h-8 w-52 text-xs bg-white dark:bg-background">
                      <SelectValue placeholder="Todas as modalidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__todos__">Todas as modalidades ({arenaRecords.length})</SelectItem>
                      {arenaModalidades.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m} ({arenaRecords.filter((r) => r.modalidade === m).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={redirectAProf} onValueChange={setRedirectAProf} data-testid="select-redirect-prof">
                  <SelectTrigger className="h-8 w-44 text-xs bg-white dark:bg-background">
                    <SelectValue placeholder="Selecionar professor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {confsProfs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}{parseFloat(p.percentualComissao) > 0 ? ` (${p.percentualComissao}%)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleBulkRedirectArena} disabled={!redirectAProf || updateMutation.isPending} data-testid="button-bulk-redirect-arena">
                  Redirecionar
                </Button>
              </div>

              {/* Expandable student list */}
              {showArenaList && (
                <div className="border-t border-blue-200 dark:border-blue-800/60 bg-white/60 dark:bg-blue-950/20 px-3 py-2 max-h-56 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5">
                    {(() => {
                      const listRecords = redirectModalidade && redirectModalidade !== "__todos__"
                        ? arenaRecords.filter((r) => r.modalidade === redirectModalidade)
                        : arenaRecords;
                      return [...listRecords]
                        .sort((a, b) => (a.alunoNomeMatch ?? a.nomePlataforma).localeCompare(b.alunoNomeMatch ?? b.nomePlataforma, "pt-BR"))
                        .map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-2 py-1 border-b border-blue-100 dark:border-blue-900/40 last:border-0">
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-foreground truncate block">
                                {r.alunoNomeMatch ?? r.nomePlataforma}
                              </span>
                              {r.alunoNomeMatch && r.alunoNomeMatch !== r.nomePlataforma && (
                                <span className="text-[10px] text-muted-foreground truncate block">
                                  {r.nomePlataforma}
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs tabular-nums font-mono text-foreground">{fmtVal(r.valor)}</span>
                              {r.modalidade && (
                                <span className="block text-[10px] text-muted-foreground">{r.modalidade}</span>
                              )}
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar nome…"
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                className="pl-8 h-8 text-sm"
                data-testid="input-busca-nome"
              />
            </div>
            {filteredProfs.length > 0 && (
              <Select value={filtroProfessor} onValueChange={(v) => setFiltroProfessor(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm w-40" data-testid="select-filtro-professor">
                  <SelectValue placeholder="Professores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os professores</SelectItem>
                  {filteredProfs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} de {registros.length}
            </span>
          </div>

          {/* Record list */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
              Nenhum registro encontrado para os filtros selecionados
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((r) => {
                const si = statusInfo(r.status);
                const hasSplit = parseFloat(r.percentual) > 0 && parseFloat(r.valorProfessor) > 0;
                const { vArena } = calcDisplayValores(r);
                const profNome = r.professorNome ?? confsProfs.find((p) => p.id === r.professorId)?.nome ?? null;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "group rounded-lg border bg-card flex items-stretch overflow-hidden transition-shadow hover:shadow-sm",
                      r.status === "confirmado" && "border-emerald-200 dark:border-emerald-800/50",
                      r.status === "pendente" && "border-amber-200 dark:border-amber-800/50",
                      r.status === "nao_encontrado" && "border-red-200 dark:border-red-800/50",
                      r.status === "ignorado" && "opacity-50 border-border"
                    )}
                    data-testid={`row-registro-${r.id}`}
                  >
                    {/* Color strip */}
                    <div className={cn("w-1 shrink-0", si.dot)} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0 p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* ── Nome na plataforma + badges ── */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {r.nomePlataforma}
                          </span>
                          {r.categoria === "mensalista" && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shrink-0">
                              Mensalista
                            </Badge>
                          )}
                          {r.modalidade && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal shrink-0">
                              {r.modalidade}
                            </Badge>
                          )}
                          {r.similaridade != null && r.categoria !== "mensalista" && r.status !== "nao_encontrado" && r.status !== "ignorado" && (
                            <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                              {r.similaridade}%
                            </span>
                          )}
                        </div>

                        {/* ── Aluno correspondido + professor + check-ins ── */}
                        {r.alunoNomeMatch && (
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">→</span>
                            <span className="text-xs font-medium text-foreground">{r.alunoNomeMatch}</span>
                            {profNome && (
                              <span className="text-xs font-medium text-primary">· {profNome}</span>
                            )}
                            {parseFloat(r.percentual) > 0 && (
                              <span className="text-[11px] text-muted-foreground">({r.percentual}%)</span>
                            )}
                            {r.checkins > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                · {r.checkins} check-in{r.checkins !== 1 ? "s" : ""}
                              </span>
                            )}
                            {r.categoria === "dayuse" && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
                                Day Use
                              </Badge>
                            )}
                            {manuallyLinked.has(r.id) && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0 gap-0.5">
                                <Link2 className="h-2.5 w-2.5" />
                                Vinculado
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* ── Data e horário ── */}
                        {r.data && r.data !== "undefined" && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CalendarDays className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span className="text-[11px] text-muted-foreground tabular-nums">{fmtData(r.data)}</span>
                          </div>
                        )}

                        {/* ── Destinar / Realocar inline ── */}
                        {(r.status === "nao_encontrado" || r.status === "confirmado") && confsProfs.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {r.status === "confirmado" ? "Realocar para:" : "Destinar para:"}
                            </span>
                            <Select
                              value={r.professorId ?? "arena"}
                              onValueChange={(v) => handleDestinar(r.id, v === "arena" ? null : v)}
                            >
                              <SelectTrigger className="h-6 text-xs w-44 py-0" data-testid={`select-destinar-${r.id}`}>
                                <SelectValue placeholder="Professor ou arena…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="arena">
                                  Arena {!r.professorId && r.status === "confirmado" ? "(atual)" : "(sem comissão)"}
                                </SelectItem>
                                {confsProfs.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.nome}{parseFloat(p.percentualComissao) > 0 ? ` (${p.percentualComissao}%)` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* ── Value block ── */}
                      <div className="text-right shrink-0 min-w-[90px]">
                        <p className="font-bold text-sm tabular-nums">{fmtVal(r.valor)}</p>
                        {hasSplit ? (
                          <div className="mt-0.5 space-y-px">
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                              Prof: {fmtVal(r.valorProfessor)}
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 tabular-nums">
                              Arena: {fmtVal(String(vArena))}
                            </div>
                          </div>
                        ) : r.status !== "ignorado" ? (
                          <div className="mt-0.5 space-y-px">
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 tabular-nums">
                              Arena: {fmtVal(String(vArena))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Right action panel */}
                    <div className="flex flex-col items-center justify-center gap-1 px-2.5 min-w-[88px] border-l border-border/60 bg-muted/10 shrink-0">
                      <span className={cn("text-[11px] font-semibold text-center leading-tight", si.color)}>
                        {si.label}
                      </span>
                      {r.status === "pendente" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 w-full"
                            onClick={() => handleConfirmar(r)}
                            data-testid={`button-confirmar-${r.id}`}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs w-full"
                            onClick={() => setLinkDialog(r)}
                            data-testid={`button-alterar-${r.id}`}
                          >
                            Alterar
                          </Button>
                        </>
                      )}
                      {r.status === "nao_encontrado" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs w-full"
                          onClick={() => setLinkDialog(r)}
                          data-testid={`button-vincular-${r.id}`}
                        >
                          Vincular
                        </Button>
                      )}
                      {r.status === "confirmado" && manuallyLinked.has(r.id) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs w-full"
                          onClick={() => setLinkDialog(r)}
                          data-testid={`button-editar-vinculo-${r.id}`}
                        >
                          Editar
                        </Button>
                      )}
                      {(r.status === "pendente" || r.status === "nao_encontrado") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleIgnorar(r)}
                          data-testid={`button-ignorar-${r.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Relatório Tab ── */}
      {tab === "relatorio" && <RelatorioView registros={registros} plataforma={sessao.plataforma} sessao={sessao} sessaoId={sessaoId} arenaId={arenaId} periodo={periodo} confsProfs={confsProfs} />}


      {linkDialog && (
        <LinkAlunoDialog
          key={linkDialog.id}
          registro={linkDialog}
          confsProfs={confsProfs}
          onConfirmProf={(professorId) => {
            const prof = confsProfs.find(p => p.id === professorId);
            const percentual = prof?.percentualComissao ?? "0";
            const pct = parseFloat(percentual);
            linkProfMutation.mutate({
              id: linkDialog.id,
              data: {
                professorId,
                percentual,
                status: "confirmado",
                categoria: pct > 0 ? "comissao" : "arena",
                alunoNomeMatch: linkDialog.nomePlataforma,
                vincularTodos: true,
              },
            });
            setManuallyLinked(prev => new Set([...prev, linkDialog.id]));
            setLinkDialog(null);
          }}
          onConfirmStudent={(confAlunoId, salvarAlias) => {
            doUpdate(linkDialog.id, { studentId: confAlunoId, status: "confirmado", salvarAlias, vincularTodos: true });
            setManuallyLinked(prev => new Set([...prev, linkDialog.id]));
            setLinkDialog(null);
          }}
          onClose={() => setLinkDialog(null)}
        />
      )}
    </div>
  );
}

// ── Relatório Tab ─────────────────────────────────────────────────────────────

function RelatorioView({
  registros,
  plataforma,
  sessao,
  sessaoId,
  arenaId,
  periodo,
}: {
  registros: Registro[];
  plataforma: string;
  sessao: SessaoDetalhe;
  sessaoId: string;
  arenaId: string;
  periodo: string | undefined;
  confsProfs: ConfProfessor[];
}) {
  const { data: repasseCfg } = useQuery<RepasseConfig>({
    queryKey: ["/api/conferencia/repasse-config", periodo],
    queryFn: () => fetch(`/api/conferencia/repasse-config?periodo=${periodo}`).then((r) => r.json()),
    enabled: !!periodo,
  });

  // Arena = valor - valorProfessor (o que sobra após comissão do professor)
  const arenaRow = (r: Registro) => Math.max(0, parseFloat(r.valor || "0") - parseFloat(r.valorProfessor || "0"));
  const arenaSum = (regs: Registro[]) => regs.reduce((s, r) => s + arenaRow(r), 0);

  // Platform records only — mensalistas are excluded from platform totals
  const confirmados = registros.filter((r) => r.status === "confirmado" && r.categoria !== "mensalista");
  const totalRecebido = confirmados.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalProfessores = confirmados.reduce(
    (s, r) => s + parseFloat(r.valorProfessor || "0"),
    0
  );
  const totalArena = Math.max(0, totalRecebido - totalProfessores);
  const totalCheckins = confirmados.reduce((s, r) => s + (r.checkins ?? 1), 0);
  const naoEncontrados = registros.filter((r) => r.status === "nao_encontrado");

  // byProf includes mensalistas so they show up on the professor's card
  const allConfirmados = registros.filter((r) => r.status === "confirmado");
  const byProf = new Map<string, { nome: string; registros: Registro[] }>();
  for (const r of allConfirmados) {
    const key = r.professorId ?? "__arena__";
    if (!byProf.has(key)) {
      byProf.set(key, {
        nome: r.professorNome ?? "Arena (sem professor)",
        registros: [],
      });
    }
    byProf.get(key)!.registros.push(r);
  }

  const profGroups = Array.from(byProf.entries()).sort((a, b) =>
    a[1].nome.localeCompare(b[1].nome)
  );

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Recebido",
            val: fmtVal(String(totalRecebido)),
            icon: TrendingUp,
            color: "text-primary",
            sub: null,
          },
          {
            label: "Valor Arena",
            val: fmtVal(String(totalArena)),
            icon: Building2,
            color: "text-blue-600 dark:text-blue-400",
            sub: totalRecebido > 0 ? `${Math.round(totalArena / totalRecebido * 100)}% do total` : null,
          },
          {
            label: "Comissões Prof.",
            val: fmtVal(String(totalProfessores)),
            icon: Users,
            color: "text-emerald-600 dark:text-emerald-400",
            sub: totalRecebido > 0 ? `${Math.round(totalProfessores / totalRecebido * 100)}% do total` : null,
          },
          {
            label: "Total Check-ins",
            val: String(totalCheckins),
            icon: CheckCircle,
            color: "text-amber-600 dark:text-amber-400",
            sub: null,
          },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <c.icon className={cn("h-5 w-5 shrink-0", c.color)} />
              <div>
                <div className={cn("text-base font-bold leading-none", c.color)}>{c.val}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
                {c.sub && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{c.sub}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Breakdown by professor */}
      {profGroups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Breakdown por Professor
          </h2>
          {profGroups.map(([key, g]) => {
            const regulares = g.registros.filter((r) => r.categoria === "comissao");
            const mensalistas = g.registros.filter((r) => r.categoria === "mensalista");
            const atribuidos = g.registros.filter((r) => r.categoria !== "comissao" && r.categoria !== "mensalista");

            // Platform-only totals (mensalistas shown separately)
            const platRegs = g.registros.filter((r) => r.categoria !== "mensalista");
            const subtotal = platRegs.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
            const comissao = platRegs.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
            const arena = arenaSum(platRegs);
            const chks = platRegs.reduce((s, r) => s + (r.checkins ?? 1), 0);
            const pct = platRegs[0]?.percentual ?? mensalistas[0]?.percentual ?? "0";

            const renderLinhas = (rows: Registro[]) =>
              [...rows]
                .sort((a, b) => {
                  const nc = a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR");
                  return nc !== 0 ? nc : parseDataSort(a.data).localeCompare(parseDataSort(b.data));
                })
                .map((r) => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell className="py-2 font-medium max-w-[160px]">
                      <span className="block truncate" title={r.nomePlataforma}>{r.nomePlataforma}</span>
                    </TableCell>
                    <TableCell className="py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                      {fmtData(r.data)}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono tabular-nums">
                      {fmtVal(r.valor)}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmtVal(r.valorProfessor)}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      {fmtVal(String(arenaRow(r)))}
                    </TableCell>
                  </TableRow>
                ));

            const renderTabela = (rows: Registro[]) => {
              // group by modality
              const byMod = new Map<string, Registro[]>();
              for (const r of rows) {
                const mod = r.modalidade?.trim() || "—";
                if (!byMod.has(mod)) byMod.set(mod, []);
                byMod.get(mod)!.push(r);
              }
              const mods = Array.from(byMod.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
              const multiMod = mods.length > 1;

              const tableHeader = (hideModalidade = false) => (
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs py-2">Nome Plataforma</TableHead>
                  {!hideModalidade && <TableHead className="text-xs py-2">Modalidade</TableHead>}
                  <TableHead className="text-xs py-2">Data/Hora</TableHead>
                  <TableHead className="text-xs py-2 text-right">Total</TableHead>
                  <TableHead className="text-xs py-2 text-right">Prof.</TableHead>
                  <TableHead className="text-xs py-2 text-right">Arena</TableHead>
                </TableRow>
              );

              if (!multiMod) {
                return (
                  <div className="border rounded overflow-hidden">
                    <Table>
                      <TableHeader>{tableHeader(true)}</TableHeader>
                      <TableBody>{renderLinhas(rows)}</TableBody>
                    </Table>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {mods.map(([mod, modRows]) => {
                    const isDayUse = modRows.some((r) => r.categoria === "dayuse");
                    return (
                      <div key={mod} className="border rounded overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border-b">
                          <span className="text-xs font-semibold text-foreground">{mod}</span>
                          {isDayUse && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              Day Use
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {modRows.length} aluno{modRows.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <Table>
                          <TableHeader>{tableHeader(true)}</TableHeader>
                          <TableBody>{renderLinhas(modRows)}</TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              );
            };

            return (
              <Card key={key}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{g.nome}</span>
                    {key !== "__arena__" && (
                      <Badge variant="secondary" className="text-xs">
                        {pct}% comissão
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const np = new Set(platRegs.map((r) => r.nomePlataforma)).size;
                        const nm = mensalistas.length;
                        const parts = [];
                        if (np > 0) parts.push(`${np} plataforma`);
                        if (nm > 0) parts.push(`${nm} mensalista${nm !== 1 ? "s" : ""}`);
                        return parts.join(" · ");
                      })()} · {chks} check-in{chks !== 1 ? "s" : ""}
                    </span>
                    <div className="ml-auto flex gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => exportToPDFComprovante(sessao, key, g.nome)}
                        data-testid={`button-comprovante-${key}`}
                      >
                        <Printer className="h-3 w-3" /> Comprovante
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      { label: "Receita", val: fmtVal(String(subtotal)), color: "text-foreground", sub: null },
                      { label: "Arena", val: fmtVal(String(arena)), color: "text-blue-600 dark:text-blue-400", sub: subtotal > 0 ? `${Math.round(arena/subtotal*100)}%` : null },
                      { label: "Comissão Prof.", val: fmtVal(String(comissao)), color: "text-emerald-600 dark:text-emerald-400", sub: subtotal > 0 ? `${Math.round(comissao/subtotal*100)}%` : null },
                    ].map((i) => (
                      <div key={i.label} className="bg-muted/40 rounded-md px-2.5 py-1.5 text-center">
                        <div className={cn("font-bold text-sm", i.color)}>{i.val}</div>
                        <div className="text-xs text-muted-foreground">{i.label}</div>
                        {i.sub && <div className="text-[10px] text-muted-foreground/60">{i.sub}</div>}
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-4 space-y-3">
                  {/* Alunos regulares (comissão natural) */}
                  {regulares.length > 0 && (
                    <div>
                      {atribuidos.length > 0 && (
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Alunos · {regulares.length}
                        </p>
                      )}
                      {renderTabela(regulares)}
                    </div>
                  )}

                  {/* Atribuídos (dayuse, avulso, etc.) */}
                  {atribuidos.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                          Atribuídos · {atribuidos.length}
                        </p>
                        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                      </div>
                      {renderTabela(atribuidos)}
                    </div>
                  )}

                  {/* Mensalistas manuais */}
                  {mensalistas.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                          Mensalistas · {mensalistas.length}
                        </p>
                        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                      </div>
                      <div className="border rounded overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="text-xs py-2">Aluno</TableHead>
                              <TableHead className="text-xs py-2 text-right">Total</TableHead>
                              <TableHead className="text-xs py-2 text-right">Prof.</TableHead>
                              <TableHead className="text-xs py-2 text-right">Arena</TableHead>
                              <TableHead className="text-xs py-2 text-center w-16">Comprov.</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...mensalistas]
                              .sort((a, b) => a.nomePlataforma.localeCompare(b.nomePlataforma, "pt-BR"))
                              .map((r) => (
                                <TableRow key={r.id} className="text-xs">
                                  <TableCell className="py-2 font-medium max-w-[160px]">
                                    <span className="block truncate" title={r.nomePlataforma}>{r.nomePlataforma}</span>
                                  </TableCell>
                                  <TableCell className="py-2 text-right font-mono tabular-nums">{fmtVal(r.valor)}</TableCell>
                                  <TableCell className="py-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{fmtVal(r.valorProfessor)}</TableCell>
                                  <TableCell className="py-2 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">{fmtVal(String(arenaRow(r)))}</TableCell>
                                  <TableCell className="py-2 text-center">
                                    {r.comprovante ? (
                                      <button
                                        onClick={() => window.open(r.comprovante!, "_blank")}
                                        className="inline-flex items-center justify-center text-primary hover:text-primary/80"
                                        title="Ver comprovante"
                                      >
                                        <ImageIcon className="h-3.5 w-3.5" />
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Fallback: nenhum dos três (não deveria acontecer) */}
                  {regulares.length === 0 && atribuidos.length === 0 && mensalistas.length === 0 && renderTabela(g.registros)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Por Modalidade */}
      {confirmados.length > 0 && (() => {
        const byMod = new Map<string, { registros: Registro[] }>();
        for (const r of confirmados) {
          const key = r.modalidade?.trim() || "Não identificada";
          if (!byMod.has(key)) byMod.set(key, { registros: [] });
          byMod.get(key)!.registros.push(r);
        }
        const modGroups = Array.from(byMod.entries()).sort((a, b) => {
          const recA = a[1].registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
          const recB = b[1].registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
          return recB - recA;
        });
        return (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Por Modalidade
            </h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold py-2 pl-4">Modalidade</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center">Alunos</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-center">Chk</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right">Receita</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right text-emerald-700 dark:text-emerald-400">Professor</TableHead>
                      <TableHead className="text-xs font-semibold py-2 text-right pr-4 text-blue-700 dark:text-blue-400">Arena</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modGroups.map(([mod, g], idx) => {
                      const receita = g.registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
                      const prof = g.registros.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
                      const arena = arenaSum(g.registros);
                      const chks = g.registros.reduce((s, r) => s + (r.checkins ?? 1), 0);
                      const uniqueAlunos = new Set(g.registros.map(r => r.studentId ?? r.nomePlataforma.toLowerCase().trim())).size;
                      const arenaOnly = isArenaOnlyMod(mod);
                      return (
                        <TableRow key={mod} className={cn("text-xs", idx % 2 === 1 && "bg-muted/20")}>
                          <TableCell className="py-2 pl-4 font-medium">
                            {mod}
                            {arenaOnly && (
                              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">Arena</Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-center tabular-nums">{uniqueAlunos}</TableCell>
                          <TableCell className="py-2 text-center tabular-nums">{chks}</TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums">{fmtVal(String(receita))}</TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{fmtVal(String(prof))}</TableCell>
                          <TableCell className="py-2 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 pr-4">{fmtVal(String(arena))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Resumo de Pagamentos */}
      {profGroups.length > 0 && (() => {
        const rows = profGroups.map(([key, g]) => {
          const receita = g.registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
          const comissao = g.registros.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
          const arena = arenaSum(g.registros);
          const chks = g.registros.reduce((s, r) => s + (r.checkins ?? 1), 0);
          const alunos = new Set(g.registros.map(r => r.studentId ?? r.nomePlataforma.toLowerCase().trim())).size;
          return { key, nome: g.nome, receita, comissao, arena, chks, alunos };
        });
        return (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Resumo de Pagamentos
            </h2>
            <Card>
              <CardContent className="pt-3 pb-3 px-4">
                <div className="border rounded overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-1.5">Professor / Arena</TableHead>
                        <TableHead className="text-xs py-1.5 text-center">Alunos</TableHead>
                        <TableHead className="text-xs py-1.5 text-center">Chk</TableHead>
                        <TableHead className="text-xs py-1.5 text-right">Receita</TableHead>
                        <TableHead className="text-xs py-1.5 text-right">A Pagar (Prof.)</TableHead>
                        <TableHead className="text-xs py-1.5 text-right">Fica (Arena)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.key} className="text-xs">
                          <TableCell className="py-1.5 font-medium">{row.nome}</TableCell>
                          <TableCell className="py-1.5 text-center">{row.alunos}</TableCell>
                          <TableCell className="py-1.5 text-center">{row.chks}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono">{fmtVal(String(row.receita))}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmtVal(String(row.comissao))}</TableCell>
                          <TableCell className="py-1.5 text-right font-mono text-blue-600 dark:text-blue-400">{fmtVal(String(row.arena))}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="text-xs font-bold border-t-2 bg-muted/30">
                        <TableCell className="py-1.5">Total</TableCell>
                        <TableCell className="py-1.5 text-center">{rows.reduce((s, r) => s + r.alunos, 0)}</TableCell>
                        <TableCell className="py-1.5 text-center">{rows.reduce((s, r) => s + r.chks, 0)}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono">{fmtVal(String(rows.reduce((s, r) => s + r.receita, 0)))}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmtVal(String(rows.reduce((s, r) => s + r.comissao, 0)))}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-blue-600 dark:text-blue-400">{fmtVal(String(rows.reduce((s, r) => s + r.arena, 0)))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Não encontrados */}
      {naoEncontrados.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-2">
            Não Encontrados ({naoEncontrados.length})
          </h2>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {naoEncontrados.map((r) => (
                  <Badge
                    key={r.id}
                    variant="outline"
                    className="text-xs text-red-700 border-red-300 dark:text-red-400 dark:border-red-700"
                  >
                    {r.nomePlataforma} · {fmtVal(r.valor)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Link Aluno Dialog ─────────────────────────────────────────────────────────

function LinkAlunoDialog({
  registro,
  confsProfs,
  onConfirmProf,
  onConfirmStudent,
  onClose,
}: {
  registro: Registro;
  confsProfs: ConfProfessor[];
  onConfirmProf: (professorId: string) => void;
  onConfirmStudent: (studentId: string, salvarAlias: boolean) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"prof" | "aluno">("prof");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [salvarAlias, setSalvarAlias] = useState(true);
  const [selectedProf, setSelectedProf] = useState<string | null>(null);

  const { data: arenaAlunos = [] } = useQuery<Array<{ id: string; nome: string; professorId: string | null }>>({
    queryKey: ["/api/alunos"],
  });
  const { data: professores = [] } = useQuery<Array<{ id: string; nome: string }>>({
    queryKey: ["/api/professores"],
  });
  const profById = new Map(professores.map((p) => [p.id, p.nome]));

  const filteredAlunos = arenaAlunos.filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Vincular Registro</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Platform name */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Nome na plataforma</p>
            <p className="text-sm font-semibold bg-muted/50 rounded px-3 py-2 border">
              {registro.nomePlataforma}
            </p>
          </div>

          {/* Mode switcher */}
          <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
            <button
              onClick={() => setMode("prof")}
              className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", mode === "prof" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Vincular ao Professor
            </button>
            <button
              onClick={() => setMode("aluno")}
              className={cn("flex-1 text-xs py-1.5 rounded-md font-medium transition-colors", mode === "aluno" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Vincular ao Aluno
            </button>
          </div>

          {/* Professor selection */}
          {mode === "prof" && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Vincule diretamente a um professor. Todos os registros com o mesmo nome serão atualizados automaticamente.
              </p>
              {confsProfs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  Nenhum professor configurado. Adicione professores na aba "Professores".
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {confsProfs.map((p) => {
                    const pct = parseFloat(p.percentualComissao || "0");
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProf(p.id)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors flex items-center justify-between gap-2",
                          selectedProf === p.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted/50 border-border"
                        )}
                        data-testid={`option-prof-${p.id}`}
                      >
                        <span className="font-medium truncate">{p.nome}</span>
                        {pct > 0 && (
                          <span className={cn("text-xs shrink-0 font-medium", selectedProf === p.id ? "text-primary-foreground/80" : "text-emerald-600 dark:text-emerald-400")}>
                            {p.percentualComissao}%
                          </span>
                        )}
                        {pct === 0 && (
                          <span className={cn("text-xs shrink-0", selectedProf === p.id ? "text-primary-foreground/60" : "text-muted-foreground")}>
                            Sem comissão
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Arena student selection */}
          {mode === "aluno" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Selecione o aluno cadastrado na arena que corresponde a este registro.
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar aluno…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="max-h-44 overflow-y-auto space-y-0.5 border rounded-lg p-1 bg-muted/20">
                {filteredAlunos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {search ? "Nenhum aluno encontrado" : "Nenhum aluno ativo na arena"}
                  </p>
                ) : (
                  filteredAlunos.map((a) => {
                    const profNome = a.professorId ? profById.get(a.professorId) : null;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelected(a.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2",
                          selected === a.id ? "bg-primary text-primary-foreground" : "hover:bg-background hover:shadow-sm"
                        )}
                        data-testid={`option-aluno-${a.id}`}
                      >
                        <span className="font-medium truncate">{a.nome}</span>
                        {profNome && (
                          <span className={cn("text-xs shrink-0", selected === a.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {profNome}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              <label className="flex items-start gap-2.5 text-xs cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={salvarAlias}
                  onChange={(e) => setSalvarAlias(e.target.checked)}
                  className="mt-0.5 shrink-0"
                />
                <span>
                  <span className="font-medium text-foreground">Salvar como apelido</span>
                  <span className="text-muted-foreground"> — reconhecer automaticamente nos próximos uploads</span>
                </span>
              </label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          {mode === "prof" ? (
            <Button
              size="sm"
              disabled={!selectedProf}
              onClick={() => selectedProf && onConfirmProf(selectedProf)}
              data-testid="button-confirmar-vinculo-prof"
            >
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              Vincular ao Professor
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!selected}
              onClick={() => selected && onConfirmStudent(selected, salvarAlias)}
              data-testid="button-confirmar-vinculo-aluno"
            >
              Vincular Aluno
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
