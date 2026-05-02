import { Link } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>

      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <span className="text-2xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
          SEVEN SPORTS
        </span>
        <a
          href="/admin"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Já tenho conta
        </a>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs font-semibold">
          <Zap className="h-3.5 w-3.5 mr-1" />
          5 dias grátis · sem cartão de crédito
        </Badge>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5">
          Gerencie sua arena{" "}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            com tecnologia profissional
          </span>
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Plataforma completa para academias e arenas esportivas — check-ins, alunos, professores e financeiro em um único sistema.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/cadastro">
            <Button size="lg" className="h-12 px-8 text-base font-semibold" data-testid="button-criar-conta-landing">
              <Zap className="mr-2 h-5 w-5" />
              Criar conta gratuita
            </Button>
          </Link>
          <a href="/admin">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" data-testid="button-acessar-conta-landing">
              Acessar minha arena
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-background/70 backdrop-blur border border-border rounded-xl p-5 space-y-2.5 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-t border-border bg-background/50 py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
          {[
            { icon: CheckCircle, text: "Sem contrato de fidelidade" },
            { icon: Shield, text: "Dados seguros e protegidos" },
            { icon: Zap, text: "Ativação imediata" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="max-w-2xl mx-auto px-6 py-14 text-center">
        <h2 className="text-2xl font-bold mb-3">Pronto para começar?</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Crie sua conta agora e experimente gratuitamente por 5 dias. Nenhum cartão necessário.
        </p>
        <Link href="/cadastro">
          <Button size="lg" className="h-12 px-10 text-base font-semibold" data-testid="button-cta-bottom">
            Começar gratuitamente
          </Button>
        </Link>
      </section>

      <footer className="text-center text-xs text-muted-foreground pb-8">
        Seven Sports · Sistema de Gestão Esportiva
      </footer>
    </div>
  );
}
