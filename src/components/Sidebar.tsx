import { motion, AnimatePresence } from 'motion/react';
import { Scissors, Calendar, Users, Settings, LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Calendar, label: 'Agendamentos', path: '/admin/appointments' },
  { icon: Users, label: 'Barbeiros', path: '/admin/barbers' },
  { icon: Scissors, label: 'Serviços', path: '/admin/services' },
];

function SidebarContent({ location, onNavigate }: { location: ReturnType<typeof useLocation>; onNavigate: () => void }) {
  return (
    <>
      <div className="p-8">
        <div className="text-2xl serif tracking-tighter flex items-center">BARBER<span className="text-gold">FLOW</span></div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#444] mt-1">Premium SaaS Edition</div>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-8 py-3 text-[11px] uppercase tracking-[0.1em] font-semibold transition-all duration-300',
                isActive 
                  ? 'text-gold bg-gold/5 border-r-[3px] border-gold' 
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-gold' : 'text-white/20')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-white/5 space-y-2">
        <Link
          to="/admin/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            location.pathname === '/admin/settings'
              ? 'text-gold bg-gold/5 border border-gold/10'
              : 'text-white/50 hover:bg-white/5 hover:text-white'
          )}
        >
          <Settings className={cn("w-5 h-5", location.pathname === '/admin/settings' ? 'text-gold' : 'text-white/30')} />
          <span className="font-medium text-sm">Configurações</span>
        </Link>
        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:bg-red-400/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm text-left">Sair</span>
        </button>
      </div>
    </>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-6 right-6 z-[60] bg-gold p-3 rounded-full text-black shadow-lg shadow-gold/20"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen bg-dark border-r border-[#222] flex-col fixed left-0 top-0 z-50">
        <SidebarContent location={location} onNavigate={() => setIsOpen(false)} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
            />
            <motion.aside 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 w-[280px] h-screen bg-dark z-[80] lg:hidden flex flex-col border-r border-line shadow-2xl"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <SidebarContent location={location} onNavigate={() => setIsOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
