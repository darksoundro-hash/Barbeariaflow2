import { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Button from '../components/Button';
import Input from '../components/Input';
import { AlertTriangle, ExternalLink, HelpCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isProviderError, setIsProviderError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setIsProviderError(true);
        setError('O login por E-mail e Senha está desativado no seu projeto Firebase por padrão.');
      } else {
        setIsProviderError(false);
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Digite seu e-mail primeiro.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de redefinição.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user has a profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        navigate('/admin');
      } else {
        // New user from Google needs to set up shop
        navigate('/register', { state: { googleUser: { email: user.email, name: user.displayName, uid: user.uid } } });
      }
    } catch (err: any) {
      console.error("Erro Google Login:", err);
      setError(`Erro ao entrar com Google: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-6 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 blur-[120px] rounded-full opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="text-2xl font-bold tracking-[0.2em] premium-text-gradient mb-4 inline-block serif">
            BARBERFLOW
          </Link>
          <h2 className="text-3xl font-bold tracking-tight serif">Bem-vindo de volta</h2>
          <p className="text-white/40 mt-2">Acesse sua barbearia para gerenciar sua agenda.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="E-mail"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Senha"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

           {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-red-400 text-sm font-medium bg-red-400/10 p-4 rounded-2xl border border-red-400/20 flex gap-3 items-start">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-1">Erro de Configuração</div>
                  {error}
                </div>
              </div>

              {isProviderError && (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 text-left">
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
                        Clique em <strong className="text-white">Adicionar provedor</strong>, escolha <strong className="text-gold">E-mail/Senha</strong>, ative a primeira opção ("Habilitar") e salve.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gold/5 border border-gold/10 rounded-2xl p-4 text-[11px] leading-relaxed text-gold/80">
                    💡 <strong>Atalho Rápido:</strong> Se preferir, você pode usar o botão <strong>"Entrar com Google"</strong> abaixo, que já está ativado e funciona instantaneamente!
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <div className="space-y-4">
            <Button type="submit" variant="gold" className="w-full" loading={loading}>
              Entrar no Painel
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="text-[11px] text-white/30 hover:text-gold transition-colors cursor-pointer disabled:opacity-30"
              >
                Esqueceu sua senha?
              </button>
              {resetSent && (
                <p className="text-[10px] text-green-400 mt-2">E-mail de redefinição enviado! Verifique sua caixa de entrada.</p>
              )}
            </div>
            
            <div className="relative flex items-center justify-center">
              <div className="absolute w-full h-[1px] bg-white/10" />
              <span className="relative bg-dark px-4 text-[10px] text-white/30 uppercase tracking-widest font-bold">Ou</span>
            </div>

            <Button 
              type="button" 
              variant="secondary" 
              className="w-full gap-3" 
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94L5.84 14.1z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Entrar com Google
            </Button>
          </div>

          <div className="text-center mt-6">
            <span className="text-white/40 text-sm">Não tem uma conta? </span>
            <Link to="/register" className="text-gold font-bold text-sm hover:underline underline-offset-4">
              Crie sua barbearia agora
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
