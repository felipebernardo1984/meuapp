import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import ManagerDashboard from "@/components/ManagerDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export interface Plano {
  id: string;
  titulo: string;
  checkins: number;       // 0 = plano monetário (sem contagem de check-ins)
  valorTexto?: string;    // exibido quando checkins = 0, ex: "R$ 140,00"
}

interface Aluno {
  id: string;
  nome: string;
  login: string;
  senha: string;
  cpf: string;
  modalidade: string;
  planoId: string;
  planoTitulo: string;
  plano: number;
  planoValorTexto?: string;
  checkinsRealizados: number;
  historico: Array<{ data: string; hora: string }>;
  statusMensalidade: "Em dia" | "Pendente";
  aprovado: boolean;
  ultimoCheckin?: string;
  photoUrl?: string;
}

interface Professor {
  id: string;
  nome: string;
  login: string;
  senha: string;
  modalidade: string;
}

const GESTOR_LOGIN = "333";
const GESTOR_SENHA = "333";

const planosIniciais: Plano[] = [
  { id: "pl1", titulo: "1x por semana", checkins: 8 },
  { id: "pl2", titulo: "2x por semana", checkins: 12 },
  { id: "pl3", titulo: "Mensalista", checkins: 0, valorTexto: "R$ 140,00" },
];

const professoresIniciais: Professor[] = [
  { id: "p1", nome: "Carlos Mendes", login: "222", senha: "222", modalidade: "Beach Tennis" },
  { id: "p2", nome: "Fernanda Lima", login: "fernanda", senha: "admin", modalidade: "Vôlei de Praia" },
  { id: "p3", nome: "Ricardo Souza", login: "ricardo", senha: "admin", modalidade: "Futevôlei" },
];

const alunosIniciais: Aluno[] = [
  {
    id: "a1",
    nome: "Maria Santos",
    login: "111",
    senha: "111",
    cpf: "987.654.321-00",
    modalidade: "Beach Tennis",
    planoId: "pl2",
    planoTitulo: "2x por semana",
    plano: 12,
    checkinsRealizados: 9,
    historico: [
      { data: "15/12/2024", hora: "18:30" },
      { data: "18/12/2024", hora: "19:00" },
      { data: "22/12/2024", hora: "18:45" },
      { data: "25/12/2024", hora: "19:15" },
      { data: "29/12/2024", hora: "18:20" },
      { data: "30/12/2024", hora: "18:00" },
      { data: "31/12/2024", hora: "17:45" },
      { data: "01/01/2025", hora: "19:30" },
      { data: "02/01/2025", hora: "18:30" },
    ],
    statusMensalidade: "Em dia",
    aprovado: true,
    ultimoCheckin: "02/01/2025",
  },
  {
    id: "a2",
    nome: "Pedro Oliveira",
    login: "pedro",
    senha: "admin",
    cpf: "456.789.123-00",
    modalidade: "Vôlei de Praia",
    planoId: "pl1",
    planoTitulo: "1x por semana",
    plano: 8,
    checkinsRealizados: 3,
    historico: [
      { data: "20/12/2024", hora: "18:00" },
      { data: "25/12/2024", hora: "19:00" },
      { data: "30/12/2024", hora: "19:00" },
    ],
    statusMensalidade: "Pendente",
    aprovado: true,
    ultimoCheckin: "30/12/2024",
  },
];

type SessaoAtiva =
  | { tipo: "aluno"; aluno: Aluno }
  | { tipo: "professor"; professor: Professor }
  | { tipo: "gestor" }
  | null;

function gerarLogin(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".");
}

