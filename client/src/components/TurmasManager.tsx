import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CalendarDays, Plus, Pencil, Trash2, Users, Clock, ChevronLeft,
  LayoutGrid, List, UserPlus, UserMinus, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DIAS = [
  { id: "seg", label: "Segunda" },
  { id: "ter", label: "Terça" },
  { id: "qua", label: "Quarta" },
  { id: "qui", label: "Quinta" },
  { id: "sex", label: "Sexta" },
  { id: "sab", label: "Sábado" },
  { id: "dom", label: "Domingo" },
];

const DIAS_SHORT: Record<string, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
};

const COR_OPTIONS = [
  "#1565C0", "#1976D2", "#0288D1", "#00838F", "#2E7D32",
  "#558B2F", "#F57F17", "#E65100", "#BF360C", "#6A1B9A",
  "#AD1457", "#37474F",
];

interface Turma {
  id: string;
  nome: string;
  modalidade: string;
  professorId?: string | null;
  professorNome?: string | null;
  diasSemana: string;
  horarioInicio: string;
  horarioFim: string;
  capacidadeMaxima: number;
  cor: string;
  ativo: boolean;
  alunosCount: number;
}

interface Professor {
  id: string;
  nome: string;
  modalidade: string;
}

interface Aluno {
  id: string;
  nome: string;
  modalidade: string;
}

interface AlunoTurma {
  id: string;
  alunoId: string;
  dataMatricula: string;
  aluno: Aluno | null;
}

interface TurmasManagerProps {
  onVoltar: () => void;
  professorContext?: { id: string; modalidade: string; nome?: string };
}

const emptyForm = {
  nome: "",
  modalidade: "",
  professorId: "",
  diasSemana: [] as string[],
  horarioInicio: "08:00",
  horarioFim: "09:00",
  capacidadeMaxima: 20,
  cor: "#1565C0",
};

