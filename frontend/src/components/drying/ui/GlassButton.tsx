import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * Glass-morphism button component adapted for Apex dark theme.
 */
export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'default',
      size = 'md',
      loading = false,
      disabled,
      icon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: cn(
        'bg-white/5 border-white/10',
        'hover:bg-white/10 hover:border-white/20',
        'text-white'
      ),
      primary: cn(
        'bg-primary/20 border-primary/30',
        'hover:bg-primary/30 hover:border-primary/40',
        'text-primary'
      ),
      danger: cn(
        'bg-red-500/20 border-red-500/30',
        'hover:bg-red-500/30 hover:border-red-500/40',
        'text-red-400'
      ),
      ghost: cn('bg-transparent border-transparent', 'hover:bg-white/5', 'text-zinc-400'),
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 gap-2',
      lg: 'px-5 py-2.5 text-lg gap-2.5',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          // Base styling
          'inline-flex items-center justify-center',
          'border rounded-xl',
          'font-medium',
          'outline-none',
          // Focus states
          'focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-zinc-900',
          // Transition
          'transition-all duration-200',
          // Disabled state
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          // Variant
          variantClasses[variant],
          // Size
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {size !== 'icon' && <span>Loading...</span>}
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

/**
 * Glass icon button - convenience wrapper.
 */
interface GlassIconButtonProps extends Omit<GlassButtonProps, 'size' | 'children'> {
  icon: React.ReactNode;
  label: string; // For accessibility
}

export function GlassIconButton({ icon, label, ...props }: GlassIconButtonProps) {
  return (
    <GlassButton size="icon" aria-label={label} {...props}>
      {icon}
    </GlassButton>
  );
}
