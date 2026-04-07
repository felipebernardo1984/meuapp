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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Clock, History, CalendarClock, UserPlus } from "lucide-react";
import type { Plano } from "@/pages/Home";

interface AlunoView {
  id: string;
  nome: string;
  plano: number;
  planoTitulo: string;
  planoId: string;
  planoValorTexto?: string;
  checkinsRealizados: number;
  ultimoCheckin?: { data: string; hora: string };
  historico: Array<{ data: string; hora: string }>;
  photoUrl?: string;
}

interface NovoAlunoDados {
  nome: string;
  cpf: string;
  planoId: string;
}

interface TeacherDashboardProps {
  teacherName: string;
  modalidade: string;
  planos: Plano[];
  alunos: AlunoView[];
  onCheckinManual: (alunoId: string, data?: string, hora?: string) => void;
  onAlterarPlano: (alunoId: string, planoId: string) => void;
  onCadastrarAluno: (dados: NovoAlunoDados) => void;
}

export default function TeacherDashboard({
  teacherName,
  modalidade,
  planos,
  alunos,
  onCheckinManual,
  onAlterarPlano,
  onCadastrarAluno,
}: TeacherDashboardProps) {
  // Diálogos globais
  const [dialogRetroativo, setDialogRetroativo] = useState(false);
  const [alunoRetroativo, setAlunoRetroativo] = useState<AlunoView | null>(null);
  const [dataRetroativa, setDataRetroativa] = useState("");
  const [horaRetroativa, setHoraRetroativa] = useState("");

  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [alunoHistorico, setAlunoHistorico] = useState<AlunoView | null>(null);

  const [dialogAlterarPlano, setDialogAlterarPlano] = useState(false);
  const [alunoPlano, setAlunoPlano] = useState<AlunoView | null>(null);

  const [dialogNovoAluno, setDialogNovoAluno] = useState(false);
  const [novoAluno, setNovoAluno] = useState<NovoAlunoDados>({
    nome: "",
    cpf: "",
    planoId: planos[0]?.id ?? "",
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCadastrarAluno = () => {
    if (novoAluno.nome && novoAluno.cpf && novoAluno.planoId) {
      onCadastrarAluno(novoAluno);
      setNovoAluno({ nome: "", cpf: "", planoId: planos[0]?.id ?? "" });
      setDialogNovoAluno(false);
    }
  };

  const handleCheckinRetroativo = () => {
    if (alunoRetroativo && dataRetroativa && horaRetroativa) {
      onCheckinManual(alunoRetroativo.id, dataRetroativa, horaRetroativa);
      setDialogRetroativo(false);
      setDataRetroativa("");
      setHoraRetroativa("");
      setAlunoRetroativo(null);
    }
  };

  const openRetroativo = (aluno: AlunoView) => {
    setAlunoRetroativo(aluno);
    setDataRetroativa(new Date().toISOString().split("T")[0]);
    setHoraRetroativa(new Date().toTimeString().slice(0, 5));
    setDialogRetroativo(true);
  };

  const openHistorico = (aluno: AlunoView) => {
    setAlunoHistorico(aluno);
    setDialogHistorico(true);
  };

  const openAlterarPlano = (aluno: AlunoView) => {
    setAlunoPlano(aluno);
    setDialogAlterarPlano(true);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-teacher-name">
          Professor {teacherName}
        </h1>
        <p className="text-muted-foreground">{modalidade}</p>
      </div>

      {/* Botão Cadastrar Aluno — mesmo estilo do Check-in */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={() => setDialogNovoAluno(true)}
            data-testid="button-add-student"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Cadastrar Aluno
          </Button>
        </CardContent>
      </Card>

      {/* Grade de alunos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alunos.map((aluno) => {
          const temCheckins = aluno.plano > 0;
          const progresso = temCheckins ? (aluno.checkinsRealizados / aluno.plano) * 100 : 0;
          const initials = aluno.nome.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

          return (
            <Card key={aluno.id} className="hover-elevate" data-testid={`card-student-${aluno.id}`}>
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
                      <CardTitle className="text-base truncate">{aluno.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{aluno.planoTitulo}</p>
                    </div>
                  </div>
                  {temCheckins ? (
                    <Badge variant={progresso >= 100 ? "default" : "secondary"} className="text-xs shrink-0">
                      {aluno.checkinsRealizados}/{aluno.plano}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {aluno.planoValorTexto ?? "Mensalista"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {temCheckins && <Progress value={Math.min(progresso, 100)} />}

                {aluno.ultimoCheckin && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {aluno.ultimoCheckin.data}
                      {aluno.ultimoCheckin.hora ? ` às ${aluno.ultimoCheckin.hora}` : ""}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openHistorico(aluno)}
                    data-testid={`button-view-history-${aluno.id}`}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Histórico
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onCheckinManual(aluno.id)}
                    data-testid={`button-manual-checkin-${aluno.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Check-in
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openRetroativo(aluno)}
                  data-testid={`button-retroactive-checkin-${aluno.id}`}
                >
                  <CalendarClock className="h-4 w-4 mr-1" />
                  Registrar Aula
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => openAlterarPlano(aluno)}
                  data-testid={`button-edit-plan-${aluno.id}`}
                >
                  Alterar Plano
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {alunos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum aluno cadastrado nesta modalidade</p>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog: Cadastrar Aluno ── */}
      <Dialog open={dialogNovoAluno} onOpenChange={setDialogNovoAluno}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
            <DialogDescription>
              O login será o nome e a senha será o CPF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome do Aluno</Label>
              <Input
                placeholder="Nome completo"
                value={novoAluno.nome}
                onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                data-testid="input-new-student-name"
              />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={novoAluno.cpf}
                onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value })}
                data-testid="input-new-student-cpf"
              />
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select
                value={novoAluno.planoId}
                onValueChange={(v) => setNovoAluno({ ...novoAluno, planoId: v })}
              >
                <SelectTrigger data-testid="select-new-student-plan">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {planos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.titulo} — {p.checkins > 0 ? `${p.checkins} check-in` : (p.valorTexto ?? "Mensalidade")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoAluno(false)}>Cancelar</Button>
            <Button
              onClick={handleCadastrarAluno}
              disabled={!novoAluno.nome || !novoAluno.cpf || !novoAluno.planoId}
              data-testid="button-confirm-new-student"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Histórico ── */}
      <Dialog open={dialogHistorico} onOpenChange={setDialogHistorico}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alunoHistorico?.nome}</DialogTitle>
            <DialogDescription>Histórico de check-in</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alunoHistorico?.historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum check-in registrado</p>
            ) : (
              alunoHistorico?.historico.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary" />
                    <span className="text-sm">{item.data}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.hora}</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Alterar Plano ── */}
      <Dialog open={dialogAlterarPlano} onOpenChange={setDialogAlterarPlano}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano — {alunoPlano?.nome}</DialogTitle>
            <DialogDescription>
              Plano atual: <strong>{alunoPlano?.planoTitulo}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {planos.map((p) => (
              <Button
                key={p.id}
                variant={alunoPlano?.planoId === p.id ? "default" : "outline"}
                className="w-full justify-between"
                onClick={() => {
                  if (alunoPlano) onAlterarPlano(alunoPlano.id, p.id);
                  setDialogAlterarPlano(false);
                }}
                data-testid={`button-plan-${p.id}`}
              >
                <span>{p.titulo}</span>
                <span className="text-xs opacity-70">
                  {p.checkins > 0 ? `${p.checkins} check-in` : (p.valorTexto ?? "Mensalidade")}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Check-in Retroativo ── */}
      <Dialog open={dialogRetroativo} onOpenChange={setDialogRetroativo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Registrar Aula</DialogTitle>
            <DialogDescription asChild>
              <p className="font-bold text-foreground text-sm">
                Selecione a data e hora da aula de {alunoRetroativo?.nome} que ainda não foi registrada.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={dataRetroativa}
                  onChange={(e) => setDataRetroativa(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-retroactive-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={horaRetroativa}
                  onChange={(e) => setHoraRetroativa(e.target.value)}
                  className="[&::-webkit-calendar-picker-indicator]:hidden"
                  data-testid="input-retroactive-time"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogRetroativo(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCheckinRetroativo}
              disabled={!dataRetroativa || !horaRetroativa}
              data-testid="button-confirm-retroactive"
            >
              Confirmar Check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
