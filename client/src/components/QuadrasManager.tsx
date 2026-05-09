import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

const RECURSO_COLORS = [
  "#3b82f6","#22c55e","#f97316","#a855f7","#ec4899","#eab308","#ef4444","#6b7280",
];

interface QuadrasManagerProps {
  arenaId: string;
  arenaName?: string;
}

export default function QuadrasManager({ arenaId }: QuadrasManagerProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [novoAmbienteNome, setNovoAmbienteNome] = useState("");
  const [editandoAmbienteId, setEditandoAmbienteId] = useState<string | null>(null);
  const [editandoAmbienteNome, setEditandoAmbienteNome] = useState("");
  const [confirmDeleteAmbiente, setConfirmDeleteAmbiente] = useState<any | null>(null);

  const { data: ambientesList = [] } = useQuery<any[]>({ queryKey: ["/api/recursos"] });

  const criarAmbiente = useMutation({
    mutationFn: (nome: string) => apiRequest("POST", "/api/recursos", { nome, ativo: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recursos"] }); setNovoAmbienteNome(""); toast({ title: "Ambiente criado!" }); },
    onError: () => toast({ title: "Erro ao criar ambiente", variant: "destructive" }),
  });
  const atualizarAmbiente = useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => apiRequest("PUT", `/api/recursos/${id}`, { nome, ativo: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recursos"] }); setEditandoAmbienteId(null); setEditandoAmbienteNome(""); toast({ title: "Ambiente atualizado!" }); },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });
  const removerAmbiente = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/recursos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recursos"] }); setConfirmDeleteAmbiente(null); toast({ title: "Ambiente removido." }); },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const ambientesAtivos = (ambientesList as any[]).filter((a) => a.ativo);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-muted-foreground" /> Ambientes
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quadras, boxes e salas disponíveis para aulas e reservas na sua arena.
        </p>
      </div>

      {/* Form adicionar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={novoAmbienteNome}
          onChange={(e) => setNovoAmbienteNome(e.target.value)}
          placeholder="Nome do ambiente (ex: Quadra 1, Box A, Sala de Treino)"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="input-novo-ambiente"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const nome = novoAmbienteNome.trim();
              if (nome) criarAmbiente.mutate(nome);
            }
          }}
        />
        <Button
          onClick={() => { const nome = novoAmbienteNome.trim(); if (nome) criarAmbiente.mutate(nome); }}
          disabled={criarAmbiente.isPending || !novoAmbienteNome.trim()}
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
        <div className="space-y-2">
          {ambientesAtivos.map((a, idx) => {
            const cor = RECURSO_COLORS[idx % RECURSO_COLORS.length];
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm"
                style={{ borderLeftColor: cor, borderLeftWidth: 4 }}
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cor }} />

                {editandoAmbienteId === a.id ? (
                  <input
                    type="text"
                    value={editandoAmbienteNome}
                    onChange={(e) => setEditandoAmbienteNome(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    data-testid={`input-editar-ambiente-${a.id}`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const nome = editandoAmbienteNome.trim();
                        if (nome) atualizarAmbiente.mutate({ id: a.id, nome });
                      }
                      if (e.key === "Escape") { setEditandoAmbienteId(null); setEditandoAmbienteNome(""); }
                    }}
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium">{a.nome}</span>
                )}

                {editandoAmbienteId === a.id ? (
                  <>
                    <Button size="sm"
                      onClick={() => { const nome = editandoAmbienteNome.trim(); if (nome) atualizarAmbiente.mutate({ id: a.id, nome }); }}
                      disabled={atualizarAmbiente.isPending}
                      data-testid={`button-salvar-ambiente-${a.id}`}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditandoAmbienteId(null); setEditandoAmbienteNome(""); }}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0"
                      onClick={() => { setEditandoAmbienteId(a.id); setEditandoAmbienteNome(a.nome); }}
                      data-testid={`button-editar-ambiente-${a.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => setConfirmDeleteAmbiente(a)}
                      data-testid={`button-excluir-ambiente-${a.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: Confirmar excluir Ambiente */}
      <Dialog open={!!confirmDeleteAmbiente} onOpenChange={(open) => { if (!open) setConfirmDeleteAmbiente(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remover Ambiente</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <strong>{confirmDeleteAmbiente?.nome}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteAmbiente(null)}>Cancelar</Button>
            <Button variant="destructive"
              onClick={() => { if (confirmDeleteAmbiente) removerAmbiente.mutate(confirmDeleteAmbiente.id); }}
              disabled={removerAmbiente.isPending}
              data-testid="button-confirm-delete-ambiente">
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
