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
} from "lucide-react";
import type { Plano } from "@/pages/Home";

interface AlunoGestor {
  id: string;
  nome: string;
  cpf: string;
  modalidade: string;
  plano: number;
  planoTitulo: string;
  planoValorTexto?: string;
  checkinsRealizados: number;
  statusMensalidade: "Em dia" | "Pendente";
  ultimoCheckin?: string;
  aprovado: boolean;
}

interface ProfessorGestor {
  id: string;
  nome: string;
  modalidade: string;
}

interface NovoAlunoDados {
  nome: string;
  cpf: string;
  modalidade: string;
  planoId: string;
}

interface ManagerDashboardProps {
  planos: Plano[];
  alunos: AlunoGestor[];
  professores: ProfessorGestor[];
  onAprovarAluno: (alunoId: string) => void;
  onCadastrarProfessor: (nome: string, modalidade: string) => void;
  onEditarProfessor: (id: string, nome: string, modalidade: string) => void;
  onExcluirProfessor: (id: string) => void;
  onCadastrarAluno: (dados: NovoAlunoDados) => void;
  onCriarPlano: (titulo: string, checkins: number, valorTexto?: string) => void;
  onEditarPlano: (id: string, titulo: string, checkins: number, valorTexto?: string) => void;
  onExcluirPlano: (id: string) => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
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
}: ManagerDashboardProps) {
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");

  // Professor state
  const [dialogProfessor, setDialogProfessor] = useState(false);
  const [professorEditando, setProfessorEditando] = useState<ProfessorGestor | null>(null);
  const [formProfessor, setFormProfessor] = useState({ nome: "", modalidade: "" });

  // Aluno state
  const [dialogNovoAluno, setDialogNovoAluno] = useState(false);
  const [novoAluno, setNovoAluno] = useState<NovoAlunoDados>({
    nome: "",
    cpf: "",
    modalidade: "",
    planoId: planos[0]?.id ?? "",
  });

  // Plano state
  const [dialogNovoPlano, setDialogNovoPlano] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
  const [formPlano, setFormPlano] = useState({ titulo: "", valor: "" });

  // ── Planos ──────────────────────────────────────────────────────────────
  const getPlanoDescricao = (plano: Plano) =>
    plano.checkins > 0 ? `${plano.checkins} check-ins por ciclo` : (plano.valorTexto ?? "Mensalidade");

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
    setFormProfessor({ nome: p.nome, modalidade: p.modalidade });
  };

  const handleSalvarProfessor = () => {
    if (!formProfessor.nome || !formProfessor.modalidade) return;
    if (professorEditando) {
      onEditarProfessor(professorEditando.id, formProfessor.nome, formProfessor.modalidade);
      setProfessorEditando(null);
    } else {
      onCadastrarProfessor(formProfessor.nome, formProfessor.modalidade);
      setDialogProfessor(false);
    }
    setFormProfessor({ nome: "", modalidade: "" });
  };

  // ── Alunos ───────────────────────────────────────────────────────────────
  const handleCadastrarAluno = () => {
    if (novoAluno.nome && novoAluno.cpf && novoAluno.modalidade && novoAluno.planoId) {
      onCadastrarAluno(novoAluno);
      setNovoAluno({ nome: "", cpf: "", modalidade: "", planoId: planos[0]?.id ?? "" });
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
        <p className="text-muted-foreground">Seven Sports — Controle Total</p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
            <DialogDescription>
              O login será gerado a partir do nome e a senha será o CPF do aluno.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome do Aluno</Label>
              <Input
                placeholder="Nome completo"
                value={novoAluno.nome}
                onChange={(e) => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                data-testid="input-manager-student-name"
              />
            </div>
            <div className="space-y-1">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={novoAluno.cpf}
                onChange={(e) => setNovoAluno({ ...novoAluno, cpf: e.target.value })}
                data-testid="input-manager-student-cpf"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
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
              <Label>Plano</Label>
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
              disabled={!novoAluno.nome || !novoAluno.cpf || !novoAluno.modalidade || !novoAluno.planoId}
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
              No campo valor, escreva um número de check-ins (ex: 8) ou um valor em reais (ex: 140,00).
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
              <Label>Check-ins ou valor (R$)</Label>
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
              Alterações serão aplicadas a todos os alunos neste plano. Escreva um número de check-ins ou um valor em R$.
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
              <Label>Check-ins ou valor (R$)</Label>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Professor</DialogTitle>
            <DialogDescription>
              O professor receberá senha padrão "admin" que poderá ser alterada após o primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Digite o nome completo"
                value={formProfessor.nome}
                onChange={(e) => setFormProfessor({ ...formProfessor, nome: e.target.value })}
                data-testid="input-teacher-name"
              />
            </div>
            <div className="space-y-1">
              <Label>Modalidade</Label>
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
              disabled={!formProfessor.nome || !formProfessor.modalidade}
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
                  <TableHead>Check-ins</TableHead>
                  <TableHead>Mensalidade</TableHead>
                  <TableHead>Último Check-in</TableHead>
                  <TableHead>Status</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
