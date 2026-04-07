import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, Calendar, Trash2, CalendarClock, QrCode, Receipt, DollarSign } from "lucide-react";

interface Payment {
  id: string;
  referenceMonth: string;
  amount: string;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
}

interface Charge {
  id: string;
  description: string;
  amount: string;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
}

interface PixSettings {
  receiverName?: string | null;
  pixKey?: string | null;
  pixQrcodeImage?: string | null;
}

interface StudentDashboardProps {
  studentName: string;
  photoUrl?: string;
  modalidade: string;
  plano: number;
  planoTitulo: string;
  planoValorTexto?: string;
  checkinsRealizados: number;
  cicloInicio: string;
  diasRestantes: number;
  statusMensalidade: "Em dia" | "Pendente";
  historico: Array<{ data: string; hora: string }>;
  payments?: Payment[];
  charges?: Charge[];
  pixSettings?: PixSettings;
  onCheckin: () => void;
  onRemoverCheckin: (index: number) => void;
  onCheckinRetroativo: (data: string, hora: string) => void;
}

function paymentStatusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pago</Badge>;
  if (status === "overdue") return <Badge variant="destructive">Atrasado</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
}

export default function StudentDashboard({
  studentName,
  photoUrl,
  modalidade,
  plano,
  planoTitulo,
  planoValorTexto,
  checkinsRealizados,
  cicloInicio,
  diasRestantes,
  statusMensalidade,
  historico,
  payments = [],
  charges = [],
  pixSettings,
  onCheckin,
  onRemoverCheckin,
  onCheckinRetroativo,
}: StudentDashboardProps) {
  const [confirmarIndex, setConfirmarIndex] = useState<number | null>(null);
  const [dialogRetroativo, setDialogRetroativo] = useState(false);
  const [dataRetroativa, setDataRetroativa] = useState("");
  const [horaRetroativa, setHoraRetroativa] = useState("");
  const [dialogPix, setDialogPix] = useState(false);
  const [pixItem, setPixItem] = useState<{ amount: string; description: string } | null>(null);

  const abrirRetroativo = () => {
    const hoje = new Date().toISOString().split("T")[0];
    const horaAtual = new Date().toTimeString().slice(0, 5);
    setDataRetroativa(hoje);
    setHoraRetroativa(horaAtual);
    setDialogRetroativo(true);
  };

  const handleConfirmarRetroativo = () => {
    if (dataRetroativa && horaRetroativa) {
      onCheckinRetroativo(dataRetroativa, horaRetroativa);
      setDialogRetroativo(false);
    }
  };

  const temCheckins = plano > 0;
  const progresso = temCheckins ? (checkinsRealizados / plano) * 100 : 0;
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
        {statusMensalidade === "Pendente" && (
          <Badge variant="destructive" data-testid="badge-payment-status">
            Pendente
          </Badge>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
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
              <span className="text-muted-foreground">Plano: {planoTitulo}</span>
              {temCheckins ? (
                <span className="font-medium" data-testid="text-checkins-count">
                  {checkinsRealizados}/{plano}
                </span>
              ) : (
                <span className="font-medium text-secondary" data-testid="text-plan-value">
                  {planoValorTexto ?? "Mensalista"}
                </span>
              )}
            </div>
            {temCheckins && <Progress value={progresso} data-testid="progress-checkins" />}
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-lg">Histórico de Check-in</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={abrirRetroativo}
              data-testid="button-student-retroactive"
            >
              <CalendarClock className="h-4 w-4 mr-1" />
              Registrar Aula
            </Button>
          </div>
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

      {/* ── Histórico Financeiro ── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Histórico Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensalidade registrada</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  data-testid={`student-payment-${p.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">Mensalidade — {p.referenceMonth}</p>
                    <p className="text-xs text-muted-foreground">Venc. {p.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">R$ {p.amount}</span>
                    {paymentStatusBadge(p.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Minhas Cobranças ── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Minhas Cobranças
          </CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma cobrança pendente</p>
          ) : (
            <div className="space-y-2">
              {charges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  data-testid={`student-charge-${c.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{c.description}</p>
                    <p className="text-xs text-muted-foreground">Venc. {c.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">R$ {c.amount}</span>
                    {paymentStatusBadge(c.status)}
                    {c.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPixItem({ amount: c.amount, description: c.description });
                          setDialogPix(true);
                        }}
                        data-testid={`button-pay-charge-${c.id}`}
                      >
                        <QrCode className="h-3.5 w-3.5 mr-1" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── PIX Payment Dialog ── */}
      <Dialog open={dialogPix} onOpenChange={setDialogPix}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pagar via PIX
            </DialogTitle>
            <DialogDescription>
              {pixItem && <span>Cobrança: <strong>{pixItem.description}</strong></span>}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {pixItem && (
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">R$ {pixItem.amount}</p>
              </div>
            )}
            {pixSettings?.pixKey ? (
              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  {pixSettings.receiverName && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recebedor</span>
                      <span className="font-medium">{pixSettings.receiverName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chave PIX</span>
                    <span className="font-medium font-mono">{pixSettings.pixKey}</span>
                  </div>
                </div>
                {pixSettings.pixQrcodeImage && (
                  <div className="flex justify-center">
                    <img
                      src={pixSettings.pixQrcodeImage}
                      alt="QR Code PIX"
                      className="h-40 w-40 object-contain border rounded-lg"
                      data-testid="img-pix-qrcode"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Dados de pagamento PIX não configurados. Fale com a recepção.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setDialogPix(false)} data-testid="button-close-pix">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={dialogRetroativo} onOpenChange={setDialogRetroativo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Registrar Aula</DialogTitle>
            <DialogDescription asChild>
              <p className="font-bold text-foreground text-sm">
                Selecione a data e hora da aula que você frequentou mas esqueceu de registrar.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data-retro-aluno">Data</Label>
                <Input
                  id="data-retro-aluno"
                  type="date"
                  value={dataRetroativa}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDataRetroativa(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-student-retroactive-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora-retro-aluno">Hora</Label>
                <Input
                  id="hora-retro-aluno"
                  type="time"
                  value={horaRetroativa}
                  onChange={(e) => setHoraRetroativa(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-student-retroactive-time"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogRetroativo(false)}
              data-testid="button-cancel-retroactive-student"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarRetroativo}
              disabled={!dataRetroativa || !horaRetroativa}
              data-testid="button-confirm-retroactive-student"
            >
              <CalendarClock className="h-4 w-4 mr-2" />
              Registrar Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
