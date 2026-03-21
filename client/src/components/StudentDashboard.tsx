import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Clock, Calendar, Trash2 } from "lucide-react";

interface StudentDashboardProps {
  studentName: string;
  photoUrl?: string;
  modalidade: string;
  plano: 8 | 12;
  checkinsRealizados: number;
  cicloInicio: string;
  diasRestantes: number;
  statusMensalidade: "Em dia" | "Pendente";
  historico: Array<{ data: string; hora: string }>;
  onCheckin: () => void;
  onRemoverCheckin: (index: number) => void;
}

export default function StudentDashboard({
  studentName,
  photoUrl,
  modalidade,
  plano,
  checkinsRealizados,
  cicloInicio,
  diasRestantes,
  statusMensalidade,
  historico,
  onCheckin,
  onRemoverCheckin,
}: StudentDashboardProps) {
  const [confirmarIndex, setConfirmarIndex] = useState<number | null>(null);

  const progresso = (checkinsRealizados / plano) * 100;
  const initials = studentName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleConfirmarRemover = () => {
    if (confirmarIndex !== null) {
      onRemoverCheckin(confirmarIndex);
      setConfirmarIndex(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={photoUrl} alt={studentName} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-student-name">
              {studentName}
            </h1>
            <p className="text-sm text-muted-foreground">{modalidade}</p>
          </div>
        </div>
        <Badge
          variant={statusMensalidade === "Em dia" ? "default" : "destructive"}
          data-testid="badge-payment-status"
        >
          {statusMensalidade}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Check-in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={onCheckin}
            data-testid="button-checkin"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Fazer Check-in
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Progresso do Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Plano: {plano === 8 ? "1x por semana" : "2x por semana"}
              </span>
              <span className="font-medium" data-testid="text-checkins-count">
                {checkinsRealizados}/{plano}
              </span>
            </div>
            <Progress value={progresso} data-testid="progress-checkins" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Início do Ciclo</p>
                <p className="text-sm font-medium" data-testid="text-cycle-start">
                  {cicloInicio}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Dias Restantes</p>
                <p className="text-sm font-medium" data-testid="text-days-remaining">
                  {diasRestantes} dias
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum check-in realizado ainda
            </p>
          ) : (
            <div className="space-y-1">
              {historico.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  data-testid={`checkin-history-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-medium">{item.data}</span>
                    {item.hora && (
                      <span className="text-xs text-muted-foreground">às {item.hora}</span>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmarIndex(index)}
                    data-testid={`button-delete-checkin-${index}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={confirmarIndex !== null}
        onOpenChange={(open) => { if (!open) setConfirmarIndex(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Check-in?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmarIndex !== null && historico[confirmarIndex] && (
                <>
                  Tem certeza que deseja remover o check-in do dia{" "}
                  <strong>{historico[confirmarIndex].data}</strong>
                  {historico[confirmarIndex].hora && (
                    <> às <strong>{historico[confirmarIndex].hora}</strong></>
                  )}
                  ? O progresso na barra será atualizado.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarRemover}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
