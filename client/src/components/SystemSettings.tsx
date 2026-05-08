import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings, DollarSign, Zap, Save, ChevronUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ModalidadeSetting {
  id: string;
  arenaId: string;
  modalidade: string;
  valorPorCheckin: string;
  planoMinimo: string | null;
  totalpassHabilitado: boolean;
  wellhubHabilitado: boolean;
  wellhubPlanoMinimo: string | null;
  wellhubValorCheckin: string;
  totalpassPlanoMinimo: string | null;
  totalpassValorCheckin: string;
}

interface LocalEdit {
  valorPorCheckin: string;
  wellhubPlanoMinimo: string;
  wellhubValorCheckin: string;
  totalpassPlanoMinimo: string;
  totalpassValorCheckin: string;
}

interface SystemSettingsProps {
  onVoltar: () => void;
  section?: "integracoes" | "configuracoes";
}

export default function SystemSettings({ onVoltar, section }: SystemSettingsProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: configuracoes = [], isLoading } = useQuery<ModalidadeSetting[]>({
    queryKey: ["/api/configuracoes/modalidades"],
  });

  const { data: professores = [] } = useQuery<any[]>({
    queryKey: ["/api/professores"],
  });

  const { data: alunos = [] } = useQuery<any[]>({
    queryKey: ["/api/alunos"],
  });

  const dbModalidades = configuracoes.map((c) => c.modalidade);
  const extraModalidades = Array.from(new Set([
    ...professores.map((p: any) => p.modalidade),
    ...alunos.map((a: any) => a.modalidade),
  ])).filter((m) => Boolean(m) && !dbModalidades.includes(m)).sort();
  const allModalidades = [...dbModalidades, ...extraModalidades].sort();

  const getConfig = (modalidade: string): ModalidadeSetting => {
    return configuracoes.find((c) => c.modalidade === modalidade) ?? {
      id: "",
      arenaId: "",
      modalidade,
      valorPorCheckin: "0.00",
      planoMinimo: null,
      totalpassHabilitado: false,
      wellhubHabilitado: false,
      wellhubPlanoMinimo: null,
      wellhubValorCheckin: "0.00",
      totalpassPlanoMinimo: null,
      totalpassValorCheckin: "0.00",
    };
  };

  const [editando, setEditando] = useState<Record<string, LocalEdit>>({});
  const [modalidadesMinimizado, setModalidadesMinimizado] = useState(false);

  const [dialogCriar, setDialogCriar] = useState(false);
  const [novaModalidade, setNovaModalidade] = useState("");
  const [novoValor, setNovoValor] = useState("0.00");

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getLocal = (modalidade: string): LocalEdit => {
    if (editando[modalidade]) return editando[modalidade];
    const cfg = getConfig(modalidade);
    return {
      valorPorCheckin: cfg.valorPorCheckin ?? "0.00",
      wellhubPlanoMinimo: cfg.wellhubPlanoMinimo ?? "",
      wellhubValorCheckin: cfg.wellhubValorCheckin ?? "0.00",
      totalpassPlanoMinimo: cfg.totalpassPlanoMinimo ?? "",
      totalpassValorCheckin: cfg.totalpassValorCheckin ?? "0.00",
    };
  };

  const setLocal = (modalidade: string, field: keyof LocalEdit, value: string) => {
    setEditando((prev) => ({
      ...prev,
      [modalidade]: { ...getLocal(modalidade), [field]: value },
    }));
  };

  const salvarMutation = useMutation({
    mutationFn: ({ modalidade, dados }: { modalidade: string; dados: any }) =>
      apiRequest("PUT", `/api/configuracoes/modalidades/${encodeURIComponent(modalidade)}`, dados).then((r) => r.json()),
    onSuccess: (_, { modalidade }) => {
      qc.invalidateQueries({ queryKey: ["/api/configuracoes/modalidades"] });
      setEditando((prev) => { const next = { ...prev }; delete next[modalidade]; return next; });
      toast({ title: "Configuração salva", description: `Modalidade atualizada com sucesso.` });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" }),
  });

  const criarMutation = useMutation({
    mutationFn: ({ modalidade, valorPorCheckin }: { modalidade: string; valorPorCheckin: string }) =>
      apiRequest("POST", "/api/configuracoes/modalidades", { modalidade, valorPorCheckin }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/configuracoes/modalidades"] });
      setDialogCriar(false);
      setNovaModalidade("");
      setNovoValor("0.00");
      toast({ title: "Modalidade criada", description: "Modalidade adicionada com sucesso." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message ?? "Não foi possível criar.", variant: "destructive" }),
  });

  const deletarMutation = useMutation({
    mutationFn: (modalidade: string) =>
      apiRequest("DELETE", `/api/configuracoes/modalidades/${encodeURIComponent(modalidade)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/configuracoes/modalidades"] });
      setConfirmDelete(null);
      toast({ title: "Modalidade removida" });
    },
    onError: () => toast({ title: "Erro", description: "Não foi possível remover.", variant: "destructive" }),
  });

  const handleSalvar = (modalidade: string) => {
    const local = getLocal(modalidade);
    salvarMutation.mutate({
      modalidade,
      dados: {
        valorPorCheckin: local.valorPorCheckin || "0.00",
        wellhubPlanoMinimo: local.wellhubPlanoMinimo || null,
        wellhubValorCheckin: local.wellhubValorCheckin || "0.00",
        totalpassPlanoMinimo: local.totalpassPlanoMinimo || null,
        totalpassValorCheckin: local.totalpassValorCheckin || "0.00",
      },
    });
  };

  const showConfiguracoes = !section || section === "configuracoes";
  const showIntegracoes = !section || section === "integracoes";

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">

      {/* Dialog Criar Modalidade */}
      <Dialog open={dialogCriar} onOpenChange={(open) => { if (!open) { setDialogCriar(false); setNovaModalidade(""); setNovoValor("0.00"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Modalidade</DialogTitle>
            <DialogDescription>
              Adicione uma nova modalidade à arena. O valor base é usado para check-ins avulsos e day use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nova-modalidade-nome">Nome da Modalidade</Label>
              <Input
                id="nova-modalidade-nome"
                placeholder="Ex: Beach Tennis, Day Use, Vôlei..."
                value={novaModalidade}
                onChange={(e) => setNovaModalidade(e.target.value)}
                data-testid="input-nova-modalidade-nome"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nova-modalidade-valor">Valor Base por Check-in (R$)</Label>
              <Input
                id="nova-modalidade-valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                data-testid="input-nova-modalidade-valor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogCriar(false); setNovaModalidade(""); setNovoValor("0.00"); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => criarMutation.mutate({ modalidade: novaModalidade, valorPorCheckin: novoValor })}
              disabled={!novaModalidade.trim() || criarMutation.isPending}
              data-testid="button-confirm-criar-modalidade"
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Modalidade</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover a modalidade <strong>{confirmDelete}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && deletarMutation.mutate(confirmDelete)}
              disabled={deletarMutation.isPending}
              data-testid="button-confirm-delete-modalidade"
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showConfiguracoes && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Modalidades e Valores por Check-in
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setDialogCriar(true)}
                  size="sm"
                  data-testid="button-criar-modalidade"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Criar Modalidade
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setModalidadesMinimizado(!modalidadesMinimizado)}
                  data-testid="button-toggle-modalidades"
                >
                  {modalidadesMinimizado ? (
                    <><ChevronDown className="h-4 w-4 mr-1" />Mostrar</>
                  ) : (
                    <><ChevronUp className="h-4 w-4 mr-1" />Minimizar</>
                  )}
                </Button>
              </div>
            </div>
            {!modalidadesMinimizado && (
              <CardDescription>
                Configure o valor base por check-in de cada modalidade. Para integração com Wellhub ou TotalPass, preencha os valores de repasse — o sistema cruza automaticamente pelo valor e nome da modalidade.
              </CardDescription>
            )}
          </CardHeader>
          {!modalidadesMinimizado && (
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : allModalidades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma modalidade cadastrada. Clique em "Criar Modalidade" para começar.
                </p>
              ) : (
                <div className="space-y-4">
                  {allModalidades.map((modalidade) => {
                    const local = getLocal(modalidade);
                    const isDirty = !!editando[modalidade];
                    const existsInDb = dbModalidades.includes(modalidade);
                    return (
                      <div
                        key={modalidade}
                        className="border rounded-lg p-4 space-y-4"
                        data-testid={`card-modalidade-settings-${modalidade}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <h3 className="font-semibold text-base">{modalidade}</h3>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {isDirty && <Badge variant="outline" className="text-orange-600 border-orange-300">Alterado</Badge>}
                            <Button
                              size="sm"
                              onClick={() => handleSalvar(modalidade)}
                              disabled={salvarMutation.isPending}
                              data-testid={`button-salvar-settings-${modalidade}`}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Salvar
                            </Button>
                            {existsInDb && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setConfirmDelete(modalidade)}
                                data-testid={`button-delete-modalidade-${modalidade}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Valor base */}
                        <div className="border rounded-md p-3 bg-primary/5 space-y-1">
                          <Label htmlFor={`base-valor-${modalidade}`} className="text-xs font-semibold text-foreground">
                            Valor Base por Check-in (R$)
                          </Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Usado para alunos avulsos, day use e como referência de cruzamento com integrações.
                          </p>
                          <Input
                            id={`base-valor-${modalidade}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={local.valorPorCheckin}
                            onChange={(e) => setLocal(modalidade, "valorPorCheckin", e.target.value)}
                            data-testid={`input-base-valor-${modalidade}`}
                            className="h-8 text-sm max-w-40"
                          />
                        </div>

                        {/* Integrações */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">Wellhub</span>
                              <Badge variant="secondary" className="text-xs">Gympass</Badge>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`wh-plano-${modalidade}`} className="text-xs text-muted-foreground">
                                Plano Mínimo
                              </Label>
                              <Input
                                id={`wh-plano-${modalidade}`}
                                placeholder="Ex: GP1, GP2..."
                                value={local.wellhubPlanoMinimo}
                                onChange={(e) => setLocal(modalidade, "wellhubPlanoMinimo", e.target.value)}
                                data-testid={`input-wellhub-plano-${modalidade}`}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`wh-valor-${modalidade}`} className="text-xs text-muted-foreground">
                                Valor de Repasse (R$)
                              </Label>
                              <Input
                                id={`wh-valor-${modalidade}`}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={local.wellhubValorCheckin}
                                onChange={(e) => setLocal(modalidade, "wellhubValorCheckin", e.target.value)}
                                data-testid={`input-wellhub-valor-${modalidade}`}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>

                          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">TotalPass</span>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`tp-plano-${modalidade}`} className="text-xs text-muted-foreground">
                                Plano Mínimo
                              </Label>
                              <Input
                                id={`tp-plano-${modalidade}`}
                                placeholder="Ex: TP1, TP2..."
                                value={local.totalpassPlanoMinimo}
                                onChange={(e) => setLocal(modalidade, "totalpassPlanoMinimo", e.target.value)}
                                data-testid={`input-totalpass-plano-${modalidade}`}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`tp-valor-${modalidade}`} className="text-xs text-muted-foreground">
                                Valor de Repasse (R$)
                              </Label>
                              <Input
                                id={`tp-valor-${modalidade}`}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={local.totalpassValorCheckin}
                                onChange={(e) => setLocal(modalidade, "totalpassValorCheckin", e.target.value)}
                                data-testid={`input-totalpass-valor-${modalidade}`}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {showIntegracoes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Integrações
            </CardTitle>
            <CardDescription>
              Configurações de API para TotalPass e Wellhub (Gympass).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">TotalPass</h3>
                  <Badge variant="outline" className="text-muted-foreground">Em breve</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Integração com TotalPass para check-ins automáticos e faturamento por plano (TP1, TP2, TP3...).
                </p>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Chave de API</Label>
                  <Input placeholder="Disponível em breve" disabled className="text-xs" />
                </div>
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Wellhub (Gympass)</h3>
                  <Badge variant="outline" className="text-muted-foreground">Em breve</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Integração com Wellhub para check-ins automáticos e controle de beneficiários.
                </p>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Chave de API</Label>
                  <Input placeholder="Disponível em breve" disabled className="text-xs" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
