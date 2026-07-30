import { useEffect, useState } from 'react';
import { collection, query, addDoc, doc, deleteDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { Users, Plus, Trash2, Edit2, UserCircle, Star } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useApp } from '../lib/AppContext';
import { Barber } from '../types';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/utils';

export default function BarbersPage() {
  const { shopId, limits, triggerUpgrade } = useApp();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [newBarber, setNewBarber] = useState({ 
    name: '', 
    specialties: '', 
    avatarUrl: '',
    schedule: {
      'week': { start: '09:00', end: '19:00', active: true },
      'sat': { start: '08:00', end: '17:00', active: true },
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Base64 (Firestore has 1MB doc limit)
      alert('A imagem é muito grande. Escolha uma imagem de até 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isEditing && editingBarber) {
        setEditingBarber({ ...editingBarber, avatarUrl: base64String });
      } else {
        setNewBarber({ ...newBarber, avatarUrl: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!shopId) return;

    let unsubscribe: (() => void) | undefined;

    async function setupRealtime() {
      try {
        const q = query(collection(db, 'barbershops', shopId, 'barbers'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          setBarbers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Barber)));
          setLoading(false);
        }, (error) => {
          console.error('Snapshot error (barbers):', error);
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
  }, [shopId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarber.name || !shopId) return;
    setSaving(true);

    try {
      const barberData = {
        barbershopId: shopId,
        name: newBarber.name,
        avatarUrl: newBarber.avatarUrl || null,
        specialties: newBarber.specialties.split(',').map(s => s.trim()).filter(s => s !== ''),
        active: true,
        createdAt: serverTimestamp(),
        schedule: {
          'seg': { ...newBarber.schedule.week },
          'ter': { ...newBarber.schedule.week },
          'qua': { ...newBarber.schedule.week },
          'qui': { ...newBarber.schedule.week },
          'sex': { ...newBarber.schedule.week },
          'sab': { ...newBarber.schedule.sat },
        }
      };
      
      const barberPath = `barbershops/${shopId}/barbers`;
      try {
        await addDoc(collection(db, barberPath), barberData);
        setIsAdding(false);
        setNewBarber({ 
          name: '', 
          specialties: '', 
          avatarUrl: '',
          schedule: {
            'week': { start: '09:00', end: '19:00', active: true },
            'sat': { start: '08:00', end: '17:00', active: true },
          }
        });
      } catch (err: any) {
        console.error('Error adding barber:', err);
        alert('Erro ao adicionar barbeiro. Verifique suas permissões.');
        handleFirestoreError(err, OperationType.WRITE, barberPath);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBarber || !shopId) return;
    setSaving(true);

    const barberPath = `barbershops/${shopId}/barbers/${editingBarber.id}`;
    try {
      await updateDoc(doc(db, barberPath), {
        name: editingBarber.name,
        avatarUrl: editingBarber.avatarUrl || null,
        specialties: Array.isArray(editingBarber.specialties) 
          ? editingBarber.specialties 
          : (editingBarber.specialties as string).split(',').map(s => s.trim()).filter(s => s !== ''),
        schedule: editingBarber.schedule
      });
      setEditingBarber(null);
    } catch (err: any) {
      console.error('Error updating barber:', err);
      alert('Erro ao atualizar barbeiro. Verifique suas permissões.');
      handleFirestoreError(err, OperationType.UPDATE, barberPath);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja excluir permanentemente este barbeiro?')) return;
    
    if (!shopId) {
      alert('Erro: Identificação da barbearia não encontrada.');
      return;
    }

    const deleted = barbers.find(b => b.id === id);
    setBarbers(prev => prev.filter(b => b.id !== id));

    const docRef = doc(db, 'barbershops', shopId, 'barbers', id);
    try {
      await deleteDoc(docRef);
    } catch (err: any) {
      if (deleted) setBarbers(prev => [...prev, deleted]);
      console.error('Delete Error:', err);
      const msg = err.code === 'permission-denied'
        ? 'Permissão negada. Apenas o dono da barbearia pode excluir.'
        : 'Erro ao excluir: ' + (err.message || 'Erro desconhecido');
      alert(msg);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex bg-dark min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-10">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 italic serif">
              <Users className="w-8 h-8 text-gold" />
              Equipe de Barbeiros
            </h1>
            <p className="text-white/40 mt-1 uppercase tracking-widest text-[10px] font-bold">Gestão de Profissionais</p>
          </div>
          <Button variant="gold" onClick={() => {
            if (barbers.length >= limits.maxBarbers) {
              triggerUpgrade(`Seu plano atual permite apenas ${limits.maxBarbers} barbeiros. Faça o upgrade para adicionar mais profissionais!`);
              return;
            }
            setIsAdding(true);
          }} className="w-full sm:w-auto text-xs h-9">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Barbeiro
          </Button>
        </header>

        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <Card className="p-10 border-gold/20 glass">
              <h3 className="text-2xl font-bold mb-8 serif">Novo Barbeiro</h3>
              <form onSubmit={handleAdd} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <Input 
                    label="Nome do Barbeiro" 
                    placeholder="Ex: Marcus V."
                    value={newBarber.name}
                    onChange={e => setNewBarber({ ...newBarber, name: e.target.value })}
                    required
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-3">Foto do Barbeiro</label>
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {newBarber.avatarUrl ? (
                          <img src={newBarber.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-8 h-8 text-white/10" />
                        )}
                      </div>
                      <label className="flex-1">
                        <div className="w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 hover:border-gold/50 flex items-center justify-between gap-3 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-3">
                            <Plus className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-white/40">{newBarber.avatarUrl ? 'Foto Selecionada' : 'Escolher Foto do Dispositivo'}</span>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-white/20">Máx 1MB</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, false)} 
                        />
                      </label>
                    </div>
                  </div>
                  <Input 
                    label="Especialidades" 
                    placeholder="Ex: Degradê, Barba, Pigmentação"
                    value={newBarber.specialties}
                    onChange={e => setNewBarber({ ...newBarber, specialties: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] uppercase font-black text-gold tracking-[0.3em] mb-4">Horário de Trabalho</div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <div className="text-xs font-bold mb-4 opacity-40">Segunda à Sexta</div>
                      <div className="flex gap-4">
                        <Input 
                          type="time" 
                          label="Início" 
                          className="flex-1"
                          value={newBarber.schedule.week.start}
                          onChange={e => setNewBarber({ ...newBarber, schedule: { ...newBarber.schedule, week: { ...newBarber.schedule.week, start: e.target.value } } })}
                        />
                        <Input 
                          type="time" 
                          label="Fim" 
                          className="flex-1"
                          value={newBarber.schedule.week.end}
                          onChange={e => setNewBarber({ ...newBarber, schedule: { ...newBarber.schedule, week: { ...newBarber.schedule.week, end: e.target.value } } })}
                        />
                      </div>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <div className="text-xs font-bold mb-4 opacity-40">Sábado</div>
                      <div className="flex gap-4">
                        <Input 
                          type="time" 
                          label="Início" 
                          className="flex-1"
                          value={newBarber.schedule.sat.start}
                          onChange={e => setNewBarber({ ...newBarber, schedule: { ...newBarber.schedule, sat: { ...newBarber.schedule.sat, start: e.target.value } } })}
                        />
                        <Input 
                          type="time" 
                          label="Fim" 
                          className="flex-1"
                          value={newBarber.schedule.sat.end}
                          onChange={e => setNewBarber({ ...newBarber, schedule: { ...newBarber.schedule, sat: { ...newBarber.schedule.sat, end: e.target.value } } })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 border-t border-white/5 pt-8">
                  <Button variant="ghost" type="button" onClick={() => setIsAdding(false)} disabled={saving}>Cancelar</Button>
                  <Button variant="gold" type="submit" loading={saving}>Salvar Profissional</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {editingBarber && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <Card className="p-10 border-gold/20 glass">
              <h3 className="text-2xl font-bold mb-8 serif">Editar Barbeiro</h3>
              <form onSubmit={handleUpdate} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <Input 
                    label="Nome do Barbeiro" 
                    value={editingBarber.name}
                    onChange={e => setEditingBarber({ ...editingBarber, name: e.target.value })}
                    required
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest pl-3">Alterar Foto</label>
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {editingBarber.avatarUrl ? (
                          <img src={editingBarber.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-8 h-8 text-white/10" />
                        )}
                      </div>
                      <label className="flex-1">
                        <div className="w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 hover:border-gold/50 flex items-center justify-between gap-3 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-3">
                            <Edit2 className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-white/40">Alterar Foto Atual</span>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-white/20">Máx 1MB</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, true)} 
                        />
                      </label>
                    </div>
                  </div>
                  <Input 
                    label="Especialidades (separadas por vírgula)" 
                    value={Array.isArray(editingBarber.specialties) ? editingBarber.specialties.join(', ') : editingBarber.specialties}
                    onChange={e => setEditingBarber({ ...editingBarber, specialties: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                  />
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] uppercase font-black text-gold tracking-[0.3em] mb-4">Ajustar Horário</div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <div className="text-xs font-bold mb-4 opacity-40">Dias de Semana (Seg-Sex)</div>
                      <div className="flex gap-4">
                        <Input 
                          type="time" 
                          label="Início" 
                          className="flex-1"
                          value={editingBarber.schedule['seg']?.start || '09:00'}
                          onChange={e => {
                            const newSched = { ...editingBarber.schedule };
                            ['seg', 'ter', 'qua', 'qui', 'sex'].forEach(day => {
                              newSched[day] = { ...newSched[day], start: e.target.value, active: true };
                            });
                            setEditingBarber({ ...editingBarber, schedule: newSched });
                          }}
                        />
                        <Input 
                          type="time" 
                          label="Fim" 
                          className="flex-1"
                          value={editingBarber.schedule['seg']?.end || '19:00'}
                          onChange={e => {
                            const newSched = { ...editingBarber.schedule };
                            ['seg', 'ter', 'qua', 'qui', 'sex'].forEach(day => {
                              newSched[day] = { ...newSched[day], end: e.target.value, active: true };
                            });
                            setEditingBarber({ ...editingBarber, schedule: newSched });
                          }}
                        />
                      </div>
                    </div>
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                      <div className="text-xs font-bold mb-4 opacity-40">Sábado</div>
                      <div className="flex gap-4">
                        <Input 
                          type="time" 
                          label="Início" 
                          className="flex-1"
                          value={editingBarber.schedule['sab']?.start || '08:00'}
                          onChange={e => {
                            const newSched = { ...editingBarber.schedule };
                            newSched['sab'] = { ...newSched['sab'], start: e.target.value, active: true };
                            setEditingBarber({ ...editingBarber, schedule: newSched });
                          }}
                        />
                        <Input 
                          type="time" 
                          label="Fim" 
                          className="flex-1"
                          value={editingBarber.schedule['sab']?.end || '17:00'}
                          onChange={e => {
                            const newSched = { ...editingBarber.schedule };
                            newSched['sab'] = { ...newSched['sab'], end: e.target.value, active: true };
                            setEditingBarber({ ...editingBarber, schedule: newSched });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 border-t border-white/5 pt-8">
                  <Button variant="ghost" type="button" onClick={() => setEditingBarber(null)} disabled={saving}>Cancelar</Button>
                  <Button variant="gold" type="submit" loading={saving}>Atualizar Profissional</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {barbers.map((barber) => (
            <Card key={barber.id} className="p-8 relative group hover:border-gold/30 transition-all duration-500 overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-gold/10 p-2 rounded-full border border-gold/20">
                  <Star className="w-3 h-3 text-gold" />
                </div>
              </div>
              
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 rounded-full bg-gold/5 flex items-center justify-center border border-gold/20 mb-4 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                  {barber.avatarUrl ? (
                    <img src={barber.avatarUrl} alt={barber.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserCircle className="w-16 h-16 text-gold/30 group-hover:text-gold transition-colors" />
                  )}
                </div>
                <h3 className="text-xl font-bold serif">{barber.name}</h3>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {barber.specialties.map((s, i) => (
                    <span key={i} className="text-[9px] bg-gold/10 text-gold/80 px-2.5 py-1 rounded border border-gold/20 uppercase font-bold tracking-widest">
                      {s}
                    </span>
                  ))}
                  {barber.specialties.length === 0 && (
                    <span className="text-[9px] bg-white/5 text-white/30 px-2.5 py-1 rounded border border-white/5 uppercase font-bold tracking-widest">
                      Multifuncional
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-10 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="text-[9px] text-white/30 uppercase tracking-[2px] font-bold text-center">Disponibilidade Ativa</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-[9px] text-white/20 mb-1 uppercase font-bold">SEG-SEX</div>
                    <div className="text-xs font-bold text-gold/80">
                      {barber.schedule?.['seg']?.start || '09:00'} - {barber.schedule?.['seg']?.end || '19:00'}
                    </div>
                  </div>
                  <div className="text-center border-l border-white/10">
                    <div className="text-[9px] text-white/20 mb-1 uppercase font-bold">SÁBADO</div>
                    <div className="text-xs font-bold text-gold/80">
                      {barber.schedule?.['sab']?.start || '08:00'} - {barber.schedule?.['sab']?.end || '17:00'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-white/5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-[10px] uppercase font-bold tracking-widest"
                  onClick={() => { setEditingBarber(barber); setIsAdding(false); }}
                >
                  <Edit2 className="w-3 h-3 mr-2" /> Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hover:text-red-500 hover:border-red-500/50 w-12" 
                  onClick={() => handleDelete(barber.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}

          {barbers.length === 0 && !isAdding && (
            <div className="md:col-span-3 py-20 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
              <Users className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium">Nenhum barbeiro cadastrado.</p>
              <Button variant="ghost" className="mt-4" onClick={() => setIsAdding(true)}>Adicionar o primeiro</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
