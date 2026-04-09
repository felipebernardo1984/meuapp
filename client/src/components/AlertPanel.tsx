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
      <TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-sm">
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
        <div className="flex items-center gap-3">
          {onVoltar && (
            <Button variant="outline" size="sm" onClick={onVoltar} data-testid="button-alerts-back">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar
            </Button>
          )}
          <h1 className="text-2xl font-bold" data-testid="text-alerts-title">
            Painel de Alertas
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-alerts-refresh"
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
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card data-testid="card-overdue-count">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Inadimplentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive" data-testid="text-overdue-count">
                  {overduePayments.length}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-near-due-count">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Vencendo em breve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600" data-testid="text-near-due-count">
                  {paymentsNearDue.length}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-low-frequency-count">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  Baixa frequência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600" data-testid="text-low-frequency-count">
                  {lowFrequencyStudents.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Section: Inadimplentes */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Inadimplentes
                {overduePayments.length > 0 && (
                  <Badge variant="destructive" data-testid="badge-overdue-count">
                    {overduePayments.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Dias em atraso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overduePayments.length === 0 ? (
                      <EmptyRow message="Nenhum aluno inadimplente" />
                    ) : (
                      overduePayments.map((item) => (
                        <TableRow key={`${item.studentId}-${item.dueDate}`} data-testid={`row-overdue-${item.studentId}`}>
                          <TableCell className="font-medium" data-testid={`text-overdue-name-${item.studentId}`}>
                            {item.studentName}
                          </TableCell>
                          <TableCell data-testid={`text-overdue-amount-${item.studentId}`}>
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell data-testid={`text-overdue-days-${item.studentId}`}>
                            <Badge variant="destructive">
                              {item.daysOverdue} {item.daysOverdue === 1 ? "dia" : "dias"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Section: Vencendo em breve */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Vencendo em breve
                {paymentsNearDue.length > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300" data-testid="badge-near-due-count">
                    {paymentsNearDue.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Dias para vencer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsNearDue.length === 0 ? (
                      <EmptyRow message="Nenhum pagamento vencendo em breve" />
                    ) : (
                      paymentsNearDue.map((item) => (
                        <TableRow key={`${item.studentId}-${item.dueDate}`} data-testid={`row-near-due-${item.studentId}`}>
                          <TableCell className="font-medium" data-testid={`text-near-due-name-${item.studentId}`}>
                            {item.studentName}
                          </TableCell>
                          <TableCell data-testid={`text-near-due-amount-${item.studentId}`}>
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell data-testid={`text-near-due-days-${item.studentId}`}>
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              {item.daysUntilDue} {item.daysUntilDue === 1 ? "dia" : "dias"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Section: Baixa frequência */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                Baixa frequência
                {lowFrequencyStudents.length > 0 && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300" data-testid="badge-low-frequency-count">
                    {lowFrequencyStudents.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Check-ins (30 dias)</TableHead>
                      <TableHead>Dias sem check-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowFrequencyStudents.length === 0 ? (
                      <EmptyRow message="Nenhum aluno com baixa frequência" />
                    ) : (
                      lowFrequencyStudents.map((item) => (
                        <TableRow key={item.studentId} data-testid={`row-low-freq-${item.studentId}`}>
                          <TableCell className="font-medium" data-testid={`text-low-freq-name-${item.studentId}`}>
                            {item.studentName}
                          </TableCell>
                          <TableCell data-testid={`text-low-freq-checkins-${item.studentId}`}>
                            <span className="text-muted-foreground">
                              {item.checkinsLast30Days}/{item.expectedCheckins30Days}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-low-freq-days-${item.studentId}`}>
                            {item.daysSinceLastCheckin !== null ? (
                              <Badge variant="outline" className="text-blue-600 border-blue-300">
                                {item.daysSinceLastCheckin} {item.daysSinceLastCheckin === 1 ? "dia" : "dias"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">Nunca fez check-in</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
