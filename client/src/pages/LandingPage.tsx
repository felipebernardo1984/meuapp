import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoImg from "@assets/seven-sports-logo.png";

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>

      {/* Acesso rápido */}
      <div className="fixed top-4 left-4 z-50">
        <a
          href="/admin"
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/90 transition-colors"
        >
          <LogIn className="h-3.5 w-3.5" />
          Admin
        </a>
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 text-center relative overflow-hidden">

        {/* Glow de fundo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-lime-400/8 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative mb-8">
          <img
            src={logoImg}
            alt="Seven Sports"
            className="w-44 md:w-56 mx-auto"
            style={{ filter: "drop-shadow(0 0 40px rgba(99,102,241,0.4)) drop-shadow(0 0 80px rgba(59,130,246,0.2))" }}
          />
        </div>

        {/* Badge */}
        <Badge className="mb-6 bg-white/10 text-white border-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5 mr-1.5 text-yellow-400" />
          5 dias grátis · sem cartão de crédito
        </Badge>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4 max-w-3xl">
          Plataforma completa para{" "}
          <span className="bg-gradient-to-r from-blue-400 via-pink-400 to-lime-400 bg-clip-text text-transparent">
            BOX e ARENAS ESPORTIVAS
          </span>
        </h1>

        {/* Sub */}
        <p className="text-lg md:text-xl text-white/60 mb-10 max-w-xl leading-relaxed">
          Check-in · Alunos · Professores · Financeiro
          <span className="block text-white/40 text-base mt-1">em um único sistema.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/cadastro">
            <Button
              size="lg"
              className="h-13 px-10 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border-0 shadow-lg shadow-blue-500/30"
              data-testid="button-criar-conta-landing"
            >
              <Zap className="mr-2 h-5 w-5 text-yellow-300" />
              Criar conta gratuita
            </Button>
          </Link>
          <a href="/admin">
            <Button
              variant="outline"
              size="lg"
              className="h-13 px-10 text-base border-white/20 text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm"
              data-testid="button-acessar-conta-landing"
            >
              Acessar minha arena
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>

        {/* Indicador de scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 text-xs animate-bounce">
          <span>ver mais</span>
          <ArrowRight className="h-4 w-4 rotate-90" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Tudo que sua arena precisa</h2>
          <p className="text-white/50 text-sm max-w-md mx-auto">Uma solução completa, simples e poderosa para gestores de arenas esportivas e box de crossfit.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-3 hover:bg-white/8 hover:border-white/20 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-sm text-white">{title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-t border-white/10 bg-white/3 py-10">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-white/50">
          {[
            { icon: CheckCircle, text: "Sem contrato de fidelidade" },
            { icon: Shield, text: "Dados seguros e protegidos" },
            { icon: Zap, text: "Ativação imediata" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-blue-400" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Pronto para começar?</h2>
        <p className="text-white/50 text-sm mb-8">
          Crie sua conta agora e experimente gratuitamente por 5 dias. Nenhum cartão necessário.
        </p>
        <Link href="/cadastro">
          <Button
            size="lg"
            className="h-13 px-12 text-base font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border-0 shadow-lg shadow-blue-500/30"
            data-testid="button-cta-bottom"
          >
            Começar gratuitamente
          </Button>
        </Link>
      </section>

      <footer className="text-center text-xs text-white/25 pb-10">
        Seven Sports · Sistema de Gestão Esportiva
      </footer>
    </div>
  );
}
