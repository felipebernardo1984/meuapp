import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, UserPlus } from "lucide-react";

interface LoginPageProps {
  onLogin: (tipo: "aluno" | "professor" | "gestor", credentials: any) => void;
  onCreateAccount?: () => void;
}

export default function LoginPage({ onLogin, onCreateAccount }: LoginPageProps) {
  const [loginData, setLoginData] = useState({ usuario: "", senha: "" });

  const handleLogin = () => {
    // Detecção automática baseada nas credenciais hardcoded
    const usuario = loginData.usuario;
    const senha = loginData.senha;
    
    if (usuario === "111" && senha === "111") {
      onLogin("aluno", { cpf: usuario, senha });
    } else if (usuario === "222" && senha === "222") {
      onLogin("professor", { nome: usuario, senha });
    } else if (usuario === "333" && senha === "333") {
      onLogin("gestor", { nome: usuario, senha });
    } else {
      alert("Usuário ou senha incorretos");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && loginData.usuario && loginData.senha) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Arena MUV
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sistema de Check-ins
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">CPF ou Nome Completo</Label>
              <Input
                id="usuario"
                placeholder="Digite seu CPF ou nome"
                value={loginData.usuario}
                onChange={(e) =>
                  setLoginData({ ...loginData, usuario: e.target.value })
                }
                onKeyPress={handleKeyPress}
                data-testid="input-username"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="Digite sua senha"
                value={loginData.senha}
                onChange={(e) =>
                  setLoginData({ ...loginData, senha: e.target.value })
                }
                onKeyPress={handleKeyPress}
                data-testid="input-password"
                className="h-11"
              />
            </div>

            <Button
              className="w-full h-11"
              onClick={handleLogin}
              disabled={!loginData.usuario || !loginData.senha}
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </Button>

            <div className="pt-2 space-y-3">
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={onCreateAccount}
                data-testid="button-create-account"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Criar minha conta
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Arena MUV • Versão Beta
        </p>
      </div>
    </div>
  );
}
