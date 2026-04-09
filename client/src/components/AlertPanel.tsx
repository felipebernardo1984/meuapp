import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Clock, TrendingDown, ArrowLeft, RefreshCw } from "lucide-react";

interface AutomationReport {
  generatedAt: string;
  arenaId: string;
  paymentsNearDue: Array<{
    studentId: string;
    studentName: string;
    amount: string;
    dueDate: string;
    referenceMonth: string;
    daysUntilDue: number;
  }>;
  overduePayments: Array<{
    studentId: string;
    studentName: string;
    amount: string;
    dueDate: string;
    referenceMonth: string;
    daysOverdue: number;
  }>;
  lowFrequencyStudents: Array<{
    studentId: string;
    studentName: string;
    integrationType: string;
    checkinsLast30Days: number;
    expectedCheckins30Days: number;
    lastCheckinDate: string | null;
    daysSinceLastCheckin: number | null;
  }>;
}

interface AlertPanelProps {
  arenaId: string;
  onVoltar?: () => void;
}

function formatCurrency(value: string) {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function EmptyRow({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
        {message}
      </TableCell>
    </TableRow>
  );
}

export default function AlertPanel({ arenaId, onVoltar }: AlertPanelProps) {
  const {
    data: report,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<AutomationReport>({
    queryKey: ["/api/automation/report", arenaId],
    queryFn: () => fetch(`/api/automation/report/${arenaId}`).then((r) => r.json()),
    enabled: !!arenaId,
  });

  const overduePayments = report?.overduePayments ?? [];
  const paymentsNearDue = report?.paymentsNearDue ?? [];
  const lowFrequencyStudents = report?.lowFrequencyStudents ?? [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Painel de Alertas</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-atualizar-alertas"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Carregando alertas...
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Inadimplentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">
                  {overduePayments.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Vencendo em breve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  {paymentsNearDue.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  Baixa frequência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {lowFrequencyStudents.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Inadimplentes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Inadimplentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overduePayments.length === 0 ? (
                    <EmptyRow message="Nenhum aluno inadimplente" />
                  ) : (
                    overduePayments.map((item) => (
                      <TableRow key={item.studentId}>
                        <TableCell className="font-medium">{item.studentName}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {item.daysOverdue} dias
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            className="text-sm text-red-600 underline hover:opacity-70"
                            onClick={() => alert(`Cobrança enviada para ${item.studentName}`)}
                          >
                            Cobrar
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Vencendo */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Vencendo em breve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsNearDue.length === 0 ? (
                    <EmptyRow message="Nenhum pagamento próximo" />
                  ) : (
                    paymentsNearDue.map((item) => (
                      <TableRow key={item.studentId}>
                        <TableCell className="font-medium">{item.studentName}</TableCell>
                        <TableCell>{formatCurrency(item.amount)}</TableCell>
                        <TableCell>
                          <Badge className="text-orange-600 border-orange-300">
                            {item.daysUntilDue} dias
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            className="text-sm text-orange-600 underline hover:opacity-70"
                            onClick={() => alert(`Lembrete enviado para ${item.studentName}`)}
                          >
                            Lembrar
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Baixa frequência */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                Baixa frequência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Check-ins</TableHead>
                    <TableHead>Dias sem</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowFrequencyStudents.length === 0 ? (
                    <EmptyRow message="Nenhum aluno com baixa frequência" />
                  ) : (
                    lowFrequencyStudents.map((item) => (
                      <TableRow key={item.studentId}>
                        <TableCell className="font-medium">{item.studentName}</TableCell>
                        <TableCell>
                          {item.checkinsLast30Days}/{item.expectedCheckins30Days}
                        </TableCell>
                        <TableCell>
                          {item.daysSinceLastCheckin ?? "-"}
                        </TableCell>
                        <TableCell>
                          <button
                            className="text-sm text-blue-600 underline hover:opacity-70"
                            onClick={() => alert(`Mensagem enviada para ${item.studentName}`)}
                          >
                            Reengajar
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {onVoltar && (
        <div className="flex justify-start pt-6 pb-8">
          <Button variant="outline" onClick={onVoltar} data-testid="button-voltar-alertas">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Button>
        </div>
      )}
    </div>
  );
}