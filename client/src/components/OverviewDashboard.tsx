import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  UserMinus,
  UserPlus,
  Activity,
  Clock,
  DollarSign,
  Receipt,
} from "lucide-react";

interface OverviewDashboardProps {
  alunos?: any[];
  onBack?: () => void;
}

function fmt(valor: string | number) {
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const colorMap = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorMap[variant]}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${colorMap[variant]}`} data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function OverviewDashboard({ alunos = [], onBack }: OverviewDashboardProps) {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics"],
    refetchInterval: 60_000,
  });

  const { data: inativos = [] } = useQuery<any[]>({
    queryKey: ["/api/alunos/inativos"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const a = analytics?.alunos ?? {};
  const f = analytics?.financeiro ?? {};
  const c = analytics?.checkins ?? {};
  const d = analytics?.distribuicao ?? {};

  const porPlano: Record<string, number> = d.porPlano ?? {};
  const porIntegracao: Record<string, number> = d.porIntegracao ?? {};

  const integracaoLabel: Record<string, string> = {
    mensalista: "Mensalistas",
    wellhub: "Wellhub",
    totalpass: "TotalPass",
  };

  const maxPlano = Math.max(...Object.values(porPlano).map(Number), 1);
  const maxInteg = Math.max(...Object.values(porIntegracao).map(Number), 1);

  return (
    <div className="space-y-6" data-testid="overview-dashboard">

      {/* Bloco 1 — Cartões de resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Alunos Ativos"
          value={a.total ?? 0}
          sub={`+${a.novosMes ?? 0} este mês`}
          icon={Users}
          variant="default"
        />
        <StatCard
          title="Receita do Mês"
          value={fmt(f.receitaMes ?? "0")}
          sub="pagamentos confirmados"
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Valor Pendente"
          value={fmt(f.pendentesValor ?? "0")}
          sub={`${f.cobrancasPendentes ?? 0} cobranças em aberto`}
          icon={Receipt}
          variant={Number(f.pendentesValor ?? 0) > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Check-ins do Mês"
          value={c.totalMes ?? 0}
          sub="presenças registradas"
          icon={Activity}
          variant="default"
        />
      </div>

      {/* Bloco 2 — Alunos */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Movimentação de alunos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimentação de Alunos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Novos este mês</span>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">{a.novosMes ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Desativados este mês</span>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{a.desativadosMes ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total inativos</span>
              </div>
              <Badge variant="outline">{inativos.length}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Baixa frequência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Baixa Frequência
              <Badge variant="outline" className="ml-auto">{a.baixaFrequencia ?? 0} alunos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(a.baixaFrequenciaLista ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <span className="text-sm">Todos os alunos estão frequentando!</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(a.baixaFrequenciaLista ?? []).slice(0, 8).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{s.nome}</p>
                      <p className="text-xs text-muted-foreground">{s.modalidade}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {s.ultimoCheckin ? `último: ${s.ultimoCheckin}` : "nunca veio"}
                    </span>
                  </div>
                ))}
                {(a.baixaFrequenciaLista ?? []).length > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{(a.baixaFrequenciaLista ?? []).length - 8} outros
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco 3 — Financeiro */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Cobranças pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Cobranças em Aberto
              <Badge variant="outline" className="ml-auto">{f.cobrancasPendentes ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(f.pendentesLista ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <span className="text-sm">Nenhuma cobrança pendente!</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(f.pendentesLista ?? []).slice(0, 8).map((p: any) => {
                  const aluno = alunos.find((a: any) => a.id === p.studentId);
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{aluno?.nome ?? "Aluno desativado"}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.tipo === "pagamento" ? `Mensalidade ${p.dueDate}` : `Cobrança — venc. ${p.dueDate}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{fmt(p.amount)}</span>
                        <Badge variant={p.status === "overdue" ? "destructive" : "secondary"} className="text-xs">
                          {p.status === "overdue" ? "Atrasado" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {(f.pendentesLista ?? []).length > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{(f.pendentesLista ?? []).length - 8} outros
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por tipo de integração */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Alunos por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(porIntegracao).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado disponível</p>
            ) : (
              Object.entries(porIntegracao).map(([tipo, qty]) => (
                <div key={tipo} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{integracaoLabel[tipo] ?? tipo}</span>
                    <span className="text-muted-foreground">{qty} aluno{Number(qty) !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(Number(qty) / maxInteg) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco 4 — Distribuição por plano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alunos por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(porPlano).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum dado disponível</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(porPlano).map(([plano, qty]) => (
                <div key={plano} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate max-w-[70%]">{plano}</span>
                    <span className="text-muted-foreground">{qty}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${(Number(qty) / maxPlano) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
