import { Inbox, FileText, Image, Mic, File, CheckSquare, ChevronRight } from 'lucide-react';
import { useInbox, type InboxItem } from '@/hooks/useHub';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface InboxCardProps {
  onViewAll: () => void;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  note: FileText,
  photo: Image,
  audio: Mic,
  document: File,
  task: CheckSquare,
};

const typeColors: Record<string, string> = {
  note: 'text-blue-400',
  photo: 'text-green-400',
  audio: 'text-purple-400',
  document: 'text-orange-400',
  task: 'text-amber-400',
};

export function InboxCard({ onViewAll }: InboxCardProps) {
  const { data, isLoading } = useInbox({ processed: false, limit: 5 });

  const items = data?.items || [];
  const unprocessedCount = data?.unprocessed_count || 0;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-foreground">Inbox</h3>
          {unprocessedCount > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unprocessedCount}
            </span>
          )}
        </div>
        <button
          onClick={onViewAll}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Inbox is empty</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Quick captures will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <InboxItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InboxItemRow({ item }: { item: InboxItem }) {
  const Icon = typeIcons[item.type] || FileText;
  const colorClass = typeColors[item.type] || 'text-muted-foreground';

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
      <div className={cn('mt-0.5', colorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">
          {item.title || `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} capture`}
        </p>
        {item.content && (
          <p className="text-xs text-muted-foreground truncate">{item.content}</p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
