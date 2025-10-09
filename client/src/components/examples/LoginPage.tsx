import LoginPage from "../LoginPage";

export default function LoginPageExample() {
  return (
    <LoginPage
      onLogin={(tipo, credentials) => {
        console.log("Login detectado automaticamente:", tipo, credentials);
        alert(`Login como ${tipo}`);
      }}
    />
  );
}
