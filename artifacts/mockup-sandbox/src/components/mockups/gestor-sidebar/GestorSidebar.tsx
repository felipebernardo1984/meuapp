import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  PercentCircle,
  MessageCircle,
  Link2,
  Settings,
  Bell,
  HelpCircle,
  ChevronRight,
  LogOut,
  BarChart2,
  CheckSquare,
  Menu,
  X,
  Badge as BadgeIcon,
  TrendingUp,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type NavItem = {
  id: string;
  label: string;
  icon: any;
  badge?: string | number;
  badgeVariant?: "default" | "destructive" | "secondary" | "outline";
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "overview", label: "Visão Geral", icon: BarChart2 },
    ],
  },
  {
    title: "Gestão",
    items: [
      { id: "alunos", label: "Alunos", icon: Users, badge: 3, badgeVariant: "destructive" },
      { id: "professores", label: "Professores", icon: GraduationCap },
      { id: "planos", label: "Planos", icon: BookOpen },
      { id: "checkins", label: "Check-ins", icon: CheckSquare },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { id: "financeiro", label: "Pagamentos", icon: CreditCard },
      { id: "comissoes", label: "Comissões", icon: PercentCircle, badge: "5 pendentes", badgeVariant: "secondary" },
    ],
  },
  {
    title: "Comunicação & Config",
    items: [
      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
      { id: "integracoes", label: "Integrações", icon: Link2 },
      { id: "configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    title: "Suporte",
    items: [
      { id: "alertas", label: "Alertas", icon: Bell, badge: 2, badgeVariant: "destructive" },
      { id: "ajuda", label: "Ajuda", icon: HelpCircle },
    ],
  },
];

const pageContent: Record<string, { title: string; subtitle: string; color: string; stats?: { label: string; value: string; trend?: string }[] }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Resumo geral da arena",
    color: "bg-blue-500",
    stats: [
      { label: "Total de Alunos", value: "48", trend: "+3 este mês" },
      { label: "Pendentes de Aprovação", value: "3", trend: "Aguardando" },
      { label: "Professores Ativos", value: "5", trend: "2 com comissão" },
      { label: "Receita do Mês", value: "R$ 8.400", trend: "+12% vs anterior" },
    ],
  },
  overview: {
    title: "Visão Geral",
    subtitle: "Analytics e relatórios",
    color: "bg-violet-500",
    stats: [
      { label: "Check-ins este mês", value: "312", trend: "+8% vs anterior" },
      { label: "Taxa de frequência", value: "78%", trend: "Meta: 80%" },
      { label: "Mensalistas", value: "32", trend: "66% do total" },
      { label: "Wellhub / TotalPass", value: "16", trend: "34% do total" },
    ],
  },
  alunos: {
    title: "Alunos",
    subtitle: "Gestão de alunos da arena",
    color: "bg-green-500",
    stats: [
      { label: "Alunos Ativos", value: "45" },
      { label: "Pendentes de Aprovação", value: "3" },
      { label: "Inativos", value: "12" },
      { label: "Inadimplentes", value: "4" },
    ],
  },
  professores: {
    title: "Professores",
    subtitle: "Equipe e comissões",
    color: "bg-orange-500",
    stats: [
      { label: "Professores Ativos", value: "5" },
      { label: "Com % de Comissão", value: "3" },
      { label: "Comissões Pendentes", value: "5" },
      { label: "Total a Pagar", value: "R$ 620" },
    ],
  },
  planos: { title: "Planos de Treino", subtitle: "Planos mensalistas e por check-in", color: "bg-teal-500" },
  checkins: { title: "Check-ins", subtitle: "Log e referenciamento", color: "bg-cyan-500" },
  financeiro: { title: "Pagamentos", subtitle: "Mensalidades e cobranças", color: "bg-emerald-500" },
  comissoes: { title: "Comissões", subtitle: "Comissões por professor", color: "bg-amber-500" },
  whatsapp: { title: "WhatsApp", subtitle: "Automação e fila de mensagens", color: "bg-green-600" },
  integracoes: { title: "Integrações", subtitle: "Wellhub, TotalPass e outras", color: "bg-sky-500" },
  configuracoes: { title: "Configurações", subtitle: "Modalidades, PIX e conta", color: "bg-slate-500" },
  alertas: { title: "Alertas", subtitle: "Notificações automáticas", color: "bg-red-500" },
  ajuda: { title: "Ajuda", subtitle: "Manual e tutoriais do sistema", color: "bg-indigo-500" },
};

export function GestorSidebar() {
  const [activeId, setActiveId] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const page = pageContent[activeId] ?? pageContent["dashboard"];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`
          flex flex-col bg-gray-950 text-white transition-all duration-300 shrink-0
          ${collapsed ? "w-16" : "w-60"}
        `}
      >
        {/* Logo / Header */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-800 ${collapsed ? "justify-center" : ""}`}>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold text-white truncate">Seven Sports</span>
              <span className="text-xs text-gray-400 truncate">Arena Padrão</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.title && !collapsed && (
                <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  {group.title}
                </p>
              )}
              {group.title && collapsed && gi > 0 && (
                <div className="my-2 border-t border-gray-800" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all
                      ${active
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                      }
                      ${collapsed ? "justify-center" : ""}
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <Badge
                            variant={item.badgeVariant ?? "secondary"}
                            className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {collapsed && item.badge !== undefined && (
                      <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-gray-800 p-2 ${collapsed ? "flex justify-center" : ""}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                G
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">Gestor</p>
                <p className="text-[10px] text-gray-400 truncate">Arena Padrão</p>
              </div>
              <button className="p-1 text-gray-400 hover:text-white transition-colors">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              G
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">{page.title}</h1>
            <p className="text-xs text-gray-500">{page.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto p-6">
          {page.stats && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {page.stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-xl border p-4 flex flex-col gap-1">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.trend && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      {stat.trend}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Content placeholder */}
          <div className="bg-white rounded-xl border">
            <div className={`${page.color} rounded-t-xl h-1.5`} />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`${page.color} h-8 w-8 rounded-lg flex items-center justify-center`}>
                  {(() => {
                    const group = navGroups.flatMap(g => g.items).find(it => it.id === activeId);
                    if (!group) return null;
                    const Icon = group.icon;
                    return <Icon className="h-4 w-4 text-white" />;
                  })()}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">{page.title}</h2>
                  <p className="text-xs text-gray-500">{page.subtitle}</p>
                </div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-gray-50 rounded-lg border border-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
