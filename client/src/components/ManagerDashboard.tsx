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
import { Download, CheckCircle, XCircle, UserCheck, UserPlus } from "lucide-react";

interface AlunoGestor {
  id: string;
  nome: string;
  cpf: string;
  modalidade: string;
  plano: 8 | 12;
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

interface ManagerDashboardProps {
  alunos: AlunoGestor[];
  professores: ProfessorGestor[];
  onAprovarAluno: (alunoId: string) => void;
  onCadastrarProfessor: (nome: string, modalidade: string) => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
}

export default function ManagerDashboard({
  alunos,
  professores,
  onAprovarAluno,
  onCadastrarProfessor,
  onExportarPDF,
  onExportarExcel,
}: ManagerDashboardProps) {
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");
  const [filtroProfessor, setFiltroProfessor] = useState<string>("todos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [novoProfessor, setNovoProfessor] = useState({ nome: "", modalidade: "" });

  const alunosFiltrados = alunos.filter((aluno) => {
    const matchModalidade =
      filtroModalidade === "todas" || aluno.modalidade === filtroModalidade;
    const matchProfessor = filtroProfessor === "todos";
    return matchModalidade && matchProfessor;
  });

  const alunosPendentes = alunos.filter((a) => !a.aprovado);
  const modalidades = Array.from(new Set(alunos.map((a) => a.modalidade)));

  const handleCadastrarProfessor = () => {
    if (novoProfessor.nome && novoProfessor.modalidade) {
      onCadastrarProfessor(novoProfessor.nome, novoProfessor.modalidade);
      setNovoProfessor({ nome: "", modalidade: "" });
      setDialogAberto(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" data-testid="text-manager-title">
          Painel do Gestor
        </h1>
        <p className="text-muted-foreground">Seven Sports - Controle Total</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-students">
              {alunos.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alunos Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600" data-testid="text-pending-students">
              {alunosPendentes.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Professores Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-teachers">
              {professores.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Professores
            </CardTitle>
            <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-teacher">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Professor
                </Button>
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
                    <Label htmlFor="nome-professor">Nome Completo</Label>
                    <Input
                      id="nome-professor"
                      placeholder="Digite o nome completo"
                      value={novoProfessor.nome}
                      onChange={(e) =>
                        setNovoProfessor({ ...novoProfessor, nome: e.target.value })
                      }
                      data-testid="input-teacher-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modalidade-professor">Modalidade</Label>
                    <Select
                      value={novoProfessor.modalidade}
                      onValueChange={(value) =>
                        setNovoProfessor({ ...novoProfessor, modalidade: value })
                      }
                    >
                      <SelectTrigger id="modalidade-professor" data-testid="select-teacher-modality">
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
        </CardHeader>
        <CardContent>
          {professores.length > 0 ? (
            <div className="space-y-2">
              {professores.map((professor) => (
                <div
                  key={professor.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-md"
                  data-testid={`teacher-${professor.id}`}
                >
                  <div>
                    <p className="font-medium">{professor.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {professor.modalidade}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum professor cadastrado
            </p>
          )}
        </CardContent>
      </Card>

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
                      {aluno.modalidade} - {aluno.cpf}
                    </p>
                  </div>
                  <Button
                    onClick={() => onAprovarAluno(aluno.id)}
                    data-testid={`button-approve-${aluno.id}`}
                  >
                    Aprovar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg">Relatório de Alunos</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
                <SelectTrigger className="w-40" data-testid="select-modality">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {modalidades.map((mod) => (
                    <SelectItem key={mod} value={mod}>
                      {mod}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={onExportarPDF}
                data-testid="button-export-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={onExportarExcel}
                data-testid="button-export-excel"
              >
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
                    <TableCell>
                      {aluno.plano === 8 ? "1x/semana" : "2x/semana"}
                    </TableCell>
                    <TableCell>
                      {aluno.checkinsRealizados}/{aluno.plano}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          aluno.statusMensalidade === "Em dia"
                            ? "default"
                            : "destructive"
                        }
                      >
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
