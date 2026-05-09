import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Link2, CalendarDays, Building2,
} from "lucide-react";

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TIPO_COLORS: Record<string, string> = {
  aluguel: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  dayuse: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  bloqueio: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
};
const TIPO_LABEL: Record<string, string> = {
  aluguel: "Aluguel",
  dayuse: "Day-use",
  bloqueio: "Bloqueio",
};
const COR_OPCOES = [
  { label: "Azul", value: "#3b82f6" },
  { label: "Verde", value: "#22c55e" },
  { label: "Laranja", value: "#f97316" },
  { label: "Roxo", value: "#a855f7" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Vermelho", value: "#ef4444" },
  { label: "Cinza", value: "#6b7280" },
];

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface QuadrasManagerProps {
  arenaId: string;
  arenaName?: string;
}

export default function QuadrasManager({ arenaId }: QuadrasManagerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [view, setView] = useState<"quadras" | "reservas">("quadras");
  const [quadraReservas, setQuadraReservas] = useState<any | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Ambientes state
  const [novoAmbienteNome, setNovoAmbienteNome] = useState("");
  const [editandoAmbienteId, setEditandoAmbienteId] = useState<string | null>(null);
  const [editandoAmbienteNome, setEditandoAmbienteNome] = useState("");
  const [confirmDeleteAmbiente, setConfirmDeleteAmbiente] = useState<any | null>(null);

  // Quadras CRUD state
  const [dialogQuadra, setDialogQuadra] = useState(false);
  const [quadraEditando, setQuadraEditando] = useState<any | null>(null);
  const [formQuadra, setFormQuadra] = useState({ nome: "", descricao: "", cor: "#3b82f6" });
  const [confirmDeleteQuadra, setConfirmDeleteQuadra] = useState<any | null>(null);

  // Reservas CRUD state
  const [dialogReserva, setDialogReserva] = useState(false);
  const [reservaEditando, setReservaEditando] = useState<any | null>(null);
  const [formReserva, setFormReserva] = useState({
    quadraId: "", tipo: "aluguel", data: "", horaInicio: "08:00", horaFim: "09:00",
    nomeCliente: "", telefoneCliente: "", valor: "", status: "confirmado", observacao: "",
  });
  const [confirmDeleteReserva, setConfirmDeleteReserva] = useState<any | null>(null);

  // Queries
  const { data: quadrasList = [] } = useQuery<any[]>({ queryKey: ["/api/quadras"] });
  const { data: reservasList = [] } = useQuery<any[]>({ queryKey: ["/api/reservas"] });
  const { data: ambientesList = [] } = useQuery<any[]>({ queryKey: ["/api/recursos"] });

  // Ambientes mutations
  const criarAmbiente = useMutation({
    mutationFn: (nome: string) => apiRequest("POST", "/api/recursos", { nome, ativo: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recursos"] }); setNovoAmbienteNome(""); toast({ title: "Ambiente criado!" }); },
    onError: () => toast({ title: "Erro ao criar ambiente", variant: "destructive" }),
  });
  const atualizarAmbiente = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => apiRequest("PUT", `/api/recursos/${id}`, { nome, ativo: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recursos"] }); setEditandoAmbienteId(null); setEditandoAmbienteNome(""); toast({ title: "Ambiente atualizado!" }); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });
  const removerAmbiente = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/recursos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recursos"] }); setConfirmDeleteAmbiente(null); toast({ title: "Ambiente removido." }); },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  // Quadras mutations
  const criarQuadra = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/quadras", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/quadras"] }); setDialogQuadra(false); toast({ title: "Quadra criada!" }); },
    onError: () => toast({ title: "Erro", variant: "destructive" }),
  });
  const editarQuadra = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/quadras/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/quadras"] }); setDialogQuadra(false); setQuadraEditando(null); toast({ title: "Quadra atualizada!" }); },
    onError: () => toast({ title: "Erro", variant: "destructive" }),
  });
  const deletarQuadra = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/quadras/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/quadras"] }); setConfirmDeleteQuadra(null); toast({ title: "Quadra removida." }); },
    onError: () => toast({ title: "Erro", variant: "destructive" }),
  });

  // Reservas mutations
  const criarReserva = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/reservas", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reservas"] }); setDialogReserva(false); toast({ title: "Reserva criada!" }); },
    onError: () => toast({ title: "Erro ao criar reserva.", variant: "destructive" }),
  });
  const editarReserva = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/reservas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reservas"] }); setDialogReserva(false); setReservaEditando(null); toast({ title: "Reserva atualizada!" }); },
    onError: () => toast({ title: "Erro ao atualizar.", variant: "destructive" }),
  });
  const deletarReserva = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/reservas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/reservas"] }); setConfirmDeleteReserva(null); toast({ title: "Reserva removida." }); },
    onError: () => toast({ title: "Erro ao remover.", variant: "destructive" }),
  });

  const today = new Date();
  const weekStart = addDays(startOfWeek(today), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const reservasPorDia = (quadraId: string, data: string) =>
    (reservasList as any[]).filter((r) => r.quadraId === quadraId && r.data === data && r.status !== "cancelado");

  const publicUrl = `${window.location.origin}/arena/${arenaId}/quadras`;

  function abrirNovaReserva(quadraId?: string, data?: string) {
    const iso = data || toISO(today);
    setReservaEditando(null);
    setFormReserva({ quadraId: quadraId || (quadrasList[0]?.id ?? ""), tipo: "aluguel", data: iso, horaInicio: "08:00", horaFim: "09:00", nomeCliente: "", telefoneCliente: "", valor: "", status: "confirmado", observacao: "" });
    setDialogReserva(true);
  }

  const quadrasAtivas = (quadrasList as any[]).filter((q) => q.ativo);
  const ambientesAtivos = (ambientesList as any[]).filter((a) => a.ativo);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">

      {/* ── VIEW: Reservas de uma Quadra ── */}
      {view === "reservas" && quadraReservas && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="ghost" className="gap-1 pl-0 text-muted-foreground hover:text-foreground"
              onClick={() => { setView("quadras"); setQuadraReservas(null); }}>
              <ChevronLeft className="h-4 w-4" /> Quadras
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: quadraReservas.cor }} />
              <span className="font-semibold text-sm">{quadraReservas.nome}</span>
            </div>
            <Button size="sm" className="ml-auto gap-1" onClick={() => abrirNovaReserva(quadraReservas.id)}>
              <Plus className="h-4 w-4" /> Nova Reserva
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {weekDays[0].toLocaleDateString("pt-BR")} — {weekDays[6].toLocaleDateString("pt-BR")}
            </span>
            <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="grid min-w-[560px]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                {weekDays.map((day, i) => {
                  const iso = toISO(day);
                  const isToday = iso === toISO(today);
                  const reservas = reservasPorDia(quadraReservas.id, iso);
                  return (
                    <div key={i}
                      className={`border-r last:border-r-0 min-h-[100px] cursor-pointer hover:bg-muted/30 transition-colors ${isToday ? "bg-primary/5" : ""}`}
                      onClick={() => abrirNovaReserva(quadraReservas.id, iso)}>
                      <div className={`text-center text-xs py-1.5 border-b font-medium ${isToday ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                        <div>{DIAS_PT[day.getDay()]}</div>
                        <div className="text-sm font-bold">{day.getDate()}</div>
                      </div>
                      <div className="p-1 space-y-0.5">
                        {reservas.map((r: any) => (
                          <div
                            key={r.id}
                            className={`rounded px-1 py-0.5 text-[10px] border leading-tight cursor-pointer ${TIPO_COLORS[r.tipo] ?? "bg-muted text-foreground border-border"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReservaEditando(r);
                              setFormReserva({ quadraId: r.quadraId, tipo: r.tipo, data: r.data, horaInicio: r.horaInicio, horaFim: r.horaFim, nomeCliente: r.nomeCliente ?? "", telefoneCliente: r.telefoneCliente ?? "", valor: r.valor ?? "", status: r.status, observacao: r.observacao ?? "" });
                              setDialogReserva(true);
                            }}
                          >
                            <div className="font-semibold">{r.horaInicio}–{r.horaFim}</div>
                            <div className="truncate">{TIPO_LABEL[r.tipo] ?? r.tipo}{r.nomeCliente ? ` · ${r.nomeCliente}` : ""}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── VIEW: Quadras + Ambientes (página principal) ── */}
      {view === "quadras" && (
        <>
          {/* Topo: ações */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => window.open(publicUrl, "_blank")} data-testid="button-link-publico">
                <Link2 className="h-4 w-4 mr-1" /> Link Público
              </Button>
            </div>
          </div>

          {/* ── Lista de Quadras (só mostra se houver alguma) ── */}
          {quadrasAtivas.length > 0 && (
            <div className="space-y-3">
              {quadrasAtivas.map((q: any) => (
                <Card key={q.id} className="overflow-hidden" style={{ borderLeftColor: q.cor, borderLeftWidth: 4 }}>
                  <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: q.cor }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{q.nome}</p>
                      {q.descricao && <p className="text-xs text-muted-foreground">{q.descricao}</p>}
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 dark:bg-green-950/20 dark:text-green-400">Ativa</Badge>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                        onClick={() => { setQuadraReservas(q); setWeekOffset(0); setView("reservas"); }}
                        data-testid={`button-reservas-quadra-${q.id}`}>
                        <CalendarDays className="h-3.5 w-3.5" /> Reservas
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                        onClick={() => { setQuadraEditando(q); setFormQuadra({ nome: q.nome, descricao: q.descricao ?? "", cor: q.cor }); setDialogQuadra(true); }}
                        data-testid={`button-editar-quadra-${q.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDeleteQuadra(q)}
                        data-testid={`button-deletar-quadra-${q.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* ── Seção Ambientes ── */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" /> Ambientes para Aulas
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Espaços usados para vincular turmas e aulas dos professores.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={novoAmbienteNome}
                onChange={(e) => setNovoAmbienteNome(e.target.value)}
                placeholder="Nome do ambiente (ex: Quadra 1, Box A, Sala de Treino)"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-novo-ambiente"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const nome = novoAmbienteNome.trim();
                    if (nome) criarAmbiente.mutate(nome);
                  }
                }}
              />
              <Button
                onClick={() => { const nome = novoAmbienteNome.trim(); if (nome) criarAmbiente.mutate(nome); }}
                disabled={criarAmbiente.isPending || !novoAmbienteNome.trim()}
                data-testid="button-criar-ambiente"
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>

            {ambientesAtivos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum ambiente cadastrado. Adicione acima para criar seu primeiro espaço de aula.
              </div>
            ) : (
              <div className="space-y-2">
                {ambientesAtivos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-sm">
                    {editandoAmbienteId === a.id ? (
                      <input
                        type="text"
                        value={editandoAmbienteNome}
                        onChange={(e) => setEditandoAmbienteNome(e.target.value)}
                        className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        data-testid={`input-editar-ambiente-${a.id}`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const nome = editandoAmbienteNome.trim();
                            if (nome) atualizarAmbiente.mutate({ id: a.id, nome });
                          }
                          if (e.key === "Escape") { setEditandoAmbienteId(null); setEditandoAmbienteNome(""); }
                        }}
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium">{a.nome}</span>
                    )}
                    {editandoAmbienteId === a.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => { const nome = editandoAmbienteNome.trim(); if (nome) atualizarAmbiente.mutate({ id: a.id, nome }); }}
                          disabled={atualizarAmbiente.isPending}
                          data-testid={`button-salvar-ambiente-${a.id}`}
                        >
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditandoAmbienteId(null); setEditandoAmbienteNome(""); }}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => { setEditandoAmbienteId(a.id); setEditandoAmbienteNome(a.nome); }}
                          data-testid={`button-editar-ambiente-${a.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => setConfirmDeleteAmbiente(a)}
                          data-testid={`button-excluir-ambiente-${a.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Dialog: Quadra */}
      <Dialog open={dialogQuadra} onOpenChange={(open) => { if (!open) { setDialogQuadra(false); setQuadraEditando(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{quadraEditando ? "Editar Quadra" : "Nova Quadra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input placeholder="Ex: Quadra 1 — Beach Tennis" value={formQuadra.nome} onChange={(e) => setFormQuadra({ ...formQuadra, nome: e.target.value })} data-testid="input-quadra-nome" />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input placeholder="Ex: Areia, coberta" value={formQuadra.descricao} onChange={(e) => setFormQuadra({ ...formQuadra, descricao: e.target.value })} data-testid="input-quadra-descricao" />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <Select value={formQuadra.cor} onValueChange={(v) => setFormQuadra({ ...formQuadra, cor: v })}>
                <SelectTrigger data-testid="select-quadra-cor">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: formQuadra.cor }} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COR_OPCOES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.value }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {quadraEditando && (
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value="ativo" onValueChange={() => {}}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativa</SelectItem>
                    <SelectItem value="inativo">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogQuadra(false); setQuadraEditando(null); }}>Cancelar</Button>
            <Button
              disabled={!formQuadra.nome || criarQuadra.isPending || editarQuadra.isPending}
              data-testid="button-confirm-quadra"
              onClick={() => {
                const payload = { nome: formQuadra.nome, descricao: formQuadra.descricao || null, cor: formQuadra.cor };
                if (quadraEditando) editarQuadra.mutate({ id: quadraEditando.id, data: payload });
                else criarQuadra.mutate(payload);
              }}
            >
              {criarQuadra.isPending || editarQuadra.isPending ? "Salvando..." : quadraEditando ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reserva */}
      <Dialog open={dialogReserva} onOpenChange={(open) => { if (!open) { setDialogReserva(false); setReservaEditando(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{reservaEditando ? "Editar Reserva" : "Nova Reserva"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Quadra <span className="text-destructive">*</span></Label>
              <Select value={formReserva.quadraId} onValueChange={(v) => setFormReserva({ ...formReserva, quadraId: v })}>
                <SelectTrigger data-testid="select-reserva-quadra"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {quadrasAtivas.map((q: any) => (
                    <SelectItem key={q.id} value={q.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: q.cor }} />
                        {q.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <Select value={formReserva.tipo} onValueChange={(v) => setFormReserva({ ...formReserva, tipo: v })}>
                  <SelectTrigger data-testid="select-reserva-tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="dayuse">Day-use</SelectItem>
                    <SelectItem value="bloqueio">Bloqueio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={formReserva.status} onValueChange={(v) => setFormReserva({ ...formReserva, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input type="date" value={formReserva.data} onChange={(e) => setFormReserva({ ...formReserva, data: e.target.value })} data-testid="input-reserva-data" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Início <span className="text-destructive">*</span></Label>
                <Input type="time" value={formReserva.horaInicio} onChange={(e) => setFormReserva({ ...formReserva, horaInicio: e.target.value })} data-testid="input-reserva-inicio" />
              </div>
              <div className="space-y-1">
                <Label>Fim <span className="text-destructive">*</span></Label>
                <Input type="time" value={formReserva.horaFim} onChange={(e) => setFormReserva({ ...formReserva, horaFim: e.target.value })} data-testid="input-reserva-fim" />
              </div>
            </div>
            {formReserva.tipo !== "bloqueio" && (
              <>
                <div className="space-y-1">
                  <Label>Nome do cliente</Label>
                  <Input placeholder="Nome completo" value={formReserva.nomeCliente} onChange={(e) => setFormReserva({ ...formReserva, nomeCliente: e.target.value })} data-testid="input-reserva-cliente" />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input placeholder="(00) 00000-0000" value={formReserva.telefoneCliente} onChange={(e) => setFormReserva({ ...formReserva, telefoneCliente: e.target.value })} data-testid="input-reserva-telefone" />
                </div>
                <div className="space-y-1">
                  <Label>Valor (R$)</Label>
                  <Input placeholder="Ex: 80,00" value={formReserva.valor} onChange={(e) => setFormReserva({ ...formReserva, valor: e.target.value })} data-testid="input-reserva-valor" />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea placeholder="Observações opcionais..." value={formReserva.observacao} onChange={(e) => setFormReserva({ ...formReserva, observacao: e.target.value })} className="resize-none h-16" data-testid="input-reserva-obs" />
            </div>
          </div>
          <DialogFooter>
            {reservaEditando && (
              <Button variant="destructive" size="sm" className="mr-auto" onClick={() => { setDialogReserva(false); setConfirmDeleteReserva(reservaEditando); }} data-testid="button-delete-reserva">
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => { setDialogReserva(false); setReservaEditando(null); }}>Cancelar</Button>
            <Button
              disabled={!formReserva.quadraId || !formReserva.data || !formReserva.horaInicio || !formReserva.horaFim || criarReserva.isPending || editarReserva.isPending}
              data-testid="button-confirm-reserva"
              onClick={() => {
                const payload = {
                  quadraId: formReserva.quadraId, tipo: formReserva.tipo, data: formReserva.data,
                  horaInicio: formReserva.horaInicio, horaFim: formReserva.horaFim,
                  nomeCliente: formReserva.nomeCliente || null, telefoneCliente: formReserva.telefoneCliente || null,
                  valor: formReserva.valor || null, status: formReserva.status, observacao: formReserva.observacao || null,
                };
                if (reservaEditando) editarReserva.mutate({ id: reservaEditando.id, data: payload });
                else criarReserva.mutate(payload);
              }}
            >
              {criarReserva.isPending || editarReserva.isPending ? "Salvando..." : reservaEditando ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar excluir Quadra */}
      <Dialog open={!!confirmDeleteQuadra} onOpenChange={(open) => { if (!open) setConfirmDeleteQuadra(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Quadra</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover <strong>{confirmDeleteQuadra?.nome}</strong>? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteQuadra(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (confirmDeleteQuadra) deletarQuadra.mutate(confirmDeleteQuadra.id); }} disabled={deletarQuadra.isPending} data-testid="button-confirm-delete-quadra">
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar excluir Reserva */}
      <Dialog open={!!confirmDeleteReserva} onOpenChange={(open) => { if (!open) setConfirmDeleteReserva(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Reserva</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover esta reserva?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteReserva(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (confirmDeleteReserva) deletarReserva.mutate(confirmDeleteReserva.id); }} disabled={deletarReserva.isPending} data-testid="button-confirm-delete-reserva">
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar excluir Ambiente */}
      <Dialog open={!!confirmDeleteAmbiente} onOpenChange={(open) => { if (!open) setConfirmDeleteAmbiente(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Ambiente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja remover <strong>{confirmDeleteAmbiente?.nome}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAmbiente(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (confirmDeleteAmbiente) removerAmbiente.mutate(confirmDeleteAmbiente.id); }} disabled={removerAmbiente.isPending} data-testid="button-confirm-delete-ambiente">
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
