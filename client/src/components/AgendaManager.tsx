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
  ChevronRight, LayoutGrid, List, Calendar, UserPlus, UserMinus, RefreshCw, ChevronDown, ChevronUp,
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

type TipoAgendamento = "aula" | "aluguel" | "dayuse";

interface Recurso {
  id: string;
  nome: string;
  ativo: boolean;
  valorAluguel?: string | null;
  valorDayuse?: string | null;
  duracaoMinima?: number | null;
  valorHoraAdicional?: string | null;
}

function parseCurrency(val: string | null | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[^0-9,]/g, "").replace(",", ".")) || 0;
}

function calcValorTotal(recurso: Recurso, tipo: TipoAgendamento, duracao: number): string {
  if (tipo === "aluguel") {
    const valorPorHora = parseCurrency(recurso.valorAluguel);
    if (!valorPorHora) return "";
    return (valorPorHora * duracao).toFixed(2).replace(".", ",");
  }
  if (tipo === "dayuse") {
    const valor = parseCurrency(recurso.valorDayuse);
    if (!valor) return "";
    return valor.toFixed(2).replace(".", ",");
  }
  return "";
}

interface Turma {
  id: string;
  nome: string;
  tipo: TipoAgendamento;
  modalidade: string;
  professorId?: string | null;
  professorNome?: string | null;
  recursoId?: string | null;
  recursoNome?: string | null;
  clienteNome?: string | null;
  valorCobrado?: string | null;
  diasSemana: string;
  horarioInicio: string;
  horarioFim: string;
  dataAula?: string | null;
  excecoes?: string | null;
  statusAluguel?: string | null;
  expiresAt?: string | null;
  capacidadeMaxima: number;
  cor: string;
  ativo: boolean;
  alunosCount: number;
}

interface Professor {
  id: string;
  nome: string;
  modalidade: string;
  cor?: string | null;
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

interface AgendaManagerProps {
  onVoltar: () => void;
  professorContext?: { id: string; modalidade: string; nome?: string };
  readOnly?: boolean;
  highlightProfessorId?: string;
  alunoMode?: boolean;
}

const emptyForm = {
  nome: "",
  tipo: "aula" as TipoAgendamento,
  modalidade: "",
  professorId: "",
  recursoId: "",
  clienteNome: "",
  valorCobrado: "",
  duracao: 1,
  diasSemana: [] as string[],
  horarioInicio: "08:00",
  horarioFim: "09:00",
  capacidadeMaxima: 20,
  cor: "#1565C0",
};

const emptySession = {
  dataAula: "",
};

const TIPO_LABELS: Record<TipoAgendamento, string> = {
  aula: "Aula",
  aluguel: "Reserva",
  dayuse: "Avulso",
};

const TIPO_CORES: Record<TipoAgendamento, string> = {
  aula: "#1565C0",
  aluguel: "#2E7D32",
  dayuse: "#E65100",
};

type ViewMode = "mensal" | "semanal" | "lista";

type DaySlot = {
  date: string;
  horarioInicio: string;
  horarioFim: string;
  professorId?: string | null;
};

export default function AgendaManager({ onVoltar, professorContext, readOnly = false, highlightProfessorId, alunoMode = false }: AgendaManagerProps) {
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
  const [sessionData, setSessionData] = useState(emptySession);

  const [dialogAlunos, setDialogAlunos] = useState(false);
  const [turmaAlunos, setTurmaAlunos] = useState<Turma | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<Turma | null>(null);

  // Popup for a clicked day
  const [diaPopup, setDiaPopup] = useState<{ date: Date; turmas: Turma[] } | null>(null);
  const [slotPopup, setSlotPopup] = useState<{ date: Date; horarioInicio: string; horarioFim: string } | null>(null);
  const [slotHorarioInicio, setSlotHorarioInicio] = useState("08:00");
  const [slotHorarioFim, setSlotHorarioFim] = useState("09:00");
  const [confirmRemoverDia, setConfirmRemoverDia] = useState<{ turma: Turma; diaId: string; isoDate: string } | null>(null);

  // Data
  const { data: turmas = [], isLoading } = useQuery<Turma[]>({ queryKey: ["/api/turmas"] });
  const { data: professores = [] } = useQuery<Professor[]>({ queryKey: ["/api/professores"] });
  const { data: recursos = [] } = useQuery<Recurso[]>({ queryKey: ["/api/recursos"] });
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
    const defaultTipo: TipoAgendamento = alunoMode ? "aluguel" : "aula";
    setFormData({
      ...emptyForm,
      tipo: defaultTipo,
      cor: TIPO_CORES[defaultTipo],
      diasSemana: diaPre ? [diaPre] : [],
      modalidade: professorContext?.modalidade ?? "",
      professorId: professorContext?.id ?? "",
    });
    setSessionData(emptySession);
    setSlotHorarioInicio(emptyForm.horarioInicio);
    setSlotHorarioFim(emptyForm.horarioFim);
    setDialogTurma(true);
  };

