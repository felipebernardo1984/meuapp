import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  GraduationCap,
  CreditCard,
  CheckCircle2,
  ListChecks,
  PercentCircle,
  MessageCircle,
  Settings,
  AlertCircle,
  BookOpen,
  ChevronRight,
  Zap,
  UserCheck,
  Receipt,
  BarChart2,
} from "lucide-react";
import { useState } from "react";

interface HelpSection {
  id: string;
  icon: any;
  title: string;
  badge?: string;
  content: HelpItem[];
}

interface HelpItem {
  titulo: string;
  descricao: string;
  passos?: string[];
  dica?: string;
}

const secoes: HelpSection[] = [
  {
    id: "primeiros-passos",
    icon: Zap,
    title: "Primeiros Passos",
    badge: "Início",
    content: [
      {
        titulo: "Sequência recomendada para configurar a arena",
        descricao: "Siga esta ordem para ter o sistema funcionando corretamente desde o início:",
        passos: [
          "1. Configure as Modalidades e valores por check-in (seção Configurações → Modalidades)",
          "2. Crie os Planos de treino dos alunos (ex: 1x por semana, Mensalista)",
          "3. Cadastre os Professores com os dados de acesso e % de comissão",
          "4. Cadastre os Alunos vinculando cada um a um plano e modalidade",
          "5. Configure o WhatsApp para envio de mensagens automáticas (opcional)",
          "6. Configure o PIX para recebimento de mensalidades (opcional)",
        ],
        dica: "Sem modalidades e planos configurados, não é possível cadastrar alunos corretamente.",
      },
    ],
  },
  {
    id: "alunos",
    icon: Users,
    title: "Alunos",
    content: [
      {
        titulo: "Cadastrar um aluno",
        descricao: "Acesse a seção 'Alunos' e clique em 'Cadastrar Aluno'. Preencha os dados obrigatórios:",
        passos: [
          "Nome completo e CPF (obrigatórios)",
          "Login e senha de acesso — o aluno usa para entrar no sistema",
          "Modalidade — ex: Beach Tennis, Futevôlei",
          "Tipo de integração: Mensalista, Wellhub ou TotalPass",
          "Plano de treino — define quantos check-ins por mês o aluno tem direito",
        ],
        dica: "O aluno só acessa o sistema depois de ser aprovado pelo gestor.",
      },
      {
        titulo: "Aprovar um aluno",
        descricao: "Alunos cadastrados aparecem na lista 'Aprovações Pendentes'. Clique em 'Aprovar' para liberar o acesso. Antes da aprovação, o aluno não consegue fazer login.",
      },
      {
        titulo: "Editar dados do aluno",
        descricao: "Clique no botão de três pontos (⋯) ao lado do aluno e selecione 'Editar'. É possível alterar nome, login, plano, status de mensalidade e número de check-ins realizados.",
      },
      {
        titulo: "Desativar / Reativar aluno",
        descricao: "Em vez de excluir, o sistema usa desativação suave. O aluno fica na aba 'Inativos' e pode ser reativado a qualquer momento sem perda de histórico.",
        passos: [
          "Para desativar: clique em ⋯ → 'Desativar'",
          "Para reativar: aba 'Inativos' → botão 'Reativar'",
        ],
      },
      {
        titulo: "Check-in manual",
        descricao: "O gestor ou professor pode registrar check-ins manualmente. Acesse o card do aluno → ⋯ → 'Check-in Manual'. É possível informar data e hora personalizadas.",
        dica: "Check-ins só são liberados para alunos com mensalidade em dia (exceto integrações Wellhub/TotalPass).",
      },
    ],
  },
  {
    id: "professores",
    icon: GraduationCap,
    title: "Professores",
    content: [
      {
        titulo: "Cadastrar professor",
        descricao: "Na seção 'Professores', clique em 'Cadastrar Professor'. Preencha os dados:",
        passos: [
          "Nome, CPF, e-mail e telefone",
          "Login e senha — o professor usa para acessar o sistema",
          "Modalidade — aulas que o professor ministra",
          "Comissão (%) — percentual sobre a receita gerada pelos check-ins atribuídos a ele",
        ],
        dica: "Anote as credenciais geradas e entregue ao professor. A senha não pode ser recuperada automaticamente.",
      },
      {
        titulo: "Comissão do professor",
        descricao: "O sistema calcula automaticamente a comissão quando um check-in é referenciado como 'Aula' para aquele professor. A fórmula é: Valor do check-in × % de comissão.",
        dica: "A comissão fica com status 'Pendente' até o gestor aprovar ou editar o valor.",
      },
      {
        titulo: "Editar percentual de comissão",
        descricao: "Clique no ícone de edição (lápis) ao lado do professor. O campo 'Comissão (%)' está no formulário. Altere e salve — os próximos check-ins referenciados usarão o novo percentual.",
      },
    ],
  },
  {
    id: "checkins",
    icon: ListChecks,
    title: "Check-ins e Referenciamento",
    content: [
      {
        titulo: "O que é o referenciamento de check-in?",
        descricao: "Todo check-in nasce como 'Pendente'. O referenciamento define o contexto daquele check-in:",
        passos: [
          "Aula → vincula ao professor responsável e gera comissão automática",
          "Day-use → check-in avulso sem vínculo com aula",
          "Avulso → outro contexto livre (ex: evento, cortesia)",
        ],
        dica: "Isso evita que check-ins de day-use sejam contabilizados como aula do professor.",
      },
      {
        titulo: "Como referenciar um check-in",
        descricao: "Na seção 'Professores', clique em 'Log de Check-ins'. Aparecerá a lista de todos os check-ins da arena.",
        passos: [
          "Use os filtros no topo para ver apenas os Pendentes, por exemplo",
          "Clique em 'Referenciar' na linha do check-in desejado",
          "Selecione o tipo (Aula, Day-use ou Avulso)",
          "Se for Aula, escolha o professor responsável",
          "Clique em 'Confirmar' — a comissão é calculada automaticamente",
        ],
        dica: "É possível alterar a referência depois clicando em 'Alterar'.",
      },
      {
        titulo: "Plano Básico vs Plano Premium",
        descricao: "No Plano Básico, o check-in é sempre manual — o professor ou gestor aperta o botão. No Plano Premium (futuro), o check-in via Wellhub/TotalPass aparece automaticamente no log para referenciamento.",
      },
    ],
  },
  {
    id: "comissoes",
    icon: PercentCircle,
    title: "Gestão de Comissões",
    content: [
      {
        titulo: "Visualizar comissões",
        descricao: "Na seção 'Professores', clique em 'Comissões'. O painel mostra:",
        passos: [
          "Resumo por professor: % configurado, check-ins referenciados, receita gerada e total de comissão",
          "Histórico detalhado: cada comissão individual com status (Pendente, Aprovado, Editado, Cancelado)",
        ],
      },
      {
        titulo: "Aprovar uma comissão",
        descricao: "Na tabela detalhada, clique em 'Aprovar' para confirmar o pagamento daquela comissão ao professor. O status muda de Pendente para Aprovado.",
      },
      {
        titulo: "Editar o valor de uma comissão",
        descricao: "Se o check-in gerou valor zero (por duplicidade ou integração) ou se o gestor quiser ajustar, clique em 'Editar'. É possível alterar o valor e adicionar uma observação explicando o motivo.",
        dica: "O status muda para 'Editado' para manter rastreabilidade de que o valor foi alterado manualmente.",
      },
    ],
  },
  {
    id: "planos",
    icon: BookOpen,
    title: "Planos de Treino",
    content: [
      {
        titulo: "Criar um plano",
        descricao: "Na seção 'Planos', clique em 'Novo Plano'. Um plano pode ser:",
        passos: [
          "Por check-ins: define o número de check-ins mensais (ex: 8 check-ins = 2x por semana)",
          "Mensalista: define um valor fixo mensal sem limite de check-ins",
          "Não é possível ter os dois ao mesmo tempo",
        ],
        dica: "Planos mensalistas são usados para alunos com pagamento fixo. Planos por check-in são usados para controle de frequência.",
      },
      {
        titulo: "Editar ou excluir um plano",
        descricao: "Clique no lápis para editar ou no botão de excluir. Atenção: ao editar, todos os alunos vinculados a esse plano têm os dados de plano atualizados automaticamente.",
      },
    ],
  },
  {
    id: "financeiro",
    icon: CreditCard,
    title: "Financeiro",
    content: [
      {
        titulo: "Registrar pagamento de mensalidade",
        descricao: "No card do aluno, clique em ⋯ → 'Registrar Pagamento'. Informe o mês de referência, valor, data de vencimento e status (Pago, Pendente ou Atrasado).",
      },
      {
        titulo: "Lançar cobrança extra",
        descricao: "Para cobranças avulsas (ex: equipamento, evento), clique em ⋯ → 'Lançar Cobrança'. Informe a descrição, valor e data de vencimento.",
      },
      {
        titulo: "Histórico financeiro do aluno",
        descricao: "Clique em ⋯ → 'Histórico Financeiro' para ver todas as mensalidades e cobranças do aluno, com opção de remover lançamentos.",
      },
      {
        titulo: "Configurar PIX",
        descricao: "Acesse 'Configurações' no menu superior do painel. Configure o nome do recebedor e chave PIX. O sistema gera um QR Code para pagamentos.",
      },
      {
        titulo: "Receita por check-in",
        descricao: "Cada check-in gera automaticamente um registro financeiro com o valor configurado para aquela modalidade e tipo de integração. Esse valor é salvo no momento do check-in e não muda com alterações futuras de configuração.",
      },
    ],
  },
  {
    id: "whatsapp",
    icon: MessageCircle,
    title: "WhatsApp Automático",
    content: [
      {
        titulo: "Configurar o número do WhatsApp",
        descricao: "Clique no botão 'WhatsApp' no painel de alunos → aba 'Básico'. Informe o número com DDD (ex: 5511999999999) e personalize a mensagem padrão. Variáveis disponíveis: {{nome}}, {{status}}, {{checkins}}.",
      },
      {
        titulo: "Automação de cobrança",
        descricao: "Na aba 'Cobrança', ative o envio automático para alunos com mensalidade atrasada. Configure:",
        passos: [
          "Dias após vencimento para iniciar os disparos",
          "Número máximo de disparos",
          "Intervalo entre disparos (dias)",
          "Mensagem personalizada",
        ],
      },
      {
        titulo: "Automação de assiduidade",
        descricao: "Na aba 'Assiduidade', ative mensagens para alunos que não aparecem há X dias. Configure os mesmos parâmetros de cobrança.",
      },
      {
        titulo: "Fila de disparos",
        descricao: "Na aba 'Fila', veja todos os disparos pendentes. Clique no link de cada um para abrir diretamente no WhatsApp Web e enviar a mensagem. Marque como enviado após cada disparo.",
        dica: "O botão 'Executar automação' gera os disparos com base nas regras configuradas. Execute periodicamente ou deixe rodar automaticamente.",
      },
    ],
  },
  {
    id: "modalidades",
    icon: Settings,
    title: "Modalidades e Integrações",
    content: [
      {
        titulo: "Configurar valor por check-in",
        descricao: "Acesse 'Configurações' → 'Modalidades'. Para cada modalidade registrada, defina:",
        passos: [
          "Valor padrão por check-in (alunos mensalistas sem integração)",
          "Valor Wellhub por check-in (alunos com Gympass)",
          "Valor TotalPass por check-in",
          "Plano mínimo exigido para cada integração",
        ],
        dica: "Cada tipo de integração pode ter um valor diferente pois o repasse das operadoras varia.",
      },
      {
        titulo: "Planos de integração (TotalPass / Wellhub)",
        descricao: "Cadastre os planos das operadoras com seus respectivos valores de repasse. Isso permite que o sistema valide automaticamente se o plano do aluno cobre a modalidade da arena.",
      },
    ],
  },
  {
    id: "alertas",
    icon: AlertCircle,
    title: "Alertas Automáticos",
    content: [
      {
        titulo: "Relatório de alertas",
        descricao: "O sistema analisa diariamente os dados da arena e gera alertas em três categorias:",
        passos: [
          "Mensalidades próximas do vencimento (alunos mensalistas com pagamento nos próximos 3 dias)",
          "Mensalidades atrasadas (pagamentos vencidos)",
          "Baixa frequência (alunos com menos de 50% dos check-ins esperados no mês)",
        ],
        dica: "Acesse 'Alertas' no menu superior para ver o relatório atualizado.",
      },
    ],
  },
  {
    id: "visao-geral",
    icon: BarChart2,
    title: "Visão Geral / Analytics",
    content: [
      {
        titulo: "Dashboard de análise",
        descricao: "Clique em 'Visão Geral' no topo do painel para acessar o dashboard de analytics. Ele mostra:",
        passos: [
          "KPIs: total de alunos, receita total, check-ins no período, mensalidades em atraso",
          "Gráfico de movimentação de alunos (entradas e saídas)",
          "Distribuição por plano e por tipo de integração (Mensalista, Wellhub, TotalPass)",
          "Lista financeira dos alunos com receita gerada por cada um",
        ],
      },
    ],
  },
  {
    id: "assinatura",
    icon: UserCheck,
    title: "Assinatura do Sistema",
    content: [
      {
        titulo: "Planos disponíveis",
        descricao: "O sistema Seven Sports tem dois planos:",
        passos: [
          "Plano Básico — check-in manual, gestão completa de alunos/professores/financeiro",
          "Plano Premium — inclui integração automática com Wellhub e TotalPass, log de check-in automático e referenciamento",
        ],
      },
      {
        titulo: "Pagar a assinatura",
        descricao: "No card 'Assinatura do Sistema', clique em 'Pagar assinatura'. Selecione o método de pagamento e siga as instruções.",
      },
    ],
  },
];

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  const [secaoAtiva, setSecaoAtiva] = useState("primeiros-passos");
  const secao = secoes.find((s) => s.id === secaoAtiva) ?? secoes[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            Manual do Sistema — Seven Sports
            <Badge variant="secondary" className="ml-2 text-xs">v2.5</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 pb-3 border-b">
            Guia completo de configuração e uso do painel do gestor.
          </p>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar de seções */}
          <div className="w-52 shrink-0 border-r overflow-y-auto py-2">
            {secoes.map((s) => {
              const Icon = s.icon;
              const ativo = s.id === secaoAtiva;
              return (
                <button
                  key={s.id}
                  onClick={() => setSecaoAtiva(s.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors
                    ${ativo
                      ? "bg-primary/10 text-primary font-semibold border-r-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  data-testid={`help-section-${s.id}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.title}</span>
                  {s.badge && <Badge className="ml-auto text-[10px] px-1.5 py-0">{s.badge}</Badge>}
                </button>
              );
            })}
          </div>

          {/* Conteúdo da seção */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              {(() => { const Icon = secao.icon; return <Icon className="h-5 w-5 text-primary" />; })()}
              <h2 className="text-lg font-bold">{secao.title}</h2>
            </div>

            <div className="space-y-5">
              {secao.content.map((item, i) => (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <h3 className="font-semibold text-sm">{item.titulo}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 pl-6">{item.descricao}</p>

                  {item.passos && (
                    <ul className="pl-6 space-y-1">
                      {item.passos.map((passo, j) => (
                        <li key={j} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{passo}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.dica && (
                    <div className="mt-3 ml-6 flex items-start gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
                      <Zap className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">{item.dica}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Seven Sports · Atualizado em Mai/2026</p>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-close-help"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
