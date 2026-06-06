import { useState, useRef, useCallback } from "react";
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

export default function ConferenciaManager({ arenaId }: Props) {
  const [view, setView] = useState<"main" | "sessao">("main");
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  // "configuracao" (Professores e Alunos) is the first/default tab
  const [mainTab, setMainTab] = useState<"configuracao" | "lista">("configuracao");

  if (view === "sessao" && sessaoId) {
    return (
      <SessaoView
        sessaoId={sessaoId}
        arenaId={arenaId}
        onVoltar={() => {
          setSessaoId(null);
          setView("main");
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Conferência</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sistema de auditoria independente — cadastre professores/alunos e importe os Excels para
          cruzamento financeiro automático.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        {(
          [
            { key: "configuracao", label: "Professores e Alunos" },
            { key: "lista", label: "Conferências" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setMainTab(t.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              mainTab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-main-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === "configuracao" && <ConfiguracaoView arenaId={arenaId} />}
      {mainTab === "lista" && (
        <ListaView
          arenaId={arenaId}
          onSelectSessao={(id) => {
            setSessaoId(id);
            setView("sessao");
          }}
        />
      )}
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

  return (
    <div className="space-y-4">
      {/* Add Professor Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            Adicionar Professor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs text-muted-foreground mb-1">Nome do professor</p>
              <Input
                placeholder="Ex: Prof. Felipe"
                value={novoProfNome}
                onChange={(e) => setNovoProfNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddProf()}
                data-testid="input-novo-prof-nome"
              />
            </div>
            <div className="w-32">
              <p className="text-xs text-muted-foreground mb-1">% Comissão</p>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="30"
                value={novoProfPct}
                onChange={(e) => setNovoProfPct(e.target.value)}
                data-testid="input-novo-prof-pct"
              />
            </div>
            <Button
              onClick={handleAddProf}
              disabled={!novoProfNome.trim() || addProfMutation.isPending}
              data-testid="button-add-professor"
            >
              {addProfMutation.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Depois de criar o professor, adicione os alunos dele com os nomes exatamente como
            aparecem no Excel (o sistema usa similaridade para corresponder automaticamente).
          </p>
        </CardContent>
      </Card>

      {/* Professor List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando…</div>
      ) : professores.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
          Nenhum professor cadastrado ainda. Adicione o primeiro professor acima.
        </div>
      ) : (
        <div className="space-y-3">
          {professores.map((prof) => (
            <Card key={prof.id} data-testid={`card-prof-${prof.id}`}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {initials(prof.nome)}
                  </div>
                  {editingProf === prof.id ? (
                    <div className="flex-1 flex gap-2 items-center flex-wrap">
                      <Input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        data-testid={`input-edit-prof-nome-${prof.id}`}
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={editPct}
                          onChange={(e) => setEditPct(e.target.value)}
                          className="w-20 h-8 text-sm"
                          placeholder="%"
                          data-testid={`input-edit-prof-pct-${prof.id}`}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          editProfMutation.mutate({
                            id: prof.id,
                            nome: editNome,
                            percentualComissao: editPct,
                          })
                        }
                        disabled={editProfMutation.isPending}
                        data-testid={`button-save-prof-${prof.id}`}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => setEditingProf(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm">{prof.nome}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {prof.percentualComissao}% comissão
                        </Badge>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {prof.alunos.length} aluno{prof.alunos.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingProf(prof.id);
                            setEditNome(prof.nome);
                            setEditPct(prof.percentualComissao);
                          }}
                          data-testid={`button-edit-prof-${prof.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => delProfMutation.mutate(prof.id)}
                          disabled={delProfMutation.isPending}
                          data-testid={`button-del-prof-${prof.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                {/* Student tags */}
                {prof.alunos.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic mb-2">
                    Nenhum aluno cadastrado neste professor ainda.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {prof.alunos.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-1 bg-muted rounded-full pl-3 pr-1.5 py-0.5 text-xs"
                        data-testid={`tag-aluno-${a.id}`}
                      >
                        <span>{a.nome}</span>
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
                {/* Add student input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do aluno (como aparece no Excel)…"
                    value={novoAluno[prof.id] ?? ""}
                    onChange={(e) =>
                      setNovoAluno((prev) => ({ ...prev, [prof.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleAddAluno(prof.id)}
                    className="h-8 text-sm"
                    data-testid={`input-novo-aluno-${prof.id}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 shrink-0"
                    onClick={() => handleAddAluno(prof.id)}
                    disabled={!novoAluno[prof.id]?.trim() || addAlunoMutation.isPending}
                    data-testid={`button-add-aluno-${prof.id}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lista View (Upload + histórico) ───────────────────────────────────────────

interface UploadingFile {
  name: string;
  platform: string;
  status: "processing" | "done" | "error";
  error?: string;
}

function ListaView({
  arenaId,
  onSelectSessao,
}: {
  arenaId: string;
  onSelectSessao: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sessoes = [], isLoading } = useQuery<Sessao[]>({
    queryKey: ["/api/conferencia/sessoes"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/conferencia/sessao/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
    },
  });

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast({
          title: "Formato inválido",
          description: `${file.name}: envie arquivos .xlsx ou .xls`,
          variant: "destructive",
        });
        return null;
      }

      const detectedPlatform = detectPlatformFromFilename(file.name);
      const platform = detectedPlatform || "outro";

      setUploadingFiles((prev) => [
        ...prev,
        { name: file.name, platform, status: "processing" },
      ]);

      try {
        const content = await fileToBase64(file);
        const res = await apiRequest("POST", "/api/conferencia/upload", {
          filename: file.name,
          content,
          platform,
        });
        const sessao: SessaoDetalhe = await res.json();
        qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
        qc.setQueryData(["/api/conferencia/sessao", sessao.id], sessao);
        setUploadingFiles((prev) =>
          prev.map((f) => (f.name === file.name ? { ...f, status: "done" } : f))
        );
        return sessao;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao processar arquivo";
        setUploadingFiles((prev) =>
          prev.map((f) => (f.name === file.name ? { ...f, status: "error", error: msg } : f))
        );
        toast({ title: `Erro: ${file.name}`, description: msg, variant: "destructive" });
        return null;
      }
    },
    [toast, qc]
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploadingFiles([]);

      const results = await Promise.all(files.map((f) => processFile(f)));
      const succeeded = results.filter(Boolean) as SessaoDetalhe[];

      // Se só 1 arquivo processado com sucesso, abre direto
      if (succeeded.length === 1) {
        onSelectSessao(succeeded[0].id);
      } else if (succeeded.length > 1) {
        toast({
          title: `${succeeded.length} arquivos processados`,
          description: "Clique em qualquer conferência para ver o resultado.",
        });
        setUploadingFiles([]);
      }
    },
    [processFile, onSelectSessao, toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) handleFiles(files);
    },
    [handleFiles]
  );

  const isUploading = uploadingFiles.some((f) => f.status === "processing");

  return (
    <div className="space-y-5">
      {/* Upload Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Nova Conferência
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Arraste um ou dois arquivos Excel (.xlsx/.xls) — a plataforma é detectada
            automaticamente pelo nome do arquivo (TotalPass / Wellhub). Você pode enviar os dois
            juntos.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !isUploading && fileRef.current?.click()}
            data-testid="upload-zone"
            className={cn(
              "border-2 border-dashed rounded-lg px-4 py-8 flex flex-col items-center justify-center transition-colors select-none",
              dragging
                ? "border-primary bg-primary/5 cursor-pointer"
                : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
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
                <span className="text-sm font-medium">
                  Arraste os arquivos ou clique para selecionar
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  .xlsx ou .xls · TotalPass e/ou Wellhub · até 2 arquivos de uma vez
                </span>
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
                if (files.length) handleFiles(files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Upload progress indicators */}
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
                  {f.status === "processing" && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                  )}
                  {f.status === "done" && (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  )}
                  {f.status === "error" && (
                    <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  )}
                  <span className="truncate flex-1">{f.name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {plataformaLabel(f.platform)}
                  </Badge>
                  {f.status === "error" && f.error && (
                    <span className="text-red-600 shrink-0">{f.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Histórico de Conferências
        </h2>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando…</div>
        ) : sessoes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-lg">
            Nenhuma conferência realizada ainda. Faça o upload do primeiro arquivo.
          </div>
        ) : (
          <div className="space-y-2">
            {sessoes.map((s) => (
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
        )}
      </div>
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/conferencia/registro/${id}`, data).then((r) => r.json()),
    onSuccess: (updated: Registro) => {
      qc.setQueryData<SessaoDetalhe>(["/api/conferencia/sessao", sessaoId], (old) => {
        if (!old) return old;
        return {
          ...old,
          encontrados: old.registros.filter(
            (r) => (r.id === updated.id ? updated.status : r.status) === "confirmado"
          ).length,
          possiveis: old.registros.filter(
            (r) => (r.id === updated.id ? updated.status : r.status) === "pendente"
          ).length,
          naoEncontrados: old.registros.filter(
            (r) => (r.id === updated.id ? updated.status : r.status) === "nao_encontrado"
          ).length,
          registros: old.registros.map((r) => (r.id === updated.id ? updated : r)),
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

  const professores = Array.from(
    new Map(
      registros
        .filter((r) => r.professorNome)
        .map((r) => [r.professorId, r.professorNome])
    ).entries()
  ).map(([id, nome]) => ({ id: id!, nome: nome! }));

  const filtered = registros.filter((r) => {
    if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
    if (filtroProfessor !== "todos" && r.professorId !== filtroProfessor) return false;
    if (buscaNome && !r.nomePlataforma.toLowerCase().includes(buscaNome.toLowerCase()))
      return false;
    return true;
  });

  const handleConfirmar = (r: Registro) => {
    updateMutation.mutate({ id: r.id, data: { status: "confirmado", salvarAlias: true } });
  };

  const handleIgnorar = (r: Registro) => {
    updateMutation.mutate({ id: r.id, data: { status: "ignorado" } });
  };

  const handleExportCSV = () => {
    window.open(`/api/conferencia/export/${sessaoId}`, "_blank");
  };

  const handleExportPDF = () => {
    exportToPDF(sessao);
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoltar}
          className="mt-0.5 shrink-0"
          data-testid="button-voltar-conferencia"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{sessao.nomeArquivo}</h1>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <Badge variant="secondary" className="text-xs">
              {plataformaLabel(sessao.plataforma)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(sessao.criadoEm).toLocaleDateString("pt-BR")} · {sessao.totalRegistros}{" "}
              registros
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5"
            data-testid="button-export-csv"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-1.5"
            data-testid="button-export-pdf"
          >
            <Printer className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Encontrados",
            val: sessao.encontrados,
            icon: CheckCircle,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/40",
          },
          {
            label: "Possíveis",
            val: sessao.possiveis,
            icon: AlertCircle,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-950/40",
          },
          {
            label: "Não encontrados",
            val: sessao.naoEncontrados,
            icon: XCircle,
            color: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-950/40",
          },
        ].map((s) => (
          <Card key={s.label} className={cn("border", s.bg)}>
            <CardContent className="p-3 flex items-center gap-2.5">
              <s.icon className={cn("h-5 w-5 shrink-0", s.color)} />
              <div>
                <div className={cn("text-xl font-bold leading-none", s.color)}>{s.val}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["conferencia", "relatorio"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-${t}`}
          >
            {t === "conferencia" ? "Conferência" : "Relatório"}
          </button>
        ))}
      </div>

      {/* Conferência Tab */}
      {tab === "conferencia" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nome…"
                value={buscaNome}
                onChange={(e) => setBuscaNome(e.target.value)}
                className="pl-8 h-8 text-sm w-48"
                data-testid="input-busca-nome"
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 text-sm w-40" data-testid="select-filtro-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="confirmado">Confirmados</SelectItem>
                <SelectItem value="pendente">Possíveis</SelectItem>
                <SelectItem value="nao_encontrado">Não encontrados</SelectItem>
                <SelectItem value="ignorado">Ignorados</SelectItem>
              </SelectContent>
            </Select>
            {professores.length > 0 && (
              <Select value={filtroProfessor} onValueChange={setFiltroProfessor}>
                <SelectTrigger
                  className="h-8 text-sm w-44"
                  data-testid="select-filtro-professor"
                >
                  <SelectValue placeholder="Professor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os professores</SelectItem>
                  {professores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-xs text-muted-foreground self-center ml-auto">
              {filtered.length} de {registros.length}
            </span>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome na Plataforma</TableHead>
                  <TableHead className="text-xs">Aluno Correspondido</TableHead>
                  <TableHead className="text-xs">Professor</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-center">Chk</TableHead>
                  <TableHead className="text-xs text-center">Sim%</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const si = statusInfo(r.status);
                    return (
                      <TableRow
                        key={r.id}
                        className={cn("text-sm", si.bg)}
                        data-testid={`row-registro-${r.id}`}
                      >
                        <TableCell className="font-medium max-w-[160px] truncate py-2">
                          {r.nomePlataforma}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate py-2 text-muted-foreground">
                          {r.alunoNomeMatch ?? <span className="italic">—</span>}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground">
                          {r.professorNome ?? "—"}
                        </TableCell>
                        <TableCell className="py-2 text-right font-mono text-xs">
                          {fmtVal(r.valor)}
                        </TableCell>
                        <TableCell className="py-2 text-center text-xs">{r.checkins}</TableCell>
                        <TableCell className="py-2 text-center text-xs">
                          {r.similaridade != null ? `${r.similaridade}%` : "—"}
                        </TableCell>
                        <TableCell className="py-2">
                          <span
                            className={cn(
                              "text-xs font-medium flex items-center gap-1",
                              si.color
                            )}
                          >
                            <span
                              className={cn("h-1.5 w-1.5 rounded-full shrink-0", si.dot)}
                            />
                            {si.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1">
                            {r.status === "pendente" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleConfirmar(r)}
                                  data-testid={`button-confirmar-${r.id}`}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
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
                                variant="outline"
                                className="h-6 px-2 text-xs"
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
                                className="h-6 px-2 text-xs text-muted-foreground"
                                onClick={() => handleIgnorar(r)}
                                data-testid={`button-ignorar-${r.id}`}
                              >
                                Ignorar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Relatório Tab */}
      {tab === "relatorio" && (
        <RelatorioView registros={registros} plataforma={sessao.plataforma} />
      )}

      {/* Link Dialog */}
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
  onConfirm: (confAlunoId: string, salvarAlias: boolean) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [salvarAlias, setSalvarAlias] = useState(true);

  const { data: alunos = [] } = useQuery<ConfAluno[]>({
    queryKey: ["/api/conferencia/alunos"],
  });

  const filtered = alunos.filter((a) =>
    a.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Vincular Aluno</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nome na plataforma</p>
            <p className="text-sm font-medium bg-muted/40 rounded px-3 py-1.5">
              {registro.nomePlataforma}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1 border rounded-md p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum aluno encontrado
              </p>
            ) : (
              filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded text-sm transition-colors",
                    selected === a.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  data-testid={`option-aluno-${a.id}`}
                >
                  <span className="font-medium">{a.nome}</span>
                  {a.professorNome && (
                    <span className="text-xs ml-2 opacity-70">{a.professorNome}</span>
                  )}
                </button>
              ))
            )}
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={salvarAlias}
              onChange={(e) => setSalvarAlias(e.target.checked)}
            />
            Salvar como apelido (reconhecer automaticamente no próximo upload)
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
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
