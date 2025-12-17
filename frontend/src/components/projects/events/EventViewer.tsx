import { useState, useMemo } from 'react';
import { History, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventItem } from './EventItem';
import { EventFilters, type EventFilterType } from './EventFilters';
import type { ActivityLogEntry } from '@/hooks/useProjects';

interface EventViewerProps {
  events: ActivityLogEntry[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onNavigate?: (entityType: string, entityId: number) => void;
}

export function EventViewer({
  events,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  onNavigate,
}: EventViewerProps) {
  const [filter, setFilter] = useState<EventFilterType>('all');

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;

    return events.filter((event) => {
      // Filter by entity type or event type
      if (filter === 'status') {
        return event.event_type.includes('status');
      }
      return event.entity_type === filter;
    });
  }, [events, filter]);

  if (isLoading && events.length === 0) {
    return (
      <div className="border rounded-lg bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Activity</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Activity</h2>
          {events.length > 0 && (
            <span className="text-xs text-muted-foreground">({events.length})</span>
          )}
        </div>
        <EventFilters activeFilter={filter} onFilterChange={setFilter} />
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {filter === 'all' ? 'No activity yet' : `No ${filter} events`}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredEvents.map((event) => (
              <EventItem key={event.id} event={event} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && onLoadMore && (
          <div className="pt-2 border-t mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Load more
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
