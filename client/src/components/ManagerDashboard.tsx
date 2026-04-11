import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  CheckCircle,
  XCircle,
  UserCheck,
  UserPlus,
  Pencil,
  Trash2,
  Plus,
  DollarSign,
  Receipt,
  TrendingUp,
  MoreHorizontal,
  History,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  Settings,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import type { Plano } from "@/pages/Home";

interface AlunoGestor {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  login?: string;
  modalidade: string;
  plano: number;
  planoId: string;
  planoTitulo: string;
  planoValorTexto?: string;
  checkinsRealizados: number;
  statusMensalidade: "Em dia" | "Pendente";
  ultimoCheckin?: string;
  aprovado: boolean;
  historico: Array<{ data: string; hora: string }>;
  integrationType?: string;
  integrationPlan?: string;
}

interface ProfessorGestor {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  login?: string;
  modalidade: string;
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
}

interface ManagerDashboardProps {
  planos: Plano[];
  alunos: AlunoGestor[];
  professores: ProfessorGestor[];
  onAprovarAluno: (alunoId: string) => void;
  onCadastrarProfessor: (dados: { nome: string; cpf: string; email: string; telefone: string; login: string; senha: string; modalidade: string }) => void;
  onEditarProfessor: (id: string, dados: { nome: string; cpf?: string; email?: string; telefone?: string; login?: string; senha?: string; modalidade: string }) => void;
  onExcluirProfessor: (id: string) => void;
  onCadastrarAluno: (dados: NovoAlunoDados) => void;
  onCriarPlano: (titulo: string, checkins: number, valorTexto?: string) => void;
  onEditarPlano: (id: string, titulo: string, checkins: number, valorTexto?: string) => void;
  onExcluirPlano: (id: string) => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
  onRegistrarPagamento: (dados: { studentId: string; description?: string; amount: string; referenceMonth: string; dueDate: string; status: string }) => void;
  onCriarCobranca: (dados: { studentId: string; description: string; amount: string; dueDate: string }) => void;
  onIrFinanceiro: () => void;
  onIrConfiguracoes?: () => void;
  onIrAlertas?: () => void;
  onEditarAluno: (dados: { id: string; nome: string; cpf: string; email: string; telefone: string; login: string; senha?: string; modalidade: string; statusMensalidade: string; checkinsRealizados: number; planoId: string; integrationType: string; integrationPlan: string }) => void;
  onAlterarPlanoAluno: (alunoId: string, planoId: string) => void;
  onCheckinManual: (alunoId: string, data?: string, hora?: string) => void;
  onRemoverCheckin: (alunoId: string, index: number) => void;
  onExcluirAluno: (alunoId: string) => void;
}


