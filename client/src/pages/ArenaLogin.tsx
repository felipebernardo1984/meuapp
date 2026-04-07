import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function ArenaLogin() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [loginData, setLoginData] = useState({ usuario: "", senha: "" });
  const [error, setError] = useState<string | null>(null);

  const { data: arena, isLoading } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/arena", id],
    queryFn: () => fetch(`/api/arena/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const loginMutation = useMutation({
    mutationFn: (creds: { login: string; senha: string }) =>
      apiRequest("POST", "/api/login", creds).then((r) => r.json()),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["/api/session"] });
      setLocation("/");
    },
    onError: () => setError("Usuário ou senha incorretos"),
  });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && loginData.usuario && loginData.senha) {
      loginMutation.mutate({ login: loginData.usuario, senha: loginData.senha });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!arena) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Arena não encontrada.</p>
        <Link href="/"><span className="text-primary underline cursor-pointer">Voltar ao início</span></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>

      <div className="w-full max-w-md space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {arena.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Sistema de Check-ins</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Login</Label>
              <Input
                id="usuario"
                placeholder="Digite seu login"
                value={loginData.usuario}
                onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })}
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
                onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
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
              onClick={() => loginMutation.mutate({ login: loginData.usuario, senha: loginData.senha })}
              disabled={!loginData.usuario || !loginData.senha || loginMutation.isPending}
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
          <Link href="/">
            <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
              ← Painel geral
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
