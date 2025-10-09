import { useState } from "react";
import { useLocation } from "wouter";
import LoginPage from "@/components/LoginPage";
import StudentRegistration from "@/components/StudentRegistration";
import StudentDashboard from "@/components/StudentDashboard";
import TeacherDashboard from "@/components/TeacherDashboard";
import ManagerDashboard from "@/components/ManagerDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [userType, setUserType] = useState<"aluno" | "professor" | "gestor" | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const handleLogin = (tipo: "aluno" | "professor" | "gestor", credentials: any) => {
    console.log("Login:", tipo, credentials);
    setUserType(tipo);
  };

  const handleRegister = (data: any) => {
    console.log("Registrar:", data);
    setShowRegistration(false);
    setUserType("aluno");
  };

  const handleLogout = () => {
    setUserType(null);
    setShowRegistration(false);
  };

  if (showRegistration) {
    return (
      <StudentRegistration
        onRegister={handleRegister}
        onCancel={() => setShowRegistration(false)}
      />
    );
  }

  if (!userType) {
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

      {userType === "aluno" && (
        <StudentDashboard
          studentName="João Silva"
          modalidade="Beach Tennis"
          plano={8}
          checkinsRealizados={5}
          cicloInicio="15/12/2024"
          diasRestantes={12}
          statusMensalidade="Em dia"
          historico={[
            { data: "15/12/2024", hora: "18:30" },
            { data: "18/12/2024", hora: "19:00" },
            { data: "22/12/2024", hora: "18:45" },
            { data: "25/12/2024", hora: "19:15" },
            { data: "29/12/2024", hora: "18:20" },
          ]}
          onCheckin={() => console.log("Check-in realizado")}
        />
      )}

      {userType === "professor" && (
        <TeacherDashboard
          teacherName="Carlos Mendes"
          modalidade="Beach Tennis"
          alunos={[
            {
              id: "1",
              nome: "Maria Santos",
              plano: 12,
              checkinsRealizados: 9,
              ultimoCheckin: { data: "02/01/2025", hora: "18:30" },
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
            },
            {
              id: "2",
              nome: "Pedro Oliveira",
              plano: 8,
              checkinsRealizados: 3,
              ultimoCheckin: { data: "30/12/2024", hora: "19:00" },
              historico: [
                { data: "20/12/2024", hora: "18:00" },
                { data: "25/12/2024", hora: "19:00" },
                { data: "30/12/2024", hora: "19:00" },
              ],
            },
            {
              id: "3",
              nome: "Ana Costa",
              plano: 12,
              checkinsRealizados: 12,
              ultimoCheckin: { data: "03/01/2025", hora: "18:15" },
              historico: [
                { data: "15/12/2024", hora: "18:30" },
                { data: "17/12/2024", hora: "19:00" },
                { data: "19/12/2024", hora: "18:45" },
                { data: "22/12/2024", hora: "19:15" },
                { data: "24/12/2024", hora: "18:20" },
                { data: "26/12/2024", hora: "19:00" },
                { data: "29/12/2024", hora: "18:30" },
                { data: "31/12/2024", hora: "19:00" },
                { data: "01/01/2025", hora: "18:00" },
                { data: "02/01/2025", hora: "19:30" },
                { data: "03/01/2025", hora: "18:15" },
                { data: "03/01/2025", hora: "19:45" },
              ],
            },
          ]}
          onCheckinManual={(id) => console.log("Check-in manual para aluno:", id)}
          onAlterarPlano={(id, plano) =>
            console.log("Alterar plano do aluno:", id, "para", plano)
          }
        />
      )}

      {userType === "gestor" && (
        <ManagerDashboard
          alunos={[
            {
              id: "1",
              nome: "João Silva",
              cpf: "123.456.789-00",
              modalidade: "Beach Tennis",
              plano: 8,
              checkinsRealizados: 5,
              statusMensalidade: "Em dia",
              ultimoCheckin: "29/12/2024",
              aprovado: true,
            },
            {
              id: "2",
              nome: "Maria Santos",
              cpf: "987.654.321-00",
              modalidade: "Beach Tennis",
              plano: 12,
              checkinsRealizados: 9,
              statusMensalidade: "Em dia",
              ultimoCheckin: "02/01/2025",
              aprovado: true,
            },
            {
              id: "3",
              nome: "Pedro Oliveira",
              cpf: "456.789.123-00",
              modalidade: "Vôlei de Praia",
              plano: 8,
              checkinsRealizados: 3,
              statusMensalidade: "Pendente",
              ultimoCheckin: "30/12/2024",
              aprovado: true,
            },
            {
              id: "4",
              nome: "Ana Costa",
              cpf: "321.654.987-00",
              modalidade: "Futevôlei",
              plano: 12,
              checkinsRealizados: 1,
              statusMensalidade: "Em dia",
              ultimoCheckin: "03/01/2025",
              aprovado: false,
            },
          ]}
          professores={[
            { id: "1", nome: "Carlos Mendes", modalidade: "Beach Tennis" },
            { id: "2", nome: "Fernanda Lima", modalidade: "Vôlei de Praia" },
            { id: "3", nome: "Ricardo Souza", modalidade: "Futevôlei" },
          ]}
          onAprovarAluno={(id) => console.log("Aprovar aluno:", id)}
          onExportarPDF={() => console.log("Exportar PDF")}
          onExportarExcel={() => console.log("Exportar Excel")}
        />
      )}
    </>
  );
}
