import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, Plus, Pencil, Trash2, Users, BookOpen, Trophy, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Arena {
  id: string;
  name: string;
  subscriptionPlan: string;
  gestorLogin: string;
  createdAt: string;
  stats: {
    professores: number;
    alunos: number;
    planos: number;
    alunosAtivos: number;
  };
}

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  premium: "Premium",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  basic: "secondary",
  premium: "default",
  enterprise: "destructive",
};

export default function Admin() {
  const qc = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ login: "", senha: "" });
  const [arenaForm, setArenaForm] = useState({
    name: "", subscriptionPlan: "basic", gestorLogin: "", gestorSenha: "",
  });
  const [editingArena, setEditingArena] = useState<Arena | null>(null);
  const [deletingArena, setDeletingArena] = useState<Arena | null>(null);
  const [showForm, setShowForm] = useState(false);

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
    },
    onError: () => setLoginError("Credenciais inválidas"),
  });

  const logoutAdmin = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/session"] }),
  });

  // ── Arenas ────────────────────────────────────────────────────────────────
  const { data: arenas = [], isLoading } = useQuery<Arena[]>({
    queryKey: ["/api/admin/arenas"],
    enabled: !!adminSession?.isAdmin,
  });

  const criarArena = useMutation({
    mutationFn: (d: typeof arenaForm) => apiRequest("POST", "/api/admin/arenas", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/arenas"] });
      setShowForm(false);
      resetForm();
    },
  });

  const editarArena = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & typeof arenaForm) =>
      apiRequest("PUT", `/api/admin/arenas/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/arenas"] });
      setEditingArena(null);
      resetForm();
    },
  });

  const excluirArena = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/arenas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/arenas"] });
      setDeletingArena(null);
    },
  });

  function resetForm() {
    setArenaForm({ name: "", subscriptionPlan: "basic", gestorLogin: "", gestorSenha: "" });
  }

  function openEdit(arena: Arena) {
    setEditingArena(arena);
    setArenaForm({
      name: arena.name,
      subscriptionPlan: arena.subscriptionPlan,
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

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!adminSession?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-bold">Painel Admin</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Gerenciamento de Arenas SaaS</p>
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
              <p className="text-sm text-destructive text-center">{loginError}</p>
            )}
            <Button
              className="w-full"
              onClick={() => loginAdmin.mutate(loginData)}
              disabled={!loginData.login || !loginData.senha || loginAdmin.isPending}
              data-testid="button-admin-login"
            >
              Entrar como Administrador
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Admin dashboard ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => logoutAdmin.mutate()} data-testid="button-admin-logout">
          <LogOut className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>

      <div className="max-w-6xl mx-auto p-6 pt-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie todas as arenas da plataforma</p>
          </div>
          <Button onClick={() => { resetForm(); setEditingArena(null); setShowForm(true); }} data-testid="button-nova-arena">
            <Plus className="h-4 w-4 mr-2" />
            Nova Arena
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{arenas.length}</p>
                  <p className="text-sm text-muted-foreground">Arenas Ativas</p>
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
                  <p className="text-sm text-muted-foreground">Alunos Ativos (Total)</p>
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
                  <p className="text-sm text-muted-foreground">Professores (Total)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Arenas Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando arenas...</div>
        ) : arenas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Nenhuma arena cadastrada ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {arenas.map((arena) => (
              <Card key={arena.id} className="relative" data-testid={`card-arena-${arena.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-arena-name-${arena.id}`}>{arena.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Gestor: {arena.gestorLogin}</p>
                    </div>
                    <Badge variant={PLAN_COLORS[arena.subscriptionPlan] as any}>
                      {PLAN_LABELS[arena.subscriptionPlan] ?? arena.subscriptionPlan}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/40 rounded-md p-2 text-center">
                      <p className="font-semibold text-lg">{arena.stats.alunosAtivos}</p>
                      <p className="text-muted-foreground text-xs">Alunos ativos</p>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2 text-center">
                      <p className="font-semibold text-lg">{arena.stats.professores}</p>
                      <p className="text-muted-foreground text-xs">Professores</p>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2 text-center">
                      <p className="font-semibold text-lg">{arena.stats.planos}</p>
                      <p className="text-muted-foreground text-xs">Planos</p>
                    </div>
                    <div className="bg-muted/40 rounded-md p-2 text-center">
                      <p className="font-semibold text-lg">{arena.stats.alunos}</p>
                      <p className="text-muted-foreground text-xs">Alunos total</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(arena)}
                      data-testid={`button-edit-arena-${arena.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => setDeletingArena(arena)}
                      data-testid={`button-delete-arena-${arena.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm || !!editingArena} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingArena(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArena ? "Editar Arena" : "Nova Arena"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Arena</Label>
              <Input
                placeholder="Ex: Arena Beach Sports"
                value={arenaForm.name}
                onChange={(e) => setArenaForm({ ...arenaForm, name: e.target.value })}
                data-testid="input-arena-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Plano de Assinatura</Label>
              <Select value={arenaForm.subscriptionPlan} onValueChange={(v) => setArenaForm({ ...arenaForm, subscriptionPlan: v })}>
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
                placeholder="Ex: gestor123"
                value={arenaForm.gestorLogin}
                onChange={(e) => setArenaForm({ ...arenaForm, gestorLogin: e.target.value })}
                data-testid="input-gestor-login"
              />
            </div>
            <div className="space-y-2">
              <Label>{editingArena ? "Nova Senha do Gestor (deixe vazio para manter)" : "Senha do Gestor"}</Label>
              <Input
                type="password"
                placeholder={editingArena ? "••••••••" : "Senha"}
                value={arenaForm.gestorSenha}
                onChange={(e) => setArenaForm({ ...arenaForm, gestorSenha: e.target.value })}
                data-testid="input-gestor-senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingArena(null); }}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={!arenaForm.name || !arenaForm.gestorLogin || (!editingArena && !arenaForm.gestorSenha) || criarArena.isPending || editarArena.isPending}
              data-testid="button-save-arena"
            >
              {editingArena ? "Salvar" : "Criar Arena"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingArena} onOpenChange={(open) => { if (!open) setDeletingArena(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Arena</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a arena <strong>{deletingArena?.name}</strong>?
              Todos os dados (alunos, professores, planos e check-ins) serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingArena && excluirArena.mutate(deletingArena.id)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-arena"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
