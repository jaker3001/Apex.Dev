import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCheckboxProps {
  checked: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  priority?: 'none' | 'low' | 'medium' | 'high';
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const iconSizes = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

const priorityColors = {
  none: 'border-muted-foreground',
  low: 'border-blue-400',
  medium: 'border-amber-400',
  high: 'border-red-400',
};

export function TaskCheckbox({
  checked,
  onToggle,
  size = 'md',
  priority = 'none',
  disabled = false,
}: TaskCheckboxProps) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'rounded-full border-2 flex items-center justify-center transition-all shrink-0',
        sizeClasses[size],
        checked
          ? 'bg-primary border-primary'
          : cn(priorityColors[priority], 'hover:border-primary hover:bg-primary/10'),
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <motion.div
        initial={false}
        animate={{
          scale: checked ? 1 : 0,
          opacity: checked ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <Check className={cn(iconSizes[size], 'text-primary-foreground')} />
      </motion.div>
    </motion.button>
  );
}