export default function TurmasManager({ onVoltar, professorContext }: TurmasManagerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"calendario" | "lista">("calendario");

  // Dialogs
  const [dialogTurma, setDialogTurma] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [dialogAlunos, setDialogAlunos] = useState(false);
  const [turmaAlunos, setTurmaAlunos] = useState<Turma | null>(null);

  const [confirmExcluir, setConfirmExcluir] = useState<Turma | null>(null);

  // Data
  const { data: turmas = [], isLoading } = useQuery<Turma[]>({ queryKey: ["/api/turmas"] });
  const { data: professores = [] } = useQuery<Professor[]>({ queryKey: ["/api/professores"] });
  const { data: alunosTurma = [], isLoading: loadingAlunos } = useQuery<AlunoTurma[]>({
    queryKey: ["/api/turmas", turmaAlunos?.id, "alunos"],
    queryFn: () => fetch(`/api/turmas/${turmaAlunos!.id}/alunos`).then((r) => r.json()),
    enabled: !!turmaAlunos,
  });
  const { data: todosAlunos = [] } = useQuery<Aluno[]>({ queryKey: ["/api/alunos"] });

  // Mutations
  const criarTurma = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/turmas", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas"] }); setDialogTurma(false); toast({ title: "Turma criada!" }); },
    onError: () => toast({ title: "Erro ao criar turma", variant: "destructive" }),
  });

  const editarTurma = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/turmas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas"] }); setDialogTurma(false); toast({ title: "Turma atualizada!" }); },
    onError: () => toast({ title: "Erro ao atualizar turma", variant: "destructive" }),
  });

  const excluirTurma = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/turmas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas"] }); setConfirmExcluir(null); toast({ title: "Turma excluída" }); },
    onError: () => toast({ title: "Erro ao excluir turma", variant: "destructive" }),
  });

  const matricularAluno = useMutation({
    mutationFn: ({ turmaId, alunoId }: { turmaId: string; alunoId: string }) =>
      apiRequest("POST", `/api/turmas/${turmaId}/alunos`, { alunoId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas", turmaAlunos?.id, "alunos"] }); qc.invalidateQueries({ queryKey: ["/api/turmas"] }); toast({ title: "Aluno matriculado!" }); },
    onError: () => toast({ title: "Erro ao matricular aluno", variant: "destructive" }),
  });

  const removerAluno = useMutation({
    mutationFn: ({ turmaId, alunoId }: { turmaId: string; alunoId: string }) =>
      apiRequest("DELETE", `/api/turmas/${turmaId}/alunos/${alunoId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas", turmaAlunos?.id, "alunos"] }); qc.invalidateQueries({ queryKey: ["/api/turmas"] }); toast({ title: "Aluno removido" }); },
    onError: () => toast({ title: "Erro ao remover aluno", variant: "destructive" }),
  });

  // Helpers
  const openNova = (diaPre?: string) => {
    setEditandoId(null);
    setFormData({
      ...emptyForm,
      diasSemana: diaPre ? [diaPre] : [],
      modalidade: professorContext?.modalidade ?? "",
      professorId: professorContext?.id ?? "",
    });
    setDialogTurma(true);
  };

  const openEditar = (t: Turma) => {
    setEditandoId(t.id);
    setFormData({
      nome: t.nome,
      modalidade: t.modalidade,
      professorId: t.professorId ?? "",
      diasSemana: t.diasSemana ? t.diasSemana.split("|").filter(Boolean) : [],
      horarioInicio: t.horarioInicio,
      horarioFim: t.horarioFim,
      capacidadeMaxima: t.capacidadeMaxima,
      cor: t.cor,
    });
    setDialogTurma(true);
  };

  const toggleDia = (dia: string) => {
    setFormData((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia],
    }));
  };

  const handleSalvar = () => {
    if (!formData.nome || !formData.modalidade || !formData.horarioInicio || !formData.horarioFim || formData.diasSemana.length === 0) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      ...formData,
      professorId: formData.professorId || null,
      diasSemana: formData.diasSemana.join("|"),
    };
    if (editandoId) {
      editarTurma.mutate({ id: editandoId, data: payload });
    } else {
      criarTurma.mutate(payload);
    }
  };

  const alunosDaTurma = new Set(alunosTurma.map((e) => e.alunoId));
  const alunosDisponiveis = todosAlunos.filter(
    (a) => a.modalidade === turmaAlunos?.modalidade && !alunosDaTurma.has(a.id)
  );

  // Calendar view helpers
  const turmasPorDia = (dia: string) =>
    turmas.filter((t) => t.diasSemana.split("|").includes(dia));

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onVoltar} data-testid="button-voltar-agenda">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Agenda</h1>
              {professorContext?.nome && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{professorContext.nome}</p>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => openNova()} data-testid="button-nova-turma" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-10 px-4">
          <Plus className="h-4 w-4" />
          Nova Turma
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />Carregando turmas...
          </div>
        ) : turmas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-1">Nenhuma turma cadastrada</p>
            <p className="text-sm text-gray-400 mb-4">Crie sua primeira turma para organizar horários e alunos.</p>
            <Button onClick={() => openNova()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-10 px-4">
              <Plus className="h-4 w-4" />Nova Turma
            </Button>
          </div>
        ) : view === "calendario" ? (
          /* CALENDAR GRID */
          <div className="grid grid-cols-7 gap-3 min-w-[700px]">
            {DIAS.map((dia) => (
              <div key={dia.id} className="flex flex-col gap-2">
                <div className="text-center">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {dia.label}
                  </span>
                </div>
                <div className="flex flex-col gap-2 min-h-[120px]">
                  {turmasPorDia(dia.id).length === 0 ? (
                    <div
                      className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 h-16 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                      onClick={() => openNova(dia.id)}
                      title={`Adicionar aula na ${dia.label}`}
                      data-testid={`dia-vazio-${dia.id}`}
                    >
                      <Plus className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                    </div>
                  ) : (
                    turmasPorDia(dia.id).map((t) => (
                      <div
                        key={`${dia.id}-${t.id}`}
                        data-testid={`turma-card-${t.id}-${dia.id}`}
                        className="rounded-lg p-2.5 text-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: t.cor }}
                        onClick={() => { setTurmaAlunos(t); setDialogAlunos(true); }}
                      >
                        <p className="font-semibold text-xs leading-tight truncate">{t.nome}</p>
                        <p className="text-[11px] opacity-90 mt-0.5">{t.horarioInicio}–{t.horarioFim}</p>
                        {t.professorNome && (
                          <p className="text-[10px] opacity-80 truncate mt-0.5">{t.professorNome}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5">
                          <Users className="h-2.5 w-2.5 opacity-80" />
                          <span className="text-[10px] opacity-90">{t.alunosCount}/{t.capacidadeMaxima}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-3 max-w-4xl">
            {turmas.map((t) => (
              <Card key={t.id} data-testid={`turma-row-${t.id}`} className="bg-white dark:bg-gray-800 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-white">{t.nome}</p>
                          <Badge variant="outline" className="text-xs">{t.modalidade}</Badge>
                          {!t.ativo && <Badge variant="destructive" className="text-xs">Inativa</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {t.diasSemana.split("|").filter(Boolean).map((d) => DIAS_SHORT[d] ?? d).join(", ")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {t.horarioInicio}–{t.horarioFim}
                          </span>
                          {t.professorNome && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />{t.professorNome}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {t.alunosCount}/{t.capacidadeMaxima} alunos
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline" size="sm"
                        data-testid={`button-alunos-${t.id}`}
                        onClick={() => { setTurmaAlunos(t); setDialogAlunos(true); }}
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />Alunos
                      </Button>
                      <Button
                        variant="outline" size="icon"
                        data-testid={`button-editar-${t.id}`}
                        onClick={() => openEditar(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline" size="icon"
                        data-testid={`button-excluir-${t.id}`}
                        onClick={() => setConfirmExcluir(t)}
                        className="text-red-500 hover:text-red-600 hover:border-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog: Criar / Editar Turma */}
      <Dialog open={dialogTurma} onOpenChange={setDialogTurma}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Turma" : "Nova Turma"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="turma-nome">Nome da turma *</Label>
              <Input
                id="turma-nome"
                data-testid="input-turma-nome"
                placeholder="Ex: Beach Tennis Avançado"
                value={formData.nome}
                onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Modalidade *</Label>
                <Input
                  data-testid="input-turma-modalidade"
                  placeholder="Beach Tennis, Funcional..."
                  value={formData.modalidade}
                  onChange={(e) => setFormData((p) => ({ ...p, modalidade: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Professor</Label>
                <Select value={formData.professorId} onValueChange={(v) => setFormData((p) => ({ ...p, professorId: v === "_none" ? "" : v }))}>
                  <SelectTrigger data-testid="select-turma-professor">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sem professor</SelectItem>
                    {professores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias da semana *</Label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((dia) => (
                  <button
                    key={dia.id}
                    type="button"
                    data-testid={`button-dia-${dia.id}`}
                    onClick={() => toggleDia(dia.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      formData.diasSemana.includes(dia.id)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400"
                    }`}
                  >
                    {DIAS_SHORT[dia.id]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="turma-inicio">Horário início *</Label>
                <Input
                  id="turma-inicio"
                  type="time"
                  data-testid="input-turma-inicio"
                  value={formData.horarioInicio}
                  onChange={(e) => setFormData((p) => ({ ...p, horarioInicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="turma-fim">Horário fim *</Label>
                <Input
                  id="turma-fim"
                  type="time"
                  data-testid="input-turma-fim"
                  value={formData.horarioFim}
                  onChange={(e) => setFormData((p) => ({ ...p, horarioFim: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Capacidade máxima</Label>
              <Input
                type="number"
                min={1}
                max={200}
                data-testid="input-turma-capacidade"
                value={formData.capacidadeMaxima}
                onChange={(e) => setFormData((p) => ({ ...p, capacidadeMaxima: parseInt(e.target.value) || 20 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor na agenda</Label>
              <div className="flex flex-wrap gap-2">
                {COR_OPTIONS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    data-testid={`button-cor-${cor}`}
                    onClick={() => setFormData((p) => ({ ...p, cor }))}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${formData.cor === cor ? "ring-2 ring-offset-2 ring-gray-500 scale-110" : ""}`}
                    style={{ backgroundColor: cor }}
                    title={cor}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTurma(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              disabled={criarTurma.isPending || editarTurma.isPending}
              data-testid="button-salvar-turma"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {criarTurma.isPending || editarTurma.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Alunos da Turma */}
      <Dialog open={dialogAlunos} onOpenChange={(open) => { setDialogAlunos(open); if (!open) setTurmaAlunos(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          {turmaAlunos && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: turmaAlunos.cor }}
                      />
                      {turmaAlunos.nome}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {turmaAlunos.diasSemana.split("|").filter(Boolean).map((d) => DIAS_SHORT[d] ?? d).join(", ")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {turmaAlunos.horarioInicio}–{turmaAlunos.horarioFim}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditar(turmaAlunos)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline" size="icon"
                      className="text-red-500 hover:border-red-300"
                      onClick={() => { setDialogAlunos(false); setConfirmExcluir(turmaAlunos); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-auto space-y-4 py-2">
                {/* Enrolled students */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Alunos matriculados ({alunosTurma.length}/{turmaAlunos.capacidadeMaxima})
                    </h3>
                    <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${Math.min(100, (alunosTurma.length / turmaAlunos.capacidadeMaxima) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {loadingAlunos ? (
                    <p className="text-sm text-gray-400 py-2">Carregando...</p>
                  ) : alunosTurma.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-2">Nenhum aluno matriculado ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {alunosTurma.map((e) => (
                        <div
                          key={e.id}
                          data-testid={`aluno-matriculado-${e.alunoId}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{e.aluno?.nome ?? "—"}</p>
                            <p className="text-xs text-gray-500">Desde {e.dataMatricula}</p>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            data-testid={`button-remover-aluno-${e.alunoId}`}
                            className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => removerAluno.mutate({ turmaId: turmaAlunos.id, alunoId: e.alunoId })}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add student */}
                {alunosDisponiveis.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Adicionar aluno ({turmaAlunos.modalidade})
                    </h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {alunosDisponiveis.map((a) => (
                        <div
                          key={a.id}
                          data-testid={`aluno-disponivel-${a.id}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                          <p className="text-sm text-gray-800 dark:text-gray-200">{a.nome}</p>
                          <Button
                            variant="outline" size="sm"
                            data-testid={`button-matricular-${a.id}`}
                            disabled={matricularAluno.isPending}
                            className="h-7 text-xs gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => matricularAluno.mutate({ turmaId: turmaAlunos.id, alunoId: a.id })}
                          >
                            <UserPlus className="h-3 w-3" />Matricular
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {alunosDisponiveis.length === 0 && alunosTurma.length > 0 && (
                  <p className="text-sm text-gray-400 italic">Todos os alunos da modalidade já estão matriculados.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!confirmExcluir} onOpenChange={(open) => !open && setConfirmExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a turma <strong>{confirmExcluir?.nome}</strong>? Todas as matrículas serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => confirmExcluir && excluirTurma.mutate(confirmExcluir.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
