import { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, onSnapshot, doc, updateDoc, deleteDoc, limit } from 'firebase/firestore';
import { Calendar, Clock, CheckCircle2, XCircle, Trash2, User, Filter, MoreVertical, Check, X, Search } from 'lucide-react';
import { db } from '../lib/firebase';
import { useApp } from '../lib/AppContext';
import { Appointment, Barber } from '../types';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import Button from '../components/Button';
import { motion } from 'motion/react';

function formatAppDate(dateStr: string, _timeStr?: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return {
    display: format(date, "dd 'de' MMM", { locale: ptBR }),
    short: format(date, 'dd/MM'),
  };
}

export default function AppointmentsPage() {
  const { shopId } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today'>('all');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (!shopId) return;

    let unsubscribe: (() => void) | undefined;

    async function setupRealtime() {
      try {
        const barbersSnap = await getDocs(collection(db, 'barbershops', shopId, 'barbers'));
        const barbersList: Barber[] = [];
        const barbersMap: Record<string, string> = {};
        barbersSnap.forEach(doc => {
          const barber = { id: doc.id, ...doc.data() } as Barber;
          barbersList.push(barber);
          barbersMap[doc.id] = barber.name;
        });
        setAllBarbers(barbersList);
        setBarbers(barbersMap);

        const appointmentsRef = collection(db, 'barbershops', shopId, 'appointments');
        let q = query(
          appointmentsRef,
          orderBy('date', 'desc'),
          limit(50)
        );

        if (filter === 'today') {
           const today = format(new Date(), 'yyyy-MM-dd');
           q = query(
             appointmentsRef,
             where('date', '==', today),
             orderBy('date', 'desc'),
             limit(50)
           );
        } else if (dateFilter) {
           q = query(
             appointmentsRef,
             where('date', '==', dateFilter),
             orderBy('date', 'desc'),
             limit(50)
           );
        }

        unsubscribe = onSnapshot(q, (snapshot) => {
          setAppointments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
          setLoading(false);
        }, (error) => {
          console.error('Snapshot error (appointments):', error);
        });
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    setupRealtime();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [shopId, filter, dateFilter]);

  const appointmentsCache = useRef(appointments);

  useEffect(() => {
    appointmentsCache.current = appointments;
  }, [appointments]);

  const updateStatus = async (appointmentId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    if (!shopId) return;
    setUpdatingStatus(appointmentId);

    const prev = appointmentsCache.current.find(a => a.id === appointmentId);
    const prevStatus = prev?.status;

    // Optimistic update — muda na hora, sem esperar Firebase
    setAppointments(prev => prev.map(app =>
      app.id === appointmentId ? { ...app, status } : app
    ));

    const appPath = `barbershops/${shopId}/appointments/${appointmentId}`;
    try {
      await updateDoc(doc(db, appPath), { status });
    } catch (err: any) {
      // Reverte para o estado anterior se falhar
      if (prevStatus) {
        setAppointments(prev => prev.map(app =>
          app.id === appointmentId ? { ...app, status: prevStatus } : app
        ));
      }
      console.error('Update Status Error:', err);
      alert('Erro ao atualizar status: ' + (err.message || 'Verifique suas permissões.'));
      handleFirestoreError(err, OperationType.UPDATE, appPath);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const updateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !editingAppointment) return;
    setSavingEdit(true);
    const appPath = `barbershops/${shopId}/appointments/${editingAppointment.id}`;
    try {
      await updateDoc(doc(db, appPath), {
        barberId: editingAppointment.barberId,
        totalPrice: Number(editingAppointment.totalPrice),
        status: editingAppointment.status
      });
      setEditingAppointment(null);
    } catch (err: any) {
      console.error('Update Appointment Error:', err);
      alert('Erro ao salvar alterações: ' + (err.message || 'Verifique suas permissões.'));
      handleFirestoreError(err, OperationType.UPDATE, appPath);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!shopId) {
      alert('Erro: Identificação da barbearia não encontrada.');
      return;
    }
    
    if (!window.confirm('TEM CERTEZA? Esta ação removerá o agendamento PERMANENTEMENTE.')) return;
    
    const deleted = appointmentsCache.current.find(a => a.id === appointmentId);
    
    setAppointments(prev => prev.filter(a => a.id !== appointmentId));

    const docRef = doc(db, 'barbershops', shopId, 'appointments', appointmentId);
    try {
      await deleteDoc(docRef);
    } catch (err: any) {
      if (deleted) setAppointments(prev => [...prev, deleted]);
      console.error('Delete Error:', err);
      const msg = err.code === 'permission-denied'
        ? 'Permissão negada. Apenas o dono da barbearia pode excluir.'
        : 'Erro ao excluir: ' + (err.message || 'Erro desconhecido');
      alert(msg);
    }
  };

  const formattedAppointments = useMemo(() => {
    return appointments.map(app => ({
      ...app,
      _dateDisplay: formatAppDate(app.date, app.startTime),
    }));
  }, [appointments]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex bg-dark min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight italic flex items-center gap-3 serif">
              <Calendar className="w-8 h-8 text-gold" />
              Gestão de Agenda
            </h1>
            <p className="text-white/40 mt-1 text-xs md:text-sm">Veja e gerencie todos os agendamentos da casa.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => { setFilter('all'); setDateFilter(''); }}
              className={cn(
                "px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer",
                filter === 'all' && !dateFilter ? "glass bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <Filter className="w-3.5 h-3.5" /> Todos
            </button>
            <button 
              onClick={() => { setFilter('today'); setDateFilter(''); }}
              className={cn(
                "px-3.5 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer",
                filter === 'today' && !dateFilter ? "premium-gradient text-black" : "glass text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              Hoje
            </button>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={e => { setDateFilter(e.target.value); setFilter('all'); }}
                className="h-full min-h-[36px] md:min-h-[40px] px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm bg-white/5 border border-white/10 text-white/60 focus:border-gold outline-none transition-colors [color-scheme:dark] cursor-pointer"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
            </div>
          </div>
        </header>

        <Card className="p-0 overflow-hidden border-white/5 bg-transparent md:bg-card">
          {/* Desktop Table */}
          <table className="w-full text-left hidden md:table">
            <thead className="bg-[#1a1a1a] text-[10px] uppercase tracking-widest text-[#666] font-bold border-b border-white/5">
              <tr>
                <th className="px-8 py-5">Cliente</th>
                <th className="px-8 py-5">Data & Hora</th>
                <th className="px-8 py-5">Barbeiro</th>
                <th className="px-8 py-5">Valor</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {formattedAppointments.length > 0 ? formattedAppointments.map((app) => (
                <tr key={app.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-white group-hover:text-gold transition-colors">{app.customerName}</div>
                    <div className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1 h-1 rounded-full bg-gold" />
                      {app.customerPhone}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-bold">{app._dateDisplay.display}</div>
                    <div className="text-[10px] text-white/40 italic flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {app.startTime} - {app.endTime || 'Fim fixo'}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-bold text-gold">
                        {(barbers[app.barberId] || 'B')[0]}
                      </div>
                      <span className="text-sm text-white/70">{barbers[app.barberId] || 'Barbeiro'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-white/80">
                    R$ {(app.totalPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-8 py-5">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
                      app.status === 'confirmed' ? "bg-green-400/10 text-green-400 border-green-400/20" :
                      app.status === 'pending' ? "bg-gold/10 text-gold border-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.05)]" :
                      app.status === 'completed' ? "bg-blue-400/10 text-blue-400 border-blue-400/20" :
                      "bg-red-400/10 text-red-400 border-red-400/20"
                    )}>
                      {app.status === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                      {app.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {app.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                      {app.status === 'confirmed' ? 'Confirmado' : 
                       app.status === 'pending' ? 'Pendente' : 
                       app.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => setEditingAppointment(app)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gold/20 rounded-lg transition-all duration-300 text-gold shadow-lg shadow-gold/5 border border-gold/10 cursor-pointer"
                        title="Editar (Barbeiro, Valor, Status)"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {app.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateStatus(app.id, 'confirmed')}
                            disabled={updatingStatus === app.id}
                            className="w-9 h-9 flex items-center justify-center hover:bg-green-500/10 rounded-lg transition-all duration-300 text-green-400 group/conf cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            title="Confirmar Presença"
                          >
                            {updatingStatus === app.id ? (
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            ) : (
                              <Check className="w-4 h-4 group-hover/conf:scale-110" />
                            )}
                          </button>
                          <button 
                            onClick={() => updateStatus(app.id, 'cancelled')}
                            disabled={updatingStatus === app.id}
                            className="w-9 h-9 flex items-center justify-center hover:bg-red-500/10 rounded-lg transition-all duration-300 text-red-400/50 hover:text-red-400 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            title="Cancelar Agendamento"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {app.status === 'confirmed' && (
                        <>
                          <button 
                            onClick={() => updateStatus(app.id, 'completed')}
                            disabled={updatingStatus === app.id}
                            className="w-9 h-9 flex items-center justify-center hover:bg-blue-500/10 rounded-lg transition-all duration-300 text-blue-400 group/comp cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            title="Finalizar (Concluído)"
                          >
                            {updatingStatus === app.id ? (
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 group-hover/comp:scale-110" />
                            )}
                          </button>
                          <button 
                            onClick={() => updateStatus(app.id, 'cancelled')}
                            disabled={updatingStatus === app.id}
                            className="w-9 h-9 flex items-center justify-center hover:bg-red-500/10 rounded-lg transition-all duration-300 text-red-400/50 hover:text-red-400 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                            title="Cancelar Agendamento"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      <button 
                        onClick={() => deleteAppointment(app.id)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-red-600/20 rounded-lg transition-all duration-300 text-white/10 hover:text-red-600 group/del cursor-pointer"
                        title="Excluir Permanentemente (Lixeira)"
                      >
                        <Trash2 className="w-4 h-4 group-hover/del:rotate-12" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-white/20">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-5" />
                    Nenhum agendamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            {formattedAppointments.length > 0 ? formattedAppointments.map((app) => (
              <div key={app.id} className="p-4 space-y-4 hover:bg-white/[0.01] transition-colors bg-card rounded-2xl border border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-white text-base leading-tight">{app.customerName}</div>
                    <div className="text-xs text-white/40 flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      {app.customerPhone}
                    </div>
                  </div>
                  <div className={cn(
                    "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                    app.status === 'confirmed' ? "bg-green-400/10 text-green-400 border-green-400/20" :
                    app.status === 'pending' ? "bg-gold/10 text-gold border-gold/20" :
                    app.status === 'completed' ? "bg-blue-400/10 text-blue-400 border-blue-400/20" :
                    "bg-red-400/10 text-red-400 border-red-400/20"
                  )}>
                    {app.status === 'confirmed' ? 'Confirmado' : 
                     app.status === 'pending' ? 'Pendente' : 
                     app.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-y border-white/5 py-3 text-white/50">
                  <div>
                    <span className="text-[9px] text-white/30 block uppercase font-bold mb-1">Data & Hora</span>
                    <span className="font-semibold text-white truncate block">{app._dateDisplay.display}</span>
                    <span className="block text-[9px] text-white/40 mt-0.5">{app.startTime}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/30 block uppercase font-bold mb-1">Barbeiro & Valor</span>
                    <span className="font-semibold text-white block truncate">{barbers[app.barberId] || 'Barbeiro'}</span>
                    <span className="text-gold font-bold">R$ {app.totalPrice?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    {app.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => updateStatus(app.id, 'confirmed')}
                          disabled={updatingStatus === app.id}
                          className="px-2.5 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 flex items-center gap-1 hover:bg-green-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          {updatingStatus === app.id ? '...' : <><Check className="w-3.5 h-3.5" /> Confirmar</>}
                        </button>
                        <button 
                          onClick={() => updateStatus(app.id, 'cancelled')}
                          disabled={updatingStatus === app.id}
                          className="px-2.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 flex items-center gap-1 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </>
                    )}
                    
                    {app.status === 'confirmed' && (
                      <>
                        <button 
                          onClick={() => updateStatus(app.id, 'completed')}
                          disabled={updatingStatus === app.id}
                          className="px-2.5 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 flex items-center gap-1 hover:bg-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          {updatingStatus === app.id ? '...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Concluir</>}
                        </button>
                        <button 
                          onClick={() => updateStatus(app.id, 'cancelled')}
                          disabled={updatingStatus === app.id}
                          className="px-2.5 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 flex items-center gap-1 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 pt-0.5">
                    <button 
                      onClick={() => setEditingAppointment(app)}
                      className="w-8 h-8 flex items-center justify-center bg-gold/10 hover:bg-gold/20 rounded-lg text-gold border border-gold/10 hover:border-gold/30 active:scale-95 transition-all cursor-pointer"
                      title="Editar"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => deleteAppointment(app.id)}
                      className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 border border-red-500/10 hover:border-red-500/30 active:scale-95 transition-all cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center text-white/20 border border-dashed border-white/5 bg-card/50 rounded-3xl">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-5" />
                Nenhum agendamento encontrado para o filtro.
              </div>
            )}
          </div>
        </Card>
      </main>

      {/* Edit Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass w-full max-w-lg rounded-[2.5rem] border-gold/20 overflow-hidden shadow-2xl relative"
          >
            <div className="absolute top-6 right-6">
              <button 
                onClick={() => setEditingAppointment(null)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/40" />
              </button>
            </div>

            <div className="p-10">
              <div className="text-gold text-[10px] font-black uppercase tracking-[0.4em] mb-4">Ajustes Rápidos</div>
              <h2 className="text-3xl serif italic mb-8">Editar Agendamento</h2>

              <form onSubmit={updateAppointment} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-3">Cliente</label>
                    <div className="px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-sm font-bold text-white/50">
                      {editingAppointment.customerName}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-3">Data/Hora</label>
                    <div className="px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-sm font-bold text-white/50">
                      {editingAppointment.startTime} - {formatAppDate(editingAppointment.date, editingAppointment.startTime).short}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-3">Barbeiro Responsável</label>
                  <select 
                    value={editingAppointment.barberId}
                    onChange={(e) => setEditingAppointment({ ...editingAppointment, barberId: e.target.value })}
                    className="w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 focus:border-gold outline-none text-sm transition-colors appearance-none cursor-pointer"
                  >
                    {allBarbers.map(b => (
                      <option key={b.id} value={b.id} className="bg-[#050505]">{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-3">Valor (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingAppointment.totalPrice}
                      onChange={(e) => setEditingAppointment({ ...editingAppointment, totalPrice: Number(e.target.value) })}
                      className="w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 focus:border-gold outline-none text-sm transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-3">Status</label>
                    <select 
                      value={editingAppointment.status}
                      onChange={(e) => setEditingAppointment({ ...editingAppointment, status: e.target.value as any })}
                      className="w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 focus:border-gold outline-none text-sm transition-colors appearance-none cursor-pointer"
                    >
                      <option value="pending" className="bg-[#050505]">Pendente</option>
                      <option value="confirmed" className="bg-[#050505]">Confirmado</option>
                      <option value="completed" className="bg-[#050505]">Finalizado</option>
                      <option value="cancelled" className="bg-[#050505]">Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="gold" className="w-full h-16 rounded-2xl text-[10px] uppercase font-black tracking-widest" loading={savingEdit}>
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
