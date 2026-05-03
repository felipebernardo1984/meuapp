import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Plus, Pencil, Trash2, Users, Clock, ChevronLeft,
  ChevronRight, LayoutGrid, List, Calendar, UserPlus, UserMinus, RefreshCw,
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

// Maps JS getDay() (0=Sun..6=Sat) to our DIAS id
const JS_DAY_TO_ID: Record<number, string> = {
  0: "dom",
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sab",
};

// Week header order starting Monday (Brazilian standard)
const WEEK_HEADER = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEK_HEADER_IDS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

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
  recursoId?: string | null;
  recursoNome?: string | null;
  diasSemana: string;
  horarioInicio: string;
  horarioFim: string;
  dataAula?: string | null;
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

interface ModalidadeSetting {
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
  recursoId: "",
  diasSemana: [] as string[],
  horarioInicio: "08:00",
  horarioFim: "09:00",
  capacidadeMaxima: 20,
  cor: "#1565C0",
};

type ViewMode = "mensal" | "semanal" | "lista";

type DaySlot = {
  date: string;
  horarioInicio: string;
  horarioFim: string;
  professorId?: string | null;
};

export default function TurmasManager({ onVoltar, professorContext }: TurmasManagerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<ViewMode>("mensal");

  // Monthly calendar navigation
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  // Dialogs
  const [dialogTurma, setDialogTurma] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [dialogAlunos, setDialogAlunos] = useState(false);
  const [turmaAlunos, setTurmaAlunos] = useState<Turma | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<Turma | null>(null);

  // Popup for a clicked day
  const [diaPopup, setDiaPopup] = useState<{ date: Date; turmas: Turma[] } | null>(null);
  const [slotPopup, setSlotPopup] = useState<{ date: Date; horarioInicio: string; horarioFim: string } | null>(null);
  const [slotHorarioInicio, setSlotHorarioInicio] = useState("08:00");
  const [slotHorarioFim, setSlotHorarioFim] = useState("09:00");

  // Data
  const { data: turmas = [], isLoading } = useQuery<Turma[]>({ queryKey: ["/api/turmas"] });
  const { data: professores = [] } = useQuery<Professor[]>({ queryKey: ["/api/professores"] });
  const { data: modalidades = [] } = useQuery<ModalidadeSetting[]>({ queryKey: ["/api/configuracoes/modalidades"] });
  const { data: recursos = [] } = useQuery<{ id: string; nome: string; ativo: boolean }[]>({ queryKey: ["/api/recursos"] });
  const { data: alunosTurma = [], isLoading: loadingAlunos } = useQuery<AlunoTurma[]>({
    queryKey: ["/api/turmas", turmaAlunos?.id, "alunos"],
    queryFn: () => fetch(`/api/turmas/${turmaAlunos!.id}/alunos`).then((r) => r.json()),
    enabled: !!turmaAlunos,
  });
  const { data: todosAlunos = [] } = useQuery<Aluno[]>({ queryKey: ["/api/alunos"] });

  // Mutations
  const criarTurma = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/turmas", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas"] }); setDialogTurma(false); setSlotPopup(null); toast({ title: "Aula criada!" }); },
    onError: () => toast({ title: "Erro ao criar aula", variant: "destructive" }),
  });

  const editarTurma = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/turmas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas"] }); setDialogTurma(false); setSlotPopup(null); toast({ title: "Aula atualizada!" }); },
    onError: () => toast({ title: "Erro ao atualizar aula", variant: "destructive" }),
  });

  const excluirTurma = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/turmas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/turmas"] }); setConfirmExcluir(null); toast({ title: "Aula excluída" }); },
    onError: () => toast({ title: "Erro ao excluir aula", variant: "destructive" }),
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
    setSlotHorarioInicio(emptyForm.horarioInicio);
    setSlotHorarioFim(emptyForm.horarioFim);
    setDialogTurma(true);
  };

  const openEditar = (t: Turma) => {
    setEditandoId(t.id);
    setFormData({
      nome: t.nome,
      modalidade: t.modalidade,
      professorId: t.professorId ?? "",
      recursoId: t.recursoId ?? "",
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

  const handleSalvar = async () => {
    if (!formData.nome || !formData.modalidade || !formData.horarioInicio || !formData.horarioFim || formData.diasSemana.length === 0) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const dataAula = slotPopup ? slotPopup.date.toISOString().slice(0, 10) : undefined;
    const payload = {
      ...formData,
      professorId: formData.professorId || null,
      recursoId: formData.recursoId || null,
      diasSemana: formData.diasSemana.join("|"),
      ...(dataAula ? { dataAula } : {}),
    };
    if (editandoId) {
      await editarTurma.mutateAsync({ id: editandoId, data: payload });
    } else {
      await criarTurma.mutateAsync(payload);
    }
  };

  const alunosDaTurma = new Set(alunosTurma.map((e) => e.alunoId));
  const alunosDisponiveis = todosAlunos.filter(
    (a) => a.modalidade === turmaAlunos?.modalidade && !alunosDaTurma.has(a.id)
  );

  // Weekly view helper
  const turmasPorDia = (dia: string) =>
    turmas.filter((t) => t.diasSemana.split("|").includes(dia));

  const turmasNoHorario = (dataIso: string, inicio: string, fim: string) =>
    turmas.filter((t) => {
      if (!t.dataAula) return false;
      return t.dataAula === dataIso && !(fim <= t.horarioInicio || inicio >= t.horarioFim);
    });

  // ── Monthly calendar helpers ──────────────────────────────────────────────
  const calDays = useMemo(() => {
    // Get all days in the month
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);

    // Offset so Monday is column 0
    // JS: 0=Sun,1=Mon...6=Sat → we want Mon=0...Sun=6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(calYear, calMonth, d));
    // Pad to complete last week
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const turmasForDate = (date: Date): Turma[] => {
    const dayId = JS_DAY_TO_ID[date.getDay()];
    return turmas.filter((t) => t.diasSemana.split("|").includes(dayId));
  };

  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const toISODate = (date: Date) => date.toISOString().slice(0, 10);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onVoltar} data-testid="button-voltar-agenda">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Agenda</h1>
            {professorContext?.nome && (
              <p className="text-xs text-gray-500 dark:text-gray-400 break-words">{professorContext.nome}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />Carregando horários de aulas...
          </div>
        ) : (
          <>
            {/* View toggle + Horário de Aulas */}
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={view === "mensal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("mensal")}
                  data-testid="button-view-mensal"
                  className="h-9 px-3 gap-1.5"
                >
                  <Calendar className="h-4 w-4" />
                  Mensal
                </Button>
                <Button
                  variant={view === "semanal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("semanal")}
                  data-testid="button-view-semanal"
                  className="h-9 px-3 gap-1.5"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Semanal
                </Button>
                <Button
                  variant={view === "lista" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("lista")}
                  data-testid="button-view-lista"
                  className="h-9 px-3 gap-1.5"
                >
                  <List className="h-4 w-4" />
                  Lista
                </Button>
              </div>
              <Button
                onClick={() => openNova()}
                data-testid="button-horario-aula"
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white w-full h-14 text-lg gap-1.5 justify-center"
              >
                <Plus className="h-5 w-5" />
                Horário de Aulas
              </Button>
            </div>

            {view === "mensal" ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700">
                  <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-mes-anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    {MESES[calMonth]} {calYear}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-proximo-mes">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
                  {WEEK_HEADER.map((h) => (
                    <div key={h} className="py-2 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {h}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 min-h-[70vh] overflow-x-auto">
                  {calDays.map((date, idx) => {
                    const turmasDia = date ? turmasForDate(date) : [];
                    const hoje = date ? isToday(date) : false;
                    return (
                      <div
                        key={idx}
                        data-testid={date ? `cal-dia-${date.getDate()}` : `cal-vazio-${idx}`}
                        onClick={() => {
                          if (!date) return;
                          if (turmasDia.length > 0) setDiaPopup({ date, turmas: turmasDia });
                          else setSlotPopup({ date, horarioInicio: slotHorarioInicio, horarioFim: slotHorarioFim });
                        }}
                        className={`min-h-[88px] sm:min-h-[120px] p-1.5 sm:p-2 border-b border-r border-gray-100 dark:border-gray-700 ${
                          date ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10" : "bg-gray-50 dark:bg-gray-900/30"
                        } ${idx % 7 === 6 ? "border-r-0" : ""}`}
                      >
                        {date && (
                          <>
                            <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-sm font-medium mb-1 ${
                              hoje ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300"
                            }`}>
                              {date.getDate()}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {turmasDia.slice(0, 4).map((t) => (
                                <div
                                  key={t.id}
                                  className="rounded px-1 py-0.5 text-white text-[9px] sm:text-[10px] font-medium truncate leading-tight"
                                  style={{ backgroundColor: t.cor }}
                                  title={`${t.nome} ${t.horarioInicio}–${t.horarioFim}`}
                                >
                                  {t.nome}
                                </div>
                              ))}
                              {turmasDia.length === 0 && (
                                <div className="text-[9px] sm:text-[10px] text-gray-300 dark:text-gray-600 px-1">Sem aula</div>
                              )}
                              {turmasDia.length > 4 && (
                                <span className="text-[9px] sm:text-[10px] text-gray-400 pl-1">+{turmasDia.length - 4} mais</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : turmas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-center">
                <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium mb-1">Nenhuma turma cadastrada</p>
                <p className="text-sm text-gray-400 mb-4">Crie sua primeira turma para organizar horários e alunos.</p>
              </div>
            ) : view === "semanal" ? (
              /* ── WEEKLY GRID ──────────────────────────────────────────── */
              <div className="grid grid-cols-7 gap-2 sm:gap-3 min-w-[700px]">
                {DIAS.map((dia) => (
                  <div key={dia.id} className="flex flex-col gap-2">
                    <div className="text-center">
                      <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {dia.label}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 min-h-[104px] sm:min-h-[120px]">
                      {turmasPorDia(dia.id).length === 0 ? (
                        <div
                          className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 h-14 sm:h-16 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
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
                            className="rounded-lg p-2 text-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: t.cor }}
                            onClick={() => { setTurmaAlunos(t); setDialogAlunos(true); }}
                          >
                            <p className="font-semibold text-[11px] leading-tight truncate">{t.nome}</p>
                            <p className="text-[10px] opacity-90 mt-0.5">{t.horarioInicio}–{t.horarioFim}</p>
                            {t.professorNome && (
                              <p className="text-[9px] opacity-80 truncate mt-0.5">{t.professorNome}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1.5">
                              <Users className="h-2.5 w-2.5 opacity-80" />
                              <span className="text-[9px] opacity-90">{t.alunosCount}/{t.capacidadeMaxima}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── LIST VIEW ────────────────────────────────────────────── */
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
          </>
        )}
      </div>

      {/* Dialog: Dia popup (monthly view) */}
      <Dialog open={!!diaPopup} onOpenChange={(open) => { if (!open) setDiaPopup(null); }}>
        <DialogContent className="max-w-sm">
          {diaPopup && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-600" />
                  {diaPopup.date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-2">
                {diaPopup.turmas.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg text-white"
                    style={{ backgroundColor: t.cor }}
                  >
                    <div>
                      <p className="font-semibold text-sm">{t.nome}</p>
                      <p className="text-xs opacity-90">{t.horarioInicio}–{t.horarioFim}</p>
                      {t.professorNome && <p className="text-xs opacity-80">{t.professorNome}</p>}
                    </div>
                    <div className="text-right text-xs opacity-90">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {t.alunosCount}/{t.capacidadeMaxima}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDiaPopup(null)}>Fechar</Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => { setDiaPopup(null); openNova(JS_DAY_TO_ID[diaPopup.date.getDay()]); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />Horário de Aulas
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!slotPopup} onOpenChange={(open) => { if (!open) setSlotPopup(null); }}>
        <DialogContent className="max-w-md">
          {slotPopup && (
            <>
              <DialogHeader>
                <DialogTitle>Criar horário</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="text-sm text-gray-500">
                  {slotPopup.date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Início</Label>
                    <Input type="time" value={slotHorarioInicio} onChange={(e) => setSlotHorarioInicio(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fim</Label>
                    <Input type="time" value={slotHorarioFim} onChange={(e) => setSlotHorarioFim(e.target.value)} />
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Se existir choque de horário para o mesmo professor, a criação será bloqueada.
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSlotPopup(null)}>Cancelar</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    const dayId = JS_DAY_TO_ID[slotPopup.date.getDay()];
                    const dia = slotPopup.date.toISOString().slice(0, 10);
                    const conflict = turmasNoHorario(dia, slotHorarioInicio, slotHorarioFim);
                    if (conflict.length > 0) {
                      toast({ title: "Horário indisponível", description: "Já existe uma aula nesse horário para o mesmo professor.", variant: "destructive" });
                      return;
                    }
                    setFormData({
                      ...emptyForm,
                      nome: "",
                      modalidade: professorContext?.modalidade ?? "",
                      professorId: professorContext?.id ?? "",
                      diasSemana: [dayId],
                      horarioInicio: slotHorarioInicio,
                      horarioFim: slotHorarioFim,
                      capacidadeMaxima: 20,
                      cor: "#1565C0",
                    });
                    setEditandoId(null);
                    setFormData((prev) => ({
                      ...prev,
                      dataAula: dia,
                    }));
                    setDiaPopup(null);
                    setSlotPopup(null);
                    setDialogTurma(true);
                  }}
                >
                  Continuar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar / Editar Turma */}
      <Dialog open={dialogTurma} onOpenChange={setDialogTurma}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Horário de Aulas" : "Horário de Aulas"}</DialogTitle>
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
                <Select
                  value={formData.modalidade}
                  onValueChange={(v) => setFormData((p) => ({ ...p, modalidade: v }))}
                >
                  <SelectTrigger data-testid="select-turma-modalidade">
                    <SelectValue placeholder="Selecionar modalidade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modalidades.map((m) => (
                      <SelectItem key={m.modalidade} value={m.modalidade}>
                        {m.modalidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <div className="space-y-1.5">
              <Label htmlFor="turma-recurso">Sala / Box / Quadra</Label>
              <Input
                id="turma-recurso"
                data-testid="input-turma-recurso"
                placeholder="Ex: Quadra 1"
                value={formData.recursoId}
                onChange={(e) => setFormData((p) => ({ ...p, recursoId: e.target.value }))}
              />
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
              data-testid="button-salvar-aula"
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
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Alunos matriculados ({alunosTurma.length}/{turmaAlunos.capacidadeMaxima})
                  </p>
                  {loadingAlunos ? (
                    <div className="text-center text-gray-400 py-4">
                      <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Carregando...
                    </div>
                  ) : alunosTurma.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Nenhum aluno matriculado ainda.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {alunosTurma.map((e) => (
                        <div key={e.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{e.aluno?.nome ?? "–"}</p>
                            <p className="text-xs text-gray-400">
                              Desde {new Date(e.dataMatricula).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            data-testid={`button-remover-aluno-${e.alunoId}`}
                            className="text-red-400 hover:text-red-600"
                            onClick={() => removerAluno.mutate({ turmaId: turmaAlunos.id, alunoId: e.alunoId })}
                            disabled={removerAluno.isPending}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add students */}
                {alunosDisponiveis.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Adicionar alunos</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {alunosDisponiveis.map((a) => (
                        <div key={a.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-2 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{a.nome}</p>
                          <Button
                            variant="ghost" size="icon"
                            data-testid={`button-add-aluno-turma-${a.id}`}
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => matricularAluno.mutate({ turmaId: turmaAlunos.id, alunoId: a.id })}
                            disabled={matricularAluno.isPending}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert: Confirm Delete */}
      <AlertDialog open={!!confirmExcluir} onOpenChange={(open) => { if (!open) setConfirmExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
            <AlertDialogDescription>
              A turma <strong>{confirmExcluir?.nome}</strong> será excluída permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
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
