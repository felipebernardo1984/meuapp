import { useState } from "react";
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
import { Plus, Pencil, Trash2, Building2, DollarSign } from "lucide-react";

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
}

const emptyEdit = { nome: "", valorAluguel: "", valorDayuse: "" };

export default function QuadrasManager({ arenaId }: QuadrasManagerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [novoNome, setNovoNome] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [confirmDelete, setConfirmDelete] = useState<Ambiente | null>(null);

  const { data: ambientesList = [] } = useQuery<Ambiente[]>({
    queryKey: ["/api/recursos"],
  });

  const criarAmbiente = useMutation({
    mutationFn: (nome: string) =>
      apiRequest("POST", "/api/recursos", { nome, ativo: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recursos"] });
      setNovoNome("");
      toast({ title: "Ambiente criado!" });
    },
    onError: () =>
      toast({ title: "Erro ao criar ambiente", variant: "destructive" }),
  });

  const atualizarAmbiente = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: typeof emptyEdit & { ativo: boolean };
    }) => apiRequest("PUT", `/api/recursos/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recursos"] });
      setEditandoId(null);
      setEditForm(emptyEdit);
      toast({ title: "Ambiente atualizado!" });
    },
    onError: () =>
      toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const removerAmbiente = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/recursos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recursos"] });
      setConfirmDelete(null);
      toast({ title: "Ambiente removido." });
    },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const ambientesAtivos = ambientesList.filter((a) => a.ativo);

  const openEditar = (a: Ambiente) => {
    setEditandoId(a.id);
    setEditForm({
      nome: a.nome,
      valorAluguel: a.valorAluguel ?? "",
      valorDayuse: a.valorDayuse ?? "",
    });
  };

  const handleSalvar = (a: Ambiente) => {
    const nome = editForm.nome.trim();
    if (!nome) return;
    atualizarAmbiente.mutate({
      id: a.id,
      data: {
        nome,
        valorAluguel: editForm.valorAluguel,
        valorDayuse: editForm.valorDayuse,
        ativo: true,
      },
    });
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
          Configure também os valores padrão de reserva e avulso por ambiente.
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
          Nenhum ambiente cadastrado. Adicione acima para criar seu primeiro
          espaço.
        </div>
      ) : (
        <div className="space-y-3">
          {ambientesAtivos.map((a, idx) => {
            const cor = RECURSO_COLORS[idx % RECURSO_COLORS.length];
            const isEditing = editandoId === a.id;
            return (
              <div
                key={a.id}
                className="rounded-lg border bg-card shadow-sm overflow-hidden"
                style={{ borderLeftColor: cor, borderLeftWidth: 4 }}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: cor }}
                  />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.nome}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, nome: e.target.value }))
                      }
                      className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid={`input-editar-ambiente-${a.id}`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditandoId(null);
                          setEditForm(emptyEdit);
                        }
                      }}
                    />
                  ) : (
                    <span className="flex-1 text-sm font-medium">{a.nome}</span>
                  )}

                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSalvar(a)}
                        disabled={atualizarAmbiente.isPending}
                        data-testid={`button-salvar-ambiente-${a.id}`}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditandoId(null);
                          setEditForm(emptyEdit);
                        }}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => openEditar(a)}
                        data-testid={`button-editar-ambiente-${a.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => setConfirmDelete(a)}
                        data-testid={`button-excluir-ambiente-${a.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Prices row */}
                {isEditing ? (
                  <div className="border-t border-border px-4 py-3 grid grid-cols-2 gap-3 bg-muted/30">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Valor aluguel
                      </Label>
                      <Input
                        value={editForm.valorAluguel}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            valorAluguel: e.target.value,
                          }))
                        }
                        placeholder="Ex: R$ 150,00"
                        className="h-8 text-sm"
                        data-testid={`input-valor-aluguel-${a.id}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Valor day-use
                      </Label>
                      <Input
                        value={editForm.valorDayuse}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            valorDayuse: e.target.value,
                          }))
                        }
                        placeholder="Ex: R$ 80,00"
                        className="h-8 text-sm"
                        data-testid={`input-valor-dayuse-${a.id}`}
                      />
                    </div>
                  </div>
                ) : a.valorAluguel || a.valorDayuse ? (
                  <div className="border-t border-border px-4 py-2 flex gap-4 bg-muted/20">
                    {a.valorAluguel && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Aluguel:{" "}
                        <span className="font-medium text-foreground">
                          {a.valorAluguel}
                        </span>
                      </span>
                    )}
                    {a.valorDayuse && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Day-use:{" "}
                        <span className="font-medium text-foreground">
                          {a.valorDayuse}
                        </span>
                      </span>
                    )}
                  </div>
                ) : null}
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
