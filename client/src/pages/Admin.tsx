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
  LogOut, Plus, Pencil, Trash2, Users, BookOpen, Trophy, Shield, Eye,
  CheckCircle, XCircle, ArrowLeft, ClipboardList, ExternalLink, LogIn as LogInIcon,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";

interface ArenaCard {
  id: string;
  name: string;
  subscriptionPlan: string;
  gestorLogin: string;
  createdAt: string;
  stats: { professores: number; alunos: number; planos: number; alunosAtivos: number };
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

const PLAN_LABELS: Record<string, string> = { basic: "Básico", premium: "Premium", enterprise: "Enterprise" };
const PLAN_BADGE: Record<string, "secondary" | "default" | "destructive"> = {
  basic: "secondary", premium: "default", enterprise: "destructive",
};

export default function Admin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loginData, setLoginData] = useState({ login: "", senha: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [arenaForm, setArenaForm] = useState({ name: "", subscriptionPlan: "basic", gestorLogin: "", gestorSenha: "" });
  const [editingArena, setEditingArena] = useState<ArenaCard | null>(null);
  const [deletingArena, setDeletingArena] = useState<ArenaCard | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

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
      setLocation("/");
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível acessar como gestor.", variant: "destructive" }),
  });

  // ── Arenas list ───────────────────────────────────────────────────────────
  const { data: arenas = [], isLoading } = useQuery<ArenaCard[]>({
    queryKey: ["/api/admin/arenas"],
    enabled: !!adminSession?.isAdmin,
  });

  // ── Arena detail ──────────────────────────────────────────────────────────
  const { data: arenaDetail, isLoading: detailLoading } = useQuery<ArenaDetail>({
    queryKey: ["/api/admin/arenas", detailId],
    enabled: !!detailId && !!adminSession?.isAdmin,
  });

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

  function resetForm() {
    setArenaForm({ name: "", subscriptionPlan: "basic", gestorLogin: "", gestorSenha: "" });
  }

  function openEdit(arena: ArenaCard) {
    setEditingArena(arena);
    setArenaForm({ name: arena.name, subscriptionPlan: arena.subscriptionPlan, gestorLogin: arena.gestorLogin, gestorSenha: "" });
  }

  function handleSave() {
    if (editingArena) {
      editarArena.mutate({ id: editingArena.id, ...arenaForm });
    } else {
      criarArena.mutate(arenaForm);
    }
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
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <p className="text-sm">Painel Super Admin</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Login</Label>
              <Input
                placeholder="Login de administrador"
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
                placeholder="Senha"
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
              Entrar como Super Admin
            </Button>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">Login: 444 · Senha: 444</p>
              <Link href="/">
                <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-back-to-app">
                  ← Voltar ao app
                </span>
              </Link>
            </div>
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
                  <p className="text-muted-foreground text-sm mt-1">Gestor: {arenaDetail.gestorLogin}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={PLAN_BADGE[arenaDetail.subscriptionPlan]}>
                    {PLAN_LABELS[arenaDetail.subscriptionPlan] ?? arenaDetail.subscriptionPlan}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => openEdit(arenaDetail)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingArena(arenaDetail)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Excluir
                  </Button>
                </div>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {[
                  { label: "Alunos ativos", value: arenaDetail.stats.alunosAtivos, icon: <Users className="h-4 w-4" /> },
                  { label: "Total alunos", value: arenaDetail.stats.alunos, icon: <Users className="h-4 w-4" /> },
                  { label: "Professores", value: arenaDetail.stats.professores, icon: <BookOpen className="h-4 w-4" /> },
                  { label: "Planos", value: arenaDetail.stats.planos, icon: <ClipboardList className="h-4 w-4" /> },
                  { label: "Check-ins", value: arenaDetail.stats.totalCheckins, icon: <CheckCircle className="h-4 w-4" /> },
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
                </TabsList>

                <TabsContent value="alunos">
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Modalidade</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Check-ins</TableHead>
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
                          <TableHead>Limite de Check-ins</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {arenaDetail.planos.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum plano cadastrado</TableCell></TableRow>
                        ) : arenaDetail.planos.map((p) => (
                          <TableRow key={p.id} data-testid={`row-plano-${p.id}`}>
                            <TableCell className="font-medium">{p.titulo}</TableCell>
                            <TableCell>{p.valorTexto ? "Monetário" : "Por check-ins"}</TableCell>
                            <TableCell>{p.checkins > 0 ? `${p.checkins} check-ins` : p.valorTexto ?? "Ilimitado"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        {/* Edit/Delete dialogs (reused below) */}
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
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => logoutAdmin.mutate()} data-testid="button-admin-logout">
          <LogOut className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>

      <div className="max-w-6xl mx-auto p-6 pt-16">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SEVEN SPORTS
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <p className="text-sm">Painel Super Admin · Gestão de Arenas</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setEditingArena(null); setShowForm(true); }} data-testid="button-nova-arena">
            <Plus className="h-4 w-4 mr-2" />
            Nova Arena
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary opacity-80" />
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-arenas">{arenas.length}</p>
                  <p className="text-sm text-muted-foreground">Arenas cadastradas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{arenas.reduce((acc, a) => acc + a.stats.alunosAtivos, 0)}</p>
                  <p className="text-sm text-muted-foreground">Alunos ativos (total)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{arenas.reduce((acc, a) => acc + a.stats.professores, 0)}</p>
                  <p className="text-sm text-muted-foreground">Professores (total)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando arenas...</div>
        ) : arenas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Nenhuma arena cadastrada. Clique em "Nova Arena" para começar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {arenas.map((arena) => (
              <Card key={arena.id} data-testid={`card-arena-${arena.id}`} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-arena-name-${arena.id}`}>{arena.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Gestor: <span className="font-mono">{arena.gestorLogin}</span></p>
                    </div>
                    <Badge variant={PLAN_BADGE[arena.subscriptionPlan]}>
                      {PLAN_LABELS[arena.subscriptionPlan] ?? arena.subscriptionPlan}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
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
                    {/* Arena login panel link */}
                    <Link href={`/arena/${arena.id}`}>
                      <Button variant="secondary" size="sm" className="w-full" data-testid={`button-panel-arena-${arena.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Abrir Painel da Arena
                      </Button>
                    </Link>
                    {/* Impersonate as gestor */}
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
  form: { name: string; subscriptionPlan: string; gestorLogin: string; gestorSenha: string };
  setForm: (f: any) => void;
  onClose: () => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Arena" : "Nova Arena"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome da Arena</Label>
            <Input
              placeholder="Ex: Arena Beach Sports"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-arena-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Plano de Assinatura</Label>
            <Select value={form.subscriptionPlan} onValueChange={(v) => setForm({ ...form, subscriptionPlan: v })}>
              <SelectTrigger data-testid="select-subscription-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Login do Gestor</Label>
            <Input
              placeholder="Ex: gestor.arena1"
              value={form.gestorLogin}
              onChange={(e) => setForm({ ...form, gestorLogin: e.target.value })}
              data-testid="input-gestor-login"
            />
          </div>
          <div className="space-y-2">
            <Label>{editing ? "Nova Senha do Gestor (opcional)" : "Senha do Gestor"}</Label>
            <Input
              type="password"
              placeholder={editing ? "Deixe vazio para manter a atual" : "Senha"}
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
            Todos os dados — alunos, professores, planos e check-ins — serão <strong>permanentemente removidos</strong>.
            Esta ação não pode ser desfeita.
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
