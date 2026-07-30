import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Calendar, Clock, CheckCircle2, LogOut, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { useApp } from '../lib/AppContext';
import { Appointment, Barber } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export default function BarberDashboard() {
  const { shopId, profile, shop } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shopId || !profile) return;

    async function findBarber() {
      const snap = await getDocs(collection(db, 'barbershops', shopId, 'barbers'));
      const barber = snap.docs.find(d => (d.data() as Barber).name === profile!.displayName);
      if (barber) setBarberId(barber.id);
    }
    findBarber();
  }, [shopId, profile]);

  useEffect(() => {
    if (!shopId || !barberId) return;

    const q = query(
      collection(db, 'barbershops', shopId, 'appointments'),
      where('barberId', '==', barberId),
      where('date', '>=', format(new Date(), 'yyyy-MM-dd')),
      orderBy('date', 'asc'),
      orderBy('startTime', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
      setLoading(false);
      setError(null);
    }, (err: any) => {
      console.error(err);
      if (err.code === 'failed-precondition' || err.message?.includes('index')) {
        setError('É necessário criar um índice composto no Firestore. Verifique o console do Firebase.');
      } else {
        setError('Erro ao carregar agendamentos.');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [shopId, barberId]);

  const updateStatus = async (id: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    if (!shopId) return;
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'barbershops', shopId, 'appointments', id), { status });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="animate-pulse text-xl text-gold tracking-widest">BARBERFLOW</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark p-4 md:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl serif italic mb-1">Olá, {profile?.displayName || 'Barbeiro'}</h1>
          <p className="text-xs text-white/40">{shop?.name} — Seus agendamentos</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/appointments" className="text-[10px] text-gold hover:underline uppercase tracking-widest font-bold">
            Agenda Geral
          </Link>
          <button onClick={() => auth?.signOut()} className="text-red-400/70 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {error && (
          <Card className="p-6 border-red-500/20 bg-red-500/5">
            <p className="text-red-400 text-sm">{error}</p>
          </Card>
        )}
        {appointments.length === 0 && !error && (
          <Card className="p-12 text-center text-white/20">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum agendamento futuro.</p>
          </Card>
        )}

        {appointments.map((app) => (
          <Card key={app.id} className="p-6 border-white/5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{app.customerName}</h3>
                <p className="text-xs text-white/40">{app.customerPhone}</p>
              </div>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border shrink-0",
                app.status === 'confirmed' ? "bg-green-400/10 text-green-400 border-green-400/20" :
                app.status === 'pending' ? "bg-gold/10 text-gold border-gold/20" :
                app.status === 'completed' ? "bg-blue-400/10 text-blue-400 border-blue-400/20" :
                "bg-red-400/10 text-red-400 border-red-400/20"
              )}>
                {app.status === 'confirmed' ? 'Confirmado' : 
                 app.status === 'pending' ? 'Pendente' : 
                 app.status === 'completed' ? 'Finalizado' : 'Cancelado'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-white/50 border-y border-white/5 py-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold" />
                {formatDate(app.date)}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gold" />
                {app.startTime} - {app.endTime}
              </div>
            </div>

            {(app.status === 'pending' || app.status === 'confirmed') && (
              <div className="flex gap-2">
                {app.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-green-400 border-green-500/20 hover:bg-green-500/10 text-[10px]"
                      onClick={() => updateStatus(app.id, 'confirmed')}
                      loading={updatingId === app.id}
                    >
                      <Check className="w-3 h-3 mr-1" /> Confirmar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-400 border-red-500/20 hover:bg-red-500/10 text-[10px]"
                      onClick={() => updateStatus(app.id, 'cancelled')}
                      loading={updatingId === app.id}
                    >
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  </>
                )}
                {app.status === 'confirmed' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-blue-400 border-blue-500/20 hover:bg-blue-500/10 text-[10px]"
                      onClick={() => updateStatus(app.id, 'completed')}
                      loading={updatingId === app.id}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-400 border-red-500/20 hover:bg-red-500/10 text-[10px]"
                      onClick={() => updateStatus(app.id, 'cancelled')}
                      loading={updatingId === app.id}
                    >
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}