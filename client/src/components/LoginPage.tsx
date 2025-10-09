import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn } from "lucide-react";

interface LoginPageProps {
  onLogin: (tipo: "aluno" | "professor" | "gestor", credentials: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loginData, setLoginData] = useState({ usuario: "", senha: "" });

  const handleLogin = () => {
    // Simular detecção automática do tipo de usuário
    // Na implementação real, isso virá do backend
    const usuario = loginData.usuario.toLowerCase();
    
    // Se contém apenas números ou é CPF, é aluno
    if (/^\d+$/.test(usuario.replace(/\D/g, ''))) {
      onLogin("aluno", { cpf: loginData.usuario, senha: loginData.senha });
    }
    // Se é "gestor" ou nome específico de gestor
    else if (usuario.includes("gestor") || usuario === "admin") {
      onLogin("gestor", { nome: loginData.usuario, senha: loginData.senha });
    }
    // Caso contrário, é professor
    else {
      onLogin("professor", { nome: loginData.usuario, senha: loginData.senha });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && loginData.usuario && loginData.senha) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Arena MUV</CardTitle>
          <CardDescription>Sistema de Check-ins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usuario">Usuário</Label>
            <Input
              id="usuario"
              placeholder="CPF, nome ou login"
              value={loginData.usuario}
              onChange={(e) =>
                setLoginData({ ...loginData, usuario: e.target.value })
              }
              onKeyPress={handleKeyPress}
              data-testid="input-username"
            />
            <p className="text-xs text-muted-foreground">
              Alunos: use seu CPF | Professores/Gestores: use seu nome
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={loginData.senha}
              onChange={(e) =>
                setLoginData({ ...loginData, senha: e.target.value })
              }
              onKeyPress={handleKeyPress}
              data-testid="input-password"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!loginData.usuario || !loginData.senha}
            data-testid="button-login"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </Button>

          <p className="text-sm text-center text-muted-foreground pt-2">
            Alunos: Não tem cadastro?{" "}
            <button className="text-primary hover:underline">
              Crie sua conta
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
