import { useState, useEffect, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'size'> {
  label?: string;
  containerClassName?: string;
  value?: string | number;
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  hint?: string;
}

/**
 * Glass-morphism input component adapted for Apex dark theme.
 * Handles number inputs gracefully (shows empty instead of 0).
 */
export function GlassInput({
  label,
  className = '',
  containerClassName = '',
  value,
  onChange,
  type = 'text',
  size = 'md',
  error,
  hint,
  disabled,
  ...props
}: GlassInputProps) {
  // Local state to handle "clean" input (showing empty string instead of 0)
  const [displayValue, setDisplayValue] = useState<string | number>('');

  useEffect(() => {
    // Show empty for null/undefined/0 on number inputs
    if (value === 0 && type === 'number') {
      setDisplayValue('');
    } else if (value === null || value === undefined) {
      setDisplayValue('');
    } else {
      setDisplayValue(value);
    }
  }, [value, type]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setDisplayValue(newVal);

    if (onChange) {
      onChange(e);
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-2.5 text-lg',
  };

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label className="text-xs font-semibold text-zinc-400 ml-0.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        type={type}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          // Base glass styling
          'bg-white/5',
          'border border-white/10',
          'rounded-xl',
          'text-white placeholder:text-zinc-500',
          'outline-none',
          // Focus states
          'focus:border-primary focus:bg-white/10',
          'focus:ring-1 focus:ring-primary/30',
          // Transition
          'transition-all duration-200',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed',
          // Error state
          error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30',
          // Size
          sizeClasses[size],
          // Width
          'w-full',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400 ml-0.5">{error}</span>}
      {hint && !error && <span className="text-xs text-zinc-500 ml-0.5">{hint}</span>}
    </div>
  );
}

/**
 * Glass textarea component.
 */
interface GlassTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> {
  label?: string;
  containerClassName?: string;
  value?: string;
  error?: string;
  hint?: string;
}

export function GlassTextarea({
  label,
  className = '',
  containerClassName = '',
  value = '',
  onChange,
  error,
  hint,
  disabled,
  rows = 3,
  ...props
}: GlassTextareaProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label className="text-xs font-semibold text-zinc-400 ml-0.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className={cn(
          // Base glass styling
          'bg-white/5',
          'border border-white/10',
          'rounded-xl',
          'text-white placeholder:text-zinc-500',
          'outline-none',
          'px-3 py-2',
          'resize-none',
          // Focus states
          'focus:border-primary focus:bg-white/10',
          'focus:ring-1 focus:ring-primary/30',
          // Transition
          'transition-all duration-200',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed',
          // Error state
          error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30',
          // Width
          'w-full',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-400 ml-0.5">{error}</span>}
      {hint && !error && <span className="text-xs text-zinc-500 ml-0.5">{hint}</span>}
    </div>
  );
}

/**
 * Glass select component.
 */
interface GlassSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  containerClassName?: string;
  options: { value: string; label: string }[];
  size?: 'sm' | 'md' | 'lg';
  error?: string;
}

export function GlassSelect({
  label,
  className = '',
  containerClassName = '',
  options,
  size = 'md',
  error,
  disabled,
  ...props
}: GlassSelectProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-2.5 text-lg',
  };

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label className="text-xs font-semibold text-zinc-400 ml-0.5 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        disabled={disabled}
        className={cn(
          // Base glass styling
          'bg-white/5',
          'border border-white/10',
          'rounded-xl',
          'text-white',
          'outline-none',
          // Focus states
          'focus:border-primary focus:bg-white/10',
          'focus:ring-1 focus:ring-primary/30',
          // Transition
          'transition-all duration-200',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed',
          // Error state
          error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/30',
          // Size
          sizeClasses[size],
          // Width
          'w-full',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400 ml-0.5">{error}</span>}
    </div>
  );
}
