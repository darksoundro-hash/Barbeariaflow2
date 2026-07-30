import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle2, Star, Clock, ShieldCheck, Sparkles, Instagram, Facebook, Twitter, Calendar, Check, Zap, Users, Scissors, BarChart3, Globe, Bell, Shield, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { cn } from '../lib/utils';

const pricingFeatures = [
  { icon: Calendar, text: 'Agendamentos ilimitados' },
  { icon: Users, text: 'Barbeiros ilimitados' },
  { icon: Scissors, text: 'Serviços ilimitados' },
  { icon: Globe, text: 'Página pública de agendamento' },
  { icon: BarChart3, text: 'Dashboard com métricas em tempo real' },
  { icon: Bell, text: 'Notificações de agendamento' },
  { icon: Shield, text: 'Dados seguros com Firebase' },
  { icon: Headphones, text: 'Suporte por WhatsApp' },
  { icon: Zap, text: 'Atualizações automáticas inclusas' },
];

function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const MONTHLY_ORIGINAL = 97;
  const MONTHLY_PRICE = 29.90;
  const ANNUAL_ORIGINAL = 797;
  const ANNUAL_PRICE = 249.90;
  const ANNUAL_MONTHLY_EQUIV = (ANNUAL_PRICE / 12).toFixed(2).replace('.', ',');
  const ANNUAL_SAVINGS = Math.round(((ANNUAL_ORIGINAL - ANNUAL_PRICE) / ANNUAL_ORIGINAL) * 100);
  const MONTHLY_SAVINGS = Math.round(((MONTHLY_ORIGINAL - MONTHLY_PRICE) / MONTHLY_ORIGINAL) * 100);

  return (
    <section id="pricing" className="py-32 px-6 bg-white/[0.02]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] uppercase tracking-widest font-black px-4 py-2 rounded-full mb-8"
          >
            <Clock className="w-3 h-3 animate-pulse" />
            Oferta de Fundador — Vagas Limitadas
          </motion.div>
          <h2 className="text-4xl md:text-6xl serif mb-6">Um plano. <span className="text-gold">Tudo incluso.</span></h2>
          <p className="text-white/40 max-w-xl mx-auto text-lg">Sem surpresas. Os primeiros donos de barbearia garantem esse preço para sempre.</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={cn('text-sm font-semibold transition-colors', !isAnnual ? 'text-white' : 'text-white/30')}>Mensal</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn('relative w-14 h-7 rounded-full transition-colors duration-300', isAnnual ? 'bg-gold' : 'bg-white/10')}
          >
            <motion.div
              animate={{ x: isAnnual ? 28 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
            />
          </button>
          <span className={cn('text-sm font-semibold transition-colors flex items-center gap-2', isAnnual ? 'text-white' : 'text-white/30')}>
            Anual
            <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">4 meses grátis</span>
          </span>
        </div>

        {/* Card */}
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={isAnnual ? 'annual' : 'monthly'}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-[2rem] border border-gold/30 bg-card overflow-hidden shadow-2xl shadow-gold/5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-6 right-6">
                <span className="bg-gold text-black text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  {isAnnual ? `${ANNUAL_SAVINGS}% OFF` : `${MONTHLY_SAVINGS}% OFF`}
                </span>
              </div>
              <div className="p-8 md:p-10">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-gold fill-gold" />
                    <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-black">Plano Fundador</span>
                  </div>
                  <h3 className="text-2xl font-bold serif">BarberFlow Pro</h3>
                  <p className="text-white/40 text-sm mt-1">Acesso completo a tudo</p>
                </div>

                <div className="mb-8">
                  {isAnnual ? (
                    <>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-white/25 text-xl line-through font-medium">R$ {ANNUAL_ORIGINAL}</span>
                        <span className="text-xs text-green-400 font-black bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">Economize R$ {(ANNUAL_ORIGINAL - ANNUAL_PRICE).toFixed(0)}</span>
                      </div>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-5xl md:text-6xl font-bold serif text-white">R$ {ANNUAL_PRICE.toString().replace('.', ',')}</span>
                        <span className="text-white/40 text-sm mb-2">/ano</span>
                      </div>
                      <p className="text-white/30 text-xs mt-2">Equivalente a <span className="text-gold font-bold">R$ {ANNUAL_MONTHLY_EQUIV}/mês</span> — 4 meses grátis</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-3">
                        <span className="text-white/25 text-xl line-through font-medium">R$ {MONTHLY_ORIGINAL}</span>
                        <span className="text-xs text-green-400 font-black bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">Preço de Fundador</span>
                      </div>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-5xl md:text-6xl font-bold serif text-white">R$ 29<span className="text-3xl">,90</span></span>
                        <span className="text-white/40 text-sm mb-2">/mês</span>
                      </div>
                      <p className="text-white/30 text-xs mt-2">Menos que <span className="text-gold font-bold">1 corte de cabelo</span> por mês</p>
                    </>
                  )}
                </div>

                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full premium-gradient text-black font-black text-sm uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-shadow"
                  >
                    Garantir meu acesso agora
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <p className="text-center text-white/20 text-[11px] mt-4">✓ Cancele quando quiser · ✓ Sem taxa de setup · ✓ Preço garantido para sempre</p>

                <div className="border-t border-white/5 my-8" />

                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-widest text-white/30 font-bold mb-4">Tudo incluso no plano:</p>
                  {pricingFeatures.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-gold" />
                      </div>
                      <span className="text-sm text-white/70">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] glass border-none">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-[0.2em] premium-text-gradient">BARBERFLOW</div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#benefits" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Benefícios</a>
            <a href="#how-it-works" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Como funciona</a>
            <a href="#pricing" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/register">
              <Button variant="gold" size="sm">Começar Agora</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gold/5 blur-[120px] rounded-full opacity-30" />
        </div>
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-gold/5 border border-gold/20 mb-6">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-gold">A Revolução na sua Barbearia</span>
            </div>
            <h1 className="text-6xl md:text-8xl serif mb-8 leading-[0.9]">
              Pare de perder <span className="text-gold">clientes</span> por falta de gestão.
            </h1>
            <p className="text-xl text-[#666] mb-10 max-w-lg leading-relaxed font-light">
              Automatize seus agendamentos, reduza faltas em até 80% e leve sua barbearia para o nível premium com o BarberFlow.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/register">
                <Button variant="gold" size="lg" className="w-full sm:w-auto">
                  Começar Teste de 7 Dias
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-white/40">
                <ShieldCheck className="w-5 h-5 text-gold/50" />
                <span className="text-sm font-medium">Sem cartão de crédito</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square md:aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=2000" 
                alt="Barbershop" 
                className="object-cover w-full h-full opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent" />
              
              {/* Floating Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-10 right-10 glass p-4 rounded-2xl max-w-[200px]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Novo Agendamento</div>
                    <div className="text-sm font-bold">Corte + Barba</div>
                  </div>
                </div>
                <div className="text-[10px] font-medium text-gold">CONFIRMADO VIA WHATSAPP</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl serif mb-4">Por que escolher o <span className="text-gold">BarberFlow?</span></h2>
            <p className="text-[#666] max-w-2xl mx-auto uppercase tracking-widest text-[10px] font-bold">Inovação e Tradição na palma da sua mão</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Clock, title: 'Agendamento 24/7', desc: 'Sua barbearia aberta para reservas 24 horas por dia, 7 dias por semana.' },
              { icon: CheckCircle2, title: 'Confirmação Automática', desc: 'Envio automático de lembretes via WhatsApp para reduzir o no-show.' },
              { icon: Star, title: 'Experiência Premium', desc: 'Ofereça ao seu cliente uma interface de reserva moderna e intuitiva.' },
            ].map((benefit, i) => (
              <Card key={i} className="flex flex-col items-center text-center p-10 h-full">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mb-6">
                  <benefit.icon className="w-8 h-8 text-gold" />
                </div>
                <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                <p className="text-white/40 leading-relaxed">{benefit.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-gold/5 blur-[100px] rounded-full -translate-x-1/2" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl serif mb-4">Como o <span className="text-gold">BarberFlow</span> funciona?</h2>
            <p className="text-[#666] max-w-2xl mx-auto uppercase tracking-widest text-[10px] font-bold">Três passos simples para transformar seu negócio</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-px bg-white/10" />

            {[
              { 
                step: '01', 
                title: 'Crie sua conta', 
                desc: 'Cadastre sua barbearia e configure seus profissionais em menos de 5 minutos.' 
              },
              { 
                step: '02', 
                title: 'Personalize tudo', 
                desc: 'Defina seus serviços, preços e horários. Sua página exclusiva estará pronta.' 
              },
              { 
                step: '03', 
                title: 'Compartilhe o link', 
                desc: 'Seus clientes agendam pelo WhatsApp ou link direto. Você só precisa focar no corte.' 
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center group">
                <div className="w-20 h-20 rounded-[2rem] bg-dark border border-white/10 flex items-center justify-center mx-auto mb-8 relative z-10 transition-all duration-500 group-hover:border-gold group-hover:shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                  <span className="text-2xl font-bold text-gold serif italic">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-gold transition-colors">{item.title}</h3>
                <p className="text-white/40 leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <Link to="/register">
              <Button variant="outline" className="h-14 px-10 rounded-2xl border-gold/20 text-gold hover:bg-gold hover:text-black">
                Quero automatizar minha agenda agora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />


      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <div className="text-2xl font-bold tracking-[0.2em] premium-text-gradient mb-4">BARBERFLOW</div>
            <p className="text-white/30 text-sm max-w-xs">Transformando barbearias comuns em negócios de alta performance e experiência premium.</p>
          </div>
          <div className="flex gap-6">
            <Instagram className="w-6 h-6 text-white/30 hover:text-gold cursor-pointer transition-colors" />
            <Facebook className="w-6 h-6 text-white/30 hover:text-gold cursor-pointer transition-colors" />
            <Twitter className="w-6 h-6 text-white/30 hover:text-gold cursor-pointer transition-colors" />
          </div>
          <div className="text-white/20 text-xs uppercase tracking-widest font-medium">
            © 2026 BARBERFLOW. TODOS OS DIREITOS RESERVADOS.
          </div>
        </div>
      </footer>
    </div>
  );
}
