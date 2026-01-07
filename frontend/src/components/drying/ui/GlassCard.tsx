import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animate?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

/**
 * Glass-morphism card component that adapts to light/dark themes.
 * Uses semi-transparent backgrounds with blur and subtle borders.
 */
export function GlassCard({
  children,
  className = '',
  delay = 0,
  animate = true,
  padding = 'md',
  hover = false,
}: GlassCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  const baseClasses = cn(
    // Glass morphism effect - theme-aware
    'glass-card',
    'rounded-2xl',
    // Padding
    paddingClasses[padding],
    // Optional hover effect
    hover && 'transition-all duration-300',
    className
  );

  if (!animate) {
    return <div className={baseClasses}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={baseClasses}
    >
      {children}
    </motion.div>
  );
}

/**
 * Glass card variant for section headers.
 */
interface GlassHeaderProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function GlassHeader({ children, className = '', icon, action }: GlassHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'bg-card/40 backdrop-blur-md',
        'border-b border-border',
        'px-5 py-3',
        'rounded-t-2xl',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="font-semibold text-foreground">{children}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Glass card with built-in header.
 */
interface GlassCardWithHeaderProps extends GlassCardProps {
  title: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export function GlassCardWithHeader({
  title,
  icon,
  headerAction,
  children,
  className = '',
  ...props
}: GlassCardWithHeaderProps) {
  return (
    <GlassCard className={className} padding="none" {...props}>
      <GlassHeader icon={icon} action={headerAction}>
        {title}
      </GlassHeader>
      <div className="p-5">{children}</div>
    </GlassCard>
  );
}
