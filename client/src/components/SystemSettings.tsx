import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Settings, DollarSign, Zap, Save, CheckCircle2 } from "lucide-react";
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
}

interface SystemSettingsProps {
  onVoltar: () => void;
}

export default function SystemSettings({ onVoltar }: SystemSettingsProps) {
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
    };
  };

  const [editando, setEditando] = useState<Record<string, { valorPorCheckin: string; planoMinimo: string; totalpassHabilitado: boolean; wellhubHabilitado: boolean }>>({});

  const getLocal = (modalidade: string) => {
    if (editando[modalidade]) return editando[modalidade];
    const cfg = getConfig(modalidade);
    return {
      valorPorCheckin: cfg.valorPorCheckin,
      planoMinimo: cfg.planoMinimo ?? "",
      totalpassHabilitado: cfg.totalpassHabilitado,
      wellhubHabilitado: cfg.wellhubHabilitado,
    };
  };

  const setLocal = (modalidade: string, field: string, value: any) => {
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
        valorPorCheckin: local.valorPorCheckin || "0.00",
        planoMinimo: local.planoMinimo || null,
        totalpassHabilitado: local.totalpassHabilitado,
        wellhubHabilitado: local.wellhubHabilitado,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onVoltar} data-testid="button-voltar-settings">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações do Sistema
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie integrações e valores por check-in</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            Valor por Check-in por Modalidade
          </CardTitle>
          <CardDescription>
            Configure quanto vale cada check-in em cada modalidade. Esse valor é usado para calcular a receita gerada automaticamente.
          </CardDescription>
        </CardHeader>
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
                      <h3 className="font-semibold">{modalidade}</h3>
                      {isDirty && <Badge variant="outline" className="text-orange-600 border-orange-300">Alterado</Badge>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor={`valor-${modalidade}`}>Valor por Check-in (R$)</Label>
                        <Input
                          id={`valor-${modalidade}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={local.valorPorCheckin}
                          onChange={(e) => setLocal(modalidade, "valorPorCheckin", e.target.value)}
                          data-testid={`input-valor-checkin-${modalidade}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`plano-${modalidade}`}>Plano Mínimo (TotalPass/Wellhub)</Label>
                        <Input
                          id={`plano-${modalidade}`}
                          placeholder="Ex: TP2, TP3..."
                          value={local.planoMinimo}
                          onChange={(e) => setLocal(modalidade, "planoMinimo", e.target.value)}
                          data-testid={`input-plano-minimo-${modalidade}`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`tp-${modalidade}`}
                            checked={local.totalpassHabilitado}
                            onCheckedChange={(v) => setLocal(modalidade, "totalpassHabilitado", v)}
                            data-testid={`switch-totalpass-${modalidade}`}
                          />
                          <Label htmlFor={`tp-${modalidade}`} className="text-sm cursor-pointer">TotalPass</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`wh-${modalidade}`}
                            checked={local.wellhubHabilitado}
                            onCheckedChange={(v) => setLocal(modalidade, "wellhubHabilitado", v)}
                            data-testid={`switch-wellhub-${modalidade}`}
                          />
                          <Label htmlFor={`wh-${modalidade}`} className="text-sm cursor-pointer">Wellhub (Gympass)</Label>
                        </div>
                      </div>
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" />
            Integrações
          </CardTitle>
          <CardDescription>
            Configurações futuras para TotalPass e Wellhub (Gympass). Habilite por modalidade acima.
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

      <div className="flex justify-start pb-8">
        <Button variant="outline" onClick={onVoltar} data-testid="button-voltar-settings-bottom">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Painel
        </Button>
      </div>
    </div>
  );
}
