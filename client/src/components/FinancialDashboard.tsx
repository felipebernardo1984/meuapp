import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Clock, AlertCircle, Settings, CheckCircle, Trash2, ChevronLeft, Search } from "lucide-react";
import { DateRangePicker, DateRange, currentMonthRange } from "@/components/ui/date-range-picker";

function formatarData(str: string | null | undefined): string {
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }
  return str;
}

function formatarMes(str: string | null | undefined): string {
  if (!str) return "";
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split("-");
    return `${m}/${y}`;
  }
  return str;
}

interface ModalidadeSetting {
  id: string;
  arenaId: string;
  modalidade: string;
  valorPorCheckin: string;
  planoMinimo: string | null;
  totalpassHabilitado: boolean;
  wellhubHabilitado: boolean;
}

interface FinancialDashboardProps {
  alunos: Array<{ id: string; nome: string; modalidade?: string; checkinsRealizados?: number }>;
  onVoltar?: () => void;
}

function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pago</Badge>;
  if (status === "overdue") return <Badge variant="destructive">Atrasado</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
}

interface ReceitaSummary {
  totalCheckins: number;
  receitaTotal: number;
  receitaCheckins: number;
  receitaMensalidades: number;
  porModalidade: Array<{ modalidade: string; integrationType: string; checkins: number; receita: number; valorUnitario: number }>;
  porAluno: Array<{ studentId: string; nome: string; modalidade: string; checkins: number; receita: number }>;
}

