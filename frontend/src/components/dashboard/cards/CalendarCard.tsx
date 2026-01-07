import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useHub';
import { format, addDays, startOfDay, endOfDay, isToday, isTomorrow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type CalendarView = 'day' | '3day' | 'week';

export function CalendarCard() {
  const [view, setView] = useState<CalendarView>('day');
  const [baseDate, setBaseDate] = useState(new Date());

  // Calculate date range based on view
  const getDateRange = () => {
    const start = startOfDay(baseDate);
    let end: Date;

    switch (view) {
      case 'day':
        end = endOfDay(baseDate);
        break;
      case '3day':
        end = endOfDay(addDays(baseDate, 2));
        break;
      case 'week':
        end = endOfDay(addDays(baseDate, 6));
        break;
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };
  };

  const { data, isLoading } = useCalendarEvents(getDateRange());
  const events = data?.events || [];

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = view === 'day' ? 1 : view === '3day' ? 3 : 7;
    setBaseDate((current) =>
      direction === 'next' ? addDays(current, days) : addDays(current, -days)
    );
  };

  const goToToday = () => {
    setBaseDate(new Date());
  };

  const getDateLabel = () => {
    if (isToday(baseDate)) {
      return 'Today';
    }
    if (isTomorrow(baseDate)) {
      return 'Tomorrow';
    }
    return format(baseDate, 'MMM d, yyyy');
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-foreground">Calendar</h3>
        </div>
        <div className="flex items-center gap-1">
          {(['day', '3day', 'week'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                view === v
                  ? 'bg-purple-500/30 text-purple-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {v === '3day' ? '3 Day' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-card">
        <button
          onClick={() => navigateDate('prev')}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{getDateLabel()}</span>
          {!isToday(baseDate) && (
            <button
              onClick={goToToday}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => navigateDate('next')}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No events scheduled</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Your calendar is clear</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const startTime = parseISO(event.start);
  const endTime = parseISO(event.end);

  return (
    <div className="flex gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
      <div className="w-1 bg-purple-500 rounded-full" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{event.summary}</p>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {event.all_day ? (
              <span>All day</span>
            ) : (
              <span>
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </span>
            )}
          </div>
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
