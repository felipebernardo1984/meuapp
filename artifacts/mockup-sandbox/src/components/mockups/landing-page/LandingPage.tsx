import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, BarChart3, Users, Calendar, Wallet, Bell, Star } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-[#8bc34a] selection:text-slate-950">
      {/* 1. Header/Nav fixo */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#1565C0] to-[#29B6F6] rounded-lg flex items-center justify-center">
              <span className="font-black text-white text-xl leading-none">S</span>
            </div>
            <span className="font-['Bebas_Neue'] text-2xl tracking-wide font-bold">SEVEN SPORTS</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <a href="#contato" className="hover:text-white transition-colors">Contato</a>
          </nav>

          <Button className="bg-[#8bc34a] hover:bg-[#7cb342] text-slate-950 font-bold rounded-full px-6">
            Começar grátis
          </Button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative min-h-[100dvh] flex items-center pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/hero-arena.png" 
            alt="Arena Esportiva" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <span className="inline-block py-1 px-3 rounded-full bg-[#e91e8c]/10 text-[#e91e8c] text-sm font-bold tracking-wider mb-6 border border-[#e91e8c]/20">
              LANÇAMENTO
            </span>
            <h1 className="font-['Bebas_Neue'] text-6xl md:text-8xl font-black tracking-wider leading-[0.9] mb-6">
              GERENCIE SUA ARENA <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1565C0] to-[#29B6F6]">
                COM INTELIGÊNCIA
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-2xl leading-relaxed font-light">
              Mais organização, mais alunos, mais lucro. Tudo em um só lugar. A plataforma definitiva para esportes de areia e quadra.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-[#8bc34a] hover:bg-[#7cb342] text-slate-950 font-bold text-lg h-14 px-8 rounded-full">
                Começar 7 dias grátis
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 rounded-full border-slate-700 hover:bg-slate-800 text-lg">
                Ver como funciona
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Barra de confiança */}
      <section className="bg-slate-900 border-y border-slate-800 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-800">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Arenas</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">50.000+</div>
              <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Alunos Gerenciados</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">R$ 10M</div>
              <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Processados</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">99,9%</div>
              <div className="text-sm text-slate-400 uppercase tracking-widest font-semibold">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Seção "O problema que resolvemos" */}
      <section className="py-24 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Bebas_Neue'] text-5xl font-black tracking-wide mb-4">
              CHEGA DE PLANILHAS E BAGUNÇA
            </h2>
            <p className="text-slate-400 text-lg">Substitua ferramentas amadoras por um sistema profissional.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet size={120} />
              </div>
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="bg-red-500/10 text-red-400 text-sm font-medium px-3 py-1 rounded-full inline-block mb-2">Antes</div>
                  <p className="text-slate-300 strike text-lg opacity-60">Financeiro desorganizado</p>
                </div>
                <ChevronRight className="text-[#8bc34a] mb-6 rotate-90 md:rotate-0" />
                <div>
                  <div className="bg-[#8bc34a]/10 text-[#8bc34a] text-sm font-medium px-3 py-1 rounded-full inline-block mb-2">Depois</div>
                  <p className="text-white font-medium text-xl">Visão clara do que entra e do que falta receber</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Calendar size={120} />
              </div>
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="bg-red-500/10 text-red-400 text-sm font-medium px-3 py-1 rounded-full inline-block mb-2">Antes</div>
                  <p className="text-slate-300 strike text-lg opacity-60">Check-in manual</p>
                </div>
                <ChevronRight className="text-[#8bc34a] mb-6 rotate-90 md:rotate-0" />
                <div>
                  <div className="bg-[#8bc34a]/10 text-[#8bc34a] text-sm font-medium px-3 py-1 rounded-full inline-block mb-2">Depois</div>
                  <p className="text-white font-medium text-xl">Registro digital em segundos</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users size={120} />
              </div>
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="bg-red-500/10 text-red-400 text-sm font-medium px-3 py-1 rounded-full inline-block mb-2">Antes</div>
                  <p className="text-slate-300 strike text-lg opacity-60">Professores sem controle</p>
                </div>
                <ChevronRight className="text-[#8bc34a] mb-6 rotate-90 md:rotate-0" />
                <div>
                  <div className="bg-[#8bc34a]/10 text-[#8bc34a] text-sm font-medium px-3 py-1 rounded-full inline-block mb-2">Depois</div>
                  <p className="text-white font-medium text-xl">Comissão automática por aula</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Funcionalidades */}
      <section id="funcionalidades" className="py-24 bg-slate-900 border-t border-slate-800 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#1565C0]/20 to-[#29B6F6]/20 blur-2xl rounded-full" />
              <img 
                src="/__mockup/images/dashboard-mockup.png" 
                alt="Dashboard UI" 
                className="relative rounded-2xl border border-slate-700 shadow-2xl shadow-blue-900/20 w-full"
              />
            </div>
            
            <div>
              <h2 className="font-['Bebas_Neue'] text-5xl font-black tracking-wide mb-8">
                TUDO QUE SUA ARENA PRECISA
              </h2>
              
              <ul className="space-y-6">
                {[
                  "Check-in e histórico de presença",
                  "Gestão de alunos e planos",
                  "Financeiro e mensalidades",
                  "Professores e comissões",
                  "Turmas e agenda semanal",
                  "Alertas e relatórios"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-4 text-xl text-slate-200">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#8bc34a]/20 flex items-center justify-center text-[#8bc34a]">
                      <CheckCircle2 size={20} />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Seção "Como funciona" */}
      <section className="py-24 bg-gradient-to-b from-slate-950 to-blue-950/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-['Bebas_Neue'] text-5xl font-black tracking-wide mb-4">
              COMO FUNCIONA
            </h2>
            <p className="text-slate-400 text-lg">Comece a usar em menos de 10 minutos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent -translate-y-1/2 z-0" />
            
            {[
              { num: "1", title: "Cadastre sua arena", desc: "Leva apenas 2 minutos para configurar." },
              { num: "2", title: "Importe seus alunos", desc: "Adicione alunos e configure as turmas." },
              { num: "3", title: "Comece a faturar", desc: "Automação total e controle financeiro." }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-[#29B6F6] text-[#29B6F6] flex items-center justify-center text-2xl font-black mb-6 shadow-[0_0_30px_rgba(41,182,246,0.3)]">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Depoimentos */}
      <section className="py-24 bg-slate-950">
        <div className="container mx-auto px-4">
          <h2 className="font-['Bebas_Neue'] text-5xl font-black tracking-wide mb-16 text-center">
            QUEM USA, RECOMENDA
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <div className="flex gap-1 text-[#8bc34a] mb-6">
                {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-slate-300 mb-8 italic">"Depois que começamos a usar o Seven Sports, a inadimplência caiu para quase zero e os professores adoram o cálculo automático de comissão."</p>
              <div className="flex items-center gap-4">
                <img src="/__mockup/images/avatar-manager.png" alt="Ricardo" className="w-12 h-12 rounded-full object-cover" />
                <div>
                  <div className="font-bold text-white">Ricardo Mendes</div>
                  <div className="text-sm text-slate-400">Gestor, Sunset Beach Tennis</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <div className="flex gap-1 text-[#8bc34a] mb-6">
                {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-slate-300 mb-8 italic">"O app salvou minha vida. Antes eu passava o domingo inteiro fechando planilha, agora tenho os relatórios na palma da mão."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white">AM</div>
                <div>
                  <div className="font-bold text-white">Amanda Costa</div>
                  <div className="text-sm text-slate-400">Dona, Arena Vôlei Point</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
              <div className="flex gap-1 text-[#8bc34a] mb-6">
                {[1,2,3,4,5].map(i => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-slate-300 mb-8 italic">"O check-in digital mudou nossa operação. Fim das filas na recepção e controle 100% de quem está na quadra."</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center font-bold text-white">CP</div>
                <div>
                  <div className="font-bold text-white">Carlos Pereira</div>
                  <div className="text-sm text-slate-400">Gerente, Complexo Sports</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Planos */}
      <section id="planos" className="py-24 bg-slate-900 border-y border-slate-800">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="text-center mb-12">
            <h2 className="font-['Bebas_Neue'] text-5xl font-black tracking-wide mb-4">
              SIMPLES E DIRETO
            </h2>
          </div>

          <div className="bg-slate-950 p-8 rounded-3xl border-2 border-[#1565C0] relative shadow-[0_0_50px_rgba(21,101,192,0.2)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1565C0] text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide">
              PLANO COMPLETO
            </div>
            
            <div className="text-center mb-8 pt-4">
              <div className="flex justify-center items-baseline gap-2 mb-2">
                <span className="text-2xl text-slate-400 font-bold">R$</span>
                <span className="text-6xl font-black text-white">149</span>
                <span className="text-slate-400">/mês</span>
              </div>
              <p className="text-[#8bc34a] font-medium">7 dias grátis · sem cartão de crédito</p>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "Alunos ilimitados",
                "Professores ilimitados",
                "Gestão financeira completa",
                "Controle de turmas e check-in",
                "Relatórios gerenciais",
                "Suporte prioritário"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 size={20} className="text-[#8bc34a]" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button className="w-full bg-[#8bc34a] hover:bg-[#7cb342] text-slate-950 font-bold text-lg h-14 rounded-xl">
              Criar conta gratuita
            </Button>
          </div>
        </div>
      </section>

      {/* 9. CTA Final */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/cta-arena.png" 
            alt="Arena à noite" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/80" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="font-['Bebas_Neue'] text-6xl md:text-7xl font-black tracking-wide mb-8 max-w-3xl mx-auto">
            SUA ARENA MERECE <span className="text-[#8bc34a]">TECNOLOGIA DE PONTA</span>
          </h2>
          <Button size="lg" className="bg-[#1565C0] hover:bg-[#0D47A1] text-white font-bold text-xl h-16 px-10 rounded-full shadow-[0_0_30px_rgba(21,101,192,0.4)]">
            Comece agora gratuitamente
          </Button>
        </div>
      </section>

      {/* 10. Footer */}
      <footer id="contato" className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-[#1565C0] to-[#29B6F6] rounded flex items-center justify-center">
                <span className="font-black text-white text-xs leading-none">S</span>
              </div>
              <span className="font-['Bebas_Neue'] text-xl tracking-wide font-bold">SEVEN SPORTS</span>
            </div>
            
            <div className="flex gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="mailto:suporte@sevensports.com.br" className="hover:text-white transition-colors">suporte@sevensports.com.br</a>
            </div>

            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} Seven Sports. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
