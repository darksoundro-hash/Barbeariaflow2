import { useEffect, useState } from 'react';
import { collection, query, addDoc, doc, deleteDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { Scissors, Plus, Trash2, Edit2, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { useApp } from '../lib/AppContext';
import { Service } from '../types';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { formatCurrency, handleFirestoreError, OperationType } from '../lib/utils';
import { motion } from 'motion/react';

export default function ServicesPage() {
  const { shopId, limits, triggerUpgrade } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newService, setNewService] = useState({ name: '', price: '', duration: '', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;

    let unsubscribe: (() => void) | undefined;

    async function setupRealtime() {
      try {
        const q = query(collection(db, 'barbershops', shopId, 'services'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
          setLoading(false);
        }, (error) => {
          console.error('Snapshot error (services):', error);
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
    if (!newService.name || !newService.price || !newService.duration || !shopId) return;

    try {
      const serviceData = {
        barbershopId: shopId,
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration),
        description: newService.description,
        createdAt: serverTimestamp(),
      };
      const servicePath = `barbershops/${shopId}/services`;
      try {
        await addDoc(collection(db, servicePath), serviceData);
        setIsAdding(false);
        setNewService({ name: '', price: '', duration: '', description: '' });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, servicePath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !shopId) return;

    const servicePath = `barbershops/${shopId}/services/${editingService.id}`;
    try {
      await updateDoc(doc(db, servicePath), {
        name: editingService.name,
        price: typeof editingService.price === 'string' ? parseFloat(editingService.price) : editingService.price,
        duration: typeof editingService.duration === 'string' ? parseInt(editingService.duration) : editingService.duration,
        description: editingService.description,
      });
      setEditingService(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, servicePath);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este serviço?')) return;
    
    if (!shopId) {
      alert('Erro: Identificação da barbearia não encontrada.');
      return;
    }

    const deleted = services.find(s => s.id === id);
    setServices(prev => prev.filter(s => s.id !== id));

    const docRef = doc(db, 'barbershops', shopId, 'services', id);
    try {
      await deleteDoc(docRef);
    } catch (err: any) {
      if (deleted) setServices(prev => [...prev, deleted]);
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
              <Scissors className="w-8 h-8 text-gold" />
              Menu de Serviços
            </h1>
            <p className="text-white/40 mt-1 uppercase tracking-widest text-[10px] font-bold">Gestão de Catálogo</p>
          </div>
          <Button variant="gold" onClick={() => {
            if (services.length >= limits.maxServices) {
              triggerUpgrade(`Seu plano atual permite apenas ${limits.maxServices} serviços. Faça o upgrade para cadastrar mais!`);
              return;
            }
            setIsAdding(true);
          }} className="w-full sm:w-auto text-xs h-9">
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </header>

        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <Card className="p-10 border-gold/20 glass">
              <h3 className="text-2xl font-bold mb-8 serif">Cadastrar Serviço</h3>
              <form onSubmit={handleAdd} className="grid md:grid-cols-2 gap-8">
                <Input 
                  label="Nome do Serviço" 
                  placeholder="Ex: Corte Degrade Premium"
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Preço (R$)" 
                    type="number"
                    placeholder="50"
                    value={newService.price}
                    onChange={e => setNewService({ ...newService, price: e.target.value })}
                    required
                  />
                  <Input 
                    label="Duração (min)" 
                    type="number"
                    placeholder="30"
                    value={newService.duration}
                    onChange={e => setNewService({ ...newService, duration: e.target.value })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Input 
                    label="Descrição (Opcional)" 
                    placeholder="Breve descrição do que está incluso"
                    value={newService.description}
                    onChange={e => setNewService({ ...newService, description: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-4 border-t border-white/5 pt-8">
                  <Button variant="ghost" type="button" onClick={() => setIsAdding(false)}>Cancelar</Button>
                  <Button variant="gold" type="submit">Salvar Serviço</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {editingService && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <Card className="p-10 border-gold/20 glass">
              <h3 className="text-2xl font-bold mb-8 serif">Editar Serviço</h3>
              <form onSubmit={handleUpdate} className="grid md:grid-cols-2 gap-8">
                <Input 
                  label="Nome do Serviço" 
                  value={editingService.name}
                  onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Preço (R$)" 
                    type="number"
                    value={editingService.price.toString()}
                    onChange={e => setEditingService({ ...editingService, price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                  <Input 
                    label="Duração (min)" 
                    type="number"
                    value={editingService.duration.toString()}
                    onChange={e => setEditingService({ ...editingService, duration: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Input 
                    label="Descrição (Opcional)" 
                    value={editingService.description || ''}
                    onChange={e => setEditingService({ ...editingService, description: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-4 border-t border-white/5 pt-8">
                  <Button variant="ghost" type="button" onClick={() => setEditingService(null)}>Cancelar</Button>
                  <Button variant="gold" type="submit">Atualizar Serviço</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {services.map((service) => (
            <Card key={service.id} className="p-8 group hover:border-gold/30 transition-all duration-500 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-gold/5 rounded-full blur-2xl group-hover:bg-gold/10 transition-colors" />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-xl font-bold serif mb-1">{service.name}</h3>
                  <div className="flex items-center gap-2 text-white/30 text-[10px] uppercase tracking-widest font-bold">
                    <Clock className="w-3 h-3 text-gold" />
                    {service.duration} minutos
                  </div>
                </div>
                <div className="text-gold font-bold text-2xl serif">{formatCurrency(service.price)}</div>
              </div>
              
              <div className="text-sm text-white/40 mb-8 line-clamp-2 h-10 leading-relaxed italic">
                {service.description || 'Nenhuma descrição detalhada fornecida para este serviço.'}
              </div>

              <div className="flex gap-3 pt-6 border-t border-white/5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 text-[10px] uppercase font-bold tracking-widest"
                  onClick={() => { setEditingService(service); setIsAdding(false); }}
                >
                  <Edit2 className="w-3 h-3 mr-2" /> Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hover:text-red-500 hover:border-red-500/50 w-12" 
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}

          {services.length === 0 && !isAdding && (
            <div className="md:col-span-3 py-20 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
              <Scissors className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium">Nenhum serviço cadastrado.</p>
              <Button variant="ghost" className="mt-4" onClick={() => setIsAdding(true)}>Adicionar Serviço</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
