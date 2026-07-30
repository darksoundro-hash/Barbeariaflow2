import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3000';

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setTimeout(() => {
        setStatus('error');
        setErrorMsg('ID da sessão não encontrado.');
      }, 0);
      return;
    }

    fetch(`${API_BASE}/api/verify-checkout?session_id=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Erro ao verificar pagamento.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Erro de conexão com o servidor.');
      });
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        {status === 'verifying' && (
          <div className="glass p-10 rounded-[2rem]">
            <Loader2 className="w-16 h-16 text-gold mx-auto mb-6 animate-spin" />
            <h1 className="text-2xl font-bold serif mb-2">Verificando pagamento...</h1>
            <p className="text-white/40 text-sm">Aguarde um momento enquanto confirmamos sua transação.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="glass p-10 rounded-[2rem] border border-green-500/20">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold serif mb-2">Pagamento Confirmado!</h1>
            <p className="text-white/50 text-sm mb-8">
              Seu plano foi ativado com sucesso. Todos os recursos premium já estão disponíveis.
            </p>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 premium-gradient text-black font-black text-sm uppercase tracking-widest py-4 px-8 rounded-2xl shadow-lg shadow-gold/20"
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="glass p-10 rounded-[2rem] border border-red-500/20">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold serif mb-2">Algo deu errado</h1>
            <p className="text-white/50 text-sm mb-2">{errorMsg}</p>
            <p className="text-white/30 text-xs mb-8">
              Se o valor foi cobrado, entre em contato com o suporte.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 bg-white/10 text-white text-xs uppercase tracking-widest font-bold py-4 px-6 rounded-2xl hover:bg-white/20 transition-colors"
              >
                Voltar
              </Link>
              <Link
                to="/admin/settings"
                className="inline-flex items-center gap-2 premium-gradient text-black font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl"
              >
                Verificar Plano
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
