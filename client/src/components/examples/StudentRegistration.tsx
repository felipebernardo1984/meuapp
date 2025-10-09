import StudentRegistration from "../StudentRegistration";

export default function StudentRegistrationExample() {
  return (
    <StudentRegistration
      onRegister={(data) => console.log("Registrar aluno:", data)}
      onCancel={() => console.log("Cancelar cadastro")}
    />
  );
}
