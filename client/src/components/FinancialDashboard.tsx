import { useState, useEffect } from "react";
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
import { DollarSign, TrendingUp, Clock, AlertCircle, QrCode, Settings, CheckCircle } from "lucide-react";

interface FinancialDashboardProps {
  alunos: Array<{ id: string; nome: string }>;
}

function statusBadge(status: string) {
  if (status === "paid") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pago</Badge>;
  if (status === "overdue") return <Badge variant="destructive">Atrasado</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300">Pendente</Badge>;
}

export default function FinancialDashboard({ alunos }: FinancialDashboardProps) {
  const qc = useQueryClient();
  const [dialogPix, setDialogPix] = useState(false);
  const [pixForm, setPixForm] = useState({ receiverName: "", pixKey: "", pixQrcodeImage: "" });

  const { data: summary } = useQuery<any>({ queryKey: ["/api/finance/summary"] });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ["/api/finance/payments"] });
  const { data: charges = [] } = useQuery<any[]>({ queryKey: ["/api/finance/charges"] });
  const { data: pixSettings } = useQuery<any>({ queryKey: ["/api/finance/settings"] });

  useEffect(() => {
    if (pixSettings) {
      setPixForm({ receiverName: pixSettings.receiverName ?? "", pixKey: pixSettings.pixKey ?? "", pixQrcodeImage: pixSettings.pixQrcodeImage ?? "" });
    }
  }, [pixSettings]);

  const updatePayment = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/finance/payments/${id}`, { status, paymentDate: new Date().toLocaleDateString("pt-BR") }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      qc.invalidateQueries({ queryKey: ["/api/finance/summary"] });
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

  const savePix = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/finance/settings", pixForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/finance/settings"] });
      setDialogPix(false);
    },
  });

  const getNomeAluno = (id: string) => alunos.find((a) => a.id === id)?.nome ?? "—";

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-financial-title">Dashboard Financeiro</h1>
        <Button variant="outline" size="sm" onClick={() => setDialogPix(true)} data-testid="button-pix-settings">
          <Settings className="h-4 w-4 mr-2" />
          Configurar PIX
        </Button>
      </div>

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
              R$ {(summary?.faturamentoMes ?? 0).toFixed(2).replace(".", ",")}
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

      {/* Payments table */}
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
                  {payments.map((p: any) => (
                    <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                      <TableCell className="font-medium">{getNomeAluno(p.studentId)}</TableCell>
                      <TableCell>{p.referenceMonth}</TableCell>
                      <TableCell>R$ {p.amount}</TableCell>
                      <TableCell>{p.dueDate}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.paymentDate ?? "—"}</TableCell>
                      <TableCell>
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
      <Card>
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
                      <TableCell>{c.dueDate}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.paymentDate ?? "—"}</TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PIX Settings Dialog */}
      <Dialog open={dialogPix} onOpenChange={setDialogPix}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Configurações PIX
            </DialogTitle>
            <DialogDescription>
              Configure os dados PIX que serão exibidos para os alunos ao realizar pagamentos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome do Recebedor</Label>
              <Input
                placeholder="Nome completo ou razão social"
                value={pixForm.receiverName}
                onChange={(e) => setPixForm({ ...pixForm, receiverName: e.target.value })}
                data-testid="input-pix-receiver"
              />
            </div>
            <div className="space-y-1">
              <Label>Chave PIX</Label>
              <Input
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                value={pixForm.pixKey}
                onChange={(e) => setPixForm({ ...pixForm, pixKey: e.target.value })}
                data-testid="input-pix-key"
              />
            </div>
            <div className="space-y-1">
              <Label>URL do QR Code PIX (opcional)</Label>
              <Input
                placeholder="https://..."
                value={pixForm.pixQrcodeImage}
                onChange={(e) => setPixForm({ ...pixForm, pixQrcodeImage: e.target.value })}
                data-testid="input-pix-qrcode"
              />
              <p className="text-xs text-muted-foreground">Cole a URL de imagem do QR Code gerado pelo seu banco.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogPix(false)}>Cancelar</Button>
            <Button onClick={() => savePix.mutate()} disabled={savePix.isPending} data-testid="button-save-pix">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