  const openHorarioAulas = (diaPre?: string, date?: Date) => {
    const defaultTipo: TipoAgendamento = alunoMode ? "aluguel" : "aula";
    setEditandoId(null);
    setFormData({
      ...emptyForm,
      tipo: defaultTipo,
      cor: TIPO_CORES[defaultTipo],
      diasSemana: diaPre ? [diaPre] : [],
      modalidade: professorContext?.modalidade ?? "",
      professorId: professorContext?.id ?? "",
    });
    setSessionData(date ? { dataAula: toISODate(date) } : emptySession);
    setSlotHorarioInicio(emptyForm.horarioInicio);
    setSlotHorarioFim(emptyForm.horarioFim);
    setDiaPopup(null);
    setSlotPopup(null);
    setDialogTurma(true);
  };

  const openEditar = (t: Turma) => {
    setEditandoId(t.id);
    // Derive duracao from horario times
    const calcDuracao = (inicio: string, fim: string) => {
      const [hI, mI] = inicio.split(":").map(Number);
      const [hF, mF] = fim.split(":").map(Number);
      const diff = (hF * 60 + mF - (hI * 60 + mI)) / 60;
      return diff > 0 ? diff : 1;
    };
    setFormData({
      nome: t.nome,
      tipo: (t.tipo as TipoAgendamento) || "aula",
      modalidade: t.modalidade,
      professorId: t.professorId ?? "",
      recursoId: t.recursoId ?? "",
      clienteNome: t.clienteNome ?? "",
      valorCobrado: t.valorCobrado ?? "",
      duracao: calcDuracao(t.horarioInicio, t.horarioFim),
      diasSemana: t.diasSemana ? t.diasSemana.split("|").filter(Boolean) : [],
      horarioInicio: t.horarioInicio,
      horarioFim: t.horarioFim,
      capacidadeMaxima: t.capacidadeMaxima,
      cor: t.cor,
    });
    setSessionData({ dataAula: t.dataAula ?? "" });
    setDialogTurma(true);
  };

