import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, KeyRound } from "lucide-react";

interface PublicSettings {
  suporteEmail: string;
  suporteTelefone: string;
  suporteWhatsapp: string;
  sacTexto: string;
  resendApiKey: string;
}

export default function Login() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [loginData, setLoginData] = useState({ usuario: "", senha: "" });
  const [lembrarDados, setLembrarDados] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [esqueceuSenha, setEsqueceuSenha] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetEnviado, setResetEnviado] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const { data: publicSettings } = useQuery<PublicSettings>({
    queryKey: ["/api/platform-settings/public"],
    queryFn: () => fetch("/api/platform-settings/public").then((r) => r.json()),
  });

  const loginMutation = useMutation({
    mutationFn: async (creds: { login: string; senha: string; lembrarDados?: boolean }) => {
      const arenaRes = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(creds),
      });

      if (arenaRes.ok) {
        const data = await arenaRes.json();
        return { source: "arena" as const, data };
      }

      if (arenaRes.status === 403) {
        const data = await arenaRes.json();
        throw new Error(data.message ?? "Acesso bloqueado");
      }

      const adminRes = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: creds.login, senha: creds.senha }),
      });

      if (adminRes.ok) {
        return { source: "admin" as const, data: await adminRes.json() };
      }

      const errData = await arenaRes.json().catch(() => ({}));
      throw new Error((errData as any).message ?? "Usuário ou senha incorretos");
    },
    onSuccess: ({ source, data }) => {
      setLoginError(null);
      qc.invalidateQueries({ queryKey: ["/api/session"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/session"] });

      if (source === "admin") {
        setLocation("/admin");
        return;
      }

      if (data.arenaId) {
        setLocation(`/arena/${data.arenaId}`);
      }
    },
    onError: (error: any) => {
      setLoginError(error.message ?? "Usuário ou senha incorretos");
    },
  });

  const solicitarReset = useMutation({
    mutationFn: (email: string) =>
      fetch("/api/password-reset/request-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gestorEmail: email }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.ok) {
        setResetEnviado(true);
      } else {
        setResetMsg(data.message ?? "Erro ao solicitar redefinição.");
      }
    },
  });

  const handleLogin = () => {
    if (!loginData.usuario || !loginData.senha) return;
    loginMutation.mutate({ login: loginData.usuario, senha: loginData.senha, lembrarDados });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>

      <div className="w-full max-w-md space-y-6">
        <Card className="border-primary/20">
          <CardHeader className="text-center space-y-2 pb-2 pt-8">
            <h1
              className="text-4xl sm:text-5xl leading-none tracking-widest font-bold select-none"
              style={{
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                background: "linear-gradient(90deg, #1565C0 0%, #1E88E5 40%, #29B6F6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              SEVEN SPORTS
            </h1>
            <p className="text-sm text-muted-foreground pb-2">Informe seus dados de acesso</p>
          </CardHeader>

          <CardContent className="space-y-4 pb-8">
            {!esqueceuSenha ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="usuario">Login</Label>
                  <Input
                    id="usuario"
                    placeholder="Digite seu login"
                    value={loginData.usuario}
                    onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })}
                    onKeyDown={handleKey}
                    data-testid="input-username"
                    className="h-11"
                    autoComplete="username"
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
                    onKeyDown={handleKey}
                    data-testid="input-password"
                    className="h-11"
                    autoComplete="current-password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none" data-testid="label-lembrar">
                    <input
                      type="checkbox"
                      checked={lembrarDados}
                      onChange={(e) => setLembrarDados(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                      data-testid="checkbox-lembrar"
                    />
                    <span className="text-sm text-muted-foreground">Lembrar meus dados</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEsqueceuSenha(true)}
                    className="text-sm text-primary hover:underline"
                    data-testid="button-esqueci-senha"
                  >
                    Esqueci a senha
                  </button>
                </div>

                {loginError && (
                  <p className="text-sm text-destructive text-center" data-testid="text-login-error">
                    {loginError}
                  </p>
                )}

                <Button
                  className="w-full h-11"
                  onClick={handleLogin}
                  disabled={!loginData.usuario || !loginData.senha || loginMutation.isPending}
                  data-testid="button-login"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>

                <div className="border-t pt-4">
                  <Link
                    href="/cadastro"
                    className="flex items-center justify-center gap-2 w-full h-10 rounded-md border border-primary/30 text-sm text-primary hover:bg-primary/5 transition-colors font-medium"
                    data-testid="link-criar-conta"
                  >
                    Criar conta gratuita · 7 dias grátis
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <KeyRound className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-semibold text-sm">Redefinição de senha</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {publicSettings?.resendApiKey
                        ? "Informe o e-mail cadastrado na sua conta de gestor."
                        : "Entre em contato com o suporte informando seu login e o nome da sua arena."}
                    </p>
                  </div>

                  {resetEnviado ? (
                    <div className="w-full rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-xs text-center space-y-1">
                      <p className="font-medium text-green-700 dark:text-green-400">E-mail enviado!</p>
                      <p className="text-muted-foreground">Verifique sua caixa de entrada e siga as instruções.</p>
                    </div>
                  ) : publicSettings?.resendApiKey ? (
                    <div className="w-full space-y-2">
                      <Label className="text-xs">E-mail do gestor</Label>
                      <Input
                        type="email"
                        placeholder="gestor@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        data-testid="input-reset-email"
                        className="h-9"
                      />
                      {resetMsg && (
                        <p className="text-xs text-destructive">{resetMsg}</p>
                      )}
                      <Button
                        className="w-full h-9 text-sm"
                        disabled={!resetEmail || solicitarReset.isPending}
                        onClick={() => solicitarReset.mutate(resetEmail)}
                        data-testid="button-solicitar-reset"
                      >
                        {solicitarReset.isPending ? "Enviando..." : "Enviar link de redefinição"}
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full rounded-md bg-muted/60 px-4 py-3 text-xs text-center text-muted-foreground space-y-1.5">
                      {publicSettings?.suporteEmail && (
                        <p><span className="font-medium text-foreground">{publicSettings.suporteEmail}</span></p>
                      )}
                      {publicSettings?.suporteTelefone && (
                        <p>Tel: <span className="font-medium text-foreground">{publicSettings.suporteTelefone}</span></p>
                      )}
                      {publicSettings?.suporteWhatsapp && (
                        <p>WhatsApp: <span className="font-medium text-foreground">{publicSettings.suporteWhatsapp}</span></p>
                      )}
                      {!publicSettings?.suporteEmail && !publicSettings?.suporteTelefone && !publicSettings?.suporteWhatsapp && (
                        <p className="font-medium text-foreground">suporte@sevenclubsports.com.br</p>
                      )}
                      <p className="pt-0.5">{publicSettings?.sacTexto || "Resposta em até 1 dia útil"}</p>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setEsqueceuSenha(false); setResetEnviado(false); setResetEmail(""); setResetMsg(null); }}
                  data-testid="button-voltar-login"
                >
                  ← Voltar ao login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground font-medium tracking-wide">
          SISTEMA DE GESTÃO ESPORTIVA · SEVENCLUBSPORTS.COM.BR
        </p>
      </div>
    </div>
  );
}
