import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import ManagerDashboard from "@/components/ManagerDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface Aluno {
  id: string;
  nome: string;
  login: string;
  senha: string;
  cpf: string;
  modalidade: string;
  plano: 8 | 12;
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

export default function Home() {
  const [sessao, setSessao] = useState<SessaoAtiva>(null);
  const [alunos, setAlunos] = useState<Aluno[]>(alunosIniciais);
  const [professores, setProfessores] = useState<Professor[]>(professoresIniciais);

  const handleLogin = (login: string, senha: string) => {
    if (login === GESTOR_LOGIN && senha === GESTOR_SENHA) {
      setSessao({ tipo: "gestor" });
      return;
    }

    const professor = professores.find(
      (p) => p.login === login && p.senha === senha
    );
    if (professor) {
      setSessao({ tipo: "professor", professor });
      return;
    }

    const aluno = alunos.find(
      (a) => a.login === login && a.senha === senha && a.aprovado
    );
    if (aluno) {
      setSessao({ tipo: "aluno", aluno });
      return;
    }

    alert("Usuário ou senha incorretos");
  };

  const handleLogout = () => setSessao(null);

  const handleCadastrarAluno = (dados: {
    nome: string;
    login: string;
    senha: string;
    cpf: string;
    modalidade: string;
    plano: 8 | 12;
  }) => {
    const novoAluno: Aluno = {
      id: `a${Date.now()}`,
      nome: dados.nome,
      login: dados.login,
      senha: dados.senha,
      cpf: dados.cpf,
      modalidade: dados.modalidade,
      plano: dados.plano,
      checkinsRealizados: 0,
      historico: [],
      statusMensalidade: "Em dia",
      aprovado: true,
      ultimoCheckin: undefined,
    };
    setAlunos((prev) => [...prev, novoAluno]);
  };

  const handleCadastrarProfessor = (nome: string, modalidade: string) => {
    const novoProfessor: Professor = {
      id: `p${Date.now()}`,
      nome,
      login: nome.toLowerCase().replace(/\s+/g, "."),
      senha: "admin",
      modalidade,
    };
    setProfessores((prev) => [...prev, novoProfessor]);
    alert(
      `Professor cadastrado!\nLogin: ${novoProfessor.login}\nSenha: admin\n\nEntregue estas credenciais ao professor.`
    );
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
          ? {
              ...a,
              checkinsRealizados: a.checkinsRealizados + 1,
              historico: [...a.historico, { data: dataFormatada, hora: horaFormatada }],
              ultimoCheckin: dataFormatada,
            }
          : a
      )
    );
  };

  const handleCheckinAluno = (alunoLogin: string) => {
    const aluno = alunos.find((a) => a.login === alunoLogin);
    if (aluno) {
      const agora = new Date();
      const novoHistorico = [
        ...aluno.historico,
        {
          data: agora.toLocaleDateString("pt-BR"),
          hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ];
      const alunoAtualizado = {
        ...aluno,
        checkinsRealizados: aluno.checkinsRealizados + 1,
        historico: novoHistorico,
        ultimoCheckin: agora.toLocaleDateString("pt-BR"),
      };
      setAlunos((prev) => prev.map((a) => (a.login === alunoLogin ? alunoAtualizado : a)));
      setSessao({ tipo: "aluno", aluno: alunoAtualizado });
    }
  };

  const handleRemoverCheckin = (alunoLogin: string, index: number) => {
    const aluno = alunos.find((a) => a.login === alunoLogin);
    if (aluno) {
      const novoHistorico = aluno.historico.filter((_, i) => i !== index);
      const alunoAtualizado = {
        ...aluno,
        checkinsRealizados: Math.max(0, aluno.checkinsRealizados - 1),
        historico: novoHistorico,
        ultimoCheckin: novoHistorico.length > 0 ? novoHistorico[novoHistorico.length - 1].data : undefined,
      };
      setAlunos((prev) => prev.map((a) => (a.login === alunoLogin ? alunoAtualizado : a)));
      setSessao({ tipo: "aluno", aluno: alunoAtualizado });
    }
  };

  const handleCheckinRetroativoAluno = (alunoLogin: string, data: string, hora: string) => {
    const aluno = alunos.find((a) => a.login === alunoLogin);
    if (aluno) {
      const dataFormatada = new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
      const novoHistorico = [...aluno.historico, { data: dataFormatada, hora }]
        .sort((a, b) => {
          const [da, ma, ya] = a.data.split("/").map(Number);
          const [db, mb, yb] = b.data.split("/").map(Number);
          return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
        });
      const alunoAtualizado = {
        ...aluno,
        checkinsRealizados: aluno.checkinsRealizados + 1,
        historico: novoHistorico,
        ultimoCheckin: novoHistorico[novoHistorico.length - 1].data,
      };
      setAlunos((prev) => prev.map((a) => (a.login === alunoLogin ? alunoAtualizado : a)));
      setSessao({ tipo: "aluno", aluno: alunoAtualizado });
    }
  };

  const handleAlterarPlano = (alunoId: string, novoPlano: 8 | 12) => {
    setAlunos((prev) =>
      prev.map((a) => (a.id === alunoId ? { ...a, plano: novoPlano } : a))
    );
  };

  const handleAprovarAluno = (alunoId: string) => {
    setAlunos((prev) =>
      prev.map((a) => (a.id === alunoId ? { ...a, aprovado: true } : a))
    );
  };

  if (!sessao) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>

      {sessao.tipo === "aluno" && (
        <StudentDashboard
          studentName={sessao.aluno.nome}
          modalidade={sessao.aluno.modalidade}
          plano={sessao.aluno.plano}
          checkinsRealizados={sessao.aluno.checkinsRealizados}
          cicloInicio="15/12/2024"
          diasRestantes={12}
          statusMensalidade={sessao.aluno.statusMensalidade}
          historico={sessao.aluno.historico}
          onCheckin={() => handleCheckinAluno(sessao.aluno.login)}
          onRemoverCheckin={(index) => handleRemoverCheckin(sessao.aluno.login, index)}
          onCheckinRetroativo={(data, hora) => handleCheckinRetroativoAluno(sessao.aluno.login, data, hora)}
        />
      )}

      {sessao.tipo === "professor" && (
        <TeacherDashboard
          teacherName={sessao.professor.nome}
          modalidade={sessao.professor.modalidade}
          alunos={alunos
            .filter((a) => a.modalidade === sessao.professor.modalidade)
            .map((a) => ({
              id: a.id,
              nome: a.nome,
              plano: a.plano,
              checkinsRealizados: a.checkinsRealizados,
              ultimoCheckin: a.ultimoCheckin
                ? { data: a.ultimoCheckin, hora: "" }
                : undefined,
              historico: a.historico,
              photoUrl: a.photoUrl,
            }))}
          onCheckinManual={handleCheckinManual}
          onAlterarPlano={handleAlterarPlano}
          onCadastrarAluno={(dados) =>
            handleCadastrarAluno({
              ...dados,
              modalidade: sessao.professor.modalidade,
            })
          }
        />
      )}

      {sessao.tipo === "gestor" && (
        <ManagerDashboard
          alunos={alunos.map((a) => ({
            id: a.id,
            nome: a.nome,
            cpf: a.cpf,
            modalidade: a.modalidade,
            plano: a.plano,
            checkinsRealizados: a.checkinsRealizados,
            statusMensalidade: a.statusMensalidade,
            ultimoCheckin: a.ultimoCheckin,
            aprovado: a.aprovado,
          }))}
          professores={professores.map((p) => ({
            id: p.id,
            nome: p.nome,
            modalidade: p.modalidade,
          }))}
          onAprovarAluno={handleAprovarAluno}
          onCadastrarProfessor={handleCadastrarProfessor}
          onCadastrarAluno={handleCadastrarAluno}
          onExportarPDF={() => alert("Exportar PDF em breve")}
          onExportarExcel={() => alert("Exportar Excel em breve")}
        />
      )}
    </>
  );
}
