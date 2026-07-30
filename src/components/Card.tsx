import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover = true }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -5 } : {}}
      className={cn(
        'bg-card border border-line rounded p-6 transition-all duration-300 hover:border-gold/30',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
