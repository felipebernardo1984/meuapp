import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Shield } from "lucide-react";

interface LoginPageProps {
  onLogin: (login: string, senha: string) => void;
  error?: string;
}

export default function LoginPage({ onLogin, error }: LoginPageProps) {
  const [loginData, setLoginData] = useState({ usuario: "", senha: "" });

  const handleLogin = () => {
    onLogin(loginData.usuario, loginData.senha);
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
              SEVEN SPORTS
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sistema de Check-ins
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Login</Label>
              <Input
                id="usuario"
                placeholder="Digite seu login"
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

            {error && (
              <p className="text-sm text-destructive text-center" data-testid="text-login-error">{error}</p>
            )}

            <Button
              className="w-full h-11"
              onClick={handleLogin}
              disabled={!loginData.usuario || !loginData.senha}
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-1">
              Receba seu login e senha com seu professor ou na recepção
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            (12) 98237-3299
          </p>
          <Link href="/admin">
            <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer" data-testid="link-admin">
              <Shield className="h-3 w-3" />
              GESTÃO DE QUADRAS ESPORTIVAS
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