  const removerDiaDoAgendamento = async (t: Turma, isoDate: string) => {
    // Single-date event → delete the whole record
    if (t.dataAula) {
      await excluirTurma.mutateAsync(t.id);
      setDiaPopup(null);
      return;
    }
    // Recurring: add the specific ISO date to excecoes so only this occurrence is skipped
    const current = t.excecoes ? t.excecoes.split("|").filter(Boolean) : [];
    const newExcecoes = [...current, isoDate].join("|");
    await editarTurma.mutateAsync({
      id: t.id,
      data: {
        nome: t.nome,
        tipo: t.tipo,
        modalidade: t.modalidade,
        professorId: t.professorId ?? null,
        recursoId: t.recursoId ?? null,
        clienteNome: t.clienteNome ?? null,
        valorCobrado: t.valorCobrado ?? null,
        diasSemana: t.diasSemana,
        horarioInicio: t.horarioInicio,
        horarioFim: t.horarioFim,
        capacidadeMaxima: t.capacidadeMaxima,
        cor: t.cor,
        dataAula: null,
        excecoes: newExcecoes,
      },
    });
    setDiaPopup(null);
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
    if ((formData.tipo === "aula" && !formData.nome.trim()) || !formData.horarioInicio || !formData.horarioFim) {
      toast({ title: "Preencha nome e horário", variant: "destructive" });
      return;
    }
    const dataAula = slotPopup ? slotPopup.date.toISOString().slice(0, 10) : undefined;
    const dataAulaFinal = sessionData.dataAula || dataAula || undefined;

    // diasSemana is required only when no specific date is given
    if (formData.diasSemana.length === 0 && !dataAulaFinal) {
      toast({ title: "Selecione ao menos um dia da semana ou informe uma data única", variant: "destructive" });
      return;
    }

    // If data única and no days selected, derive the weekday automatically
    let diasSemanaFinal = formData.diasSemana;
    if (dataAulaFinal && formData.diasSemana.length === 0) {
      const d = new Date(dataAulaFinal + "T12:00:00");
      const dayId = JS_DAY_TO_ID[d.getDay()];
      if (dayId) diasSemanaFinal = [dayId];
    }

    let modalidade = formData.modalidade;
    let professorIdFinal: string | null = null;

    if (formData.tipo === "aula") {
      const selectedProfessor = professores.find((p) => p.id === formData.professorId);
      if (!selectedProfessor) {
        toast({ title: "Selecione um professor para a aula", variant: "destructive" });
        return;
      }
      modalidade = selectedProfessor.modalidade;
      professorIdFinal = selectedProfessor.id;
    }
    const payload = {
      nome: formData.tipo === "dayuse" ? "Avulso | Dayuse" : formData.tipo === "aluguel" ? "Reserva | Aluguel" : formData.nome,
      tipo: formData.tipo,
      modalidade,
      professorId: professorIdFinal,
      recursoId: formData.recursoId || null,
      clienteNome: formData.clienteNome || null,
      valorCobrado: formData.valorCobrado || null,
      diasSemana: diasSemanaFinal.join("|"),
      horarioInicio: formData.horarioInicio,
      horarioFim: formData.horarioFim,
      capacidadeMaxima: formData.capacidadeMaxima,
      cor: formData.cor,
      ...(dataAulaFinal ? { dataAula: dataAulaFinal } : {}),
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
    const isoDate = toISODate(date);
    return turmas.filter((t) => {
      if (t.dataAula) {
        // Single-date event: only show on the exact date
        return t.dataAula === isoDate;
      }
      // Skip if this specific date is in the excecoes list
      if (t.excecoes) {
        const excecoesList = t.excecoes.split("|").filter(Boolean);
        if (excecoesList.includes(isoDate)) return false;
      }
      // Recurring: show on any day matching the weekday
      return t.diasSemana.split("|").includes(dayId);
    });
  };

  const isHighlightedTurma = (t: Turma) => {
    if (!highlightProfessorId) return false;
    return t.professorId === highlightProfessorId;
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
              {!readOnly && (
                <Button
                  onClick={() => openNova()}
                  data-testid="button-horario-aula"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full h-14 text-lg gap-1.5 justify-center"
                >
                  <Plus className="h-5 w-5" />
                  Novo Agendamento
                </Button>
              )}
              {readOnly && (
                <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  Visualização apenas. O aluno pode consultar o calendário, mas não criar ou editar aulas.
                </div>
              )}
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
                          if (turmasDia.length > 0) {
                            setDiaPopup({ date, turmas: turmasDia });
                          } else if (!readOnly) {
                            const dayId = JS_DAY_TO_ID[date.getDay()];
                            const isoDate = toISODate(date);
                            const defaultTipo: TipoAgendamento = alunoMode ? "aluguel" : "aula";
                            setEditandoId(null);
                            setFormData({
                              ...emptyForm,
                              tipo: defaultTipo,
                              cor: TIPO_CORES[defaultTipo],
                              modalidade: professorContext?.modalidade ?? "",
                              professorId: professorContext?.id ?? "",
                              diasSemana: [dayId],
                            });
                            setSessionData({ dataAula: isoDate });
                            setDialogTurma(true);
                          }
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
                              {turmasDia.slice(0, 3).map((t) => {
                                const pessoaNome = t.clienteNome || t.professorNome;
                                const primeiroNome = pessoaNome ? pessoaNome.split(" ")[0] : null;
                                const nomeExibicao = primeiroNome
                                  ? t.professorNome ? `Prof. ${primeiroNome}` : primeiroNome
                                  : null;
                                return (
                                <div
                                  key={t.id}
                                  className={`rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-medium leading-tight border ${isHighlightedTurma(t) ? "ring-2 ring-yellow-300 border-yellow-200 text-gray-900" : "text-white border-transparent"}`}
                                  style={{ backgroundColor: isHighlightedTurma(t) ? "#fef3c7" : t.cor }}
                                  title={`${[t.modalidade, t.nome].filter(Boolean).join(' | ')} · ${t.horarioInicio}–${t.horarioFim}${pessoaNome ? ` · ${pessoaNome}` : ""}`}
                                >
                                  <span className="truncate block font-semibold">{t.modalidade ? `${t.modalidade} | ${t.nome.replace(/\|/g, ' | ')}` : t.nome.replace(/\|/g, ' | ')}</span>
                                  <span className="opacity-80 block truncate">{t.horarioInicio === t.horarioFim ? t.horarioInicio : `${t.horarioInicio}–${t.horarioFim}`}{nomeExibicao ? ` · ${nomeExibicao}` : ""}</span>
                                </div>
                                );
                              })}
                              {turmasDia.length === 0 && (
                                <div className="text-[9px] sm:text-[10px] text-gray-300 dark:text-gray-600 px-1">Sem aula</div>
                              )}
                              {turmasDia.length > 3 && (
                                <span className="text-[9px] sm:text-[10px] text-gray-400 pl-1">+{turmasDia.length - 3} mais</span>
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
                          className={`rounded-lg border border-dashed border-gray-200 dark:border-gray-700 h-14 sm:h-16 flex items-center justify-center transition-colors ${!readOnly ? "cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 group" : ""}`}
                          onClick={() => { if (!readOnly) openHorarioAulas(dia.id); }}
                          title={!readOnly ? `Adicionar aula na ${dia.label}` : undefined}
                          data-testid={`dia-vazio-${dia.id}`}
                        >
                          {!readOnly && <Plus className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />}
                        </div>
                      ) : (
                        turmasPorDia(dia.id).map((t) => (
                          <div
                            key={`${dia.id}-${t.id}`}
                            data-testid={`turma-card-${t.id}-${dia.id}`}
                            className={`rounded-lg p-2 shadow-sm cursor-pointer hover:opacity-90 transition-opacity border ${isHighlightedTurma(t) ? "bg-yellow-100 text-gray-900 border-yellow-300 ring-2 ring-yellow-300" : "text-white border-transparent"}`}
                            style={{ backgroundColor: isHighlightedTurma(t) ? "#fef3c7" : t.cor }}
                            onClick={() => { setTurmaAlunos(t); setDialogAlunos(true); }}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-[11px] leading-tight truncate">{t.modalidade ? `${t.modalidade} | ${t.nome.replace(/\|/g, ' | ')}` : t.nome.replace(/\|/g, ' | ')}</p>
                              <Badge className="h-4 px-1.5 text-[9px] bg-white/20 text-white border-0">
                                {TIPO_LABELS[t.tipo as TipoAgendamento] ?? t.tipo}
                              </Badge>
                            </div>
                            <p className="text-[10px] opacity-90 mt-0.5">{t.horarioInicio}–{t.horarioFim}</p>
                            {t.recursoNome && (
                              <p className="text-[9px] opacity-80 truncate mt-0.5">{t.recursoNome}</p>
                            )}
                            {t.professorNome && (
                              <p className="text-[9px] opacity-80 truncate mt-0.5">Prof.: {t.professorNome}</p>
                            )}
                            {t.clienteNome && (
                              <p className="text-[9px] opacity-80 truncate mt-0.5">Cliente: {t.clienteNome}</p>
                            )}
                            {t.tipo === "aula" && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <Users className="h-2.5 w-2.5 opacity-80" />
                                <span className="text-[9px] opacity-90">{t.alunosCount}/{t.capacidadeMaxima}</span>
                              </div>
                            )}
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
                  <Card key={t.id} data-testid={`turma-row-${t.id}`} className={`shadow-sm ${isHighlightedTurma(t) ? "ring-2 ring-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" : "bg-white dark:bg-gray-800"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-gray-900 dark:text-white">{t.modalidade ? `${t.modalidade} | ${t.nome.replace(/\|/g, ' | ')}` : t.nome.replace(/\|/g, ' | ')}</p>
                              <Badge
                                variant="outline"
                                className="text-xs text-white border-0"
                                style={{ backgroundColor: TIPO_CORES[t.tipo as TipoAgendamento] ?? "#1565C0" }}
                              >
                                {TIPO_LABELS[t.tipo as TipoAgendamento] ?? t.tipo}
                              </Badge>
                              {t.recursoNome && (
                                <Badge variant="outline" className="text-xs">{t.recursoNome}</Badge>
                              )}
                              {t.clienteNome && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{t.clienteNome}</span>
                              )}
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
                              {t.recursoNome && (
                                <span className="flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                                  {t.recursoNome}
                                </span>
                              )}
                              {t.clienteNome && (
                                <span className="flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                                  {t.clienteNome}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {t.alunosCount}/{t.capacidadeMaxima} alunos
                              </span>
                            </div>
                          </div>
                        </div>
                        {!readOnly && (
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline" size="sm"
                              data-testid={`button-alunos-${t.id}`}
                              onClick={() => { setTurmaAlunos(t); setDialogAlunos(true); }}
                            >
                              <Users className="h-3.5 w-3.5 mr-1" />Alunos
                            </Button>
                            {(!professorContext || t.professorId === professorContext.id) && (
                              <>
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
                              </>
                            )}
                          </div>
                        )}
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
                    className="p-3 rounded-lg text-white space-y-2"
                    style={{ backgroundColor: t.cor }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight">{t.modalidade ? `${t.modalidade} | ${t.nome.replace(/\|/g, ' | ')}` : t.nome.replace(/\|/g, ' | ')}</p>
                        <p className="text-xs opacity-90 mt-0.5">
                          {t.horarioInicio}–{t.horarioFim}
                        </p>
                        {t.professorNome && (
                          <p className="text-xs opacity-80 mt-0.5">Prof.: {t.professorNome}</p>
                        )}
                        {t.recursoNome && (
                          <p className="text-xs opacity-80">{t.recursoNome}</p>
                        )}
                        {t.clienteNome && (
                          <p className="text-xs opacity-80">Cliente: {t.clienteNome}</p>
                        )}
                        {t.tipo === "aula" && (
                          <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
                            <Users className="h-3 w-3" />
                            {t.alunosCount}/{t.capacidadeMaxima} alunos
                          </div>
                        )}
                      </div>
                      {!readOnly && (!professorContext || t.professorId === professorContext.id) && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 bg-white/15 text-white hover:bg-white/30"
                            data-testid={`button-editar-dia-${t.id}`}
                            onClick={() => { setDiaPopup(null); openEditar(t); }}
                            title="Editar agendamento"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 bg-white/15 text-white hover:bg-red-500/60 text-xs"
                            data-testid={`button-remover-dia-${t.id}-${JS_DAY_TO_ID[diaPopup.date.getDay()]}`}
                            onClick={() => setConfirmRemoverDia({ turma: t, diaId: JS_DAY_TO_ID[diaPopup.date.getDay()], isoDate: toISODate(diaPopup.date) })}
                          >
                            Remover
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDiaPopup(null)}>Fechar</Button>
                {!readOnly && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => openHorarioAulas(JS_DAY_TO_ID[diaPopup.date.getDay()], diaPopup.date)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />Novo Agendamento
                  </Button>
                )}
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
                    setSessionData({ dataAula: dia });
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

      {/* Dialog: Criar / Editar Agendamento */}
      <Dialog open={dialogTurma} onOpenChange={setDialogTurma}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-12">
            <DialogTitle className="text-base sm:text-lg">
              {editandoId ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* Tipo selector */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              {alunoMode ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2 rounded-lg text-sm font-medium border text-white border-transparent"
                    style={{ backgroundColor: TIPO_CORES["aluguel"] }}
                  >
                    Aluguel de Quadra
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {(["aula", "aluguel", "dayuse"] as TipoAgendamento[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      data-testid={`button-tipo-${t}`}
                      onClick={() => setFormData((p) => {
                        const recurso = recursos.find((r) => r.id === p.recursoId);
                        let novoValor = p.valorCobrado;
                        if (recurso && t !== "aula") {
                          novoValor = calcValorTotal(recurso, t, p.duracao);
                        } else if (t === "aula") {
                          novoValor = "";
                        }
                        const prof = professores.find((pr) => pr.id === p.professorId);
                        const novaCor = t === "aula" ? (prof?.cor || TIPO_CORES["aula"]) : TIPO_CORES[t];
                        return {
                          ...p,
                          tipo: t,
                          cor: novaCor,
                          professorId: t !== "aula" ? "" : p.professorId,
                          modalidade: t !== "aula" ? "" : p.modalidade,
                          valorCobrado: novoValor,
                          horarioFim: t === "dayuse" ? p.horarioInicio : p.horarioFim,
                        };
                      })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.tipo === t
                          ? "text-white border-transparent"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-gray-400"
                      }`}
                      style={formData.tipo === t ? { backgroundColor: TIPO_CORES[t] } : {}}
                    >
                      {TIPO_LABELS[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AULA: Professor + Modalidade */}
            {formData.tipo === "aula" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Professor *</Label>
                  <Select
                    value={formData.professorId}
                    onValueChange={(v) => {
                      const selected = professores.find((p) => p.id === v);
                      setFormData((p) => ({
                        ...p,
                        professorId: v,
                        modalidade: selected?.modalidade ?? p.modalidade,
                        cor: p.tipo === "aula" ? (selected?.cor || TIPO_CORES["aula"]) : p.cor,
                      }));
                    }}
                  >
                    <SelectTrigger data-testid="select-turma-professor">
                      <SelectValue placeholder="Selecionar professor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {professores.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modalidade</Label>
                  <Input
                    value={professores.find((p) => p.id === formData.professorId)?.modalidade ?? ""}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
            )}

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="turma-nome">
                {formData.tipo === "aula" ? "Nível *" : "Descrição"}
              </Label>
              <Input
                id="turma-nome"
                data-testid="input-turma-nome"
                readOnly={formData.tipo === "dayuse" || formData.tipo === "aluguel"}
                className={formData.tipo === "dayuse" || formData.tipo === "aluguel" ? "bg-muted text-muted-foreground cursor-default" : ""}
                placeholder="Ex: Iniciante"
                value={
                  formData.tipo === "dayuse" ? "Avulso | Dayuse"
                  : formData.tipo === "aluguel" ? "Reserva | Aluguel"
                  : formData.nome
                }
                onChange={(e) => {
                  if (formData.tipo === "aula") setFormData((p) => ({ ...p, nome: e.target.value }));
                }}
              />
            </div>

            {/* RESERVA / AVULSO: Ambiente (primeiro!) + Cliente + Duração + Valor */}
            {(formData.tipo === "aluguel" || formData.tipo === "dayuse") && (() => {
              const selectedRecurso = recursos.find((r) => r.id === formData.recursoId);
              const duracaoMin = selectedRecurso?.duracaoMinima ?? 1;
              return (
                <div className="space-y-3">
                  {/* Ambiente PRIMEIRO — auto-preenche o valor */}
                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select
                      value={formData.recursoId || "none"}
                      onValueChange={(v) => {
                        const recurso = recursos.find((r) => r.id === v);
                        setFormData((p) => {
                          const novaDuracao = recurso?.duracaoMinima ?? p.duracao;
                          const novoValor = v !== "none" && recurso ? calcValorTotal(recurso, p.tipo, novaDuracao) : p.valorCobrado;
                          return { ...p, recursoId: v === "none" ? "" : v, duracao: novaDuracao, valorCobrado: novoValor };
                        });
                      }}
                    >
                      <SelectTrigger data-testid="select-turma-quadra">
                        <SelectValue placeholder="Selecionar quadra / espaço..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {recursos.filter((r) => r.ativo).map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {recursos.filter((r) => r.ativo).length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhum espaço cadastrado. Crie em Quadras → Ambientes.</p>
                    )}
                  </div>

                  {/* Locatário / Cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="cliente-nome">
                      Nome do cliente
                    </Label>
                    <Input
                      id="cliente-nome"
                      data-testid="input-cliente-nome"
                      placeholder="Nome da pessoa ou empresa"
                      value={formData.clienteNome}
                      onChange={(e) => setFormData((p) => ({ ...p, clienteNome: e.target.value }))}
                    />
                  </div>

                  {/* Duração + Valor (auto-calculado) */}
                  <div className={`grid gap-3 ${formData.tipo === "dayuse" ? "grid-cols-1" : "grid-cols-2"}`}>
                    {formData.tipo !== "dayuse" && (
                      <div className="space-y-2">
                        <Label htmlFor="duracao">
                          Duração (horas)
                          {duracaoMin > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground font-normal">mín. {duracaoMin}h</span>
                          )}
                        </Label>
                        <Input
                          id="duracao"
                          type="number"
                          min={duracaoMin}
                          step={0.5}
                          data-testid="input-duracao"
                          value={formData.duracao}
                          onChange={(e) => {
                            const novaDuracao = parseFloat(e.target.value) || duracaoMin;
                            setFormData((p) => {
                              const recurso = recursos.find((r) => r.id === p.recursoId);
                              const novoValor = recurso ? calcValorTotal(recurso, p.tipo, novaDuracao) : p.valorCobrado;
                              return { ...p, duracao: novaDuracao, valorCobrado: novoValor || p.valorCobrado };
                            });
                          }}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="valor-cobrado">
                        Valor cobrado
                        {selectedRecurso && formData.tipo === "aluguel" && parseCurrency(selectedRecurso.valorAluguel) > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                            R$ {selectedRecurso.valorAluguel}/h
                          </span>
                        )}
                        {selectedRecurso && formData.tipo === "dayuse" && parseCurrency(selectedRecurso.valorDayuse) > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">
                            valor do ambiente
                          </span>
                        )}
                      </Label>
                      <Input
                        id="valor-cobrado"
                        data-testid="input-valor-cobrado"
                        placeholder="Ex: 50,00"
                        value={formData.valorCobrado}
                        onChange={(e) => setFormData((p) => ({ ...p, valorCobrado: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* AULA: Ambiente (opcional) + Capacidade */}
            {formData.tipo === "aula" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>Ambiente (opcional)</Label>
                  <Select
                    value={formData.recursoId || "none"}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, recursoId: v === "none" ? "" : v }))
                    }
                  >
                    <SelectTrigger data-testid="select-turma-quadra">
                      <SelectValue placeholder="Selecionar quadra / espaço..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {recursos.filter((r) => r.ativo).map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="capacidade-maxima">Capacidade máxima de alunos</Label>
                  <Input
                    id="capacidade-maxima"
                    type="number"
                    min={1}
                    max={100}
                    data-testid="input-capacidade-maxima"
                    value={formData.capacidadeMaxima}
                    onChange={(e) => setFormData((p) => ({ ...p, capacidadeMaxima: parseInt(e.target.value) || 1 }))}
                  />
                  <p className="text-xs text-muted-foreground">Quantidade máxima de alunos que podem se matricular nesta aula.</p>
                </div>
              </div>
            )}

            {/* Dias da semana */}
            <div className="space-y-2">
              <Label>Dias da semana *</Label>
              <p className="text-xs text-gray-500">Use isso para repetir a aula em vários dias da semana.</p>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((dia) => (
                  <button
                    key={dia.id}
                    type="button"
                    data-testid={`button-dia-${dia.id}`}
                    onClick={() => toggleDia(dia.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      formData.diasSemana.includes(dia.id)
                        ? "text-white border-transparent"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400"
                    }`}
                    style={formData.diasSemana.includes(dia.id) ? { backgroundColor: TIPO_CORES[formData.tipo] } : {}}
                  >
                    {DIAS_SHORT[dia.id]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="turma-data-unica">Data única</Label>
              <p className="text-xs text-gray-500">Se quiser um dia específico, preencha essa data e deixe a repetição sem uso.</p>
              <Input
                id="turma-data-unica"
                type="date"
                value={sessionData.dataAula}
                onChange={(e) => setSessionData({ dataAula: e.target.value })}
                data-testid="input-turma-data-unica"
              />
            </div>

            {/* Horário */}
            <div className={`grid grid-cols-1 gap-3 ${formData.tipo !== "dayuse" ? "md:grid-cols-2" : ""}`}>
              <div className="space-y-2">
                <Label htmlFor="turma-inicio">Horário *</Label>
                <Input
                  id="turma-inicio"
                  type="time"
                  data-testid="input-turma-inicio"
                  value={formData.horarioInicio}
                  onChange={(e) => setFormData((p) => ({
                    ...p,
                    horarioInicio: e.target.value,
                    horarioFim: p.tipo === "dayuse" ? e.target.value : p.horarioFim,
                  }))}
                />
              </div>
              {formData.tipo !== "dayuse" && (
                <div className="space-y-2">
                  <Label htmlFor="turma-fim">Horário fim *</Label>
                  <Input
                    id="turma-fim"
                    type="time"
                    data-testid="input-turma-fim"
                    value={formData.horarioFim}
                    onChange={(e) => setFormData((p) => ({ ...p, horarioFim: e.target.value }))}
                  />
                </div>
              )}
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogTurma(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvar}
              disabled={criarTurma.isPending || editarTurma.isPending}
              data-testid="button-salvar-aula"
              style={{ backgroundColor: TIPO_CORES[formData.tipo] }}
              className="text-white hover:opacity-90"
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

      {/* Alert: Confirm Remover Dia */}
      <AlertDialog open={!!confirmRemoverDia} onOpenChange={(open) => { if (!open) setConfirmRemoverDia(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja remover este agendamento?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {confirmRemoverDia && (() => {
                  const t = confirmRemoverDia.turma;
                  const dias = t.diasSemana.split("|").filter(Boolean);
                  const isUnico = !!(t.dataAula || dias.length <= 1);
                  return (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-1 text-sm text-gray-800 dark:text-gray-200">
                        <p className="font-semibold">{t.modalidade ? `${t.modalidade} | ${t.nome.replace(/\|/g, ' | ')}` : t.nome.replace(/\|/g, ' | ')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t.dataAula
                            ? new Date(t.dataAula + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
                            : dias.map((d) => DIAS_SHORT[d] ?? d).join(", ")}
                          {" · "}{t.horarioInicio}–{t.horarioFim}
                          {t.professorNome ? ` · Prof. ${t.professorNome}` : ""}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {isUnico
                          ? "Este agendamento será excluído permanentemente."
                          : <>Apenas a ocorrência de <strong>{new Date(confirmRemoverDia.isoDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</strong> será removida. As demais ocorrências continuarão normalmente.</>}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmRemoverDia(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (confirmRemoverDia) {
                  removerDiaDoAgendamento(confirmRemoverDia.turma, confirmRemoverDia.isoDate);
                  setConfirmRemoverDia(null);
                  setDiaPopup(null);
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
