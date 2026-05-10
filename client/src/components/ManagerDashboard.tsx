import { useState, useRef } from "react";
import { PhotoCropModal } from "./PhotoCropModal";
import { HelpPanel } from "@/components/HelpDialog";
import ManagerSidebar from "@/components/ManagerSidebar";
import AgendaManager from "@/components/AgendaManager";
import QuadrasManager from "@/components/QuadrasManager";
import FinancialDashboard from "@/components/FinancialDashboard";
import SystemSettings from "@/components/SystemSettings";
import AlertPanel from "@/components/AlertPanel";
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
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  GraduationCap,
  ArrowUpRight,
  Star,
  Zap,
  Camera,
  UserCircle,
  Menu,
  FileText,
  Link2,
  Upload,
  QrCode,
  RefreshCw,
  Eye,
  EyeOff,
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
  photoUrl?: string | null;
}

const PROF_COR_OPTIONS = [
  "#1565C0","#1976D2","#0288D1","#00838F","#2E7D32",
  "#558B2F","#F57F17","#E65100","#BF360C","#6A1B9A",
  "#AD1457","#37474F",
];

interface ProfessorGestor {
  id: string;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  login?: string;
  modalidade: string;
  percentualComissao?: string;
  photoUrl?: string | null;
  cor?: string;
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
  professorId?: string;
}

interface ManagerDashboardProps {
  arenaName?: string;
  gestorName?: string;
  planos: Plano[];
  alunos: AlunoGestor[];
  professores: ProfessorGestor[];
  statusConta?: string;
  trialExpiraEm?: string | null;
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
  arenaId?: string;
  onLogout?: () => void;
  onEditarAluno: (dados: { id: string; nome: string; cpf: string; email: string; telefone: string; login: string; senha?: string; modalidade: string; statusMensalidade: string; checkinsRealizados: number; planoId: string; integrationType: string; integrationPlan: string }) => void;
  onAlterarPlanoAluno: (alunoId: string, planoId: string) => void;
  onCheckinManual: (alunoId: string, data?: string, hora?: string) => void;
  onRemoverCheckin: (alunoId: string, index: number) => void;
  onExcluirAluno: (alunoId: string) => void;
  onReativarAluno: (alunoId: string) => void;
  onExcluirAlunoPermanente: (alunoId: string) => void;
}


