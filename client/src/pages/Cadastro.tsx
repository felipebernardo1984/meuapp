import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, ArrowLeft, Zap } from "lucide-react";

export default function Cadastro() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    email: "",
    responsavelNome: "",
    login: "",
    senha: "",
    nomeArena: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [arenaId, setArenaId] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => {
      const value = e.target.value;
      if (key === "email") return { ...f, email: value, login: value };
      if (key === "cpf") return { ...f, cpf: value, senha: value };
      return { ...f, [key]: value };
    });

  const handleBlur = (key: "email" | "cpf") => () =>
    setForm((f) => {
      if (key === "email" && !f.login) return { ...f, login: f.email };
      if (key === "cpf" && !f.senha) return { ...f, senha: f.cpf };
      return f;
    });

  const valido =
    form.cpf.trim() &&
    form.nome.trim() &&
    form.email.trim() &&
    form.login.trim() &&
    form.senha.trim() &&
    form.nomeArena.trim();

  const handleSubmit = async () => {
    if (!valido) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          nome: form.responsavelNome || form.nome,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Erro ao criar conta. Tente novamente.");
      } else {
        setArenaId(data.arenaId);
        setSucesso(true);
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && valido && !loading) handleSubmit();
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 dark:border-green-800">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Conta criada com sucesso!</h2>
              <p className="text-muted-foreground text-sm">
                Sua arena <strong>{form.nomeArena}</strong> está pronta.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                Teste grátis ativo por 5 dias
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Use o login <strong>{form.login}</strong> e sua senha para entrar.
              </p>
              <Button
                className="w-full"
                onClick={() => arenaId ? navigate(`/arena/${arenaId}`) : navigate("/")}
                data-testid="button-ir-login"
              >
                Acessar minha arena
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="border-primary/20">
          <CardHeader className="text-center space-y-1 pb-4">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SEVEN SPORTS
            </CardTitle>
            <p className="text-sm text-muted-foreground">Crie sua conta e comece a gerenciar sua arena</p>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <Badge variant="secondary" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                5 dias grátis · sem cartão
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4" onKeyPress={handleKeyPress}>
            <div className="space-y-2">
              <Label htmlFor="nomeArena">Nome da Arena</Label>
              <Input
                id="nomeArena"
                placeholder="Ex: Arena Beach Sports"
                value={form.nomeArena}
                onChange={set("nomeArena")}
                data-testid="input-nome-arena"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={set("cpf")}
                onBlur={handleBlur("cpf")}
                data-testid="input-cpf"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavelNome">Nome do responsável</Label>
              <Input
                id="responsavelNome"
                placeholder="Nome completo do responsável"
                value={form.responsavelNome}
                onChange={set("responsavelNome")}
                data-testid="input-responsavel-nome"
                className="h-11"
              />
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">
              O login será preenchido com o e-mail e a senha com o CPF.
            </p>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={set("email")}
                onBlur={handleBlur("email")}
                data-testid="input-email"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="login">Login de acesso</Label>
                <Input
                  id="login"
                  placeholder="Ex: joao123"
                  value={form.login}
                  onChange={set("login")}
                  data-testid="input-login"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={form.senha}
                  onChange={set("senha")}
                  data-testid="input-senha"
                  className="h-11"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center" data-testid="text-register-error">
                {error}
              </p>
            )}

            <Button
              className="w-full h-11"
              onClick={handleSubmit}
              disabled={!valido || loading}
              data-testid="button-criar-conta"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando sua arena…
                </>
              ) : (
                "Criar conta gratuita"
              )}
            </Button>

            <div className="text-center pt-1">
              <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-voltar-login">
                <ArrowLeft className="h-3.5 w-3.5" />
                Já tenho conta · Entrar
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ao criar sua conta você concorda com os termos de uso do Seven Sports.
        </p>
      </div>
    </div>
  );
}
