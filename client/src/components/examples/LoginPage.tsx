import LoginPage from "../LoginPage";

export default function LoginPageExample() {
  return (
    <LoginPage
      onLogin={(tipo, credentials) => {
        console.log("Login detectado automaticamente:", tipo, credentials);
        alert(`Login realizado como ${tipo}!\n\nCredenciais de teste:\n- Aluno: 111/111\n- Professor: 222/222\n- Gestor: 333/333`);
      }}
      onCreateAccount={() => {
        alert("Tela de criação de conta será implementada");
      }}
    />
  );
}