export default function ManagerDashboard({
  gestorName,
  arenaName,
  planos,
  alunos,
  professores,
  statusConta,
  trialExpiraEm,
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
  arenaId,
  onLogout,
  onEditarAluno,
  onAlterarPlanoAluno,
  onCheckinManual,
  onRemoverCheckin,
  onExcluirAluno,
  onReativarAluno,
  onExcluirAlunoPermanente,
}: ManagerDashboardProps) {
  const [filtroAlunos, setFiltroAlunos] = useState<string>("todas");

  const { data: alunosInativos = [] } = useQuery<any[]>({
    queryKey: ["/api/alunos/inativos"],
  });

  // WhatsApp state
  const [waTab, setWaTab] = useState<"basico" | "cobranca" | "assiduidade" | "fila">("basico");
  const [formWhatsapp, setFormWhatsapp] = useState({
    whatsapp_number: "",
    default_message: "",
    provider: "manual",
    apiKey: "",
    instanceId: "",
    apiUrl: "",
  });
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

  const { data: whatsappSettings } = useQuery<{
    whatsapp_number?: string;
    default_message?: string;
    provider?: string;
    apiKey?: string;
    instanceId?: string;
    apiUrl?: string;
  } | null>({
    queryKey: ["/api/whatsapp/settings"],
  });

  const { data: automationConfig } = useQuery<any>({
    queryKey: ["/api/whatsapp/automation"],
  });

  const { data: pendingDispatches = [], refetch: refetchDispatches } = useQuery<any[]>({
    queryKey: ["/api/whatsapp/dispatches"],
  });

  const [formContaBancaria, setFormContaBancaria] = useState({
    receiverName: "",
    pixKey: "",
    pixQrcodeImage: "",
    pixTipo: "chave" as "chave" | "qrcode",
    banco: "",
    agencia: "",
    numeroConta: "",
    tipoConta: "corrente",
    cpfCnpj: "",
    bankApiKey: "",
    bankWebhookUrl: "",
  });
  const contaFileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUploadConta = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormContaBancaria((f) => ({ ...f, pixQrcodeImage: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Conta Bancária query + mutation
  const { data: contaBancariaData } = useQuery<any>({
    queryKey: ["/api/finance/settings"],
  });
  const salvarContaBancaria = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/finance/settings", data).then((r) => r.json()),
  });

  // Commission queries
  const { data: resumoComissoes = [], refetch: refetchComissoes } = useQuery<any[]>({
    queryKey: ["/api/finance/comissao/resumo"],
  });

  const { data: todasComissoes = [], refetch: refetchTodasComissoes } = useQuery<any[]>({
    queryKey: ["/api/finance/comissoes"],
  });

  const { data: logCheckins = [], refetch: refetchLog } = useQuery<any[]>({
    queryKey: ["/api/checkins/log"],
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

  const excluirComissao = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/comissao/${id}`),
    onSuccess: () => {
      qcComissao.invalidateQueries({ queryKey: ["/api/finance/comissoes"] });
      qcComissao.invalidateQueries({ queryKey: ["/api/finance/comissao/resumo"] });
      toast({ title: "Registro removido." });
    },
  });

  const qcWa = useQueryClient();
  const salvarWhatsapp = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/whatsapp/settings", d),
    onSuccess: () => {
      qcWa.invalidateQueries({ queryKey: ["/api/whatsapp/settings"] });
      toast({ title: "WhatsApp configurado com sucesso!" });
    },
  });

  const enviarWhatsappAvulso = useMutation({
    mutationFn: (d: { telefone: string; mensagem: string }) =>
      apiRequest("POST", "/api/whatsapp/send", d).then((r) => r.json()),
    onSuccess: (data: any) => {
      if (data.mode === "api") {
        toast({ title: "Mensagem enviada com sucesso!" });
      } else if (data.mode === "manual") {
        window.open(data.link, "_blank");
      } else if (data.mode === "no_phone") {
        toast({ title: "Aluno sem telefone cadastrado", description: "Edite o aluno e adicione o número de telefone.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const enviarDispatch = useMutation({
    mutationFn: (d: any) =>
      apiRequest("POST", "/api/whatsapp/send", { telefone: d.alunoTelefone, mensagem: d.mensagem }).then((r) => r.json()),
    onSuccess: (data: any, variables: any) => {
      if (data.mode === "api") {
        marcarEnviado.mutate(variables.id);
        qcWa.invalidateQueries({ queryKey: ["/api/whatsapp/dispatches"] });
        toast({ title: `Mensagem enviada para ${variables.alunoNome}!` });
      } else if (data.mode === "manual") {
        window.open(data.link, "_blank");
      } else if (data.mode === "no_phone") {
        toast({ title: "Aluno sem telefone cadastrado", description: "Edite o aluno e adicione o número de telefone.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
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

  function buildWhatsappMessage(aluno: AlunoGestor) {
    const template = whatsappSettings?.default_message ?? "Olá {{nome}}, tudo bem?";
    return template
      .replace(/\{\{nome\}\}/g, aluno.nome)
      .replace(/\{\{status\}\}/g, aluno.statusMensalidade ?? "")
      .replace(/\{\{checkins\}\}/g, String(aluno.checkinsRealizados));
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
  const [confirmDeleteAluno, setConfirmDeleteAluno] = useState<{ id: string; nome: string } | null>(null);

  // Editar aluno state
  const [dialogEditarAluno, setDialogEditarAluno] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<AlunoGestor | null>(null);
  const [formEditarAluno, setFormEditarAluno] = useState({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", statusMensalidade: "Em dia" as string, checkinsRealizados: 0, planoId: "", integrationType: "", integrationPlan: "", photoUrl: "" });

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

  const gerarComprovante = (params: {
    alunoNome: string;
    amount: string;
    referenceMonth: string;
    paymentDate?: string | null;
    paymentMethod?: string | null;
    planoTitulo?: string;
    paymentId?: string;
  }) => {
    const metodoLabel: Record<string, string> = { cartao: "Cartão de Crédito/Débito", pix: "PIX", dinheiro: "Dinheiro" };
    const metodo = metodoLabel[params.paymentMethod ?? ""] ?? params.paymentMethod ?? "—";
    const [ano, mes] = (params.referenceMonth ?? "").split("-");
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mesFormatado = mes ? `${meses[parseInt(mes, 10) - 1]} / ${ano}` : params.referenceMonth;
    const dataEmissao = new Date().toLocaleDateString("pt-BR");
    const recibo = params.paymentId ? `Ref: ${params.paymentId.slice(-10).toUpperCase()}` : "";
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Comprovante de Pagamento</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f4f6f8; display: flex; justify-content: center; padding: 40px 20px; }
  .card { background: white; border-radius: 12px; padding: 40px; max-width: 460px; width: 100%; box-shadow: 0 2px 16px rgba(0,0,0,0.10); }
  .header { text-align: center; margin-bottom: 28px; }
  .logo { font-size: 24px; font-weight: 800; color: #1e3a5f; letter-spacing: 2px; }
  .arena { font-size: 14px; color: #6b7280; margin-top: 4px; }
  .badge { display: inline-flex; align-items: center; gap: 6px; background: #d1fae5; color: #065f46; padding: 6px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; margin: 16px 0 8px; }
  .amount { font-size: 40px; font-weight: 800; color: #111827; text-align: center; margin: 4px 0 28px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
  .row { display: flex; justify-content: space-between; align-items: baseline; padding: 9px 0; font-size: 14px; }
  .label { color: #6b7280; }
  .value { font-weight: 600; color: #111827; text-align: right; max-width: 260px; word-break: break-word; }
  .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #9ca3af; }
  .recibo { font-size: 11px; color: #d1d5db; text-align: center; margin-top: 6px; }
  @media print { body { background: white; padding: 0; } .card { box-shadow: none; border-radius: 0; max-width: 100%; } }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo">SEVEN SPORTS</div>
    ${arenaName ? `<div class="arena">${arenaName}</div>` : ""}
    <div class="badge">✓ Pagamento Confirmado</div>
    <div class="amount">R$&nbsp;${params.amount}</div>
  </div>
  <hr />
  <div class="row"><span class="label">Aluno</span><span class="value">${params.alunoNome}</span></div>
  ${params.planoTitulo ? `<div class="row"><span class="label">Plano</span><span class="value">${params.planoTitulo}</span></div>` : ""}
  <div class="row"><span class="label">Referência</span><span class="value">${mesFormatado}</span></div>
  <div class="row"><span class="label">Data do pagamento</span><span class="value">${params.paymentDate ?? dataEmissao}</span></div>
  <div class="row"><span class="label">Forma de pagamento</span><span class="value">${metodo}</span></div>
  <hr />
  <div class="footer">Documento emitido em ${dataEmissao}</div>
  <div class="recibo">${recibo}</div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

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

  // Despesas state & queries
  const { data: listaDespesas = [] } = useQuery<any[]>({ queryKey: ["/api/despesas"] });
  const [dialogDespesa, setDialogDespesa] = useState(false);
  const [despesaEditando, setDespesaEditando] = useState<any | null>(null);
  const [formDespesa, setFormDespesa] = useState({ categoria: "Outros", descricao: "", valor: "", data: "" });
  const [confirmDeleteDespesa, setConfirmDeleteDespesa] = useState<any | null>(null);
  const [filtroDespesaMes, setFiltroDespesaMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const CATEGORIAS_DESPESA = ["Aluguel", "Energia", "Água", "Internet", "Salários", "Material", "Manutenção", "Outros"];

  const criarDespesa = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/despesas", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/despesas"] }); setDialogDespesa(false); toast({ title: "Despesa registrada!" }); },
    onError: () => toast({ title: "Erro", description: "Não foi possível registrar.", variant: "destructive" }),
  });

  const editarDespesa = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/despesas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/despesas"] }); setDialogDespesa(false); setDespesaEditando(null); toast({ title: "Despesa atualizada!" }); },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar.", variant: "destructive" }),
  });

  const deletarDespesa = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/despesas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/despesas"] }); setConfirmDeleteDespesa(null); toast({ title: "Despesa removida." }); },
    onError: () => toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" }),
  });

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

  // Comissão privacy toggle (false = oculto por padrão)
  const [comissaoVisivel, setComissaoVisivel] = useState(false);

  // Professor state
  const [dialogProfessor, setDialogProfessor] = useState(false);
  const [professorEditando, setProfessorEditando] = useState<ProfessorGestor | null>(null);
  const [formProfessor, setFormProfessor] = useState({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", percentualComissao: "", photoUrl: "", cor: "#1565C0" });

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
    professorId: "",
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
    setFormProfessor({ nome: p.nome, cpf: p.cpf || "", email: p.email || "", telefone: p.telefone || "", login: p.login || "", senha: "", modalidade: p.modalidade, percentualComissao: p.percentualComissao || "", photoUrl: p.photoUrl || "", cor: p.cor || "#1565C0" });
  };

  const [cropSrcProfessor, setCropSrcProfessor] = useState<string | null>(null);
  const [cropSrcAluno, setCropSrcAluno] = useState<string | null>(null);

  const openCropForFile = (file: File, setter: (src: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => setter(e.target!.result as string);
    reader.readAsDataURL(file);
  };

  const handleSalvarProfessor = () => {
    if (!formProfessor.nome || !formProfessor.modalidade) return;
    const percentualComissao = formProfessor.percentualComissao
      ? parseFloat(formProfessor.percentualComissao.replace(",", ".")).toFixed(2)
      : "0.00";
    if (professorEditando) {
      const dados: any = {
        nome: formProfessor.nome,
        cpf: formProfessor.cpf || undefined,
        email: formProfessor.email || undefined,
        telefone: formProfessor.telefone || undefined,
        login: formProfessor.login || undefined,
        modalidade: formProfessor.modalidade,
        percentualComissao,
        cor: formProfessor.cor || "#1565C0",
      };
      if (formProfessor.senha) dados.senha = formProfessor.senha;
      if (formProfessor.photoUrl) dados.photoUrl = formProfessor.photoUrl;
      onEditarProfessor(professorEditando.id, dados);
      setProfessorEditando(null);
    } else {
      if (!formProfessor.login || !formProfessor.senha) return;
      onCadastrarProfessor({ nome: formProfessor.nome, cpf: formProfessor.cpf, email: formProfessor.email, telefone: formProfessor.telefone, login: formProfessor.login, senha: formProfessor.senha, modalidade: formProfessor.modalidade, percentualComissao, cor: formProfessor.cor || "#1565C0" } as any);
      setDialogProfessor(false);
    }
    setFormProfessor({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", percentualComissao: "", photoUrl: "", cor: "#1565C0" });
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
      setNovoAluno({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: "", integrationType: "", integrationPlan: "", professorId: "" });
      setDialogNovoAluno(false);
    }
  };

  // Modalidades únicas de alunos + professores
  const todasModalidades = Array.from(
    new Set([...alunos.map((a) => a.modalidade), ...professores.map((p) => p.modalidade)].filter(Boolean))
  );

  const alunosFiltrados = alunos.filter((a) =>
    filtroAlunos === "todas" || filtroAlunos === "ativos" || a.modalidade === filtroAlunos
  );
  const alunosPendentes = alunos.filter((a) => !a.aprovado);
  const alunoPlanoSelecionado = alunos.find((a) => a.id === alunoPlanoId);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSidebarAction = (section: string) => {
    if (section === "whatsapp") {
      setFormWhatsapp({
        whatsapp_number: whatsappSettings?.whatsapp_number ?? "",
        default_message: whatsappSettings?.default_message ?? "Olá {{nome}}, sua mensalidade está {{status}}.",
        provider: whatsappSettings?.provider ?? "manual",
        apiKey: whatsappSettings?.apiKey ?? "",
        instanceId: whatsappSettings?.instanceId ?? "",
        apiUrl: whatsappSettings?.apiUrl ?? "",
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
      setActiveSection("whatsapp");
      return;
    }
    if (section === "comissoes") { refetchComissoes(); setActiveSection("comissoes"); return; }
    if (section === "checkins") { setActiveSection("checkins"); return; }
    if (section === "ajuda") { setActiveSection("ajuda"); return; }
    if (section === "conta") {
      const hasQrcode = !!contaBancariaData?.pixQrcodeImage;
      setFormContaBancaria({
        receiverName: contaBancariaData?.receiverName ?? "",
        pixKey: contaBancariaData?.pixKey ?? "",
        pixQrcodeImage: contaBancariaData?.pixQrcodeImage ?? "",
        pixTipo: hasQrcode ? "qrcode" : "chave",
        banco: contaBancariaData?.banco ?? "",
        agencia: contaBancariaData?.agencia ?? "",
        numeroConta: contaBancariaData?.numeroConta ?? "",
        tipoConta: contaBancariaData?.tipoConta ?? "corrente",
        cpfCnpj: contaBancariaData?.cpfCnpj ?? "",
        bankApiKey: contaBancariaData?.bankApiKey ?? "",
        bankWebhookUrl: contaBancariaData?.bankWebhookUrl ?? "",
      });
      setActiveSection("conta");
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

  // ── Home computed values ──────────────────────────────────────────────────
  const today = new Date().toLocaleDateString("pt-BR");
  const horaAtual = new Date().getHours();
  const saudacao = horaAtual < 12 ? "Bom dia" : horaAtual < 18 ? "Boa tarde" : "Boa noite";
  const dataHojeStr = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const alunosAprovados = alunos.filter(a => a.aprovado);
  const checkinsHoje = alunosAprovados.filter(a => a.ultimoCheckin === today).length;
  const adimplPct = mensalistas.length > 0 ? totalPagosMes / mensalistas.length : 0;
  const fmtBRL = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const porPlanoMap: Record<string, number> = {};
  alunosAprovados.forEach(a => { const k = a.planoTitulo || "Sem plano"; porPlanoMap[k] = (porPlanoMap[k] || 0) + 1; });
  const porPlano = Object.entries(porPlanoMap).sort((a, b) => b[1] - a[1]);
  const maxPlano = Math.max(...porPlano.map(([, v]) => v), 1);
  const porModMap: Record<string, number> = {};
  alunosAprovados.forEach(a => { const m = a.modalidade || "Outros"; porModMap[m] = (porModMap[m] || 0) + 1; });
  const porMod = Object.entries(porModMap).sort((a, b) => b[1] - a[1]);
  const maxMod = Math.max(...porMod.map(([, v]) => v), 1);
  const alunosPorProfMap = new Map<string, number>();
  alunosAprovados.forEach(a => { if (a.professorId) alunosPorProfMap.set(a.professorId, (alunosPorProfMap.get(a.professorId) || 0) + 1); });
  const toDateNum = (s: string) => { const [d, m, y] = (s ?? "").split("/"); return parseInt((y ?? "0") + (m ?? "0").padStart(2, "0") + (d ?? "0").padStart(2, "0")); };
  const recentCheckins = [...alunosAprovados].filter(a => a.ultimoCheckin).sort((a, b) => toDateNum(b.ultimoCheckin!) - toDateNum(a.ultimoCheckin!)).slice(0, 6);
  const circ42 = 2 * Math.PI * 42;

  const sectionTitle: Record<string, string> = {
    dashboard: "Home",
    alunos: "Alunos",
    mensalidades: "Mensalidades",
    professores: "Professores",
    planos: "Planos",
    agenda: "Agenda",
    financeiro: "Financeiro",
    despesas: "Despesas",
    configuracoes: "Configurações",
    integracoes: "Integrações",
    alertas: "Alertas",
    whatsapp: "WhatsApp",
    comissoes: "Comissões",
    checkins: "Log de Check-ins",
    conta: "Conta Bancária",
    quadras: "Quadras",
    ajuda: "Ajuda",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-testid="manager-layout">
      <ManagerSidebar
        activeSection={activeSection}
        onSectionChange={handleSidebarAction}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        pendingCount={alunosPendentes.length}
        arenaName={arenaName}
        gestorName={gestorName}
        onLogout={onLogout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b shrink-0">
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-muted transition-colors shrink-0"
            onClick={() => setMobileSidebarOpen(true)}
            data-testid="button-mobile-menu"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold truncate" data-testid="text-manager-title">
            {sectionTitle[activeSection] ?? "Painel do Gestor"}
          </h1>
        </div>
        <div className={["agenda","financeiro","alertas"].includes(activeSection) ? "flex-1 overflow-y-auto" : "flex-1 overflow-y-auto p-3 sm:p-4 md:p-6"}>

      {activeSection === "dashboard" && (
      <>
        {/* ── Banner de Trial ── */}
        {statusConta === "trial" && trialExpiraEm && (() => {
          const expira = new Date(trialExpiraEm);
          expira.setHours(23, 59, 59);
          const diasRestantes = Math.max(0, Math.ceil((expira.getTime() - Date.now()) / 86400000));
          return (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 mb-4" data-testid="banner-trial">
              <div className="flex items-center gap-2.5 min-w-0">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 leading-tight">
                    Teste grátis — {diasRestantes === 0 ? "último dia!" : `${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-tight">
                    Expira em {expira.toLocaleDateString("pt-BR")} · Assine para continuar
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs px-3 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                onClick={() => handleSidebarAction("assinatura")}
                data-testid="button-assinar-trial"
              >
                Assinar plano
              </Button>
            </div>
          );
        })()}

        {/* ── Assinatura compacta no topo ── */}
        {subscription && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 mb-5" data-testid="card-subscription-compact">
            <div className="flex items-center gap-2.5 min-w-0">
              <CreditCard className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight truncate">
                  {subscription.subscriptionPlan === "basic" ? "Plano Básico" : subscription.subscriptionPlan === "premium" ? "Plano Premium" : subscription.subscriptionPlan}
                  {subscription.subscriptionValue ? ` · ${subscription.subscriptionValue}` : ""}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  Próx. cobrança: {subscription.nextBillingDate ?? "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={subscription.subscriptionStatus === "Ativo" ? "default" : "destructive"}
                className="text-xs"
                data-testid="badge-subscription-status"
              >
                {subscription.subscriptionStatus}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPayDialog(true)}
                className="h-7 text-xs px-2.5"
                data-testid="button-pay-subscription-compact"
              >
                Pagar
              </Button>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground" data-testid="text-home-greeting">
              {saudacao}!
            </h2>
            <p className="text-muted-foreground text-sm capitalize">{dataHojeStr}</p>
          </div>
          {alunosPendentes.length > 0 && (
            <button
              onClick={() => setActiveSection("alunos")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
              data-testid="alert-pending-home"
            >
              <AlertCircle className="h-4 w-4" />
              {alunosPendentes.length} aguardando aprovação →
            </button>
          )}
        </div>

        {/* ── 4 Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white shadow-md" data-testid="card-total-alunos">
            <div className="flex items-center justify-between mb-3">
              <span className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Alunos Ativos</span>
              <Users className="h-5 w-5 text-blue-200" />
            </div>
            <p className="text-3xl sm:text-4xl font-bold leading-none" data-testid="text-total-students">{alunosAprovados.length}</p>
            <p className="text-xs text-blue-200 mt-2">
              {alunosPendentes.length > 0 ? `+${alunosPendentes.length} pendente(s)` : "todos aprovados"}
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white shadow-md" data-testid="card-checkins-hoje">
            <div className="flex items-center justify-between mb-3">
              <span className="text-orange-100 text-xs font-semibold uppercase tracking-wider">Check-ins Hoje</span>
              <Zap className="h-5 w-5 text-orange-100" />
            </div>
            <p className="text-3xl sm:text-4xl font-bold leading-none" data-testid="text-checkins-hoje">{checkinsHoje}</p>
            <p className="text-xs text-orange-100 mt-2">{today}</p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 text-white shadow-md" data-testid="card-mensalidades">
            <div className="flex items-center justify-between mb-3">
              <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Mensalidades</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-200" />
            </div>
            <p className="text-3xl sm:text-4xl font-bold leading-none" data-testid="text-mensalidades-pagas">
              {totalPagosMes}
              <span className="text-xl text-emerald-200 font-normal">/{mensalistas.length}</span>
            </p>
            <p className="text-xs text-emerald-200 mt-2">
              {totalPendentesMes > 0 ? `${totalPendentesMes} pendente(s)` : "todas em dia"}
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-4 text-white shadow-md" data-testid="card-receita">
            <div className="flex items-center justify-between mb-3">
              <span className="text-purple-100 text-xs font-semibold uppercase tracking-wider">Receita do Mês</span>
              <DollarSign className="h-5 w-5 text-purple-200" />
            </div>
            <p className="text-2xl font-bold leading-none" data-testid="text-receita-mes">{fmtBRL(receitaMes)}</p>
            <p className="text-xs text-purple-200 mt-2">mensalidades pagas</p>
          </div>
        </div>

        {/* ── Adimplência + Distribuição por Plano ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          {/* Adimplência Ring */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Adimplência do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28">
                  <svg width="112" height="112" viewBox="0 0 112 112">
                    <circle cx="56" cy="56" r="42" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted opacity-30" />
                    {adimplPct > 0 && (
                      <circle
                        cx="56" cy="56" r="42" fill="none"
                        stroke={adimplPct >= 0.8 ? "#10b981" : adimplPct >= 0.5 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="12"
                        strokeDasharray={`${circ42 * adimplPct} ${circ42 * (1 - adimplPct)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 56 56)"
                        style={{ transition: "stroke-dasharray 0.7s ease" }}
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl font-bold leading-none">{Math.round(adimplPct * 100)}%</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">em dia</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 flex-1 w-full">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0" />
                      Em dia
                    </span>
                    <span className="font-bold text-emerald-600 text-sm">{totalPagosMes}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-amber-400 inline-block shrink-0" />
                      Pendente
                    </span>
                    <span className="font-bold text-amber-600 text-sm">{totalPendentesMes}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Total mensalistas</span>
                    <span className="font-bold text-sm">{mensalistas.length}</span>
                  </div>
                  <button
                    onClick={() => setActiveSection("mensalidades")}
                    className="text-xs text-primary flex items-center gap-1 hover:underline mt-1"
                    data-testid="link-ver-mensalidades"
                  >
                    Ver mensalidades <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distribuição por Plano */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Distribuição por Plano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {porPlano.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum plano cadastrado</p>
              )}
              {porPlano.slice(0, 5).map(([titulo, count], i) => {
                const barColors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500", "bg-cyan-500"];
                const textColors = ["text-blue-600", "text-violet-600", "text-emerald-600", "text-orange-600", "text-cyan-600"];
                const pct = alunosAprovados.length > 0 ? Math.round((count / alunosAprovados.length) * 100) : 0;
                return (
                  <div key={titulo} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium truncate max-w-[160px]">{titulo}</span>
                      <span className={`ml-2 font-semibold ${textColors[i % textColors.length]}`}>{count} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-700`}
                        style={{ width: `${(count / maxPlano) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => setActiveSection("planos")}
                  className="text-xs text-primary flex items-center gap-1 hover:underline"
                  data-testid="link-ver-planos"
                >
                  Gerenciar planos <ArrowUpRight className="h-3 w-3" />
                </button>
                <div className="flex gap-2 sm:ml-auto">
                  <Button variant="outline" size="sm" onClick={onExportarPDF} data-testid="button-export-pdf">
                    <Download className="h-4 w-4 mr-2" />PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={onExportarExcel} data-testid="button-export-excel">
                    <Download className="h-4 w-4 mr-2" />Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Equipe de Professores ── */}
        {professores.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-violet-500" />
                Equipe de Professores
                <span className="ml-auto text-xs font-normal text-muted-foreground">{professores.length} ativo(s)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                {professores.map((prof, i) => {
                  const gradients = [
                    "from-blue-400 to-blue-600",
                    "from-violet-400 to-purple-600",
                    "from-emerald-400 to-emerald-600",
                    "from-orange-400 to-orange-600",
                    "from-pink-400 to-rose-600",
                    "from-cyan-400 to-cyan-600",
                  ];
                  const alunosCount = alunosPorProfMap.get(prof.id) ?? 0;
                  return (
                    <div
                      key={prof.id}
                      className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setActiveSection("professores")}
                      data-testid={`prof-card-${prof.id}`}
                    >
                      <div className={`w-10 h-10 rounded-full overflow-hidden ${prof.photoUrl ? "" : `bg-gradient-to-br ${gradients[i % gradients.length]}`} flex items-center justify-center shadow-sm shrink-0`}>
                        {prof.photoUrl ? (
                          <img src={prof.photoUrl} alt={prof.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-sm font-bold">{prof.nome.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 flex items-center gap-2 overflow-hidden">
                        <p className="font-medium truncate shrink">{prof.nome}</p>
                        {prof.modalidade && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{prof.modalidade}</span>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 ml-auto">Alunos: {alunosCount}</span>
                        {prof.percentualComissao && parseFloat(prof.percentualComissao) > 0 && (
                          <>
                            <Badge variant="secondary" className="h-5 px-2 text-[11px] shrink-0">
                              {comissaoVisivel ? `${prof.percentualComissao}%` : "•••"}
                            </Badge>
                            <button
                              onClick={(e) => { e.stopPropagation(); setComissaoVisivel(v => !v); }}
                              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                              title={comissaoVisivel ? "Ocultar comissão" : "Mostrar comissão"}
                            >
                              {comissaoVisivel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Bottom Row: Modalidades + Últimas Presenças ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          {/* Alunos por Modalidade */}
          {porMod.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Alunos por Modalidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {porMod.map(([mod, count], i) => {
                  const modColors = ["bg-orange-500", "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-cyan-500", "bg-pink-500", "bg-amber-500"];
                  const modText = ["text-orange-600", "text-blue-600", "text-violet-600", "text-emerald-600", "text-cyan-600", "text-pink-600", "text-amber-600"];
                  const pct = alunosAprovados.length > 0 ? Math.round((count / alunosAprovados.length) * 100) : 0;
                  return (
                    <div key={mod} className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${modColors[i % modColors.length]}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{mod}</span>
                          <span className={`font-semibold ${modText[i % modText.length]}`}>{count} · {pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${modColors[i % modColors.length]} transition-all duration-700`}
                            style={{ width: `${(count / maxMod) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Últimas Presenças */}
          {recentCheckins.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-500" />
                  Últimas Presenças
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentCheckins.map((aluno, i) => {
                  const avatarGrads = [
                    "from-blue-400 to-blue-600",
                    "from-violet-400 to-purple-600",
                    "from-emerald-400 to-emerald-600",
                    "from-orange-400 to-orange-600",
                    "from-pink-400 to-rose-600",
                    "from-cyan-400 to-cyan-600",
                  ];
                  const initials = aluno.nome
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("");
                  return (
                    <div key={aluno.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                      <div className={`w-9 h-9 rounded-full overflow-hidden shrink-0 shadow-sm ${aluno.photoUrl ? "" : `bg-gradient-to-br ${avatarGrads[i % avatarGrads.length]}`} flex items-center justify-center`}>
                        {aluno.photoUrl ? (
                          <img src={aluno.photoUrl} alt={aluno.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white text-xs font-bold">{initials || aluno.nome.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">{aluno.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{aluno.modalidade || aluno.planoTitulo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{aluno.ultimoCheckin}</p>
                        <span className={`text-xs font-semibold ${aluno.statusMensalidade === "Em dia" ? "text-emerald-600" : "text-orange-500"}`}>
                          {aluno.statusMensalidade}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={() => setActiveSection("alunos")}
                  className="text-xs text-primary flex items-center gap-1 hover:underline pt-2 pl-2"
                  data-testid="link-ver-alunos"
                >
                  Ver todos os alunos <ArrowUpRight className="h-3 w-3" />
                </button>
              </CardContent>
            </Card>
          )}
        </div>

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
                  onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value, senha: e.target.value })}
                  data-testid="input-manager-student-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={novoAluno.telefone}
                  onChange={(e) => setNovoAluno({ ...novoAluno, telefone: e.target.value })}
                  data-testid="input-manager-student-telefone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoAluno.email}
                  onChange={(e) => setNovoAluno({ ...novoAluno, email: e.target.value, login: e.target.value })}
                  data-testid="input-manager-student-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoAluno.login}
                  onChange={(e) => setNovoAluno({ ...novoAluno, login: e.target.value })}
                  data-testid="input-manager-student-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <Input
                  type="text"
                  placeholder="CPF do aluno"
                  value={novoAluno.senha}
                  onChange={(e) => setNovoAluno({ ...novoAluno, senha: e.target.value, cpf: e.target.value })}
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
              <div className="col-span-2 space-y-1">
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
                <div className="col-span-2 space-y-1">
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
              <div className="col-span-2 space-y-1">
                <Label>Professor responsável</Label>
                <Select
                  value={novoAluno.professorId || "__none__"}
                  onValueChange={(v) => setNovoAluno({ ...novoAluno, professorId: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger data-testid="select-manager-student-professor">
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
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
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
              <Button
                size="lg"
                className="w-full h-14 text-lg"
                data-testid="button-novo-mensalista"
                onClick={() => {
                  setNovoMensalista({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: "", professorId: "", diaVencimento: "10" });
                  setDialogNovoMensalista(true);
                }}
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Cadastrar Mensalista
              </Button>
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
                              {!isPaid && row.pagMes && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Gerar link de pagamento"
                                  data-testid={`button-link-mens-${row.id}`}
                                  onClick={async () => {
                                    try {
                                      const resp = await fetch(`/api/payments/${row.pagMes!.id}/link`);
                                      if (!resp.ok) throw new Error("Erro");
                                      const { url } = await resp.json();
                                      await navigator.clipboard.writeText(url);
                                      toast({ title: "Link copiado!", description: url.length > 60 ? url.slice(0, 60) + "…" : url });
                                    } catch {
                                      toast({ title: "Erro ao gerar link", variant: "destructive" });
                                    }
                                  }}
                                >
                                  <Link2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              )}
                              {isPaid && row.pagMes && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Gerar comprovante"
                                  data-testid={`button-comprovante-${row.id}`}
                                  onClick={() => gerarComprovante({
                                    alunoNome: row.nome,
                                    amount: row.pagMes!.amount,
                                    referenceMonth: row.pagMes!.referenceMonth,
                                    paymentDate: row.pagMes!.paymentDate,
                                    paymentMethod: row.pagMes!.paymentMethod,
                                    planoTitulo: row.plano?.titulo,
                                    paymentId: row.pagMes!.id,
                                  })}
                                >
                                  <FileText className="w-4 h-4 text-muted-foreground" />
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
                          <div className="flex items-center gap-1">
                            {p.status === "paid" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Gerar comprovante"
                                data-testid={`button-comprovante-hist-${p.id}`}
                                onClick={() => gerarComprovante({
                                  alunoNome: histMensAlunoNome,
                                  amount: p.amount,
                                  referenceMonth: p.referenceMonth,
                                  paymentDate: p.paymentDate,
                                  paymentMethod: p.paymentMethod,
                                  paymentId: p.id,
                                })}
                              >
                                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-del-hist-mens-${p.id}`}
                              onClick={() => excluirPagamentoMens.mutate(p.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
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
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, cpf: e.target.value, senha: e.target.value })}
                  data-testid="input-nm-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone (WhatsApp) <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={novoMensalista.telefone}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, telefone: e.target.value })}
                  data-testid="input-nm-telefone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoMensalista.email}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, email: e.target.value, login: e.target.value })}
                  data-testid="input-nm-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={novoMensalista.login}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, login: e.target.value })}
                  data-testid="input-nm-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="CPF do aluno"
                  value={novoMensalista.senha}
                  onChange={(e) => setNovoMensalista({ ...novoMensalista, senha: e.target.value, cpf: e.target.value })}
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
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={() => {
                const coresUsadas = professores.map((p) => p.cor).filter(Boolean);
                const primeiraLivre = PROF_COR_OPTIONS.find((c) => !coresUsadas.includes(c)) || "#37474F";
                setFormProfessor({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", percentualComissao: "", photoUrl: "", cor: primeiraLivre });
                setDialogProfessor(true);
              }}
              data-testid="button-add-teacher"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Cadastrar Professor
            </Button>
                {professores.map((professor, idx) => {
              const profGradients = ["from-blue-400 to-blue-600","from-violet-400 to-purple-600","from-emerald-400 to-emerald-600","from-orange-400 to-orange-600","from-pink-400 to-rose-600","from-cyan-400 to-cyan-600"];
              return (
              <div
                key={professor.id}
                className="flex items-center justify-between p-3 bg-muted rounded-xl gap-3"
                data-testid={`teacher-${professor.id}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center shadow-sm ${professor.photoUrl ? "" : `bg-gradient-to-br ${profGradients[idx % profGradients.length]}`}`}>
                    {professor.photoUrl ? (
                      <img src={professor.photoUrl} alt={professor.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-base">{professor.nome.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex items-center gap-2 overflow-hidden">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 border border-white shadow-sm"
                      style={{ backgroundColor: professor.cor || "#1565C0" }}
                      title="Cor na agenda"
                    />
                    <p className="font-medium truncate shrink">{professor.nome}</p>
                    <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">{professor.modalidade}</span>
                    {parseFloat(professor.percentualComissao ?? "0") > 0 && (
                      <>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {comissaoVisivel ? `${professor.percentualComissao}%` : "•••"}
                        </Badge>
                        <button
                          onClick={(e) => { e.stopPropagation(); setComissaoVisivel(v => !v); }}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          title={comissaoVisivel ? "Ocultar comissão" : "Mostrar comissão"}
                        >
                          {comissaoVisivel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
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
              );
            })}

          </div>
        </CardContent>
      </Card>
      )}

      {/* Dialog cadastrar professor */}
      <Dialog open={dialogProfessor} onOpenChange={setDialogProfessor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar Professor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-1.5 pb-1">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center">
                  {formProfessor.photoUrl ? (
                    <img src={formProfessor.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-3 w-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openCropForFile(file, setCropSrcProfessor);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {formProfessor.photoUrl ? (
                <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setFormProfessor(prev => ({ ...prev, photoUrl: "" }))}>Remover foto</button>
              ) : (
                <p className="text-xs text-muted-foreground">Foto do professor (opcional)</p>
              )}
              {cropSrcProfessor && (
                <PhotoCropModal
                  imageSrc={cropSrcProfessor}
                  onConfirm={(b64) => { setFormProfessor(prev => ({ ...prev, photoUrl: b64 })); setCropSrcProfessor(null); }}
                  onRemove={() => { setFormProfessor(prev => ({ ...prev, photoUrl: "" })); setCropSrcProfessor(null); }}
                  onCancel={() => setCropSrcProfessor(null)}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome do Professor <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome completo"
                  value={formProfessor.nome}
                  onChange={(e) => setFormProfessor({ ...formProfessor, nome: e.target.value })}
                  data-testid="input-teacher-name"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="000.000.000-00"
                  value={formProfessor.cpf}
                  onChange={(e) => setFormProfessor({ ...formProfessor, cpf: e.target.value, senha: e.target.value })}
                  data-testid="input-teacher-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formProfessor.telefone}
                  onChange={(e) => setFormProfessor({ ...formProfessor, telefone: e.target.value })}
                  data-testid="input-teacher-telefone"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formProfessor.email}
                  onChange={(e) => setFormProfessor({ ...formProfessor, email: e.target.value, login: e.target.value })}
                  data-testid="input-teacher-email"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formProfessor.login}
                  onChange={(e) => setFormProfessor({ ...formProfessor, login: e.target.value })}
                  data-testid="input-teacher-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <Input
                  type="text"
                  placeholder="CPF do professor"
                  value={formProfessor.senha}
                  onChange={(e) => setFormProfessor({ ...formProfessor, senha: e.target.value })}
                  data-testid="input-teacher-senha"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: Beach Tennis, Futevôlei, Surf..."
                  value={formProfessor.modalidade}
                  onChange={(e) => setFormProfessor({ ...formProfessor, modalidade: e.target.value })}
                  data-testid="input-teacher-modality"
                />
              </div>
              <div className="col-span-2 space-y-1">
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
              <div className="col-span-2 space-y-1">
                <Label>Cor na agenda</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PROF_COR_OPTIONS.map((cor) => {
                    const usada = professores.some((p) => p.cor === cor);
                    const selecionada = formProfessor.cor === cor;
                    return (
                      <button
                        key={cor}
                        type="button"
                        title={usada ? "Cor em uso por outro professor" : cor}
                        disabled={usada}
                        onClick={() => setFormProfessor((prev) => ({ ...prev, cor }))}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          selecionada ? "ring-2 ring-offset-2 ring-gray-500 scale-110" : ""
                        } ${usada ? "opacity-25 cursor-not-allowed" : "hover:scale-110 cursor-pointer"}`}
                        style={{ backgroundColor: cor }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Cores acinzentadas já estão em uso por outros professores</p>
              </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-1.5 pb-1">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center">
                  {formProfessor.photoUrl ? (
                    <img src={formProfessor.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-3 w-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openCropForFile(file, setCropSrcProfessor);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {formProfessor.photoUrl ? (
                <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setFormProfessor(prev => ({ ...prev, photoUrl: "" }))}>Remover foto</button>
              ) : (
                <p className="text-xs text-muted-foreground">Foto do professor (opcional)</p>
              )}
              {cropSrcProfessor && (
                <PhotoCropModal
                  imageSrc={cropSrcProfessor}
                  onConfirm={(b64) => { setFormProfessor(prev => ({ ...prev, photoUrl: b64 })); setCropSrcProfessor(null); }}
                  onRemove={() => { setFormProfessor(prev => ({ ...prev, photoUrl: "" })); setCropSrcProfessor(null); }}
                  onCancel={() => setCropSrcProfessor(null)}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome do Professor <span className="text-destructive">*</span></Label>
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
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formProfessor.telefone}
                  onChange={(e) => setFormProfessor({ ...formProfessor, telefone: e.target.value })}
                  data-testid="input-edit-teacher-phone"
                />
              </div>
              <div className="col-span-2 space-y-1">
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
                <Label>Login</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formProfessor.login}
                  onChange={(e) => setFormProfessor({ ...formProfessor, login: e.target.value })}
                  data-testid="input-edit-teacher-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Nova Senha <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  type="text"
                  placeholder="Deixe em branco para não alterar"
                  value={formProfessor.senha}
                  onChange={(e) => setFormProfessor({ ...formProfessor, senha: e.target.value })}
                  data-testid="input-edit-teacher-password"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Modalidade <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: Beach Tennis, Futevôlei, Surf..."
                  value={formProfessor.modalidade}
                  onChange={(e) => setFormProfessor({ ...formProfessor, modalidade: e.target.value })}
                  data-testid="input-edit-teacher-modality"
                />
              </div>
              <div className="col-span-2 space-y-1">
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
              <div className="col-span-2 space-y-1">
                <Label>Cor na agenda</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PROF_COR_OPTIONS.map((cor) => {
                    const usadaPorOutro = professores.some((p) => p.cor === cor && p.id !== professorEditando?.id);
                    const selecionada = formProfessor.cor === cor;
                    return (
                      <button
                        key={cor}
                        type="button"
                        title={usadaPorOutro ? "Cor em uso por outro professor" : cor}
                        disabled={usadaPorOutro}
                        onClick={() => setFormProfessor((prev) => ({ ...prev, cor }))}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          selecionada ? "ring-2 ring-offset-2 ring-gray-500 scale-110" : ""
                        } ${usadaPorOutro ? "opacity-25 cursor-not-allowed" : "hover:scale-110 cursor-pointer"}`}
                        style={{ backgroundColor: cor }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Cores acinzentadas já estão em uso por outros professores</p>
              </div>
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
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Select value={filtroAlunos} onValueChange={setFiltroAlunos} data-testid="select-filtro-alunos">
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativos">Ativos ({alunos.length})</SelectItem>
                <SelectItem value="inativos">Inativos ({alunosInativos.length})</SelectItem>
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
          </div>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full h-14 text-lg mb-4"
            onClick={() => setDialogNovoAluno(true)}
            data-testid="button-add-student-manager"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Cadastrar Aluno
          </Button>
          {filtroAlunos === "inativos" ? (
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
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReativarAluno(a.id)}
                        data-testid={`button-reativar-${a.id}`}
                      >
                        Reativar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDeleteAluno({ id: a.id, nome: a.nome })}
                        data-testid={`button-excluir-permanente-${a.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
          <>
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
                                photoUrl: aluno.photoUrl ?? "",
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
                                toast({ title: "Configure o WhatsApp primeiro", description: "Acesse WhatsApp no menu lateral.", variant: "destructive" });
                                return;
                              }
                              enviarWhatsappAvulso.mutate({ telefone: aluno.telefone ?? "", mensagem: buildWhatsappMessage(aluno) });
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
          {filtroAlunos === "todas" && alunosInativos.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-2">Inativos</p>
              {alunosInativos.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30" data-testid={`row-inativo-${a.id}`}>
                  <div>
                    <p className="font-medium text-sm">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">{a.modalidade} · {a.planoTitulo || "Sem plano"} · Desativado em {a.desativadoEm ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => onReativarAluno(a.id)} data-testid={`button-reativar-${a.id}`}>Reativar</Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDeleteAluno({ id: a.id, nome: a.nome })} data-testid={`button-excluir-permanente-${a.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {activeSection === "agenda" && (
        <AgendaManager onVoltar={() => setActiveSection("dashboard")} />
      )}

      {activeSection === "quadras" && (
        <QuadrasManager arenaId={arenaId ?? ""} arenaName={arenaName} />
      )}

      {activeSection === "financeiro" && (
        <FinancialDashboard
          arenaId={arenaId ?? ""}
          alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, modalidade: a.modalidade, checkinsRealizados: a.checkinsRealizados }))}
          onVoltar={() => setActiveSection("dashboard")}
        />
      )}

      {activeSection === "configuracoes" && (
        <SystemSettings onVoltar={() => setActiveSection("dashboard")} section="configuracoes" />
      )}

      {activeSection === "integracoes" && (
        <SystemSettings onVoltar={() => setActiveSection("dashboard")} section="integracoes" />
      )}

      {activeSection === "alertas" && (
        <AlertPanel arenaId={arenaId ?? ""} onVoltar={() => setActiveSection("dashboard")} />
      )}

      {activeSection === "ajuda" && (
        <div className="flex-1 overflow-hidden h-full">
          <HelpPanel />
        </div>
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
              Editar dados
            </DialogTitle>
            <DialogDescription>{alunoEditando?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-1.5 pb-1">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center">
                  {formEditarAluno.photoUrl ? (
                    <img src={formEditarAluno.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-3 w-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openCropForFile(file, setCropSrcAluno);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {formEditarAluno.photoUrl ? (
                <button type="button" className="text-xs text-destructive hover:underline" onClick={() => setFormEditarAluno(prev => ({ ...prev, photoUrl: "" }))}>Remover foto</button>
              ) : (
                <p className="text-xs text-muted-foreground">Foto do aluno (opcional)</p>
              )}
              {cropSrcAluno && (
                <PhotoCropModal
                  imageSrc={cropSrcAluno}
                  onConfirm={(b64) => { setFormEditarAluno(prev => ({ ...prev, photoUrl: b64 })); setCropSrcAluno(null); }}
                  onRemove={() => { setFormEditarAluno(prev => ({ ...prev, photoUrl: "" })); setCropSrcAluno(null); }}
                  onCancel={() => setCropSrcAluno(null)}
                />
              )}
            </div>
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
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, cpf: e.target.value, senha: e.target.value })}
                  data-testid="input-edit-cpf"
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formEditarAluno.telefone}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, telefone: e.target.value })}
                  data-testid="input-edit-telefone"
                />
              </div>
              <div className="space-y-1">
                <Label>Login <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formEditarAluno.login}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, login: e.target.value })}
                  data-testid="input-edit-login"
                />
              </div>
              <div className="space-y-1">
                <Label>Nova Senha</Label>
                <Input
                  placeholder="CPF do aluno"
                  type="password"
                  value={formEditarAluno.senha}
                  onChange={(e) => setFormEditarAluno({ ...formEditarAluno, senha: e.target.value, cpf: e.target.value })}
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
      {activeSection === "whatsapp" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
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
              {/* Número e mensagem padrão */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="wa-number">Número do WhatsApp da arena (remetente)</Label>
                  <Input
                    id="wa-number"
                    placeholder="5511999999999"
                    value={formWhatsapp.whatsapp_number}
                    onChange={(e) => setFormWhatsapp((f) => ({ ...f, whatsapp_number: e.target.value }))}
                    data-testid="input-whatsapp-number"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Número com DDI (ex: 5511999999999) — é o número que envia as mensagens</p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Variáveis: <code className="bg-muted px-1 rounded">{"{{nome}}"}</code> <code className="bg-muted px-1 rounded">{"{{status}}"}</code> <code className="bg-muted px-1 rounded">{"{{checkins}}"}</code>
                  </p>
                </div>
              </div>

              {/* Modo de envio / API */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold">Modo de envio</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formWhatsapp.provider === "manual" ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                    {formWhatsapp.provider === "manual" ? "Manual" : "API Ativa"}
                  </span>
                </div>
                <div>
                  <Label htmlFor="wa-provider">Provedor</Label>
                  <Select
                    value={formWhatsapp.provider}
                    onValueChange={(v) => setFormWhatsapp((f) => ({ ...f, provider: v }))}
                  >
                    <SelectTrigger id="wa-provider" data-testid="select-whatsapp-provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual — link WhatsApp Web</SelectItem>
                      <SelectItem value="evolution">Evolution API</SelectItem>
                      <SelectItem value="zapi">Z-API</SelectItem>
                      <SelectItem value="360dialog">360dialog (Meta)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formWhatsapp.provider === "manual"
                      ? "Modo manual: você clica num link para abrir o WhatsApp Web e enviar a mensagem."
                      : "Modo API: as mensagens são enviadas automaticamente pelo provedor configurado."}
                  </p>
                </div>

                {formWhatsapp.provider !== "manual" && (
                  <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
                    {formWhatsapp.provider === "evolution" && (
                      <div>
                        <Label className="text-xs">URL da Evolution API</Label>
                        <Input
                          placeholder="https://api.meuservidor.com"
                          value={formWhatsapp.apiUrl}
                          onChange={(e) => setFormWhatsapp((f) => ({ ...f, apiUrl: e.target.value }))}
                          data-testid="input-whatsapp-api-url"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">
                        API Key{formWhatsapp.provider === "360dialog" ? " (D360-API-KEY)" : ""}
                      </Label>
                      <Input
                        type="password"
                        placeholder="Chave de API fornecida pelo provedor"
                        value={formWhatsapp.apiKey}
                        onChange={(e) => setFormWhatsapp((f) => ({ ...f, apiKey: e.target.value }))}
                        data-testid="input-whatsapp-api-key"
                      />
                    </div>
                    {(formWhatsapp.provider === "evolution" || formWhatsapp.provider === "zapi") && (
                      <div>
                        <Label className="text-xs">ID da Instância</Label>
                        <Input
                          placeholder={formWhatsapp.provider === "evolution" ? "nome-da-instancia" : "INSTANCE_ID"}
                          value={formWhatsapp.instanceId}
                          onChange={(e) => setFormWhatsapp((f) => ({ ...f, instanceId: e.target.value }))}
                          data-testid="input-whatsapp-instance-id"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={() => salvarWhatsapp.mutate(formWhatsapp)}
                disabled={!formWhatsapp.whatsapp_number || salvarWhatsapp.isPending}
                data-testid="button-save-whatsapp"
              >
                {salvarWhatsapp.isPending ? "Salvando..." : "Salvar configurações"}
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {pendingDispatches.length === 0 ? "Nenhum disparo pendente." : `${pendingDispatches.length} disparo(s) pendente(s)`}
                  </p>
                  {whatsappSettings?.provider && whatsappSettings.provider !== "manual" && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">API ativa — envios automáticos via {whatsappSettings.provider}</p>
                  )}
                </div>
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
                const temTelefone = !!(d.alunoTelefone?.replace(/\D/g, ""));
                const isApi = whatsappSettings?.provider && whatsappSettings.provider !== "manual";
                return (
                  <div key={d.id} className="flex items-start justify-between p-3 rounded-lg border gap-3" data-testid={`dispatch-${d.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.tipo === "cobranca" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                          {d.tipo === "cobranca" ? "Cobrança" : "Assiduidade"} #{d.disparo_num}
                        </span>
                        <span className="text-sm font-medium">{d.alunoNome}</span>
                        {d.alunoTelefone
                          ? <span className="text-xs text-muted-foreground">({d.alunoTelefone})</span>
                          : <span className="text-xs font-medium text-destructive">sem telefone</span>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{d.mensagem}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className={temTelefone ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                        variant={temTelefone ? "default" : "outline"}
                        disabled={!temTelefone || enviarDispatch.isPending}
                        onClick={() => enviarDispatch.mutate(d)}
                        data-testid={`button-send-${d.id}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        {isApi ? "Enviar API" : "Enviar"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => marcarEnviado.mutate(d.id)} data-testid={`button-sent-${d.id}`}>
                        ✓
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          </CardContent>
        </Card>
      )}

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
      <Dialog open={!!confirmDeleteAluno} onOpenChange={(open) => { if (!open) setConfirmDeleteAluno(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Aluno Permanentemente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{confirmDeleteAluno?.nome}</strong> permanentemente? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAluno(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteAluno) {
                  onExcluirAlunoPermanente(confirmDeleteAluno.id);
                  setConfirmDeleteAluno(null);
                }
              }}
              data-testid="button-confirm-excluir-aluno"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      {activeSection === "checkins" && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-lg">Log de Check-ins</CardTitle>
              <Button size="sm" variant="outline" onClick={() => refetchLog()} data-testid="button-refresh-checkins">
                <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
              </Button>
            </div>
          <div className="flex flex-wrap gap-2 mt-2">
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
          </CardHeader>
          <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Valor</TableHead>
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
                    <TableCell className="text-sm font-medium">
                      {c.valorCheckin > 0 ? `R$ ${c.valorCheckin.toFixed(2).replace(".", ",")}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {c.tipo === "pendente" ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-orange-600 border-orange-300 w-fit">Pendente</Badge>
                          {c.sugestaoTipo && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.sugestaoConfianca === "alta" ? "bg-green-500" : "bg-yellow-500"}`} />
                              {c.sugestaoTipo === "aula" ? "Sugestão: Aula" : "Sugestão: Day-use"}
                            </span>
                          )}
                        </div>
                      ) : c.tipo === "aula" ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Aula</Badge>
                      ) : c.tipo === "dayuse" ? (
                        <Badge variant="secondary">Day-use</Badge>
                      ) : (
                        <Badge variant="secondary">Avulso</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.tipo !== "pendente"
                        ? (c.professorNome ?? <span className="text-muted-foreground">—</span>)
                        : c.sugestaoProfessorNome
                          ? <span className="text-muted-foreground text-xs">{c.sugestaoProfessorNome}</span>
                          : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
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
                              Salvar
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAtribuindoCheckin(null)}>✕</Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAtribuindoCheckin(c.id);
                            setAtribuirForm({
                              tipo: c.tipo !== "pendente" ? c.tipo : (c.sugestaoTipo ?? "aula"),
                              professorId: c.professorId ?? c.sugestaoProfessorId ?? "",
                            });
                          }}
                          data-testid={`button-atribuir-${c.id}`}
                        >
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {logCheckins.filter((c: any) => filtroTipoLog === "todos" || c.tipo === filtroTipoLog).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum check-in encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>
      )}

      {/* ── Seção Comissões ── */}
      {activeSection === "comissoes" && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Comissões</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="space-y-6">
            {/* Resumo por professor */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Resumo por Professor</p>
              <div className="overflow-x-auto">
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
            </div>

            {/* Detalhe de comissões */}
            {todasComissoes.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico Detalhado</p>
                <div className="overflow-x-auto">
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
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              disabled={excluirComissao.isPending}
                              onClick={() => { if (confirm("Remover este registro cancelado?")) excluirComissao.mutate(c.id); }}
                              data-testid={`button-excluir-comissao-${c.id}`}
                            >
                              Excluir
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      )}

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


      {/* ── Seção Despesas ── */}
      {activeSection === "despesas" && (
        <div className="flex flex-col gap-4">
          {/* Resumo do mês */}
          {(() => {
            const despesasMes = (listaDespesas as any[]).filter((d) => d.data?.startsWith(filtroDespesaMes));
            const totalMes = despesasMes.reduce((acc, d) => acc + parseFloat(d.valor || "0"), 0);
            const porCategoria = CATEGORIAS_DESPESA.map((cat) => ({
              cat,
              total: despesasMes.filter((d) => d.categoria === cat).reduce((acc, d) => acc + parseFloat(d.valor || "0"), 0),
            })).filter((c) => c.total > 0);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Card className="sm:col-span-2 lg:col-span-1">
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total do Mês</p>
                    <p className="text-3xl font-bold text-destructive mt-1">R$ {totalMes.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{despesasMes.length} lançamento(s)</p>
                  </CardContent>
                </Card>
                {porCategoria.slice(0, 4).map((c) => (
                  <Card key={c.cat}>
                    <CardContent className="pt-5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.cat}</p>
                      <p className="text-2xl font-semibold mt-1">R$ {c.total.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          <Card>
            <CardHeader className="pb-3">
              <Button
                data-testid="button-nova-despesa"
                size="lg"
                className="w-full h-14 text-lg"
                onClick={() => {
                  const today = new Date();
                  const dd = String(today.getDate()).padStart(2, "0");
                  const mm = String(today.getMonth() + 1).padStart(2, "0");
                  const yyyy = today.getFullYear();
                  setDespesaEditando(null);
                  setFormDespesa({ categoria: "Outros", descricao: "", valor: "", data: `${yyyy}-${mm}-${dd}` });
                  setDialogDespesa(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Nova Despesa
              </Button>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Input
                  type="month"
                  value={filtroDespesaMes}
                  onChange={(e) => setFiltroDespesaMes(e.target.value)}
                  className="w-44"
                  data-testid="input-filtro-despesa-mes"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(listaDespesas as any[])
                  .filter((d) => d.data?.startsWith(filtroDespesaMes))
                  .map((d) => (
                    <TableRow key={d.id} data-testid={`row-despesa-${d.id}`}>
                      <TableCell className="text-sm whitespace-nowrap">{d.data ? new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{d.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.descricao || "-"}</TableCell>
                      <TableCell className="text-sm font-medium text-destructive">R$ {parseFloat(d.valor || "0").toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-editar-despesa-${d.id}`}
                            onClick={() => {
                              setDespesaEditando(d);
                              setFormDespesa({ categoria: d.categoria, descricao: d.descricao ?? "", valor: d.valor, data: d.data });
                              setDialogDespesa(true);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-deletar-despesa-${d.id}`}
                            onClick={() => setConfirmDeleteDespesa(d)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {(listaDespesas as any[]).filter((d) => d.data?.startsWith(filtroDespesaMes)).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma despesa registrada neste mês.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog: Adicionar / Editar Despesa */}
      <Dialog open={dialogDespesa} onOpenChange={(open) => { if (!open) { setDialogDespesa(false); setDespesaEditando(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{despesaEditando ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Categoria <span className="text-destructive">*</span></Label>
              <Select value={formDespesa.categoria} onValueChange={(v) => setFormDespesa({ ...formDespesa, categoria: v })}>
                <SelectTrigger data-testid="select-despesa-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Conta de energia — maio"
                value={formDespesa.descricao}
                onChange={(e) => setFormDespesa({ ...formDespesa, descricao: e.target.value })}
                data-testid="input-despesa-descricao"
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$) <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: 350,00"
                value={formDespesa.valor}
                onChange={(e) => setFormDespesa({ ...formDespesa, valor: e.target.value })}
                data-testid="input-despesa-valor"
              />
            </div>
            <div className="space-y-1">
              <Label>Data <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={formDespesa.data}
                onChange={(e) => setFormDespesa({ ...formDespesa, data: e.target.value })}
                data-testid="input-despesa-data"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogDespesa(false); setDespesaEditando(null); }}>Cancelar</Button>
            <Button
              disabled={!formDespesa.categoria || !formDespesa.valor || !formDespesa.data || criarDespesa.isPending || editarDespesa.isPending}
              data-testid="button-confirm-despesa"
              onClick={() => {
                const payload = { categoria: formDespesa.categoria, descricao: formDespesa.descricao || null, valor: formDespesa.valor, data: formDespesa.data };
                if (despesaEditando) {
                  editarDespesa.mutate({ id: despesaEditando.id, data: payload });
                } else {
                  criarDespesa.mutate(payload);
                }
              }}
            >
              {criarDespesa.isPending || editarDespesa.isPending ? "Salvando..." : despesaEditando ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar exclusão despesa */}
      <Dialog open={!!confirmDeleteDespesa} onOpenChange={(open) => { if (!open) setConfirmDeleteDespesa(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Despesa</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteDespesa(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deletarDespesa.isPending}
              data-testid="button-confirm-delete-despesa"
              onClick={() => { if (confirmDeleteDespesa) deletarDespesa.mutate(confirmDeleteDespesa.id); }}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seção Conta Bancária */}
      {activeSection === "conta" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
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

            {/* Chave PIX / QR Code */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                Recebimento via PIX
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de recebimento PIX</Label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conta-pixTipo"
                        value="chave"
                        checked={formContaBancaria.pixTipo === "chave"}
                        onChange={() => setFormContaBancaria({ ...formContaBancaria, pixTipo: "chave", pixQrcodeImage: "" })}
                        data-testid="radio-conta-pix-chave"
                        className="accent-primary"
                      />
                      <span className="text-sm">Chave PIX</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conta-pixTipo"
                        value="qrcode"
                        checked={formContaBancaria.pixTipo === "qrcode"}
                        onChange={() => setFormContaBancaria({ ...formContaBancaria, pixTipo: "qrcode", pixKey: "" })}
                        data-testid="radio-conta-pix-qrcode"
                        className="accent-primary"
                      />
                      <span className="text-sm">QR Code PIX</span>
                    </label>
                  </div>
                </div>

                {formContaBancaria.pixTipo === "chave" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="conta-pixKey">Chave PIX</Label>
                    <Input
                      id="conta-pixKey"
                      value={formContaBancaria.pixKey}
                      onChange={(e) => setFormContaBancaria({ ...formContaBancaria, pixKey: e.target.value })}
                      placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                      data-testid="input-conta-pixKey"
                    />
                    <p className="text-xs text-muted-foreground">Esta chave é exibida para o aluno na página de pagamento.</p>
                  </div>
                )}

                {formContaBancaria.pixTipo === "qrcode" && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Imagem do QR Code</Label>
                      <input
                        ref={contaFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUploadConta}
                        data-testid="input-conta-pix-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => contaFileInputRef.current?.click()}
                        data-testid="button-conta-upload-qrcode"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {formContaBancaria.pixQrcodeImage ? "Trocar imagem do QR Code" : "Fazer upload do QR Code"}
                      </Button>
                      {formContaBancaria.pixQrcodeImage && (
                        <div className="flex justify-center pt-2">
                          <img
                            src={formContaBancaria.pixQrcodeImage}
                            alt="QR Code PIX"
                            className="h-32 w-32 object-contain border rounded"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="conta-pixCopiacola">PIX Copia e Cola (opcional)</Label>
                      <Input
                        id="conta-pixCopiacola"
                        value={formContaBancaria.pixKey}
                        onChange={(e) => setFormContaBancaria({ ...formContaBancaria, pixKey: e.target.value })}
                        placeholder="Cole o código PIX copia e cola aqui"
                        data-testid="input-conta-pix-copiacola"
                      />
                      <p className="text-xs text-muted-foreground">Código gerado pelo seu banco para pagamento via PIX.</p>
                    </div>
                  </div>
                )}
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

          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => setActiveSection("dashboard")} data-testid="button-conta-cancelar">
              Cancelar
            </Button>
            <Button
              onClick={() => salvarContaBancaria.mutate(formContaBancaria, {
                onSuccess: () => {
                  qc.invalidateQueries({ queryKey: ["/api/finance/settings"] });
                  setActiveSection("dashboard");
                },
              })}
              disabled={salvarContaBancaria.isPending}
              data-testid="button-conta-salvar"
            >
              <Save className="h-4 w-4 mr-2" />
              {salvarContaBancaria.isPending ? "Salvando…" : "Salvar Configurações"}
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

        </div>
      </div>
    </div>
  );
}
