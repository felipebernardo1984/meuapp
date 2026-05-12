import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp, Users, Activity, DollarSign, Search,
  BarChart3, ChevronDown, CheckCircle, Clock, AlertCircle
} from "lucide-react";
import { DateRangePicker, DateRange, currentMonthRange } from "@/components/ui/date-range-picker";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const TIPO_CONFIG: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  dayuse:   { label: "Day Use",  bg: "bg-orange-100 dark:bg-orange-900/30",  text: "text-orange-700 dark:text-orange-400",  bar: "bg-orange-500" },
  aula:     { label: "Aula",     bg: "bg-purple-100 dark:bg-purple-900/30",  text: "text-purple-700 dark:text-purple-400",  bar: "bg-purple-500" },
  avulso:   { label: "Avulso",   bg: "bg-blue-100 dark:bg-blue-900/30",      text: "text-blue-700 dark:text-blue-400",      bar: "bg-blue-500"   },
  pendente: { label: "Pendente", bg: "bg-gray-100 dark:bg-gray-800",         text: "text-gray-600 dark:text-gray-400",      bar: "bg-gray-400"   },
};

const INTEG_CONFIG: Record<string, { label: string; color: string }> = {
  wellhub:   { label: "Wellhub",   color: "bg-green-500" },
  totalpass: { label: "TotalPass", color: "bg-cyan-500"  },
  none:      { label: "Direto",    color: "bg-slate-400"  },
};

