import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Plus,
  X,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  type CalendarEvent,
  type CalendarEventCreateInput,
} from '@/hooks/useHub';
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  eachDayOfInterval,
  setHours,
  setMinutes,
} from 'date-fns';
import { cn } from '@/lib/utils';

type CalendarViewMode = 'month' | 'week' | 'day';

export function CalendarView() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    let start: Date, end: Date;

    switch (viewMode) {
      case 'month':
        start = startOfWeek(startOfMonth(currentDate));
        end = endOfWeek(endOfMonth(currentDate));
        break;
      case 'week':
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
        break;
      case 'day':
        start = currentDate;
        end = currentDate;
        break;
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };
  }, [viewMode, currentDate]);

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

  const navigate = (direction: 'prev' | 'next') => {
    const delta = direction === 'next' ? 1 : -1;
    switch (viewMode) {
      case 'month':
        setCurrentDate(addMonths(currentDate, delta));
        break;
      case 'week':
        setCurrentDate(addDays(currentDate, delta * 7));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, delta));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
    }
  };

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate, viewMode]);

  // Generate week days for week view
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate, viewMode]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    // Double-click behavior: if same date clicked again, open create modal
    if (selectedDate && isSameDay(date, selectedDate)) {
      setShowCreateModal(true);
    }
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('prev')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-white min-w-[250px] text-center">
            {getTitle()}
          </h2>
          <button
            onClick={() => navigate('next')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
          <div className="flex items-center gap-1 ml-4">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  viewMode === mode
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main Calendar Area */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === 'month' ? (
            <MonthView
              days={calendarDays}
              currentDate={currentDate}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              onSelectDate={handleDateClick}
              onEventClick={handleEventClick}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              days={weekDays}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={handleDateClick}
              onEventClick={handleEventClick}
            />
          ) : (
            <DayView
              date={currentDate}
              events={eventsByDate[format(currentDate, 'yyyy-MM-dd')] || []}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        {/* Selected Date Sidebar */}
        {selectedDate && (
          <div className="w-72 border-l border-slate-700 bg-slate-800/50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {format(selectedDate, 'EEEE')}
                </h3>
                <p className="text-sm text-slate-400">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-4 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>

            <div className="space-y-2">
              {(eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No events scheduled</p>
              ) : (
                (eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || []).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-left p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                  >
                    <p className="text-sm font-medium text-white truncate">{event.summary}</p>
                    {!event.all_day && (
                      <p className="text-xs text-slate-400 mt-1">
                        {format(parseISO(event.start), 'h:mm a')} - {format(parseISO(event.end), 'h:mm a')}
                      </p>
                    )}
                    {event.all_day && (
                      <p className="text-xs text-purple-400 mt-1">All day</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          initialDate={selectedDate || currentDate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

// Create Event Modal
function CreateEventModal({
  initialDate,
  onClose,
}: {
  initialDate: Date;
  onClose: () => void;
}) {
  const createEvent = useCreateCalendarEvent();
  const [formData, setFormData] = useState<CalendarEventCreateInput>({
    summary: '',
    description: '',
    location: '',
    start: format(setHours(setMinutes(initialDate, 0), 9), "yyyy-MM-dd'T'HH:mm"),
    end: format(setHours(setMinutes(initialDate, 0), 10), "yyyy-MM-dd'T'HH:mm"),
    all_day: false,
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.summary.trim()) {
      setError('Event title is required');
      return;
    }

    try {
      await createEvent.mutateAsync({
        ...formData,
        start: new Date(formData.start).toISOString(),
        end: new Date(formData.end).toISOString(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">New Event</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
              placeholder="Event title"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="all_day"
              checked={formData.all_day}
              onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
            />
            <label htmlFor="all_day" className="text-sm text-slate-300">
              All day event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Start
              </label>
              <input
                type={formData.all_day ? 'date' : 'datetime-local'}
                value={formData.all_day ? formData.start.split('T')[0] : formData.start}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                End
              </label>
              <input
                type={formData.all_day ? 'date' : 'datetime-local'}
                value={formData.all_day ? formData.end.split('T')[0] : formData.end}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
              placeholder="Add location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none resize-none"
              placeholder="Add description"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending}
              className="px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg transition-colors"
            >
              {createEvent.isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Event Detail Modal
function EventDetailModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const deleteEvent = useDeleteCalendarEvent();
  const startTime = parseISO(event.start);
  const endTime = parseISO(event.end);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent.mutateAsync(event.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete event:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white truncate pr-4">{event.summary}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm text-white">
                {format(startTime, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-slate-400">
                {event.all_day
                  ? 'All day'
                  : `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`}
              </p>
            </div>
          </div>

          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
              <p className="text-sm text-white">{event.location}</p>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-white">
                  {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-1 space-y-0.5">
                  {event.attendees.map((email, i) => (
                    <p key={i} className="text-xs text-slate-400">{email}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {event.description && (
            <div className="pt-2 border-t border-slate-700">
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Month View Component
function MonthView({
  days,
  currentDate,
  selectedDate,
  eventsByDate,
  onSelectDate,
  onEventClick,
}: {
  days: Date[];
  currentDate: Date;
  selectedDate: Date | null;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-slate-400 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              onClick={() => onSelectDate(day)}
              className={cn(
                'p-1 rounded-lg cursor-pointer transition-colors min-h-[80px]',
                isCurrentMonth ? 'bg-slate-800/50' : 'bg-slate-800/20',
                isSelected && 'ring-2 ring-purple-500',
                'hover:bg-slate-700/50'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                    today && 'bg-purple-500 text-white',
                    !today && isCurrentMonth && 'text-slate-300',
                    !today && !isCurrentMonth && 'text-slate-500'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-xs text-slate-400">{dayEvents.length}</span>
                )}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => onEventClick(event, e)}
                    className="text-xs px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 truncate hover:bg-purple-500/30 transition-colors"
                    title={event.summary}
                  >
                    {event.summary}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-slate-400 px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  days,
  eventsByDate,
  selectedDate,
  onSelectDate,
  onEventClick,
}: {
  days: Date[];
  eventsByDate: Record<string, CalendarEvent[]>;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}) {
  return (
    <div className="h-full flex p-4 gap-2">
      {days.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEvents = eventsByDate[dateKey] || [];
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <div
            key={dateKey}
            onClick={() => onSelectDate(day)}
            className={cn(
              'flex-1 rounded-lg bg-slate-800/50 overflow-hidden cursor-pointer',
              isSelected && 'ring-2 ring-purple-500',
              'hover:bg-slate-700/50 transition-colors'
            )}
          >
            {/* Day header */}
            <div
              className={cn(
                'text-center py-3 border-b border-slate-700',
                today && 'bg-purple-500/20'
              )}
            >
              <div className="text-xs text-slate-400">{format(day, 'EEE')}</div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  today ? 'text-purple-400' : 'text-white'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>

            {/* Events */}
            <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100%-60px)]">
              {dayEvents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No events</p>
              ) : (
                dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => onEventClick(event, e)}
                    className="p-2 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-medium text-purple-300 truncate">{event.summary}</p>
                    {!event.all_day && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {format(parseISO(event.start), 'h:mm a')}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Day View Component with Hour Grid
function DayView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Separate all-day events from timed events
  const allDayEvents = events.filter((e) => e.all_day);
  const timedEvents = events.filter((e) => !e.all_day);

  // Group timed events by hour
  const eventsByHour: Record<number, CalendarEvent[]> = {};
  timedEvents.forEach((event) => {
    const hour = parseISO(event.start).getHours();
    if (!eventsByHour[hour]) eventsByHour[hour] = [];
    eventsByHour[hour].push(event);
  });

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="max-w-3xl mx-auto">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-400 mb-2">All Day</p>
            <div className="space-y-1">
              {allDayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={(e) => onEventClick(event, e)}
                  className="p-2 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-purple-300">{event.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hour grid */}
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          {hours.map((hour) => {
            const hourEvents = eventsByHour[hour] || [];
            const isCurrentHour = new Date().getHours() === hour && isToday(date);

            return (
              <div
                key={hour}
                className={cn(
                  'flex border-b border-slate-700/50 last:border-0 min-h-[60px]',
                  isCurrentHour && 'bg-purple-500/5'
                )}
              >
                <div className="w-20 flex-shrink-0 px-3 py-2 border-r border-slate-700/50 text-right">
                  <span className={cn(
                    'text-xs',
                    isCurrentHour ? 'text-purple-400 font-medium' : 'text-slate-500'
                  )}>
                    {format(setHours(date, hour), 'h a')}
                  </span>
                </div>
                <div className="flex-1 p-1">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => onEventClick(event, e)}
                      className="p-2 mb-1 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-colors cursor-pointer"
                    >
                      <p className="text-sm font-medium text-purple-300">{event.summary}</p>
                      <p className="text-xs text-slate-400">
                        {format(parseISO(event.start), 'h:mm a')} - {format(parseISO(event.end), 'h:mm a')}
                      </p>
                      {event.location && (
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
