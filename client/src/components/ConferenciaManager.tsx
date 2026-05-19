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

interface AlunoOpcao {
  id: string;
  nome: string;
  professorId: string | null;
  professorNome: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVal(v: string | null | undefined): string {
  const n = parseFloat(v || "0");
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(s: string | null | undefined): string {
  if (!s) return "—";
  return s;
}

function plataformaLabel(p: string): string {
  if (p === "totalpass") return "TotalPass";
  if (p === "wellhub") return "Wellhub";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function statusInfo(status: string) {
  switch (status) {
    case "confirmado":
      return { label: "Confirmado", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" };
    case "pendente":
      return { label: "Possível", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", dot: "bg-amber-500" };
    case "nao_encontrado":
      return { label: "Não encontrado", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800", dot: "bg-red-500" };
    case "ignorado":
      return { label: "Ignorado", color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700", dot: "bg-gray-400" };
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

function detectarPlataforma(filename: string): string {
  const fn = filename.toLowerCase();
  if (fn.includes("totalpass")) return "TotalPass";
  if (fn.includes("wellhub") || fn.includes("gympass")) return "Wellhub";
  return "Auto";
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  arenaId: string;
}

export default function ConferenciaManager({ arenaId }: Props) {
  const [view, setView] = useState<"list" | "sessao">("list");
  const [sessaoId, setSessaoId] = useState<string | null>(null);

  if (view === "sessao" && sessaoId) {
    return (
      <SessaoView
        sessaoId={sessaoId}
        arenaId={arenaId}
        onVoltar={() => { setSessaoId(null); setView("list"); }}
      />
    );
  }

  return (
    <ListaView
      arenaId={arenaId}
      onSelectSessao={(id) => { setSessaoId(id); setView("sessao"); }}
    />
  );
}

// ── Lista View (Upload + histórico) ───────────────────────────────────────────

function ListaView({
  arenaId,
  onSelectSessao,
}: {
  arenaId: string;
  onSelectSessao: (id: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showProfessores, setShowProfessores] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sessoes = [], isLoading } = useQuery<Sessao[]>({
    queryKey: ["/api/conferencia/sessoes"],
  });

  const { data: professores = [] } = useQuery<any[]>({
    queryKey: ["/api/professores"],
    enabled: showProfessores,
  });

  const { data: alunos = [] } = useQuery<any[]>({
    queryKey: ["/api/alunos"],
    enabled: showProfessores,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/conferencia/sessao/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] }); },
  });

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        toast({ title: "Formato inválido", description: "Envie um arquivo .xlsx ou .xls", variant: "destructive" });
        return;
      }
      setUploading(true);
      try {
        const content = await fileToBase64(file);
        const res = await apiRequest("POST", "/api/conferencia/upload", {
          filename: file.name,
          content,
        });
        const sessao: SessaoDetalhe = await res.json();
        qc.invalidateQueries({ queryKey: ["/api/conferencia/sessoes"] });
        qc.setQueryData(["/api/conferencia/sessao", sessao.id], sessao);
        onSelectSessao(sessao.id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao processar arquivo";
        toast({ title: "Erro no upload", description: msg, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [toast, qc, onSelectSessao]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Conferência</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Faça upload do Excel (TotalPass ou Wellhub) — a plataforma é detectada automaticamente pelo nome do arquivo.
        </p>
      </div>

      {/* Professor → Alunos Setup */}
      <Card>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowProfessores(!showProfessores)}>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Professores e Alunos
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {showProfessores ? "Recolher" : "Ver configuração"}
            </span>
          </CardTitle>
        </CardHeader>
        {showProfessores && (
          <CardContent className="pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              O sistema vincula automaticamente os nomes do Excel com os alunos cadastrados abaixo. Use a aba de conferência para ajustar vínculos manualmente quando necessário.
            </p>
            {professores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum professor cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {professores.map((prof: any) => {
                  const alunosProf = alunos.filter((a: any) => a.professorId === prof.id);
                  return (
                    <div key={prof.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {prof.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{prof.name}</p>
                          <p className="text-xs text-muted-foreground">{prof.modalidade} · {prof.percentualComissao ?? 0}% comissão</p>
                        </div>
                        <Badge variant="secondary" className="ml-auto text-xs">{alunosProf.length} aluno{alunosProf.length !== 1 ? "s" : ""}</Badge>
                      </div>
                      {alunosProf.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {alunosProf.map((a: any) => (
                            <div key={a.id} className="flex items-center gap-1 bg-muted rounded-md px-2 py-0.5 text-xs">
                              <span className="font-medium">{a.nome}</span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1 h-4">
                                {a.integrationType === "wellhub" ? "WH" : a.integrationType === "totalpass" ? "TP" : "M"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhum aluno vinculado a este professor.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Para vincular alunos a um professor, acesse <strong>Alunos</strong> e edite o campo Professor de cada aluno.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Upload Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Nova Conferência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !uploading && fileRef.current?.click()}
            data-testid="upload-zone"
            className={cn(
              "border-2 border-dashed rounded-lg px-4 py-8 flex flex-col items-center justify-center cursor-pointer transition-colors select-none",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
              uploading && "opacity-60 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <RefreshCw className="h-7 w-7 text-muted-foreground animate-spin mb-1.5" />
                <span className="text-sm text-muted-foreground">Processando…</span>
              </>
            ) : (
              <>
                <Upload className="h-7 w-7 text-muted-foreground mb-1.5" />
                <span className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</span>
                <span className="text-xs text-muted-foreground mt-0.5">.xlsx ou .xls — TotalPass, Wellhub ou outra plataforma</span>
                <span className="text-xs text-muted-foreground mt-1 bg-muted rounded px-2 py-0.5">
                  Plataforma detectada automaticamente pelo nome do arquivo
                </span>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessions History */}
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
                          {s.totalRegistros} registros · {new Date(s.criadoEm).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}
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
          encontrados: old.registros.filter((r) => (r.id === updated.id ? updated.status : r.status) === "confirmado").length,
          possiveis: old.registros.filter((r) => (r.id === updated.id ? updated.status : r.status) === "pendente").length,
          naoEncontrados: old.registros.filter((r) => (r.id === updated.id ? updated.status : r.status) === "nao_encontrado").length,
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

  // Collect unique professors
  const professores = Array.from(
    new Map(
      registros
        .filter((r) => r.professorNome)
        .map((r) => [r.professorId, r.professorNome])
    ).entries()
  ).map(([id, nome]) => ({ id: id!, nome: nome! }));

  // Filtered registros
  const filtered = registros.filter((r) => {
    if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
    if (filtroProfessor !== "todos" && r.professorId !== filtroProfessor) return false;
    if (buscaNome && !r.nomePlataforma.toLowerCase().includes(buscaNome.toLowerCase())) return false;
    return true;
  });

  const handleConfirmar = (r: Registro) => {
    updateMutation.mutate({ id: r.id, data: { status: "confirmado", salvarAlias: true } });
  };

  const handleIgnorar = (r: Registro) => {
    updateMutation.mutate({ id: r.id, data: { status: "ignorado" } });
  };

  const handleExport = () => {
    window.open(`/api/conferencia/export/${sessaoId}`, "_blank");
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
            <Badge variant="secondary" className="text-xs">{plataformaLabel(sessao.plataforma)}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(sessao.criadoEm).toLocaleDateString("pt-BR")} · {sessao.totalRegistros} registros
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-1.5 shrink-0"
          data-testid="button-export-csv"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Encontrados", val: sessao.encontrados, icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { label: "Possíveis", val: sessao.possiveis, icon: AlertCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
          { label: "Não encontrados", val: sessao.naoEncontrados, icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40" },
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
          {/* Filters */}
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
                <SelectTrigger className="h-8 text-sm w-44" data-testid="select-filtro-professor">
                  <SelectValue placeholder="Professor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os professores</SelectItem>
                  {professores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="text-xs text-muted-foreground self-center ml-auto">
              {filtered.length} de {registros.length}
            </span>
          </div>

          {/* Table */}
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
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
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
                          <span className={cn("text-xs font-medium flex items-center gap-1", si.color)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", si.dot)} />
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

      {/* Link Student Dialog */}
      {linkDialog && (
        <LinkStudentDialog
          registro={linkDialog}
          arenaId={arenaId}
          onConfirm={(studentId, salvarAlias) => {
            updateMutation.mutate({
              id: linkDialog.id,
              data: { studentId, status: "confirmado", salvarAlias },
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

function RelatorioView({ registros, plataforma }: { registros: Registro[]; plataforma: string }) {
  const confirmados = registros.filter((r) => r.status === "confirmado");
  const totalRecebido = confirmados.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
  const totalProfessores = confirmados.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
  const totalArena = confirmados.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
  const totalCheckins = confirmados.reduce((s, r) => s + (r.checkins ?? 1), 0);

  // Group by professor
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

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Recebido", val: fmtVal(String(totalRecebido)), icon: TrendingUp, color: "text-primary" },
          { label: "Comissões Prof.", val: fmtVal(String(totalProfessores)), icon: Users, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Valor Arena", val: fmtVal(String(totalArena)), icon: Building2, color: "text-blue-600 dark:text-blue-400" },
          { label: "Total Check-ins", val: String(totalCheckins), icon: CheckCircle, color: "text-amber-600 dark:text-amber-400" },
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

      {/* Not found warning */}
      {registros.filter((r) => r.status === "nao_encontrado").length > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {registros.filter((r) => r.status === "nao_encontrado").length} alunos não encontrados
          — volte à aba Conferência para vinculá-los.
        </div>
      )}

      {/* Per-professor breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Breakdown por Professor</h3>
        {profGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro confirmado ainda.</p>
        ) : (
          profGroups.map(([key, group]) => {
            const gTotal = group.registros.reduce((s, r) => s + parseFloat(r.valor || "0"), 0);
            const gProf = group.registros.reduce((s, r) => s + parseFloat(r.valorProfessor || "0"), 0);
            const gArena = group.registros.reduce((s, r) => s + parseFloat(r.valorArena || "0"), 0);
            const gCheckins = group.registros.reduce((s, r) => s + (r.checkins ?? 1), 0);
            return (
              <Card key={key}>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {group.nome}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {group.registros.length} alunos · {gCheckins} check-ins
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  <div className="flex gap-4 text-xs">
                    <span>Total: <strong>{fmtVal(String(gTotal))}</strong></span>
                    {gProf > 0 && <span className="text-emerald-600 dark:text-emerald-400">Prof: <strong>{fmtVal(String(gProf))}</strong></span>}
                    <span className="text-blue-600 dark:text-blue-400">Arena: <strong>{fmtVal(String(gArena))}</strong></span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs h-7">Aluno</TableHead>
                        <TableHead className="text-xs h-7 text-right">Valor</TableHead>
                        <TableHead className="text-xs h-7 text-center">Chk</TableHead>
                        <TableHead className="text-xs h-7 text-center">%</TableHead>
                        <TableHead className="text-xs h-7 text-right">Prof.</TableHead>
                        <TableHead className="text-xs h-7 text-right">Arena</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.registros.map((r) => (
                        <TableRow key={r.id} className="text-xs">
                          <TableCell className="py-1 font-medium">{r.alunoNomeMatch ?? r.nomePlataforma}</TableCell>
                          <TableCell className="py-1 text-right font-mono">{fmtVal(r.valor)}</TableCell>
                          <TableCell className="py-1 text-center">{r.checkins}</TableCell>
                          <TableCell className="py-1 text-center">{r.percentual}%</TableCell>
                          <TableCell className="py-1 text-right font-mono text-emerald-600 dark:text-emerald-400">{fmtVal(r.valorProfessor)}</TableCell>
                          <TableCell className="py-1 text-right font-mono text-blue-600 dark:text-blue-400">{fmtVal(r.valorArena)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Link Student Dialog ────────────────────────────────────────────────────────

function LinkStudentDialog({
  registro,
  arenaId,
  onConfirm,
  onClose,
}: {
  registro: Registro;
  arenaId: string;
  onConfirm: (studentId: string, salvarAlias: boolean) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<string | null>(registro.studentId);
  const [salvarAlias, setSalvarAlias] = useState(true);

  const { data: alunos = [] } = useQuery<AlunoOpcao[]>({
    queryKey: ["/api/conferencia/alunos"],
  });

  const filtrados = alunos.filter((a) =>
    a.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Aluno</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Nome na plataforma: <strong className="text-foreground">{registro.nomePlataforma}</strong>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8"
              data-testid="input-busca-aluno-link"
              autoFocus
            />
          </div>
          <div className="border rounded-lg max-h-56 overflow-y-auto divide-y">
            {filtrados.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado
              </div>
            ) : (
              filtrados.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                    selected === a.id && "bg-primary/10 font-medium"
                  )}
                  data-testid={`option-aluno-${a.id}`}
                >
                  <span>{a.nome}</span>
                  {a.professorNome && (
                    <span className="text-xs text-muted-foreground ml-2">({a.professorNome})</span>
                  )}
                </button>
              ))
            )}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={salvarAlias}
              onChange={(e) => setSalvarAlias(e.target.checked)}
              className="rounded"
              data-testid="checkbox-salvar-alias"
            />
            Salvar como alias para próximas conferências
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!selected}
            onClick={() => selected && onConfirm(selected, salvarAlias)}
            data-testid="button-confirmar-link"
          >
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
