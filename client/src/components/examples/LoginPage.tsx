import LoginPage from "../LoginPage";

export default function LoginPageExample() {
  return (
    <LoginPage
      onLogin={(tipo, credentials) =>
        console.log("Login:", tipo, credentials)
      }
    />
  );
}
