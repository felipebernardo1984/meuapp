import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, DollarSign, Zap, Save, ChevronUp, ChevronDown, ChevronLeft } from "lucide-react";
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

  const allModalidades = Array.from(new Set([
    ...professores.map((p: any) => p.modalidade),
    ...alunos.map((a: any) => a.modalidade),
  ])).filter(Boolean).sort();

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

  const getLocal = (modalidade: string): LocalEdit => {
    if (editando[modalidade]) return editando[modalidade];
    const cfg = getConfig(modalidade);
    return {
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

  const handleSalvar = (modalidade: string) => {
    const local = getLocal(modalidade);
    salvarMutation.mutate({
      modalidade,
      dados: {
        wellhubPlanoMinimo: local.wellhubPlanoMinimo || null,
        wellhubValorCheckin: local.wellhubValorCheckin || "0.00",
        totalpassPlanoMinimo: local.totalpassPlanoMinimo || null,
        totalpassValorCheckin: local.totalpassValorCheckin || "0.00",
      },
    });
  };

  const showConfiguracoes = !section || section === "configuracoes";
  const showIntegracoes = !section || section === "integracoes";

  const headingIcon = section === "integracoes" ? <Zap className="h-6 w-6" /> : <Settings className="h-6 w-6" />;
  const headingTitle = section === "integracoes" ? "Integrações" : "Configurações por Modalidade";
  const headingDesc = section === "integracoes"
    ? "Configure as integrações TotalPass e Wellhub (Gympass)"
    : "Gerencie valores por check-in por integração e modalidade";

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {headingIcon}
          {headingTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{headingDesc}</p>
      </div>

      {showConfiguracoes && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Valor por Check-in por Modalidade
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setModalidadesMinimizado(!modalidadesMinimizado)}
                data-testid="button-toggle-modalidades"
              >
                {modalidadesMinimizado ? (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Mostrar modalidades
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Minimizar modalidades
                  </>
                )}
              </Button>
            </div>
            {!modalidadesMinimizado && (
              <CardDescription>
                Configure os valores separados por integração (Wellhub e TotalPass) para cada modalidade. Esses valores são usados para calcular a receita gerada automaticamente.
              </CardDescription>
            )}
          </CardHeader>
          {!modalidadesMinimizado && (
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : allModalidades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma modalidade cadastrada. Cadastre professores ou alunos primeiro.
                </p>
              ) : (
                <div className="space-y-4">
                  {allModalidades.map((modalidade) => {
                    const local = getLocal(modalidade);
                    const isDirty = !!editando[modalidade];
                    return (
                      <div
                        key={modalidade}
                        className="border rounded-lg p-4 space-y-4"
                        data-testid={`card-modalidade-settings-${modalidade}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-base">{modalidade}</h3>
                          <div className="flex items-center gap-2">
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
                          </div>
                        </div>

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
                                Valor por Check-in (R$)
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
                                Valor por Check-in (R$)
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

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onVoltar} data-testid="button-voltar-settings-bottom">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Settings className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Configurações</h1>
        </div>
      </div>
    </div>
  );
}