export default function FinancialDashboard({ alunos, onVoltar }: FinancialDashboardProps) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<{ type: "payment" | "charge"; id: string; label: string } | null>(null);
  const [receitaRange, setReceitaRange] = useState<DateRange | null>(currentMonthRange());
  const [buscaPagamento, setBuscaPagamento] = useState("");

  const receitaParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries({ dataInicio: receitaRange?.inicio ?? "", dataFim: receitaRange?.fim ?? "" }).filter(([, v]) => v !== "")
    )
  ).toString();

  const { data: summary } = useQuery<any>({ queryKey: ["/api/finance/summary"] });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ["/api/finance/payments"] });
  const { data: charges = [] } = useQuery<any[]>({ queryKey: ["/api/finance/charges"] });
  const { data: modalidadeSettings = [] } = useQuery<ModalidadeSetting[]>({ queryKey: ["/api/configuracoes/modalidades"] });
  const { data: receitaSummary } = useQuery<ReceitaSummary>({
    queryKey: ["/api/finance/receita/summary", receitaRange?.inicio, receitaRange?.fim],
    queryFn: () => fetch(`/api/finance/receita/summary?${receitaParams}`).then((r) => r.json()),
  });

  const updatePayment = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/finance/payments/${id}`, { status, paymentDate: new Date().toLocaleDateString("pt-BR") }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/summary"] });
    },
  });

  const deletePayment = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      setConfirmDelete(null);
    },
  });

  const updateCharge = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/finance/charges/${id}`, { status, paymentDate: new Date().toLocaleDateString("pt-BR") }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/charges"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/summary"] });
    },
  });

  const deleteCharge = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finance/charges/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/charges"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/summary"] });
      setConfirmDelete(null);
    },
  });

  const getNomeAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? "—";

  const receitaCheckinsValor = receitaSummary?.receitaCheckins ?? 0;
  const receitaMensalidadesValor = receitaSummary?.receitaMensalidades ?? 0;
  const receitaTotalValor = receitaSummary?.receitaTotal ?? 0;
  const totalCheckins = receitaSummary?.totalCheckins ?? 0;
  const receitaByModalidade = receitaSummary?.porModalidade ?? [];
  const topAlunos = (receitaSummary?.porAluno ?? []).filter((a) => a.receita > 0).slice(0, 5);

  const temConfiguracao = (modalidadeSettings.length > 0 && modalidadeSettings.some((s) => parseFloat(s.valorPorCheckin || "0") > 0)) || (receitaSummary?.porModalidade ?? []).length > 0;
  const temReceitaReal = (receitaSummary?.totalCheckins ?? 0) > 0;

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === "payment") deletePayment.mutate(confirmDelete.id);
    else deleteCharge.mutate(confirmDelete.id);
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      <>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Faturamento do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600" data-testid="text-monthly-revenue">
              {(summary?.faturamentoMes ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Mensalidades Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-paid-count">{summary?.mensalidadesPagas ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Mensalidades Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-500" data-testid="text-pending-count">{summary?.mensalidadesPendentes ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Mensalidades Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive" data-testid="text-overdue-count">{summary?.mensalidadesAtrasadas ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" /> Cobranças Extras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-500" data-testid="text-charges-count">{summary?.totalCobranças ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Receita por Check-in */}
      {temConfiguracao && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Receita por Check-in
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <DateRangePicker value={receitaRange} onChange={setReceitaRange} align="end" />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-muted-foreground">
              <span>Total de check-ins: <strong className="text-foreground" data-testid="text-total-checkins">{totalCheckins}</strong></span>
              <span>Receita check-ins: <strong className="text-green-600 dark:text-green-400" data-testid="text-receita-checkins">{receitaCheckinsValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></span>
              {receitaMensalidadesValor > 0 && (
                <span>Receita mensalidades: <strong className="text-blue-600 dark:text-blue-400" data-testid="text-receita-mensalidades">{receitaMensalidadesValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></span>
              )}
              <span>Total: <strong className="text-foreground font-bold" data-testid="text-receita-total">{receitaTotalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {receitaByModalidade.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Por modalidade</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Integração</TableHead>
                        <TableHead>Check-ins</TableHead>
                        <TableHead>Valor/Check-in</TableHead>
                        <TableHead>Receita Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receitaByModalidade.map((r, i) => (
                        <TableRow key={i} data-testid={`receita-row-${r.modalidade}-${r.integrationType}`}>
                          <TableCell className="font-medium">{r.modalidade}</TableCell>
                          <TableCell>
                            <span className="capitalize text-xs font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {r.integrationType === "wellhub" ? "Wellhub" : r.integrationType === "totalpass" ? "TotalPass" : r.integrationType}
                            </span>
                          </TableCell>
                          <TableCell>{r.checkins}</TableCell>
                          <TableCell>{r.valorUnitario.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                          <TableCell className="font-semibold text-green-600 dark:text-green-400">
                            {r.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {topAlunos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Top alunos por receita gerada</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Aluno</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Check-ins</TableHead>
                        <TableHead>Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topAlunos.map((a, i) => (
                        <TableRow key={i} data-testid={`top-aluno-row-${i}`}>
                          <TableCell className="font-medium">{a.nome}</TableCell>
                          <TableCell>{a.modalidade}</TableCell>
                          <TableCell>{a.checkins}</TableCell>
                          <TableCell className="font-semibold text-green-600 dark:text-green-400">
                            {a.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {!temReceitaReal && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum check-in registrado no período selecionado. Os dados serão exibidos automaticamente conforme os check-ins forem realizados.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payments table */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar aluno por nome..."
          value={buscaPagamento}
          onChange={(e) => setBuscaPagamento(e.target.value)}
          className="pl-9 h-9"
          data-testid="input-busca-pagamento"
        />
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Mensalidades</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma mensalidade registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Mês Ref.</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.filter((p: any) => getNomeAluno(p.studentId).toLowerCase().includes(buscaPagamento.toLowerCase())).map((p: any) => (
                    <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                      <TableCell className="font-medium">{getNomeAluno(p.studentId)}</TableCell>
                      <TableCell>{formatarMes(p.referenceMonth)}</TableCell>
                      <TableCell>R$ {p.amount}</TableCell>
                      <TableCell>{formatarData(p.dueDate)}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.paymentDate ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {p.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updatePayment.mutate({ id: p.id, status: "paid" })}
                              disabled={updatePayment.isPending}
                              data-testid={`button-mark-paid-payment-${p.id}`}
                            >
                              Marcar Pago
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete({ type: "payment", id: p.id, label: `mensalidade de ${getNomeAluno(p.studentId)} (${p.referenceMonth})` })}
                            data-testid={`button-delete-payment-${p.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charges table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Cobranças Extras</CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma cobrança registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((c: any) => (
                    <TableRow key={c.id} data-testid={`charge-row-${c.id}`}>
                      <TableCell className="font-medium">{getNomeAluno(c.studentId)}</TableCell>
                      <TableCell>{c.description}</TableCell>
                      <TableCell>R$ {c.amount}</TableCell>
                      <TableCell>{formatarData(c.dueDate)}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.paymentDate ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {c.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCharge.mutate({ id: c.id, status: "paid" })}
                              disabled={updateCharge.isPending}
                              data-testid={`button-mark-paid-charge-${c.id}`}
                            >
                              Marcar Pago
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete({ type: "charge", id: c.id, label: `cobrança "${c.description}" de ${getNomeAluno(c.studentId)}` })}
                            data-testid={`button-delete-charge-${c.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a {confirmDelete?.label}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletePayment.isPending || deleteCharge.isPending}
              data-testid="button-confirm-delete"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </>
    </div>
  );
}
