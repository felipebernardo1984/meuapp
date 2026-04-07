import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  CheckCircle,
  XCircle,
  UserCheck,
  UserPlus,
  Pencil,
  Trash2,
  Plus,
  DollarSign,
  Receipt,
  TrendingUp,
  MoreHorizontal,
  History,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import type { Plano } from "@/pages/Home";

interface AlunoGestor {
  id: string;
  nome: string;
  cpf: string;
  modalidade: string;
  plano: number;
  planoId: string;
  planoTitulo: string;
  planoValorTexto?: string;
  checkinsRealizados: number;
  statusMensalidade: "Em dia" | "Pendente";
  ultimoCheckin?: string;
  aprovado: boolean;
  historico: Array<{ data: string; hora: string }>;
}

interface ProfessorGestor {
  id: string;
  nome: string;
  modalidade: string;
}

interface NovoAlunoDados {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  login: string;
  senha: string;
  modalidade: string;
  planoId: string;
}

interface ManagerDashboardProps {
  planos: Plano[];
  alunos: AlunoGestor[];
  professores: ProfessorGestor[];
  onAprovarAluno: (alunoId: string) => void;
  onCadastrarProfessor: (dados: { nome: string; cpf: string; email: string; telefone: string; login: string; senha: string; modalidade: string }) => void;
  onEditarProfessor: (id: string, nome: string, modalidade: string) => void;
  onExcluirProfessor: (id: string) => void;
  onCadastrarAluno: (dados: NovoAlunoDados) => void;
  onCriarPlano: (titulo: string, checkins: number, valorTexto?: string) => void;
  onEditarPlano: (id: string, titulo: string, checkins: number, valorTexto?: string) => void;
  onExcluirPlano: (id: string) => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
  onRegistrarPagamento: (dados: { studentId: string; amount: string; referenceMonth: string; dueDate: string; status: string }) => void;
  onCriarCobranca: (dados: { studentId: string; description: string; amount: string; dueDate: string }) => void;
  onIrFinanceiro: () => void;
  onEditarAluno: (dados: { id: string; nome: string; cpf: string; modalidade: string; statusMensalidade: string; checkinsRealizados: number }) => void;
  onAlterarPlanoAluno: (alunoId: string, planoId: string) => void;
  onCheckinManual: (alunoId: string, data?: string, hora?: string) => void;
  onRemoverCheckin: (alunoId: string, index: number) => void;
  onExcluirAluno: (alunoId: string) => void;
}

function parseValorPlano(input: string): { checkins: number; valorTexto?: string } {
  const trimmed = input.trim();
  const num = Number(trimmed);
  if (trimmed !== "" && !isNaN(num) && num > 0 && /^\d+$/.test(trimmed)) {
    return { checkins: num };
  }
  const formatted = trimmed.startsWith("R$") ? trimmed : `R$ ${trimmed}`;
  return { checkins: 0, valorTexto: formatted };
}

