import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useHub';
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarSlideProps {
  onExpand?: () => void;
}

export function CalendarSlide({ onExpand: _onExpand }: CalendarSlideProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Get the full month range for events
  const dateRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };
  }, [currentMonth]);

  const { data, isLoading } = useCalendarEvents(dateRange);
  const events = data?.events || [];

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      const dateKey = format(parseISO(event.start), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((current) =>
      direction === 'next' ? addMonths(current, 1) : addMonths(current, -1)
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  // Get events for selected date
  const selectedDateEvents = eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || [];

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigateMonth('prev'); }}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-white min-w-[120px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={(e) => { e.stopPropagation(); navigateMonth('next'); }}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {!isSameMonth(currentMonth, new Date()) && (
          <button
            onClick={(e) => { e.stopPropagation(); goToToday(); }}
            className="px-2 py-1 text-xs text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
          >
            Today
          </button>
        )}
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Mini Calendar Grid */}
        <div className="flex-shrink-0">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((day, i) => (
              <div
                key={i}
                className="w-8 h-6 flex items-center justify-center text-xs font-medium text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const today = isToday(day);
              const hasEvents = dayEvents.length > 0;

              return (
                <button
                  key={dateKey}
                  onClick={(e) => { e.stopPropagation(); setSelectedDate(day); }}
                  className={cn(
                    'w-8 h-8 flex flex-col items-center justify-center rounded-lg text-xs transition-all relative',
                    isCurrentMonth ? 'text-slate-300' : 'text-slate-600',
                    isSelected && 'bg-purple-500 text-white',
                    !isSelected && today && 'bg-purple-500/20 text-purple-400',
                    !isSelected && !today && 'hover:bg-slate-700'
                  )}
                >
                  <span className={cn(
                    'font-medium',
                    today && !isSelected && 'text-purple-400'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Events */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-white">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            </h4>
            <span className="text-xs text-slate-500">
              {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedDateEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <p className="text-slate-500 text-xs">No events scheduled</p>
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <MiniEventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniEventCard({ event }: { event: CalendarEvent }) {
  const startTime = parseISO(event.start);

  return (
    <div className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
      <div className="flex items-start gap-2">
        <div className="w-0.5 bg-purple-500 rounded-full self-stretch min-h-[32px]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{event.summary}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {event.all_day ? (
                <span>All day</span>
              ) : (
                <span>{format(startTime, 'h:mm a')}</span>
              )}
            </div>
            {event.location && (
              <div className="flex items-center gap-1 text-xs text-slate-400 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
