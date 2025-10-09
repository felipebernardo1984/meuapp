import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, Edit, History } from "lucide-react";

interface Aluno {
  id: string;
  nome: string;
  plano: 8 | 12;
  checkinsRealizados: number;
  ultimoCheckin?: { data: string; hora: string };
  historico: Array<{ data: string; hora: string }>;
  photoUrl?: string;
}

interface TeacherDashboardProps {
  teacherName: string;
  modalidade: string;
  alunos: Aluno[];
  onCheckinManual: (alunoId: string) => void;
  onAlterarPlano: (alunoId: string, novoPlano: 8 | 12) => void;
}

export default function TeacherDashboard({
  teacherName,
  modalidade,
  alunos,
  onCheckinManual,
  onAlterarPlano,
}: TeacherDashboardProps) {
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-teacher-name">
          Professor {teacherName}
        </h1>
        <p className="text-muted-foreground">{modalidade}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alunos.map((aluno) => {
          const progresso = (aluno.checkinsRealizados / aluno.plano) * 100;
          const initials = aluno.nome
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Card
              key={aluno.id}
              className="hover-elevate"
              data-testid={`card-student-${aluno.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={aluno.photoUrl} alt={aluno.nome} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {aluno.nome}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {aluno.plano === 8 ? "1x/semana" : "2x/semana"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={progresso === 100 ? "default" : "secondary"}
                    className="text-xs shrink-0"
                  >
                    {aluno.checkinsRealizados}/{aluno.plano}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={progresso} />

                {aluno.ultimoCheckin && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {aluno.ultimoCheckin.data} às {aluno.ultimoCheckin.hora}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedAluno(aluno)}
                        data-testid={`button-view-history-${aluno.id}`}
                      >
                        <History className="h-4 w-4 mr-1" />
                        Histórico
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{aluno.nome}</DialogTitle>
                        <DialogDescription>
                          Histórico de check-ins
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {aluno.historico.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between py-2 border-b last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-secondary" />
                              <span className="text-sm">{item.data}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {item.hora}
                            </span>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    onClick={() => onCheckinManual(aluno.id)}
                    data-testid={`button-manual-checkin-${aluno.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Check-in
                  </Button>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      data-testid={`button-edit-plan-${aluno.id}`}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Alterar Plano
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Alterar Plano - {aluno.nome}</DialogTitle>
                      <DialogDescription>
                        Selecione o novo plano do aluno
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={aluno.plano === 8 ? "default" : "outline"}
                        onClick={() => onAlterarPlano(aluno.id, 8)}
                        data-testid="button-plan-8"
                      >
                        8 Check-ins
                        <br />
                        <span className="text-xs">(1x/semana)</span>
                      </Button>
                      <Button
                        variant={aluno.plano === 12 ? "default" : "outline"}
                        onClick={() => onAlterarPlano(aluno.id, 12)}
                        data-testid="button-plan-12"
                      >
                        12 Check-ins
                        <br />
                        <span className="text-xs">(2x/semana)</span>
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {alunos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum aluno cadastrado nesta modalidade
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
