import { useState } from "react";
import { PhotoCropModal } from "./PhotoCropModal";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, History, CalendarClock, UserPlus, Pencil, Trash2, DollarSign, Receipt, Banknote, Eye, Camera, CalendarDays, Clock, ChevronRight, ChevronDown, ChevronUp, FileText } from "lucide-react";
import type { Plano } from "@/pages/Home";

interface AlunoView {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  login?: string;
  modalidade?: string;
  plano: number;
  planoTitulo: string;
  planoId: string;
  planoValorTexto?: string;
  checkinsRealizados: number;
  ultimoCheckin?: { data: string; hora: string };
  historico: Array<{ id?: string; data: string; hora: string }>;
  photoUrl?: string;
  integrationType?: string;
  integrationPlan?: string;
}

interface NovoAlunoDados {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  login: string;
  senha: string;
  modalidade: string;
  planoId: string;
  integrationType: string;
  integrationPlan: string;
  mensalistaValor?: string;
  statusMensalidade?: string;
  checkinsRealizados?: number;
}

interface Cobranca {
  id: string;
  studentId: string;
  description: string;
  amount: string;
  status: string;
  dueDate: string;
}

interface Pagamento {
  id: string;
  studentId: string;
  amount: string;
  referenceMonth: string;
  dueDate: string;
  status: string;
  paymentDate?: string | null;
  createdAt?: string | null;
  paymentMethod?: string | null;
}

function paymentStatusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-1.5 py-0">Pago</Badge>;
  if (status === "overdue") return <Badge variant="destructive" className="text-xs px-1.5 py-0">Atrasado</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs px-1.5 py-0">Pendente</Badge>;
}

interface TeacherDashboardProps {
  teacherName: string;
  photoUrl?: string;
  modalidade: string;
  percentualComissao?: string;
  planos: Plano[];
  alunos: AlunoView[];
  charges?: Cobranca[];
  payments?: Pagamento[];
  onCheckinManual: (alunoId: string, data?: string, hora?: string) => void;
  onAlterarPlano: (alunoId: string, planoId: string) => void;
  onCadastrarAluno: (dados: NovoAlunoDados) => void;
  onEditarAluno: (alunoId: string, dados: Partial<NovoAlunoDados & { senha?: string }>) => void;
  onExcluirAluno: (alunoId: string) => void;
  onRemoverCheckin: (alunoId: string, index: number) => void;
  onUpdatePhoto?: (photoUrl: string) => void;
  onIrAgenda?: () => void;
}

