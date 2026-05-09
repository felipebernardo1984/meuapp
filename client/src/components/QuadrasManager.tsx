import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Building2, DollarSign, Check, Loader2 } from "lucide-react";

const RECURSO_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#ef4444",
  "#6b7280",
];

interface QuadrasManagerProps {
  arenaId: string;
  arenaName?: string;
}

interface Ambiente {
  id: string;
  nome: string;
  ativo: boolean;
  valorAluguel?: string | null;
  valorDayuse?: string | null;
  duracaoMinima?: number | null;
  valorHoraAdicional?: string | null;
}

type AmbienteLocal = {
  nome: string;
  valorAluguel: string;
  valorDayuse: string;
  duracaoMinima: string;
  valorHoraAdicional: string;
};

type SaveStatus = "idle" | "saving" | "saved";

export default function QuadrasManager({ arenaId }: QuadrasManagerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [novoNome, setNovoNome] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Ambiente | null>(null);

  // Per-ambiente local state for always-visible inline editing
  const [localForms, setLocalForms] = useState<Record<string, AmbienteLocal>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const { data: ambientesList = [] } = useQuery<Ambiente[]>({
    queryKey: ["/api/recursos"],
  });

  const criarAmbiente = useMutation({
    mutationFn: (nome: string) =>
      apiRequest("POST", "/api/recursos", { nome, ativo: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recursos"] });
      setNovoNome("");
    },
    onError: () =>
      toast({ title: "Erro ao criar ambiente", variant: "destructive" }),
  });

  const atualizarAmbiente = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PUT", `/api/recursos/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["/api/recursos"] });
      setSaveStatus((p) => ({ ...p, [variables.id]: "saved" }));
      setTimeout(() => {
        setSaveStatus((p) => ({ ...p, [variables.id]: "idle" }));
      }, 2000);
    },
    onError: (_err, variables) => {
      setSaveStatus((p) => ({ ...p, [variables.id]: "idle" }));
      toast({ title: "Erro ao salvar ambiente", variant: "destructive" });
    },
  });

  const removerAmbiente = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/recursos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recursos"] });
      setConfirmDelete(null);
    },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const ambientesAtivos = ambientesList.filter((a) => a.ativo);

  // Get local form values, initializing from server data if not yet edited
  const getLocal = (a: Ambiente): AmbienteLocal =>
    localForms[a.id] ?? {
      nome: a.nome,
      valorAluguel: a.valorAluguel ?? "",
      valorDayuse: a.valorDayuse ?? "",
      duracaoMinima: String(a.duracaoMinima ?? 1),
      valorHoraAdicional: a.valorHoraAdicional ?? "",
    };

  const setField = (id: string, field: keyof AmbienteLocal, value: string, serverAmb: Ambiente) => {
    const current = getLocal(serverAmb);
    const updated = { ...current, [field]: value };
    setLocalForms((p) => ({ ...p, [id]: updated }));
  };

  // Trigger save immediately (called on blur)
  const saveAmb = useCallback(
    (id: string, form: AmbienteLocal) => {
      if (debounceRefs.current[id]) clearTimeout(debounceRefs.current[id]);
      if (!form.nome.trim()) return;
      setSaveStatus((p) => ({ ...p, [id]: "saving" }));
      atualizarAmbiente.mutate({
        id,
        data: {
          nome: form.nome.trim(),
          valorAluguel: form.valorAluguel || null,
          valorDayuse: form.valorDayuse || null,
          duracaoMinima: form.duracaoMinima ? Number(form.duracaoMinima) : 1,
          valorHoraAdicional: form.valorHoraAdicional || null,
          ativo: true,
        },
      });
    },
    [atualizarAmbiente]
  );

  const handleBlur = (id: string, form: AmbienteLocal) => {
    if (debounceRefs.current[id]) clearTimeout(debounceRefs.current[id]);
    debounceRefs.current[id] = setTimeout(() => saveAmb(id, form), 300);
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground" /> Ambientes,
          quadras, boxes e salas disponíveis para aulas e reservas.
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          As alterações são salvas automaticamente ao sair de cada campo.
        </p>
      </div>

      {/* Form adicionar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome do ambiente (ex: Quadra 1, Box A, Sala de Treino)"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="input-novo-ambiente"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const nome = novoNome.trim();
              if (nome) criarAmbiente.mutate(nome);
            }
          }}
        />
        <Button
          onClick={() => {
            const nome = novoNome.trim();
            if (nome) criarAmbiente.mutate(nome);
          }}
          disabled={criarAmbiente.isPending || !novoNome.trim()}
          data-testid="button-criar-ambiente"
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Lista */}
      {ambientesAtivos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum ambiente cadastrado. Adicione acima para criar seu primeiro espaço.
        </div>
      ) : (
        <div className="space-y-4">
          {ambientesAtivos.map((a, idx) => {
            const cor = RECURSO_COLORS[idx % RECURSO_COLORS.length];
            const local = getLocal(a);
            const status = saveStatus[a.id] ?? "idle";
            return (
              <div
                key={a.id}
                className="rounded-lg border bg-card shadow-sm overflow-hidden"
                style={{ borderLeftColor: cor, borderLeftWidth: 4 }}
              >
                {/* Header row: nome + status + delete */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: cor }}
                  />
                  <input
                    type="text"
                    value={local.nome}
                    onChange={(e) => setField(a.id, "nome", e.target.value, a)}
                    onBlur={() => handleBlur(a.id, { ...local })}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid={`input-nome-ambiente-${a.id}`}
                    placeholder="Nome do ambiente"
                  />
                  {/* Save indicator */}
                  <div className="w-5 shrink-0 flex items-center justify-center">
                    {status === "saving" && (
                      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                    )}
                    {status === "saved" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => setConfirmDelete(a)}
                    data-testid={`button-excluir-ambiente-${a.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Price fields — always visible */}
                <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Valor aluguel
                      </Label>
                      <Input
                        value={local.valorAluguel}
                        onChange={(e) => setField(a.id, "valorAluguel", e.target.value, a)}
                        onBlur={() => handleBlur(a.id, { ...local, valorAluguel: local.valorAluguel })}
                        placeholder="Ex: 90,00"
                        className="h-8 text-sm"
                        data-testid={`input-valor-aluguel-${a.id}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Valor day-use
                      </Label>
                      <Input
                        value={local.valorDayuse}
                        onChange={(e) => setField(a.id, "valorDayuse", e.target.value, a)}
                        onBlur={() => handleBlur(a.id, { ...local, valorDayuse: local.valorDayuse })}
                        placeholder="Ex: 50,00"
                        className="h-8 text-sm"
                        data-testid={`input-valor-dayuse-${a.id}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Duração mínima (horas)
                      </Label>
                      <Input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={local.duracaoMinima}
                        onChange={(e) => setField(a.id, "duracaoMinima", e.target.value, a)}
                        onBlur={() => handleBlur(a.id, { ...local, duracaoMinima: local.duracaoMinima })}
                        placeholder="1"
                        className="h-8 text-sm"
                        data-testid={`input-duracao-minima-${a.id}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Hora adicional
                      </Label>
                      <Input
                        value={local.valorHoraAdicional}
                        onChange={(e) => setField(a.id, "valorHoraAdicional", e.target.value, a)}
                        onBlur={() => handleBlur(a.id, { ...local, valorHoraAdicional: local.valorHoraAdicional })}
                        placeholder="Ex: 40,00"
                        className="h-8 text-sm"
                        data-testid={`input-hora-adicional-${a.id}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: Confirmar excluir */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Ambiente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover{" "}
            <strong>{confirmDelete?.nome}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) removerAmbiente.mutate(confirmDelete.id);
              }}
              disabled={removerAmbiente.isPending}
              data-testid="button-confirm-delete-ambiente"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
