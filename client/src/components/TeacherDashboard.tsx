import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle2, History, CalendarClock, UserPlus, Pencil, Trash2, DollarSign, Receipt, Banknote, Eye } from "lucide-react";
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
}

function paymentStatusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-1.5 py-0">Pago</Badge>;
  if (status === "overdue") return <Badge variant="destructive" className="text-xs px-1.5 py-0">Atrasado</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs px-1.5 py-0">Pendente</Badge>;
}

interface TeacherDashboardProps {
  teacherName: string;
  modalidade: string;
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
}

export default function TeacherDashboard({
  teacherName,
  modalidade,
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
}: TeacherDashboardProps) {
  const emptyAluno: NovoAlunoDados = {
    nome: "", cpf: "", email: "", telefone: "",
    login: "", senha: "", modalidade, planoId: planos[0]?.id ?? "",
    integrationType: "none", integrationPlan: "",
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
  }>({
    queryKey: ["/api/finance/receita/aluno", alunoReceita?.id],
    queryFn: () => fetch(`/api/finance/receita/aluno/${alunoReceita!.id}`).then((r) => r.json()),
    enabled: !!alunoReceita,
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCadastrarAluno = () => {
    if (novoAluno.nome && novoAluno.cpf && novoAluno.login && novoAluno.senha && novoAluno.planoId) {
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

  const openEditar = (aluno: AlunoView) => {
    setAlunoEditando(aluno);
    setDadosEdicao({
      nome: aluno.nome,
      cpf: aluno.cpf ?? "",
      email: aluno.email ?? "",
      telefone: aluno.telefone ?? "",
      login: aluno.login ?? "",
      senha: "",
      modalidade: aluno.modalidade ?? modalidade,
      planoId: aluno.planoId,
      integrationType: aluno.integrationType ?? "none",
      integrationPlan: aluno.integrationPlan ?? "",
    });
    setDialogEditarAluno(true);
  };

  const handleEditarAluno = () => {
    if (alunoEditando && dadosEdicao.nome && dadosEdicao.cpf && dadosEdicao.login) {
      const payload: Partial<NovoAlunoDados & { senha?: string }> = { ...dadosEdicao };
      if (!payload.senha) delete payload.senha;
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
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-teacher-name">
          Professor {teacherName}
        </h1>
        <p className="text-muted-foreground">{modalidade}</p>
      </div>

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

      {/* Grade de alunos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alunos.map((aluno) => {
          const temCheckins = aluno.plano > 0;
          const progresso = temCheckins ? (aluno.checkinsRealizados / aluno.plano) * 100 : 0;
          const initials = aluno.nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
          const alunoCharges = charges.filter((c) => c.studentId === aluno.id && c.status === "pending");
          const alunoPayments = payments.filter((p) => p.studentId === aluno.id);

          return (
            <Card key={aluno.id} className="hover-elevate" data-testid={`card-student-${aluno.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={aluno.photoUrl} alt={aluno.nome} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{aluno.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{aluno.planoTitulo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {temCheckins ? (
                      <Badge variant={progresso >= 100 ? "default" : "secondary"} className="text-xs">
                        {aluno.checkinsRealizados}/{aluno.plano}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {aluno.planoValorTexto ?? "Mensalista"}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditar(aluno)}
                      data-testid={`button-edit-student-${aluno.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {temCheckins && <Progress value={Math.min(progresso, 100)} />}

                {/* Valor a Pagar (cobranças pendentes) */}
                {alunoCharges.length > 0 && (
                  <div className="rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-3 py-2">
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1 mb-1">
                      <DollarSign className="h-3 w-3" />
                      Valor a Pagar
                    </p>
                    {alunoCharges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs" data-testid={`teacher-charge-${c.id}`}>
                        <span className="text-muted-foreground truncate mr-2">{c.description}</span>
                        <span className="font-medium text-orange-700 dark:text-orange-400 shrink-0">R$ {c.amount}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Histórico Financeiro (igual ao painel do aluno) */}
                {alunoPayments.length > 0 && (
                  <div className="rounded-md border px-3 py-2 space-y-0">
                    <p className="text-xs font-semibold flex items-center gap-1 mb-2">
                      <Receipt className="h-3 w-3" />
                      Histórico Financeiro
                    </p>
                    {alunoPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-1.5 border-b last:border-0"
                        data-testid={`teacher-payment-${p.id}`}
                      >
                        <div>
                          <p className="text-xs font-medium">Mensalidade — {p.referenceMonth}</p>
                          <p className="text-xs text-muted-foreground">Venc. {p.dueDate}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-xs font-medium">R$ {p.amount}</span>
                          {paymentStatusBadge(p.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!temCheckins ? (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    data-testid={`button-mensalista-${aluno.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Plano Mensalista
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => onCheckinManual(aluno.id)}
                    data-testid={`button-manual-checkin-${aluno.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Check-in
                  </Button>
                )}

                {temCheckins && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openHistorico(aluno)}
                    data-testid={`button-view-history-${aluno.id}`}
                  >
                    Histórico
                  </Button>
                )}

                {temCheckins && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openRetroativo(aluno)}
                    data-testid={`button-retroactive-checkin-${aluno.id}`}
                  >
                    Registrar Aula
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openAlterarPlano(aluno)}
                  data-testid={`button-edit-plan-${aluno.id}`}
                >
                  Alterar Plano
                </Button>

                {getValorPorCheckin(aluno.modalidade ?? modalidade) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setAlunoReceita(aluno); setDialogReceita(true); }}
                    data-testid={`button-receita-${aluno.id}`}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Receita Gerada
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openFinanceiro(aluno)}
                  data-testid={`button-financeiro-${aluno.id}`}
                >
                  Cobrança e Pagamento
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {alunos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum aluno cadastrado nesta modalidade</p>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog: Cadastrar Aluno ── */}
      <Dialog open={dialogNovoAluno} onOpenChange={setDialogNovoAluno}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
                  onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value })}
                  data-testid="input-new-student-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={novoAluno.telefone}
                  onChange={(e) => setNovoAluno({ ...novoAluno, telefone: e.target.value })}
                  data-testid="input-new-student-phone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email</Label>
                <Input
                  placeholder="email@exemplo.com"
                  type="email"
                  value={novoAluno.email}
                  onChange={(e) => setNovoAluno({ ...novoAluno, email: e.target.value })}
                  data-testid="input-new-student-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="login de acesso"
                  value={novoAluno.login}
                  onChange={(e) => setNovoAluno({ ...novoAluno, login: e.target.value })}
                  data-testid="input-new-student-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="senha de acesso"
                  type="password"
                  value={novoAluno.senha}
                  onChange={(e) => setNovoAluno({ ...novoAluno, senha: e.target.value })}
                  data-testid="input-new-student-password"
                />
              </div>
              <div className="space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Modalidade"
                  value={novoAluno.modalidade}
                  onChange={(e) => setNovoAluno({ ...novoAluno, modalidade: e.target.value })}
                  data-testid="input-new-student-modality"
                />
              </div>
              <div className="space-y-1">
                <Label>Plano <span className="text-destructive">*</span></Label>
                <Select
                  value={novoAluno.planoId}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, planoId: v })}
                >
                  <SelectTrigger data-testid="select-new-student-plan">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Integração</Label>
                <Select
                  value={novoAluno.integrationType}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, integrationType: v, integrationPlan: "" })}
                >
                  <SelectTrigger data-testid="select-new-student-integration-type">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {novoAluno.integrationType !== "none" && (
                <div className="space-y-1">
                  <Label>Plano da Integração</Label>
                  <Input
                    placeholder="Ex: TP1, TP2, GP1..."
                    value={novoAluno.integrationPlan}
                    onChange={(e) => setNovoAluno({ ...novoAluno, integrationPlan: e.target.value })}
                    data-testid="input-new-student-integration-plan"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoAluno(false)}>Cancelar</Button>
            <Button
              onClick={handleCadastrarAluno}
              disabled={!novoAluno.nome || !novoAluno.cpf || !novoAluno.login || !novoAluno.senha || !novoAluno.planoId}
              data-testid="button-confirm-new-student"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar Aluno ── */}
      <Dialog open={dialogEditarAluno} onOpenChange={setDialogEditarAluno}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>{alunoEditando?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, cpf: e.target.value })}
                  data-testid="input-edit-student-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={dadosEdicao.telefone ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, telefone: e.target.value })}
                  data-testid="input-edit-student-phone"
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
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="login de acesso"
                  value={dadosEdicao.login ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, login: e.target.value })}
                  data-testid="input-edit-student-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Nova Senha</Label>
                <Input
                  placeholder="senha aluno"
                  type="password"
                  value={dadosEdicao.senha ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, senha: e.target.value })}
                  data-testid="input-edit-student-password"
                />
              </div>
              <div className="space-y-1">
                <Label>Modalidade</Label>
                <Input
                  placeholder="Modalidade"
                  value={dadosEdicao.modalidade ?? ""}
                  onChange={(e) => setDadosEdicao({ ...dadosEdicao, modalidade: e.target.value })}
                  data-testid="input-edit-student-modality"
                />
              </div>
              <div className="space-y-1">
                <Label>Plano</Label>
                <Select
                  value={dadosEdicao.planoId ?? ""}
                  onValueChange={(v) => setDadosEdicao({ ...dadosEdicao, planoId: v })}
                >
                  <SelectTrigger data-testid="select-edit-student-plan">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Integração</Label>
                <Select
                  value={dadosEdicao.integrationType ?? "none"}
                  onValueChange={(v) => setDadosEdicao({ ...dadosEdicao, integrationType: v, integrationPlan: "" })}
                >
                  <SelectTrigger data-testid="select-edit-student-integration-type">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dadosEdicao.integrationType !== "none" && (
                <div className="col-span-2 space-y-1">
                  <Label>Plano da Integração</Label>
                  <Input
                    placeholder="Ex: TP1, TP2, GP1..."
                    value={dadosEdicao.integrationPlan ?? ""}
                    onChange={(e) => setDadosEdicao({ ...dadosEdicao, integrationPlan: e.target.value })}
                    data-testid="input-edit-student-integration-plan"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Plano: {alunoPlano?.nome}</DialogTitle>
            <DialogDescription>
              Plano atual: <strong>{alunoPlano?.planoTitulo}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {planos.map((p) => (
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
                  {p.checkins > 0 ? `${p.checkins} check-in` : (p.valorTexto ?? "Mensalidade")}
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
        <DialogContent className="max-w-md">
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

      {/* ── Dialog: Check-in Retroativo ── */}
      <Dialog open={dialogRetroativo} onOpenChange={setDialogRetroativo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Registrar Aula</DialogTitle>
            <DialogDescription asChild>
              <p className="font-bold text-foreground text-sm">
                Selecione a data e hora da aula que não foi registrada.
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
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                  <p className="text-2xl font-bold" data-testid="dialog-receita-checkins">{receitaAlunoData.checkins}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Valor/Check-in</p>
                  <p className="text-2xl font-bold">R$ {receitaAlunoData.valorUnitario.toFixed(2).replace(".", ",")}</p>
                </div>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Receita Total Gerada</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="dialog-receita-total">
                  R$ {receitaAlunoData.receitaTotal.toFixed(2).replace(".", ",")}
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {receitaAlunoData.checkins} check-ins × R$ {receitaAlunoData.valorUnitario.toFixed(2).replace(".", ",")} por check-in
              </p>
              {receitaAlunoData.checkins === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Nenhum check-in financeiro registrado. Os dados são gerados automaticamente a partir do próximo check-in.
                </p>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogReceita(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
