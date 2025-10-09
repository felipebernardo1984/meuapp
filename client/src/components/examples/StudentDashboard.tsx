import StudentDashboard from "../StudentDashboard";

export default function StudentDashboardExample() {
  return (
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
  );
}
