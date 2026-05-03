import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LogOut, Plus, Pencil, Trash2, Users, BookOpen, Trophy, Shield, Eye, EyeOff,
  CheckCircle, XCircle, ArrowLeft, ClipboardList, ExternalLink, LogIn as LogInIcon, KeyRound,
  ChevronDown, ChevronUp, DollarSign, CreditCard, History, Settings, Mail, Phone, MessageSquare, Key,
  Clock, AlertCircle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";

interface ArenaCard {
  id: string;
  name: string;
  subscriptionPlan: string;
  subscriptionValue?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: string;
  nextBillingDate?: string;
  gestorLogin: string;
  gestorSenha?: string;
  gestorNome?: string;
  gestorCpf?: string;
  gestorEmail?: string;
  gestorTelefone?: string;
  createdAt: string;
  stats: { professores: number; alunos: number; planos: number; alunosAtivos: number };
}

interface PasswordResetHistoryItem {
  id: string;
  arenaId: string | null;
  arenaName: string | null;
  gestorEmail: string | null;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

interface ArenaDetail extends ArenaCard {
  professores: Array<{ id: string; nome: string; login: string; modalidade: string }>;
  alunos: Array<{
    id: string; nome: string; login: string; cpf: string; modalidade: string;
    planoTitulo: string; planoCheckins: number; checkinsRealizados: number;
    statusMensalidade: string; aprovado: boolean; ultimoCheckin?: string;
    historico: Array<{ id: string; data: string; hora: string }>;
  }>;
  planos: Array<{ id: string; titulo: string; checkins: number; valorTexto?: string }>;
  stats: { professores: number; alunos: number; planos: number; alunosAtivos: number; totalCheckins: number };
}

interface PlatformPlan {
  planType: string;
  monthlyValue: string;
}

interface ArenaSubscriptionPayment {
  id: string;
  arenaId: string;
  arenaName: string;
  planType: string;
  amount: string;
  referenceMonth: string;
  paymentDate?: string;
  status: string;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = { basic: "Plano Básico", premium: "Plano Premium" };
const PLAN_BADGE: Record<string, "secondary" | "default" | "destructive"> = {
  basic: "secondary", premium: "default",
};
const STATUS_BADGE: Record<string, "default" | "destructive" | "secondary"> = {
  "Ativo": "default", "Em atraso": "destructive", "Suspenso": "secondary",
};

export default function Admin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ login: "", senha: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [arenaForm, setArenaForm] = useState({
    name: "", subscriptionPlan: "basic",
    gestorNome: "", gestorCpf: "", gestorEmail: "", gestorTelefone: "", gestorLogin: "", gestorSenha: "",
  });
  const [editingArena, setEditingArena] = useState<ArenaCard | null>(null);
  const [deletingArena, setDeletingArena] = useState<ArenaCard | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [credForm, setCredForm] = useState({ login: "", senha: "" });
  const [minimized, setMinimized] = useState(false);
  const [planPrices, setPlanPrices] = useState<Record<string, string>>({});
  const [editingPrices, setEditingPrices] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordHistory, setShowPasswordHistory] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [arenaSearch, setArenaSearch] = useState("");
  const [platformSettingsForm, setPlatformSettingsForm] = useState({
    suporte_email: "",
    suporte_telefone: "",
    suporte_whatsapp: "",
    sac_texto: "",
    resend_api_key: "",
    plan_nome: "",
    plan_descricao: "",
    plan_features: "",
  });