function tipoBadge(tipo: string) {
  const cfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function BarProgress({ value, max, color, label, count }: { value: number; max: number; color: string; label: string; count: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium truncate max-w-[140px]">{label}</span>
        <span className="text-muted-foreground ml-2 shrink-0">{count} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color, badge
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string; badge?: React.ReactNode
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg ${color ?? "bg-primary/10"}`}>{icon}</div>
          {badge}
        </div>
        <p className="text-2xl font-bold mt-1" data-testid="stat-value">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1 font-medium">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Visão Geral ───────────────────────────────────────────────────────────────
function VisaoGeral() {
  const now = new Date();
  const [range, setRange] = useState<DateRange | null>(currentMonthRange());

  const mes = range ? range.inicio.slice(5, 7) : String(now.getMonth() + 1);
  const ano = range ? range.inicio.slice(0, 4) : String(now.getFullYear());

  const { data: vg, isLoading } = useQuery<any>({
    queryKey: ["/api/finance/relatorio/visao-geral", mes, ano],
    queryFn: () => fetch(`/api/finance/relatorio/visao-geral?mes=${mes}&ano=${ano}`).then(r => r.json()),
  });

  const maxDia = Math.max(...(vg?.porDia ?? []).map((d: any) => d.count), 1);
  const maxTipo = Math.max(...(vg?.porTipo ?? []).map((d: any) => d.count), 1);
  const maxMod = Math.max(...(vg?.porModalidade ?? []).map((d: any) => d.count), 1);
  const totalMens = (vg?.mensalidadesPagas ?? 0) + (vg?.mensalidadesPendentes ?? 0) + (vg?.mensalidadesAtrasadas ?? 0);

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker value={range} onChange={setRange} align="start" />
        {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Carregando...</span>}
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Activity className="h-4 w-4 text-purple-600" />}
          label="Check-ins no mês"
          value={vg?.totalCheckins ?? 0}
          color="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard
          icon={<Users className="h-4 w-4 text-blue-600" />}
          label="Visitantes únicos"
          value={vg?.visitantesUnicos ?? 0}
          color="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 text-green-600" />}
          label="Receita total"
          value={fmt(vg?.receitaTotal ?? 0)}
          sub={`Check-ins: ${fmt(vg?.receitaCheckins ?? 0)}`}
          color="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-orange-600" />}
          label="Mensalidades pagas"
          value={`${vg?.mensalidadesPagas ?? 0}/${totalMens}`}
          sub={totalMens > 0 ? `${Math.round(((vg?.mensalidadesPagas ?? 0) / totalMens) * 100)}% adimplência` : undefined}
          color="bg-orange-100 dark:bg-orange-900/30"
          badge={
            (vg?.mensalidadesAtrasadas ?? 0) > 0
              ? <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">{vg.mensalidadesAtrasadas} atrasadas</span>
              : undefined
          }
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Distribuição por tipo de check-in */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(vg?.porTipo ?? []).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem check-ins neste período</p>}
            {(vg?.porTipo ?? []).sort((a: any, b: any) => b.count - a.count).map((t: any) => {
              const cfg = TIPO_CONFIG[t.tipo] ?? TIPO_CONFIG.pendente;
              return (
                <BarProgress key={t.tipo} label={cfg.label} value={t.count} max={maxTipo} count={t.count} color={cfg.bar} />
              );
            })}
          </CardContent>
        </Card>

        {/* Distribuição por modalidade */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Distribuição por Modalidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(vg?.porModalidade ?? []).length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sem dados de modalidade</p>}
            {(vg?.porModalidade ?? []).sort((a: any, b: any) => b.count - a.count).map((m: any, i: number) => {
              const colors = ["bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-green-500", "bg-cyan-500", "bg-rose-500"];
              return (
                <BarProgress key={m.modalidade} label={m.modalidade} value={m.count} max={maxMod} count={m.count} color={colors[i % colors.length]} />
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Receita por integração */}
      {((vg?.receitaWellhub ?? 0) > 0 || (vg?.receitaTotalpass ?? 0) > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Receita por Integração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Wellhub</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">{fmt(vg?.receitaWellhub ?? 0)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
                <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">TotalPass</p>
                <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">{fmt(vg?.receitaTotalpass ?? 0)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Mensalidades</p>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{fmt(vg?.receitaMensalidades ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status de mensalidades */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            Status de Mensalidades — {MESES[parseInt(mes) - 1]}/{ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{vg?.mensalidadesPagas ?? 0}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Pagas</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{vg?.mensalidadesPendentes ?? 0}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Pendentes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{vg?.mensalidadesAtrasadas ?? 0}</p>
              <p className="text-xs text-red-600 dark:text-red-400">Atrasadas</p>
            </div>
          </div>
          {totalMens > 0 && (
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Adimplência</span>
                <span className="font-medium">{Math.round(((vg?.mensalidadesPagas ?? 0) / totalMens) * 100)}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((vg?.mensalidadesPagas ?? 0) / totalMens) * 100}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${((vg?.mensalidadesPendentes ?? 0) / totalMens) * 100}%` }} />
                <div className="h-full bg-red-500 transition-all" style={{ width: `${((vg?.mensalidadesAtrasadas ?? 0) / totalMens) * 100}%` }} />
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Pago</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Pendente</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Atrasado</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mini gráfico de check-ins por dia */}
      {(vg?.porDia ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              Check-ins por Dia — {MESES[parseInt(mes) - 1]}/{ano}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-24">
              {(vg?.porDia ?? []).map((d: any) => {
                const h = Math.max((d.count / maxDia) * 100, 4);
                return (
                  <div key={d.dia} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    <div className="w-full rounded-t relative group" style={{ height: `${h}%`, background: "linear-gradient(to top, #7c3aed, #a78bfa)" }}>
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Dia {d.dia}: {d.count}
                      </div>
                    </div>
                    {(d.dia % 5 === 0 || d.dia === 1) && (
                      <span className="text-[9px] text-muted-foreground">{d.dia}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">Cada barra = 1 dia do mês</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Pagamento por Visitante ───────────────────────────────────────────────────
function PagamentoPorVisitante() {
  const [range, setRange] = useState<DateRange | null>(currentMonthRange());
  const [busca, setBusca] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const inicio = range?.inicio ?? "";
  const fim = range?.fim ?? "";

  const params = new URLSearchParams(Object.fromEntries(
    Object.entries({ dataInicio: inicio, dataFim: fim }).filter(([, v]) => v)
  )).toString();

  const { data: visitantes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/finance/relatorio/por-visitante", inicio, fim],
    queryFn: () => fetch(`/api/finance/relatorio/por-visitante?${params}`).then(r => r.json()),
  });

  const filtrado = busca
    ? visitantes.filter(v => v.nome.toLowerCase().includes(busca.toLowerCase()) || (v.cpf ?? "").replace(/\D/g, "").includes(busca.replace(/\D/g, "")))
    : visitantes;

  const totalCheckins = filtrado.reduce((a, v) => a + v.totalCheckins, 0);
  const totalReceita = filtrado.reduce((a, v) => a + v.receita, 0);

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
        <DateRangePicker value={range} onChange={setRange} align="start" />
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou CPF..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8 h-8 text-sm" data-testid="input-pv-busca" />
        </div>
      </div>

      {/* Totais */}
      {filtrado.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{filtrado.length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Visitantes</p>
          </div>
          <div className="rounded-xl border p-3 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-center">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{totalCheckins}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Check-ins</p>
          </div>
          <div className="rounded-xl border p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center">
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{fmt(totalReceita)}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Receita</p>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}
      {!isLoading && filtrado.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum visitante encontrado no período</p>
        </div>
      )}

      {/* Lista de visitantes */}
      <div className="space-y-2">
        {filtrado.map((v: any) => {
          const isOpen = expanded === v.studentId;
          return (
            <div key={v.studentId} className="rounded-xl border overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors text-left"
                onClick={() => setExpanded(isOpen ? null : v.studentId)}
                data-testid={`row-visitante-${v.studentId}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{v.nome.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{v.nome}</p>
                    {v.cpf && <p className="text-xs text-muted-foreground">{v.cpf}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-muted-foreground">Último</p>
                    <p className="text-xs font-medium">{v.ultimoCheckin}</p>
                  </div>
                  <div className="text-center w-14">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{v.totalCheckins}</p>
                    <p className="text-xs text-muted-foreground leading-none">checkins</p>
                  </div>
                  {v.receita > 0 && (
                    <div className="text-right w-24 hidden md:block">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(v.receita)}</p>
                      <p className="text-xs text-muted-foreground">receita</p>
                    </div>
                  )}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {v.porModalidade?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Por Modalidade</p>
                        <div className="flex flex-wrap gap-1.5">
                          {v.porModalidade.map((m: any) => (
                            <span key={m.modalidade} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              {m.modalidade}: <strong>{m.count}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {v.porTipo?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Por Tipo</p>
                        <div className="flex flex-wrap gap-1.5">
                          {v.porTipo.map((t: any) => {
                            const cfg = TIPO_CONFIG[t.tipo] ?? TIPO_CONFIG.pendente;
                            return (
                              <span key={t.tipo} className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}: <strong>{t.count}</strong>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {v.receita > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">Receita gerada: <strong className="text-green-600 dark:text-green-400">{fmt(v.receita)}</strong></p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detalhes de Check-ins ─────────────────────────────────────────────────────
function DetalhesCheckins() {
  const [range, setRange] = useState<DateRange | null>(currentMonthRange());

  const inicio = range?.inicio ?? "";
  const fim = range?.fim ?? "";

  const params = new URLSearchParams(Object.fromEntries(
    Object.entries({ dataInicio: inicio, dataFim: fim }).filter(([, v]) => v)
  )).toString();

  const { data: detalhes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/finance/relatorio/detalhes-checkins", inicio, fim],
    queryFn: () => fetch(`/api/finance/relatorio/detalhes-checkins?${params}`).then(r => r.json()),
  });

  const totalReceita = detalhes.reduce((a, d) => a + (d.valor ?? 0), 0);
  const comProfessor = detalhes.filter(d => d.professorNome).length;

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex items-center gap-2 flex-wrap">
        <DateRangePicker value={range} onChange={setRange} align="start" />
      </div>

      {/* Resumo */}
      {detalhes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border p-3 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-center">
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{detalhes.length}</p>
            <p className="text-xs text-violet-600 dark:text-violet-400">Check-ins</p>
          </div>
          <div className="rounded-xl border p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {new Set(detalhes.map(d => d.alunoNome)).size}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Visitantes</p>
          </div>
          <div className="rounded-xl border p-3 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-center">
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{comProfessor}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400">Com professor</p>
          </div>
          <div className="rounded-xl border p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center">
            <p className="text-lg font-bold text-green-700 dark:text-green-300">{fmt(totalReceita)}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Receita total</p>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}
      {!isLoading && detalhes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum check-in encontrado no período</p>
        </div>
      )}

      {/* Tabela */}
      {detalhes.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Data / Hora</TableHead>
                <TableHead className="text-xs font-semibold">Visitante</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Modalidade</TableHead>
                <TableHead className="text-xs font-semibold">Tipo</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Professor</TableHead>
                <TableHead className="text-xs font-semibold text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detalhes.map((d: any, i: number) => (
                <TableRow key={d.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"} data-testid={`row-checkin-${d.id}`}>
                  <TableCell className="py-2">
                    <p className="text-xs font-medium">{d.data}</p>
                    <p className="text-xs text-muted-foreground">{d.hora}</p>
                  </TableCell>
                  <TableCell className="py-2">
                    <p className="text-sm font-medium truncate max-w-[140px]">{d.alunoNome}</p>
                    {d.alunoCpf && <p className="text-xs text-muted-foreground">{d.alunoCpf}</p>}
                  </TableCell>
                  <TableCell className="py-2 hidden sm:table-cell">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      {d.modalidade}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">{tipoBadge(d.tipo)}</TableCell>
                  <TableCell className="py-2 hidden md:table-cell">
                    {d.professorNome
                      ? <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">{d.professorNome}</span>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {d.valor > 0
                      ? <span className="text-sm font-semibold text-green-600 dark:text-green-400">{fmt(d.valor)}</span>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FinancialReports() {
  const [tab, setTab] = useState<"geral" | "visitante" | "detalhes">("geral");

  const TABS = [
    { id: "geral",     label: "Visão Geral",           icon: <BarChart3 className="h-3.5 w-3.5" /> },
    { id: "visitante", label: "Pagamento por Visitante", icon: <Users className="h-3.5 w-3.5" /> },
    { id: "detalhes",  label: "Detalhes de Check-ins",  icon: <Activity className="h-3.5 w-3.5" /> },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Tab nav */}
      <div className="flex overflow-x-auto border-b pb-0 gap-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
            data-testid={`tab-${t.id}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "geral"     && <VisaoGeral />}
      {tab === "visitante" && <PagamentoPorVisitante />}
      {tab === "detalhes"  && <DetalhesCheckins />}
    </div>
  );
}
