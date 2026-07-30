import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Check, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { PlanType, PLAN_NAMES, PLAN_PRICES, PLAN_FEATURES } from '../lib/plans';
import { cn } from '../lib/utils';
import { createCheckoutSession } from '../lib/stripe';
import { useApp } from '../lib/AppContext';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: PlanType;
  title?: string;
  description?: string;
  reason?: string;
  isMandatory?: boolean;
}

const PRICE_IDS: Record<string, string> = {
  // Preencha com os Price IDs que você criar no Stripe
  pro_monthly: 'price_pro_monthly',
  pro_annual: 'price_pro_annual',
  elite_monthly: 'price_elite_monthly',
  elite_annual: 'price_elite_annual',
};

export default function UpgradeModal({
  open,
  onClose,
  currentPlan = 'start',
  title = 'Desbloqueie todo o potencial da sua barbearia!',
  description = 'Seu plano atual tem limitações. Faça o upgrade e aproveite recursos ilimitados.',
  reason,
  isMandatory = false,
}: UpgradeModalProps) {
  const { user, shopId } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const targetPlan: PlanType = 'pro';

  const handleUpgrade = async () => {
    if (!user || !shopId) return;
    setLoading(true);
    setError('');

    try {
      const priceId = PRICE_IDS.pro_monthly;
      const url = await createCheckoutSession(priceId, user.uid, shopId);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isMandatory ? undefined : onClose}
            className={cn(
              "fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]",
              isMandatory && "cursor-default"
            )}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-dark border border-gold/20 rounded-[2rem] shadow-2xl shadow-gold/10"
            >
              <div className="relative p-6 md:p-10">
                {!isMandatory && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                )}

                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold text-[10px] uppercase tracking-widest font-black px-4 py-2 rounded-full mb-4">
                    <Zap className="w-3 h-3" />
                    Plano {PLAN_NAMES[currentPlan]}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold serif italic mb-3">{title}</h2>
                  <p className="text-white/50 text-sm max-w-md mx-auto">{description}</p>
                  {reason && (
                    <p className="text-gold text-xs mt-2 font-semibold">{reason}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {(['start', 'pro'] as PlanType[]).map((plan) => {
                    const isCurrent = plan === currentPlan;
                    const isTarget = plan === targetPlan;
                    const features = PLAN_FEATURES[plan];
                    const price = PLAN_PRICES[plan];

                    return (
                      <div
                        key={plan}
                        className={cn(
                          'rounded-2xl p-6 border transition-all duration-300',
                          isTarget
                            ? 'border-gold/40 bg-gradient-to-b from-gold/10 to-transparent shadow-lg shadow-gold/5'
                            : 'border-white/10 bg-white/[0.02] opacity-60'
                        )}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              {isTarget && <Star className="w-4 h-4 text-gold fill-gold" />}
                              <span className={cn('font-bold text-lg serif', isTarget ? 'text-gold' : 'text-white/60')}>
                                {PLAN_NAMES[plan]}
                              </span>
                            </div>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest">
                              {isCurrent ? 'Plano atual' : isTarget ? 'Recomendado' : 'Premium'}
                            </span>
                          </div>
                          {plan === 'start' ? (
                            <span className="text-2xl font-bold text-white/40 serif">Grátis</span>
                          ) : (
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gold serif">
                                R$ {price.monthly.toFixed(2).replace('.', ',')}
                              </div>
                              <div className="text-[10px] text-white/30">/mês</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {features.map((feat, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <Check className={cn(
                                'w-3.5 h-3.5 shrink-0',
                                isTarget ? 'text-gold' : 'text-white/20'
                              )} />
                              <span className={isTarget ? 'text-white/70' : 'text-white/30'}>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleUpgrade}
                    disabled={loading || !user || !shopId}
                    className="w-full premium-gradient text-black font-black text-sm uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-shadow cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Redirecionando...</>
                    ) : (
                      <><ArrowRight className="w-4 h-4" /> Fazer upgrade agora</>
                    )}
                  </button>
                  {!isMandatory && (
                    <button
                      onClick={onClose}
                      className="w-full text-center text-white/30 text-xs hover:text-white/50 transition-colors py-2"
                    >
                      Continuar no plano grátis por enquanto
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 mt-6 text-[10px] text-white/20">
                  <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Pagamento seguro</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Cancele quando quiser</span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
