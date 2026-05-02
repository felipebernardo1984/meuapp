import { useState } from "react";
import { useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, CheckCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { Link } from "wouter";

export default function ResetSenha() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") ?? "";
  const { toast } = useToast();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [concluido, setConcluido] = useState(false);

  const confirmar_reset = useMutation({
    mutationFn: () => apiRequest("POST", "/api/password-reset/confirm", { token, novaSenha }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.ok) {
        setConcluido(true);
      } else {
        toast({ title: "Erro", description: data.message ?? "Não foi possível redefinir a senha.", variant: "destructive" });
      }
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível redefinir a senha.", variant: "destructive" }),
  });

  const senhasOk = novaSenha.length >= 4 && novaSenha === confirmar;

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/20">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <p className="text-destructive font-medium">Link inválido ou expirado.</p>
            <Link href="/"><Button variant="outline">Voltar ao início</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {concluido ? <CheckCircle className="h-6 w-6 text-green-500" /> : <KeyRound className="h-6 w-6 text-primary" />}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Seven Sports
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {concluido ? "Senha redefinida com sucesso!" : "Redefinição de senha"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {concluido ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Sua senha foi atualizada. Acesse o painel da sua arena para entrar.</p>
              <Link href="/"><Button className="w-full">Voltar ao início</Button></Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nova senha <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  data-testid="input-nova-senha"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  data-testid="input-confirmar-senha"
                />
                {confirmar && !senhasOk && (
                  <p className="text-xs text-destructive">As senhas não coincidem ou são muito curtas.</p>
                )}
              </div>
              <Button
                className="w-full"
                disabled={!senhasOk || confirmar_reset.isPending}
                onClick={() => confirmar_reset.mutate()}
                data-testid="button-confirmar-reset"
              >
                {confirmar_reset.isPending ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
