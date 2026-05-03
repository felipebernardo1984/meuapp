import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PhotoCropModal } from "./PhotoCropModal";
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
import { CheckCircle2, Clock, Calendar, Pencil, CalendarClock, QrCode, Receipt, DollarSign, ChevronDown, ChevronUp, Trash2, Camera, CalendarDays, GraduationCap } from "lucide-react";

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
  onEditarCheckin?: (index: number, data: string, hora: string) => void;
  onUpdatePhoto?: (photoUrl: string) => void;
}

function paymentStatusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pago</Badge>;
  if (status === "overdue") return <Badge variant="destructive">Atrasado</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
}

function ptBrParaISO(data: string): string {
  const partes = data.split("/");
  if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
  return "";
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
  onEditarCheckin,
  onUpdatePhoto,
}: StudentDashboardProps) {
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handlePhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setCropSrc(e.target!.result as string);
    reader.readAsDataURL(file);
  };

  const [confirmarIndex, setConfirmarIndex] = useState<number | null>(null);
  const [dialogRetroativo, setDialogRetroativo] = useState(false);
  const [dataRetroativa, setDataRetroativa] = useState("");
  const [horaRetroativa, setHoraRetroativa] = useState("");
  const [dialogPix, setDialogPix] = useState(false);
  const [pixItem, setPixItem] = useState<{ amount: string; description: string } | null>(null);
  const [checkinExpandido, setCheckinExpandido] = useState(false);
  const [dialogEditar, setDialogEditar] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [dataEditar, setDataEditar] = useState("");
  const [horaEditar, setHoraEditar] = useState("");

  const { data: minhaTurma } = useQuery<any | null>({ queryKey: ["/api/aluno/turma"] });

  const abrirEditar = (index: number) => {
    const item = historico[index];
    setEditandoIndex(index);
    setDataEditar(ptBrParaISO(item.data));
    setHoraEditar(item.hora || "");
    setDialogEditar(true);
  };

  const handleSalvarEdicao = () => {
    if (editandoIndex !== null && dataEditar && horaEditar && onEditarCheckin) {
      onEditarCheckin(editandoIndex, dataEditar, horaEditar);
      setDialogEditar(false);
      setEditandoIndex(null);
    }
  };

  const handleExcluirDoDialog = () => {
    if (editandoIndex !== null) {
      setDialogEditar(false);
      setConfirmarIndex(editandoIndex);
      setEditandoIndex(null);
    }
  };

  const CHECKIN_PREVIEW = 3;

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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0 flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-4 shadow-sm overflow-hidden min-w-[180px] max-w-[180px]">
            <Avatar className="h-28 w-28">
              <AvatarImage src={photoUrl} alt={studentName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            {onUpdatePhoto && (
              <label
                className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-md"
                title="Alterar foto"
                data-testid="label-student-photo-upload"
              >
                <Camera className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {cropSrc && onUpdatePhoto && (
              <PhotoCropModal
                imageSrc={cropSrc}
                onConfirm={(b64) => { onUpdatePhoto(b64); setCropSrc(null); }}
                onRemove={() => { onUpdatePhoto(""); setCropSrc(null); }}
                onCancel={() => setCropSrc(null)}
              />
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-0 pt-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-semibold whitespace-nowrap" data-testid="text-student-name">
                {studentName}
              </h1>
              <span className="text-muted-foreground whitespace-nowrap">|</span>
              <p className="text-sm text-muted-foreground whitespace-nowrap">{modalidade}</p>
            </div>
          </div>
        {statusMensalidade === "Pendente" && (
          <Badge variant="destructive" data-testid="badge-payment-status">
            Pendente
          </Badge>
        )}
      </div>

      {minhaTurma && (
        <Card className="mb-4 border-l-4" style={{ borderLeftColor: minhaTurma.cor ?? "#1565C0" }} data-testid="card-minha-turma">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">{minhaTurma.nome}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(minhaTurma.diasSemana as string).split("|").filter(Boolean)
                      .map((d: string) => ({ seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" } as Record<string,string>)[d] ?? d)
                      .join(" · ")}
                    {" "}• {minhaTurma.horarioInicio}–{minhaTurma.horarioFim}
                  </span>
                  {minhaTurma.professorNome && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {minhaTurma.professorNome}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          {!temCheckins ? (
            <Button
              size="lg"
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-checkin-mensalista"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Plano Mensalista
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={onCheckin}
              data-testid="button-checkin"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Fazer Check-in
            </Button>
          )}
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

      {temCheckins && (
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
                {(checkinExpandido ? historico : historico.slice(0, CHECKIN_PREVIEW)).map((item, index) => (
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
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => abrirEditar(index)}
                      data-testid={`button-edit-checkin-${index}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {historico.length > CHECKIN_PREVIEW && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setCheckinExpandido(!checkinExpandido)}
                    data-testid="button-toggle-checkin-history"
                  >
                    {checkinExpandido ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Ver todos ({historico.length} check-ins)
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                    {p.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPixItem({ amount: p.amount, description: `Mensalidade — ${p.referenceMonth}` });
                          setDialogPix(true);
                        }}
                        data-testid={`button-pay-payment-${p.id}`}
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

      {/* ── Dialog: Editar Check-in ── */}
      <Dialog open={dialogEditar} onOpenChange={(open) => { if (!open) { setDialogEditar(false); setEditandoIndex(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Check-in</DialogTitle>
            <DialogDescription>
              Altere a data e hora deste check-in ou exclua-o.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data-editar-aluno">Data</Label>
                <Input
                  id="data-editar-aluno"
                  type="date"
                  value={dataEditar}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDataEditar(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-edit-checkin-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora-editar-aluno">Hora</Label>
                <Input
                  id="hora-editar-aluno"
                  type="time"
                  value={horaEditar}
                  onChange={(e) => setHoraEditar(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-edit-checkin-time"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleExcluirDoDialog}
              data-testid="button-delete-from-edit-dialog"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setDialogEditar(false); setEditandoIndex(null); }}
                data-testid="button-cancel-edit-checkin"
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSalvarEdicao}
                disabled={!dataEditar || !horaEditar}
                data-testid="button-save-edit-checkin"
              >
                Salvar
              </Button>
            </div>
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
                  Tem certeza que deseja remover o check-in?
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
