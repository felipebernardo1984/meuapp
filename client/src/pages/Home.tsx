import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import ManagerDashboard from "@/components/ManagerDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export interface Plano {
  id: string;
  titulo: string;
  checkins: number;
  valorTexto?: string;
}

type SessaoAtiva =
  | { tipo: "aluno"; aluno: AlunoCompleto }
  | { tipo: "professor"; professor: { id: string; nome: string; modalidade: string } }
  | { tipo: "gestor"; arenaId: string; arenaName: string }
  | null;

interface AlunoCompleto {
  id: string;
  nome: string;
  login: string;
  cpf: string;
  modalidade: string;
  planoId: string;
  planoTitulo: string;
  planoCheckins: number;
  planoValorTexto?: string;
  checkinsRealizados: number;
  historico: Array<{ id: string; data: string; hora: string }>;
  statusMensalidade: string;
  aprovado: boolean;
  ultimoCheckin?: string;
  photoUrl?: string;
  arenaId: string;
}

export default function Home() {
  const qc = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── Session ───────────────────────────────────────────────────────────────
  const { data: sessao, isLoading: sessaoLoading } = useQuery<SessaoAtiva>({
    queryKey: ["/api/session"],
    select: (data: any) => {
      if (!data?.authenticated) return null;
      if (data.tipo === "gestor") return { tipo: "gestor", arenaId: data.arenaId, arenaName: data.arenaName };
      if (data.tipo === "professor") return { tipo: "professor", professor: data.professor };
      if (data.tipo === "aluno") return { tipo: "aluno", aluno: data.aluno };
      return null;
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
  const { data: planos = [] } = useQuery<any[]>({
    queryKey: ["/api/planos"],
    enabled: !!sessao,
  });

  const { data: professores = [] } = useQuery<any[]>({
    queryKey: ["/api/professores"],
    enabled: !!sessao,
  });

  const { data: alunos = [] } = useQuery<any[]>({
    queryKey: ["/api/alunos"],
    enabled: !!sessao,
  });

  const { data: charges = [] } = useQuery<any[]>({
    queryKey: ["/api/finance/charges"],
    enabled: !!sessao && (sessao.tipo === "professor" || sessao.tipo === "gestor"),
  });

  const { data: payments = [] } = useQuery<any[]>({
    queryKey: ["/api/finance/payments"],
    enabled: !!sessao && (sessao.tipo === "professor" || sessao.tipo === "gestor"),
  });

  // ── Plan mutations ────────────────────────────────────────────────────────
  const criarPlano = useMutation({
    mutationFn: (d: { titulo: string; checkins: number; valorTexto?: string }) =>
      apiRequest("POST", "/api/planos", d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/planos"] }),
  });

  const editarPlano = useMutation({
    mutationFn: ({ id, ...d }: { id: string; titulo: string; checkins: number; valorTexto?: string }) =>
      apiRequest("PUT", `/api/planos/${id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/planos"] });
      qc.invalidateQueries({ queryKey: ["/api/alunos"] });
    },
  });

  const excluirPlano = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/planos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/planos"] }),
  });

  // ── Teacher mutations ─────────────────────────────────────────────────────
  const cadastrarProfessor = useMutation({
    mutationFn: (d: any) =>
      apiRequest("POST", "/api/professores", d).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/professores"] });
      alert(`Professor cadastrado!\nLogin: ${data.loginGerado}\nSenha: ${data.senhaGerada}\n\nEntregue estas credenciais ao professor.`);
    },
  });

  const editarProfessor = useMutation({
    mutationFn: ({ id, ...d }: any) =>
      apiRequest("PUT", `/api/professores/${id}`, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/professores"] }),
  });

  const excluirProfessor = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/professores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/professores"] }),
  });

  // ── Student mutations ─────────────────────────────────────────────────────
  const cadastrarAluno = useMutation({
    mutationFn: (d: any) =>
      apiRequest("POST", "/api/alunos", d).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/alunos"] });
    },
  });

  const editarAluno = useMutation({
    mutationFn: ({ id, ...d }: any) =>
      apiRequest("PUT", `/api/alunos/${id}`, d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });

  const excluirAluno = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/alunos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });

  const alterarPlanoAluno = useMutation({
    mutationFn: ({ alunoId, planoId }: { alunoId: string; planoId: string }) =>
      apiRequest("PUT", `/api/alunos/${alunoId}/plano`, { planoId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });

  const aprovarAluno = useMutation({
    mutationFn: (id: string) => apiRequest("PUT", `/api/alunos/${id}/aprovar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/alunos"] }),
  });

  const checkinManual = useMutation({
    mutationFn: ({ id, data, hora }: { id: string; data?: string; hora?: string }) =>
      apiRequest("POST", `/api/alunos/${id}/checkin`, { data, hora }).then((r) => r.json()),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/alunos"] });
      if (sessao?.tipo === "aluno" && sessao.aluno.id === id) {
        qc.invalidateQueries({ queryKey: ["/api/session"] });
      }
    },
  });

  const removerCheckin = useMutation({
    mutationFn: ({ id, index }: { id: string; index: number }) =>
      apiRequest("DELETE", `/api/alunos/${id}/checkin/${index}`).then((r) => r.json()),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["/api/alunos"] });
      if (sessao?.tipo === "aluno" && sessao.aluno.id === id) {
        qc.invalidateQueries({ queryKey: ["/api/session"] });
      }
    },
  });

  // ── Adapters to match component interfaces ────────────────────────────────
  const planosAdaptados: Plano[] = planos.map((p: any) => ({
    id: p.id,
    titulo: p.titulo,
    checkins: p.checkins,
    valorTexto: p.valorTexto ?? undefined,
  }));

  if (sessaoLoading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  }

  if (!sessao) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
        <LoginPage
          onLogin={(login, senha) => {
            setLoginError(null);
            loginMutation.mutate({ login, senha });
          }}
          error={loginError ?? undefined}
        />
      </>
    );
  }

  const alunoAtual =
    sessao.tipo === "aluno"
      ? alunos.find((a: any) => a.id === sessao.aluno.id) ?? sessao.aluno
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
          statusMensalidade={alunoAtual.statusMensalidade as "Em dia" | "Pendente"}
          historico={alunoAtual.historico ?? []}
          onCheckin={() => checkinManual.mutate({ id: alunoAtual.id })}
          onRemoverCheckin={(index) => removerCheckin.mutate({ id: alunoAtual.id, index })}
          onCheckinRetroativo={(data, hora) => checkinManual.mutate({ id: alunoAtual.id, data, hora })}
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
              id: a.id,
              nome: a.nome,
              cpf: a.cpf ?? undefined,
              email: a.email ?? undefined,
              telefone: a.telefone ?? undefined,
              login: a.login ?? undefined,
              modalidade: a.modalidade,
              plano: a.planoCheckins,
              planoTitulo: a.planoTitulo,
              planoId: a.planoId,
              planoValorTexto: a.planoValorTexto ?? undefined,
              checkinsRealizados: a.checkinsRealizados,
              ultimoCheckin: a.ultimoCheckin ? { data: a.ultimoCheckin, hora: "" } : undefined,
              historico: a.historico ?? [],
              photoUrl: a.photoUrl ?? undefined,
            }))}
          charges={charges}
          payments={payments}
          onCheckinManual={(alunoId, data, hora) => checkinManual.mutate({ id: alunoId, data, hora })}
          onAlterarPlano={(alunoId, planoId) => alterarPlanoAluno.mutate({ alunoId, planoId })}
          onCadastrarAluno={(dados) => cadastrarAluno.mutate(dados)}
          onEditarAluno={(alunoId, dados) => editarAluno.mutate({ id: alunoId, ...dados })}
          onExcluirAluno={(alunoId) => excluirAluno.mutate(alunoId)}
          onRemoverCheckin={(alunoId, index) => removerCheckin.mutate({ id: alunoId, index })}
        />
      )}

      {sessao.tipo === "gestor" && (
        <ManagerDashboard
          planos={planosAdaptados}
          alunos={alunos.map((a: any) => ({
            id: a.id,
            nome: a.nome,
            cpf: a.cpf,
            modalidade: a.modalidade,
            plano: a.planoCheckins,
            planoTitulo: a.planoTitulo,
            planoValorTexto: a.planoValorTexto ?? undefined,
            checkinsRealizados: a.checkinsRealizados,
            statusMensalidade: a.statusMensalidade,
            ultimoCheckin: a.ultimoCheckin ?? undefined,
            aprovado: a.aprovado,
          }))}
          professores={professores.map((p: any) => ({ id: p.id, nome: p.nome, cpf: p.cpf, email: p.email, telefone: p.telefone, login: p.login, modalidade: p.modalidade }))}
          onAprovarAluno={(id) => aprovarAluno.mutate(id)}
          onCadastrarProfessor={(dados) => cadastrarProfessor.mutate(dados)}
          onEditarProfessor={(id, dados) => editarProfessor.mutate({ id, ...dados })}
          onExcluirProfessor={(id) => excluirProfessor.mutate(id)}
          onCadastrarAluno={(dados) => cadastrarAluno.mutate(dados)}
          onCriarPlano={(titulo, checkins, valorTexto) => criarPlano.mutate({ titulo, checkins, valorTexto })}
          onEditarPlano={(id, titulo, checkins, valorTexto) => editarPlano.mutate({ id, titulo, checkins, valorTexto })}
          onExcluirPlano={(id) => excluirPlano.mutate(id)}
          onExportarPDF={() => alert("Exportar PDF em breve")}
          onExportarExcel={() => alert("Exportar Excel em breve")}
        />
      )}
    </>
  );
}
