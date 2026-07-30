import { useState, FormEvent, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { Settings as SettingsIcon, Save, Building2, UserCircle, Globe, Shield, Upload, Image, PanelTop, PanelBottom, Palette, MessageCircle, Link as LinkIcon } from 'lucide-react';
import { auth, db, uploadImage } from '../lib/firebase';
import { useApp } from '../lib/AppContext';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { handleFirestoreError, OperationType, generateSlug } from '../lib/utils';

export default function SettingsPage() {
  const { profile, shop, loading: authLoading } = useApp();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const originalLogoUrl = useRef('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const originalCoverUrl = useRef('');
  const [bottomImageUrl, setBottomImageUrl] = useState('');
  const [bottomImageFile, setBottomImageFile] = useState<File | null>(null);
  const [bottomImagePreview, setBottomImagePreview] = useState('');
  const originalBottomImageUrl = useRef('');
  const [imageTab, setImageTab] = useState<'top' | 'bottom'>('top');
  const [tagline, setTagline] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#D4AF37');
  const [aboutText, setAboutText] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const inited = useRef(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!inited.current && profile && shop) {
      setDisplayName(profile.displayName);
      setShopName(shop.name);
      setShopAddress(shop.address || '');
      setShopPhone(shop.phone || '');
      const initialLogo = shop.logoUrl || '';
      setLogoUrl(initialLogo);
      originalLogoUrl.current = initialLogo;
      const initialCover = shop.coverUrl || '';
      setCoverUrl(initialCover);
      originalCoverUrl.current = initialCover;
      const initialBottom = shop.bottomImageUrl || '';
      setBottomImageUrl(initialBottom);
      originalBottomImageUrl.current = initialBottom;
      setTagline(shop.tagline || '');
      setPrimaryColor(shop.theme?.primaryColor || '#D4AF37');
      setAboutText(shop.description || '');
      setWhatsapp(shop.theme?.whatsapp || '');
      inited.current = true;
    }
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, [profile, shop]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 5MB.');
      return;
    }

    setLogoFile(file);
    try {
      const compressed = await compressImage(file, 400, 0.6);
      setLogoPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setLogoUrl('');
    setLogoFile(null);
  };

  const compressImage = (file: File, maxWidth: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Erro ao comprimir')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 5MB.');
      return;
    }

    setCoverFile(file);
    try {
      const compressed = await compressImage(file, 1200, 0.7);
      setCoverPreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveCover = () => {
    setCoverPreview('');
    setCoverUrl('');
    setCoverFile(null);
  };

  const handleBottomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 5MB.');
      return;
    }

    setBottomImageFile(file);
    try {
      const compressed = await compressImage(file, 1200, 0.7);
      setBottomImagePreview(compressed);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setBottomImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBottomImage = () => {
    setBottomImagePreview('');
    setBottomImageUrl('');
    setBottomImageFile(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !profile || !shop) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const newSlug = generateSlug(shopName);
      
      // Update User
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { displayName });

      // Update Shop
      const shopRef = doc(db, 'barbershops', profile.barbershopId!);
      const shopId = profile.barbershopId!;
      const updateData: Record<string, any> = { 
        name: shopName,
        slug: newSlug,
        address: shopAddress || null,
        phone: shopPhone || null
      };

      if (logoPreview) {
        const url = await uploadImage(logoPreview, `barbershops/${shopId}/logo`);
        updateData.logoUrl = url;
      } else if (!logoPreview && !logoUrl && originalLogoUrl.current) {
        updateData.logoUrl = '';
      }

      if (coverPreview) {
        const url = await uploadImage(coverPreview, `barbershops/${shopId}/cover`);
        updateData.coverUrl = url;
      } else if (!coverPreview && !coverUrl && originalCoverUrl.current) {
        updateData.coverUrl = '';
      }

      if (bottomImagePreview) {
        const url = await uploadImage(bottomImagePreview, `barbershops/${shopId}/bottom`);
        updateData.bottomImageUrl = url;
      } else if (!bottomImagePreview && !bottomImageUrl && originalBottomImageUrl.current) {
        updateData.bottomImageUrl = '';
      }

      if (tagline) {
        updateData.tagline = tagline;
      }
      if (aboutText) {
        updateData.description = aboutText;
      }
      updateData.theme = {
        primaryColor: primaryColor === '#D4AF37' ? '' : primaryColor,
        whatsapp: whatsapp || '',
      };
      console.log('[DEBUG] Salvando dados da barbearia:', updateData);
      await updateDoc(shopRef, updateData);
      console.log('[DEBUG] updateDoc concluído com sucesso');

      // Atualiza estados para não re-enviar as mesmas imagens
      if ('logoUrl' in updateData) {
        setLogoUrl(updateData.logoUrl || '');
        setLogoPreview('');
        originalLogoUrl.current = updateData.logoUrl || '';
      }
      if ('coverUrl' in updateData) {
        setCoverUrl(updateData.coverUrl || '');
        setCoverPreview('');
        originalCoverUrl.current = updateData.coverUrl || '';
      }
      if ('bottomImageUrl' in updateData) {
        setBottomImageUrl(updateData.bottomImageUrl || '');
        setBottomImagePreview('');
        originalBottomImageUrl.current = updateData.bottomImageUrl || '';
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso! O link de agendamento foi atualizado.' });
      
      if (messageTimer.current) clearTimeout(messageTimer.current);
      messageTimer.current = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings');
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-dark flex">
      <Sidebar />
      <main className="flex-1 ml-0 lg:ml-64 p-4 md:p-10">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 italic serif">
            <SettingsIcon className="w-8 h-8 text-gold" />
            Configurações
          </h1>
          <p className="text-white/40 mt-1 uppercase tracking-widest text-[10px] font-bold">Ajustes do Sistema e Perfil</p>
        </header>

        <form onSubmit={handleSave} className="max-w-4xl space-y-6 md:space-y-8">
          {message.text && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${
                message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {message.text}
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Barbershop Settings */}
            <Card className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                  <Building2 className="w-5 h-5 text-gold" />
                </div>
                <h3 className="text-xl font-bold serif">Sua Barbearia</h3>
              </div>
              
              <Input 
                label="Nome da Barbearia"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                required
              />

              <Input 
                label="Endereço"
                placeholder="Rua, número, bairro"
                value={shopAddress}
                onChange={e => setShopAddress(e.target.value)}
              />

              <Input 
                label="Telefone"
                placeholder="(00) 00000-0000"
                value={shopPhone}
                onChange={e => setShopPhone(e.target.value)}
              />

              <div className="space-y-3">
                <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">Logo da Barbearia</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    {logoPreview || logoUrl ? (
                      <img src={logoPreview || logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-10 h-10 text-white/20" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between gap-3 w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 hover:border-gold/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <Upload className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-white/40">{logoPreview || logoUrl ? 'Trocar Logo' : 'Fazer Upload da Logo'}</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-white/20">Máx 5MB</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {(logoPreview || logoUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-bold shrink-0 px-3 py-2 rounded-xl border border-red-400/20 hover:bg-red-400/10 transition-all"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {/* Image Tabs */}
              <div className="space-y-3">
                <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">Imagens da Página</label>

                {/* Tab buttons */}
                <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                  <button
                    type="button"
                    onClick={() => setImageTab('top')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${
                      imageTab === 'top'
                        ? 'bg-gold text-black shadow-lg shadow-gold/20'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <PanelTop className="w-3.5 h-3.5" />
                    Topo
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageTab('bottom')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${
                      imageTab === 'bottom'
                        ? 'bg-gold text-black shadow-lg shadow-gold/20'
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    <PanelBottom className="w-3.5 h-3.5" />
                    Rodapé
                  </button>
                </div>

                {/* Top Image */}
                {imageTab === 'top' && (
                  <div>
                    <p className="text-[9px] text-white/20 italic mb-3">Essa imagem aparece no topo da página de agendamento.</p>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {coverPreview || coverUrl ? (
                          <img src={coverPreview || coverUrl} alt="Topo" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-8 h-8 text-white/20" />
                        )}
                      </div>
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between gap-3 w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 hover:border-gold/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <Upload className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-white/40">{coverPreview || coverUrl ? 'Trocar Imagem' : 'Fazer Upload'}</span>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-white/20">Máx 5MB</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      </label>
                      {(coverPreview || coverUrl) && (
                        <button
                          type="button"
                          onClick={handleRemoveCover}
                          className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-bold shrink-0 px-3 py-2 rounded-xl border border-red-400/20 hover:bg-red-400/10 transition-all"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Bottom Image */}
                {imageTab === 'bottom' && (
                  <div>
                    <p className="text-[9px] text-white/20 italic mb-3">Essa imagem aparece na parte inferior da página de agendamento.</p>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {bottomImagePreview || bottomImageUrl ? (
                          <img src={bottomImagePreview || bottomImageUrl} alt="Rodapé" className="w-full h-full object-cover" />
                        ) : (
                          <Image className="w-8 h-8 text-white/20" />
                        )}
                      </div>
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between gap-3 w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 hover:border-gold/50 transition-colors group">
                          <div className="flex items-center gap-3">
                            <Upload className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
                            <span className="text-sm text-white/40">{bottomImagePreview || bottomImageUrl ? 'Trocar Imagem' : 'Fazer Upload'}</span>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-white/20">Máx 5MB</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBottomImageUpload} />
                      </label>
                      {(bottomImagePreview || bottomImageUrl) && (
                        <button
                          type="button"
                          onClick={handleRemoveBottomImage}
                          className="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-bold shrink-0 px-3 py-2 rounded-xl border border-red-400/20 hover:bg-red-400/10 transition-all"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">Slogan / Tagline</label>
                <p className="text-[9px] text-white/20 italic -mt-1">Aparece abaixo do nome da barbearia na página de agendamento.</p>
                <input
                  type="text"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="Ex: Excelência em Cada Detalhe"
                  className="w-full h-14 px-6 bg-white/5 rounded-2xl border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-gold/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">URL de Agendamento</label>
                <div className="bg-black/40 p-3 rounded text-[11px] font-mono text-gold border border-gold/20 select-all">
                  {window.location.origin}/#/book/{generateSlug(shopName) || shop?.slug}
                </div>
                <p className="text-[10px] text-white/20 italic">* O link de agendamento é gerado automaticamente a partir do nome.</p>
              </div>
            </Card>

            {/* Profile Settings */}
            <Card className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                  <UserCircle className="w-5 h-5 text-gold" />
                </div>
                <h3 className="text-xl font-bold serif">Seu Perfil</h3>
              </div>

              <Input 
                label="Nome do Proprietário"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
              />

              <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">E-mail de Acesso</label>
                <Input 
                  value={profile?.email || ''}
                  disabled
                  className="opacity-50"
                />
              </div>
            </Card>
          </div>

          {/* Personalization */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                <Palette className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-bold serif">Personalização</h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">Cor Principal</label>
                <p className="text-[9px] text-white/20 italic -mt-1">Usada nos detalhes e destaques da página.</p>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="flex-1 h-12 px-4 bg-white/5 rounded-xl border border-white/10 text-white text-xs font-mono outline-none focus:border-gold/50 transition-colors"
                    placeholder="#D4AF37"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">WhatsApp</label>
                <p className="text-[9px] text-white/20 italic -mt-1">Número para contato na página pública.</p>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full h-12 px-4 bg-white/5 rounded-xl border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-gold/50 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <label className="text-[10px] text-white/30 uppercase tracking-widest font-bold block">Sobre a Barbearia</label>
              <p className="text-[9px] text-white/20 italic -mt-1">Uma breve descrição que aparece na página de agendamento.</p>
              <textarea
                value={aboutText}
                onChange={e => setAboutText(e.target.value)}
                placeholder="Conte um pouco sobre sua barbearia, sua história, o que torna o espaço especial..."
                rows={4}
                className="w-full px-6 py-4 bg-white/5 rounded-2xl border border-white/10 text-white placeholder:text-white/20 text-sm outline-none focus:border-gold/50 transition-colors resize-none"
              />
            </div>
          </Card>

          {/* Advanced / Integration */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                <Globe className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-bold serif">Integrações</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center group">
                <div>
                  <div className="font-bold text-sm">WhatsApp Automático</div>
                  <div className="text-[10px] text-white/30">Notificar clientes sobre agendamentos</div>
                </div>
                <div className="px-2 py-1 rounded bg-gold/20 text-gold text-[8px] font-bold uppercase tracking-widest border border-gold/20">Beta</div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center opacity-40">
                <div>
                  <div className="font-bold text-sm">Pagamentos</div>
                  <div className="text-[10px] text-white/30">Receber pagamentos online</div>
                </div>
                <div className="text-[8px] text-white/40 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Em Breve
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" variant="gold" className="px-10 h-14" loading={saving}>
              <Save className="w-5 h-5 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
