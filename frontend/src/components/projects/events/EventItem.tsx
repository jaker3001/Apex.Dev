import {
  FileText,
  DollarSign,
  Clock,
  Receipt,
  Image,
  MessageSquare,
  Briefcase,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityLogEntry } from '@/hooks/useProjects';

interface EventItemProps {
  event: ActivityLogEntry;
  onNavigate?: (entityType: string, entityId: number) => void;
}

function formatDateTime(dateStr?: string): { date: string; time: string } {
  if (!dateStr) {
    return { date: '', time: '' };
  }
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getEventIcon(eventType: string, entityType?: string) {
  // Map event types and entity types to icons
  if (entityType === 'note') return <MessageSquare className="h-4 w-4" />;
  if (entityType === 'estimate') return <FileText className="h-4 w-4" />;
  if (entityType === 'payment') return <DollarSign className="h-4 w-4" />;
  if (entityType === 'labor') return <Clock className="h-4 w-4" />;
  if (entityType === 'receipt') return <Receipt className="h-4 w-4" />;
  if (entityType === 'media') return <Image className="h-4 w-4" />;
  if (entityType === 'work_order') return <Briefcase className="h-4 w-4" />;

  // Event type based icons
  if (eventType.includes('status')) return <RefreshCw className="h-4 w-4" />;
  if (eventType.includes('approved')) return <CheckCircle2 className="h-4 w-4" />;
  if (eventType.includes('denied') || eventType.includes('rejected')) return <AlertCircle className="h-4 w-4" />;

  return <MessageSquare className="h-4 w-4" />;
}

function getEventColor(eventType: string, eventSubtype?: string): string {
  // Success events
  if (eventType.includes('approved') || eventType.includes('completed') || eventSubtype === 'approved') {
    return 'text-green-600 bg-green-100';
  }
  // Warning/attention events
  if (eventType.includes('denied') || eventType.includes('rejected') || eventSubtype === 'denied') {
    return 'text-red-600 bg-red-100';
  }
  // Payment events
  if (eventType.includes('payment')) {
    return 'text-emerald-600 bg-emerald-100';
  }
  // Status changes
  if (eventType.includes('status')) {
    return 'text-blue-600 bg-blue-100';
  }
  // Default
  return 'text-muted-foreground bg-muted';
}

export function EventItem({ event, onNavigate }: EventItemProps) {
  const { date, time } = formatDateTime(event.created_at);

  const handleClick = () => {
    if (onNavigate && event.entity_type && event.entity_id) {
      onNavigate(event.entity_type, event.entity_id);
    }
  };

  const isClickable = onNavigate && event.entity_type && event.entity_id;

  return (
    <div
      className={cn(
        "flex gap-3 py-2 px-2 rounded-md transition-colors",
        isClickable && "hover:bg-muted/50 cursor-pointer"
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        getEventColor(event.event_type, event.event_subtype)
      )}>
        {getEventIcon(event.event_type, event.entity_type || undefined)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{date}</span>
          <span>&middot;</span>
          <span>{time}</span>
        </div>
        <p className="text-sm mt-0.5 line-clamp-2">{event.description}</p>
        {event.amount && (
          <span className="text-sm font-medium text-green-600 mt-0.5 block">
            {formatCurrency(event.amount)}
          </span>
        )}
        {event.actor_name && (
          <span className="text-xs text-muted-foreground mt-1 block">
            by {event.actor_name}
          </span>
        )}
      </div>

      {/* Navigate indicator */}
      {isClickable && (
        <div className="flex-shrink-0 self-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
