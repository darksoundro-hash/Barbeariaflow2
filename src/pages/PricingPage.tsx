import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  Check, Zap, Calendar, Users, Scissors, BarChart3,
  Globe, Bell, Shield, Headphones, ArrowRight, Star, Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

const features = [
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

const MONTHLY_ORIGINAL = 97;
const MONTHLY_PRICE = 29.90;
const ANNUAL_ORIGINAL = 797;
const ANNUAL_PRICE = 249.90;
const ANNUAL_MONTHLY_EQUIV = (ANNUAL_PRICE / 12).toFixed(2).replace('.', ',');
const ANNUAL_SAVINGS = Math.round(((ANNUAL_ORIGINAL - ANNUAL_PRICE) / ANNUAL_ORIGINAL) * 100);
const MONTHLY_SAVINGS = Math.round(((MONTHLY_ORIGINAL - MONTHLY_PRICE) / MONTHLY_ORIGINAL) * 100);

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-dark text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-dark/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-[0.2em] premium-text-gradient serif">
            BARBERFLOW
          </Link>
          <Link
            to="/login"
            className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Já tenho conta →
          </Link>
        </div>
      </header>

      <main className="pt-32 pb-24 px-6">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          {/* Urgency Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] uppercase tracking-widest font-black px-4 py-2 rounded-full mb-8"
          >
            <Clock className="w-3 h-3 animate-pulse" />
            Oferta de Fundador — Vagas Limitadas
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold serif italic mb-6 leading-tight"
          >
            Automatize sua barbearia{' '}
            <span className="premium-text-gradient">hoje mesmo</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-lg leading-relaxed"
          >
            Comece agora com 7 dias de acesso total grátis.<br />
            Após o período de teste, assine para manter sua barbearia automatizada.
          </motion.p>
        </div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className={cn('text-sm font-semibold transition-colors', !isAnnual ? 'text-white' : 'text-white/30')}>
            Mensal
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={cn(
              'relative w-14 h-7 rounded-full transition-colors duration-300',
              isAnnual ? 'bg-gold' : 'bg-white/10'
            )}
          >
            <motion.div
              animate={{ x: isAnnual ? 28 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md"
            />
          </button>
          <span className={cn('text-sm font-semibold transition-colors flex items-center gap-2', isAnnual ? 'text-white' : 'text-white/30')}>
            Anual
            <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
              4 meses grátis
            </span>
          </span>
        </motion.div>

        {/* Pricing Card */}
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
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent pointer-events-none" />

              {/* Badge */}
              <div className="absolute top-6 right-6">
                <span className="bg-gold text-black text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  {isAnnual ? `${ANNUAL_SAVINGS}% OFF` : `${MONTHLY_SAVINGS}% OFF`}
                </span>
              </div>

              <div className="p-8 md:p-10">
                {/* Plan Name */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-gold fill-gold" />
                    <span className="text-[11px] uppercase tracking-[0.3em] text-gold font-black">
                      Plano Fundador
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold serif">BarberFlow Pro</h2>
                  <p className="text-white/40 text-sm mt-1">Acesso completo a tudo</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  {isAnnual ? (
                    <>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-white/25 text-xl line-through font-medium">
                          R$ {ANNUAL_ORIGINAL.toString().replace('.', ',')}
                        </span>
                        <span className="text-xs text-green-400 font-black bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                          Economize R$ {(ANNUAL_ORIGINAL - ANNUAL_PRICE).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-5xl md:text-6xl font-bold serif text-white">
                          R$ {ANNUAL_PRICE.toString().replace('.', ',')}
                        </span>
                        <span className="text-white/40 text-sm mb-2">/ano</span>
                      </div>
                      <p className="text-white/30 text-xs mt-2">
                        Equivalente a <span className="text-gold font-bold">R$ {ANNUAL_MONTHLY_EQUIV}/mês</span> — 4 meses grátis
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-3">
                        <span className="text-white/25 text-xl line-through font-medium">
                          R$ {MONTHLY_ORIGINAL}
                        </span>
                        <span className="text-xs text-green-400 font-black bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                          Preço de Fundador
                        </span>
                      </div>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-5xl md:text-6xl font-bold serif text-white">
                          R$ 29
                          <span className="text-3xl">,90</span>
                        </span>
                        <span className="text-white/40 text-sm mb-2">/mês</span>
                      </div>
                      <p className="text-white/30 text-xs mt-2">
                        Menos que <span className="text-gold font-bold">1 corte de cabelo</span> por mês
                      </p>
                    </>
                  )}
                </div>

                {/* CTA */}
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

                <p className="text-center text-white/20 text-[11px] mt-4">
                  ✓ Cancele quando quiser &nbsp;·&nbsp; ✓ Sem taxa de setup &nbsp;·&nbsp; ✓ Preço garantido para sempre
                </p>

                {/* Divider */}
                <div className="border-t border-white/5 my-8" />

                {/* Features */}
                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-widest text-white/30 font-bold mb-4">
                    Tudo incluso no plano:
                  </p>
                  {features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-gold" />
                      </div>
                      <span className="text-sm text-white/70">{feature.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-white/20 text-xs">
              🔒 Pagamento 100% seguro &nbsp;·&nbsp; Suporte via WhatsApp
            </p>
          </motion.div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-24">
          <h3 className="text-center text-xl serif mb-8 text-white/60">Perguntas Frequentes</h3>
          <div className="space-y-4">
            {[
              { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem multa, sem burocracia. Cancele quando quiser diretamente pelo seu painel.' },
              { q: 'O preço de fundador é para sempre?', a: 'Sim! Quem entrar agora garante esse preço enquanto a conta estiver ativa, mesmo quando aumentarmos o valor para novos clientes.' },
              { q: 'Como meus clientes fazem agendamentos?', a: 'Você recebe um link exclusivo da sua barbearia. Seus clientes acessam, escolhem o serviço, barbeiro e horário — tudo sem app.' },
              { q: 'Preciso de CNPJ?', a: 'Não. Qualquer barbearia, MEI ou autônomo pode usar o BarberFlow.' },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <h4 className="font-bold text-sm mb-2">{item.q}</h4>
                <p className="text-white/40 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
