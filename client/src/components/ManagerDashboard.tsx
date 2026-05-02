import { useState } from "react";
import HelpDialog from "@/components/HelpDialog";
import ManagerSidebar from "@/components/ManagerSidebar";
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
  MoreHorizontal,
  History,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  MessageCircle,
  PercentCircle,
  ListChecks,
  ChevronDown,
  Landmark,
  Building2,
  Save,
  Key,
  Webhook,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
  professorId?: string;
}

interface ProfessorGestor {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  login?: string;
  modalidade: string;
  percentualComissao?: string;
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

interface ManagerDashboardProps {
  planos: Plano[];
  alunos: AlunoGestor[];
  professores: ProfessorGestor[];
  onAprovarAluno: (alunoId: string) => void;
  onCadastrarProfessor: (dados: { nome: string; cpf: string; email: string; telefone: string; login: string; senha: string; modalidade: string; percentualComissao?: string }) => void;
  onEditarProfessor: (id: string, dados: { nome: string; cpf?: string; email?: string; telefone?: string; login?: string; senha?: string; modalidade: string; percentualComissao?: string }) => void;
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
  onIrIntegracoes?: () => void;
  onIrAlertas?: () => void;
  onLogout?: () => void;
  onEditarAluno: (dados: { id: string; nome: string; cpf: string; email: string; telefone: string; login: string; senha?: string; modalidade: string; statusMensalidade: string; checkinsRealizados: number; planoId: string; integrationType: string; integrationPlan: string }) => void;
  onAlterarPlanoAluno: (alunoId: string, planoId: string) => void;
  onCheckinManual: (alunoId: string, data?: string, hora?: string) => void;
  onRemoverCheckin: (alunoId: string, index: number) => void;
  onExcluirAluno: (alunoId: string) => void;
  onReativarAluno: (alunoId: string) => void;
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
  onIrIntegracoes,
  onIrAlertas,
  onLogout,
  onEditarAluno,
  onAlterarPlanoAluno,
  onCheckinManual,
  onRemoverCheckin,
  onExcluirAluno,
  onReativarAluno,
}: ManagerDashboardProps) {
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");
  const [abaAlunos, setAbaAlunos] = useState<"ativos" | "inativos">("ativos");

  const { data: alunosInativos = [] } = useQuery<any[]>({
    queryKey: ["/api/alunos/inativos"],
  });

  // WhatsApp state
  const [dialogWhatsapp, setDialogWhatsapp] = useState(false);
  const [waTab, setWaTab] = useState<"basico" | "cobranca" | "assiduidade" | "fila">("basico");
  const [formWhatsapp, setFormWhatsapp] = useState({ whatsapp_number: "", default_message: "" });
  const [formCobrancaAuto, setFormCobrancaAuto] = useState({
    cobranca_ativo: false,
    cobranca_dias_apos_vencimento: 1,
    cobranca_num_disparos: 3,
    cobranca_intervalo_dias: 3,
    cobranca_mensagem: "Olá {{nome}}, sua mensalidade está em atraso. Por favor, regularize o quanto antes.",
  });
  const [formAssiduidadeAuto, setFormAssiduidadeAuto] = useState({
    assiduidade_ativo: false,
    assiduidade_dias_sem_checkin: 7,
    assiduidade_num_disparos: 3,
    assiduidade_intervalo_dias: 7,
    assiduidade_mensagem: "Olá {{nome}}, sentimos sua falta! Que tal voltar a treinar essa semana?",
  });

  const { data: whatsappSettings } = useQuery<{ whatsapp_number?: string; default_message?: string } | null>({
    queryKey: ["/api/whatsapp/settings"],
  });

  const { data: automationConfig } = useQuery<any>({
    queryKey: ["/api/whatsapp/automation"],
  });

  const { data: pendingDispatches = [], refetch: refetchDispatches } = useQuery<any[]>({
    queryKey: ["/api/whatsapp/dispatches"],
    enabled: dialogWhatsapp && waTab === "fila",
  });

  // Commission/log dialog state — declared BEFORE the queries that depend on them
  const [dialogComissoes, setDialogComissoes] = useState(false);
  const [dialogLogCheckins, setDialogLogCheckins] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Conta Bancária dialog state
  const [dialogContaBancaria, setDialogContaBancaria] = useState(false);
  const [formContaBancaria, setFormContaBancaria] = useState({
    receiverName: "",
    pixKey: "",
    banco: "",
    agencia: "",
    numeroConta: "",
    tipoConta: "corrente",
    cpfCnpj: "",
    bankApiKey: "",
    bankWebhookUrl: "",
  });

  // Conta Bancária query + mutation
  const { data: contaBancariaData } = useQuery<any>({
    queryKey: ["/api/finance/settings"],
    enabled: dialogContaBancaria,
  });
  const salvarContaBancaria = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/finance/settings", data).then((r) => r.json()),
  });

  // Commission queries
  const { data: resumoComissoes = [], refetch: refetchComissoes } = useQuery<any[]>({
    queryKey: ["/api/finance/comissao/resumo"],
    enabled: dialogComissoes,
  });

  const { data: todasComissoes = [], refetch: refetchTodasComissoes } = useQuery<any[]>({
    queryKey: ["/api/finance/comissoes"],
    enabled: dialogComissoes,
  });

  const { data: logCheckins = [], refetch: refetchLog } = useQuery<any[]>({
    queryKey: ["/api/checkins/log"],
    enabled: dialogLogCheckins,
  });

  const [filtroTipoLog, setFiltroTipoLog] = useState<"todos" | "pendente" | "aula" | "dayuse" | "avulso">("todos");
  const [atribuindoCheckin, setAtribuindoCheckin] = useState<string | null>(null);
  const [atribuirForm, setAtribuirForm] = useState<{ tipo: string; professorId: string }>({ tipo: "aula", professorId: "" });
  const [editandoComissao, setEditandoComissao] = useState<any | null>(null);
  const [editComissaoForm, setEditComissaoForm] = useState({ valorComissao: "", status: "", observacao: "" });

  const qcComissao = useQueryClient();

  const atribuirCheckin = useMutation({
    mutationFn: ({ id, tipo, professorId }: { id: string; tipo: string; professorId?: string }) =>
      apiRequest("PUT", `/api/checkins/${id}/atribuir`, { tipo, professorId: professorId || null }),
    onSuccess: () => {
      qcComissao.invalidateQueries({ queryKey: ["/api/checkins/log"] });
      qcComissao.invalidateQueries({ queryKey: ["/api/finance/comissoes"] });
      qcComissao.invalidateQueries({ queryKey: ["/api/finance/comissao/resumo"] });
      setAtribuindoCheckin(null);
      toast({ title: "Check-in referenciado com sucesso!" });
    },
  });

  const salvarComissao = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PUT", `/api/finance/comissao/${id}`, d),
    onSuccess: () => {
      qcComissao.invalidateQueries({ queryKey: ["/api/finance/comissoes"] });
      qcComissao.invalidateQueries({ queryKey: ["/api/finance/comissao/resumo"] });
      setEditandoComissao(null);
      toast({ title: "Comissão atualizada!" });
    },
  });

  const qcWa = useQueryClient();
  const salvarWhatsapp = useMutation({
    mutationFn: (d: { whatsapp_number: string; default_message: string }) =>
      apiRequest("POST", "/api/whatsapp/settings", d),
    onSuccess: () => {
      qcWa.invalidateQueries({ queryKey: ["/api/whatsapp/settings"] });
      toast({ title: "WhatsApp configurado com sucesso!" });
    },
  });

  const salvarAutomacao = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/whatsapp/automation", d),
    onSuccess: () => {
      qcWa.invalidateQueries({ queryKey: ["/api/whatsapp/automation"] });
      toast({ title: "Automação salva com sucesso!" });
    },
  });

  const marcarEnviado = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/whatsapp/dispatches/${id}/sent`),
    onSuccess: () => qcWa.invalidateQueries({ queryKey: ["/api/whatsapp/dispatches"] }),
  });

  const marcarTodosEnviados = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/whatsapp/dispatches/sent-all"),
    onSuccess: () => {
      qcWa.invalidateQueries({ queryKey: ["/api/whatsapp/dispatches"] });
      toast({ title: "Todos os disparos marcados como enviados!" });
    },
  });

  const executarAutomacao = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/run-automation"),
    onSuccess: () => {
      qcWa.invalidateQueries({ queryKey: ["/api/whatsapp/dispatches"] });
      toast({ title: "Automação executada! Verifique a fila de disparos." });
      setWaTab("fila");
    },
  });

  function buildWhatsappLink(aluno: AlunoGestor) {
    const numero = whatsappSettings?.whatsapp_number ?? "";
    const template = whatsappSettings?.default_message ?? "Olá {{nome}}, tudo bem?";
    const mensagem = template
      .replace(/\{\{nome\}\}/g, aluno.nome)
      .replace(/\{\{status\}\}/g, aluno.statusMensalidade)
      .replace(/\{\{checkins\}\}/g, String(aluno.checkinsRealizados));
    return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensagem)}`;
  }

  // Financial state
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogCobranca, setDialogCobranca] = useState(false);
  const [dialogValidarPagamento, setDialogValidarPagamento] = useState(false);
  const [alunoValidarId, setAlunoValidarId] = useState<string>("");
  const [alunoValidarNome, setAlunoValidarNome] = useState<string>("");
  const [alunoFinanceiroId, setAlunoFinanceiroId] = useState<string>("");
  const [formPagamento, setFormPagamento] = useState({ description: "", amount: "", referenceMonth: "", dueDate: "", status: "paid" });
  const [formCobranca, setFormCobranca] = useState({ description: "", amount: "", dueDate: "" });

  // Mensalidades state
  const [filtroStatusMens, setFiltroStatusMens] = useState<"todos" | "paid" | "pending">("todos");
  const [dialogRegistrarMens, setDialogRegistrarMens] = useState(false);
  const [mensAlunoId, setMensAlunoId] = useState<string>("");
  const [mensAlunoNome, setMensAlunoNome] = useState<string>("");
  const [formMens, setFormMens] = useState({ referenceMonth: "", amount: "", dueDate: "", paymentMethod: "dinheiro", status: "paid" });
  const [dialogPagarMens, setDialogPagarMens] = useState(false);
  const [pagarMensPaymentId, setPagarMensPaymentId] = useState<string>("");
  const [pagarMensMethod, setPagarMensMethod] = useState("dinheiro");
  const [dialogHistMens, setDialogHistMens] = useState(false);
  const [histMensAlunoId, setHistMensAlunoId] = useState<string>("");
  const [histMensAlunoNome, setHistMensAlunoNome] = useState<string>("");

  // Novo Mensalista state
  const [dialogNovoMensalista, setDialogNovoMensalista] = useState(false);
  const [novoMensalista, setNovoMensalista] = useState({
    nome: "", cpf: "", email: "", telefone: "", login: "", senha: "",
    modalidade: "", planoId: "", professorId: "", diaVencimento: "10",
  });
  const [credenciaisMensalista, setCredenciaisMensalista] = useState<{ login: string; senha: string } | null>(null);

  // Histórico financeiro state
  const [dialogHistFinanceiro, setDialogHistFinanceiro] = useState(false);
  const [alunoHistFinanceiroId, setAlunoHistFinanceiroId] = useState<string>("");
  const [alunoHistFinanceiroNome, setAlunoHistFinanceiroNome] = useState<string>("");
  const [confirmDeleteFinanceiro, setConfirmDeleteFinanceiro] = useState<{ type: "payment" | "charge"; id: string; label: string } | null>(null);

  // Editar aluno state
  const [dialogEditarAluno, setDialogEditarAluno] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<AlunoGestor | null>(null);
  const [formEditarAluno, setFormEditarAluno] = useState({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", statusMensalidade: "Em dia" as string, checkinsRealizados: 0, planoId: "", integrationType: "", integrationPlan: "" });

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

  // Mensalidades mutations
  const criarPagamentoMens = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finance/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      setDialogRegistrarMens(false);
      toast({ title: "Pagamento registrado com sucesso!" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar o pagamento.", variant: "destructive" }),
  });

  const marcarPagoMens = useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod: string }) => {
      const today = new Date().toLocaleDateString("pt-BR");
      return apiRequest("PUT", `/api/finance/payments/${id}`, { status: "paid", paymentDate: today, paymentMethod });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      setDialogPagarMens(false);
      toast({ title: "Pagamento confirmado!" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" }),
  });

  const excluirPagamentoMens = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      toast({ title: "Pagamento removido." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" }),
  });

  const criarMensalista = useMutation({
    mutationFn: (dados: any) =>
      apiRequest("POST", "/api/alunos", dados).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/alunos"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      setDialogNovoMensalista(false);
      setNovoMensalista({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: "", professorId: "", diaVencimento: "10" });
      setCredenciaisMensalista({ login: data.loginGerado, senha: data.senhaGerada });
    },
    onError: () => toast({ title: "Erro ao cadastrar", description: "Verifique os dados e tente novamente.", variant: "destructive" }),
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
  const [formProfessor, setFormProfessor] = useState({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", percentualComissao: "" });

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
    planoId: "",
    integrationType: "",
    integrationPlan: "",
  });

  // Plano state
  const [dialogNovoPlano, setDialogNovoPlano] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
  const [formPlano, setFormPlano] = useState({ titulo: "", checkins: "", valorTexto: "" });

  // ── Planos ──────────────────────────────────────────────────────────────
  const getCheckinsLabel = (checkins: number) =>
    `${checkins} ${checkins === 1 ? "Check-in" : "Check-ins"}`;

  const getPlanosPorIntegracao = (integrationType?: string) => {
    if (integrationType === "mensalista") {
      return planos.filter((p) => (p.valorTexto ?? "").trim() !== "");
    }

    if (integrationType === "wellhub" || integrationType === "totalpass") {
      return planos.filter((p) => (p.checkins ?? 0) > 0);
    }

    return planos;
  };

  const getPlanoDescricao = (plano: Plano) => {
    const parts: string[] = [];
    if (plano.checkins > 0) parts.push(getCheckinsLabel(plano.checkins));
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
    const tituloVal = (formPlano.titulo || "").trim();
    const checkinsVal = String(formPlano.checkins || "").trim();
    const valorTextoVal = String(formPlano.valorTexto || "").trim();

    if (!tituloVal) {
      toast({ title: "Campo obrigatório", description: "O plano precisa ter um título.", variant: "destructive" });
      return;
    }

    if (checkinsVal && valorTextoVal) {
      toast({ title: "Configuração inválida", description: "O plano não pode ter Check-ins e Valor Mensal ao mesmo tempo.", variant: "destructive" });
      return;
    }

    const checkinsNum = checkinsVal ? parseInt(checkinsVal, 10) : 0;

    if (!valorTextoVal && checkinsNum <= 0) {
      toast({ title: "Plano incompleto", description: "Informe um valor mensal OU uma quantidade de check-ins maior que zero.", variant: "destructive" });
      return;
    }

    const valorTexto = valorTextoVal
      ? (valorTextoVal.startsWith("R$") ? valorTextoVal : `R$ ${valorTextoVal}`)
      : undefined;

    if (planoEditando) {
      onEditarPlano(planoEditando.id, tituloVal, checkinsNum, valorTexto);
      setPlanoEditando(null);
    } else {
      onCriarPlano(tituloVal, checkinsNum, valorTexto);
      setDialogNovoPlano(false);
    }

    setFormPlano({ titulo: "", checkins: "", valorTexto: "" });
  };

  // ── Professores ──────────────────────────────────────────────────────────
  const abrirEditarProfessor = (p: ProfessorGestor) => {
    setProfessorEditando(p);
    setFormProfessor({ nome: p.nome, cpf: p.cpf || "", email: p.email || "", telefone: p.telefone || "", login: p.login || "", senha: "", modalidade: p.modalidade, percentualComissao: p.percentualComissao || "" });
  };

  const handleSalvarProfessor = () => {
    if (!formProfessor.nome || !formProfessor.modalidade) return;
    const percentualComissao = formProfessor.percentualComissao
      ? parseFloat(formProfessor.percentualComissao.replace(",", ".")).toFixed(2)
      : "0.00";
    if (professorEditando) {
      const dados: { nome: string; cpf?: string; email?: string; telefone?: string; login?: string; senha?: string; modalidade: string; percentualComissao?: string } = {
        nome: formProfessor.nome,
        cpf: formProfessor.cpf || undefined,
        email: formProfessor.email || undefined,
        telefone: formProfessor.telefone || undefined,
        login: formProfessor.login || undefined,
        modalidade: formProfessor.modalidade,
        percentualComissao,
      };
      if (formProfessor.senha) dados.senha = formProfessor.senha;
      onEditarProfessor(professorEditando.id, dados);
      setProfessorEditando(null);
    } else {
      if (!formProfessor.login || !formProfessor.senha) return;
      onCadastrarProfessor({ nome: formProfessor.nome, cpf: formProfessor.cpf, email: formProfessor.email, telefone: formProfessor.telefone, login: formProfessor.login, senha: formProfessor.senha, modalidade: formProfessor.modalidade, percentualComissao });
      setDialogProfessor(false);
    }
    setFormProfessor({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", percentualComissao: "" });
  };

  // ── Alunos ───────────────────────────────────────────────────────────────
  const handleCadastrarAluno = () => {
    const exigePlanoIntegracao =
      novoAluno.integrationType === "wellhub" || novoAluno.integrationType === "totalpass";

    if (
      novoAluno.nome &&
      novoAluno.cpf &&
      novoAluno.login &&
      novoAluno.senha &&
      novoAluno.modalidade &&
      novoAluno.planoId &&
      novoAluno.integrationType &&
      (!exigePlanoIntegracao || novoAluno.integrationPlan)
    ) {
      onCadastrarAluno(novoAluno);
      setNovoAluno({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: "", integrationType: "", integrationPlan: "" });
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
  const alunoPlanoSelecionado = alunos.find((a) => a.id === alunoPlanoId);

  const [activeSection, setActiveSection] = useState("alunos");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarAction = (section: string) => {
    if (section === "financeiro") { onIrFinanceiro(); return; }
    if (section === "alertas") { onIrAlertas?.(); return; }
    if (section === "configuracoes") { onIrConfiguracoes?.(); return; }
    if (section === "integracoes") { onIrIntegracoes?.(); return; }
    if (section === "whatsapp") {
      setFormWhatsapp({
        whatsapp_number: whatsappSettings?.whatsapp_number ?? "",
        default_message: whatsappSettings?.default_message ?? "Olá {{nome}}, sua mensalidade está {{status}}.",
      });
      if (automationConfig) {
        setFormCobrancaAuto({
          cobranca_ativo: automationConfig.cobranca_ativo ?? false,
          cobranca_dias_apos_vencimento: automationConfig.cobranca_dias_apos_vencimento ?? 1,
          cobranca_num_disparos: automationConfig.cobranca_num_disparos ?? 3,
          cobranca_intervalo_dias: automationConfig.cobranca_intervalo_dias ?? 3,
          cobranca_mensagem: automationConfig.cobranca_mensagem ?? "Olá {{nome}}, sua mensalidade está em atraso.",
        });
        setFormAssiduidadeAuto({
          assiduidade_ativo: automationConfig.assiduidade_ativo ?? false,
          assiduidade_dias_sem_checkin: automationConfig.assiduidade_dias_sem_checkin ?? 7,
          assiduidade_num_disparos: automationConfig.assiduidade_num_disparos ?? 3,
          assiduidade_intervalo_dias: automationConfig.assiduidade_intervalo_dias ?? 7,
          assiduidade_mensagem: automationConfig.assiduidade_mensagem ?? "Olá {{nome}}, sentimos sua falta!",
        });
      }
      setWaTab("basico");
      setDialogWhatsapp(true);
      return;
    }
    if (section === "comissoes") { refetchComissoes(); setDialogComissoes(true); return; }
    if (section === "checkins") { setDialogLogCheckins(true); return; }
    if (section === "ajuda") { setShowHelp(true); return; }
    if (section === "conta") {
      setFormContaBancaria({
        receiverName: contaBancariaData?.receiverName ?? "",
        pixKey: contaBancariaData?.pixKey ?? "",
        banco: contaBancariaData?.banco ?? "",
        agencia: contaBancariaData?.agencia ?? "",
        numeroConta: contaBancariaData?.numeroConta ?? "",
        tipoConta: contaBancariaData?.tipoConta ?? "corrente",
        cpfCnpj: contaBancariaData?.cpfCnpj ?? "",
        bankApiKey: contaBancariaData?.bankApiKey ?? "",
        bankWebhookUrl: contaBancariaData?.bankWebhookUrl ?? "",
      });
      setDialogContaBancaria(true);
      return;
    }
    setActiveSection(section);
  };

  // Mensalidades computed
  const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const mensalistas = alunos.filter((a) => a.integrationType === "mensalista");
  const todasModalidadesMens = Array.from(new Set(alunos.map((a) => a.modalidade).filter(Boolean)));
  const planosMensalistas = planos.filter((p) => (p.valorTexto ?? "").trim() !== "");
  const mensalidadeRows = mensalistas.map((a) => {
    const pagMes = allPayments
      .filter((p) => p.studentId === a.id && p.referenceMonth === currentMonthKey)
      .sort((x: any, y: any) => (x.createdAt < y.createdAt ? 1 : -1))[0];
    const plano = planos.find((p) => p.id === a.planoId);
    const professor = professores.find((p) => p.id === a.professorId);
    return { ...a, pagMes, plano, professor };
  });
  const mensalidadesFiltradas = mensalidadeRows.filter((row) => {
    if (filtroStatusMens === "paid") return row.pagMes?.status === "paid";
    if (filtroStatusMens === "pending") return !row.pagMes || row.pagMes.status !== "paid";
    return true;
  });
  const totalPagosMes = mensalidadeRows.filter((r) => r.pagMes?.status === "paid").length;
  const totalPendentesMes = mensalidadeRows.length - totalPagosMes;
  const receitaMes = mensalidadeRows
    .filter((r) => r.pagMes?.status === "paid")
    .reduce((acc, r) => acc + parseFloat((r.pagMes?.amount ?? "0").replace(",", ".")), 0);

  const sectionTitle: Record<string, string> = {
    dashboard: "Dashboard",
    alunos: "Alunos",
    mensalidades: "Mensalidades",
    professores: "Professores",
    planos: "Planos",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="manager-layout">
      <ManagerSidebar
        activeSection={activeSection}
        onSectionChange={handleSidebarAction}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        pendingCount={alunosPendentes.length}
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center px-6 py-4 border-b shrink-0">
          <h1 className="text-xl font-semibold" data-testid="text-manager-title">
            {sectionTitle[activeSection] ?? "Painel do Gestor"}
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

      {activeSection === "dashboard" && (
      <>
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
      </>
      )}

      {/* Dialog Pagar Assinatura */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-2xl">
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


      {/* Dialog Cadastrar Aluno */}
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
                <Label>Plano <span className="text-destructive">*</span></Label>
                <Select
                  value={novoAluno.planoId}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, planoId: v })}
                  disabled={!novoAluno.integrationType}
                >
                  <SelectTrigger data-testid="select-manager-student-plan">
                    <SelectValue placeholder="Selecione" />
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
              <div className="space-y-1">
                <Label>Integração <span className="text-destructive">*</span></Label>
                  <Select
                    value={novoAluno.integrationType}
                    onValueChange={(v) =>
                      setNovoAluno({
                        ...novoAluno,
                        integrationType: v,
                        integrationPlan: "",
                        planoId: ""
                      })
                    }
                  >
                  <SelectTrigger data-testid="select-manager-student-integration-type">
                    <SelectValue placeholder="Selecione a integração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {novoAluno.integrationType && novoAluno.integrationType !== "mensalista" && (
                <div className="space-y-1">
                  <Label>Plano da Integração <span className="text-destructive">*</span></Label>
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
              data-testid="button-confirm-manager-student"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeSection === "planos" && (
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
              onClick={() => {
                  setPlanoEditando(null);
                  setFormPlano({ titulo: "", checkins: "", valorTexto: "" });
                  setDialogNovoPlano(true);
                }}
              data-testid="button-add-plan"
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar novo plano
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Dialog criar plano */}
      <Dialog open={dialogNovoPlano} onOpenChange={setDialogNovoPlano}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Plano</DialogTitle>
            <DialogDescription>
              Preencha o número de check-in ou o valor mensal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Título do plano</Label>
              <Input
                placeholder="1x semana, 2x semana..."
                value={formPlano.titulo}
                onChange={(e) => setFormPlano({ ...formPlano, titulo: e.target.value })}
                data-testid="input-plan-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº de Check-in</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="8 ou 12"
                  value={formPlano.checkins ?? ""}
                  onChange={(e) => setFormPlano({ ...formPlano, checkins: e.target.value })}
                  data-testid="input-plan-checkins"
                />
              </div>
              <div className="space-y-1">
                <Label>Valor Mensal (R$)</Label>
                <Input
                  placeholder="140,00"
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
                <Label>Nº de Check-in</Label>
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

      {/* ======= MENSALIDADES SECTION ======= */}
      {activeSection === "mensalidades" && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Mensalistas</p>
                <p className="text-2xl font-bold" data-testid="text-total-mensalistas">{mensalistas.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Pagos este mês</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-pagos-mes">{totalPagosMes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-pendentes-mes">{totalPendentesMes}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Receita do mês</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-receita-mes">
                  R$ {receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters + Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg">Alunos Mensalistas</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex rounded-md border overflow-hidden text-sm">
                    {(["todos", "paid", "pending"] as const).map((f) => (
                      <button
                        key={f}
                        data-testid={`filter-mens-${f}`}
                        className={`px-3 py-1.5 transition-colors ${filtroStatusMens === f ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                        onClick={() => setFiltroStatusMens(f)}
                      >
                        {f === "todos" ? "Todos" : f === "paid" ? "Pagos" : "Pendentes"}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="button-registrar-pagamento-mens"
                    onClick={() => {
                      setMensAlunoId("");
                      setMensAlunoNome("");
                      const today = new Date();
                      const yyyy = today.getFullYear();
                      const mm = String(today.getMonth() + 1).padStart(2, "0");
                      const dd = String(today.getDate()).padStart(2, "0");
                      setFormMens({
                        referenceMonth: `${yyyy}-${mm}`,
                        amount: "",
                        dueDate: `${yyyy}-${mm}-${dd}`,
                        paymentMethod: "dinheiro",
                        status: "paid",
                      });
                      setDialogRegistrarMens(true);
                    }}
                  >
                    <Receipt className="w-4 h-4 mr-1" /> Registrar Pagamento
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {mensalidadesFiltradas.length === 0 ? (
                <div className="py-12 text-center">
                  {mensalistas.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm">Nenhum mensalista cadastrado ainda.</p>
                      <Button
                        size="sm"
                        data-testid="button-novo-mensalista-empty"
                        onClick={() => {
                          setNovoMensalista({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: "", professorId: "", diaVencimento: "10" });
                          setDialogNovoMensalista(true);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" /> Cadastrar Primeiro Mensalista
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum resultado para o filtro selecionado.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="hidden lg:table-cell">Professor</TableHead>
                      <TableHead className="hidden md:table-cell">Plano / Valor</TableHead>
                      <TableHead>Status do Mês</TableHead>
                      <TableHead className="hidden md:table-cell">Método</TableHead>
                      <TableHead className="hidden md:table-cell">Data Pgto.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mensalidadesFiltradas.map((row) => {
                      const isPaid = row.pagMes?.status === "paid";
                      const metodo = row.pagMes?.paymentMethod ?? null;
                      const metodoLabel: Record<string, string> = { cartao: "Cartão", pix: "PIX", dinheiro: "Dinheiro" };
                      return (
                        <TableRow key={row.id} data-testid={`row-mensalidade-${row.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.nome}</p>
                              {row.telefone && <p className="text-xs text-muted-foreground">{row.telefone}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {row.professor?.nome ?? <span className="italic text-xs">Sem professor</span>}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            <div>
                              <p>{row.plano?.titulo ?? "-"}</p>
                              {row.plano?.valorTexto && <p className="text-xs text-muted-foreground">R$ {row.plano.valorTexto}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isPaid ? "default" : "outline"}
                              className={isPaid ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"}
                              data-testid={`status-mens-${row.id}`}
                            >
                              {isPaid ? "Pago" : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {metodo ? metodoLabel[metodo] ?? metodo : "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {row.pagMes?.paymentDate ?? "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid={`button-pagar-mens-${row.id}`}
                                  onClick={() => {
                                    if (row.pagMes) {
                                      setPagarMensPaymentId(row.pagMes.id);
                                      setPagarMensMethod("dinheiro");
                                      setDialogPagarMens(true);
                                    } else {
                                      const today = new Date();
                                      const yyyy = today.getFullYear();
                                      const mm = String(today.getMonth() + 1).padStart(2, "0");
                                      const dd = String(today.getDate()).padStart(2, "0");
                                      setMensAlunoId(row.id);
                                      setMensAlunoNome(row.nome);
                                      setFormMens({
                                        referenceMonth: `${yyyy}-${mm}`,
                                        amount: row.plano?.valorTexto ?? "",
                                        dueDate: `${yyyy}-${mm}-${dd}`,
                                        paymentMethod: "dinheiro",
                                        status: "paid",
                                      });
                                      setDialogRegistrarMens(true);
                                    }
                                  }}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Pagar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-hist-mens-${row.id}`}
                                onClick={() => {
                                  setHistMensAlunoId(row.id);
                                  setHistMensAlunoNome(row.nome);
                                  setDialogHistMens(true);
                                }}
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-novo-mens-${row.id}`}
                                onClick={() => {
                                  const today = new Date();
                                  const yyyy = today.getFullYear();
                                  const mm = String(today.getMonth() + 1).padStart(2, "0");
                                  const dd = String(today.getDate()).padStart(2, "0");
                                  setMensAlunoId(row.id);
                                  setMensAlunoNome(row.nome);
                                  setFormMens({
                                    referenceMonth: `${yyyy}-${mm}`,
                                    amount: row.plano?.valorTexto ?? "",
                                    dueDate: `${yyyy}-${mm}-${dd}`,
                                    paymentMethod: "dinheiro",
                                    status: "paid",
                                  });
                                  setDialogRegistrarMens(true);
                                }}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Button
                size="lg"
                className="w-full h-14 text-lg mt-4"
                data-testid="button-novo-mensalista"
                onClick={() => {
                  setNovoMensalista({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: "", professorId: "", diaVencimento: "10" });
                  setDialogNovoMensalista(true);
                }}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Cadastrar Mensalista
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog: Registrar Pagamento Mensalidade */}
      <Dialog open={dialogRegistrarMens} onOpenChange={setDialogRegistrarMens}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            {mensAlunoNome && <DialogDescription>{mensAlunoNome}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3 py-2">
            {!mensAlunoId && (
              <div className="space-y-1">
                <Label>Aluno <span className="text-destructive">*</span></Label>
                <Select value={mensAlunoId} onValueChange={setMensAlunoId}>
                  <SelectTrigger data-testid="select-mens-aluno">
                    <SelectValue placeholder="Selecionar aluno..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mensalistas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Mês de referência <span className="text-destructive">*</span></Label>
              <Input
                type="month"
                value={formMens.referenceMonth}
                onChange={(e) => setFormMens({ ...formMens, referenceMonth: e.target.value })}
                data-testid="input-mens-month"
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$) <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: 200,00"
                value={formMens.amount}
                onChange={(e) => setFormMens({ ...formMens, amount: e.target.value })}
                data-testid="input-mens-amount"
              />
            </div>
            <div className="space-y-1">
              <Label>Data de vencimento <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={formMens.dueDate}
                onChange={(e) => setFormMens({ ...formMens, dueDate: e.target.value })}
                data-testid="input-mens-due"
              />
            </div>
            <div className="space-y-1">
              <Label>Método de pagamento</Label>
              <Select value={formMens.paymentMethod} onValueChange={(v) => setFormMens({ ...formMens, paymentMethod: v })}>
                <SelectTrigger data-testid="select-mens-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={formMens.status} onValueChange={(v) => setFormMens({ ...formMens, status: v })}>
                <SelectTrigger data-testid="select-mens-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRegistrarMens(false)}>Cancelar</Button>
            <Button
              disabled={!mensAlunoId || !formMens.referenceMonth || !formMens.amount || !formMens.dueDate || criarPagamentoMens.isPending}
              data-testid="button-confirm-mens"
              onClick={() => {
                const alunoId = mensAlunoId;
                const plano = planos.find((p) => mensalistas.find((a) => a.id === alunoId)?.planoId === p.id);
                criarPagamentoMens.mutate({
                  studentId: alunoId,
                  planId: plano?.id ?? null,
                  amount: formMens.amount,
                  referenceMonth: formMens.referenceMonth,
                  dueDate: formMens.dueDate,
                  paymentMethod: formMens.paymentMethod,
                  status: formMens.status,
                });
              }}
            >
              {criarPagamentoMens.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Marcar como Pago (quick) */}
      <Dialog open={dialogPagarMens} onOpenChange={setDialogPagarMens}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>Selecione o método de pagamento</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Select value={pagarMensMethod} onValueChange={setPagarMensMethod}>
              <SelectTrigger data-testid="select-pagar-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPagarMens(false)}>Cancelar</Button>
            <Button
              data-testid="button-confirm-pagar-mens"
              disabled={marcarPagoMens.isPending}
              onClick={() => marcarPagoMens.mutate({ id: pagarMensPaymentId, paymentMethod: pagarMensMethod })}
            >
              {marcarPagoMens.isPending ? "Confirmando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Histórico de Pagamentos do Mensalista */}
      <Dialog open={dialogHistMens} onOpenChange={setDialogHistMens}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de Pagamentos</DialogTitle>
            <DialogDescription>{histMensAlunoNome}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {(() => {
              const hist = allPayments
                .filter((p) => p.studentId === histMensAlunoId)
                .sort((a: any, b: any) => (a.referenceMonth > b.referenceMonth ? -1 : 1));
              const metodoLabel: Record<string, string> = { cartao: "Cartão", pix: "PIX", dinheiro: "Dinheiro" };
              if (hist.length === 0) {
                return <p className="py-6 text-center text-muted-foreground text-sm">Nenhum pagamento registrado.</p>;
              }
              return (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Data Pgto.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hist.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{p.referenceMonth}</TableCell>
                        <TableCell className="text-sm">R$ {p.amount}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={p.status === "paid" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}
                          >
                            {p.status === "paid" ? "Pago" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {metodoLabel[p.paymentMethod] ?? p.paymentMethod ?? "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.paymentDate ?? "-"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-del-hist-mens-${p.id}`}
                            onClick={() => excluirPagamentoMens.mutate(p.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogHistMens(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Mensalista */}
      <Dialog open={dialogNovoMensalista} onOpenChange={setDialogNovoMensalista}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Mensalista</DialogTitle>
            <DialogDescription>Preencha os dados do aluno mensalista. O primeiro pagamento será criado automaticamente como pendente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome do aluno"
                  value={novoMensalista.nome}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, nome: e.target.value })}
                  data-testid="input-nm-nome"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="000.000.000-00"
                  value={novoMensalista.cpf}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, cpf: e.target.value })}
                  data-testid="input-nm-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone (WhatsApp)</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={novoMensalista.telefone}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, telefone: e.target.value })}
                  data-testid="input-nm-telefone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoMensalista.email}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, email: e.target.value })}
                  data-testid="input-nm-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="login de acesso"
                  value={novoMensalista.login}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, login: e.target.value })}
                  data-testid="input-nm-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="senha de acesso"
                  value={novoMensalista.senha}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, senha: e.target.value })}
                  data-testid="input-nm-senha"
                />
              </div>
              <div className="space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Select value={novoMensalista.modalidade} onValueChange={(v) => setNovoMensalista({ ...novoMensalista, modalidade: v })}>
                  <SelectTrigger data-testid="select-nm-modalidade">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {todasModalidadesMens.length > 0
                      ? todasModalidadesMens.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                      : ["Beach Tennis", "Vôlei", "Natação", "Musculação", "Funcional"].map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Plano <span className="text-destructive">*</span></Label>
                <Select value={novoMensalista.planoId} onValueChange={(v) => setNovoMensalista({ ...novoMensalista, planoId: v })}>
                  <SelectTrigger data-testid="select-nm-plano">
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planosMensalistas.length > 0
                      ? planosMensalistas.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.titulo} — R$ {p.valorTexto}
                          </SelectItem>
                        ))
                      : <SelectItem value="__nenhum__" disabled>Nenhum plano com valor mensal cadastrado</SelectItem>}
                  </SelectContent>
                </Select>
                {planosMensalistas.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Crie um plano com valor mensal (R$) na seção Planos antes de cadastrar mensalistas.</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Professor responsável</Label>
                <Select value={novoMensalista.professorId || "__none__"} onValueChange={(v) => setNovoMensalista({ ...novoMensalista, professorId: v === "__none__" ? "" : v })}>
                  <SelectTrigger data-testid="select-nm-professor">
                    <SelectValue placeholder="Selecionar professor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {professores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome} — {p.modalidade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Dia de vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  placeholder="Ex: 10"
                  value={novoMensalista.diaVencimento}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, diaVencimento: e.target.value })}
                  data-testid="input-nm-dia-venc"
                />
                <p className="text-xs text-muted-foreground">Dia do mês para vencimento (1–28)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoMensalista(false)}>Cancelar</Button>
            <Button
              data-testid="button-confirm-novo-mensalista"
              disabled={
                !novoMensalista.nome || !novoMensalista.cpf || !novoMensalista.login ||
                !novoMensalista.senha || !novoMensalista.modalidade || !novoMensalista.planoId ||
                planosMensalistas.length === 0 || criarMensalista.isPending
              }
              onClick={() =>
                criarMensalista.mutate({
                  nome: novoMensalista.nome,
                  cpf: novoMensalista.cpf,
                  email: novoMensalista.email || null,
                  telefone: novoMensalista.telefone || null,
                  login: novoMensalista.login,
                  senha: novoMensalista.senha,
                  modalidade: novoMensalista.modalidade,
                  planoId: novoMensalista.planoId,
                  professorId: novoMensalista.professorId || null,
                  diaVencimento: novoMensalista.diaVencimento || "10",
                  integrationType: "mensalista",
                })
              }
            >
              {criarMensalista.isPending ? "Cadastrando..." : "Cadastrar Mensalista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Credenciais do Novo Mensalista */}
      <Dialog open={!!credenciaisMensalista} onOpenChange={() => setCredenciaisMensalista(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mensalista Cadastrado!</DialogTitle>
            <DialogDescription>Guarde as credenciais de acesso do aluno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted rounded-md p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Login:</span>
                <span className="font-mono text-sm" data-testid="text-cred-login">{credenciaisMensalista?.login}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Senha:</span>
                <span className="font-mono text-sm" data-testid="text-cred-senha">{credenciaisMensalista?.senha}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">O primeiro pagamento foi registrado como <strong>pendente</strong>. Acesse a lista de mensalistas para registrar o pagamento.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredenciaisMensalista(null)} data-testid="button-close-credenciais">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeSection === "professores" && (
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
                  {parseFloat(professor.percentualComissao ?? "0") > 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Comissão: {professor.percentualComissao}%
                    </Badge>
                  )}
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
              onClick={() => { setFormProfessor({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", percentualComissao: "" }); setDialogProfessor(true); }}
              data-testid="button-add-teacher"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Cadastrar Professor
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

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
            <div className="space-y-1">
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ex: 30"
                value={formProfessor.percentualComissao}
                onChange={(e) => setFormProfessor({ ...formProfessor, percentualComissao: e.target.value })}
                data-testid="input-teacher-comissao"
              />
              <p className="text-xs text-muted-foreground">Percentual sobre a receita gerada por check-ins atribuídos a este professor</p>
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
            <div className="space-y-1">
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ex: 30"
                value={formProfessor.percentualComissao}
                onChange={(e) => setFormProfessor({ ...formProfessor, percentualComissao: e.target.value })}
                data-testid="input-edit-teacher-comissao"
              />
              <p className="text-xs text-muted-foreground">Percentual sobre a receita gerada por check-ins atribuídos a este professor</p>
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

      {activeSection === "alunos" && (
      <>
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
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Alunos</CardTitle>
              <div className="flex rounded-lg border overflow-hidden text-sm">
                <button
                  className={`px-3 py-1 transition-colors ${abaAlunos === "ativos" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setAbaAlunos("ativos")}
                  data-testid="tab-alunos-ativos"
                >
                  Ativos <span className="ml-1 opacity-70">{alunos.length}</span>
                </button>
                <button
                  className={`px-3 py-1 transition-colors ${abaAlunos === "inativos" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  onClick={() => setAbaAlunos("inativos")}
                  data-testid="tab-alunos-inativos"
                >
                  Inativos <span className="ml-1 opacity-70">{alunosInativos.length}</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {abaAlunos === "ativos" && (
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
              )}
              <Button variant="outline" onClick={onExportarPDF} data-testid="button-export-pdf">
                <Download className="h-4 w-4 mr-2" />PDF
              </Button>
              <Button variant="outline" onClick={onExportarExcel} data-testid="button-export-excel">
                <Download className="h-4 w-4 mr-2" />Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {abaAlunos === "inativos" ? (
            <div className="space-y-2">
              {alunosInativos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluno inativo.</p>
              ) : (
                alunosInativos.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30" data-testid={`row-inativo-${a.id}`}>
                    <div>
                      <p className="font-medium text-sm">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">{a.modalidade} · {a.planoTitulo || "Sem plano"} · Desativado em {a.desativadoEm ?? "—"}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onReativarAluno(a.id)}
                      data-testid={`button-reativar-${a.id}`}
                    >
                      Reativar
                    </Button>
                  </div>
                ))
              )}
            </div>
          ) : (
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
                                integrationType: aluno.integrationType ?? "",
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
                            Validar pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoFinanceiroId(aluno.id);
                              const now = new Date();
                              const mesRef = `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
                              const venc = new Date(now.getFullYear(), now.getMonth(), 10).toLocaleDateString("pt-BR");
                              setFormPagamento({ description: "", amount: "", referenceMonth: mesRef, dueDate: venc, status: "paid" });
                              setDialogPagamento(true);
                            }}
                            data-testid={`menu-manual-payment-${aluno.id}`}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Registrar pagamento manual
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
                          <DropdownMenuItem
                            onClick={() => {
                              if (!whatsappSettings?.whatsapp_number) {
                                toast({ title: "Configure o WhatsApp primeiro", description: "Clique no botão WhatsApp no cabeçalho.", variant: "destructive" });
                                return;
                              }
                              window.open(buildWhatsappLink(aluno), "_blank");
                            }}
                            data-testid={`menu-whatsapp-${aluno.id}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
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
          )}
          <Button
            size="lg"
            className="w-full h-14 text-lg mt-4"
            onClick={() => setDialogNovoAluno(true)}
            data-testid="button-add-student-manager"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Cadastrar Aluno
          </Button>
        </CardContent>
      </Card>
      </>
      )}

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
                <Label>Plano <span className="text-destructive">*</span></Label>
                <Select
                  value={formEditarAluno.planoId}
                  onValueChange={(v) => setFormEditarAluno({ ...formEditarAluno, planoId: v })}
                  disabled={!formEditarAluno.integrationType}
                >
                  <SelectTrigger data-testid="select-edit-plano">
                    <SelectValue placeholder="Escolha a integração primeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPlanosPorIntegracao(formEditarAluno.integrationType).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {formEditarAluno.integrationType === "mensalista"
                          ? `${p.titulo} — ${p.valorTexto}`
                          : `${p.titulo} — ${getCheckinsLabel(p.checkins)}`}
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
                <Label>Integração <span className="text-destructive">*</span></Label>
                <Select
                  value={formEditarAluno.integrationType}
                  onValueChange={(v) => setFormEditarAluno({ ...formEditarAluno, integrationType: v, integrationPlan: "", planoId: "" })}
                >
                  <SelectTrigger data-testid="select-edit-integration-type">
                    <SelectValue placeholder="Selecione a integração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="wellhub">Wellhub (Gympass)</SelectItem>
                    <SelectItem value="totalpass">TotalPass</SelectItem>
                    {formEditarAluno.integrationType === "none" && (
                      <SelectItem value="none">Sem integração (legado)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {formEditarAluno.integrationType && formEditarAluno.integrationType !== "mensalista" && (
                <div className="col-span-2 space-y-1">
                  <Label>Plano da Integração <span className="text-destructive">*</span></Label>
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
                const exigePlanoIntegracao =
                  formEditarAluno.integrationType === "wellhub" || formEditarAluno.integrationType === "totalpass";

                if (
                  alunoEditando &&
                  formEditarAluno.nome &&
                  formEditarAluno.cpf &&
                  formEditarAluno.login &&
                  formEditarAluno.modalidade &&
                  formEditarAluno.integrationType &&
                  formEditarAluno.planoId &&
                  (!exigePlanoIntegracao || formEditarAluno.integrationPlan)
                ) {
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
              disabled={
                !formEditarAluno.nome ||
                !formEditarAluno.cpf ||
                !formEditarAluno.login ||
                !formEditarAluno.modalidade ||
                !formEditarAluno.integrationType ||
                !formEditarAluno.planoId ||
                (
                  (formEditarAluno.integrationType === "wellhub" || formEditarAluno.integrationType === "totalpass") &&
                  !formEditarAluno.integrationPlan
                )
              }
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
                {getPlanosPorIntegracao(alunoPlanoSelecionado?.integrationType).map((p) => (
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

      {/* Dialog Configuração WhatsApp */}
      <Dialog open={dialogWhatsapp} onOpenChange={setDialogWhatsapp}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              WhatsApp
            </DialogTitle>
            <DialogDescription>Configure o número, mensagens e automações de envio.</DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border-b mb-4 gap-0 overflow-x-auto">
            {([
              { key: "basico", label: "Básico" },
              { key: "cobranca", label: "Cobrança" },
              { key: "assiduidade", label: "Assiduidade" },
              { key: "fila", label: `Fila${pendingDispatches.length > 0 ? ` (${pendingDispatches.length})` : ""}` },
            ] as const).map((t) => (
              <button
                key={t.key}
                className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${waTab === t.key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setWaTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Básico */}
          {waTab === "basico" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="wa-number">Número do WhatsApp da arena</Label>
                <Input
                  id="wa-number"
                  placeholder="5511999999999"
                  value={formWhatsapp.whatsapp_number}
                  onChange={(e) => setFormWhatsapp((f) => ({ ...f, whatsapp_number: e.target.value }))}
                  data-testid="input-whatsapp-number"
                />
                <p className="text-xs text-muted-foreground mt-1">Apenas números com DDI (ex: 5511999999999)</p>
              </div>
              <div>
                <Label htmlFor="wa-message">Mensagem padrão (envio manual por aluno)</Label>
                <Textarea
                  id="wa-message"
                  rows={3}
                  placeholder="Olá {{nome}}, tudo bem?"
                  value={formWhatsapp.default_message}
                  onChange={(e) => setFormWhatsapp((f) => ({ ...f, default_message: e.target.value }))}
                  data-testid="input-whatsapp-message"
                />
                <p className="text-xs text-muted-foreground mt-1">Variáveis: <code className="bg-muted px-1 rounded">{"{{nome}}"}</code> <code className="bg-muted px-1 rounded">{"{{status}}"}</code> <code className="bg-muted px-1 rounded">{"{{checkins}}"}</code></p>
              </div>
              <Button onClick={() => salvarWhatsapp.mutate(formWhatsapp)} disabled={!formWhatsapp.whatsapp_number || salvarWhatsapp.isPending} data-testid="button-save-whatsapp">
                {salvarWhatsapp.isPending ? "Salvando..." : "Salvar configuração básica"}
              </Button>
            </div>
          )}

          {/* Tab: Cobrança */}
          {waTab === "cobranca" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Automação de cobrança</p>
                  <p className="text-xs text-muted-foreground">Envia mensagem para alunos com mensalidade em atraso</p>
                </div>
                <button
                  className={`w-11 h-6 rounded-full transition-colors relative ${formCobrancaAuto.cobranca_ativo ? "bg-green-500" : "bg-muted-foreground/30"}`}
                  onClick={() => setFormCobrancaAuto((f) => ({ ...f, cobranca_ativo: !f.cobranca_ativo }))}
                  data-testid="toggle-cobranca-ativo"
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${formCobrancaAuto.cobranca_ativo ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Dias após vencimento</Label>
                  <Input type="number" min={1} value={formCobrancaAuto.cobranca_dias_apos_vencimento}
                    onChange={(e) => setFormCobrancaAuto((f) => ({ ...f, cobranca_dias_apos_vencimento: Number(e.target.value) }))}
                    data-testid="input-cobranca-dias" />
                </div>
                <div>
                  <Label className="text-xs">Nº de disparos</Label>
                  <Input type="number" min={1} max={10} value={formCobrancaAuto.cobranca_num_disparos}
                    onChange={(e) => setFormCobrancaAuto((f) => ({ ...f, cobranca_num_disparos: Number(e.target.value) }))}
                    data-testid="input-cobranca-disparos" />
                </div>
                <div>
                  <Label className="text-xs">Intervalo (dias)</Label>
                  <Input type="number" min={1} value={formCobrancaAuto.cobranca_intervalo_dias}
                    onChange={(e) => setFormCobrancaAuto((f) => ({ ...f, cobranca_intervalo_dias: Number(e.target.value) }))}
                    data-testid="input-cobranca-intervalo" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Mensagem de cobrança</Label>
                <Textarea rows={4} value={formCobrancaAuto.cobranca_mensagem}
                  onChange={(e) => setFormCobrancaAuto((f) => ({ ...f, cobranca_mensagem: e.target.value }))}
                  data-testid="input-cobranca-mensagem" />
                <p className="text-xs text-muted-foreground mt-1">Variável disponível: <code className="bg-muted px-1 rounded">{"{{nome}}"}</code></p>
              </div>
              <Button onClick={() => salvarAutomacao.mutate(formCobrancaAuto)} disabled={salvarAutomacao.isPending}>
                {salvarAutomacao.isPending ? "Salvando..." : "Salvar automação de cobrança"}
              </Button>
            </div>
          )}

          {/* Tab: Assiduidade */}
          {waTab === "assiduidade" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Automação de assiduidade</p>
                  <p className="text-xs text-muted-foreground">Envia mensagem para alunos que pararam de fazer check-in</p>
                </div>
                <button
                  className={`w-11 h-6 rounded-full transition-colors relative ${formAssiduidadeAuto.assiduidade_ativo ? "bg-green-500" : "bg-muted-foreground/30"}`}
                  onClick={() => setFormAssiduidadeAuto((f) => ({ ...f, assiduidade_ativo: !f.assiduidade_ativo }))}
                  data-testid="toggle-assiduidade-ativo"
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${formAssiduidadeAuto.assiduidade_ativo ? "left-6" : "left-1"}`} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Dias sem check-in</Label>
                  <Input type="number" min={1} value={formAssiduidadeAuto.assiduidade_dias_sem_checkin}
                    onChange={(e) => setFormAssiduidadeAuto((f) => ({ ...f, assiduidade_dias_sem_checkin: Number(e.target.value) }))}
                    data-testid="input-assiduidade-dias" />
                </div>
                <div>
                  <Label className="text-xs">Nº de disparos</Label>
                  <Input type="number" min={1} max={10} value={formAssiduidadeAuto.assiduidade_num_disparos}
                    onChange={(e) => setFormAssiduidadeAuto((f) => ({ ...f, assiduidade_num_disparos: Number(e.target.value) }))}
                    data-testid="input-assiduidade-disparos" />
                </div>
                <div>
                  <Label className="text-xs">Intervalo (dias)</Label>
                  <Input type="number" min={1} value={formAssiduidadeAuto.assiduidade_intervalo_dias}
                    onChange={(e) => setFormAssiduidadeAuto((f) => ({ ...f, assiduidade_intervalo_dias: Number(e.target.value) }))}
                    data-testid="input-assiduidade-intervalo" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Mensagem de assiduidade</Label>
                <Textarea rows={4} value={formAssiduidadeAuto.assiduidade_mensagem}
                  onChange={(e) => setFormAssiduidadeAuto((f) => ({ ...f, assiduidade_mensagem: e.target.value }))}
                  data-testid="input-assiduidade-mensagem" />
                <p className="text-xs text-muted-foreground mt-1">Variável disponível: <code className="bg-muted px-1 rounded">{"{{nome}}"}</code></p>
              </div>
              <Button onClick={() => salvarAutomacao.mutate(formAssiduidadeAuto)} disabled={salvarAutomacao.isPending}>
                {salvarAutomacao.isPending ? "Salvando..." : "Salvar automação de assiduidade"}
              </Button>
            </div>
          )}

          {/* Tab: Fila de disparos */}
          {waTab === "fila" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{pendingDispatches.length === 0 ? "Nenhum disparo pendente." : `${pendingDispatches.length} disparo(s) pendente(s)`}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => executarAutomacao.mutate()} disabled={executarAutomacao.isPending} data-testid="button-run-automation">
                    {executarAutomacao.isPending ? "Executando..." : "Executar automação"}
                  </Button>
                  {pendingDispatches.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => marcarTodosEnviados.mutate()} data-testid="button-mark-all-sent">
                      Marcar todos enviados
                    </Button>
                  )}
                </div>
              </div>
              {pendingDispatches.map((d: any) => {
                const numero = whatsappSettings?.whatsapp_number ?? "";
                const link = `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(d.mensagem)}`;
                return (
                  <div key={d.id} className="flex items-start justify-between p-3 rounded-lg border gap-3" data-testid={`dispatch-${d.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.tipo === "cobranca" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                          {d.tipo === "cobranca" ? "Cobrança" : "Assiduidade"} #{d.disparo_num}
                        </span>
                        <span className="text-sm font-medium">{d.alunoNome}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{d.mensagem}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" data-testid={`button-send-${d.id}`}>
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />Enviar
                        </Button>
                      </a>
                      <Button size="sm" variant="outline" onClick={() => marcarEnviado.mutate(d.id)} data-testid={`button-sent-${d.id}`}>
                        ✓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogWhatsapp(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão do Aluno */}
      <Dialog open={!!confirmExcluirAluno} onOpenChange={(open) => { if (!open) setConfirmExcluirAluno(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Aluno</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar o aluno <strong>{confirmExcluirAluno?.nome}</strong>? O aluno será movido para a lista de inativos e poderá ser reativado a qualquer momento.
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
              Desativar
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

      {/* ── Dialog Log de Check-ins ── */}
      <Dialog open={dialogLogCheckins} onOpenChange={setDialogLogCheckins}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Log de Check-ins — Referenciamento
            </DialogTitle>
            <DialogDescription>
              Visualize todos os check-ins e atribua-os a uma aula ou day-use. A comissão do professor é calculada automaticamente ao referenciar como "Aula".
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-3">
            {(["todos", "pendente", "aula", "dayuse", "avulso"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={filtroTipoLog === t ? "default" : "outline"}
                onClick={() => setFiltroTipoLog(t)}
                className="capitalize"
              >
                {t === "todos" ? "Todos" : t === "pendente" ? "Pendentes" : t === "aula" ? "Aula" : t === "dayuse" ? "Day-use" : "Avulso"}
              </Button>
            ))}
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logCheckins as any[])
                  .filter((c) => filtroTipoLog === "todos" || c.tipo === filtroTipoLog)
                  .map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs whitespace-nowrap">{c.data} {c.hora}</TableCell>
                    <TableCell className="font-medium text-sm">{c.alunoNome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.alunoModalidade}</TableCell>
                    <TableCell>
                      {c.tipo === "pendente" ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>
                      ) : c.tipo === "aula" ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Aula</Badge>
                      ) : c.tipo === "dayuse" ? (
                        <Badge variant="secondary">Day-use</Badge>
                      ) : (
                        <Badge variant="secondary">Avulso</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{c.professorNome ?? "—"}</TableCell>
                    <TableCell>
                      {atribuindoCheckin === c.id ? (
                        <div className="flex flex-col gap-1 min-w-[220px]">
                          <Select value={atribuirForm.tipo} onValueChange={(v) => setAtribuirForm({ ...atribuirForm, tipo: v, professorId: v !== "aula" ? "" : atribuirForm.professorId })}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aula">Aula</SelectItem>
                              <SelectItem value="dayuse">Day-use</SelectItem>
                              <SelectItem value="avulso">Avulso</SelectItem>
                            </SelectContent>
                          </Select>
                          {atribuirForm.tipo === "aula" && (
                            <Select value={atribuirForm.professorId} onValueChange={(v) => setAtribuirForm({ ...atribuirForm, professorId: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar professor" /></SelectTrigger>
                              <SelectContent>
                                {professores.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-xs flex-1"
                              disabled={atribuirCheckin.isPending || (atribuirForm.tipo === "aula" && !atribuirForm.professorId)}
                              onClick={() => atribuirCheckin.mutate({ id: c.id, tipo: atribuirForm.tipo, professorId: atribuirForm.tipo === "aula" ? atribuirForm.professorId : undefined })}
                              data-testid={`button-confirmar-atribuir-${c.id}`}
                            >
                              Confirmar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAtribuindoCheckin(null)}>✕</Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => { setAtribuindoCheckin(c.id); setAtribuirForm({ tipo: c.tipo !== "pendente" ? c.tipo : "aula", professorId: c.professorId ?? "" }); }}
                          data-testid={`button-atribuir-${c.id}`}
                        >
                          {c.tipo === "pendente" ? "Referenciar" : "Alterar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {logCheckins.filter((c: any) => filtroTipoLog === "todos" || c.tipo === filtroTipoLog).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum check-in encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogLogCheckins(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Comissões ── */}
      <Dialog open={dialogComissoes} onOpenChange={setDialogComissoes}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PercentCircle className="h-5 w-5" />
              Gestão de Comissões
            </DialogTitle>
            <DialogDescription>
              Resumo de comissões por professor e histórico de check-ins referenciados. O gestor pode aprovar, ajustar o valor e adicionar observações.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 space-y-6">
            {/* Resumo por professor */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resumo por Professor</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead>Comissão (%)</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Receita Gerada</TableHead>
                    <TableHead>Comissão Total</TableHead>
                    <TableHead>Pendentes</TableHead>
                    <TableHead>Aprovados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(resumoComissoes as any[]).map((r) => (
                    <TableRow key={r.teacherId} data-testid={`comissao-resumo-${r.teacherId}`}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell>{r.percentual}%</TableCell>
                      <TableCell>{r.totalCheckins}</TableCell>
                      <TableCell>R$ {r.totalReceita.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-green-700 dark:text-green-400">R$ {r.totalComissao.toFixed(2)}</TableCell>
                      <TableCell>
                        {r.pendente > 0 ? <Badge variant="outline" className="text-orange-600 border-orange-300">{r.pendente}</Badge> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell>
                        {r.aprovado > 0 ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{r.aprovado}</Badge> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {resumoComissoes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nenhuma comissão registrada. Referencie check-ins como "Aula" para gerar comissões.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Detalhe de comissões */}
            {todasComissoes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico Detalhado</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Professor</TableHead>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Valor Check-in</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(todasComissoes as any[]).map((c) => (
                      <TableRow key={c.id} data-testid={`comissao-${c.id}`}>
                        <TableCell className="text-xs whitespace-nowrap">{c.data}</TableCell>
                        <TableCell className="text-sm">{c.professorNome}</TableCell>
                        <TableCell className="text-sm">{c.alunoNome}</TableCell>
                        <TableCell className="text-sm">R$ {c.valorCheckin}</TableCell>
                        <TableCell className="text-sm">{c.percentual}%</TableCell>
                        <TableCell className="font-medium text-sm">
                          {editandoComissao?.id === c.id ? (
                            <Input
                              className="h-7 w-24 text-xs"
                              value={editComissaoForm.valorComissao}
                              onChange={(e) => setEditComissaoForm({ ...editComissaoForm, valorComissao: e.target.value })}
                            />
                          ) : (
                            `R$ ${c.valorComissao}`
                          )}
                        </TableCell>
                        <TableCell>
                          {c.status === "aprovado" || c.status === "editado" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                              {c.status === "editado" ? "Editado" : "Aprovado"}
                            </Badge>
                          ) : c.status === "cancelado" ? (
                            <Badge variant="destructive" className="text-xs">Cancelado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editandoComissao?.id === c.id ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={salvarComissao.isPending}
                                onClick={() => salvarComissao.mutate({ id: c.id, valorComissao: editComissaoForm.valorComissao, status: "editado", observacao: editComissaoForm.observacao })}
                                data-testid={`button-salvar-comissao-${c.id}`}
                              >
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditandoComissao(null)}>✕</Button>
                            </div>
                          ) : c.status !== "cancelado" ? (
                            <div className="flex gap-1">
                              {(c.status === "pendente") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                  disabled={salvarComissao.isPending}
                                  onClick={() => salvarComissao.mutate({ id: c.id, status: "aprovado" })}
                                  data-testid={`button-aprovar-comissao-${c.id}`}
                                >
                                  Aprovar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => { setEditandoComissao(c); setEditComissaoForm({ valorComissao: c.valorComissao, status: c.status, observacao: c.observacao ?? "" }); }}
                                data-testid={`button-editar-comissao-${c.id}`}
                              >
                                Editar
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogComissoes(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Editar Comissão (observação) ── */}
      <Dialog open={!!editandoComissao} onOpenChange={(open) => { if (!open) setEditandoComissao(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Valor da Comissão (R$)</Label>
              <Input
                value={editComissaoForm.valorComissao}
                onChange={(e) => setEditComissaoForm({ ...editComissaoForm, valorComissao: e.target.value })}
                placeholder="0.00"
                data-testid="input-edit-comissao-valor"
              />
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Input
                value={editComissaoForm.observacao}
                onChange={(e) => setEditComissaoForm({ ...editComissaoForm, observacao: e.target.value })}
                placeholder="Ex: ajuste por duplicidade"
                data-testid="input-edit-comissao-obs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoComissao(null)}>Cancelar</Button>
            <Button
              disabled={salvarComissao.isPending}
              onClick={() => salvarComissao.mutate({ id: editandoComissao?.id, valorComissao: editComissaoForm.valorComissao, status: "editado", observacao: editComissaoForm.observacao })}
              data-testid="button-confirm-edit-comissao"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Dialog Conta Bancária */}
      <Dialog open={dialogContaBancaria} onOpenChange={setDialogContaBancaria}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Configuração da Conta
            </DialogTitle>
            <DialogDescription>
              Configure os dados bancários e chave PIX para recebimento de mensalidades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Dados do recebedor */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Dados do Recebedor
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conta-receiverName">Nome do Recebedor</Label>
                  <Input
                    id="conta-receiverName"
                    value={formContaBancaria.receiverName}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, receiverName: e.target.value })}
                    placeholder="Nome completo ou razão social"
                    data-testid="input-conta-receiverName"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conta-cpfCnpj">CPF / CNPJ</Label>
                  <Input
                    id="conta-cpfCnpj"
                    value={formContaBancaria.cpfCnpj}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, cpfCnpj: e.target.value })}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    data-testid="input-conta-cpfCnpj"
                  />
                </div>
              </div>
            </div>

            {/* Dados bancários */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Dados Bancários
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conta-banco">Banco</Label>
                  <Input
                    id="conta-banco"
                    value={formContaBancaria.banco}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, banco: e.target.value })}
                    placeholder="Ex: Itaú, Bradesco, Nubank…"
                    data-testid="input-conta-banco"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conta-tipoConta">Tipo de Conta</Label>
                  <Select
                    value={formContaBancaria.tipoConta}
                    onValueChange={(v) => setFormContaBancaria({ ...formContaBancaria, tipoConta: v })}
                  >
                    <SelectTrigger id="conta-tipoConta" data-testid="select-conta-tipoConta">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrente">Conta Corrente</SelectItem>
                      <SelectItem value="poupanca">Conta Poupança</SelectItem>
                      <SelectItem value="pagamento">Conta de Pagamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conta-agencia">Agência</Label>
                  <Input
                    id="conta-agencia"
                    value={formContaBancaria.agencia}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, agencia: e.target.value })}
                    placeholder="Ex: 1234"
                    data-testid="input-conta-agencia"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conta-numeroConta">Número da Conta</Label>
                  <Input
                    id="conta-numeroConta"
                    value={formContaBancaria.numeroConta}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, numeroConta: e.target.value })}
                    placeholder="Ex: 12345-6"
                    data-testid="input-conta-numeroConta"
                  />
                </div>
              </div>
            </div>

            {/* Chave PIX */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Key className="h-4 w-4" />
                Chave PIX
              </h3>
              <div className="space-y-1.5">
                <Label htmlFor="conta-pixKey">Chave PIX</Label>
                <Input
                  id="conta-pixKey"
                  value={formContaBancaria.pixKey}
                  onChange={(e) => setFormContaBancaria({ ...formContaBancaria, pixKey: e.target.value })}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  data-testid="input-conta-pixKey"
                />
                <p className="text-xs text-muted-foreground">Esta chave é usada para gerar o QR Code de pagamento das mensalidades.</p>
              </div>
            </div>

            {/* Credenciais de API (avançado) */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Integração de API (Opcional)
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="conta-bankApiKey">API Key do Banco / Gateway</Label>
                  <Input
                    id="conta-bankApiKey"
                    type="password"
                    value={formContaBancaria.bankApiKey}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, bankApiKey: e.target.value })}
                    placeholder="Chave de API fornecida pelo banco ou gateway de pagamento"
                    data-testid="input-conta-bankApiKey"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conta-bankWebhookUrl">URL de Webhook</Label>
                  <Input
                    id="conta-bankWebhookUrl"
                    value={formContaBancaria.bankWebhookUrl}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, bankWebhookUrl: e.target.value })}
                    placeholder="https://meubank.com/webhook/confirmacao"
                    data-testid="input-conta-bankWebhookUrl"
                  />
                  <p className="text-xs text-muted-foreground">URL para receber confirmações automáticas de pagamento.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogContaBancaria(false)} data-testid="button-conta-cancelar">
              Cancelar
            </Button>
            <Button
              onClick={() => salvarContaBancaria.mutate(formContaBancaria, {
                onSuccess: () => {
                  qc.invalidateQueries({ queryKey: ["/api/finance/settings"] });
                  setDialogContaBancaria(false);
                },
              })}
              disabled={salvarContaBancaria.isPending}
              data-testid="button-conta-salvar"
            >
              <Save className="h-4 w-4 mr-2" />
              {salvarContaBancaria.isPending ? "Salvando…" : "Salvar Configurações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </div>
      </div>
    </div>
  );
}