export default function ManagerDashboard({
  planos,
  alunos,
  professores,
  onAprovarAluno,
  onCadastrarProfessor,
  onEditarProfessor,
  onExcluirProfessor,
  onCadastrarAluno,
  onCriarPlano,
  onEditarPlano,
  onExcluirPlano,
  onExportarPDF,
  onExportarExcel,
  onRegistrarPagamento,
  onCriarCobranca,
  onIrFinanceiro,
  onEditarAluno,
  onAlterarPlanoAluno,
  onCheckinManual,
  onRemoverCheckin,
  onExcluirAluno,
}: ManagerDashboardProps) {
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");

  // Financial state
  const [dialogPagamento, setDialogPagamento] = useState(false);
  const [dialogCobranca, setDialogCobranca] = useState(false);
  const [alunoFinanceiroId, setAlunoFinanceiroId] = useState<string>("");
  const [formPagamento, setFormPagamento] = useState({ amount: "", referenceMonth: "", dueDate: "", status: "paid" });
  const [formCobranca, setFormCobranca] = useState({ description: "", amount: "", dueDate: "" });

  // Editar aluno state
  const [dialogEditarAluno, setDialogEditarAluno] = useState(false);
  const [alunoEditando, setAlunoEditando] = useState<AlunoGestor | null>(null);
  const [formEditarAluno, setFormEditarAluno] = useState({ nome: "", cpf: "", modalidade: "", statusMensalidade: "Em dia" as string, checkinsRealizados: 0, planoId: "" });

  // Alterar plano state
  const [dialogAlterarPlano, setDialogAlterarPlano] = useState(false);
  const [alunoPlanoId, setAlunoPlanoId] = useState<string>("");
  const [novoPlanoId, setNovoPlanoId] = useState<string>("");

  // Histórico state
  const [dialogHistorico, setDialogHistorico] = useState(false);
  const [alunoHistorico, setAlunoHistorico] = useState<AlunoGestor | null>(null);

  // Checkin retroativo state
  const [dialogCheckinRetro, setDialogCheckinRetro] = useState(false);
  const [alunoCheckinId, setAlunoCheckinId] = useState<string>("");
  const [formCheckin, setFormCheckin] = useState({ data: "", hora: "" });

  // Excluir aluno state
  const [confirmExcluirAluno, setConfirmExcluirAluno] = useState<AlunoGestor | null>(null);

  // Professor state
  const [dialogProfessor, setDialogProfessor] = useState(false);
  const [professorEditando, setProfessorEditando] = useState<ProfessorGestor | null>(null);
  const [formProfessor, setFormProfessor] = useState({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "" });

  // Aluno state
  const [dialogNovoAluno, setDialogNovoAluno] = useState(false);
  const [novoAluno, setNovoAluno] = useState<NovoAlunoDados>({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    login: "",
    senha: "",
    modalidade: "",
    planoId: planos[0]?.id ?? "",
  });

  // Plano state
  const [dialogNovoPlano, setDialogNovoPlano] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
  const [formPlano, setFormPlano] = useState({ titulo: "", valor: "" });

  // ── Planos ──────────────────────────────────────────────────────────────
  const getPlanoDescricao = (plano: Plano) =>
    plano.checkins > 0 ? `${plano.checkins} check-in por ciclo` : (plano.valorTexto ?? "Mensalidade");

  const getPlanoValorInput = (plano: Plano) =>
    plano.checkins > 0 ? String(plano.checkins) : (plano.valorTexto?.replace("R$ ", "") ?? "");

  const abrirEditarPlano = (plano: Plano) => {
    setPlanoEditando(plano);
    setFormPlano({ titulo: plano.titulo, valor: getPlanoValorInput(plano) });
  };

  const handleSalvarPlano = () => {
    if (!formPlano.titulo || !formPlano.valor.trim()) return;
    const { checkins, valorTexto } = parseValorPlano(formPlano.valor);
    if (planoEditando) {
      onEditarPlano(planoEditando.id, formPlano.titulo, checkins, valorTexto);
      setPlanoEditando(null);
    } else {
      onCriarPlano(formPlano.titulo, checkins, valorTexto);
      setDialogNovoPlano(false);
    }
    setFormPlano({ titulo: "", valor: "" });
  };

  // ── Professores ──────────────────────────────────────────────────────────
  const abrirEditarProfessor = (p: ProfessorGestor) => {
    setProfessorEditando(p);
    setFormProfessor({ nome: p.nome, cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: p.modalidade });
  };

  const handleSalvarProfessor = () => {
    if (!formProfessor.nome || !formProfessor.modalidade) return;
    if (professorEditando) {
      onEditarProfessor(professorEditando.id, formProfessor.nome, formProfessor.modalidade);
      setProfessorEditando(null);
    } else {
      if (!formProfessor.login || !formProfessor.senha) return;
      onCadastrarProfessor({ nome: formProfessor.nome, cpf: formProfessor.cpf, email: formProfessor.email, telefone: formProfessor.telefone, login: formProfessor.login, senha: formProfessor.senha, modalidade: formProfessor.modalidade });
      setDialogProfessor(false);
    }
    setFormProfessor({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "" });
  };

  // ── Alunos ───────────────────────────────────────────────────────────────
  const handleCadastrarAluno = () => {
    if (novoAluno.nome && novoAluno.cpf && novoAluno.modalidade && novoAluno.planoId) {
      onCadastrarAluno(novoAluno);
      setNovoAluno({ nome: "", cpf: "", email: "", telefone: "", login: "", senha: "", modalidade: "", planoId: planos[0]?.id ?? "" });
      setDialogNovoAluno(false);
    }
  };

  // Modalidades únicas de alunos + professores
  const todasModalidades = Array.from(
    new Set([...alunos.map((a) => a.modalidade), ...professores.map((p) => p.modalidade)].filter(Boolean))
  );

  const alunosFiltrados = alunos.filter(
    (a) => filtroModalidade === "todas" || a.modalidade === filtroModalidade
  );
  const alunosPendentes = alunos.filter((a) => !a.aprovado);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-manager-title">Painel do Gestor</h1>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-students">{alunos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600" data-testid="text-pending-students">
              {alunosPendentes.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Professores Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-teachers">{professores.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Cadastrar Aluno — botão grande igual ao Check-in ── */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={() => setDialogNovoAluno(true)}
            data-testid="button-add-student-manager"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Cadastrar Aluno
          </Button>
        </CardContent>
      </Card>

      {/* Dialog Cadastrar Aluno */}
      <Dialog open={dialogNovoAluno} onOpenChange={setDialogNovoAluno}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Nome do Aluno <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Nome completo"
                value={novoAluno.nome}
                onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                data-testid="input-manager-student-name"
              />
            </div>
            <div className="space-y-1">
              <Label>CPF <span className="text-destructive">*</span></Label>
              <Input
                placeholder="000.000.000-00"
                value={novoAluno.cpf}
                onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value })}
                data-testid="input-manager-student-cpf"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={novoAluno.email}
                onChange={(e) => setNovoAluno({ ...novoAluno, email: e.target.value })}
                data-testid="input-manager-student-email"
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={novoAluno.telefone}
                onChange={(e) => setNovoAluno({ ...novoAluno, telefone: e.target.value })}
                data-testid="input-manager-student-telefone"
              />
            </div>
            <div className="space-y-1">
              <Label>Login <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Login de acesso do aluno"
                value={novoAluno.login}
                onChange={(e) => setNovoAluno({ ...novoAluno, login: e.target.value })}
                data-testid="input-manager-student-login"
              />
            </div>
            <div className="space-y-1">
              <Label>Senha <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Senha de acesso do aluno"
                value={novoAluno.senha}
                onChange={(e) => setNovoAluno({ ...novoAluno, senha: e.target.value })}
                data-testid="input-manager-student-senha"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade <span className="text-destructive">*</span></Label>
              <Select
                value={novoAluno.modalidade}
                onValueChange={(v) => setNovoAluno({ ...novoAluno, modalidade: v })}
              >
                <SelectTrigger data-testid="select-manager-student-modality">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {todasModalidades.map((mod) => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Plano <span className="text-destructive">*</span></Label>
              <Select
                value={novoAluno.planoId}
                onValueChange={(v) => setNovoAluno({ ...novoAluno, planoId: v })}
              >
                <SelectTrigger data-testid="select-manager-student-plan">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {planos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.titulo} — {getPlanoDescricao(p)}
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
              disabled={!novoAluno.nome || !novoAluno.cpf || !novoAluno.login || !novoAluno.senha || !novoAluno.modalidade || !novoAluno.planoId}
              data-testid="button-confirm-manager-student"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Planos ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
                data-testid={`plan-${plano.id}`}
              >
                <div>
                  <p className="font-medium">{plano.titulo}</p>
                  <p className="text-sm text-muted-foreground">{getPlanoDescricao(plano)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => abrirEditarPlano(plano)}
                    data-testid={`button-edit-plan-${plano.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onExcluirPlano(plano.id)}
                    data-testid={`button-delete-plan-${plano.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              size="lg"
              className="w-full h-14 text-lg mt-2"
              onClick={() => { setFormPlano({ titulo: "", valor: "" }); setDialogNovoPlano(true); }}
              data-testid="button-add-plan"
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar novo plano
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog criar plano */}
      <Dialog open={dialogNovoPlano} onOpenChange={setDialogNovoPlano}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Plano</DialogTitle>
            <DialogDescription>
              No campo valor, escreva um número de check-in (ex: 8) ou um valor em reais (ex: 140,00).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Título do plano</Label>
              <Input
                placeholder="Ex: 3x por semana, Intensivo..."
                value={formPlano.titulo}
                onChange={(e) => setFormPlano({ ...formPlano, titulo: e.target.value })}
                data-testid="input-plan-title"
              />
            </div>
            <div className="space-y-1">
              <Label>Check-in ou valor (R$)</Label>
              <Input
                placeholder="Ex: 12  ou  140,00"
                value={formPlano.valor}
                onChange={(e) => setFormPlano({ ...formPlano, valor: e.target.value })}
                data-testid="input-plan-value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogNovoPlano(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvarPlano}
              disabled={!formPlano.titulo || !formPlano.valor.trim()}
              data-testid="button-confirm-plan"
            >
              Criar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog editar plano */}
      <Dialog open={!!planoEditando} onOpenChange={(open) => { if (!open) setPlanoEditando(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Alterações serão aplicadas a todos os alunos neste plano. Escreva um número de check-in ou um valor em R$.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Título do plano</Label>
              <Input
                placeholder="Ex: 1x por semana"
                value={formPlano.titulo}
                onChange={(e) => setFormPlano({ ...formPlano, titulo: e.target.value })}
                data-testid="input-edit-plan-title"
              />
            </div>
            <div className="space-y-1">
              <Label>Check-in ou valor (R$)</Label>
              <Input
                placeholder="Ex: 8  ou  140,00"
                value={formPlano.valor}
                onChange={(e) => setFormPlano({ ...formPlano, valor: e.target.value })}
                data-testid="input-edit-plan-value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanoEditando(null)}>Cancelar</Button>
            <Button
              onClick={handleSalvarPlano}
              disabled={!formPlano.titulo || !formPlano.valor.trim()}
              data-testid="button-confirm-edit-plan"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Professores ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Professores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {professores.map((professor) => (
              <div
                key={professor.id}
                className="flex items-center justify-between p-3 bg-muted rounded-md"
                data-testid={`teacher-${professor.id}`}
              >
                <div>
                  <p className="font-medium">{professor.nome}</p>
                  <p className="text-sm text-muted-foreground">{professor.modalidade}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => abrirEditarProfessor(professor)}
                    data-testid={`button-edit-teacher-${professor.id}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onExcluirProfessor(professor.id)}
                    data-testid={`button-delete-teacher-${professor.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              size="lg"
              className="w-full h-14 text-lg mt-2"
              onClick={() => { setFormProfessor({ nome: "", modalidade: "" }); setDialogProfessor(true); }}
              data-testid="button-add-teacher"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              Cadastrar Professor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog cadastrar professor */}
      <Dialog open={dialogProfessor} onOpenChange={setDialogProfessor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Professor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Nome do Professor <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Nome completo"
                value={formProfessor.nome}
                onChange={(e) => setFormProfessor({ ...formProfessor, nome: e.target.value })}
                data-testid="input-teacher-name"
              />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={formProfessor.cpf}
                onChange={(e) => setFormProfessor({ ...formProfessor, cpf: e.target.value })}
                data-testid="input-teacher-cpf"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={formProfessor.email}
                onChange={(e) => setFormProfessor({ ...formProfessor, email: e.target.value })}
                data-testid="input-teacher-email"
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formProfessor.telefone}
                onChange={(e) => setFormProfessor({ ...formProfessor, telefone: e.target.value })}
                data-testid="input-teacher-telefone"
              />
            </div>
            <div className="space-y-1">
              <Label>Login <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Login de acesso do professor"
                value={formProfessor.login}
                onChange={(e) => setFormProfessor({ ...formProfessor, login: e.target.value })}
                data-testid="input-teacher-login"
              />
            </div>
            <div className="space-y-1">
              <Label>Senha <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Senha de acesso do professor"
                value={formProfessor.senha}
                onChange={(e) => setFormProfessor({ ...formProfessor, senha: e.target.value })}
                data-testid="input-teacher-senha"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: Beach Tennis, Futevôlei, Surf..."
                value={formProfessor.modalidade}
                onChange={(e) => setFormProfessor({ ...formProfessor, modalidade: e.target.value })}
                data-testid="input-teacher-modality"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogProfessor(false)}>Cancelar</Button>
            <Button
              onClick={handleSalvarProfessor}
              disabled={!formProfessor.nome || !formProfessor.login || !formProfessor.senha || !formProfessor.modalidade}
              data-testid="button-confirm-add-teacher"
            >
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog editar professor */}
      <Dialog open={!!professorEditando} onOpenChange={(open) => { if (!open) setProfessorEditando(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
            <DialogDescription>Atualize os dados do professor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Nome completo"
                value={formProfessor.nome}
                onChange={(e) => setFormProfessor({ ...formProfessor, nome: e.target.value })}
                data-testid="input-edit-teacher-name"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
              <Input
                placeholder="Ex: Beach Tennis, Futevôlei, Surf..."
                value={formProfessor.modalidade}
                onChange={(e) => setFormProfessor({ ...formProfessor, modalidade: e.target.value })}
                data-testid="input-edit-teacher-modality"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfessorEditando(null)}>Cancelar</Button>
            <Button
              onClick={handleSalvarProfessor}
              disabled={!formProfessor.nome || !formProfessor.modalidade}
              data-testid="button-confirm-edit-teacher"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Aprovações pendentes ── */}
      {alunosPendentes.length > 0 && (
        <Card className="mb-6 border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Aprovações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alunosPendentes.map((aluno) => (
                <div
                  key={aluno.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                  data-testid={`pending-student-${aluno.id}`}
                >
                  <div>
                    <p className="font-medium">{aluno.nome}</p>
                    <p className="text-sm text-muted-foreground">{aluno.modalidade} — {aluno.cpf}</p>
                  </div>
                  <Button onClick={() => onAprovarAluno(aluno.id)} data-testid={`button-approve-${aluno.id}`}>
                    Aprovar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabela de alunos ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg">Alunos</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
                <SelectTrigger className="w-44" data-testid="select-modality">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {todasModalidades.map((mod) => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={onExportarPDF} data-testid="button-export-pdf">
                <Download className="h-4 w-4 mr-2" />PDF
              </Button>
              <Button variant="outline" onClick={onExportarExcel} data-testid="button-export-excel">
                <Download className="h-4 w-4 mr-2" />Excel
              </Button>
              <Button variant="outline" onClick={onIrFinanceiro} data-testid="button-go-financial">
                <TrendingUp className="h-4 w-4 mr-2" />Financeiro
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Último Check-in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alunosFiltrados.map((aluno) => (
                  <TableRow key={aluno.id} data-testid={`row-student-${aluno.id}`}>
                    <TableCell className="font-medium">{aluno.nome}</TableCell>
                    <TableCell>{aluno.modalidade}</TableCell>
                    <TableCell>{aluno.planoTitulo}</TableCell>
                    <TableCell>
                      {aluno.plano > 0
                        ? `${aluno.checkinsRealizados}/${aluno.plano}`
                        : aluno.planoValorTexto ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={aluno.statusMensalidade === "Em dia" ? "default" : "destructive"}>
                        {aluno.statusMensalidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {aluno.ultimoCheckin || "—"}
                    </TableCell>
                    <TableCell>
                      {aluno.aprovado ? (
                        <CheckCircle className="h-4 w-4 text-secondary" />
                      ) : (
                        <XCircle className="h-4 w-4 text-orange-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" data-testid={`button-actions-${aluno.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoEditando(aluno);
                              setFormEditarAluno({
                                nome: aluno.nome,
                                cpf: aluno.cpf,
                                modalidade: aluno.modalidade,
                                statusMensalidade: aluno.statusMensalidade,
                                checkinsRealizados: aluno.checkinsRealizados,
                                planoId: aluno.planoId,
                              });
                              setDialogEditarAluno(true);
                            }}
                            data-testid={`menu-edit-student-${aluno.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar dados
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoPlanoId(aluno.id);
                              setNovoPlanoId(aluno.planoId);
                              setDialogAlterarPlano(true);
                            }}
                            data-testid={`menu-change-plan-${aluno.id}`}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Alterar plano
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoCheckinId(aluno.id);
                              const now = new Date();
                              setFormCheckin({
                                data: now.toISOString().split("T")[0],
                                hora: now.toTimeString().slice(0, 5),
                              });
                              onCheckinManual(aluno.id);
                            }}
                            data-testid={`menu-checkin-${aluno.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Check-in agora
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoCheckinId(aluno.id);
                              const now = new Date();
                              setFormCheckin({
                                data: now.toISOString().split("T")[0],
                                hora: now.toTimeString().slice(0, 5),
                              });
                              setDialogCheckinRetro(true);
                            }}
                            data-testid={`menu-retroactive-checkin-${aluno.id}`}
                          >
                            <CalendarClock className="h-4 w-4 mr-2" />
                            Registrar aula
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoHistorico(aluno);
                              setDialogHistorico(true);
                            }}
                            data-testid={`menu-history-${aluno.id}`}
                          >
                            <History className="h-4 w-4 mr-2" />
                            Histórico de check-ins
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoFinanceiroId(aluno.id);
                              const now = new Date();
                              setFormPagamento({
                                amount: aluno.planoValorTexto?.replace(/[^0-9,.]/g, "") ?? "",
                                referenceMonth: `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`,
                                dueDate: new Date(now.getFullYear(), now.getMonth(), 10).toLocaleDateString("pt-BR"),
                                status: "paid",
                              });
                              setDialogPagamento(true);
                            }}
                            data-testid={`menu-payment-${aluno.id}`}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAlunoFinanceiroId(aluno.id);
                              const now = new Date();
                              setFormCobranca({
                                description: "",
                                amount: "",
                                dueDate: new Date(now.getFullYear(), now.getMonth(), 10).toLocaleDateString("pt-BR"),
                              });
                              setDialogCobranca(true);
                            }}
                            data-testid={`menu-charge-${aluno.id}`}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            Criar cobrança
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setConfirmExcluirAluno(aluno)}
                            data-testid={`menu-delete-student-${aluno.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir aluno
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Registrar Pagamento */}
      <Dialog open={dialogPagamento} onOpenChange={setDialogPagamento}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Registrar Pagamento
            </DialogTitle>
            <DialogDescription>
              Registre uma mensalidade para o aluno selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                placeholder="Ex: 140,00"
                value={formPagamento.amount}
                onChange={(e) => setFormPagamento({ ...formPagamento, amount: e.target.value })}
                data-testid="input-payment-amount"
              />
            </div>
            <div className="space-y-1">
              <Label>Mês de Referência</Label>
              <Input
                placeholder="Ex: 04/2025"
                value={formPagamento.referenceMonth}
                onChange={(e) => setFormPagamento({ ...formPagamento, referenceMonth: e.target.value })}
                data-testid="input-payment-month"
              />
            </div>
            <div className="space-y-1">
              <Label>Vencimento</Label>
              <Input
                placeholder="Ex: 10/04/2025"
                value={formPagamento.dueDate}
                onChange={(e) => setFormPagamento({ ...formPagamento, dueDate: e.target.value })}
                data-testid="input-payment-due"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={formPagamento.status} onValueChange={(v) => setFormPagamento({ ...formPagamento, status: v })}>
                <SelectTrigger data-testid="select-payment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPagamento(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (formPagamento.amount && formPagamento.referenceMonth && formPagamento.dueDate) {
                  onRegistrarPagamento({ studentId: alunoFinanceiroId, ...formPagamento });
                  setDialogPagamento(false);
                }
              }}
              disabled={!formPagamento.amount || !formPagamento.referenceMonth || !formPagamento.dueDate}
              data-testid="button-confirm-payment"
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Cobrança */}
      <Dialog open={dialogCobranca} onOpenChange={setDialogCobranca}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Criar Cobrança Extra
            </DialogTitle>
            <DialogDescription>
              Crie uma cobrança adicional para o aluno selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Taxa de falta, Aula extra..."
                value={formCobranca.description}
                onChange={(e) => setFormCobranca({ ...formCobranca, description: e.target.value })}
                data-testid="input-charge-description"
              />
            </div>
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input
                placeholder="Ex: 30,00"
                value={formCobranca.amount}
                onChange={(e) => setFormCobranca({ ...formCobranca, amount: e.target.value })}
                data-testid="input-charge-amount"
              />
            </div>
            <div className="space-y-1">
              <Label>Vencimento</Label>
              <Input
                placeholder="Ex: 10/04/2025"
                value={formCobranca.dueDate}
                onChange={(e) => setFormCobranca({ ...formCobranca, dueDate: e.target.value })}
                data-testid="input-charge-due"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCobranca(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (formCobranca.description && formCobranca.amount && formCobranca.dueDate) {
                  onCriarCobranca({ studentId: alunoFinanceiroId, ...formCobranca });
                  setDialogCobranca(false);
                }
              }}
              disabled={!formCobranca.description || !formCobranca.amount || !formCobranca.dueDate}
              data-testid="button-confirm-charge"
            >
              Criar Cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Aluno */}
      <Dialog open={dialogEditarAluno} onOpenChange={(open) => { if (!open) { setDialogEditarAluno(false); setAlunoEditando(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Dados do Aluno
            </DialogTitle>
            <DialogDescription>
              Atualize as informações do aluno. O login permanece o mesmo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={formEditarAluno.nome}
                onChange={(e) => setFormEditarAluno({ ...formEditarAluno, nome: e.target.value })}
                data-testid="input-edit-nome"
              />
            </div>
            <div className="space-y-1">
              <Label>CPF (também é a senha do aluno)</Label>
              <Input
                placeholder="000.000.000-00"
                value={formEditarAluno.cpf}
                onChange={(e) => setFormEditarAluno({ ...formEditarAluno, cpf: e.target.value })}
                data-testid="input-edit-cpf"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
              <Input
                value={formEditarAluno.modalidade}
                onChange={(e) => setFormEditarAluno({ ...formEditarAluno, modalidade: e.target.value })}
                data-testid="input-edit-modalidade"
              />
            </div>
            <div className="space-y-1">
              <Label>Status Mensalidade</Label>
              <Select
                value={formEditarAluno.statusMensalidade}
                onValueChange={(v) => setFormEditarAluno({ ...formEditarAluno, statusMensalidade: v })}
              >
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em dia">Em dia</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Check-ins realizados</Label>
              <Input
                type="number"
                min={0}
                value={formEditarAluno.checkinsRealizados}
                onChange={(e) => setFormEditarAluno({ ...formEditarAluno, checkinsRealizados: Number(e.target.value) })}
                data-testid="input-edit-checkins"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogEditarAluno(false); setAlunoEditando(null); }}>Cancelar</Button>
            <Button
              onClick={() => {
                if (alunoEditando && formEditarAluno.nome && formEditarAluno.cpf && formEditarAluno.modalidade) {
                  onEditarAluno({ id: alunoEditando.id, ...formEditarAluno });
                  setDialogEditarAluno(false);
                  setAlunoEditando(null);
                }
              }}
              disabled={!formEditarAluno.nome || !formEditarAluno.cpf || !formEditarAluno.modalidade}
              data-testid="button-confirm-edit-student"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar Plano */}
      <Dialog open={dialogAlterarPlano} onOpenChange={setDialogAlterarPlano}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano do Aluno</DialogTitle>
            <DialogDescription>Selecione o novo plano para este aluno.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Select value={novoPlanoId} onValueChange={setNovoPlanoId}>
              <SelectTrigger data-testid="select-new-plan">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {planos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAlterarPlano(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (alunoPlanoId && novoPlanoId) {
                  onAlterarPlanoAluno(alunoPlanoId, novoPlanoId);
                  setDialogAlterarPlano(false);
                }
              }}
              disabled={!novoPlanoId}
              data-testid="button-confirm-change-plan"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Check-in Retroativo */}
      <Dialog open={dialogCheckinRetro} onOpenChange={setDialogCheckinRetro}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Registrar Aula
            </DialogTitle>
            <DialogDescription>Registre um check-in retroativo para este aluno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={formCheckin.data}
                onChange={(e) => setFormCheckin({ ...formCheckin, data: e.target.value })}
                data-testid="input-checkin-data"
              />
            </div>
            <div className="space-y-1">
              <Label>Hora</Label>
              <Input
                type="time"
                value={formCheckin.hora}
                onChange={(e) => setFormCheckin({ ...formCheckin, hora: e.target.value })}
                data-testid="input-checkin-hora"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCheckinRetro(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (alunoCheckinId && formCheckin.data && formCheckin.hora) {
                  onCheckinManual(alunoCheckinId, formCheckin.data, formCheckin.hora);
                  setDialogCheckinRetro(false);
                }
              }}
              disabled={!formCheckin.data || !formCheckin.hora}
              data-testid="button-confirm-checkin-retro"
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Histórico */}
      <Dialog open={dialogHistorico} onOpenChange={(open) => { if (!open) { setDialogHistorico(false); setAlunoHistorico(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Check-ins — {alunoHistorico?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {(alunoHistorico?.historico ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum check-in registrado</p>
            ) : (
              <div className="space-y-1">
                {[...(alunoHistorico?.historico ?? [])].reverse().map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-1 border-b last:border-0">
                    <span className="text-sm">{h.data} às {h.hora}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (alunoHistorico) {
                          const realIndex = (alunoHistorico.historico.length - 1) - i;
                          onRemoverCheckin(alunoHistorico.id, realIndex);
                        }
                      }}
                      data-testid={`button-remove-checkin-${i}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogHistorico(false); setAlunoHistorico(null); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão do Aluno */}
      <Dialog open={!!confirmExcluirAluno} onOpenChange={(open) => { if (!open) setConfirmExcluirAluno(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Aluno</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o aluno <strong>{confirmExcluirAluno?.nome}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmExcluirAluno(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmExcluirAluno) {
                  onExcluirAluno(confirmExcluirAluno.id);
                  setConfirmExcluirAluno(null);
                }
              }}
              data-testid="button-confirm-delete-student"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
