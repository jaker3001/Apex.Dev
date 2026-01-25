import { cn } from '@/lib/utils';

export type Priority = 'none' | 'low' | 'medium' | 'high';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (value: Priority) => void;
  disabled?: boolean;
}

const priorities: { value: Priority; label: string; color: string; bgColor: string }[] = [
  { value: 'none', label: 'None', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  { value: 'low', label: 'Low', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { value: 'high', label: 'High', color: 'text-red-500', bgColor: 'bg-red-500/10' },
];

export function PrioritySelector({ value, onChange, disabled }: PrioritySelectorProps) {
  return (
    <div className="flex gap-2">
      {priorities.map((priority) => (
        <button
          key={priority.value}
          type="button"
          onClick={() => onChange(priority.value)}
          disabled={disabled}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            'border-2',
            value === priority.value
              ? cn(priority.bgColor, priority.color, 'border-current')
              : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {priority.label}
        </button>
      ))}
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorities.find((p) => p.value === priority);
  if (!config || priority === 'none') return null;

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium',
        config.bgColor,
        config.color
      )}
    >
      {config.label}
    </span>
  );
}
