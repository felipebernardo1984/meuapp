import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import ManagerDashboard from "@/components/ManagerDashboard";
import FinancialDashboard from "@/components/FinancialDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut } from "lucide-react";
import type { Plano } from "./Home";

export default function ArenaApp() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [loginData, setLoginData] = useState({ usuario: "", senha: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [gestorTab, setGestorTab] = useState<"dashboard" | "financeiro">("dashboard");

  // ── Arena info ────────────────────────────────────────────────────────────
  const { data: arena, isLoading: arenaLoading } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/arena", id],
    queryFn: () => fetch(`/api/arena/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  // ── Session ───────────────────────────────────────────────────────────────
  const { data: sessao, isLoading: sessaoLoading } = useQuery<any>({
    queryKey: ["/api/session"],
    select: (data: any) => {
      if (!data?.authenticated) return null;
      // Only accept session if it belongs to this arena
      if (data.arenaId !== id) return null;
      return data;
    },
  });

  const loginMutation = useMutation({
    mutationFn: (creds: { login: string; senha: string }) =>
      apiRequest("POST", "/api/login", creds).then((r) => r.json()),
    onSuccess: () => {
      setLoginError(null);
      qc.invalidateQueries({ queryKey: ["/api/session"] });
    },
    onError: () => setLoginError("Usuário ou senha incorretos"),
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/session"] });
      qc.clear();
    },
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: planos = [] } = useQuery<any[]>({ queryKey: ["/api/planos"], enabled: !!sessao });
  const { data: professores = [] } = useQuery<any[]>({ queryKey: ["/api/professores"], enabled: !!sessao });
  const { data: alunos = [] } = useQuery<any[]>({ queryKey: ["/api/alunos"], enabled: !!sessao });

  // ── Financial data ────────────────────────────────────────────────────────
  const isAluno = sessao?.tipo === "aluno";
  const isGestor = sessao?.tipo === "gestor";
  const { data: studentPayments = [] } = useQuery<any[]>({ queryKey: ["/api/finance/student/payments"], enabled: isAluno });
  const { data: studentCharges = [] } = useQuery<any[]>({ queryKey: ["/api/finance/student/charges"], enabled: isAluno });
  const { data: pixSettings } = useQuery<any>({ queryKey: ["/api/finance/settings"], enabled: !!sessao });

  // ── Plan mutations ────────────────────────────────────────────────────────
  const criarPlano = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/planos", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/planos"] }),
  });
  const editarPlano = useMutation({
    mutationFn: ({ id: planId, ...d }: any) => apiRequest("PUT", `/api/planos/${planId}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/planos"] }); qc.invalidateQueries({ queryKey: ["/api/alunos"] }); },
  });
  const excluirPlano = useMutation({
    mutationFn: (planId: string) => apiRequest("DELETE", `/api/planos/${planId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/planos"] }),
  });

  // ── Teacher mutations ─────────────────────────────────────────────────────
  const cadastrarProfessor = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/professores", d).then((r) => r.json()),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["/api/professores"] }); alert(`Professor cadastrado!\nLogin: ${data.loginGerado}\nSenha: ${data.senhaGerada}`); },
  });
  const editarProfessor = useMutation({
    mutationFn: ({ id: profId, ...d }: any) => apiRequest("PUT", `/api/professores/${profId}`, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/professores"] }),
  });
  const excluirProfessor = useMutation({
    mutationFn: (profId: string) => apiRequest("DELETE", `/api/professores/${profId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/professores"] }),
  });

  // ── Student mutations ─────────────────────────────────────────────────────
  const cadastrarAluno = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/alunos", d).then((r) => r.json()),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["/api/alunos"] }); alert(`Aluno cadastrado!\n\nLogin: ${data.loginGerado}\nSenha: ${data.senhaGerada}`); },
  });
  const alterarPlanoAluno = useMutation({
    mutationFn: ({ alunoId, planoId }: any) => apiRequest("PUT", `/api/alunos/${alunoId}/plano`, { planoId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });
  const aprovarAluno = useMutation({
    mutationFn: (alunoId: string) => apiRequest("PUT", `/api/alunos/${alunoId}/aprovar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });
  const checkinManual = useMutation({
    mutationFn: ({ id: alunoId, data, hora }: any) =>
      apiRequest("POST", `/api/alunos/${alunoId}/checkin`, { data, hora }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/alunos"] }); qc.invalidateQueries({ queryKey: ["/api/session"] }); },
  });
  const removerCheckin = useMutation({
    mutationFn: ({ id: alunoId, index }: any) =>
      apiRequest("DELETE", `/api/alunos/${alunoId}/checkin/${index}`).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/alunos"] }); qc.invalidateQueries({ queryKey: ["/api/session"] }); },
  });
  const editarAluno = useMutation({
    mutationFn: ({ id: alunoId, ...d }: any) => apiRequest("PUT", `/api/alunos/${alunoId}`, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });
  const alterarPlanoAluno2 = useMutation({
    mutationFn: ({ alunoId, planoId }: any) => apiRequest("PUT", `/api/alunos/${alunoId}/plano`, { planoId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/alunos"] }); },
  });
  const excluirAluno = useMutation({
    mutationFn: (alunoId: string) => apiRequest("DELETE", `/api/alunos/${alunoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });

  // ── Financial queries ─────────────────────────────────────────────────────
  const { data: allCharges = [] } = useQuery<any[]>({
    queryKey: ["/api/finance/charges"],
    enabled: !!sessao && ((sessao as any).tipo === "professor" || (sessao as any).tipo === "gestor"),
  });

  // ── Financial mutations ───────────────────────────────────────────────────
  const registrarPagamento = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/finance/payments", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/finance/payments"] }),
  });
  const criarCobranca = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/finance/charges", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/finance/charges"] }),
  });

  const planosAdaptados: Plano[] = planos.map((p: any) => ({
    id: p.id, titulo: p.titulo, checkins: p.checkins, valorTexto: p.valorTexto ?? undefined,
  }));

  // ── Loading ───────────────────────────────────────────────────────────────
  if (arenaLoading || sessaoLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  }

  if (!arena || (arena as any).message === "Arena não encontrada") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <p className="text-lg">Arena não encontrada.</p>
      </div>
    );
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!sessao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
        <div className="w-full max-w-md space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="text-center space-y-2 pb-6">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {arena.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Informe Seus Dados de Acesso</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="usuario">Login</Label>
                <Input
                  id="usuario"
                  placeholder="Digite seu login"
                  value={loginData.usuario}
                  onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })}
                  onKeyPress={(e) => { if (e.key === "Enter" && loginData.usuario && loginData.senha) loginMutation.mutate({ login: loginData.usuario, senha: loginData.senha }); }}
                  data-testid="input-username"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Digite sua senha"
                  value={loginData.senha}
                  onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                  onKeyPress={(e) => { if (e.key === "Enter" && loginData.usuario && loginData.senha) loginMutation.mutate({ login: loginData.usuario, senha: loginData.senha }); }}
                  data-testid="input-password"
                  className="h-11"
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive text-center" data-testid="text-login-error">{loginError}</p>
              )}
              <Button
                className="w-full h-11"
                onClick={() => loginMutation.mutate({ login: loginData.usuario, senha: loginData.senha })}
                disabled={!loginData.usuario || !loginData.senha || loginMutation.isPending}
                data-testid="button-login"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </Button>
              <p className="text-xs text-center text-muted-foreground pt-1">
                Receba seu login e senha com seu professor ou na recepção
              </p>
            </CardContent>
          </Card>

          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground font-medium tracking-wide">SISTEMA DE GESTÃO SEVENSPORTS</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const alunoAtual = sessao.tipo === "aluno"
    ? (alunos.find((a: any) => a.id === sessao.aluno?.id) ?? sessao.aluno)
    : null;

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" size="icon" onClick={() => logoutMutation.mutate()} data-testid="button-logout">
          <LogOut className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>

      {sessao.tipo === "aluno" && alunoAtual && (
        <StudentDashboard
          studentName={alunoAtual.nome}
          modalidade={alunoAtual.modalidade}
          plano={alunoAtual.planoCheckins}
          planoTitulo={alunoAtual.planoTitulo}
          planoValorTexto={alunoAtual.planoValorTexto ?? undefined}
          checkinsRealizados={alunoAtual.checkinsRealizados}
          cicloInicio="15/12/2024"
          diasRestantes={12}
          statusMensalidade={alunoAtual.statusMensalidade}
          historico={alunoAtual.historico ?? []}
          payments={studentPayments}
          charges={studentCharges}
          pixSettings={pixSettings}
          onCheckin={() => checkinManual.mutate({ id: alunoAtual.id })}
          onRemoverCheckin={(index: number) => removerCheckin.mutate({ id: alunoAtual.id, index })}
          onCheckinRetroativo={(data: string, hora: string) => checkinManual.mutate({ id: alunoAtual.id, data, hora })}
        />
      )}

      {sessao.tipo === "professor" && (
        <TeacherDashboard
          teacherName={sessao.professor.nome}
          modalidade={sessao.professor.modalidade}
          planos={planosAdaptados}
          alunos={alunos
            .filter((a: any) => a.modalidade === sessao.professor.modalidade)
            .map((a: any) => ({
              id: a.id, nome: a.nome, plano: a.planoCheckins, planoTitulo: a.planoTitulo,
              planoId: a.planoId, planoValorTexto: a.planoValorTexto ?? undefined,
              checkinsRealizados: a.checkinsRealizados,
              ultimoCheckin: a.ultimoCheckin ? { data: a.ultimoCheckin, hora: "" } : undefined,
              historico: a.historico ?? [], photoUrl: a.photoUrl ?? undefined,
            }))}
          charges={allCharges}
          onCheckinManual={(alunoId: string, data?: string, hora?: string) => checkinManual.mutate({ id: alunoId, data, hora })}
          onAlterarPlano={(alunoId: string, planoId: string) => alterarPlanoAluno.mutate({ alunoId, planoId })}
          onCadastrarAluno={(dados: any) => cadastrarAluno.mutate({ ...dados, modalidade: sessao.professor.modalidade })}
        />
      )}

      {sessao.tipo === "gestor" && (
        <>
          {gestorTab === "dashboard" && (
            <ManagerDashboard
              planos={planosAdaptados}
              alunos={alunos.map((a: any) => ({
                id: a.id, nome: a.nome, cpf: a.cpf, modalidade: a.modalidade,
                plano: a.planoCheckins, planoTitulo: a.planoTitulo,
                planoValorTexto: a.planoValorTexto ?? undefined,
                planoId: a.planoId,
                checkinsRealizados: a.checkinsRealizados,
                statusMensalidade: a.statusMensalidade,
                ultimoCheckin: a.ultimoCheckin ?? undefined,
                aprovado: a.aprovado,
                historico: a.historico ?? [],
              }))}
              professores={professores.map((p: any) => ({ id: p.id, nome: p.nome, cpf: p.cpf, email: p.email, telefone: p.telefone, login: p.login, modalidade: p.modalidade }))}
              onAprovarAluno={(alunoId: string) => aprovarAluno.mutate(alunoId)}
              onCadastrarProfessor={(dados: any) => cadastrarProfessor.mutate(dados)}
              onEditarProfessor={(profId: string, dados: any) => editarProfessor.mutate({ id: profId, ...dados })}
              onExcluirProfessor={(profId: string) => excluirProfessor.mutate(profId)}
              onCadastrarAluno={(dados: any) => cadastrarAluno.mutate(dados)}
              onCriarPlano={(titulo: string, checkins: number, valorTexto?: string) => criarPlano.mutate({ titulo, checkins, valorTexto })}
              onEditarPlano={(planId: string, titulo: string, checkins: number, valorTexto?: string) => editarPlano.mutate({ id: planId, titulo, checkins, valorTexto })}
              onExcluirPlano={(planId: string) => excluirPlano.mutate(planId)}
              onExportarPDF={() => alert("Exportar PDF em breve")}
              onExportarExcel={() => alert("Exportar Excel em breve")}
              onRegistrarPagamento={(dados: any) => registrarPagamento.mutate(dados)}
              onCriarCobranca={(dados: any) => criarCobranca.mutate(dados)}
              onIrFinanceiro={() => setGestorTab("financeiro")}
              onEditarAluno={(dados: any) => editarAluno.mutate(dados)}
              onAlterarPlanoAluno={(alunoId: string, planoId: string) => alterarPlanoAluno2.mutate({ alunoId, planoId })}
              onCheckinManual={(alunoId: string, data?: string, hora?: string) => checkinManual.mutate({ id: alunoId, data, hora })}
              onRemoverCheckin={(alunoId: string, index: number) => removerCheckin.mutate({ id: alunoId, index })}
              onExcluirAluno={(alunoId: string) => excluirAluno.mutate(alunoId)}
            />
          )}
          {gestorTab === "financeiro" && (
            <FinancialDashboard
              alunos={alunos.map((a: any) => ({ id: a.id, nome: a.nome }))}
              onVoltar={() => setGestorTab("dashboard")}
            />
          )}
        </>
      )}
    </>
  );
}