  // ── Admin session ─────────────────────────────────────────────────────────
  const { data: adminSession } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/session"],
  });

  const loginAdmin = useMutation({
    mutationFn: (d: { login: string; senha: string }) =>
      apiRequest("POST", "/api/admin/login", d).then((r) => r.json()),
    onSuccess: () => {
      setLoginError(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/session"] });
      toast({ title: "Acesso concedido", description: "Bem-vindo ao painel administrativo." });
    },
    onError: () => setLoginError("Login ou senha inválidos"),
  });

  const logoutAdmin = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/session"] });
      setDetailId(null);
    },
  });

  const impersonate = useMutation({
    mutationFn: (arenaId: string) =>
      apiRequest("POST", `/api/admin/impersonate/${arenaId}`).then((r) => r.json()),
    onSuccess: (data) => {
      qc.clear();
      toast({ title: `Entrando como gestor`, description: `Acessando "${data.arenaName}"...` });
      setLocation(`/arena/${data.arenaId}`);
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível acessar como gestor.", variant: "destructive" }),
  });

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: arenas = [], isLoading } = useQuery<ArenaCard[]>({
    queryKey: ["/api/admin/arenas"],
    enabled: !!adminSession?.isAdmin,
  });

  const { data: arenaDetail, isLoading: detailLoading } = useQuery<ArenaDetail>({
    queryKey: ["/api/admin/arenas", detailId],
    enabled: !!detailId && !!adminSession?.isAdmin,
  });

  const { data: platformPlans = [] } = useQuery<PlatformPlan[]>({
    queryKey: ["/api/admin/platform-plans"],
    enabled: !!adminSession?.isAdmin,
  });

  const { data: subscriptionPayments = [] } = useQuery<ArenaSubscriptionPayment[]>({
    queryKey: ["/api/admin/subscription-payments"],
    enabled: !!adminSession?.isAdmin,
  });

  const { data: rawPlatformSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/platform-settings"],
    enabled: !!adminSession?.isAdmin,
  });

  const { data: passwordResetHistory = [] } = useQuery<PasswordResetHistoryItem[]>({
    queryKey: ["/api/admin/password-reset-history"],
    enabled: !!adminSession?.isAdmin,
  });

  // Populate form when settings are loaded
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  if (rawPlatformSettings && !settingsLoaded) {
    setPlatformSettingsForm({
      suporte_email: rawPlatformSettings["suporte_email"] ?? "",
      suporte_telefone: rawPlatformSettings["suporte_telefone"] ?? "",
      suporte_whatsapp: rawPlatformSettings["suporte_whatsapp"] ?? "",
      sac_texto: rawPlatformSettings["sac_texto"] ?? "",
      resend_api_key: rawPlatformSettings["resend_api_key"] ?? "",
      plan_nome: rawPlatformSettings["plan_nome"] ?? "",
      plan_descricao: rawPlatformSettings["plan_descricao"] ?? "",
      plan_features: rawPlatformSettings["plan_features"] ?? "",
    });
    setSettingsLoaded(true);
  }

  // ── CRUD mutations ────────────────────────────────────────────────────────
  const criarArena = useMutation({
    mutationFn: (d: typeof arenaForm) => apiRequest("POST", "/api/admin/arenas", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/arenas"] });
      setShowForm(false);
      resetForm();
      toast({ title: "Arena criada!", description: `"${arenaForm.name}" foi adicionada com sucesso.` });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível criar a arena.", variant: "destructive" }),
  });

  const editarArena = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & typeof arenaForm) =>
      apiRequest("PUT", `/api/admin/arenas/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/arenas"] });
      if (detailId) qc.invalidateQueries({ queryKey: ["/api/admin/arenas", detailId] });
      setEditingArena(null);
      resetForm();
      toast({ title: "Arena atualizada!", description: "As informações foram salvas." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar a arena.", variant: "destructive" }),
  });

  const trocarCredenciais = useMutation({
    mutationFn: (d: { login: string; senha: string }) => apiRequest("PUT", "/api/admin/credentials", d),
    onSuccess: () => {
      setShowCredentials(false);
      setCredForm({ login: "", senha: "" });
      toast({ title: "Credenciais atualizadas!", description: "Seu novo login e senha foram salvos." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível atualizar as credenciais.", variant: "destructive" }),
  });

  const excluirArena = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/arenas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/arenas"] });
      setDeletingArena(null);
      if (detailId === deletingArena?.id) setDetailId(null);
      toast({ title: "Arena excluída", description: "A arena foi removida permanentemente." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível excluir a arena.", variant: "destructive" }),
  });

  const salvarPrecosPlanos = useMutation({
    mutationFn: async (prices: Record<string, string>) => {
      for (const [type, value] of Object.entries(prices)) {
        await apiRequest("PUT", `/api/admin/platform-plans/${type}`, { monthlyValue: value });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/platform-plans"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/arenas"] });
      setEditingPrices(false);
      toast({ title: "Valores salvos!", description: "Os valores dos planos foram atualizados." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar os valores.", variant: "destructive" }),
  });

  const salvarPlatformSettings = useMutation({
    mutationFn: (data: typeof platformSettingsForm) => apiRequest("PUT", "/api/admin/platform-settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/platform-settings"] });
      setShowSettings(false);
      setSettingsLoaded(false);
      toast({ title: "Configurações salvas!", description: "As informações de suporte foram atualizadas." });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar as configurações.", variant: "destructive" }),
  });

  function resetForm() {
    setArenaForm({ name: "", subscriptionPlan: "basic", gestorNome: "", gestorCpf: "", gestorEmail: "", gestorTelefone: "", gestorLogin: "", gestorSenha: "" });
  }

  function openEdit(arena: ArenaCard) {
    setEditingArena(arena);
    setArenaForm({
      name: arena.name,
      subscriptionPlan: arena.subscriptionPlan || "basic",
      gestorNome: arena.gestorNome ?? "",
      gestorCpf: arena.gestorCpf ?? "",
      gestorEmail: arena.gestorEmail ?? "",
      gestorTelefone: arena.gestorTelefone ?? "",
      gestorLogin: arena.gestorLogin,
      gestorSenha: "",
    });
  }

  function handleSave() {
    if (editingArena) {
      editarArena.mutate({ id: editingArena.id, ...arenaForm });
    } else {
      criarArena.mutate(arenaForm);
    }
  }

  function openPlanPrices() {
    const initial: Record<string, string> = {};
    for (const p of platformPlans) initial[p.planType] = p.monthlyValue;
    if (!initial.basic) initial.basic = "R$ 99,00";
    if (!initial.premium) initial.premium = "R$ 199,00";
    setPlanPrices(initial);
    setEditingPrices(true);
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!adminSession?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SEVEN SPORTS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Login</Label>
              <Input
                placeholder="Digite seu login"
                value={loginData.login}
                onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && loginAdmin.mutate(loginData)}
                data-testid="input-admin-login"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="Digite sua senha"
                value={loginData.senha}
                onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                onKeyPress={(e) => e.key === "Enter" && loginAdmin.mutate(loginData)}
                data-testid="input-admin-senha"
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive text-center" data-testid="text-admin-error">{loginError}</p>
            )}
            <Button
              className="w-full"
              onClick={() => loginAdmin.mutate(loginData)}
              disabled={!loginData.login || !loginData.senha || loginAdmin.isPending}
              data-testid="button-admin-login"
            >
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (detailId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <Button variant="outline" size="icon" onClick={() => logoutAdmin.mutate()} data-testid="button-admin-logout">
            <LogOut className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>

        <div className="max-w-6xl mx-auto p-6 pt-16">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setDetailId(null)} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às arenas
            </Button>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SEVEN SPORTS
            </span>
          </div>

          {detailLoading || !arenaDetail ? (
            <div className="text-center py-12 text-muted-foreground">Carregando dados da arena...</div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-detail-name">{arenaDetail.name}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={PLAN_BADGE[arenaDetail.subscriptionPlan]}>
                    {PLAN_LABELS[arenaDetail.subscriptionPlan] ?? arenaDetail.subscriptionPlan}
                  </Badge>
                  {arenaDetail.subscriptionStatus && (
                    <Badge variant={STATUS_BADGE[arenaDetail.subscriptionStatus] ?? "secondary"}>
                      {arenaDetail.subscriptionStatus}
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(arenaDetail)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingArena(arenaDetail)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Excluir
                  </Button>
                </div>
              </div>

              {/* Subscription info card */}
              <Card className="mb-6 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />Assinatura do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Plano</p>
                      <p className="font-semibold">{PLAN_LABELS[arenaDetail.subscriptionPlan] ?? arenaDetail.subscriptionPlan}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Valor mensal</p>
                      <p className="font-semibold">{arenaDetail.subscriptionValue ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Início</p>
                      <p className="font-semibold">{arenaDetail.subscriptionStartDate ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">Próx. cobrança</p>
                      <p className="font-semibold">{arenaDetail.nextBillingDate ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {[
                  { label: "Alunos ativos", value: arenaDetail.stats.alunosAtivos, icon: <Users className="h-4 w-4" /> },
                  { label: "Total alunos", value: arenaDetail.stats.alunos, icon: <Users className="h-4 w-4" /> },
                  { label: "Professores", value: arenaDetail.stats.professores, icon: <BookOpen className="h-4 w-4" /> },
                  { label: "Planos", value: arenaDetail.stats.planos, icon: <ClipboardList className="h-4 w-4" /> },
                  { label: "Check-in", value: arenaDetail.stats.totalCheckins, icon: <CheckCircle className="h-4 w-4" /> },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">{s.icon}<span className="text-xs">{s.label}</span></div>
                      <p className="text-2xl font-bold">{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Tabs defaultValue="alunos">
                <TabsList className="mb-4">
                  <TabsTrigger value="alunos" data-testid="tab-alunos">Alunos ({arenaDetail.stats.alunos})</TabsTrigger>
                  <TabsTrigger value="professores" data-testid="tab-professores">Professores ({arenaDetail.stats.professores})</TabsTrigger>
                  <TabsTrigger value="planos" data-testid="tab-planos">Planos ({arenaDetail.stats.planos})</TabsTrigger>
                  <TabsTrigger value="redefinicoessenha" data-testid="tab-reset">Redefinições de Senha</TabsTrigger>
                </TabsList>

                <TabsContent value="alunos">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Modalidade</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Mensalidade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Último Check-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arenaDetail.alunos.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum aluno cadastrado</TableCell></TableRow>
                        ) : arenaDetail.alunos.map((a) => (
                          <TableRow key={a.id} data-testid={`row-aluno-${a.id}`}>
                            <TableCell className="font-medium">{a.nome}</TableCell>
                            <TableCell>{a.modalidade}</TableCell>
                            <TableCell>{a.planoTitulo}</TableCell>
                            <TableCell>
                              {a.planoCheckins > 0
                                ? `${a.checkinsRealizados}/${a.planoCheckins}`
                                : `${a.checkinsRealizados} (livre)`}
                            </TableCell>
                            <TableCell>
                              <Badge variant={a.statusMensalidade === "Em dia" ? "default" : "destructive"}>
                                {a.statusMensalidade}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {a.aprovado
                                ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle className="h-3.5 w-3.5" />Aprovado</span>
                                : <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="h-3.5 w-3.5" />Pendente</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{a.ultimoCheckin ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="professores">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Login</TableHead>
                          <TableHead>Modalidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arenaDetail.professores.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum professor cadastrado</TableCell></TableRow>
                        ) : arenaDetail.professores.map((p) => (
                          <TableRow key={p.id} data-testid={`row-professor-${p.id}`}>
                            <TableCell className="font-medium">{p.nome}</TableCell>
                            <TableCell className="text-muted-foreground font-mono text-sm">{p.login}</TableCell>
                            <TableCell>{p.modalidade}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="planos">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Limite de Check-in</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arenaDetail.planos.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum plano cadastrado</TableCell></TableRow>
                        ) : arenaDetail.planos.map((p) => (
                          <TableRow key={p.id} data-testid={`row-plano-${p.id}`}>
                            <TableCell className="font-medium">{p.titulo}</TableCell>
                            <TableCell>{p.valorTexto ? "Monetário" : "Por check-in"}</TableCell>
                            <TableCell>{p.checkins > 0 ? `${p.checkins} check-in` : p.valorTexto ?? "Ilimitado"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="redefinicoessenha">
                  {(() => {
                    const arenaResets = [...passwordResetHistory]
                      .filter((item) => item.arenaId === detailId)
                      .reverse();
                    return (
                      <Card>
                        {arenaResets.length === 0 ? (
                          <CardContent className="text-center py-8 text-muted-foreground text-sm">
                            Nenhuma solicitação de redefinição de senha para esta arena.
                          </CardContent>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>E-mail</TableHead>
                                <TableHead>Solicitado em</TableHead>
                                <TableHead>Expira em</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {arenaResets.map((item) => {
                                const expired = new Date(item.expiresAt) < new Date();
                                return (
                                  <TableRow key={item.id} data-testid={`row-reset-detail-${item.id}`}>
                                    <TableCell className="text-sm">{item.gestorEmail ?? "—"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                      {item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                      {new Date(item.expiresAt).toLocaleString("pt-BR")}
                                    </TableCell>
                                    <TableCell>
                                      {item.used ? (
                                        <Badge variant="default" className="text-xs flex items-center gap-1 w-fit">
                                          <CheckCircle className="h-3 w-3" />Usado
                                        </Badge>
                                      ) : expired ? (
                                        <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                                          <AlertCircle className="h-3 w-3" />Expirado
                                        </Badge>
                                      ) : (
                                        <Badge variant="destructive" className="text-xs flex items-center gap-1 w-fit">
                                          <Clock className="h-3 w-3" />Pendente
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </Card>
                    );
                  })()}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <ArenaFormDialog
          open={showForm || !!editingArena}
          editing={editingArena}
          form={arenaForm}
          setForm={setArenaForm}
          onClose={() => { setShowForm(false); setEditingArena(null); resetForm(); }}
          onSave={handleSave}
          isPending={criarArena.isPending || editarArena.isPending}
        />
        <DeleteDialog
          arena={deletingArena}
          onClose={() => setDeletingArena(null)}
          onConfirm={() => deletingArena && excluirArena.mutate(deletingArena.id)}
          isPending={excluirArena.isPending}
        />
      </div>
    );
  }

  // ── Main list ─────────────────────────────────────────────────────────────
  const basicPlan = platformPlans.find((p) => p.planType === "basic");
  const premiumPlan = platformPlans.find((p) => p.planType === "premium");

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => { setSettingsLoaded(false); setShowSettings(true); }} data-testid="button-platform-settings" title="Configurações de suporte">
          <Settings className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => { setCredForm({ login: "", senha: "" }); setShowCredentials(true); }} data-testid="button-change-credentials" title="Trocar credenciais">
          <KeyRound className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => logoutAdmin.mutate()} data-testid="button-admin-logout" title="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>

      {/* Dialog trocar login e senha */}
      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Trocar Login e Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Novo Login <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Novo login de administrador"
                value={credForm.login}
                onChange={(e) => setCredForm({ ...credForm, login: e.target.value })}
                data-testid="input-new-admin-login"
              />
            </div>
            <div className="space-y-2">
              <Label>Nova Senha <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Nova senha de administrador"
                value={credForm.senha}
                onChange={(e) => setCredForm({ ...credForm, senha: e.target.value })}
                data-testid="input-new-admin-senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCredentials(false)}>Cancelar</Button>
            <Button
              onClick={() => trocarCredenciais.mutate(credForm)}
              disabled={!credForm.login || !credForm.senha || trocarCredenciais.isPending}
              data-testid="button-save-credentials"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog configurações de suporte / SAC */}
      <Dialog open={showSettings} onOpenChange={(o) => { if (!o) setShowSettings(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Configurações da Plataforma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b">Contato & Suporte</div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />E-mail de suporte</Label>
              <Input
                placeholder="suporte@sevensports.com.br"
                value={platformSettingsForm.suporte_email}
                onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, suporte_email: e.target.value })}
                data-testid="input-suporte-email"
              />
              <p className="text-xs text-muted-foreground">Exibido na tela "Esqueci a senha" das arenas</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />Telefone de suporte</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={platformSettingsForm.suporte_telefone}
                onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, suporte_telefone: e.target.value })}
                data-testid="input-suporte-telefone"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" />WhatsApp de suporte</Label>
              <Input
                placeholder="(11) 99999-9999"
                value={platformSettingsForm.suporte_whatsapp}
                onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, suporte_whatsapp: e.target.value })}
                data-testid="input-suporte-whatsapp"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do SAC / mensagem de suporte</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
                placeholder="Ex: Nossa equipe responde em até 1 dia útil via e-mail ou WhatsApp."
                value={platformSettingsForm.sac_texto}
                onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, sac_texto: e.target.value })}
                data-testid="input-sac-texto"
              />
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b pt-2">E-mail automático (Resend)</div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5" />API Key do Resend</Label>
              <Input
                type="password"
                placeholder="re_..."
                value={platformSettingsForm.resend_api_key}
                onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, resend_api_key: e.target.value })}
                data-testid="input-resend-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Opcional. Quando configurada, gestores recebem e-mail automático ao redefinir a senha.{" "}
                <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Criar conta gratuita →</a>
              </p>
            </div>

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b pt-2">Página de Vendas — Card do Plano</div>
            <div className="space-y-2">
              <Label>Nome do plano</Label>
              <Input
                placeholder="Ex: Seven Sports"
                value={platformSettingsForm.plan_nome}
                onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, plan_nome: e.target.value })}
                data-testid="input-plan-nome"
              />
              <p className="text-xs text-muted-foreground">Título exibido no card de plano da landing page.</p>
            </div>
            <div className="space-y-2">
              <Label>Descrição do plano</Label>
              <Input
                placeholder="Ex: Tudo incluído em um único plano."
                value={platformSettingsForm.plan_descricao}
                onChange={(e) => setPlatformSettingsForm({ ...platformSettingsForm, plan_descricao: e.target.value })}
                data-testid="input-plan-descricao"
              />
            </div>
            <div className="space-y-2">
              <Label>Benefícios (um por linha)</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px] resize-none"
                placeholder={"Check-ins digitais ilimitados\nGestão completa de alunos\nFinanceiro e mensalidades"}
                value={(platformSettingsForm.plan_features || "").replace(/\|/g, "\n")}
                onChange={(e) =>
                  setPlatformSettingsForm({
                    ...platformSettingsForm,
                    plan_features: e.target.value.split("\n").filter(Boolean).join("|"),
                  })
                }
                data-testid="input-plan-features"
              />
              <p className="text-xs text-muted-foreground">Cada linha vira um item com ✓ no card da landing page.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancelar</Button>
            <Button
              onClick={() => salvarPlatformSettings.mutate(platformSettingsForm)}
              disabled={salvarPlatformSettings.isPending}
              data-testid="button-save-platform-settings"
            >
              {salvarPlatformSettings.isPending ? "Salvando..." : "Salvar configurações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog definir valores dos planos */}
      <Dialog open={editingPrices} onOpenChange={setEditingPrices}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Valores dos Planos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plano Básico — Valor mensal</Label>
              <Input
                placeholder="Ex: R$ 99,00"
                value={planPrices.basic ?? ""}
                onChange={(e) => setPlanPrices({ ...planPrices, basic: e.target.value })}
                data-testid="input-price-basic"
              />
            </div>
            <div className="space-y-2">
              <Label>Plano Premium — Valor mensal</Label>
              <Input
                placeholder="Ex: R$ 199,00"
                value={planPrices.premium ?? ""}
                onChange={(e) => setPlanPrices({ ...planPrices, premium: e.target.value })}
                data-testid="input-price-premium"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPrices(false)}>Cancelar</Button>
            <Button
              onClick={() => salvarPrecosPlanos.mutate(planPrices)}
              disabled={salvarPrecosPlanos.isPending}
              data-testid="button-save-prices"
            >
              Salvar valores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-6xl mx-auto p-6 pt-16">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            SEVEN SPORTS
          </h1>

          {/* Plan pricing display */}
          <Card className="mb-4 border-primary/10">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Plano Básico:</span>
                    <span className="font-semibold text-sm">{basicPlan?.monthlyValue ?? "—"}/mês</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Plano Premium:</span>
                    <span className="font-semibold text-sm">{premiumPlan?.monthlyValue ?? "—"}/mês</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={openPlanPrices} data-testid="button-edit-prices">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar valores
                </Button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar arena por nome ou login do gestor..."
                  value={arenaSearch}
                  onChange={(e) => setArenaSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  data-testid="input-search-arenas"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
            </CardContent>
          </Card>

          {/* Nova Arena button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                size="lg"
                className="w-full h-14 text-lg"
                onClick={() => { resetForm(); setEditingArena(null); setShowForm(true); }}
                data-testid="button-nova-arena"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nova Arena
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Section header: count + toggle */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {arenaSearch
              ? `${arenas.filter(a => a.name.toLowerCase().includes(arenaSearch.toLowerCase()) || a.gestorLogin.toLowerCase().includes(arenaSearch.toLowerCase())).length} de ${arenas.length} arenas`
              : `${arenas.length} arenas`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setMinimized((m) => !m)}
            data-testid="button-minimize-arenas"
          >
            {minimized ? (
              <><ChevronDown className="h-4 w-4 mr-1" />Mostrar</>
            ) : (
              <><ChevronUp className="h-4 w-4 mr-1" />Minimizar</>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando arenas...</div>
        ) : arenas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Nenhuma arena cadastrada. Clique em "Nova Arena" para começar.
            </CardContent>
          </Card>
        ) : minimized ? (
          /* Minimized view */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Arena</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Próx. cobrança</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arenas
                  .filter((a) => {
                    const q = arenaSearch.toLowerCase();
                    return !q || a.name.toLowerCase().includes(q) || a.gestorLogin.toLowerCase().includes(q);
                  })
                  .map((arena) => (
                  <TableRow key={arena.id} data-testid={`row-arena-minimized-${arena.id}`}>
                    <TableCell className="font-medium">{arena.name}</TableCell>
                    <TableCell>
                      <Badge variant={PLAN_BADGE[arena.subscriptionPlan]}>
                        {PLAN_LABELS[arena.subscriptionPlan] ?? arena.subscriptionPlan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[arena.subscriptionStatus ?? "Ativo"] ?? "secondary"}>
                        {arena.subscriptionStatus ?? "Ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{arena.nextBillingDate ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setDetailId(arena.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(arena)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingArena(arena)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          /* Expanded view */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {arenas
              .filter((a) => {
                const q = arenaSearch.toLowerCase();
                return !q || a.name.toLowerCase().includes(q) || a.gestorLogin.toLowerCase().includes(q);
              })
              .map((arena) => (
              <Card key={arena.id} data-testid={`card-arena-${arena.id}`} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-arena-name-${arena.id}`}>{arena.name}</CardTitle>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={PLAN_BADGE[arena.subscriptionPlan]}>
                        {PLAN_LABELS[arena.subscriptionPlan] ?? arena.subscriptionPlan}
                      </Badge>
                      <Badge variant={STATUS_BADGE[arena.subscriptionStatus ?? "Ativo"] ?? "secondary"} className="text-xs">
                        {arena.subscriptionStatus ?? "Ativo"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  {/* Subscription info */}
                  <div className="bg-muted/30 rounded-md p-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor mensal</span>
                      <span className="font-medium">{arena.subscriptionValue ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Próx. cobrança</span>
                      <span className="font-medium">{arena.nextBillingDate ?? "—"}</span>
                    </div>
                  </div>
                  {/* Gestor credentials */}
                  <div className="bg-muted/20 border border-border/60 rounded-md p-2 text-xs space-y-1.5">
                    <div className="text-muted-foreground font-medium text-xs uppercase tracking-wide mb-1 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" />Acesso do Gestor
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Login</span>
                      <span className="font-mono font-semibold">{arena.gestorLogin}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Senha</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold">
                          {visiblePasswords[arena.id] ? (arena.gestorSenha ?? "—") : "••••••••"}
                        </span>
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setVisiblePasswords((v) => ({ ...v, [arena.id]: !v[arena.id] }))}
                          data-testid={`button-toggle-password-${arena.id}`}
                        >
                          {visiblePasswords[arena.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                      { label: "Alunos ativos", value: arena.stats.alunosAtivos },
                      { label: "Total alunos", value: arena.stats.alunos },
                      { label: "Professores", value: arena.stats.professores },
                      { label: "Planos", value: arena.stats.planos },
                    ].map((s) => (
                      <div key={s.label} className="bg-muted/40 rounded-md p-2 text-center">
                        <p className="font-semibold text-base">{s.value}</p>
                        <p className="text-muted-foreground text-xs">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 mt-auto">
                    <Link href={`/arena/${arena.id}`}>
                      <Button variant="secondary" size="sm" className="w-full" data-testid={`button-panel-arena-${arena.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Abrir Painel da Arena
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => impersonate.mutate(arena.id)}
                      disabled={impersonate.isPending}
                      data-testid={`button-impersonate-arena-${arena.id}`}
                    >
                      <LogInIcon className="h-3.5 w-3.5 mr-1.5" />
                      Entrar como Gestor
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1"
                        onClick={() => setDetailId(arena.id)} data-testid={`button-view-arena-${arena.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" />Ver dados
                      </Button>
                      <Button variant="outline" size="icon" className="shrink-0"
                        onClick={() => openEdit(arena)} data-testid={`button-edit-arena-${arena.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDeletingArena(arena)} data-testid={`button-delete-arena-${arena.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Histórico de pagamentos desta arena */}
                  {subscriptionPayments.filter((p) => p.arenaId === arena.id).length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <History className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Histórico de Pagamentos</span>
                      </div>
                      <div className="space-y-1.5">
                        {subscriptionPayments
                          .filter((p) => p.arenaId === arena.id)
                          .map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5" data-testid={`row-sub-payment-${p.id}`}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{p.referenceMonth}</span>
                                <span className="text-muted-foreground">{p.paymentDate ?? "—"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{p.amount}</span>
                                <Badge variant={p.status === "paid" ? "default" : "destructive"} className="text-xs px-1.5 py-0">
                                  {p.status === "paid" ? "Pago" : "Pendente"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>

      <ArenaFormDialog
        open={showForm || !!editingArena}
        editing={editingArena}
        form={arenaForm}
        setForm={setArenaForm}
        onClose={() => { setShowForm(false); setEditingArena(null); resetForm(); }}
        onSave={handleSave}
        isPending={criarArena.isPending || editarArena.isPending}
      />
      <DeleteDialog
        arena={deletingArena}
        onClose={() => setDeletingArena(null)}
        onConfirm={() => deletingArena && excluirArena.mutate(deletingArena.id)}
        isPending={excluirArena.isPending}
      />
    </div>
  );
}

// ── Reusable sub-components ───────────────────────────────────────────────────
function ArenaFormDialog({
  open, editing, form, setForm, onClose, onSave, isPending,
}: {
  open: boolean;
  editing: ArenaCard | null;
  form: { name: string; subscriptionPlan: string; gestorNome: string; gestorCpf: string; gestorEmail: string; gestorTelefone: string; gestorLogin: string; gestorSenha: string };
  setForm: (f: any) => void;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Arena" : "Nova Arena"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label>Nome da Arena <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Ex: Arena Beach Sports"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-arena-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Plano da Arena <span className="text-destructive">*</span></Label>
            <Select value={form.subscriptionPlan} onValueChange={(v) => setForm({ ...form, subscriptionPlan: v })}>
              <SelectTrigger data-testid="select-subscription-plan">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Plano Básico</SelectItem>
                <SelectItem value="premium">Plano Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome do Gestor</Label>
            <Input
              placeholder="Nome do gestor responsável"
              value={form.gestorNome}
              onChange={(e) => setForm({ ...form, gestorNome: e.target.value })}
              data-testid="input-gestor-nome"
            />
          </div>
          <div className="space-y-2">
            <Label>CPF</Label>
            <Input
              placeholder="000.000.000-00"
              value={form.gestorCpf}
              onChange={(e) => setForm({ ...form, gestorCpf: e.target.value })}
              data-testid="input-gestor-cpf"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={form.gestorEmail}
              onChange={(e) => setForm({ ...form, gestorEmail: e.target.value })}
              data-testid="input-gestor-email"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              placeholder="(00) 00000-0000"
              value={form.gestorTelefone}
              onChange={(e) => setForm({ ...form, gestorTelefone: e.target.value })}
              data-testid="input-gestor-telefone"
            />
          </div>
          <div className="space-y-2">
            <Label>Login <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={form.gestorEmail}
              onChange={(e) => setForm({ ...form, gestorEmail: e.target.value, gestorLogin: e.target.value })}
              data-testid="input-gestor-email-login"
            />
          </div>
          <div className="space-y-2">
            <Label>{editing ? "Senha (opcional)" : "Senha"} {!editing && <span className="text-destructive">*</span>}</Label>
            <Input
              type="password"
              placeholder={editing ? "Deixe vazio para manter a atual" : "Senha de acesso da arena"}
              value={form.gestorSenha}
              onChange={(e) => setForm({ ...form, gestorSenha: e.target.value })}
              data-testid="input-gestor-senha"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={onSave}
            disabled={!form.name || !form.gestorLogin || (!editing && !form.gestorSenha) || isPending}
            data-testid="button-save-arena"
          >
            {editing ? "Salvar alterações" : "Criar Arena"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  arena, onClose, onConfirm, isPending,
}: {
  arena: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog open={!!arena} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Arena</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a arena <strong>{arena?.name}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
            data-testid="button-confirm-delete-arena"
          >
            {isPending ? "Excluindo..." : "Excluir Arena"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