export default function ManagerDashboard({
  planos,
  alunos,
  professores,
  onAprovarAluno,
  onCadastrarProfessor,
  onEditarProfessor,
  onExcluirProfessor,
  onCadastrarAluno,
  onCriarPlano,
  onEditarPlano,
  onExcluirPlano,
  onExportarPDF,
  onExportarExcel,
  onRegistrarPagamento,
  onCriarCobranca,
  onIrFinanceiro,
  onIrConfiguracoes,
  onIrAlertas,
  onEditarAluno,
  onAlterarPlanoAluno,
  onCheckinManual,
  onRemoverCheckin,
  onExcluirAluno,
}: ManagerDashboardProps) {
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");

  // Financial state
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogCobranca, setDialogCobranca] = useState(false);
  const [dialogValidarPagamento, setDialogValidarPagamento] = useState(false);
  const [alunoValidarId, setAlunoValidarId] = useState<string>("");
  const [alunoValidarNome, setAlunoValidarNome] = useState<string>("");
  const [alunoFinanceiroId, setAlunoFinanceiroId] = useState<string>("");
  const [formPagamento, setFormPagamento] = useState({ description: "", amount: "", referenceMonth: "", dueDate: "", status: "paid" });
  const [formCobranca, setFormCobranca] = useState({ description: "", amount: "", dueDate: "" });

  // Histórico financeiro state
  const [dialogHistFinanceiro, setDialogHistFinanceiro] = useState(false);
  const [alunoHistFinanceiroId, setAlunoHistFinanceiroId] = useState<string>("");
  const [alunoHistFinanceiroNome, setAlunoHistFinanceiroNome] = useState<string>("");
  const [confirmDeleteFinanceiro, setConfirmDeleteFinanceiro] = useState<{ type: "payment" | "charge"; id: string; label: string } | null>(null);

  // Editar aluno state
  const [dialogEditarAluno, setDialogEditarAluno] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<AlunoGestor | null>(null);
  const [formEditarAluno, setFormEditarAluno] = useState({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", statusMensalidade: "Em dia" as string, checkinsRealizados: 0, planoId: "", integrationType: "none", integrationPlan: "" });

  // Alterar plano state
  const [dialogAlterarPlano, setDialogAlterarPlano] = useState(false);
  const [alunoPlanoId, setAlunoPlanoId] = useState<string>("");
  const [novoPlanoId, setNovoPlanoId] = useState<string>("");

  // Histórico state
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [alunoHistorico, setAlunoHistorico] = useState<AlunoGestor | null>(null);

  // Checkin retroativo state
  const [dialogCheckinRetro, setDialogCheckinRetro] = useState(false);
  const [alunoCheckinId, setAlunoCheckinId] = useState<string>("");
  const [formCheckin, setFormCheckin] = useState({ data: "", hora: "" });

  // Excluir aluno state
  const [confirmExcluirAluno, setConfirmExcluirAluno] = useState<AlunoGestor | null>(null);

  // Confirmação excluir plano e professor
  const [confirmExcluirPlano, setConfirmExcluirPlano] = useState<{ id: string; titulo: string } | null>(null);
  const [confirmExcluirProfessor, setConfirmExcluirProfessor] = useState<ProfessorGestor | null>(null);

  // Confirmação remover checkin no histórico
  const [confirmRemoverCheckin, setConfirmRemoverCheckin] = useState<{ alunoId: string; index: number } | null>(null);

  // Subscription state
  const [showPayDialog, setShowPayDialog] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: subscription } = useQuery<{
    subscriptionPlan: string;
    subscriptionStartDate?: string;
    subscriptionValue?: string;
    subscriptionStatus?: string;
    nextBillingDate?: string;
  }>({ queryKey: ["/api/subscription"] });

  const pagarAssinatura = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscription/pay").then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/subscription"] });
      setShowPayDialog(false);
      toast({ title: "Pagamento registrado!", description: "Sua assinatura foi renovada com sucesso." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar o pagamento.", variant: "destructive" }),
  });

  // Queries financeiras para histórico
  const { data: allPayments = [] } = useQuery<any[]>({ queryKey: ["/api/finance/payments"] });
  const { data: allCharges = [] } = useQuery<any[]>({ queryKey: ["/api/finance/charges"] });
  const { data: modalidadeSettingsList = [] } = useQuery<any[]>({ queryKey: ["/api/configuracoes/modalidades"] });

  const deletePayment = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      setConfirmDeleteFinanceiro(null);
      toast({ title: "Pagamento removido" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" }),
  });

  const deleteCharge = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/charges/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/charges"] });
      setConfirmDeleteFinanceiro(null);
      toast({ title: "Cobrança removida" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" }),
  });

  const handleConfirmDeleteFinanceiro = () => {
    if (!confirmDeleteFinanceiro) return;
    if (confirmDeleteFinanceiro.type === "payment") deletePayment.mutate(confirmDeleteFinanceiro.id);
    else deleteCharge.mutate(confirmDeleteFinanceiro.id);
  };

  const validarPagamento = useMutation({
    mutationFn: ({ type, id }: { type: "payment" | "charge"; id: string }) => {
      const today = new Date().toLocaleDateString("pt-BR");
      if (type === "payment") {
        return apiRequest("PUT", `/api/finance/payments/${id}`, { status: "paid", paymentDate: today });
      } else {
        return apiRequest("PUT", `/api/finance/charges/${id}`, { status: "paid", paymentDate: today });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/charges"] });
      qc.invalidateQueries({ queryKey: ["/api/alunos"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/receita/aluno"] });
      toast({ title: "Pagamento validado!", description: "Receita e histórico atualizados." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível validar o pagamento.", variant: "destructive" }),
  });

  // Professor state
  const [dialogProfessor, setDialogProfessor] = useState(false);
  const [professorEditando, setProfessorEditando] = useState<ProfessorGestor | null>(null);
  const [formProfessor, setFormProfessor] = useState({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "" });

  // Aluno state
  const [dialogNovoAluno, setDialogNovoAluno] = useState(false);
  const [novoAluno, setNovoAluno] = useState<NovoAlunoDados>({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    login: "",
    senha: "",
    modalidade: "",
    planoId: planos[0]?.id ?? "",
    integrationType: "none",
    integrationPlan: "",
    mensalistaValor: "",
  });

  // Plano state
  const [dialogNovoPlano, setDialogNovoPlano] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
  const [formPlano, setFormPlano] = useState({ titulo: "", checkins: "", valorTexto: "" });

  // ── Planos ──────────────────────────────────────────────────────────────
  const getPlanoDescricao = (plano: Plano) => {
    const parts: string[] = [];
    if (plano.checkins > 0) parts.push(`${plano.checkins} aulas`);
    if (plano.valorTexto) parts.push(plano.valorTexto);
    return parts.length > 0 ? parts.join(" · ") : "Sem detalhes";
  };

  const abrirEditarPlano = (plano: Plano) => {
    setPlanoEditando(plano);
    setFormPlano({
      titulo: plano.titulo,
      checkins: plano.checkins > 0 ? String(plano.checkins) : "",
      valorTexto: plano.valorTexto?.replace("R$ ", "") ?? "",
    });
  };

  const handleSalvarPlano = () => {
  // 1. Garantimos que os valores são strings antes de usar .trim()
  const tituloVal = (formPlano.titulo || "").trim();
  const checkinsVal = String(formPlano.checkins || "").trim();
  const valorTextoVal = String(formPlano.valorTexto || "").trim();

  // 2. Verificação de segurança: título é obrigatório 
  // E deve ter ou checkins ou um valor em dinheiro
  if (!tituloVal || (!checkinsVal && !valorTextoVal)) return;

  // 3. Conversão segura
  const checkins = checkinsVal ? parseInt(checkinsVal, 10) : 0;
  const valorTexto = valorTextoVal
    ? (valorTextoVal.startsWith("R$") ? valorTextoVal : `R$ ${valorTextoVal}`)
    : undefined;

  if (planoEditando) {
    onEditarPlano(planoEditando.id, tituloVal, checkins, valorTexto);
    setPlanoEditando(null);
  } else {
    onCriarPlano(tituloVal, checkins, valorTexto);
    setDialogNovoPlano(false);
  }

  // 4. Limpeza do estado
  setFormPlano({ titulo: "", checkins: "", valorTexto: "" });
};

  // ── Professores ──────────────────────────────────────────────────────────
  const abrirEditarProfessor = (p: ProfessorGestor) => {
    setProfessorEditando(p);
    setFormProfessor({ nome: p.nome, cpf: p.cpf || "", email: p.email || "", telefone: p.telefone || "", login: p.login || "", senha: "", modalidade: p.modalidade });
  };

  const handleSalvarProfessor = () => {
    if (!formProfessor.nome || !formProfessor.modalidade) return;
    if (professorEditando) {
      const dados: { nome: string; cpf?: string; email?: string; telefone?: string; login?: string; senha?: string; modalidade: string } = {
        nome: formProfessor.nome,
        cpf: formProfessor.cpf || undefined,
        email: formProfessor.email || undefined,
        telefone: formProfessor.telefone || undefined,
        login: formProfessor.login || undefined,
        modalidade: formProfessor.modalidade,
      };
      if (formProfessor.senha) dados.senha = formProfessor.senha;
      onEditarProfessor(professorEditando.id, dados);
      setProfessorEditando(null);
    } else {
      if (!formProfessor.login || !formProfessor.senha) return;
      onCadastrarProfessor({ nome: formProfessor.nome, cpf: formProfessor.cpf, email: formProfessor.email, telefone: formProfessor.telefone, login: formProfessor.login, senha: formProfessor.senha, modalidade: formProfessor.modalidade });
      setDialogProfessor(false);
    }
    setFormProfessor({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "" });
  };

  // ── Alunos ───────────────────────────────────────────────────────────────
  const handleCadastrarAluno = () => {
    if (novoAluno.nome && novoAluno.cpf && novoAluno.modalidade && novoAluno.planoId) {
      onCadastrarAluno(novoAluno);
      setNovoAluno({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: planos[0]?.id ?? "", integrationType: "none", integrationPlan: "", mensalistaValor: "" });
      setDialogNovoAluno(false);
    }
  };

  // Modalidades únicas de alunos + professores
  const todasModalidades = Array.from(
    new Set([...alunos.map((a) => a.modalidade), ...professores.map((p) => p.modalidade)].filter(Boolean))
  );

  const alunosFiltrados = alunos.filter(
    (a) => filtroModalidade === "todas" || a.modalidade === filtroModalidade
  );
  const alunosPendentes = alunos.filter((a) => !a.aprovado);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-manager-title">Painel do Gestor</h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-students">{alunos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600" data-testid="text-pending-students">
              {alunosPendentes.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Professores Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-teachers">{professores.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Assinatura do Sistema ── */}
      {subscription && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />Assinatura do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Plano contratado</p>
                <p className="font-semibold capitalize">
                  {subscription.subscriptionPlan === "basic" ? "Plano Básico" : subscription.subscriptionPlan === "premium" ? "Plano Premium" : subscription.subscriptionPlan}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Valor mensal</p>
                <p className="font-semibold">{subscription.subscriptionValue ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                <Badge variant={subscription.subscriptionStatus === "Ativo" ? "default" : subscription.subscriptionStatus === "Em atraso" ? "destructive" : "secondary"} data-testid="badge-subscription-status">
                  {subscription.subscriptionStatus === "Ativo"
                    ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{subscription.subscriptionStatus}</span>
                    : <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />{subscription.subscriptionStatus}</span>}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Data de início</p>
                <p className="font-semibold">{subscription.subscriptionStartDate ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Próxima cobrança</p>
                <p className="font-semibold">{subscription.nextBillingDate ?? "—"}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowPayDialog(true)} data-testid="button-pay-subscription">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Pagar assinatura
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog Pagar Assinatura */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Pagar Assinatura</DialogTitle>
            <DialogDescription>Confirme o pagamento da sua assinatura do sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted/40 rounded-md p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano atual</span>
                <span className="font-medium">
                  {subscription?.subscriptionPlan === "basic" ? "Plano Básico" : subscription?.subscriptionPlan === "premium" ? "Plano Premium" : (subscription?.subscriptionPlan ?? "—")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor mensal</span>
                <span className="font-semibold">{subscription?.subscriptionValue ?? "—"}</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Formas de pagamento aceitas:</p>
              <p>• Pix</p>
              <p>• Cartão de crédito/débito</p>
              <p>• Boleto bancário</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancelar</Button>
            <Button onClick={() => pagarAssinatura.mutate()} disabled={pagarAssinatura.isPending} data-testid="button-confirm-pay-subscription">
              {pagarAssinatura.isPending ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cadastrar Aluno — botão grande igual ao Check-in ── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={() => setDialogNovoAluno(true)}
            data-testid="button-add-student-manager"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Cadastrar Aluno
          </Button>
        </CardContent>
      </Card>

      {/* Dialog Cadastrar Aluno */}
      <Dialog open={dialogNovoAluno} onOpenChange={setDialogNovoAluno}>
        <DialogContent className="max-w-md">
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
                  data-testid="input-manager-student-name"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="000.000.000-00"
                  value={novoAluno.cpf}
                  onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value })}
                  data-testid="input-manager-student-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={novoAluno.telefone}
                  onChange={(e) => setNovoAluno({ ...novoAluno, telefone: e.target.value })}
                  data-testid="input-manager-student-telefone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoAluno.email}
                  onChange={(e) => setNovoAluno({ ...novoAluno, email: e.target.value })}
                  data-testid="input-manager-student-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="login de acesso"
                  value={novoAluno.login}
                  onChange={(e) => setNovoAluno({ ...novoAluno, login: e.target.value })}
                  data-testid="input-manager-student-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="senha de acesso"
                  value={novoAluno.senha}
                  onChange={(e) => setNovoAluno({ ...novoAluno, senha: e.target.value })}
                  data-testid="input-manager-student-senha"
                />
              </div>
              <div className="space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Select
                  value={novoAluno.modalidade}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, modalidade: v })}
                >
                  <SelectTrigger data-testid="select-manager-student-modality">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {todasModalidades.map((mod) => (
                      <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Plano <span className="text-destructive">*</span></Label>
                <Select
                  value={novoAluno.planoId}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, planoId: v })}
                >
                  <SelectTrigger data-testid="select-manager-student-plan">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(novoAluno.integrationType === "mensalista"
                      ? planos.filter(p => p.valorTexto)
                      : planos
                    ).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {novoAluno.integrationType === "mensalista"
                          ? `${p.titulo} — ${p.valorTexto}`
                          : `${p.titulo} — ${getPlanoDescricao(p)}`}
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
                  <SelectTrigger data-testid="select-manager-student-integration-type">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {novoAluno.integrationType !== "none" && novoAluno.integrationType !== "mensalista" && (
                <div className="space-y-1">
                  <Label>Plano da Integração</Label>
                  {(() => {
                    const opts = Array.from(new Set(
                      modalidadeSettingsList
                        .map((s: any) => novoAluno.integrationType === "wellhub" ? s.wellhubPlanoMinimo : s.totalpassPlanoMinimo)
                        .filter(Boolean)
                    ));
                    return opts.length > 0 ? (
                      <Select
                        value={novoAluno.integrationPlan}
                        onValueChange={(v) => setNovoAluno({ ...novoAluno, integrationPlan: v })}
                      >
                        <SelectTrigger data-testid="input-manager-student-integration-plan">
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
                        data-testid="input-manager-student-integration-plan"
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoAluno(false)}>Cancelar</Button>
            <Button
              onClick={handleCadastrarAluno}
              disabled={!novoAluno.nome || !novoAluno.cpf || !novoAluno.login || !novoAluno.senha || !novoAluno.modalidade || !novoAluno.planoId}
              data-testid="button-confirm-manager-student"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Planos ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
                data-testid={`plan-${plano.id}`}
              >
                <div>
                  <p className="font-medium">{plano.titulo}</p>
                  <p className="text-sm text-muted-foreground">{getPlanoDescricao(plano)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => abrirEditarPlano(plano)}
                    data-testid={`button-edit-plan-${plano.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmExcluirPlano({ id: plano.id, titulo: plano.titulo })}
                    data-testid={`button-delete-plan-${plano.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              size="lg"
              className="w-full h-14 text-lg mt-2"
              onClick={() => { setFormPlano({ titulo: "", valor: "" }); setDialogNovoPlano(true); }}
              data-testid="button-add-plan"
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar novo plano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog criar plano */}
      <Dialog open={dialogNovoPlano} onOpenChange={setDialogNovoPlano}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Plano</DialogTitle>
            <DialogDescription>
              Preencha o número de aulas, o valor mensal, ou ambos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Título do plano</Label>
              <Input
                placeholder="Ex: 3x por semana, Intensivo..."
                value={formPlano.titulo}
                onChange={(e) => setFormPlano({ ...formPlano, titulo: e.target.value })}
                data-testid="input-plan-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº de aulas</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 8"
                  value={formPlano.checkins ?? ""}
                  onChange={(e) => setFormPlano({ ...formPlano, checkins: e.target.value })}
                  data-testid="input-plan-checkins"
                />
              </div>
              <div className="space-y-1">
                <Label>Valor mensal (R$)</Label>
                <Input
                  placeholder="Ex: 200,00"
                  value={formPlano.valorTexto ?? ""}
                  onChange={(e) => setFormPlano({ ...formPlano, valorTexto: e.target.value })}
                  data-testid="input-plan-value"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoPlano(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvarPlano}
              disabled={!formPlano.titulo || (!(formPlano.checkins ?? "").trim() && !(formPlano.valorTexto ?? "").trim())}
              data-testid="button-confirm-plan"
            >
              Criar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog editar plano */}
      <Dialog open={!!planoEditando} onOpenChange={(open) => { if (!open) setPlanoEditando(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Alterações serão aplicadas a todos os alunos neste plano.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Título do plano</Label>
              <Input
                placeholder="Ex: 1x por semana"
                value={formPlano.titulo ?? ""}
                onChange={(e) => setFormPlano({ ...formPlano, titulo: e.target.value })}
                data-testid="input-edit-plan-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº de aulas</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Ex: 8"
                  value={formPlano.checkins ?? ""}
                  onChange={(e) => setFormPlano({ ...formPlano, checkins: e.target.value })}
                  data-testid="input-edit-plan-checkins"
                />
              </div>
              <div className="space-y-1">
                <Label>Valor mensal (R$)</Label>
                <Input
                  placeholder="Ex: 200,00"
                  value={formPlano.valorTexto ?? ""}
                  onChange={(e) => setFormPlano({ ...formPlano, valorTexto: e.target.value })}
                  data-testid="input-edit-plan-value"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanoEditando(null)}>Cancelar</Button>
            <Button
              onClick={handleSalvarPlano}
              disabled={!formPlano.titulo || (!(formPlano.checkins ?? "").trim() && !(formPlano.valorTexto ?? "").trim())}
              data-testid="button-confirm-edit-plan"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Professores ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Professores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {professores.map((professor) => (
              <div
                key={professor.id}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
                data-testid={`teacher-${professor.id}`}
              >
                <div>
                  <p className="font-medium">{professor.nome}</p>
                  <p className="text-sm text-muted-foreground">{professor.modalidade}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => abrirEditarProfessor(professor)}
                    data-testid={`button-edit-teacher-${professor.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmExcluirProfessor(professor)}
                    data-testid={`button-delete-teacher-${professor.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              size="lg"
              className="w-full h-14 text-lg mt-2"
              onClick={() => { setFormProfessor({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "" }); setDialogProfessor(true); }}
              data-testid="button-add-teacher"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Cadastrar Professor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog cadastrar professor */}
      <Dialog open={dialogProfessor} onOpenChange={setDialogProfessor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Professor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Nome do Professor <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Nome completo"
                value={formProfessor.nome}
                onChange={(e) => setFormProfessor({ ...formProfessor, nome: e.target.value })}
                data-testid="input-teacher-name"
              />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={formProfessor.cpf}
                onChange={(e) => setFormProfessor({ ...formProfessor, cpf: e.target.value })}
                data-testid="input-teacher-cpf"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formProfessor.email}
                onChange={(e) => setFormProfessor({ ...formProfessor, email: e.target.value })}
                data-testid="input-teacher-email"
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formProfessor.telefone}
                onChange={(e) => setFormProfessor({ ...formProfessor, telefone: e.target.value })}
                data-testid="input-teacher-telefone"
              />
            </div>
            <div className="space-y-1">
              <Label>Login <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Login de acesso do professor"
                value={formProfessor.login}
                onChange={(e) => setFormProfessor({ ...formProfessor, login: e.target.value })}
                data-testid="input-teacher-login"
              />
            </div>
            <div className="space-y-1">
              <Label>Senha <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Senha de acesso do professor"
                value={formProfessor.senha}
                onChange={(e) => setFormProfessor({ ...formProfessor, senha: e.target.value })}
                data-testid="input-teacher-senha"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: Beach Tennis, Futevôlei, Surf..."
                value={formProfessor.modalidade}
                onChange={(e) => setFormProfessor({ ...formProfessor, modalidade: e.target.value })}
                data-testid="input-teacher-modality"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogProfessor(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvarProfessor}
              disabled={!formProfessor.nome || !formProfessor.login || !formProfessor.senha || !formProfessor.modalidade}
              data-testid="button-confirm-add-teacher"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog editar professor */}
      <Dialog open={!!professorEditando} onOpenChange={(open) => { if (!open) setProfessorEditando(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
            <DialogDescription>Atualize os dados do professor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="Nome completo"
                value={formProfessor.nome}
                onChange={(e) => setFormProfessor({ ...formProfessor, nome: e.target.value })}
                data-testid="input-edit-teacher-name"
              />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={formProfessor.cpf}
                onChange={(e) => setFormProfessor({ ...formProfessor, cpf: e.target.value })}
                data-testid="input-edit-teacher-cpf"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formProfessor.email}
                onChange={(e) => setFormProfessor({ ...formProfessor, email: e.target.value })}
                data-testid="input-edit-teacher-email"
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formProfessor.telefone}
                onChange={(e) => setFormProfessor({ ...formProfessor, telefone: e.target.value })}
                data-testid="input-edit-teacher-phone"
              />
            </div>
            <div className="space-y-1">
              <Label>Login</Label>
              <Input
                placeholder="Login de acesso do professor"
                value={formProfessor.login}
                onChange={(e) => setFormProfessor({ ...formProfessor, login: e.target.value })}
                data-testid="input-edit-teacher-login"
              />
            </div>
            <div className="space-y-1">
              <Label>Nova Senha <span className="text-muted-foreground text-xs">(deixe em branco para não alterar)</span></Label>
              <Input
                type="password"
                placeholder="Nova senha (opcional)"
                value={formProfessor.senha}
                onChange={(e) => setFormProfessor({ ...formProfessor, senha: e.target.value })}
                data-testid="input-edit-teacher-password"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade *</Label>
              <Input
                placeholder="Ex: Beach Tennis, Futevôlei, Surf..."
                value={formProfessor.modalidade}
                onChange={(e) => setFormProfessor({ ...formProfessor, modalidade: e.target.value })}
                data-testid="input-edit-teacher-modality"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfessorEditando(null)}>Cancelar</Button>
            <Button
              onClick={handleSalvarProfessor}
              disabled={!formProfessor.nome || !formProfessor.modalidade}
              data-testid="button-confirm-edit-teacher"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Aprovações pendentes ── */}
      {alunosPendentes.length > 0 && (
        <Card className="mb-6 border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Aprovações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alunosPendentes.map((aluno) => (
                <div
                  key={aluno.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                  data-testid={`pending-student-${aluno.id}`}
                >
                  <div>
                    <p className="font-medium">{aluno.nome}</p>
                    <p className="text-sm text-muted-foreground">{aluno.modalidade} — {aluno.cpf}</p>
                  </div>
                  <Button onClick={() => onAprovarAluno(aluno.id)} data-testid={`button-approve-${aluno.id}`}>
                    Aprovar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabela de alunos ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg">Alunos</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
                <SelectTrigger className="w-44" data-testid="select-modality">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {todasModalidades.map((mod) => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={onExportarPDF} data-testid="button-export-pdf">
                <Download className="h-4 w-4 mr-2" />PDF
              </Button>
              <Button variant="outline" onClick={onExportarExcel} data-testid="button-export-excel">
                <Download className="h-4 w-4 mr-2" />Excel
              </Button>
              <Button variant="outline" onClick={onIrFinanceiro} data-testid="button-go-financial">
                <TrendingUp className="h-4 w-4 mr-2" />Financeiro
              </Button>
              {onIrAlertas && (
                <Button variant="outline" onClick={onIrAlertas} data-testid="button-go-alerts">
                  <AlertCircle className="h-4 w-4 mr-2" />Alertas
                </Button>
              )}
              {onIrConfiguracoes && (
                <Button variant="outline" onClick={onIrConfiguracoes} data-testid="button-go-settings">
                  <Settings className="h-4 w-4 mr-2" />Configurações
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Último Check-in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunosFiltrados.map((aluno) => (
                  <TableRow key={aluno.id} data-testid={`row-student-${aluno.id}`}>
                    <TableCell className="font-medium">{aluno.nome}</TableCell>
                    <TableCell>{aluno.modalidade}</TableCell>
                    <TableCell>{aluno.planoTitulo}</TableCell>
                    <TableCell>
                      {aluno.plano > 0
                        ? `${aluno.checkinsRealizados}/${aluno.plano}`
                        : aluno.planoValorTexto ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={aluno.statusMensalidade === "Em dia" ? "default" : "destructive"}>
                        {aluno.statusMensalidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {aluno.ultimoCheckin || "—"}
                    </TableCell>
                    <TableCell>
                      {aluno.aprovado ? (
                        <CheckCircle className="h-4 w-4 text-secondary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-orange-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" data-testid={`button-actions-${aluno.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoEditando(aluno);
                              setFormEditarAluno({
                                nome: aluno.nome,
                                cpf: aluno.cpf,
                                email: aluno.email ?? "",
                                telefone: aluno.telefone ?? "",
                                login: aluno.login ?? "",
                                senha: "",
                                modalidade: aluno.modalidade,
                                statusMensalidade: aluno.statusMensalidade,
                                checkinsRealizados: aluno.checkinsRealizados,
                                planoId: aluno.planoId,
                                integrationType: aluno.integrationType ?? "none",
                                integrationPlan: aluno.integrationPlan ?? "",
                              });
                              setDialogEditarAluno(true);
                            }}
                            data-testid={`menu-edit-student-${aluno.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoPlanoId(aluno.id);
                              setNovoPlanoId(aluno.planoId);
                              setDialogAlterarPlano(true);
                            }}
                            data-testid={`menu-change-plan-${aluno.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Alterar plano
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoCheckinId(aluno.id);
                              const now = new Date();
                              setFormCheckin({
                                data: now.toISOString().split("T")[0],
                                hora: now.toTimeString().slice(0, 5),
                              });
                              onCheckinManual(aluno.id);
                            }}
                            data-testid={`menu-checkin-${aluno.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Check-in agora
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoCheckinId(aluno.id);
                              const now = new Date();
                              setFormCheckin({
                                data: now.toISOString().split("T")[0],
                                hora: now.toTimeString().slice(0, 5),
                              });
                              setDialogCheckinRetro(true);
                            }}
                            data-testid={`menu-retroactive-checkin-${aluno.id}`}
                          >
                            <CalendarClock className="h-4 w-4 mr-2" />
                            Registrar aula
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoHistorico(aluno);
                              setDialogHistorico(true);
                            }}
                            data-testid={`menu-history-${aluno.id}`}
                          >
                            <History className="h-4 w-4 mr-2" />
                            Histórico de check-ins
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoHistFinanceiroId(aluno.id);
                              setAlunoHistFinanceiroNome(aluno.nome);
                              setDialogHistFinanceiro(true);
                            }}
                            data-testid={`menu-hist-financeiro-${aluno.id}`}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            Histórico pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoValidarId(aluno.id);
                              setAlunoValidarNome(aluno.nome);
                              setDialogValidarPagamento(true);
                            }}
                            data-testid={`menu-payment-${aluno.id}`}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoFinanceiroId(aluno.id);
                              const now = new Date();
                              setFormCobranca({
                                description: "",
                                amount: "",
                                dueDate: new Date(now.getFullYear(), now.getMonth(), 10).toLocaleDateString("pt-BR"),
                              });
                              setDialogCobranca(true);
                            }}
                            data-testid={`menu-charge-${aluno.id}`}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            Criar cobrança
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-foreground"
                            onClick={() => setConfirmExcluirAluno(aluno)}
                            data-testid={`menu-delete-student-${aluno.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir aluno
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Registrar Pagamento */}
      <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Registre uma mensalidade para o aluno selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Mensalidade março, Aula avulsa..."
                value={formPagamento.description}
                onChange={(e) => setFormPagamento({ ...formPagamento, description: e.target.value })}
                data-testid="input-payment-description"
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                placeholder="Ex: 140,00"
                value={formPagamento.amount}
                onChange={(e) => setFormPagamento({ ...formPagamento, amount: e.target.value })}
                data-testid="input-payment-amount"
              />
            </div>
            <div className="space-y-1">
              <Label>Mês de Referência</Label>
              <Input
                placeholder="Ex: 04/2025"
                value={formPagamento.referenceMonth}
                onChange={(e) => setFormPagamento({ ...formPagamento, referenceMonth: e.target.value })}
                data-testid="input-payment-month"
              />
            </div>
            <div className="space-y-1">
              <Label>Vencimento</Label>
              <Input
                placeholder="Ex: 10/04/2025"
                value={formPagamento.dueDate}
                onChange={(e) => setFormPagamento({ ...formPagamento, dueDate: e.target.value })}
                data-testid="input-payment-due"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={formPagamento.status} onValueChange={(v) => setFormPagamento({ ...formPagamento, status: v })}>
                <SelectTrigger data-testid="select-payment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPagamento(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (formPagamento.amount && formPagamento.referenceMonth && formPagamento.dueDate) {
                  onRegistrarPagamento({ studentId: alunoFinanceiroId, ...formPagamento });
                  setDialogPagamento(false);
                }
              }}
              disabled={!formPagamento.amount || !formPagamento.referenceMonth || !formPagamento.dueDate}
              data-testid="button-confirm-payment"
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Validar Pagamento */}
      <Dialog open={dialogValidarPagamento} onOpenChange={setDialogValidarPagamento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cobranças — {alunoValidarNome}
            </DialogTitle>
            <DialogDescription>Selecione uma cobrança para validar o pagamento.</DialogDescription>
          </DialogHeader>
          {(() => {
            const pendingPayments = allPayments.filter(
              (p) => p.studentId === alunoValidarId && p.status !== "paid"
            );
            const pendingCharges = allCharges.filter(
              (c) => c.studentId === alunoValidarId && c.status !== "paid"
            );
            if (pendingPayments.length === 0 && pendingCharges.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma cobrança pendente para este aluno.
                </p>
              );
            }
            return (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2 pr-1">
                {pendingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 gap-3"
                    data-testid={`validar-payment-${p.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.description || `Mensalidade — ${p.referenceMonth}`}
                      </p>
                      <p className="text-xs text-muted-foreground">Venc. {p.dueDate} · R$ {p.amount}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => validarPagamento.mutate({ type: "payment", id: p.id })}
                      disabled={validarPagamento.isPending}
                      data-testid={`button-validar-payment-${p.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Validar
                    </Button>
                  </div>
                ))}
                {pendingCharges.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 px-4 py-3 gap-3"
                    data-testid={`validar-charge-${c.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.description}</p>
                      <p className="text-xs text-muted-foreground">Venc. {c.dueDate} · R$ {c.amount}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => validarPagamento.mutate({ type: "charge", id: c.id })}
                      disabled={validarPagamento.isPending}
                      data-testid={`button-validar-charge-${c.id}`}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Validar
                    </Button>
                  </div>
                ))}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogValidarPagamento(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Cobrança */}
      <Dialog open={dialogCobranca} onOpenChange={setDialogCobranca}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Criar Cobrança Extra
            </DialogTitle>
            <DialogDescription>
              Crie uma cobrança adicional para o aluno selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Taxa de falta, Aula extra..."
                value={formCobranca.description}
                onChange={(e) => setFormCobranca({ ...formCobranca, description: e.target.value })}
                data-testid="input-charge-description"
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                placeholder="Ex: 30,00"
                value={formCobranca.amount}
                onChange={(e) => setFormCobranca({ ...formCobranca, amount: e.target.value })}
                data-testid="input-charge-amount"
              />
            </div>
            <div className="space-y-1">
              <Label>Vencimento</Label>
              <Input
                placeholder="Ex: 10/04/2025"
                value={formCobranca.dueDate}
                onChange={(e) => setFormCobranca({ ...formCobranca, dueDate: e.target.value })}
                data-testid="input-charge-due"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCobranca(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (formCobranca.description && formCobranca.amount && formCobranca.dueDate) {
                  onCriarCobranca({ studentId: alunoFinanceiroId, ...formCobranca });
                  setDialogCobranca(false);
                }
              }}
              disabled={!formCobranca.description || !formCobranca.amount || !formCobranca.dueDate}
              data-testid="button-confirm-charge"
            >
              Criar Cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Aluno */}
      <Dialog open={dialogEditarAluno} onOpenChange={(open) => { if (!open) { setDialogEditarAluno(false); setAlunoEditando(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Dados do Aluno
            </DialogTitle>
            <DialogDescription>{alunoEditando?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome do Aluno <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome completo"
                  value={formEditarAluno.nome}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, nome: e.target.value })}
                  data-testid="input-edit-nome"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="000.000.000-00"
                  value={formEditarAluno.cpf}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, cpf: e.target.value })}
                  data-testid="input-edit-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formEditarAluno.telefone}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, telefone: e.target.value })}
                  data-testid="input-edit-telefone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email</Label>
                <Input
                  placeholder="email@exemplo.com"
                  type="email"
                  value={formEditarAluno.email}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, email: e.target.value })}
                  data-testid="input-edit-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="login de acesso"
                  value={formEditarAluno.login}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, login: e.target.value })}
                  data-testid="input-edit-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Nova Senha</Label>
                <Input
                  placeholder="deixe em branco para manter"
                  type="password"
                  value={formEditarAluno.senha}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, senha: e.target.value })}
                  data-testid="input-edit-senha"
                />
              </div>
              <div className="space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Input
                  value={formEditarAluno.modalidade}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, modalidade: e.target.value })}
                  data-testid="input-edit-modalidade"
                />
              </div>
              <div className="space-y-1">
                <Label>Plano</Label>
                <Select
                  value={formEditarAluno.planoId}
                  onValueChange={(v) => setFormEditarAluno({ ...formEditarAluno, planoId: v })}
                >
                  <SelectTrigger data-testid="select-edit-plano">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formEditarAluno.integrationType === "mensalista"
                      ? planos.filter(p => p.valorTexto)
                      : planos
                    ).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {formEditarAluno.integrationType === "mensalista"
                          ? `${p.titulo} — ${p.valorTexto}`
                          : p.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status Mensalidade</Label>
                <Select
                  value={formEditarAluno.statusMensalidade}
                  onValueChange={(v) => setFormEditarAluno({ ...formEditarAluno, statusMensalidade: v })}
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em dia">Em dia</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Check-ins realizados</Label>
                <Input
                  type="number"
                  min={0}
                  value={formEditarAluno.checkinsRealizados}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, checkinsRealizados: Number(e.target.value) })}
                  data-testid="input-edit-checkins"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Integração</Label>
                <Select
                  value={formEditarAluno.integrationType}
                  onValueChange={(v) => setFormEditarAluno({ ...formEditarAluno, integrationType: v, integrationPlan: "" })}
                >
                  <SelectTrigger data-testid="select-edit-integration-type">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formEditarAluno.integrationType !== "none" && formEditarAluno.integrationType !== "mensalista" && (
                <div className="col-span-2 space-y-1">
                  <Label>Plano da Integração</Label>
                  {(() => {
                    const opts = Array.from(new Set(
                      modalidadeSettingsList
                        .map((s: any) => formEditarAluno.integrationType === "wellhub" ? s.wellhubPlanoMinimo : s.totalpassPlanoMinimo)
                        .filter(Boolean)
                    ));
                    return opts.length > 0 ? (
                      <Select
                        value={formEditarAluno.integrationPlan}
                        onValueChange={(v) => setFormEditarAluno({ ...formEditarAluno, integrationPlan: v })}
                      >
                        <SelectTrigger data-testid="input-edit-integration-plan">
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
                        value={formEditarAluno.integrationPlan}
                        onChange={(e) => setFormEditarAluno({ ...formEditarAluno, integrationPlan: e.target.value })}
                        data-testid="input-edit-integration-plan"
                      />
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogEditarAluno(false); setAlunoEditando(null); }}>Cancelar</Button>
            <Button
              onClick={() => {
                if (alunoEditando && formEditarAluno.nome && formEditarAluno.cpf && formEditarAluno.login && formEditarAluno.modalidade) {
                  const payload = { id: alunoEditando.id, ...formEditarAluno };
                  if (!payload.senha) delete (payload as any).senha;
                  onEditarAluno(payload);
                  if (formEditarAluno.planoId && formEditarAluno.planoId !== alunoEditando.planoId) {
                    onAlterarPlanoAluno(alunoEditando.id, formEditarAluno.planoId);
                  }
                  setDialogEditarAluno(false);
                  setAlunoEditando(null);
                }
              }}
              disabled={!formEditarAluno.nome || !formEditarAluno.cpf || !formEditarAluno.login || !formEditarAluno.modalidade}
              data-testid="button-confirm-edit-student"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar Plano */}
      <Dialog open={dialogAlterarPlano} onOpenChange={setDialogAlterarPlano}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano do Aluno</DialogTitle>
            <DialogDescription>Selecione o novo plano para este aluno.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Select value={novoPlanoId} onValueChange={setNovoPlanoId}>
              <SelectTrigger data-testid="select-new-plan">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {planos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAlterarPlano(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (alunoPlanoId && novoPlanoId) {
                  onAlterarPlanoAluno(alunoPlanoId, novoPlanoId);
                  setDialogAlterarPlano(false);
                }
              }}
              disabled={!novoPlanoId}
              data-testid="button-confirm-change-plan"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Check-in Retroativo */}
      <Dialog open={dialogCheckinRetro} onOpenChange={setDialogCheckinRetro}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Registrar Aula
            </DialogTitle>
            <DialogDescription>Registre um check-in retroativo para este aluno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={formCheckin.data}
                onChange={(e) => setFormCheckin({ ...formCheckin, data: e.target.value })}
                data-testid="input-checkin-data"
              />
            </div>
            <div className="space-y-1">
              <Label>Hora</Label>
              <Input
                type="time"
                value={formCheckin.hora}
                onChange={(e) => setFormCheckin({ ...formCheckin, hora: e.target.value })}
                data-testid="input-checkin-hora"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCheckinRetro(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (alunoCheckinId && formCheckin.data && formCheckin.hora) {
                  onCheckinManual(alunoCheckinId, formCheckin.data, formCheckin.hora);
                  setDialogCheckinRetro(false);
                }
              }}
              disabled={!formCheckin.data || !formCheckin.hora}
              data-testid="button-confirm-checkin-retro"
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico */}
      <Dialog open={dialogHistorico} onOpenChange={(open) => { if (!open) { setDialogHistorico(false); setAlunoHistorico(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Check-ins — {alunoHistorico?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {(alunoHistorico?.historico ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum check-in registrado</p>
            ) : (
              <div className="space-y-1">
                {[...(alunoHistorico?.historico ?? [])].reverse().map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-1 border-b last:border-0">
                    <span className="text-sm">{h.data} às {h.hora}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (alunoHistorico) {
                          const realIndex = (alunoHistorico.historico.length - 1) - i;
                          setConfirmRemoverCheckin({ alunoId: alunoHistorico.id, index: realIndex });
                        }
                      }}
                      data-testid={`button-remove-checkin-${i}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogHistorico(false); setAlunoHistorico(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão do Aluno */}
      <Dialog open={!!confirmExcluirAluno} onOpenChange={(open) => { if (!open) setConfirmExcluirAluno(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Aluno</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o aluno <strong>{confirmExcluirAluno?.nome}</strong>? 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExcluirAluno(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmExcluirAluno) {
                  onExcluirAluno(confirmExcluirAluno.id);
                  setConfirmExcluirAluno(null);
                }
              }}
              data-testid="button-confirm-delete-student"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão de Plano */}
      <Dialog open={!!confirmExcluirPlano} onOpenChange={(open) => { if (!open) setConfirmExcluirPlano(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Plano</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o plano <strong>{confirmExcluirPlano?.titulo}</strong>? 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExcluirPlano(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmExcluirPlano) {
                  onExcluirPlano(confirmExcluirPlano.id);
                  setConfirmExcluirPlano(null);
                }
              }}
              data-testid="button-confirm-delete-plan"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão de Professor */}
      <Dialog open={!!confirmExcluirProfessor} onOpenChange={(open) => { if (!open) setConfirmExcluirProfessor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Professor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o professor <strong>{confirmExcluirProfessor?.nome}</strong>? 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExcluirProfessor(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmExcluirProfessor) {
                  onExcluirProfessor(confirmExcluirProfessor.id);
                  setConfirmExcluirProfessor(null);
                }
              }}
              data-testid="button-confirm-delete-teacher"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Remover Check-in */}
      <Dialog open={!!confirmRemoverCheckin} onOpenChange={(open) => { if (!open) setConfirmRemoverCheckin(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Check-in</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este check-in?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoverCheckin(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmRemoverCheckin) {
                  onRemoverCheckin(confirmRemoverCheckin.alunoId, confirmRemoverCheckin.index);
                  setConfirmRemoverCheckin(null);
                }
              }}
              data-testid="button-confirm-remove-checkin"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico Financeiro */}
      <Dialog open={dialogHistFinanceiro} onOpenChange={setDialogHistFinanceiro}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Histórico — {alunoHistFinanceiroNome}
            </DialogTitle>
            <DialogDescription>Cobranças e pagamentos do aluno</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Pagamentos */}
            {(() => {
              const pays = allPayments.filter((p: any) => p.studentId === alunoHistFinanceiroId);
              return pays.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Mensalidades
                  </p>
                  <div className="space-y-1">
                    {pays.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`hist-payment-${p.id}`}>
                        <div>
                          {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                          <p className="text-sm font-medium">Mensalidade — {p.referenceMonth}</p>
                          <p className="text-xs text-muted-foreground">Venc. {p.dueDate}</p>
                          {p.paymentDate && <p className="text-xs text-green-600 dark:text-green-400">Pago em {p.paymentDate}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="text-right">
                            <p className="text-sm font-medium">R$ {p.amount}</p>
                            {p.status === "paid" ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Pago</Badge>
                              : p.status === "overdue" ? <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                              : <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Pendente</Badge>}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDeleteFinanceiro({ type: "payment", id: p.id, label: `mensalidade ${p.referenceMonth}` })}
                            data-testid={`button-delete-hist-payment-${p.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Cobranças */}
            {(() => {
              const cols = allCharges.filter((c: any) => c.studentId === alunoHistFinanceiroId);
              return cols.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Receipt className="h-3 w-3" />
                    Cobranças
                  </p>
                  <div className="space-y-1">
                    {cols.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`hist-charge-${c.id}`}>
                        <div>
                          <p className="text-sm font-medium">{c.description}</p>
                          <p className="text-xs text-muted-foreground">Venc. {c.dueDate}</p>
                          {c.paymentDate && <p className="text-xs text-green-600 dark:text-green-400">Pago em {c.paymentDate}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="text-right">
                            <p className="text-sm font-medium">R$ {c.amount}</p>
                            {c.status === "paid" ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Pago</Badge>
                              : c.status === "overdue" ? <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                              : <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Pendente</Badge>}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDeleteFinanceiro({ type: "charge", id: c.id, label: `cobrança "${c.description}"` })}
                            data-testid={`button-delete-hist-charge-${c.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {allPayments.filter((p: any) => p.studentId === alunoHistFinanceiroId).length === 0 &&
              allCharges.filter((c: any) => c.studentId === alunoHistFinanceiroId).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento registrado</p>
              )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogHistFinanceiro(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Delete Financeiro */}
      <Dialog open={!!confirmDeleteFinanceiro} onOpenChange={(open) => { if (!open) setConfirmDeleteFinanceiro(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Lançamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover {confirmDeleteFinanceiro?.label}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteFinanceiro(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteFinanceiro}
              disabled={deletePayment.isPending || deleteCharge.isPending}
              data-testid="button-confirm-delete-lancamento"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
