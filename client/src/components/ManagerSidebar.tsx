import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardList,
  CheckSquare,
  CreditCard,
  PercentCircle,
  MessageCircle,
  Link2,
  Settings,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface ManagerSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingCount: number;
  onLogout?: () => void;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Gestão",
    items: [
      { id: "alunos", label: "Alunos", icon: Users },
      { id: "mensalidades", label: "Mensalidades", icon: CreditCard },
      { id: "professores", label: "Professores", icon: GraduationCap },
      { id: "planos", label: "Planos", icon: ClipboardList },
      { id: "checkins", label: "Log Check-ins", icon: CheckSquare },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { id: "financeiro", label: "Pagamentos", icon: CreditCard },
      { id: "comissoes", label: "Comissões", icon: PercentCircle },
    ],
  },
  {
    title: "Configurações",
    items: [
      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
      { id: "integracoes", label: "Integrações", icon: Link2 },
      { id: "configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    title: "Suporte",
    items: [
      { id: "alertas", label: "Alertas", icon: Bell },
      { id: "ajuda", label: "Ajuda", icon: HelpCircle },
    ],
  },
];

export default function ManagerSidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onToggleCollapse,
  pendingCount,
  onLogout,
}: ManagerSidebarProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = saved || "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const getBadge = (id: string): number | undefined => {
    if (id === "alunos" && pendingCount > 0) return pendingCount;
    return undefined;
  };

  return (
    <aside
      data-testid="manager-sidebar"
      className={cn(
        "flex flex-col h-full bg-[#111827] text-gray-300 border-r border-white/5 transition-all duration-300 shrink-0",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-white/10 shrink-0">
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">Seven Sports</p>
            <p className="text-xs text-gray-500 truncate">Gestor</p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto p-1.5 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-white shrink-0"
          data-testid="button-toggle-sidebar"
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const badge = getBadge(item.id);
                const isActive = activeSection === item.id;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      data-testid={`sidebar-item-${item.id}`}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-white/10 text-white"
                          : "hover:bg-white/5 hover:text-white text-gray-400"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {badge !== undefined && badge > 0 && (
                            <Badge
                              variant="destructive"
                              className="h-4 min-w-4 px-1 text-[10px] rounded-full"
                            >
                              {badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && badge !== undefined && badge > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — tema + sair */}
      <div className="shrink-0 border-t border-white/10 p-2 space-y-0.5">
        <button
          onClick={toggleTheme}
          data-testid="button-sidebar-theme"
          title={collapsed ? (theme === "light" ? "Modo escuro" : "Modo claro") : undefined}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors",
            collapsed && "justify-center"
          )}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4 shrink-0" />
          ) : (
            <Sun className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && (
            <span>{theme === "light" ? "Modo escuro" : "Modo claro"}</span>
          )}
        </button>

        {onLogout && (
          <button
            onClick={onLogout}
            data-testid="button-sidebar-logout"
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors",
              collapsed && "justify-center"
            )}
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
