import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Users, ClipboardList, DollarSign, Trophy,
  CheckCircle, Zap, Shield, BarChart3, Smartphone, ArrowRight, LogIn
} from "lucide-react";

const features = [
  { icon: ClipboardList, title: "Check-ins digitais", desc: "Controle de frequência em tempo real com histórico completo por aluno." },
  { icon: Users, title: "Gestão de alunos", desc: "Cadastro, aprovação, planos e mensalidades em um só lugar." },
  { icon: DollarSign, title: "Financeiro integrado", desc: "Cobranças, pagamentos e relatórios financeiros da sua arena." },
  { icon: Trophy, title: "Professores e modalidades", desc: "Organize professores por modalidade com comissão e painel próprio." },
  { icon: BarChart3, title: "Relatórios e alertas", desc: "Veja inadimplentes, aniversários e métricas importantes da sua arena." },
  { icon: Smartphone, title: "Acesso pelo celular", desc: "Plataforma responsiva — funciona em qualquer dispositivo, sem instalar nada." },
];

function SevenLogo({ size = "lg", onDark = true }: { size?: "sm" | "lg"; onDark?: boolean }) {
  const big = size === "lg";
  const sevenColor = onDark ? "#ffffff" : "#1a1d4e";
  return (
    <div className={`flex flex-col items-center select-none ${big ? "gap-1" : "gap-0.5"}`}>
      <div
        className={`relative font-black leading-none tracking-tighter ${big ? "text-[7rem] md:text-[9rem]" : "text-5xl"}`}
        style={{ fontFamily: "'Arial Black', 'Impact', sans-serif" }}
      >
        <span className="absolute inset-0 text-[#8bc34a]" style={{ transform: "translate(-4px,-4px)", clipPath: "inset(0 45% 0 0)" }}>7</span>
        <span className="absolute inset-0 text-[#e91e8c]" style={{ transform: "translate(4px,4px)", clipPath: "inset(0 0 0 55%)" }}>7</span>
        <span className="relative" style={{ color: sevenColor }}>7</span>
      </div>
      <div className="flex flex-col items-center leading-none">
        <span
          className={`font-black tracking-[0.18em] ${big ? "text-4xl md:text-5xl" : "text-lg"}`}
          style={{ fontFamily: "'Arial Black', 'Impact', sans-serif", color: sevenColor, letterSpacing: "0.18em" }}
        >SEVEN</span>
        <span
          className={`font-bold text-[#e91e8c] ${big ? "text-lg md:text-xl" : "text-xs"}`}
          style={{ letterSpacing: "0.4em" }}
        >SPORTS</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      <div className="fixed top-4 left-4 z-50">
        <a href="/admin" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
          <LogIn className="h-3.5 w-3.5" />Admin
        </a>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#1a1d4e] to-[#12153d] min-h-screen flex flex-col items-center justify-center px-6 text-center">

        {/* Glows decorativos */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#8bc34a]/15 blur-3xl" />
          <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-[#e91e8c]/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-96 h-64 rounded-full bg-[#1a1d4e]/50 blur-3xl" />
        </div>

        {/* Linhas decorativas sutis */}
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(139,195,74,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,195,74,0.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        {/* Logo */}
        <div className="relative z-10 mb-10">
          <SevenLogo size="lg" />
        </div>

        {/* Badge */}
        <div className="relative z-10 mb-6 inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-5 py-2 rounded-full text-xs font-semibold backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5 text-[#8bc34a]" />
          5 dias grátis · sem cartão de crédito
        </div>

        {/* Headline */}
        <h1 className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 max-w-3xl text-white">
          Plataforma completa para{" "}
          <span className="relative">
            <span className="text-[#8bc34a]">BOX</span>
            <span className="text-white"> e </span>
            <span className="text-[#e91e8c]">ARENAS ESPORTIVAS</span>
          </span>
        </h1>

        {/* Sub */}
        <p className="relative z-10 text-base md:text-lg text-white/60 mb-10 max-w-lg">
          <span className="font-semibold text-white/90">Check-in · Alunos · Professores · Financeiro</span>
          <br />em um único sistema.
        </p>

        {/* CTAs */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/cadastro">
            <Button
              size="lg"
              className="h-12 px-10 text-sm font-bold bg-[#8bc34a] hover:bg-[#7cb33b] text-[#1a1d4e] border-0 shadow-lg shadow-[#8bc34a]/30"
              data-testid="button-criar-conta-landing"
            >
              <Zap className="mr-2 h-4 w-4" />
              Criar conta gratuita
            </Button>
          </Link>
          <a href="/admin">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-10 text-sm border-white/25 text-white bg-transparent hover:bg-white/10"
              data-testid="button-acessar-conta-landing"
            >
              Acessar minha arena
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/25 text-xs animate-bounce">
          <span>ver mais</span>
          <ArrowRight className="h-3.5 w-3.5 rotate-90" />
        </div>
      </section>

      {/* ── Features (fundo claro) ──────────────────────────────────────── */}
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

      {/* ── Trust bar (fundo médio) ─────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-800 py-10 px-6">
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

      {/* ── CTA final (fundo escuro) ────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1a1d4e] to-[#0f0c29] py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <SevenLogo size="sm" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
            Pronto para transformar sua gestão?
          </h2>
          <p className="text-white/50 text-sm mb-8">
            Crie sua conta agora e experimente gratuitamente por 5 dias.
          </p>
          <Link href="/cadastro">
            <Button
              size="lg"
              className="h-12 px-12 text-sm font-bold bg-[#8bc34a] hover:bg-[#7cb33b] text-[#1a1d4e] border-0 shadow-lg shadow-[#8bc34a]/30"
              data-testid="button-cta-bottom"
            >
              Começar gratuitamente
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-[#0f0c29] text-center text-xs text-white/20 py-6">
        Seven Sports · Sistema de Gestão Esportiva
      </footer>
    </div>
  );
}
