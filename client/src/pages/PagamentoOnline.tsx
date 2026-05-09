import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, AlertCircle, Loader2 } from "lucide-react";

export default function PagamentoOnline() {
  const { token } = useParams<{ token: string }>();
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/pagamento/publico", token],
    queryFn: () => fetch(`/api/pagamento/publico/${token}`).then(async (r) => {
      if (!r.ok) throw new Error("Token inválido");
      return r.json();
    }),
    retry: false,
  });

  const confirmar = useMutation({
    mutationFn: () => fetch(`/api/pagamento/publico/${token}/confirmar`, { method: "POST" }).then(async (r) => {
      if (!r.ok) throw new Error("Erro ao confirmar");
      return r.json();
    }),
    onSuccess: () => setConfirmed(true),
  });

  function copiarChave() {
    if (data?.pixKey) {
      navigator.clipboard.writeText(data.pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  function formatMonth(ref: string) {
    if (!ref) return ref;
    const [y, m] = ref.split("-");
    return `${MESES[parseInt(m, 10) - 1]} / ${y}`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-8 pb-8">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Link inválido ou expirado</h2>
            <p className="text-sm text-gray-500">Este link de pagamento não foi encontrado. Solicite um novo à arena.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = data.status === "paid" || confirmed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{data.arenaName}</h1>
          <p className="text-sm text-gray-500 mt-1">Cobrança de Mensalidade</p>
        </div>

        {/* Payment card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">Mensalidade</CardTitle>
              <Badge className={isPaid ? "bg-green-400 text-green-900 border-0" : "bg-yellow-300 text-yellow-900 border-0"}>
                {isPaid ? "Pago" : "Pendente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Aluno</span>
                <span className="font-medium text-gray-900">{data.studentName}</span>
              </div>
              {data.planName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plano</span>
                  <span className="font-medium text-gray-900">{data.planName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Referência</span>
                <span className="font-medium text-gray-900">{formatMonth(data.referenceMonth)}</span>
              </div>
              {data.dueDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vencimento</span>
                  <span className="font-medium text-gray-900">
                    {new Date(data.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 text-center">
              <p className="text-xs text-gray-500 mb-1">Valor</p>
              <p className="text-3xl font-bold text-gray-900">
                R$ {parseFloat(data.amount || "0").toFixed(2).replace(".", ",")}
              </p>
            </div>

            {/* PIX section */}
            {data.pixKey ? (
              <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                <p className="text-sm font-medium text-blue-800">Chave PIX</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-white rounded px-3 py-2 border text-gray-800 break-all">
                    {data.pixKey}
                  </code>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={copiarChave}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {data.receiverName && (
                  <p className="text-xs text-blue-700">Favorecido: <strong>{data.receiverName}</strong></p>
                )}
                {data.pixQrcodeImage && (
                  <div className="flex justify-center">
                    <img src={data.pixQrcodeImage} alt="QR Code PIX" className="h-40 w-40 rounded border bg-white p-1" />
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-3 bg-yellow-50 text-center">
                <p className="text-xs text-yellow-700">
                  Entre em contato com a arena para obter a chave PIX ou outros dados de pagamento.
                </p>
              </div>
            )}

            {/* Confirm button */}
            {isPaid ? (
              <div className="flex items-center justify-center gap-2 py-2 text-green-700 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Pagamento confirmado!</span>
              </div>
            ) : (
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                disabled={confirmar.isPending}
                onClick={() => confirmar.mutate()}
                data-testid="button-confirmar-pagamento"
              >
                {confirmar.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirmando...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Pagamento</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400">
          Após confirmar, a arena será notificada. Em caso de dúvidas, entre em contato.
        </p>
        <p className="text-center text-xs text-gray-300">Seven Sports — Sistema de Gestão</p>
      </div>
    </div>
  );
}
