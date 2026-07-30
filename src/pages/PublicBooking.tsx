import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, limit, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Clock, User, Scissors, CheckCircle2, 
  Phone, ArrowRight, Star, ChevronLeft, ChevronRight, MapPin, 
  ShieldCheck, Sparkles, Heart, MessageCircle 
} from 'lucide-react';
import { db } from '../lib/firebase';
import { Barbershop, Barber, Service } from '../types';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { formatCurrency, cn, formatPhone, handleFirestoreError, OperationType } from '../lib/utils';
import { format, addDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '212, 175, 55';
}

export default function PublicBooking() {
  const { shopSlug } = useParams();

  useEffect(() => {
    document.title = 'Agendamento | BarberFlow';
  }, []);
  const navigate = useNavigate();
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber);
    setSelectedTime('');
  };
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!shopSlug) return;
      setLoading(true);
      setInitError(null);
      try {
        console.log('[DEBUG] Searching for shop with slug:', shopSlug);
        const shopsRef = collection(db, 'barbershops');
        const q = query(shopsRef, where('slug', '==', shopSlug), limit(1));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          console.error('[DEBUG] Shop not found for slug:', shopSlug);
          setInitError('Barbearia não encontrada. Verifique se o link está correto.');
          return;
        }
        
        const shopDoc = snap.docs[0];
        const shopData = { id: shopDoc.id, ...shopDoc.data() } as Barbershop;
        setShop(shopData);
        console.log('[DEBUG] Shop found:', shopData.name, 'ID:', shopData.id);

        const [barbersSnap, servicesSnap] = await Promise.all([
          getDocs(collection(db, 'barbershops', shopData.id, 'barbers')),
          getDocs(collection(db, 'barbershops', shopData.id, 'services'))
        ]);

        setBarbers(barbersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Barber)));
        setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
        console.log('[DEBUG] Barbers and Services loaded');
      } catch (err: any) {
        console.error('[DEBUG] Booking Load Error Full Object:', err);
        let msg = 'Erro ao carregar dados. ';
        if (err.code === 'permission-denied') {
          msg += 'Permissão negada. Verifique as regras do Firestore.';
        } else {
          msg += (err.message || 'Verifique sua conexão.');
        }
        setInitError(msg);
        handleFirestoreError(err, OperationType.LIST, `public_booking_${shopSlug}`);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [shopSlug]);

  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCancel = async (appointmentId: string) => {
    if (!shop || !window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    setCancelling(appointmentId);
    try {
      await updateDoc(doc(db, 'barbershops', shop.id, 'appointments', appointmentId), { status: 'cancelled' });
    } catch (err) {
      console.error(err);
      alert('Erro ao cancelar. Tente novamente.');
    } finally {
      setCancelling(null);
    }
  };

  const handleBooking = async () => {
    if (!shop || !selectedService || !selectedBarber || !selectedTime || !customer.name || !customer.phone) {
      setError('Por favor, preencha todos os campos e selecione um horário.');
      return;
    }

    const [startHour, startMin] = selectedTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = startTotalMin + (selectedService.duration || 40);
    const endHour = Math.floor(endTotalMin / 60);
    const endMin = endTotalMin % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

    // Check for time conflicts
    try {
      const existingApps = await getDocs(query(
        collection(db, 'barbershops', shop.id, 'appointments'),
        where('barberId', '==', selectedBarber.id),
        where('date', '==', format(selectedDate, 'yyyy-MM-dd')),
        where('status', 'in', ['pending', 'confirmed'])
      ));

      const hasConflict = existingApps.docs.some(doc => {
        const app = doc.data();
        const appStart = app.startTime.split(':').map(Number);
        const appEnd = (app.endTime || app.startTime).split(':').map(Number);
        const appStartMin = appStart[0] * 60 + appStart[1];
        const appEndMin = appEnd[0] * 60 + appEnd[1];
        return startTotalMin < appEndMin && endTotalMin > appStartMin;
      });

      if (hasConflict) {
        setError('Este horário já está reservado. Escolha outro horário.');
        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.error('Conflict check error:', err);
    }

    setSubmitting(true);
    setError(null);
    try {
      const cancelToken = Math.random().toString(36).slice(2, 10);
      const appointmentPath = `barbershops/${shop.id}/appointments`;

      await addDoc(collection(db, appointmentPath), {
        barbershopId: shop.id,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedTime,
        endTime,
        status: 'pending',
        totalPrice: Number(selectedService.price),
        cancelToken,
        createdAt: serverTimestamp()
      });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const prevStep = () => {
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-30" />
      <div className="relative z-10">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-gold/20 rounded-full" />
          <div className="w-16 h-16 border-t-2 border-gold rounded-full animate-spin absolute inset-0" />
        </div>
      </div>
    </div>
  );

  if (initError || !shop) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold mb-4 serif italic tracking-tight">{initError || 'Barbearia não encontrada'}</h1>
      <p className="text-white/40 mb-10 max-w-xs">{initError ? 'Desculpe pelo transtorno. Verifique sua conexão ou tente novamente.' : 'Verifique o endereço e tente novamente.'}</p>
      <Button variant="gold" className="px-10 h-14" onClick={() => navigate('/')}>Voltar para o Início</Button>
    </div>
  );

  if (success) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center overflow-y-auto relative">
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-20" />
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gold/5 blur-[150px] rounded-full opacity-50" />
      </div>
      
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="glass p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] max-w-md w-full relative border-gold/20 shadow-2xl shadow-gold/5 z-10 my-10"
      >
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-gold rounded-full flex items-center justify-center shadow-2xl shadow-gold/40 border-4 border-[#050505]"
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>
        
        <h1 className="text-3xl md:text-4xl font-bold mt-8 mb-3 serif italic tracking-tight leading-tight">Agendado com<br/>Sucesso!</h1>
        <p className="text-white/40 mb-8 text-sm leading-relaxed px-4">Sua vaga está garantida. Por favor, chegue com 5 minutos de antecedência.</p>
        
        <div className="text-left bg-white/[0.03] rounded-2xl p-6 mb-8 border border-white/5">
          <div className="text-[10px] text-gold uppercase tracking-[0.2em] font-black mb-5 border-b border-white/5 pb-2">Detalhes da Reserva</div>
          <div className="space-y-4">
            {selectedBarber?.avatarUrl && (
              <div className="flex justify-center -mt-2 mb-2">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gold/30 shadow-lg shadow-gold/10">
                  <img src={selectedBarber.avatarUrl} alt={selectedBarber.name} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="flex justify-between items-start text-xs">
              <span className="text-white/30 uppercase tracking-widest font-bold">Serviço</span>
              <span className="font-bold text-white text-right ml-4">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/30 uppercase tracking-widest font-bold">Barbeiro</span>
              <span className="font-bold text-white">{selectedBarber?.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/30 uppercase tracking-widest font-bold">Horário</span>
              <span className="font-bold text-gold tracking-widest">{selectedTime}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/30 uppercase tracking-widest font-bold">Data</span>
              <span className="font-bold text-gold uppercase tracking-wider">{format(selectedDate, "dd 'DE' MMM", { locale: ptBR })}</span>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-white/20 mb-6 leading-relaxed px-4">
          Para cancelar, acesse o link enviado no seu comprovante ou entre em contato com a barbearia.
        </p>
        
        <Button variant="gold" className="w-full h-14 rounded-2xl font-bold text-sm uppercase tracking-widest" onClick={() => window.location.reload()}>
          Novo Agendamento
        </Button>
        
        <div className="mt-8 pt-8 border-t border-white/5">
          <div className="text-xl serif tracking-tighter opacity-10">BARBER<span className="text-gold uppercase tracking-widest font-black text-[10px] ml-1">flow</span></div>
        </div>
      </motion.div>
    </div>
  );

  const dates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i));

  const getDayKey = (date: Date): string => {
    const day = date.getDay();
    switch (day) {
      case 0: return 'dom';
      case 1: return 'seg';
      case 2: return 'ter';
      case 3: return 'qua';
      case 4: return 'qui';
      case 5: return 'sex';
      case 6: return 'sab';
      default: return 'seg';
    }
  };

  const timeSlots = (() => {
    if (!selectedBarber) return [];
    
    const dayKey = getDayKey(selectedDate);
    const daySchedule = selectedBarber.schedule?.[dayKey];
    
    // Default fallback if no schedule is set for this day
    let startStr = '09:00';
    let endStr = '19:00';
    let isActive = true;
    
    if (daySchedule) {
      startStr = daySchedule.start || '09:00';
      endStr = daySchedule.end || '19:00';
      isActive = daySchedule.active !== false;
    } else {
      // General defaults if empty
      if (dayKey === 'sab') {
        startStr = '07:00';
        endStr = '16:00';
      } else if (dayKey === 'dom') {
        isActive = false;
      } else {
        startStr = '07:00';
        endStr = '18:00';
      }
    }
    
    if (!isActive || dayKey === 'dom') return [];
    
    const [startHour, startMin] = startStr.split(':').map(Number);
    const [endHour, endMin] = endStr.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Ensure duration step is reasonable (range: 20-120 minutes)
    const step = Math.max(20, Math.min(120, selectedService?.duration ?? 40));
    const slots: string[] = [];
    
    let current = startMinutes;
    // Lunch break is typically from 12:00 to 13:20
    const lunchStart = 12 * 60;
    const lunchEnd = 13 * 60 + 20;
    
    // Only apply lunch break if the shift encompasses it
    const hasLunch = (startMinutes < 12 * 60) && (endMinutes > 13 * 60 + 20);
    
    while (current + step <= endMinutes) {
      if (hasLunch && current >= lunchStart && current < lunchEnd) {
        current = lunchEnd;
        continue;
      }
      
      const h = Math.floor(current / 60);
      const m = current % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      slots.push(timeStr);
      current += step;
    }
    
    return slots;
  })();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-gold selection:text-black relative" style={{ '--color-gold': shop.theme?.primaryColor || '#D4AF37', '--color-gold-muted': `rgba(${hexToRgb(shop.theme?.primaryColor || '#D4AF37')}, 0.1)` } as React.CSSProperties}>
      {/* Background with shop logo watermark */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/3 via-[#050505] to-[#050505]" />
        {shop.logoUrl && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] opacity-[0.03]">
            <img src={shop.logoUrl} alt="" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full" />
      </div>

      {/* Hero Banner */}
      <div className="relative z-10">
        <div className="relative h-48 sm:h-56 md:h-72 overflow-hidden">
          {shop.coverUrl ? (
            <img src={shop.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : shop.logoUrl ? (
            <img src={shop.logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-[#050505]/50 to-[#050505]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/20 via-transparent to-transparent" />
          <div className="relative h-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-3">
              {shop.logoUrl && (
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl overflow-hidden border border-[var(--primary)]/30 shadow-lg shadow-[var(--primary)]/10 shrink-0 bg-white/5">
                  <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl serif tracking-tighter italic font-bold">{shop.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 text-[#C5A059] fill-[#C5A059]" />)}
                  </div>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Premium</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-white/30 uppercase tracking-widest">
              {shop.address && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" style={{ color: 'var(--primary)' }} />{shop.address}</span>
              )}
              {shop.phone && (
                <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" style={{ color: 'var(--primary)' }} />{shop.phone}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col lg:flex-row gap-6 sm:gap-10 lg:gap-12">
        {/* Left Side: Info & Progress */}
        <aside className="lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-10 space-y-8">
            {/* Step progress - horizontal on mobile, vertical on desktop */}
            <div className="flex lg:flex-col gap-3">
              {[
                { s: 1, label: 'Escolha o Serviço', desc: 'Selecione o que deseja' },
                { s: 2, label: 'Escolha o Profissional', desc: 'Seu estilo, seu barbeiro' },
                { s: 3, label: 'Data & Horário', desc: 'Confirme sua reserva' }
              ].map((item) => (
                <div key={item.s} className="flex items-center gap-3 lg:gap-4 group cursor-default">
                  <div className={cn(
                    "w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 flex items-center justify-center text-[10px] lg:text-xs font-bold transition-all duration-500 shrink-0",
                    step === item.s ? "border-[var(--primary)] bg-[var(--primary)] text-black scale-110 shadow-lg" : 
                    step > item.s ? "border-green-500 bg-green-500 text-white" : "border-white/10 text-white/20"
                  )}>
                    {step > item.s ? <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5" /> : item.s}
                  </div>
                  <div className="hidden lg:block">
                    <div className={cn(
                      "text-[9px] uppercase tracking-[0.2em] font-black transition-colors",
                      step === item.s ? "text-gold" : "text-white/20"
                    )}>{item.label}</div>
                    <div className="text-[8px] text-white/10 uppercase tracking-widest">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* About & Social */}
            {(shop.description || shop.theme?.whatsapp) && (
              <div className="space-y-3">
                {shop.description && (
                  <div>
                    <div className="text-[10px] text-gold uppercase tracking-[0.2em] font-black mb-3 flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5" /> Sobre
                    </div>
                    <p className="text-[12px] text-white/50 leading-relaxed">{shop.description}</p>
                  </div>
                )}
                {shop.theme?.whatsapp && (
                  <a
                    href={`https://wa.me/${shop.theme.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-gold hover:text-white transition-colors group"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="border-b border-gold/20 group-hover:border-gold/50 transition-colors">Fale conosco no WhatsApp</span>
                  </a>
                )}
              </div>
            )}

            {/* Selection Summary - hidden on mobile */}
            <div className="hidden lg:block">
              <AnimatePresence>
                {selectedService && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="pt-8 border-t border-white/5"
                  >
                    <div className="text-[10px] text-gold uppercase tracking-[0.2em] font-black mb-5 flex items-center gap-2">
                      <Scissors className="w-3.5 h-3.5" /> Resumo
                    </div>
                    <div className="bg-white/[0.02] rounded-2xl p-5 space-y-4 border border-white/5">
                      <div>
                        <div className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Serviço</div>
                        <div className="text-sm font-bold">{selectedService.name}</div>
                      </div>
                      {selectedBarber && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <div className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Barbeiro</div>
                          <div className="flex items-center gap-2">
                            {selectedBarber.avatarUrl && (
                              <div className="w-6 h-6 rounded-full overflow-hidden border border-gold/30">
                                <img src={selectedBarber.avatarUrl} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <span className="text-sm font-bold">{selectedBarber.name}</span>
                          </div>
                        </motion.div>
                      )}
                      {selectedTime && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <div className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Data & Hora</div>
                          <div className="text-sm font-bold text-gold">{format(selectedDate, 'dd/MM')} • {selectedTime}</div>
                        </motion.div>
                      )}
                      <div className="pt-3 border-t border-white/5">
                        <div className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-1">Valor</div>
                        <div className="text-2xl serif italic text-white">{formatCurrency(Number(selectedService.price))}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </aside>

        {/* Right Side: Step Content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div 
              key={step} 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {step === 1 && (
                <div className="space-y-6 sm:space-y-10">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="relative h-32 sm:h-48 md:h-64 rounded-2xl sm:rounded-[2rem] overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 via-[#050505] to-[#050505]" />
                      {shop.bottomImageUrl ? (
                        <img src={shop.bottomImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : shop.coverUrl ? (
                        <img src={shop.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-700" />
                      ) : shop.logoUrl ? (
                        <img src={shop.logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-700" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
                      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8">
                         <div className="flex items-center gap-2 text-gold text-[8px] sm:text-[10px] uppercase tracking-[0.4em] font-black mb-1">
                            <Sparkles className="w-3 h-3" /> {shop.name}
                         </div>
                          <h3 className="text-lg sm:text-2xl font-bold serif italic tracking-tight">{shop.tagline || 'Excelência em Cada Detalhe'}</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-1 sm:space-y-2">
                      <h2 className="text-2xl sm:text-3xl serif italic tracking-tighter">Selecione o Serviço</h2>
                      <p className="text-white/40 text-xs sm:text-[13px]">Escolha a experiência que você deseja hoje.</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-3 sm:gap-5">
                    {services.map((service, idx) => (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={service.id}
                        onClick={() => { setSelectedService(service); nextStep(); }}
                        className={cn(
                          "w-full text-left p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border transition-all duration-500 group relative overflow-hidden active:scale-[0.98]",
                          selectedService?.id === service.id ? "bg-gold/10 border-gold shadow-2xl shadow-gold/20" : "bg-white/[0.02] border-white/5 hover:border-gold/30 hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex justify-between items-center relative z-10">
                          <div className="space-y-1">
                            <h3 className="serif text-xl md:text-2xl group-hover:text-gold transition-colors duration-500">{service.name}</h3>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-white/30">
                                <Clock className="w-3 h-3" /> {service.duration} MIN
                              </span>
                            </div>
                          </div>
                          <div className="text-2xl md:text-3xl serif italic text-gold group-hover:scale-110 transition-transform duration-500">
                            {formatCurrency(service.price)}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 sm:space-y-10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl serif italic tracking-tighter">Escolha o Profissional</h2>
                      <p className="text-white/40 text-[11px] sm:text-xs md:text-[13px]">Cada barbeiro tem seu estilo único de arte.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); prevStep(); }}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/15 flex items-center justify-center bg-white/[0.02] hover:bg-white/10 text-gold hover:text-white transition-all cursor-pointer z-40 relative shrink-0 active:scale-90"
                      aria-label="Voltar para a etapa anterior"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-5">
                    {barbers.map((barber, idx) => (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        key={barber.id}
                        onClick={() => { handleBarberSelect(barber); nextStep(); }}
                        className={cn(
                          "flex flex-col items-center text-center gap-4 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-[2rem] border transition-all duration-500 group relative active:scale-[0.98]",
                          selectedBarber?.id === barber.id ? "bg-gold/10 border-gold shadow-xl shadow-gold/10" : "bg-white/[0.02] border-white/5 hover:border-gold/30 hover:bg-white/[0.04]"
                        )}
                      >
                        <div className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 overflow-hidden",
                          selectedBarber?.id === barber.id ? "border-gold shadow-lg shadow-gold/20" : "border-white/10 group-hover:border-gold/30"
                        )}>
                          {barber.avatarUrl ? (
                            <img src={barber.avatarUrl} alt={barber.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-white/40" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold serif text-xl md:text-2xl group-hover:text-gold transition-colors">{barber.name}</h3>
                          {barber.specialties?.length > 0 && (
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">{barber.specialties.slice(0, 2).join(', ')}</p>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 sm:space-y-10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl md:text-3xl serif italic tracking-tighter">Data & Horário</h2>
                      <p className="text-white/40 text-[11px] sm:text-xs md:text-[13px]">Agende sua presença para o melhor atendimento.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); prevStep(); }}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/15 flex items-center justify-center bg-white/[0.02] hover:bg-white/10 text-gold hover:text-white transition-all cursor-pointer z-40 relative shrink-0 active:scale-90"
                      aria-label="Voltar para a etapa anterior"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="space-y-6 sm:space-y-10">
                    {/* Active Availability Display */}
                    {selectedBarber && (
                      <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-4">
                        <div className="text-[9px] text-white/30 uppercase tracking-[2px] font-bold text-center">Disponibilidade Ativa de {selectedBarber.name}</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-[9px] text-white/20 mb-1 uppercase font-bold">SEG-SEX</div>
                            <div className="text-xs font-bold text-gold">
                              {selectedBarber.schedule?.['seg']?.start || '09:00'} - {selectedBarber.schedule?.['seg']?.end || '19:00'}
                            </div>
                          </div>
                          <div className="text-center border-l border-white/5">
                            <div className="text-[9px] text-white/20 mb-1 uppercase font-bold">SÁBADO</div>
                            <div className="text-xs font-bold text-gold">
                              {selectedBarber.schedule?.['sab']?.start || '08:00'} - {selectedBarber.schedule?.['sab']?.end || '17:00'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Date Selector */}
                    <div className="group">
                      <div className="flex items-center justify-between mb-6">
                        <div className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-gold" /> Datas Disponíveis
                        </div>
                        <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={scrollLeft}
                            className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02] hover:bg-white/10 hover:border-gold/30 text-white/50 hover:text-white transition-all duration-300"
                            title="Voltar"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            type="button" 
                            onClick={scrollRight}
                            className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02] hover:bg-white/10 hover:border-gold/30 text-white/50 hover:text-white transition-all duration-300"
                            title="Avançar"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div 
                        ref={scrollContainerRef}
                        className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide scroll-smooth"
                      >
                        {dates.map((date, i) => {
                          const isActive = isSameDay(selectedDate, date);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleDateChange(date)}
                              className={cn(
                                "flex flex-col items-center min-w-[80px] p-5 rounded-2xl border transition-all duration-500 shrink-0",
                                isActive ? "bg-gold text-black border-gold shadow-xl shadow-gold/20 scale-105" : "bg-white/[0.02] border-white/5 hover:border-gold/30 hover:bg-white/[0.04]"
                              )}
                            >
                              <span className={cn(
                                "text-[9px] uppercase font-black mb-3 tracking-[0.3em] transition-colors",
                                isActive ? "text-black/60" : "text-white/30"
                              )}>{format(date, 'eee', { locale: ptBR })}</span>
                              <span className="text-2xl font-bold serif leading-none">{format(date, 'dd')}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Selector */}
                    <div className="group">
                      <div className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black mb-6 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gold" /> Horários Disponíveis
                      </div>
                      {timeSlots.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {timeSlots.map((time) => {
                            const isActive = selectedTime === time;
                            return (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={cn(
                                  "p-4 rounded-xl border text-[11px] font-black tracking-widest uppercase transition-all duration-500",
                                  isActive ? "bg-gold text-black border-gold shadow-lg shadow-gold/10" : "bg-white/[0.02] border-white/5 hover:border-gold/30 text-white/40 hover:text-white"
                                )}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center p-8 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <p className="text-sm text-white/40">Este profissional não atende neste dia ou está com a agenda fechada.</p>
                        </div>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="pt-8 border-t border-white/5">
                      <div className="text-[10px] text-gold uppercase tracking-[0.3em] font-black mb-8 flex items-center gap-2">
                        <User className="w-3 h-3" /> Suas Informações
                      </div>
                      <Card className="p-8 border-white/5 bg-white/[0.01] rounded-[2rem] space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <Input 
                            label="Seu Nome" 
                            placeholder="Ex: João Silva"
                            className="h-14 bg-white/5 border-white/10 rounded-xl"
                            value={customer.name}
                            onChange={e => setCustomer({ ...customer, name: e.target.value })}
                          />
                          <Input 
                            label="WhatsApp" 
                            placeholder="(00) 00000-0000"
                            className="h-14 bg-white/5 border-white/10 rounded-xl"
                            value={customer.phone}
                            onChange={e => setCustomer({ ...customer, phone: formatPhone(e.target.value) })}
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-gold/5 rounded-2xl border border-gold/10">
                          <div className="flex items-start gap-4 text-left">
                            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                              <div className="text-sm font-bold serif italic">Reserva Garantida</div>
                              <p className="text-[10px] text-white/40 uppercase tracking-widest leading-tight mt-1">Seus dados estão protegidos.</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="pt-6 sm:pt-10">
                      <Button 
                        variant="gold" 
                        className="w-full h-14 sm:h-20 rounded-2xl sm:rounded-[2rem] text-base sm:text-lg serif italic group relative overflow-hidden" 
                        onClick={handleBooking}
                        loading={submitting}
                      >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                        <span className="relative z-10 flex items-center justify-center">
                          Confirmar Reserva Premium
                          <ArrowRight className="ml-2 sm:ml-3 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform duration-500" />
                        </span>
                      </Button>
                      
                      {(!selectedTime || !customer.name || !customer.phone) && (
                        <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold text-center mt-6">
                           Selecione um horário e preencha seus dados para finalizar
                        </p>
                      )}

                      {error && (
                        <p className="text-xs text-red-500 font-bold text-center mt-4">
                          {error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <footer className="mt-20 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="text-sm serif tracking-tighter opacity-10">BARBER<span className="text-gold uppercase tracking-widest font-black text-[9px] ml-0.5">flow</span></div>
          <div className="flex items-center gap-4">
            {shop.theme?.whatsapp && (
              <a
                href={`https://wa.me/${shop.theme.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-white/20 hover:text-gold uppercase tracking-widest font-bold transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </a>
            )}
            <div className="text-[8px] uppercase tracking-[0.2em] font-bold text-white/10">
              {shop.name} • Agendamento Online
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Summary bar */}
      <AnimatePresence>
        {selectedService && step < 3 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="lg:hidden fixed bottom-6 left-6 right-6 z-50 overflow-hidden"
          >
            <div className="glass !bg-black/80 backdrop-blur-xl border border-gold/30 rounded-3xl p-4 flex items-center justify-between shadow-2xl shadow-gold/20">
              <div className="flex items-center gap-3 min-w-0">
                {selectedBarber?.avatarUrl ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold/30 shrink-0">
                    <img src={selectedBarber.avatarUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                    <Scissors className="w-5 h-5 text-gold" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-[9px] text-white/40 uppercase tracking-widest font-black leading-none mb-0.5">Próximo Passo</div>
                  <div className="text-sm font-bold truncate">{selectedService.name}</div>
                </div>
              </div>
              <Button 
                variant="gold" 
                size="sm" 
                className="rounded-xl px-5 h-9 text-[9px] uppercase font-black tracking-widest shrink-0 ml-3"
                onClick={nextStep}
              >
                {step === 1 ? 'BARBEIRO' : 'AGENDAR'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
