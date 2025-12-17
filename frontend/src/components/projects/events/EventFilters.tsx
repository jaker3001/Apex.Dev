import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type EventFilterType = 'all' | 'note' | 'estimate' | 'payment' | 'labor' | 'receipt' | 'media' | 'status';

interface EventFiltersProps {
  activeFilter: EventFilterType;
  onFilterChange: (filter: EventFilterType) => void;
}

const FILTERS: { value: EventFilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'note', label: 'Notes' },
  { value: 'estimate', label: 'Estimates' },
  { value: 'payment', label: 'Payments' },
  { value: 'labor', label: 'Labor' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'media', label: 'Media' },
  { value: 'status', label: 'Status' },
];

export function EventFilters({ activeFilter, onFilterChange }: EventFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {FILTERS.map((filter) => (
        <Button
          key={filter.value}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-xs",
            activeFilter === filter.value
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}
