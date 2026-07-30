import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { generateSlug } from '../lib/utils';
import Button from '../components/Button';
import Input from '../components/Input';
import { AlertTriangle, ExternalLink, HelpCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialGoogleUser = (location.state as any)?.googleUser || null;

  const [name, setName] = useState(initialGoogleUser?.name || '');
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState(initialGoogleUser?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isProviderError, setIsProviderError] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(initialGoogleUser);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let user;
      if (googleUser) {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Sessão do Google expirada. Faça o login novamente.');
        user = currentUser;
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
        await updateProfile(user, { displayName: name });
      }

      const shopId = doc(collection(db, 'barbershops')).id;
      const slug = generateSlug(shopName);

      // 2. Create Barbershop (falha aqui interrompe todo o processo)
      const shopPath = `barbershops/${shopId}`;
      await setDoc(doc(db, shopPath), {
        id: shopId,
        ownerId: user.uid,
        name: shopName,
        slug: slug,
        plan: 'trial',
        createdAt: serverTimestamp()
      });

      // 3. Create User Profile (só executa se barbearia foi criada)
      const userPath = `users/${user.uid}`;
      await setDoc(doc(db, userPath), {
        uid: user.uid,
        email: email,
        displayName: name,
        barbershopId: shopId,
        role: 'admin',
        createdAt: serverTimestamp()
      });

      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setIsProviderError(true);
        setError('O cadastro por E-mail e Senha está desativado no seu projeto Firebase por padrão.');
      } else {
        setIsProviderError(false);
        try {
          const errInfo = JSON.parse(err.message);
          setError(`Erro: ${errInfo.error || errInfo.message}`);
        } catch {
          setError(err.message || 'Erro ao criar conta. Verifique os dados e tente novamente.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        navigate('/admin');
      } else {
        setName(user.displayName || '');
        setEmail(user.email || '');
        setGoogleUser({ email: user.email, name: user.displayName, uid: user.uid });
      }
    } catch (err: any) {
      setError('Erro ao autenticar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl relative z-10 glass p-10 rounded-[2.5rem]"
      >
        <div className="text-center mb-10">
          <Link to="/" className="text-2xl font-bold tracking-[0.2em] premium-text-gradient mb-4 inline-block serif">
            BARBERFLOW
          </Link>
          <h2 className="text-4xl font-bold tracking-tight italic serif">Comece seu Império</h2>
          <p className="text-white/40 mt-2">Crie sua barbearia e automatize seus lucros.</p>
        </div>

        <form onSubmit={handleRegister} className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="Nome Completo"
              placeholder="Como quer ser chamado?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!!googleUser}
            />
          </div>
          <div className="md:col-span-2">
            <Input
              label="Nome da Barbearia"
              placeholder="Ex: Barber Premium Club"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          </div>
          <Input
            label="E-mail"
            placeholder="seu@empresa.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!googleUser}
          />
          {!googleUser && (
            <Input
              label="Senha"
              placeholder="No mínimo 6 caracteres"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          )}

          {error && (
            <div className="md:col-span-2 space-y-4">
              <div className="text-red-400 text-sm font-medium bg-red-400/10 p-4 rounded-2xl border border-red-400/20 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-1">Erro de Configuração</div>
                  {error}
                </div>
              </div>

              {isProviderError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold serif italic text-white leading-tight">Como Ativar no Firebase Console</h4>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1">Siga este passo a passo rápido</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gold shrink-0">1</span>
                      <p className="text-white/60 leading-relaxed">
                        Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-gold font-bold hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3 inline" /></a>.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gold shrink-0">2</span>
                      <p className="text-white/60 leading-relaxed">
                        Selecione seu projeto e vá em <strong className="text-white">Authentication</strong> na barra lateral esquerda.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gold shrink-0">3</span>
                      <p className="text-white/60 leading-relaxed">
                        Vá na aba <strong className="text-white">Sign-in method</strong> (Método de Login).
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gold shrink-0">4</span>
                      <p className="text-white/60 leading-relaxed">
                        Clique em <strong className="text-white">Adicionar provedor</strong>, escolha <strong className="text-gold">E-mail/Senha</strong>, ative a primeira opção ("Habilitar") e clique em Salvar.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gold/5 border border-gold/10 rounded-2xl p-4 text-[11px] leading-relaxed text-gold/80">
                    💡 <strong>Atalho Rápido:</strong> Se preferir, você pode usar o botão <strong>"Cadastrar com Google"</strong> abaixo, que já está ativado e funciona instantaneamente sem precisar configurar nada!
                  </div>
                </motion.div>
              )}
            </div>
          )}

          <div className="md:col-span-2 mt-4 space-y-4">
            <Button type="submit" variant="gold" className="w-full" loading={loading}>
              {googleUser ? 'Finalizar Configuração' : 'Criar minha barbearia grátis'}
            </Button>

            {!googleUser && (
              <>
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-full h-[1px] bg-white/10" />
                  <span className="relative bg-dark px-4 text-[10px] text-white/30 uppercase tracking-widest font-bold">Ou</span>
                </div>

                <Button 
                  type="button" 
                  variant="secondary" 
                  className="w-full gap-3" 
                  onClick={handleGoogleRegister}
                  disabled={loading}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94L5.84 14.1z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Cadastrar com Google
                </Button>
              </>
            )}
          </div>

          <div className="md:col-span-2 text-center mt-4">
            <span className="text-white/40 text-sm">Já tem uma conta? </span>
            <Link to="/login" className="text-gold font-bold text-sm hover:underline underline-offset-4">
              Fazer Login
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
