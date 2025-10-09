import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, UserCog, Shield } from "lucide-react";

interface LoginPageProps {
  onLogin: (tipo: "aluno" | "professor" | "gestor", credentials: any) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [alunoData, setAlunoData] = useState({ cpf: "", senha: "" });
  const [professorData, setProfessorData] = useState({ nome: "", senha: "" });
  const [gestorData, setGestorData] = useState({ nome: "", senha: "" });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Arena MUV</CardTitle>
          <CardDescription>Sistema de Check-ins</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="aluno" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="aluno" data-testid="tab-student">
                <User className="h-4 w-4 mr-1" />
                Aluno
              </TabsTrigger>
              <TabsTrigger value="professor" data-testid="tab-teacher">
                <UserCog className="h-4 w-4 mr-1" />
                Professor
              </TabsTrigger>
              <TabsTrigger value="gestor" data-testid="tab-manager">
                <Shield className="h-4 w-4 mr-1" />
                Gestor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="aluno" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf-aluno">CPF</Label>
                <Input
                  id="cpf-aluno"
                  placeholder="000.000.000-00"
                  value={alunoData.cpf}
                  onChange={(e) =>
                    setAlunoData({ ...alunoData, cpf: e.target.value })
                  }
                  data-testid="input-student-cpf"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha-aluno">Senha</Label>
                <Input
                  id="senha-aluno"
                  type="password"
                  value={alunoData.senha}
                  onChange={(e) =>
                    setAlunoData({ ...alunoData, senha: e.target.value })
                  }
                  data-testid="input-student-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => onLogin("aluno", alunoData)}
                data-testid="button-login-student"
              >
                Entrar
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Não tem cadastro? Crie sua conta no primeiro acesso
              </p>
            </TabsContent>

            <TabsContent value="professor" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-professor">Nome</Label>
                <Input
                  id="nome-professor"
                  placeholder="Seu nome"
                  value={professorData.nome}
                  onChange={(e) =>
                    setProfessorData({ ...professorData, nome: e.target.value })
                  }
                  data-testid="input-teacher-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha-professor">Senha</Label>
                <Input
                  id="senha-professor"
                  type="password"
                  value={professorData.senha}
                  onChange={(e) =>
                    setProfessorData({ ...professorData, senha: e.target.value })
                  }
                  data-testid="input-teacher-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => onLogin("professor", professorData)}
                data-testid="button-login-teacher"
              >
                Entrar
              </Button>
            </TabsContent>

            <TabsContent value="gestor" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-gestor">Nome</Label>
                <Input
                  id="nome-gestor"
                  placeholder="Nome do gestor"
                  value={gestorData.nome}
                  onChange={(e) =>
                    setGestorData({ ...gestorData, nome: e.target.value })
                  }
                  data-testid="input-manager-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha-gestor">Senha</Label>
                <Input
                  id="senha-gestor"
                  type="password"
                  value={gestorData.senha}
                  onChange={(e) =>
                    setGestorData({ ...gestorData, senha: e.target.value })
                  }
                  data-testid="input-manager-password"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => onLogin("gestor", gestorData)}
                data-testid="button-login-manager"
              >
                Entrar
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
