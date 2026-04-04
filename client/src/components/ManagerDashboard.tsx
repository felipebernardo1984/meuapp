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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle, XCircle, UserCheck, UserPlus, Pencil, Trash2, Plus } from "lucide-react";
import type { Plano } from "@/pages/Home";

interface AlunoGestor {
  id: string;
  nome: string;
  cpf: string;
  modalidade: string;
  plano: number;
  planoTitulo: string;
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
  login: string;
  senha: string;
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
  onCadastrarAluno: (dados: NovoAlunoDados) => void;
  onCriarPlano: (titulo: string, checkins: number) => void;
  onEditarPlano: (id: string, titulo: string, checkins: number) => void;
  onExcluirPlano: (id: string) => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
}

export default function ManagerDashboard({
  planos,
  alunos,
  professores,
  onAprovarAluno,
  onCadastrarProfessor,
  onCadastrarAluno,
  onCriarPlano,
  onEditarPlano,
  onExcluirPlano,
  onExportarPDF,
  onExportarExcel,
}: ManagerDashboardProps) {
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");
  const [dialogProfessor, setDialogProfessor] = useState(false);
  const [dialogNovoAluno, setDialogNovoAluno] = useState(false);
  const [dialogNovoPLano, setDialogNovoPlano] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
  const [novoProfessor, setNovoProfessor] = useState({ nome: "", modalidade: "" });
  const [novoAluno, setNovoAluno] = useState<NovoAlunoDados>({
    nome: "",
    login: "",
    senha: "",
    cpf: "",
    modalidade: "",
    planoId: planos[0]?.id ?? "",
  });
  const [formPlano, setFormPlano] = useState({ titulo: "", checkins: "" });

  const handleCadastrarAluno = () => {
    if (novoAluno.nome && novoAluno.login && novoAluno.senha && novoAluno.cpf && novoAluno.modalidade && novoAluno.planoId) {
      onCadastrarAluno(novoAluno);
      const plano = planos.find((p) => p.id === novoAluno.planoId);
      alert(
        `Aluno cadastrado!\n\nLogin: ${novoAluno.login}\nSenha: ${novoAluno.senha}\nPlano: ${plano?.titulo}\n\nEntregue as credenciais ao aluno.`
      );
      setNovoAluno({ nome: "", login: "", senha: "", cpf: "", modalidade: "", planoId: planos[0]?.id ?? "" });
      setDialogNovoAluno(false);
    }
  };

  const handleCadastrarProfessor = () => {
    if (novoProfessor.nome && novoProfessor.modalidade) {
      onCadastrarProfessor(novoProfessor.nome, novoProfessor.modalidade);
      setNovoProfessor({ nome: "", modalidade: "" });
      setDialogProfessor(false);
    }
  };

  const abrirEditarPlano = (plano: Plano) => {
    setPlanoEditando(plano);
    setFormPlano({ titulo: plano.titulo, checkins: String(plano.checkins) });
  };

  const handleSalvarPlano = () => {
    const checkins = parseInt(formPlano.checkins);
    if (!formPlano.titulo || !checkins || checkins < 1) return;
    if (planoEditando) {
      onEditarPlano(planoEditando.id, formPlano.titulo, checkins);
      setPlanoEditando(null);
    } else {
      onCriarPlano(formPlano.titulo, checkins);
      setDialogNovoPlano(false);
    }
    setFormPlano({ titulo: "", checkins: "" });
  };

  const alunosFiltrados = alunos.filter((aluno) =>
    filtroModalidade === "todas" || aluno.modalidade === filtroModalidade
  );
  const alunosPendentes = alunos.filter((a) => !a.aprovado);
  const modalidades = Array.from(new Set(alunos.map((a) => a.modalidade)));

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-manager-title">
          Painel do Gestor
        </h1>
        <p className="text-muted-foreground">Seven Sports - Controle Total</p>
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

      {/* Planos */}
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
                  <p className="text-sm text-muted-foreground">{plano.checkins} check-ins por ciclo</p>
                </div>
                <div className="flex items-center gap-2">
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

            <Dialog open={dialogNovoPLano} onOpenChange={setDialogNovoPlano}>
              <DialogTrigger asChild>
                <button
                  className="w-full flex items-center gap-2 p-3 rounded-md text-sm text-muted-foreground hover-elevate border border-dashed border-border"
                  data-testid="button-add-plan"
                >
                  <Plus className="h-4 w-4" />
                  Criar novo plano
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Plano</DialogTitle>
                  <DialogDescription>
                    Defina o título e quantos check-ins o aluno deve realizar no ciclo.
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
                    <Label>Quantidade de check-ins</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 8, 12, 16..."
                      value={formPlano.checkins}
                      onChange={(e) => setFormPlano({ ...formPlano, checkins: e.target.value })}
                      data-testid="input-plan-checkins"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogNovoPlano(false)}>Cancelar</Button>
                  <Button
                    onClick={handleSalvarPlano}
                    disabled={!formPlano.titulo || !formPlano.checkins || parseInt(formPlano.checkins) < 1}
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
                    Alterações serão aplicadas a todos os alunos neste plano.
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
                    <Label>Quantidade de check-ins</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 8"
                      value={formPlano.checkins}
                      onChange={(e) => setFormPlano({ ...formPlano, checkins: e.target.value })}
                      data-testid="input-edit-plan-checkins"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPlanoEditando(null)}>Cancelar</Button>
                  <Button
                    onClick={handleSalvarPlano}
                    disabled={!formPlano.titulo || !formPlano.checkins || parseInt(formPlano.checkins) < 1}
                    data-testid="button-confirm-edit-plan"
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Professores */}
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
              </div>
            ))}

            <Dialog open={dialogProfessor} onOpenChange={setDialogProfessor}>
              <DialogTrigger asChild>
                <button
                  className="w-full flex items-center gap-2 p-3 rounded-md text-sm text-muted-foreground hover-elevate border border-dashed border-border"
                  data-testid="button-add-teacher"
                >
                  <UserPlus className="h-4 w-4" />
                  Cadastrar professor
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Professor</DialogTitle>
                  <DialogDescription>
                    O professor receberá senha padrão "admin" que poderá ser alterada após o primeiro acesso.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input
                      placeholder="Digite o nome completo"
                      value={novoProfessor.nome}
                      onChange={(e) => setNovoProfessor({ ...novoProfessor, nome: e.target.value })}
                      data-testid="input-teacher-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modalidade</Label>
                    <Select
                      value={novoProfessor.modalidade}
                      onValueChange={(value) => setNovoProfessor({ ...novoProfessor, modalidade: value })}
                    >
                      <SelectTrigger data-testid="select-teacher-modality">
                        <SelectValue placeholder="Selecione a modalidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beach Tennis">Beach Tennis</SelectItem>
                        <SelectItem value="Vôlei de Praia">Vôlei de Praia</SelectItem>
                        <SelectItem value="Futevôlei">Futevôlei</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogProfessor(false)}>Cancelar</Button>
                  <Button
                    onClick={handleCadastrarProfessor}
                    disabled={!novoProfessor.nome || !novoProfessor.modalidade}
                    data-testid="button-confirm-add-teacher"
                  >
                    Cadastrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Aprovações pendentes */}
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
                    <p className="text-sm text-muted-foreground">
                      {aluno.modalidade} — {aluno.cpf}
                    </p>
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

      {/* Tabela de alunos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg">Alunos</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Dialog open={dialogNovoAluno} onOpenChange={setDialogNovoAluno}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-student-manager">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Cadastrar Aluno
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
                    <DialogDescription>
                      Defina login e senha para o aluno. Entregue as credenciais após o cadastro.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1">
                      <Label>Nome Completo</Label>
                      <Input
                        placeholder="Nome do aluno"
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
                          <SelectItem value="Beach Tennis">Beach Tennis</SelectItem>
                          <SelectItem value="Vôlei de Praia">Vôlei de Praia</SelectItem>
                          <SelectItem value="Futevôlei">Futevôlei</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Login</Label>
                      <Input
                        placeholder="Ex: joao.silva ou CPF"
                        value={novoAluno.login}
                        onChange={(e) => setNovoAluno({ ...novoAluno, login: e.target.value })}
                        data-testid="input-manager-student-login"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Senha</Label>
                      <Input
                        placeholder="Crie uma senha para o aluno"
                        value={novoAluno.senha}
                        onChange={(e) => setNovoAluno({ ...novoAluno, senha: e.target.value })}
                        data-testid="input-manager-student-password"
                      />
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
                              {p.titulo} — {p.checkins} check-ins
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
                      disabled={!novoAluno.nome || !novoAluno.login || !novoAluno.senha || !novoAluno.cpf || !novoAluno.modalidade || !novoAluno.planoId}
                      data-testid="button-confirm-manager-student"
                    >
                      Cadastrar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
                <SelectTrigger className="w-40" data-testid="select-modality">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {modalidades.map((mod) => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={onExportarPDF} data-testid="button-export-pdf">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={onExportarExcel} data-testid="button-export-excel">
                <Download className="h-4 w-4 mr-2" />
                Excel
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
                    <TableCell>{aluno.checkinsRealizados}/{aluno.plano}</TableCell>
                    <TableCell>
                      <Badge variant={aluno.statusMensalidade === "Em dia" ? "default" : "destructive"}>
                        {aluno.statusMensalidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {aluno.ultimoCheckin || "-"}
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
