import TeacherDashboard from "../TeacherDashboard";

export default function TeacherDashboardExample() {
  const mockAlunos = [
    {
      id: "1",
      nome: "Maria Santos",
      plano: 12 as const,
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
      plano: 8 as const,
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
      plano: 12 as const,
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
  ];

  return (
    <TeacherDashboard
      teacherName="Carlos Mendes"
      modalidade="Beach Tennis"
      alunos={mockAlunos}
      onCheckinManual={(id) => console.log("Check-in manual para aluno:", id)}
      onAlterarPlano={(id, plano) =>
        console.log("Alterar plano do aluno:", id, "para", plano)
      }
    />
  );
}