export default function Home() {
  const [sessao, setSessao] = useState<SessaoAtiva>(null);
  const [alunos, setAlunos] = useState<Aluno[]>(alunosIniciais);
  const [professores, setProfessores] = useState<Professor[]>(professoresIniciais);
  const [planos, setPlanos] = useState<Plano[]>(planosIniciais);

  const handleLogin = (login: string, senha: string) => {
    if (login === GESTOR_LOGIN && senha === GESTOR_SENHA) {
      setSessao({ tipo: "gestor" });
      return;
    }
    const professor = professores.find((p) => p.login === login && p.senha === senha);
    if (professor) { setSessao({ tipo: "professor", professor }); return; }
    const aluno = alunos.find((a) => a.login === login && a.senha === senha && a.aprovado);
    if (aluno) { setSessao({ tipo: "aluno", aluno }); return; }
    alert("Usuário ou senha incorretos");
  };

  const handleLogout = () => setSessao(null);

  // ── Planos ──────────────────────────────────────────────────────────────
  const handleCriarPlano = (titulo: string, checkins: number, valorTexto?: string) => {
    setPlanos((prev) => [...prev, { id: `pl${Date.now()}`, titulo, checkins, valorTexto }]);
  };

  const handleEditarPlano = (id: string, titulo: string, checkins: number, valorTexto?: string) => {
    setPlanos((prev) => prev.map((p) => p.id === id ? { ...p, titulo, checkins, valorTexto } : p));
    setAlunos((prev) =>
      prev.map((a) =>
        a.planoId === id
          ? { ...a, planoTitulo: titulo, plano: checkins, planoValorTexto: valorTexto }
          : a
      )
    );
  };

  const handleExcluirPlano = (id: string) => {
    setPlanos((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Professores ──────────────────────────────────────────────────────────
  const handleCadastrarProfessor = (nome: string, modalidade: string) => {
    const login = gerarLogin(nome);
    const novoProfessor: Professor = { id: `p${Date.now()}`, nome, login, senha: "admin", modalidade };
    setProfessores((prev) => [...prev, novoProfessor]);
    alert(`Professor cadastrado!\nLogin: ${login}\nSenha: admin\n\nEntregue estas credenciais ao professor.`);
  };

  const handleEditarProfessor = (id: string, nome: string, modalidade: string) => {
    setProfessores((prev) => prev.map((p) => p.id === id ? { ...p, nome, modalidade } : p));
  };

  const handleExcluirProfessor = (id: string) => {
    setProfessores((prev) => prev.filter((p) => p.id !== id));
  };

  // ── Alunos ───────────────────────────────────────────────────────────────
  const handleCadastrarAluno = (dados: {
    nome: string;
    cpf: string;
    modalidade: string;
    planoId: string;
  }) => {
    const plano = planos.find((p) => p.id === dados.planoId);
    if (!plano) return;
    const login = gerarLogin(dados.nome);
    const novoAluno: Aluno = {
      id: `a${Date.now()}`,
      nome: dados.nome,
      login,
      senha: dados.cpf,
      cpf: dados.cpf,
      modalidade: dados.modalidade,
      planoId: plano.id,
      planoTitulo: plano.titulo,
      plano: plano.checkins,
      planoValorTexto: plano.valorTexto,
      checkinsRealizados: 0,
      historico: [],
      statusMensalidade: "Em dia",
      aprovado: true,
      ultimoCheckin: undefined,
    };
    setAlunos((prev) => [...prev, novoAluno]);
    alert(`Aluno cadastrado!\n\nLogin: ${login}\nSenha: ${dados.cpf}\n\nEntregue estas credenciais ao aluno.`);
  };

  const handleCheckinManual = (alunoId: string, data?: string, hora?: string) => {
    const agora = new Date();
    const dataFormatada = data
      ? new Date(data + "T12:00:00").toLocaleDateString("pt-BR")
      : agora.toLocaleDateString("pt-BR");
    const horaFormatada = hora || agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setAlunos((prev) =>
      prev.map((a) =>
        a.id === alunoId
          ? { ...a, checkinsRealizados: a.checkinsRealizados + 1, historico: [...a.historico, { data: dataFormatada, hora: horaFormatada }], ultimoCheckin: dataFormatada }
          : a
      )
    );
  };

  const handleCheckinAluno = (alunoLogin: string) => {
    const aluno = alunos.find((a) => a.login === alunoLogin);
    if (aluno) {
      const agora = new Date();
      const novoHistorico = [...aluno.historico, { data: agora.toLocaleDateString("pt-BR"), hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }];
      const alunoAtualizado = { ...aluno, checkinsRealizados: aluno.checkinsRealizados + 1, historico: novoHistorico, ultimoCheckin: agora.toLocaleDateString("pt-BR") };
      setAlunos((prev) => prev.map((a) => (a.login === alunoLogin ? alunoAtualizado : a)));
      setSessao({ tipo: "aluno", aluno: alunoAtualizado });
    }
  };

  const handleRemoverCheckin = (alunoLogin: string, index: number) => {
    const aluno = alunos.find((a) => a.login === alunoLogin);
    if (aluno) {
      const novoHistorico = aluno.historico.filter((_, i) => i !== index);
      const alunoAtualizado = { ...aluno, checkinsRealizados: Math.max(0, aluno.checkinsRealizados - 1), historico: novoHistorico, ultimoCheckin: novoHistorico.length > 0 ? novoHistorico[novoHistorico.length - 1].data : undefined };
      setAlunos((prev) => prev.map((a) => (a.login === alunoLogin ? alunoAtualizado : a)));
      setSessao({ tipo: "aluno", aluno: alunoAtualizado });
    }
  };

  const handleCheckinRetroativoAluno = (alunoLogin: string, data: string, hora: string) => {
    const aluno = alunos.find((a) => a.login === alunoLogin);
    if (aluno) {
      const dataFormatada = new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
      const novoHistorico = [...aluno.historico, { data: dataFormatada, hora }].sort((a, b) => {
        const [da, ma, ya] = a.data.split("/").map(Number);
        const [db, mb, yb] = b.data.split("/").map(Number);
        return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
      });
      const alunoAtualizado = { ...aluno, checkinsRealizados: aluno.checkinsRealizados + 1, historico: novoHistorico, ultimoCheckin: novoHistorico[novoHistorico.length - 1].data };
      setAlunos((prev) => prev.map((a) => (a.login === alunoLogin ? alunoAtualizado : a)));
      setSessao({ tipo: "aluno", aluno: alunoAtualizado });
    }
  };

  const handleAlterarPlano = (alunoId: string, planoId: string) => {
    const plano = planos.find((p) => p.id === planoId);
    if (plano) {
      setAlunos((prev) =>
        prev.map((a) =>
          a.id === alunoId
            ? { ...a, planoId: plano.id, planoTitulo: plano.titulo, plano: plano.checkins, planoValorTexto: plano.valorTexto }
            : a
        )
      );
    }
  };

  const handleAprovarAluno = (alunoId: string) => {
    setAlunos((prev) => prev.map((a) => (a.id === alunoId ? { ...a, aprovado: true } : a)));
  };

  if (!sessao) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" size="icon" onClick={handleLogout} data-testid="button-logout">
          <LogOut className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>

      {sessao.tipo === "aluno" && (() => {
        const alunoAtual = alunos.find((a) => a.login === sessao.aluno.login) ?? sessao.aluno;
        return (
          <StudentDashboard
            studentName={alunoAtual.nome}
            modalidade={alunoAtual.modalidade}
            plano={alunoAtual.plano}
            planoTitulo={alunoAtual.planoTitulo}
            planoValorTexto={alunoAtual.planoValorTexto}
            checkinsRealizados={alunoAtual.checkinsRealizados}
            cicloInicio="15/12/2024"
            diasRestantes={12}
            statusMensalidade={alunoAtual.statusMensalidade}
            historico={alunoAtual.historico}
            onCheckin={() => handleCheckinAluno(alunoAtual.login)}
            onRemoverCheckin={(index) => handleRemoverCheckin(alunoAtual.login, index)}
            onCheckinRetroativo={(data, hora) => handleCheckinRetroativoAluno(alunoAtual.login, data, hora)}
          />
        );
      })()}

      {sessao.tipo === "professor" && (
        <TeacherDashboard
          teacherName={sessao.professor.nome}
          modalidade={sessao.professor.modalidade}
          planos={planos}
          alunos={alunos
            .filter((a) => a.modalidade === sessao.professor.modalidade)
            .map((a) => ({
              id: a.id,
              nome: a.nome,
              plano: a.plano,
              planoTitulo: a.planoTitulo,
              planoId: a.planoId,
              planoValorTexto: a.planoValorTexto,
              checkinsRealizados: a.checkinsRealizados,
              ultimoCheckin: a.ultimoCheckin ? { data: a.ultimoCheckin, hora: "" } : undefined,
              historico: a.historico,
              photoUrl: a.photoUrl,
            }))}
          onCheckinManual={handleCheckinManual}
          onAlterarPlano={handleAlterarPlano}
          onCadastrarAluno={(dados) => handleCadastrarAluno({ ...dados, modalidade: sessao.professor.modalidade })}
        />
      )}

      {sessao.tipo === "gestor" && (
        <ManagerDashboard
          planos={planos}
          alunos={alunos.map((a) => ({
            id: a.id,
            nome: a.nome,
            cpf: a.cpf,
            modalidade: a.modalidade,
            plano: a.plano,
            planoTitulo: a.planoTitulo,
            planoValorTexto: a.planoValorTexto,
            checkinsRealizados: a.checkinsRealizados,
            statusMensalidade: a.statusMensalidade,
            ultimoCheckin: a.ultimoCheckin,
            aprovado: a.aprovado,
          }))}
          professores={professores.map((p) => ({ id: p.id, nome: p.nome, modalidade: p.modalidade }))}
          onAprovarAluno={handleAprovarAluno}
          onCadastrarProfessor={handleCadastrarProfessor}
          onEditarProfessor={handleEditarProfessor}
          onExcluirProfessor={handleExcluirProfessor}
          onCadastrarAluno={handleCadastrarAluno}
          onCriarPlano={handleCriarPlano}
          onEditarPlano={handleEditarPlano}
          onExcluirPlano={handleExcluirPlano}
          onExportarPDF={() => alert("Exportar PDF em breve")}
          onExportarExcel={() => alert("Exportar Excel em breve")}
        />
      )}
    </>
  );
}
