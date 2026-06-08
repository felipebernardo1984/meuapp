import { useState, useRef } from "react";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ArrowLeft,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

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
}

interface ConfProfessor {
  id: string;
  nome: string;
  percentualComissao: string;
  alunos: ConfAluno[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(v: string | null | undefined): string {
  const n = parseFloat(v || "0");
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function plataformaLabel(p: string): string {
  if (p === "totalpass") return "TotalPass";
  if (p === "wellhub") return "Wellhub";
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

// ── PDF Export ────────────────────────────────────────────────────────────────

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
          <td>${r.alunoNomeMatch ?? r.nomePlataforma}</td>
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
          <span class="prof-summary">${g.registros.length} aluno${g.registros.length !== 1 ? "s" : ""} · ${chks} check-in${chks !== 1 ? "s" : ""}</span>
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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  h1 { font-size: 18px; margin-bottom: 2px; }
  .subtitle { color: #555; font-size: 11px; margin-bottom: 16px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; }
  .summary-card .val { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
  .summary-card .lbl { font-size: 10px; color: #666; }
  .prof-block { margin-bottom: 20px; page-break-inside: avoid; }
  .prof-header { display: flex; align-items: center; gap: 10px; background: #f4f4f4; padding: 7px 10px; border-radius: 5px 5px 0 0; border: 1px solid #ddd; border-bottom: none; }
  .prof-name { font-weight: bold; font-size: 12px; }
  .prof-pct { background: #e0e7ff; color: #3730a3; font-size: 10px; padding: 2px 7px; border-radius: 20px; }
  .prof-summary { color: #555; font-size: 10px; margin-left: auto; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
  th { background: #f9f9f9; text-align: left; padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #ddd; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
  tfoot td { background: #f4f4f4; border-top: 1px solid #ccc; }
  .section-title { font-weight: bold; font-size: 12px; margin: 16px 0 6px; color: #c0392b; }
  .nao-encontrados table { border-color: #fca5a5; }
  .nao-encontrados th { background: #fff5f5; }
  .total-row { display: flex; gap: 20px; background: #1e293b; color: white; border-radius: 6px; padding: 10px 16px; margin: 16px 0; flex-wrap: wrap; }
  .total-item .lbl { font-size: 9px; opacity: 0.7; }
  .total-item .val { font-size: 13px; font-weight: bold; }
  @media print { body { padding: 10px; } }
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
}

interface MesRef {
  ano: number;
  mes: number;
}

export default function ConferenciaManager({ arenaId }: Props) {
  const [view, setView] = useState<"landing" | "mes" | "sessao">("landing");
  const [mesSel, setMesSel] = useState<MesRef | null>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);

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

  const mesGroups = groupByMonth(sessoes);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Conferência</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conferência mensal de repasses TotalPass e Wellhub
        </p>
      </div>

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
            const totalEncontrados = g.sessoes.reduce((s, ss) => s + ss.encontrados, 0);
            const totalPossiveis   = g.sessoes.reduce((s, ss) => s + ss.possiveis, 0);
            const totalNao         = g.sessoes.reduce((s, ss) => s + ss.naoEncontrados, 0);
            const plataformas = Array.from(new Set(g.sessoes.map((ss) => plataformaLabel(ss.plataforma)))).join(" + ");
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
                        <Badge variant="outline" className="text-xs">
                          {g.sessoes.length} arquivo{g.sessoes.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
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
  const [mesTab, setMesTab] = useState<"arquivos" | "professores">("arquivos");
  const [dragging, setDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/conferencia/sessao/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] }),
  });

  const isUploading = uploadingFiles.some((f) => f.status === "processing");

  const processUploadFile = async (file: File): Promise<SessaoDetalhe | null> => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({ title: "Formato inválido", description: `${file.name}: envie .xlsx ou .xls`, variant: "destructive" });
      return null;
    }
    const platform = detectPlatformFromFilename(file.name) || "outro";
    setUploadingFiles((prev) => [...prev, { name: file.name, platform, status: "processing" }]);
    try {
      const content = await fileToBase64(file);
      const res = await apiRequest("POST", "/api/conferencia/upload", {
        filename: file.name, content, platform, dataInicio, dataFim,
      });
      const sessao: SessaoDetalhe = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
      qc.setQueryData(["/api/conferencia/sessao", sessao.id], sessao);
      setUploadingFiles((prev) =>
        prev.map((f) => f.name === file.name ? { ...f, status: "done", debug: sessao.debug } : f)
      );
      return sessao;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao processar arquivo";
      setUploadingFiles((prev) =>
        prev.map((f) => f.name === file.name ? { ...f, status: "error", error: msg } : f)
      );
      toast({ title: `Erro: ${file.name}`, description: msg, variant: "destructive" });
      return null;
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingFiles([]);
    const results = await Promise.all(files.map((f) => processUploadFile(f)));
    const succeeded = results.filter(Boolean) as SessaoDetalhe[];
    if (succeeded.length === 1) {
      const s = succeeded[0];
      const total = s.encontrados + s.possiveis;
      toast({
        title: `${total} correspondência${total !== 1 ? "s" : ""} encontrada${total !== 1 ? "s" : ""}`,
        description: `${s.encontrados} confirmados · ${s.possiveis} possíveis · ${s.naoEncontrados} não encontrados`,
      });
      onSelectSessao(s.id);
    } else if (succeeded.length > 1) {
      toast({ title: `${succeeded.length} arquivos processados` });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onVoltar} data-testid="button-voltar-landing">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground">{mesLabel}</h1>
          <p className="text-xs text-muted-foreground">Conferência TotalPass & Wellhub</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(
          [
            { key: "arquivos", label: "Arquivos" },
            { key: "professores", label: "Professores" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setMesTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              mesTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-mes-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Arquivos tab */}
      {mesTab === "arquivos" && (
        <div className="space-y-4">
          {/* Upload zone */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Arraste o Excel do TotalPass ou Wellhub referente a{" "}
              <strong>{mesLabel}</strong>. O sistema detecta nomes, valores e modalidades
              automaticamente e cruza com os alunos da arena.
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const files = Array.from(e.dataTransfer.files);
                if (files.length) handleUploadFiles(files);
              }}
              onClick={() => !isUploading && fileRef.current?.click()}
              data-testid="upload-zone-conferir"
              className={cn(
                "border-2 border-dashed rounded-lg px-4 py-8 flex flex-col items-center justify-center transition-colors select-none cursor-pointer",
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
                isUploading && "opacity-60 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-7 w-7 text-muted-foreground animate-spin mb-1.5" />
                  <span className="text-sm text-muted-foreground">Processando arquivos…</span>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-muted-foreground mb-1.5" />
                  <span className="text-sm font-medium">Arraste os arquivos ou clique para selecionar</span>
                  <span className="text-xs text-muted-foreground mt-0.5">.xlsx ou .xls · TotalPass e/ou Wellhub</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) handleUploadFiles(files);
                  e.target.value = "";
                }}
              />
            </div>

            {uploadingFiles.length > 0 && (
              <div className="space-y-1.5 mt-2">
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
          </div>

          {/* Sessions for this month */}
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Carregando…</div>
          ) : mesSessoes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Arquivos de {mesLabel}
              </p>
              {mesSessoes.map((s) => (
                <Card
                  key={s.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border"
                  onClick={() => onSelectSessao(s.id)}
                  data-testid={`sessao-card-${s.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{s.nomeArquivo}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {plataformaLabel(s.plataforma)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" /> {s.encontrados} encontrados
                          </span>
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" /> {s.possiveis} possíveis
                          </span>
                          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <XCircle className="h-3 w-3" /> {s.naoEncontrados} não encontrados
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {s.totalRegistros} registros ·{" "}
                            {new Date(s.criadoEm).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !isUploading && (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
              Nenhum arquivo enviado para {mesLabel}.<br />
              Arraste os arquivos acima para começar.
            </div>
          )}
        </div>
      )}

      {/* Professores tab */}
      {mesTab === "professores" && <ConfiguracaoView arenaId={arenaId} />}
    </div>
  );
}

// ── Configuração View ─────────────────────────────────────────────────────────

function ConfiguracaoView({ arenaId }: { arenaId: string }) {
  const [novoProfNome, setNovoProfNome] = useState("");
  const [novoProfPct, setNovoProfPct] = useState("0");
  const [editingProf, setEditingProf] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editPct, setEditPct] = useState("0");
  const [novoAluno, setNovoAluno] = useState<Record<string, string>>({});
  const [listMode, setListMode] = useState<Record<string, boolean>>({});
  const [listaTexto, setListaTexto] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: professores = [], isLoading } = useQuery<ConfProfessor[]>({
    queryKey: ["/api/conferencia/professores"],
  });

  const addProfMutation = useMutation({
    mutationFn: (data: { nome: string; percentualComissao: string }) =>
      apiRequest("POST", "/api/conferencia/professores", data).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/conferencia/professores"] });
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
      qc.invalidateQueries({ queryKey: ["/api/conferencia/professores"] });
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
      qc.invalidateQueries({ queryKey: ["/api/conferencia/professores"] });
      toast({ title: "Professor removido" });
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao remover professor",
        description: err.message,
        variant: "destructive",
      }),
  });

  const addAlunoMutation = useMutation({
    mutationFn: ({ profId, nome }: { profId: string; nome: string }) =>
      apiRequest("POST", `/api/conferencia/professores/${profId}/alunos`, { nome }).then((r) =>
        r.json()
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/conferencia/professores"] });
      setNovoAluno((prev) => ({ ...prev, [vars.profId]: "" }));
    },
    onError: (err: Error) =>
      toast({
        title: "Erro ao adicionar aluno",
        description: err.message,
        variant: "destructive",
      }),
  });

  const addAlunosLoteMutation = useMutation({
    mutationFn: ({ profId, nomes }: { profId: string; nomes: string[] }) =>
      apiRequest("POST", `/api/conferencia/professores/${profId}/alunos/lote`, { nomes }).then(
        (r) => r.json()
      ),
    onSuccess: (data: { adicionados: number }, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/conferencia/professores"] });
      setListaTexto((prev) => ({ ...prev, [vars.profId]: "" }));
      setListMode((prev) => ({ ...prev, [vars.profId]: false }));
      toast({ title: `${data.adicionados} aluno${data.adicionados !== 1 ? "s" : ""} adicionado${data.adicionados !== 1 ? "s" : ""}!` });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/conferencia/professores"] }),
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

  const handleAddAluno = (profId: string) => {
    const nome = novoAluno[profId]?.trim();
    if (!nome) return;
    addAlunoMutation.mutate({ profId, nome });
  };

  const [expandedProf, setExpandedProf] = useState<string | null>(null);

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
              const isExpanded = expandedProf === prof.id;
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
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <span className="font-medium text-sm text-foreground truncate">{prof.nome}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant={pctNum > 0 ? "default" : "secondary"}
                            className="text-xs tabular-nums"
                          >
                            {pctNum > 0 ? `${pctNum}%` : "Sem comissão"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {prof.alunos.length} aluno{prof.alunos.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedProf(isExpanded ? null : prof.id)}
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
                  {isExpanded && (
                    <div className="border-t bg-muted/30 px-4 py-4 space-y-3">
                      {/* Student chips */}
                      {prof.alunos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {prof.alunos.map((a) => (
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

                      {/* Input mode toggle */}
                      <div className="flex items-center gap-1 border rounded-lg p-0.5 w-fit bg-background">
                        {[{ id: false, label: "Adicionar um" }, { id: true, label: "Colar lista" }].map((m) => (
                          <button
                            key={String(m.id)}
                            onClick={() => setListMode((prev) => ({ ...prev, [prof.id]: m.id }))}
                            className={cn(
                              "text-xs px-3 py-1.5 rounded-md transition-colors font-medium",
                              listMode[prof.id] === m.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            data-testid={`toggle-modo-${m.id ? "lista" : "individual"}-${prof.id}`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Single add */}
                      {!listMode[prof.id] && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nome como aparece no Excel…"
                            value={novoAluno[prof.id] ?? ""}
                            onChange={(e) => setNovoAluno((prev) => ({ ...prev, [prof.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === "Enter" && handleAddAluno(prof.id)}
                            className="h-9 text-sm flex-1"
                            data-testid={`input-novo-aluno-${prof.id}`}
                          />
                          <Button
                            size="sm"
                            className="h-9 px-4"
                            onClick={() => handleAddAluno(prof.id)}
                            disabled={!novoAluno[prof.id]?.trim() || addAlunoMutation.isPending}
                            data-testid={`button-add-aluno-${prof.id}`}
                          >
                            {addAlunoMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      )}

                      {/* Paste list */}
                      {listMode[prof.id] && (() => {
                        const nomes = (listaTexto[prof.id] ?? "").split("\n").map((n) => n.trim()).filter(Boolean);
                        return (
                          <div className="space-y-2">
                            <textarea
                              placeholder={"Cole os nomes aqui, um por linha:\n\nJoão da Silva\nMaria Souza\nPedro Alves\n…"}
                              value={listaTexto[prof.id] ?? ""}
                              onChange={(e) => setListaTexto((prev) => ({ ...prev, [prof.id]: e.target.value }))}
                              rows={5}
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
                                Adicionar {nomes.length > 0 ? nomes.length : ""} aluno{nomes.length !== 1 ? "s" : ""}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
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
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroProfessor, setFiltroProfessor] = useState("todos");
  const [buscaNome, setBuscaNome] = useState("");
  const [linkDialog, setLinkDialog] = useState<Registro | null>(null);
  const [destinarPara, setDestinarPara] = useState("");
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

  const { data: confsProfs = [] } = useQuery<ConfProfessor[]>({
    queryKey: ["/api/conferencia/professores"],
  });

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

  const filtered = registros.filter((r) => {
    if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
    if (filtroProfessor !== "todos" && r.professorId !== filtroProfessor) return false;
    if (buscaNome && !r.nomePlataforma.toLowerCase().includes(buscaNome.toLowerCase())) return false;
    return true;
  });

  const confirmedValor = registros.filter((r) => r.status === "confirmado").reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const pendenteValor = registros.filter((r) => r.status === "pendente").reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const naoEncontradoValor = registros.filter((r) => r.status === "nao_encontrado").reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalValor = confirmedValor + pendenteValor + naoEncontradoValor;
  const naoEncontradosCount = registros.filter((r) => r.status === "nao_encontrado").length;

  const handleConfirmar = (r: Registro) => {
    updateMutation.mutate({ id: r.id, data: { status: "confirmado", salvarAlias: true } });
  };

  const handleIgnorar = (r: Registro) => {
    updateMutation.mutate({ id: r.id, data: { status: "ignorado" } });
  };

  const handleDestinar = (registroId: string, professorId: string | null) => {
    const prof = confsProfs.find((p) => p.id === professorId);
    const percentual = prof?.percentualComissao ?? "0";
    updateMutation.mutate({ id: registroId, data: { professorId, percentual } });
  };

  const handleBulkDestinar = () => {
    if (!destinarPara) return;
    const naoEnc = registros.filter((r) => r.status === "nao_encontrado");
    const professorId = destinarPara === "arena" ? null : destinarPara;
    const prof = confsProfs.find((p) => p.id === professorId);
    const percentual = prof?.percentualComissao ?? "0";
    naoEnc.forEach((r) => {
      updateMutation.mutate({ id: r.id, data: { professorId, percentual } });
    });
    toast({ title: `${naoEnc.length} registro${naoEnc.length !== 1 ? "s" : ""} destinado${naoEnc.length !== 1 ? "s" : ""}` });
  };

  const handleExportCSV = () => window.open(`/api/conferencia/export/${sessaoId}`, "_blank");
  const handleExportPDF = () => exportToPDF(sessao);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onVoltar} className="shrink-0" data-testid="button-voltar-conferencia">
          <ArrowLeft className="h-4 w-4" />
        </Button>
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
        <div className="flex gap-1.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs" data-testid="button-export-csv">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs" data-testid="button-export-pdf">
            <Printer className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border shadow-none bg-muted/30">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Total planilha</p>
            <p className="text-lg font-bold text-foreground leading-none">{fmtVal(String(totalValor))}</p>
            <p className="text-xs text-muted-foreground mt-1">{sessao.totalRegistros} registros</p>
          </CardContent>
        </Card>
        <Card className="border shadow-none bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/40">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">Confirmados</p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-none">{sessao.encontrados}</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-1">{fmtVal(String(confirmedValor))}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-none bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/40">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5">Possíveis</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 leading-none">{sessao.possiveis}</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">{fmtVal(String(pendenteValor))}</p>
          </CardContent>
        </Card>
        <Card className={cn("border shadow-none", naoEncontradosCount > 0 ? "bg-red-50/60 dark:bg-red-950/30 border-red-200/70 dark:border-red-800/40" : "bg-muted/30")}>
          <CardContent className="p-4">
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1.5", naoEncontradosCount > 0 ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>Não encontrados</p>
            <p className={cn("text-lg font-bold leading-none", naoEncontradosCount > 0 ? "text-red-700 dark:text-red-400" : "text-foreground")}>{sessao.naoEncontrados}</p>
            <p className={cn("text-xs mt-1", naoEncontradosCount > 0 ? "text-red-600/80 dark:text-red-500/80" : "text-muted-foreground")}>{fmtVal(String(naoEncontradoValor))}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b">
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

          {/* Bulk destinar bar */}
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
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 text-sm w-44" data-testid="select-filtro-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="confirmado">✓ Confirmados</SelectItem>
                <SelectItem value="pendente">~ Possíveis</SelectItem>
                <SelectItem value="nao_encontrado">✗ Não encontrados</SelectItem>
                <SelectItem value="ignorado">— Ignorados</SelectItem>
              </SelectContent>
            </Select>
            {filteredProfs.length > 0 && (
              <Select value={filtroProfessor} onValueChange={setFiltroProfessor}>
                <SelectTrigger className="h-8 text-sm w-44" data-testid="select-filtro-professor">
                  <SelectValue placeholder="Professor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os professores</SelectItem>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate max-w-xs">
                            {r.nomePlataforma}
                          </span>
                          {r.similaridade != null && r.status !== "nao_encontrado" && r.status !== "ignorado" && (
                            <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {r.similaridade}%
                            </span>
                          )}
                        </div>

                        {r.alunoNomeMatch && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-foreground/70">→ {r.alunoNomeMatch}</span>
                            {profNome && (
                              <span className="ml-2 font-medium text-primary">· {profNome}</span>
                            )}
                            {parseFloat(r.percentual) > 0 && (
                              <span className="ml-1 text-muted-foreground">({r.percentual}%)</span>
                            )}
                          </p>
                        )}

                        {/* Destinar inline for unmatched */}
                        {r.status === "nao_encontrado" && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">Destinar para:</span>
                            <Select
                              value={r.professorId ?? "__none__"}
                              onValueChange={(v) => handleDestinar(r.id, v === "__none__" || v === "arena" ? null : v)}
                            >
                              <SelectTrigger className="h-6 text-xs w-44 py-0" data-testid={`select-destinar-${r.id}`}>
                                <SelectValue placeholder="Professor ou arena…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="arena">Arena (sem comissão)</SelectItem>
                                {confsProfs.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Value block */}
                      <div className="text-right shrink-0 min-w-[80px]">
                        <p className="font-bold text-sm tabular-nums">{fmtVal(r.valor)}</p>
                        {hasSplit ? (
                          <div className="mt-0.5 text-[11px] space-x-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">{fmtVal(r.valorProfessor)}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium tabular-nums">{fmtVal(r.valorArena)}</span>
                          </div>
                        ) : r.status === "nao_encontrado" && profNome === null ? (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 tabular-nums mt-0.5">{fmtVal(r.valor)} arena</p>
                        ) : null}
                        {r.checkins > 1 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{r.checkins}× chk</p>
                        )}
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
      {tab === "relatorio" && <RelatorioView registros={registros} plataforma={sessao.plataforma} />}

      {/* ── Link Dialog ── */}
      {linkDialog && (
        <LinkAlunoDialog
          registro={linkDialog}
          onConfirm={(confAlunoId, salvarAlias) => {
            updateMutation.mutate({
              id: linkDialog.id,
              data: { studentId: confAlunoId, status: "confirmado", salvarAlias },
            });
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
}: {
  registros: Registro[];
  plataforma: string;
}) {
  const confirmados = registros.filter((r) => r.status === "confirmado");
  const totalRecebido = confirmados.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalProfessores = confirmados.reduce(
    (s, r) => s + parseFloat(r.valorProfessor || "0"),
    0
  );
  const totalArena = confirmados.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
  const totalCheckins = confirmados.reduce((s, r) => s + (r.checkins ?? 1), 0);
  const naoEncontrados = registros.filter((r) => r.status === "nao_encontrado");

  const byProf = new Map<string, { nome: string; registros: Registro[] }>();
  for (const r of confirmados) {
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
          },
          {
            label: "Comissões Prof.",
            val: fmtVal(String(totalProfessores)),
            icon: Users,
            color: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Valor Arena",
            val: fmtVal(String(totalArena)),
            icon: Building2,
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Total Check-ins",
            val: String(totalCheckins),
            icon: CheckCircle,
            color: "text-amber-600 dark:text-amber-400",
          },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <c.icon className={cn("h-5 w-5 shrink-0", c.color)} />
              <div>
                <div className={cn("text-base font-bold leading-none", c.color)}>{c.val}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.label}</div>
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
            const subtotal = g.registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
            const comissao = g.registros.reduce(
              (s, r) => s + parseFloat(r.valorProfessor || "0"),
              0
            );
            const arena = g.registros.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
            const chks = g.registros.reduce((s, r) => s + (r.checkins ?? 1), 0);
            const pct = g.registros[0]?.percentual ?? "0";

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
                    <span className="text-xs text-muted-foreground ml-auto">
                      {g.registros.length} aluno{g.registros.length !== 1 ? "s" : ""} · {chks}{" "}
                      check-in{chks !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {[
                      {
                        label: "Receita",
                        val: fmtVal(String(subtotal)),
                        color: "text-foreground",
                      },
                      {
                        label: "Prof.",
                        val: fmtVal(String(comissao)),
                        color: "text-emerald-600 dark:text-emerald-400",
                      },
                      {
                        label: "Arena",
                        val: fmtVal(String(arena)),
                        color: "text-blue-600 dark:text-blue-400",
                      },
                    ].map((i) => (
                      <div
                        key={i.label}
                        className="bg-muted/40 rounded-md px-2.5 py-1.5 text-center"
                      >
                        <div className={cn("font-bold text-sm", i.color)}>{i.val}</div>
                        <div className="text-xs text-muted-foreground">{i.label}</div>
                      </div>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="border rounded overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs py-1.5">Aluno</TableHead>
                          <TableHead className="text-xs py-1.5 text-center">Chk</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Total</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Prof.</TableHead>
                          <TableHead className="text-xs py-1.5 text-right">Arena</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.registros.map((r) => (
                          <TableRow key={r.id} className="text-xs">
                            <TableCell className="py-1.5">
                              {r.alunoNomeMatch ?? r.nomePlataforma}
                            </TableCell>
                            <TableCell className="py-1.5 text-center">{r.checkins ?? 1}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono">
                              {fmtVal(r.valor)}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {fmtVal(r.valorProfessor)}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-blue-600 dark:text-blue-400">
                              {fmtVal(r.valorArena)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
              <CardContent className="pt-3 pb-3 px-4">
                <div className="border rounded overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-1.5">Modalidade</TableHead>
                        <TableHead className="text-xs py-1.5 text-center">Alunos</TableHead>
                        <TableHead className="text-xs py-1.5 text-center">Chk</TableHead>
                        <TableHead className="text-xs py-1.5 text-right">Receita</TableHead>
                        <TableHead className="text-xs py-1.5 text-right">Prof.</TableHead>
                        <TableHead className="text-xs py-1.5 text-right">Arena</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modGroups.map(([mod, g]) => {
                        const receita = g.registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
                        const prof = g.registros.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
                        const arena = g.registros.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
                        const chks = g.registros.reduce((s, r) => s + (r.checkins ?? 1), 0);
                        const arenaOnly = isArenaOnlyMod(mod);
                        return (
                          <TableRow key={mod} className="text-xs">
                            <TableCell className="py-1.5 font-medium">
                              {mod}
                              {arenaOnly && (
                                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0">Arena</Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-1.5 text-center">{g.registros.length}</TableCell>
                            <TableCell className="py-1.5 text-center">{chks}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono">{fmtVal(String(receita))}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmtVal(String(prof))}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-blue-600 dark:text-blue-400">{fmtVal(String(arena))}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
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
          const arena = g.registros.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
          const chks = g.registros.reduce((s, r) => s + (r.checkins ?? 1), 0);
          return { key, nome: g.nome, receita, comissao, arena, chks, alunos: g.registros.length };
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
  onConfirm,
  onClose,
}: {
  registro: Registro;
  onConfirm: (studentId: string, salvarAlias: boolean) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [salvarAlias, setSalvarAlias] = useState(true);

  // Search main arena students (they change month to month — no pre-registration needed)
  const { data: arenaAlunos = [] } = useQuery<Array<{ id: string; nome: string; professorId: string | null }>>({
    queryKey: ["/api/alunos"],
  });

  // Professors for name resolution
  const { data: professores = [] } = useQuery<Array<{ id: string; nome: string }>>({
    queryKey: ["/api/professores"],
  });
  const profById = new Map(professores.map((p) => [p.id, p.nome]));

  const filtered = arenaAlunos.filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Vincular Aluno</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione o aluno da arena que corresponde a este nome da plataforma.
            O vínculo será salvo para reconhecimento automático nos próximos uploads.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nome na plataforma</p>
            <p className="text-sm font-semibold bg-muted/50 rounded px-3 py-2 border">
              {registro.nomePlataforma}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar aluno cadastrado na arena…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5 border rounded-lg p-1 bg-muted/20">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {search ? "Nenhum aluno encontrado para essa busca" : "Nenhum aluno ativo na arena"}
              </p>
            ) : (
              filtered.map((a) => {
                const profNome = a.professorId ? profById.get(a.professorId) : null;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2",
                      selected === a.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-background hover:shadow-sm"
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
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected, salvarAlias)}
            data-testid="button-confirmar-vinculo"
          >
            Vincular Aluno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
