import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const RECURSO_COLORS = [
  "#3b82f6","#22c55e","#f97316","#a855f7","#ec4899","#eab308","#ef4444","#6b7280",
];

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const TIPO_COLORS: Record<string, string> = {
  aluguel: "bg-blue-100 text-blue-800 border-blue-200",
  dayuse: "bg-green-100 text-green-800 border-green-200",
  bloqueio: "bg-red-100 text-red-700 border-red-200",
};
const TIPO_LABEL: Record<string, string> = {
  aluguel: "Aluguel",
  dayuse: "Day-use",
  bloqueio: "Indisponível",
};

export default function QuadrasPublicas() {
  const { id: arenaId } = useParams<{ id: string }>();
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: arena } = useQuery<any>({
    queryKey: ["/api/arena/public", arenaId],
    queryFn: () => fetch(`/api/arena/${arenaId}`).then((r) => r.json()),
  });

  const { data: recursosList = [] } = useQuery<any[]>({
    queryKey: ["/api/recursos/public", arenaId],
    queryFn: () => fetch(`/api/recursos/publico/${arenaId}`).then((r) => r.json()),
  });

  const today = new Date();
  const weekStart = addDays(startOfWeek(today), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: reservasList = [] } = useQuery<any[]>({
    queryKey: ["/api/reservas/public", arenaId, weekOffset],
    queryFn: () =>
      fetch(`/api/reservas/publico/${arenaId}?dataInicio=${toISO(weekDays[0])}&dataFim=${toISO(weekDays[6])}`).then((r) => r.json()),
  });

  const reservasPorDia = (recursoId: string, data: string) =>
    (reservasList as any[]).filter((r) => r.recursoId === recursoId && r.data === data && r.status !== "cancelado");

  const mesLabel = (() => {
    const ms = new Set(weekDays.map((d) => d.getMonth()));
    if (ms.size === 1) return `${MESES_PT[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`;
    return `${MESES_PT[weekDays[0].getMonth()]} / ${MESES_PT[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{arena?.name ?? "Arena"}</h1>
            <p className="text-sm text-gray-500">Disponibilidade de Ambientes</p>
            {arena?.endereco && (
              <p className="text-xs text-gray-400 mt-0.5">{arena.endereco}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Semana anterior
          </Button>
          <div className="text-center">
            <p className="font-semibold text-gray-800">{mesLabel}</p>
            <p className="text-xs text-gray-500">
              {weekDays[0].toLocaleDateString("pt-BR")} — {weekDays[6].toLocaleDateString("pt-BR")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o + 1)}>
            Próxima semana <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {recursosList.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhum ambiente cadastrado</p>
            <p className="text-sm mt-1">Entre em contato com a arena para reservas.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {recursosList.map((recurso: any, idx: number) => {
              const cor = RECURSO_COLORS[idx % RECURSO_COLORS.length];
              return (
                <div key={recurso.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderLeftColor: cor, borderLeftWidth: 4 }}>
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cor }} />
                    <h3 className="font-semibold text-gray-900">{recurso.nome}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="grid min-w-[700px]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                      {weekDays.map((day, i) => {
                        const iso = toISO(day);
                        const isToday = iso === toISO(today);
                        const reservas = reservasPorDia(recurso.id, iso);
                        const isPast = day < new Date(toISO(today));
                        return (
                          <div key={i} className={`border-r last:border-r-0 min-h-[120px] ${isPast ? "bg-gray-50" : ""}`}>
                            <div className={`text-center py-2 border-b text-xs font-medium ${isToday ? "bg-blue-50 text-blue-700" : "text-gray-500"}`}>
                              <div>{DIAS_PT[day.getDay()]}</div>
                              <div className={`text-base font-bold mt-0.5 ${isToday ? "text-blue-600" : "text-gray-800"}`}>
                                {day.getDate()}
                              </div>
                            </div>
                            <div className="p-1.5 space-y-1">
                              {reservas.length === 0 ? (
                                <div className={`text-center py-3 text-xs ${isPast ? "text-gray-300" : "text-green-600 font-medium"}`}>
                                  {isPast ? "—" : "Disponível"}
                                </div>
                              ) : (
                                reservas.map((r: any) => (
                                  <div key={r.id} className={`rounded px-1.5 py-1 text-xs border ${TIPO_COLORS[r.tipo] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                    <div className="font-semibold">{r.horaInicio}–{r.horaFim}</div>
                                    <div className="truncate">{TIPO_LABEL[r.tipo] ?? r.tipo}</div>
                                    {r.tipo !== "bloqueio" && r.nomeCliente && (
                                      <div className="truncate text-[10px] opacity-70">{r.nomeCliente}</div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 items-center justify-center">
          {Object.entries(TIPO_LABEL).map(([tipo, label]) => (
            <span key={tipo} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium ${TIPO_COLORS[tipo]}`}>
              {label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium text-green-700 bg-green-50 border-green-200">
            Disponível
          </span>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Entre em contato com a arena para fazer sua reserva.
        </p>
      </div>
    </div>
  );
}
