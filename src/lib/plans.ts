export type PlanType = 'trial' | 'start' | 'pro' | 'elite';

export interface PlanLimits {
  maxBarbers: number;
  maxServices: number;
  maxAppointmentsPerMonth: number;
  whatsAppNotifications: boolean;
  advancedReports: boolean;
  customDomain: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  trial: {
    maxBarbers: Infinity,
    maxServices: Infinity,
    maxAppointmentsPerMonth: Infinity,
    whatsAppNotifications: true,
    advancedReports: true,
    customDomain: false,
    prioritySupport: true,
  },
  start: {
    maxBarbers: 2,
    maxServices: 5,
    maxAppointmentsPerMonth: 50,
    whatsAppNotifications: false,
    advancedReports: false,
    customDomain: false,
    prioritySupport: false,
  },
  pro: {
    maxBarbers: 5,
    maxServices: 20,
    maxAppointmentsPerMonth: 500,
    whatsAppNotifications: true,
    advancedReports: true,
    customDomain: false,
    prioritySupport: false,
  },
  elite: {
    maxBarbers: Infinity,
    maxServices: Infinity,
    maxAppointmentsPerMonth: Infinity,
    whatsAppNotifications: true,
    advancedReports: true,
    customDomain: true,
    prioritySupport: true,
  },
};

export const PLAN_NAMES: Record<PlanType, string> = {
  trial: 'Teste Grátis (7 dias)',
  start: 'Start',
  pro: 'Pro',
  elite: 'Elite',
};

export const PLAN_PRICES: Record<PlanType, { monthly: number; annual: number }> = {
  trial: { monthly: 0, annual: 0 },
  start: { monthly: 0, annual: 0 },
  pro: { monthly: 29.90, annual: 249.90 },
  elite: { monthly: 79.90, annual: 699.90 },
};

export const PLAN_FEATURES: Record<PlanType, string[]> = {
  trial: [
    'Teste grátis por 7 dias',
    'Todos os recursos do Elite',
    'Sem necessidade de cartão de crédito',
  ],
  start: [
    'Até 2 barbeiros',
    'Até 5 serviços',
    'Até 50 agendamentos/mês',
    'Dashboard básico',
    'Página pública de agendamento',
  ],
  pro: [
    'Até 5 barbeiros',
    'Até 20 serviços',
    'Até 500 agendamentos/mês',
    'Dashboard completo com métricas',
    'Notificações via WhatsApp',
    'Relatórios avançados',
    'Suporte prioritário',
  ],
  elite: [
    'Barbeiros ilimitados',
    'Serviços ilimitados',
    'Agendamentos ilimitados',
    'Tudo do Pro',
    'Domínio personalizado',
    'Suporte VIP 24h',
    'Prioridade total',
  ],
};