export default function TeacherDashboard({
  teacherName,
  photoUrl,
  modalidade,
  percentualComissao,
  planos,
  alunos,
  charges = [],
  payments = [],
  onCheckinManual,
  onAlterarPlano,
  onCadastrarAluno,
  onEditarAluno,
  onExcluirAluno,
  onRemoverCheckin,
  onUpdatePhoto,
  onIrAgenda,
}: TeacherDashboardProps) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const handlePhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setCropSrc(e.target!.result as string);
    reader.readAsDataURL(file);
  };

  const teacherInitials = teacherName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const emptyAluno: NovoAlunoDados = {
    nome: "", cpf: "", email: "", telefone: "",
    login: "", senha: "", modalidade, planoId: "",
    integrationType: "", integrationPlan: "", mensalistaValor: "",
  };

  // Diálogos globais
  const [dialogRetroativo, setDialogRetroativo] = useState(false);
  const [alunoRetroativo, setAlunoRetroativo] = useState<AlunoView | null>(null);
  const [dataRetroativa, setDataRetroativa] = useState("");
  const [horaRetroativa, setHoraRetroativa] = useState("");

  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [alunoHistorico, setAlunoHistorico] = useState<AlunoView | null>(null);

  const [dialogAlterarPlano, setDialogAlterarPlano] = useState(false);
  const [alunoPlano, setAlunoPlano] = useState<AlunoView | null>(null);

  const [dialogNovoAluno, setDialogNovoAluno] = useState(false);
  const [novoAluno, setNovoAluno] = useState<NovoAlunoDados>(emptyAluno);

  const [dialogEditarAluno, setDialogEditarAluno] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<AlunoView | null>(null);
  const [dadosEdicao, setDadosEdicao] = useState<Partial<NovoAlunoDados & { senha?: string }>>({});

  const [dialogConfirmarExcluir, setDialogConfirmarExcluir] = useState(false);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoView | null>(null);

  const [dialogFinanceiro, setDialogFinanceiro] = useState(false);
  const [alunoFinanceiro, setAlunoFinanceiro] = useState<AlunoView | null>(null);

  const [confirmRemoverCheckinTeacher, setConfirmRemoverCheckinTeacher] = useState<{ aluno: AlunoView; index: number } | null>(null);

  const [dialogReceita, setDialogReceita] = useState(false);
  const [alunoReceita, setAlunoReceita] = useState<AlunoView | null>(null);
  const [alunosMinimizados, setAlunosMinimizados] = useState(false);

  const [dialogHistoricoPagamentos, setDialogHistoricoPagamentos] = useState(false);
  const [alunoHistoricoPagamentos, setAlunoHistoricoPagamentos] = useState<AlunoView | null>(null);


  const { data: modalidadeSettings = [] } = useQuery<any[]>({ queryKey: ["/api/configuracoes/modalidades"] });

  const getValorPorCheckin = (mod: string) => {
    const cfg = modalidadeSettings.find((s: any) => s.modalidade === mod);
    return cfg ? parseFloat(cfg.valorPorCheckin || "0") : 0;
  };

  const { data: receitaAlunoData, isLoading: receitaLoading } = useQuery<{
    studentId: string;
    nome: string;
    modalidade: string;
    checkins: number;
    valorUnitario: number;
    receitaTotal: number;
    receitaCheckins: number;
    receitaMensalidades: number;
    receitaCobranças: number;
  }>({
    queryKey: ["/api/finance/receita/aluno", alunoReceita?.id],
    queryFn: () => fetch(`/api/finance/receita/aluno/${alunoReceita!.id}`).then((r) => r.json()),
    enabled: !!alunoReceita,
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCadastrarAluno = () => {
    if (novoAluno.nome && novoAluno.cpf && novoAluno.login && novoAluno.senha && novoAluno.integrationType && novoAluno.planoId) {
      onCadastrarAluno(novoAluno);
      setNovoAluno(emptyAluno);
      setDialogNovoAluno(false);
    }
  };

  const handleCheckinRetroativo = () => {
    if (alunoRetroativo && dataRetroativa && horaRetroativa) {
      onCheckinManual(alunoRetroativo.id, dataRetroativa, horaRetroativa);
      setDialogRetroativo(false);
      setDataRetroativa("");
      setHoraRetroativa("");
      setAlunoRetroativo(null);
    }
  };

  const openRetroativo = (aluno: AlunoView) => {
    setAlunoRetroativo(aluno);
    setDataRetroativa(new Date().toISOString().split("T")[0]);
    setHoraRetroativa(new Date().toTimeString().slice(0, 5));
    setDialogRetroativo(true);
  };

  const openHistorico = (aluno: AlunoView) => {
    setAlunoHistorico(aluno);
    setDialogHistorico(true);
  };

  const openAlterarPlano = (aluno: AlunoView) => {
    setAlunoPlano(aluno);
    setDialogAlterarPlano(true);
  };

  const openFinanceiro = (aluno: AlunoView) => {
    setAlunoFinanceiro(aluno);
    setDialogFinanceiro(true);
  };

  const getPlanosPorIntegracao = (tipo: string) => {
    if (tipo === "mensalista") return planos.filter((p) => p.checkins === 0 || !!p.valorTexto);
    return planos.filter((p) => p.checkins > 0);
  };

  const getCheckinsLabel = (checkins: number) =>
    `${checkins} ${checkins === 1 ? "Check-in" : "Check-ins"}`;

  const todasModalidades = Array.from(
    new Set([...alunos.map((a) => a.modalidade), modalidade].filter(Boolean))
  ) as string[];

  const openEditar = (aluno: AlunoView) => {
    setAlunoEditando(aluno);
    const tipo = aluno.integrationType === "none" ? "" : (aluno.integrationType ?? "");
    setDadosEdicao({
      nome: aluno.nome,
      cpf: aluno.cpf ?? "",
      email: aluno.email ?? "",
      telefone: aluno.telefone ?? "",
      login: aluno.login ?? "",
      senha: "",
      modalidade: aluno.modalidade ?? modalidade,
      planoId: aluno.planoId,
      integrationType: tipo,
      integrationPlan: aluno.integrationPlan ?? "",
      statusMensalidade: (aluno as any).statusMensalidade ?? "Em dia",
      checkinsRealizados: aluno.checkinsRealizados ?? 0,
    });
    setDialogEditarAluno(true);
  };

  const handleEditarAluno = () => {
    const exigePlanoIntegracao = dadosEdicao.integrationType === "wellhub" || dadosEdicao.integrationType === "totalpass";
    if (
      alunoEditando &&
      dadosEdicao.nome &&
      dadosEdicao.cpf &&
      dadosEdicao.login &&
      dadosEdicao.modalidade &&
      dadosEdicao.integrationType &&
      dadosEdicao.planoId &&
      (!exigePlanoIntegracao || dadosEdicao.integrationPlan)
    ) {
      const payload: Partial<NovoAlunoDados & { senha?: string }> = { ...dadosEdicao };
      if (!payload.senha) delete payload.senha;
      if (!payload.integrationType) delete payload.integrationType;
      onEditarAluno(alunoEditando.id, payload);
      if (dadosEdicao.planoId && dadosEdicao.planoId !== alunoEditando.planoId) {
        onAlterarPlano(alunoEditando.id, dadosEdicao.planoId);
      }
      setDialogEditarAluno(false);
      setAlunoEditando(null);
    }
  };

  const confirmarExcluir = (aluno: AlunoView) => {
    setAlunoParaExcluir(aluno);
    setDialogConfirmarExcluir(true);
  };

  const handleExcluirAluno = () => {
    if (alunoParaExcluir) {
      onExcluirAluno(alunoParaExcluir.id);
      setDialogConfirmarExcluir(false);
      setAlunoParaExcluir(null);
    }
  };

  const handleRemoverCheckin = (aluno: AlunoView, index: number) => {
    onRemoverCheckin(aluno.id, index);
    setAlunoHistorico((prev) =>
      prev ? { ...prev, historico: prev.historico.filter((_, i) => i !== index) } : prev
    );
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center text-center sm:text-left sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex flex-col items-center sm:items-start sm:flex-row sm:items-center gap-4 min-w-0">
          <div className="relative shrink-0 flex flex-col items-center gap-1 rounded-2xl border bg-card px-2 py-2 shadow-sm overflow-hidden w-[130px] h-[120px] sm:w-[170px] sm:h-[150px]">
            <Avatar className="h-20 w-20 sm:h-28 sm:w-28">
              <AvatarImage src={photoUrl} alt={teacherName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {teacherInitials}
              </AvatarFallback>
            </Avatar>
            {onUpdatePhoto && (
              <label
                className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                title="Alterar foto"
                data-testid="label-teacher-photo-upload"
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {cropSrc && onUpdatePhoto && (
              <PhotoCropModal
                imageSrc={cropSrc}
                onConfirm={(b64) => { onUpdatePhoto(b64); setCropSrc(null); }}
                onRemove={() => { onUpdatePhoto(""); setCropSrc(null); }}
                onCancel={() => setCropSrc(null)}
              />
            )}
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 min-w-0 flex-nowrap">
            <h1 className="text-xl sm:text-2xl font-semibold break-words sm:whitespace-nowrap" data-testid="text-teacher-name">
              {teacherName}
            </h1>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <p className="text-xl sm:text-2xl font-semibold text-foreground break-words">{modalidade}</p>
          </div>
          {onIrAgenda && (
            <Button
              variant="outline"
              size="sm"
              onClick={onIrAgenda}
              data-testid="button-ir-agenda"
              className="w-full sm:w-fit sm:ml-2"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Agenda
            </Button>
          )}
        </div>
      </div>

      <>
      {/* Botão Cadastrar Aluno */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={() => { setNovoAluno(emptyAluno); setDialogNovoAluno(true); }}
            data-testid="button-add-student"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Cadastrar Aluno
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-muted-foreground text-center sm:text-left">
          Alunos ({alunos.length})
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setAlunosMinimizados((value) => !value)}
          data-testid="button-toggle-students"
        >
          {alunosMinimizados ? (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Mostrar alunos
            </>
          ) : (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Minimizar alunos
            </>
          )}
        </Button>
      </div>
      {alunosMinimizados ? (
        <Card className="mb-4">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Alunos visíveis</p>
            </div>
            <div className="space-y-2">
              {alunos.slice(0, 4).map((aluno) => {
                const progresso = aluno.plano > 0 ? Math.min(100, (aluno.checkinsRealizados / aluno.plano) * 100) : 0;
                return (
                  <div key={aluno.id} className="space-y-2 rounded-lg border bg-background px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {aluno.nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{aluno.nome}</span>
                          {aluno.modalidade && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{aluno.modalidade}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="whitespace-nowrap">
                            {aluno.ultimoCheckin ? `Último: ${aluno.ultimoCheckin.data} ${aluno.ultimoCheckin.hora}` : "Sem check-in recente"}
                          </span>
                          <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                            {aluno.plano > 0 ? `${aluno.checkinsRealizados}/${aluno.plano}` : aluno.planoValorTexto ?? "Mensalista"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {aluno.plano > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.round(progresso)}%</span>
                        </div>
                        <Progress value={progresso} data-testid={`progress-student-${aluno.id}`} />
                      </div>
                    )}
                  </div>
                );
              })}
              {alunos.length > 4 && (
                <p className="text-xs text-muted-foreground">+{alunos.length - 4} alunos</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {alunos.map((aluno) => {
          const isMensalista = aluno.integrationType === "mensalista";
          const isIntegration = aluno.integrationType === "wellhub" || aluno.integrationType === "totalpass";
          const temCheckins = aluno.plano > 0 && !isMensalista;
          const progresso = temCheckins ? (aluno.checkinsRealizados / aluno.plano) * 100 : 0;
          const initials = aluno.nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
          const alunoPayments = payments.filter((p) => p.studentId === aluno.id);

          const mensalistaPago = (!temCheckins || isMensalista) && alunoPayments.some((p) => p.status === "paid");

          return (
            <Card key={aluno.id} className="hover-elevate overflow-hidden" data-testid={`card-student-${aluno.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={aluno.photoUrl} alt={aluno.nome} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base whitespace-nowrap">{aluno.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{aluno.planoTitulo}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0 self-start">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditar(aluno)} data-testid={`button-edit-student-${aluno.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[10px] leading-none text-muted-foreground tabular-nums">
                      {temCheckins ? `${aluno.checkinsRealizados}/${aluno.plano}` : aluno.planoValorTexto ?? "Mensalista"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {temCheckins && <Progress value={Math.min(progresso, 100)} className="h-2" />}
                {!temCheckins && (
                  <div
                    className={`h-2 w-full rounded-full ${mensalistaPago ? "bg-green-500" : "bg-red-500"}`}
                    data-testid={`progress-mensalista-${aluno.id}`}
                  />
                )}
                {(!temCheckins) ? (
                  <>
                    <div
                      className={`w-full flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-white ${mensalistaPago ? "bg-green-600" : "bg-red-500"}`}
                      data-testid={`button-mensalista-${aluno.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {mensalistaPago ? "Mensalidade Paga" : "Mensalidade Pendente"}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => { setAlunoHistoricoPagamentos(aluno); setDialogHistoricoPagamentos(true); }}
                      data-testid={`button-historico-pagamentos-${aluno.id}`}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Histórico de Pagamentos
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => onCheckinManual(aluno.id)} data-testid={`button-manual-checkin-${aluno.id}`}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Check-in
                  </Button>
                )}
                {temCheckins && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openHistorico(aluno)} data-testid={`button-view-history-${aluno.id}`}>
                    Histórico
                  </Button>
                )}
                {temCheckins && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openRetroativo(aluno)} data-testid={`button-retroactive-checkin-${aluno.id}`}>
                    Registrar Aula
                  </Button>
                )}
                {!isMensalista && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setAlunoReceita(aluno); setDialogReceita(true); }} data-testid={`button-receita-${aluno.id}`}>
                    Receita Gerada
                  </Button>
                )}
                {!isIntegration && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openFinanceiro(aluno)} data-testid={`button-financeiro-${aluno.id}`}>
                    Cobrança e Pagamento
                  </Button>
                )}
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}

      {alunos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum aluno cadastrado nesta modalidade</p>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog: Cadastrar Aluno ── */}
      <Dialog open={dialogNovoAluno} onOpenChange={setDialogNovoAluno}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome do Aluno <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome completo"
                  value={novoAluno.nome}
                  onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                  data-testid="input-new-student-name"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="000.000.000-00"
                  value={novoAluno.cpf}
                  onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value, senha: e.target.value })}
                  data-testid="input-new-student-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={novoAluno.telefone}
                  onChange={(e) => setNovoAluno({ ...novoAluno, telefone: e.target.value })}
                  data-testid="input-new-student-phone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="email@exemplo.com"
                  type="email"
                  value={novoAluno.email}
                  onChange={(e) => setNovoAluno({ ...novoAluno, email: e.target.value, login: e.target.value })}
                  data-testid="input-new-student-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoAluno.login}
                  onChange={(e) => setNovoAluno({ ...novoAluno, login: e.target.value })}
                  data-testid="input-new-student-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="CPF do aluno"
                  type="text"
                  value={novoAluno.senha}
                  onChange={(e) => setNovoAluno({ ...novoAluno, senha: e.target.value, cpf: e.target.value })}
                  data-testid="input-new-student-password"
                />
              </div>
              <div className="space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Select
                  value={novoAluno.modalidade}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, modalidade: v })}
                >
                  <SelectTrigger data-testid="select-new-student-modality">
                    <SelectValue placeholder="Escolha a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {todasModalidades.map((mod) => (
                      <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo de aluno <span className="text-destructive">*</span></Label>
                <Select
                  value={novoAluno.integrationType}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, integrationType: v, integrationPlan: "", planoId: "" })}
                >
                  <SelectTrigger data-testid="select-new-student-integration-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(novoAluno.integrationType === "wellhub" || novoAluno.integrationType === "totalpass") && (
                <div className="col-span-2 space-y-1">
                  <Label>Plano da Integração <span className="text-destructive">*</span></Label>
                  {(() => {
                    const opts = Array.from(new Set(
                      modalidadeSettings
                        .map((s: any) => novoAluno.integrationType === "wellhub" ? s.wellhubPlanoMinimo : s.totalpassPlanoMinimo)
                        .filter(Boolean)
                    ));
                    return opts.length > 0 ? (
                      <Select
                        value={novoAluno.integrationPlan}
                        onValueChange={(v) => setNovoAluno({ ...novoAluno, integrationPlan: v })}
                      >
                        <SelectTrigger data-testid="input-new-student-integration-plan">
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {opts.map((p: any) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Ex: TP1, TP2, GP1..."
                        value={novoAluno.integrationPlan}
                        onChange={(e) => setNovoAluno({ ...novoAluno, integrationPlan: e.target.value })}
                        data-testid="input-new-student-integration-plan"
                      />
                    );
                  })()}
                </div>
              )}
              <div className="col-span-2 space-y-1">
                <Label>Plano de Aula <span className="text-destructive">*</span></Label>
                <Select
                  value={novoAluno.planoId}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, planoId: v })}
                  disabled={!novoAluno.integrationType}
                >
                  <SelectTrigger data-testid="select-new-student-plan">
                    <SelectValue placeholder={!novoAluno.integrationType ? "Selecione o tipo primeiro" : "Selecione o plano"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getPlanosPorIntegracao(novoAluno.integrationType).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {novoAluno.integrationType === "mensalista"
                          ? `${p.titulo} — ${p.valorTexto}`
                          : `${p.titulo} — ${getCheckinsLabel(p.checkins)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoAluno(false)}>Cancelar</Button>
            <Button
              onClick={handleCadastrarAluno}
              disabled={
                !novoAluno.nome ||
                !novoAluno.cpf ||
                !novoAluno.login ||
                !novoAluno.senha ||
                !novoAluno.modalidade ||
                !novoAluno.integrationType ||
                !novoAluno.planoId ||
                (
                  (novoAluno.integrationType === "wellhub" || novoAluno.integrationType === "totalpass") &&
                  !novoAluno.integrationPlan
                )
              }
              data-testid="button-confirm-new-student"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Aluno ── */}
      <Dialog open={dialogEditarAluno} onOpenChange={setDialogEditarAluno}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>{alunoEditando?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome do Aluno <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome completo"
                  value={dadosEdicao.nome ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, nome: e.target.value })}
                  data-testid="input-edit-student-name"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="000.000.000-00"
                  value={dadosEdicao.cpf ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, cpf: e.target.value, senha: e.target.value })}
                  data-testid="input-edit-student-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={dadosEdicao.telefone ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone: e.target.value })}
                  data-testid="input-edit-student-phone"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={dadosEdicao.login ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, login: e.target.value })}
                  data-testid="input-edit-student-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Nova Senha</Label>
                <Input
                  placeholder="CPF do aluno"
                  type="password"
                  value={dadosEdicao.senha ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, senha: e.target.value, cpf: e.target.value })}
                  data-testid="input-edit-student-password"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email</Label>
                <Input
                  placeholder="email@exemplo.com"
                  type="email"
                  value={dadosEdicao.email ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, email: e.target.value })}
                  data-testid="input-edit-student-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Modalidade"
                  value={dadosEdicao.modalidade ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, modalidade: e.target.value })}
                  data-testid="input-edit-student-modality"
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo de aluno <span className="text-destructive">*</span></Label>
                <Select
                  value={dadosEdicao.integrationType ?? ""}
                  onValueChange={(v) => setDadosEdicao({ ...dadosEdicao, integrationType: v, integrationPlan: "", planoId: "" })}
                >
                  <SelectTrigger data-testid="select-edit-student-integration-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(dadosEdicao.integrationType === "wellhub" || dadosEdicao.integrationType === "totalpass") && (
                <div className="col-span-2 space-y-1">
                  <Label>Plano da Integração <span className="text-destructive">*</span></Label>
                  {(() => {
                    const opts = Array.from(new Set(
                      modalidadeSettings
                        .map((s: any) => dadosEdicao.integrationType === "wellhub" ? s.wellhubPlanoMinimo : s.totalpassPlanoMinimo)
                        .filter(Boolean)
                    ));
                    return opts.length > 0 ? (
                      <Select
                        value={dadosEdicao.integrationPlan ?? ""}
                        onValueChange={(v) => setDadosEdicao({ ...dadosEdicao, integrationPlan: v })}
                      >
                        <SelectTrigger data-testid="input-edit-student-integration-plan">
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {opts.map((p: any) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Ex: TP1, TP2, GP1..."
                        value={dadosEdicao.integrationPlan ?? ""}
                        onChange={(e) => setDadosEdicao({ ...dadosEdicao, integrationPlan: e.target.value })}
                        data-testid="input-edit-student-integration-plan"
                      />
                    );
                  })()}
                </div>
              )}
              <div className="col-span-2 space-y-1">
                <Label>Plano de Aula <span className="text-destructive">*</span></Label>
                <Select
                  value={dadosEdicao.planoId ?? ""}
                  onValueChange={(v) => setDadosEdicao({ ...dadosEdicao, planoId: v })}
                  disabled={!dadosEdicao.integrationType}
                >
                  <SelectTrigger data-testid="select-edit-student-plan">
                    <SelectValue placeholder={!dadosEdicao.integrationType ? "Selecione o tipo primeiro" : "Selecione o plano"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getPlanosPorIntegracao(dadosEdicao.integrationType ?? "").map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {dadosEdicao.integrationType === "mensalista"
                          ? `${p.titulo} — ${p.valorTexto}`
                          : `${p.titulo} — ${getCheckinsLabel(p.checkins)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dadosEdicao.integrationType === "mensalista" && (
                <div className="space-y-1">
                  <Label>Status Mensalidade</Label>
                  <Select
                    value={dadosEdicao.statusMensalidade ?? "Em dia"}
                    onValueChange={(v) => setDadosEdicao({ ...dadosEdicao, statusMensalidade: v })}
                  >
                    <SelectTrigger data-testid="select-edit-student-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em dia">Em dia</SelectItem>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {dadosEdicao.integrationType !== "mensalista" && (
                <div className="space-y-1">
                  <Label>Check-ins realizados</Label>
                  <Input
                    type="number"
                    min={0}
                    value={dadosEdicao.checkinsRealizados ?? 0}
                    onChange={(e) => setDadosEdicao({ ...dadosEdicao, checkinsRealizados: Number(e.target.value) })}
                    data-testid="input-edit-student-checkins"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-row justify-between gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDialogEditarAluno(false);
                if (alunoEditando) confirmarExcluir(alunoEditando);
              }}
              data-testid="button-delete-from-edit"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir Aluno
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogEditarAluno(false)}>Cancelar</Button>
              <Button
                onClick={handleEditarAluno}
                disabled={!dadosEdicao.nome || !dadosEdicao.cpf || !dadosEdicao.login}
                data-testid="button-confirm-edit-student"
              >
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Exclusão ── */}
      <Dialog open={dialogConfirmarExcluir} onOpenChange={setDialogConfirmarExcluir}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Aluno</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{alunoParaExcluir?.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogConfirmarExcluir(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleExcluirAluno}
              data-testid="button-confirm-delete-student"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Histórico ── */}
      <Dialog open={dialogHistorico} onOpenChange={setDialogHistorico}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alunoHistorico?.nome}</DialogTitle>
            <DialogDescription>Histórico de check-in</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {alunoHistorico?.historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum check-in registrado</p>
            ) : (
              alunoHistorico?.historico.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0 group">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span className="text-sm">{item.data}</span>
                    <span className="text-sm text-muted-foreground">{item.hora}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => alunoHistorico && setConfirmRemoverCheckinTeacher({ aluno: alunoHistorico, index })}
                    data-testid={`button-delete-checkin-${index}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Alterar Plano ── */}
      <Dialog open={dialogAlterarPlano} onOpenChange={setDialogAlterarPlano}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alterar Plano: {alunoPlano?.nome}</DialogTitle>
            <DialogDescription>
              Plano atual: <strong>{alunoPlano?.planoTitulo}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {(alunoPlano?.integrationType === "mensalista"
              ? planos.filter(p => p.valorTexto)
              : planos
            ).map((p) => (
              <Button
                key={p.id}
                variant={alunoPlano?.planoId === p.id ? "default" : "outline"}
                className="w-full justify-between"
                onClick={() => {
                  if (alunoPlano) onAlterarPlano(alunoPlano.id, p.id);
                  setDialogAlterarPlano(false);
                }}
                data-testid={`button-plan-${p.id}`}
              >
                <span>{p.titulo}</span>
                <span className="text-xs opacity-70">
                  {alunoPlano?.integrationType === "mensalista"
                    ? (p.valorTexto ?? "")
                    : p.checkins > 0 ? `${p.checkins} check-in` : (p.valorTexto ?? "Mensalidade")}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Confirmar Remover Check-in ── */}
      <Dialog open={!!confirmRemoverCheckinTeacher} onOpenChange={(open) => { if (!open) setConfirmRemoverCheckinTeacher(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Check-in</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este check-in de <strong>{confirmRemoverCheckinTeacher?.aluno.nome}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoverCheckinTeacher(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemoverCheckinTeacher) {
                  handleRemoverCheckin(confirmRemoverCheckinTeacher.aluno, confirmRemoverCheckinTeacher.index);
                  setConfirmRemoverCheckinTeacher(null);
                }
              }}
              data-testid="button-confirm-remove-checkin-teacher"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Cobranças e Pagamentos ── */}
      <Dialog open={dialogFinanceiro} onOpenChange={setDialogFinanceiro}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              {alunoFinanceiro?.nome}
            </DialogTitle>
            <DialogDescription>Todas as cobranças e pagamentos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Cobranças */}
            {(() => {
              const cols = charges.filter((c) => c.studentId === alunoFinanceiro?.id);
              return cols.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Cobranças
                  </p>
                  <div className="space-y-1">
                    {cols.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`dialog-charge-${c.id}`}>
                        <div>
                          <p className="text-sm font-medium">{c.description}</p>
                          <p className="text-xs text-muted-foreground">Venc. {c.dueDate}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-medium">R$ {c.amount}</span>
                          {paymentStatusBadge(c.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Pagamentos */}
            {(() => {
              const pays = payments.filter((p) => p.studentId === alunoFinanceiro?.id);
              return pays.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Receipt className="h-3 w-3" />
                    Mensalidades
                  </p>
                  <div className="space-y-1">
                    {pays.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`dialog-payment-${p.id}`}>
                        <div>
                          <p className="text-sm font-medium">Mensalidade — {p.referenceMonth}</p>
                          <p className="text-xs text-muted-foreground">Venc. {p.dueDate}</p>
                          {p.paymentDate && (
                            <p className="text-xs text-green-600 dark:text-green-400">Pago em {p.paymentDate}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-medium">R$ {p.amount}</span>
                          {paymentStatusBadge(p.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {charges.filter((c) => c.studentId === alunoFinanceiro?.id).length === 0 &&
              payments.filter((p) => p.studentId === alunoFinanceiro?.id).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma cobrança ou pagamento registrado
                </p>
              )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Histórico de Pagamentos (Mensalista) ── */}
      <Dialog open={dialogHistoricoPagamentos} onOpenChange={setDialogHistoricoPagamentos}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alunoHistoricoPagamentos?.nome}</DialogTitle>
            <DialogDescription>Histórico de pagamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {(() => {
              const pays = payments
                .filter((p) => p.studentId === alunoHistoricoPagamentos?.id)
                .sort((a, b) => {
                  const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return db - da;
                });
              if (pays.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum pagamento registrado ainda.
                  </p>
                );
              }
              const metodoPagamento: Record<string, string> = { pix: "PIX", cartao: "Cartão", dinheiro: "Dinheiro" };
              return pays.map((p) => {
                const boletoDate = p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString("pt-BR")
                  : p.dueDate;
                return (
                  <div key={p.id} className="py-2 border-b last:border-0" data-testid={`historico-pagamento-${p.id}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className={`h-4 w-4 ${p.status === "paid" ? "text-green-500" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{p.referenceMonth}</span>
                      <span className="text-sm text-muted-foreground">— R$ {p.amount}</span>
                      <span className="ml-auto">{paymentStatusBadge(p.status)}</span>
                    </div>
                    <div className="pl-6 space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        Vencimento: <span className="text-foreground">{p.dueDate}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pagamento:{" "}
                        {p.paymentDate ? (
                          <span className="text-green-600 dark:text-green-400">
                            {p.paymentDate}
                            {p.paymentMethod && ` · ${metodoPagamento[p.paymentMethod] ?? p.paymentMethod}`}
                          </span>
                        ) : (
                          <span className="text-orange-500">Aguardando</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Check-in Retroativo ── */}
      <Dialog open={dialogRetroativo} onOpenChange={setDialogRetroativo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Registrar Aula</DialogTitle>
            <DialogDescription asChild>
              <p className="font-bold text-foreground text-sm">
                Selecione a data e hora da aula.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={dataRetroativa}
                  onChange={(e) => setDataRetroativa(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-retroactive-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={horaRetroativa}
                  onChange={(e) => setHoraRetroativa(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-retroactive-time"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRetroativo(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCheckinRetroativo}
              disabled={!dataRetroativa || !horaRetroativa}
              data-testid="button-confirm-retroactive"
            >
              Confirmar Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Receita Gerada ── */}
      <Dialog open={dialogReceita} onOpenChange={setDialogReceita}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Receita Gerada
            </DialogTitle>
            <DialogDescription>{alunoReceita?.nome}</DialogDescription>
          </DialogHeader>
          {receitaLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : receitaAlunoData ? (
            <div className="space-y-3 py-2">
              {/* Check-in stats — always show when valorUnitario is configured */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                  <p className="text-2xl font-bold" data-testid="dialog-receita-checkins">{receitaAlunoData.checkins}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Valor/Check-in</p>
                  <p className="text-2xl font-bold">
                    {(receitaAlunoData.valorUnitario ?? 0) > 0
                      ? (receitaAlunoData.valorUnitario ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : <span className="text-muted-foreground text-base">Não configurado</span>}
                  </p>
                </div>
              </div>

              {/* Breakdown rows */}
              <div className="rounded-lg border divide-y text-sm">
                {receitaAlunoData.checkins > 0 && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Check-ins ({receitaAlunoData.checkins})</span>
                    <span className="font-medium">{(receitaAlunoData.receitaCheckins ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
                {receitaAlunoData.receitaMensalidades > 0 && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Mensalidades pagas</span>
                    <span className="font-medium">{(receitaAlunoData.receitaMensalidades ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
                {receitaAlunoData.receitaCobranças > 0 && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Cobranças pagas</span>
                    <span className="font-medium">{(receitaAlunoData.receitaCobranças ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
                {receitaAlunoData.receitaTotal === 0 && (
                  <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                    Nenhuma receita registrada ainda.
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Receita Total Gerada</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="dialog-receita-total">
                  {(receitaAlunoData.receitaTotal ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>

              {/* Commission info */}
              {percentualComissao && parseFloat(percentualComissao) > 0 && (
                <div className="rounded-lg border divide-y text-sm">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Sua comissão (%)</span>
                    <span className="font-medium">{percentualComissao}%</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Comissão sobre check-ins</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {((receitaAlunoData.receitaCheckins ?? 0) * parseFloat(percentualComissao) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReceita(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </>
    </div>
  );
}
