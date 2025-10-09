import ManagerDashboard from "../ManagerDashboard";

export default function ManagerDashboardExample() {
  const mockAlunos = [
    {
      id: "1",
      nome: "João Silva",
      cpf: "123.456.789-00",
      modalidade: "Beach Tennis",
      plano: 8 as const,
      checkinsRealizados: 5,
      statusMensalidade: "Em dia" as const,
      ultimoCheckin: "29/12/2024",
      aprovado: true,
    },
    {
      id: "2",
      nome: "Maria Santos",
      cpf: "987.654.321-00",
      modalidade: "Beach Tennis",
      plano: 12 as const,
      checkinsRealizados: 9,
      statusMensalidade: "Em dia" as const,
      ultimoCheckin: "02/01/2025",
      aprovado: true,
    },
    {
      id: "3",
      nome: "Pedro Oliveira",
      cpf: "456.789.123-00",
      modalidade: "Vôlei de Praia",
      plano: 8 as const,
      checkinsRealizados: 3,
      statusMensalidade: "Pendente" as const,
      ultimoCheckin: "30/12/2024",
      aprovado: true,
    },
    {
      id: "4",
      nome: "Ana Costa",
      cpf: "321.654.987-00",
      modalidade: "Futevôlei",
      plano: 12 as const,
      checkinsRealizados: 1,
      statusMensalidade: "Em dia" as const,
      ultimoCheckin: "03/01/2025",
      aprovado: false,
    },
  ];

  const mockProfessores = [
    { id: "1", nome: "Carlos Mendes", modalidade: "Beach Tennis" },
    { id: "2", nome: "Fernanda Lima", modalidade: "Vôlei de Praia" },
    { id: "3", nome: "Ricardo Souza", modalidade: "Futevôlei" },
  ];

  return (
    <ManagerDashboard
      alunos={mockAlunos}
      professores={mockProfessores}
      onAprovarAluno={(id) => console.log("Aprovar aluno:", id)}
      onExportarPDF={() => console.log("Exportar PDF")}
      onExportarExcel={() => console.log("Exportar Excel")}
    />
  );
}
