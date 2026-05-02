import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Users, ClipboardList, DollarSign, Trophy,
  CheckCircle, Zap, Shield, BarChart3, Smartphone, LogIn
} from "lucide-react";

const features = [
  { icon: ClipboardList, title: "Check-ins digitais", desc: "Controle de frequência em tempo real com histórico completo por aluno." },
  { icon: Users, title: "Gestão de alunos", desc: "Cadastro, aprovação, planos e mensalidades em um só lugar." },
  { icon: DollarSign, title: "Financeiro integrado", desc: "Cobranças, pagamentos e relatórios financeiros da sua arena." },
  { icon: Trophy, title: "Professores e modalidades", desc: "Organize professores por modalidade com comissão e painel próprio." },
  { icon: BarChart3, title: "Relatórios e alertas", desc: "Veja inadimplentes, aniversários e métricas importantes da sua arena." },
  { icon: Smartphone, title: "Acesso pelo celular", desc: "Plataforma responsiva — funciona em qualquer dispositivo, sem instalar nada." },
];

const planFeatures = [
  "Check-ins digitais ilimitados",
  "Gestão completa de alunos",
  "Financeiro e mensalidades",
  "Professores e comissões",
  "Relatórios e alertas",
  "Acesso pelo celular",
  "Suporte incluso",
];

export default function LandingPage() {
  const { data: planInfo } = useQuery<{ monthlyValue: string; planName: string }>({
    queryKey: ["/api/platform-plans/public"],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      <div className="fixed top-4 left-4 z-50">
        <a href="/admin" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
          <LogIn className="h-3.5 w-3.5" />Admin
        </a>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gray-50 dark:bg-gray-950">
        <div className="mb-8 select-none">
          <h1
            className="text-[5rem] sm:text-[7rem] md:text-[9rem] leading-none tracking-widest font-bold"
            style={{
              fontFamily: "'Bebas Neue', 'Impact', sans-serif",
              background: "linear-gradient(90deg, #1565C0 0%, #1E88E5 40%, #29B6F6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            SEVEN SPORTS
          </h1>
        </div>

        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4 max-w-3xl">
          Plataforma completa para box e arenas esportivas
        </p>

        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-10">
          Check-in · Alunos · Professores · Financeiro · em um único sistema.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/cadastro">
            <Button
              size="lg"
              className="h-12 px-10 text-sm font-bold bg-[#8bc34a] hover:bg-[#7cb33b] text-[#1a1d4e] border-0 shadow-md"
              data-testid="button-criar-conta-landing"
            >
              Criar conta gratuita
            </Button>
          </Link>
          <a href="/admin">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-10 text-sm font-semibold bg-white dark:bg-transparent"
              data-testid="button-acessar-conta-landing"
            >
              Acessar minha arena
            </Button>
          </a>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block bg-[#e91e8c]/10 text-[#e91e8c] text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">
              Funcionalidades
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
              Tudo que sua arena precisa
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 max-w-md mx-auto">
              Uma solução completa para gestores de arenas esportivas e box de crossfit.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => {
              const colors = [
                { bg: "bg-[#1a1d4e]/8 dark:bg-[#1a1d4e]/40", icon: "text-[#1a1d4e] dark:text-blue-300" },
                { bg: "bg-[#e91e8c]/8 dark:bg-[#e91e8c]/20", icon: "text-[#e91e8c]" },
                { bg: "bg-[#8bc34a]/10 dark:bg-[#8bc34a]/20", icon: "text-[#5d8a1c] dark:text-[#8bc34a]" },
                { bg: "bg-[#1a1d4e]/8 dark:bg-[#1a1d4e]/40", icon: "text-[#1a1d4e] dark:text-blue-300" },
                { bg: "bg-[#e91e8c]/8 dark:bg-[#e91e8c]/20", icon: "text-[#e91e8c]" },
                { bg: "bg-[#8bc34a]/10 dark:bg-[#8bc34a]/20", icon: "text-[#5d8a1c] dark:text-[#8bc34a]" },
              ];
              const c = colors[i % colors.length];
              return (
                <div key={title} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${c.icon}`} />
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-950 py-20 px-6">
        <div className="max-w-md mx-auto text-center">
          <span className="inline-block bg-[#1a1d4e]/8 text-[#1a1d4e] dark:bg-blue-900/30 dark:text-blue-300 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-widest uppercase">
            Plano
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-10">
            Um plano. Tudo incluído.
          </h2>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl p-8 shadow-sm text-left">
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {planInfo?.monthlyValue ?? "—"}
              </span>
              <span className="text-gray-400 text-sm mb-1">/mês</span>
            </div>
            <p className="text-xs text-[#8bc34a] font-semibold mb-6">5 dias grátis · sem cartão de crédito</p>
            <ul className="space-y-3 mb-8">
              {planFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle className="h-4 w-4 text-[#8bc34a] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/cadastro">
              <Button
                size="lg"
                className="w-full h-12 text-sm font-bold bg-[#8bc34a] hover:bg-[#7cb33b] text-[#1a1d4e] border-0 shadow-md"
                data-testid="button-plano-cta"
              >
                Criar conta gratuita
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 py-10 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-8">
          {[
            { icon: CheckCircle, text: "Sem contrato de fidelidade", color: "text-[#8bc34a]" },
            { icon: Shield, text: "Dados seguros e protegidos", color: "text-[#1a1d4e] dark:text-blue-400" },
            { icon: Zap, text: "Ativação imediata", color: "text-[#e91e8c]" },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
              <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
              <span className="font-medium">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
            Pronto para transformar sua gestão?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Crie sua conta e comece a usar hoje mesmo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/cadastro">
              <Button
                size="lg"
                className="h-12 px-10 text-sm font-bold bg-[#8bc34a] hover:bg-[#7cb33b] text-[#1a1d4e] border-0 shadow-md"
                data-testid="button-cta-bottom"
              >
                Criar conta gratuita
              </Button>
            </Link>
            <a href="/admin">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-10 text-sm font-semibold bg-white dark:bg-transparent"
                data-testid="button-cta-bottom-login"
              >
                Acessar minha arena
              </Button>
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 py-6">
        Seven Sports · Sistema de Gestão Esportiva
      </footer>
    </div>
  );
}
