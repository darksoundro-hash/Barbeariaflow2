import { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Users, Calendar, TrendingUp, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { useApp } from '../lib/AppContext';
import { Appointment, Barber, Service } from '../types';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import Button from '../components/Button';
import { formatCurrency, cn, playNotificationSound } from '../lib/utils';

export default function Dashboard() {
  const { shop, shopId, plan, isTrialExpired, triggerUpgrade } = useApp();
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    totalMonthlyRevenue: 0,
    totalMonthlyAppointments: 0,
    newCustomers: 0,
    attendanceRate: 98,
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const prevCount = useRef(0);
  const shownUpgrade = useRef(false);
  const triggerUpgradeRef = useRef(triggerUpgrade);

  useEffect(() => {
    triggerUpgradeRef.current = triggerUpgrade;
  }, [triggerUpgrade]);

  useEffect(() => {
    if (!shopId) return;

    let unsubscribeAppointments: (() => void) | undefined;

    async function loadInitialData() {
      try {
        const barbersSnap = await getDocs(collection(db, 'barbershops', shopId, 'barbers'));
        const barbersMap: Record<string, string> = {};
        barbersSnap.forEach(doc => {
          barbersMap[doc.id] = (doc.data() as Barber).name;
        });
        setBarbers(barbersMap);

        const servicesSnap = await getDocs(collection(db, 'barbershops', shopId, 'services'));
        const servicesMap: Record<string, string> = {};
        servicesSnap.forEach(doc => {
          servicesMap[doc.id] = (doc.data() as Service).name;
        });
        setServices(servicesMap);

        const appointmentsQuery = query(
          collection(db, 'barbershops', shopId, 'appointments'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );

        unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
          const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment));

          if (prevCount.current > 0 && apps.length > prevCount.current && apps[0]?.status === 'pending') {
            const newApps = apps.slice(0, apps.length - prevCount.current);
            if (newApps.some(a => a.status === 'pending')) {
              playNotificationSound();
            }
          }
          prevCount.current = apps.length;

          setRecentAppointments(apps.slice(0, 5));
          
          // Basic Stats Calculation (current month)
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const monthlyApps = apps.filter(app => {
            const appDate = app.createdAt instanceof Date ? app.createdAt : (app.createdAt as any)?.toDate();
            return appDate >= firstDayOfMonth;
          });

          // Only completed apps contribute to revenue (actual money earned)
          const completedApps = monthlyApps.filter(a => a.status === 'completed');
          const cancelledApps = monthlyApps.filter(a => a.status === 'cancelled');
          
          const revenue = completedApps.reduce((acc, app) => acc + (app.totalPrice || 0), 0);
          
          // Calculate attendance rate: Completed / (Completed + Cancelled)
          const totalResolved = completedApps.length + cancelledApps.length;
          const attendance = totalResolved > 0 
            ? Math.round((completedApps.length / totalResolved) * 100) 
            : 100;
          
          setStats({
            totalMonthlyRevenue: revenue,
            totalMonthlyAppointments: monthlyApps.filter(a => a.status !== 'cancelled').length,
            newCustomers: Math.floor(monthlyApps.length * 0.2), // Still mock logic
            attendanceRate: attendance,
          });
        }, (error) => {
          console.error('Snapshot error (dashboard):', error);
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      if (unsubscribeAppointments) unsubscribeAppointments();
    };
  }, [shopId]);

  useEffect(() => {
    if (!loading && isTrialExpired && !shownUpgrade.current) {
      shownUpgrade.current = true;
      triggerUpgradeRef.current('Seu período de teste de 7 dias expirou. Assine agora para continuar usando o BarberFlow!');
    } else if (!loading && plan === 'start' && !shownUpgrade.current) {
      shownUpgrade.current = true;
      const timer = setTimeout(() => {
        triggerUpgradeRef.current('Você está usando o plano gratuito. Faça o upgrade para desbloquear todos os recursos!');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, plan, isTrialExpired]);

  if (loading) return <LoadingSpinner />;

  const statsItems = [
    { label: 'Receita Mensal', value: formatCurrency(stats.totalMonthlyRevenue), icon: TrendingUp, color: 'text-green-400' },
    { label: 'Agendamentos', value: stats.totalMonthlyAppointments.toString(), icon: Calendar, color: 'text-gold' },
    { label: 'Novos Clientes', value: stats.newCustomers.toString(), icon: Users, color: 'text-blue-400' },
    { label: 'Taxa de Comparecimento', value: `${stats.attendanceRate}%`, icon: Clock, color: 'text-purple-400' },
  ];

  return (
    <div className="flex bg-dark min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl serif mb-1">Visão Geral</h1>
            <p className="text-xs md:text-sm text-[#666]">
              Bem-vindo, <span className="text-white font-semibold">{shop?.name || 'Sua Barbearia'}</span> • {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/appointments" className="w-full sm:w-auto">
              <Button variant="gold" size="sm" className="w-full text-xs h-9">Agenda Completa</Button>
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsItems.map((stat, i) => (
            <Card key={i} className="p-5 md:p-6">
              <div className="stat-label text-white/40 uppercase tracking-[2px] text-[9px] mb-2">{stat.label}</div>
              <div className="text-xl md:text-2xl font-semibold serif shrink-0">{stat.value}</div>
              <div className="text-[9px] text-green-500 mt-2">↑ 12% vs mês anterior</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Recent Appointments */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <h2 className="text-base md:text-lg serif px-1">Próximos Horários</h2>
            <Card className="p-0 overflow-hidden border-line">
              {/* Desktop Table */}
              <div className="hidden md:grid grid-cols-6 bg-[#1a1a1a] text-[#666] font-bold text-[10px] uppercase tracking-widest px-6 py-4">
                <div>Horário</div>
                <div>Cliente</div>
                <div>Serviço</div>
                <div>Valor</div>
                <div>Barbeiro</div>
                <div className="text-right">Status</div>
              </div>
              
              {/* Desktop Rows */}
              <div className="hidden md:block divide-y divide-line">
                {recentAppointments.length > 0 ? recentAppointments.map((app) => (
                  <div key={app.id} className="grid grid-cols-6 items-center px-6 py-4 text-sm hover:bg-white/[0.02] transition-colors">
                    <div className="font-medium">{app.startTime}</div>
                    <div className="font-semibold">{app.customerName}</div>
                    <div className="text-[#888] line-clamp-1">{services[app.serviceId] || 'Serviço'}</div>
                    <div className="text-gold font-bold">{formatCurrency(app.totalPrice || 0)}</div>
                    <div className="text-[#888] line-clamp-1">{barbers[app.barberId] || 'Barbeiro'}</div>
                    <div className="text-right">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        app.status === 'confirmed' ? "bg-green-500/20 text-green-400 border-green-500/30" : 
                        app.status === 'pending' ? "bg-gold/20 text-gold border-gold/30" :
                        app.status === 'completed' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      )}>
                        {app.status === 'confirmed' ? 'Confirmado' : 
                         app.status === 'pending' ? 'Pendente' : 
                         app.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-10 text-center text-white/20">
                    Nenhum agendamento recente.
                  </div>
                )}
              </div>

              {/* Mobile Card Row layout */}
              <div className="md:hidden divide-y divide-line">
                {recentAppointments.length > 0 ? recentAppointments.map((app) => (
                  <div key={app.id} className="p-4 space-y-3 hover:bg-white/[0.01] transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">{app.startTime}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        app.status === 'confirmed' ? "bg-green-500/20 text-green-400 border-green-500/30" : 
                        app.status === 'pending' ? "bg-gold/20 text-gold border-gold/30" :
                        app.status === 'completed' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      )}>
                        {app.status === 'confirmed' ? 'Confirmado' : 
                         app.status === 'pending' ? 'Pendente' : 
                         app.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[#f5f5f5] text-sm truncate">{app.customerName}</div>
                        <div className="text-[11px] text-white/40 truncate">
                          {services[app.serviceId] || 'Serviço'} • {barbers[app.barberId] || 'Barbeiro'}
                        </div>
                      </div>
                      <div className="text-gold font-bold text-xs bg-gold/10 px-2 py-1 rounded border border-gold/10 shrink-0">
                        {formatCurrency(app.totalPrice || 0)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-10 text-center text-white/20 text-xs">
                    Nenhum agendamento recente.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Stats / Alerts */}
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-base md:text-lg serif px-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gold" />
              Links & Alertas
            </h2>
            <div className="space-y-4">
              {shop && (
                <Card className="p-4 bg-white/5 border-white/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-100 transition-opacity">
                    <Calendar className="w-4 h-4 text-gold" />
                  </div>
                  <div className="flex flex-col gap-3 relative z-10">
                    <div className="font-bold text-xs flex justify-between items-center">
                      <span>Link de Agendamento</span>
                      {copied && (
                        <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded uppercase font-black tracking-wider animate-pulse">
                          Copiado!
                        </span>
                      )}
                    </div>
                    <div 
                      className="bg-black/40 p-3 rounded-xl text-[10px] font-mono break-all text-gold border border-gold/20 select-all cursor-pointer hover:bg-black/60 transition-colors" 
                      onClick={() => {
                        const link = `${window.location.origin}/#/book/${shop.slug}`;
                        if (navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(link);
                        } else {
                          const el = document.createElement('textarea');
                          el.value = link;
                          el.style.position = 'fixed';
                          el.style.opacity = '0';
                          document.body.appendChild(el);
                          el.select();
                          document.execCommand('copy');
                          document.body.removeChild(el);
                        }
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      title="Clique para copiar"
                    >
                      {window.location.origin}/#/book/{shop.slug}
                    </div>
                    <Link 
                      to={`/book/${shop.slug}`}
                      target="_blank"
                      className="w-full"
                    >
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-[10px] h-9 gap-2 border-white/10 hover:border-gold/50"
                      >
                        Visualizar Página Pública
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              )}
              <Card className="p-4 bg-gold/5 border-gold/10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-1">Dica de Crescimento</div>
                    <p className="text-xs text-white/50">Você teve 5 cancelamentos esta semana. Ative os lembretes automáticos no Plano Pro para reduzir perdas.</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-blue-400/5 border-blue-400/10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-1">Feedback do Cliente</div>
                    <p className="text-xs text-white/50">"Ótimo atendimento, mas demorou um pouco para confirmar o horário." - Marcos S.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
