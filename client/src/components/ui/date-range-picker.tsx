import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronDown } from "lucide-react";

export type DateRange = { inicio: string; fim: string };

const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export function isoFromDMY(dmy: string): string {
  if (!dmy || dmy.length < 10) return "";
  const [d, m, y] = dmy.split("/");
  return `${y}-${m}-${d}`;
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();
  return {
    inicio: `${y}-${String(m).padStart(2,"0")}-01`,
    fim: `${y}-${String(m).padStart(2,"0")}-${String(last).padStart(2,"0")}`,
  };
}

function drpLabel(value: DateRange | null, presets: { id: string; label: string; range: DateRange | null }[]): string {
  if (!value) return "Mês Atual";
  const match = presets.find(p => p.range && p.range.inicio === value.inicio && p.range.fim === value.fim);
  if (match) return match.label;
  const fmtDay = (iso: string) => iso.slice(8) + "/" + iso.slice(5,7);
  if (value.inicio === value.fim) return `${fmtDay(value.inicio)}/${value.inicio.slice(0,4)}`;
  if (value.inicio.slice(0,7) === value.fim.slice(0,7)) {
    return `${fmtDay(value.inicio)} — ${fmtDay(value.fim)}/${value.fim.slice(0,4)}`;
  }
  return `${fmtDay(value.inicio)}/${value.inicio.slice(0,4)} — ${fmtDay(value.fim)}/${value.fim.slice(0,4)}`;
}

export function DateRangePicker({ value, onChange, align = "end" }: { value: DateRange | null; onChange: (r: DateRange | null) => void; align?: "start" | "end" | "center" }) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string>("mes_atual");
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [calY, setCalY] = useState(() => new Date().getFullYear());
  const [calM, setCalM] = useState(() => new Date().getMonth() + 1);

  const todayISO = (() => { const n = new Date(); return n.toISOString().slice(0,10); })();

  const buildPresets = () => {
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth();
    const sub = (days: number) => new Date(now.getTime() - days * 86400000).toISOString().slice(0,10);
    const firstMonth = `${y}-${String(m+1).padStart(2,"0")}-01`;
    const lastMonth = new Date(y, m+1, 0).toISOString().slice(0,10);
    const firstPrev = `${m === 0 ? y-1 : y}-${String(m === 0 ? 12 : m).padStart(2,"0")}-01`;
    const lastPrev = new Date(y, m, 0).toISOString().slice(0,10);
    return [
      { id: "hoje",     label: "Hoje",             range: { inicio: todayISO, fim: todayISO } },
      { id: "7dias",    label: "Últimos 7 dias",    range: { inicio: sub(6),   fim: todayISO } },
      { id: "30dias",   label: "Últimos 30 dias",   range: { inicio: sub(29),  fim: todayISO } },
      { id: "60dias",   label: "Últimos 60 dias",   range: { inicio: sub(59),  fim: todayISO } },
      { id: "mes_atual",label: "Mês atual",         range: { inicio: firstMonth, fim: lastMonth } },
      { id: "mes_ant",  label: "Mês anterior",      range: { inicio: firstPrev,  fim: lastPrev } },
      { id: "custom",   label: "Definir período",   range: null },
    ];
  };

  const presets = buildPresets();

  const navCal = (delta: number) => {
    let nm = calM + delta; let ny = calY;
    if (nm > 12) { nm = 1; ny++; } if (nm < 1) { nm = 12; ny--; }
    setCalM(nm); setCalY(ny);
  };

  const effectiveRange = (): DateRange | null => {
    if (activePreset === "custom") {
      if (!customStart) return null;
      const fim = customEnd ?? customStart;
      return customStart <= fim ? { inicio: customStart, fim } : { inicio: fim, fim: customStart };
    }
    return presets.find(p => p.id === activePreset)?.range ?? null;
  };

  const handleDayClick = (iso: string) => {
    setActivePreset("custom");
    if (!customStart || (customStart && customEnd)) {
      setCustomStart(iso); setCustomEnd(null);
    } else {
      if (iso < customStart) { setCustomEnd(customStart); setCustomStart(iso); }
      else setCustomEnd(iso);
    }
  };

  const handleApply = () => {
    const r = effectiveRange();
    onChange(r);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setActivePreset("mes_atual");
    setCustomStart(null); setCustomEnd(null);
    setOpen(false);
  };

  const hoverEnd = activePreset === "custom" && customStart && !customEnd && hover
    ? (hover > customStart ? hover : customStart) : null;
  const selStart = effectiveRange()?.inicio ?? null;
  const selEnd = effectiveRange()?.fim ?? hoverEnd ?? null;

  const days = new Date(calY, calM, 0).getDate();
  const offset = (new Date(calY, calM - 1, 1).getDay() + 6) % 7;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-sm gap-1.5 font-normal" data-testid="drp-trigger">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{drpLabel(value, presets)}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="p-0 w-auto">
        <div className="flex">
          <div className="p-3 border-r min-w-[168px] flex flex-col gap-0.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">Período</p>
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => { setActivePreset(p.id); if (p.id !== "custom") { setCustomStart(null); setCustomEnd(null); } }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors hover:bg-muted w-full ${activePreset === p.id ? "bg-muted font-medium" : ""}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${activePreset === p.id ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                  {activePreset === p.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between mb-2 gap-4">
              <button onClick={() => navCal(-1)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">‹</button>
              <span className="text-sm font-semibold capitalize">{MESES_PT[calM-1]} {calY}</span>
              <button onClick={() => navCal(1)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">›</button>
            </div>
            <div className="grid grid-cols-7 gap-px">
              {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => (
                <div key={d} className="text-[10px] text-muted-foreground text-center w-8 h-6 flex items-center justify-center">{d}</div>
              ))}
              {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} className="w-8 h-7" />)}
              {Array.from({ length: days }).map((_, i) => {
                const day = i + 1;
                const iso = `${calY}-${String(calM).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const isToday = iso === todayISO;
                const isStart = iso === selStart;
                const isEnd = iso === selEnd;
                const inSel = selStart && selEnd && iso > selStart && iso < selEnd;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(iso)}
                    onMouseEnter={() => setHover(iso)}
                    onMouseLeave={() => setHover(null)}
                    className={[
                      "w-8 h-7 text-xs rounded transition-colors",
                      isStart || isEnd ? "bg-primary text-primary-foreground font-semibold" : "",
                      inSel ? "bg-primary/15 rounded-none" : "",
                      isToday && !isStart && !isEnd ? "ring-1 ring-primary ring-inset" : "",
                      !isStart && !isEnd && !inSel ? "hover:bg-muted" : "",
                    ].filter(Boolean).join(" ")}
                  >{day}</button>
                );
              })}
            </div>
            {activePreset === "custom" && (
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                {customStart ? customStart.split("-").reverse().join("/") : "Clique no dia inicial"}{customStart && !customEnd ? " → clique no dia final" : ""}{customEnd ? ` → ${customEnd.split("-").reverse().join("/")}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-2 border-t">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleClear}>Limpar</Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleApply}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
