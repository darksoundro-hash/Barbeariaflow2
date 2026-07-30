import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center glass p-10 rounded-[2rem] border border-gold/10"
      >
        <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-gold" />
        </div>
        <h1 className="text-2xl font-bold serif mb-2">Pagamento cancelado</h1>
        <p className="text-white/50 text-sm mb-8">
          Nenhum valor foi cobrado. Você pode continuar usando o plano gratuito e fazer o upgrade quando quiser.
        </p>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 bg-white/10 text-white text-xs uppercase tracking-widest font-bold py-4 px-8 rounded-2xl hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
