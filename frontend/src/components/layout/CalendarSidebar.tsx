import { useState } from 'react';
import {
  CalendarDays,
  CalendarRange,
  Calendar,
  ListTodo,
  Plus,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import {
  useCalendars,
  useCreateCalendar,
  useUpdateCalendar,
  type Calendar as CalendarType,
  type CalendarCreateInput,
} from '@/hooks/useCalendars';

interface ViewItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: string;
  isSelected: boolean;
  onClick: () => void;
}

function ViewItem({ icon: Icon, label, isSelected, onClick }: ViewItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isSelected
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

// Default color options for new calendars
const COLOR_OPTIONS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Yellow', value: '#eab308' },
];

export function CalendarSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const currentView = searchParams.get('view') || 'month';

  const { data, isLoading, error } = useCalendars();
  const updateCalendar = useUpdateCalendar();

  const calendars = data?.calendars || [];

  const handleViewChange = (view: string) => {
    setSearchParams({ view });
  };

  const handleToggleVisibility = async (calendar: CalendarType) => {
    try {
      await updateCalendar.mutateAsync({
        id: calendar.id,
        data: { is_visible: !calendar.is_visible },
      });
    } catch (err) {
      console.error('Failed to toggle calendar visibility:', err);
    }
  };

  return (
    <aside className="w-64 h-full bg-background/50 border-r border-white/5 flex flex-col shrink-0">
      {/* New Event Button */}
      <div className="p-3 border-b border-white/5">
        <Button
          className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      {/* Calendar Views */}
      <div className="p-3">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Views
        </p>
        <div className="space-y-1">
          <ViewItem
            icon={CalendarDays}
            label="Day"
            view="day"
            isSelected={currentView === 'day'}
            onClick={() => handleViewChange('day')}
          />
          <ViewItem
            icon={CalendarRange}
            label="Week"
            view="week"
            isSelected={currentView === 'week'}
            onClick={() => handleViewChange('week')}
          />
          <ViewItem
            icon={Calendar}
            label="Month"
            view="month"
            isSelected={currentView === 'month'}
            onClick={() => handleViewChange('month')}
          />
          <ViewItem
            icon={ListTodo}
            label="Agenda"
            view="agenda"
            isSelected={currentView === 'agenda'}
            onClick={() => handleViewChange('agenda')}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-3" />

      {/* My Calendars */}
      <div className="flex-1 p-3 overflow-y-auto">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          My Calendars
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load calendars</span>
          </div>
        ) : calendars.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No calendars yet
          </p>
        ) : (
          <div className="space-y-2">
            {calendars.map((calendar) => (
              <CalendarItem
                key={calendar.id}
                calendar={calendar}
                onToggle={() => handleToggleVisibility(calendar)}
                isUpdating={updateCalendar.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Calendar */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Calendar
        </button>
      </div>

      {/* Add Calendar Modal */}
      {showAddModal && (
        <AddCalendarModal onClose={() => setShowAddModal(false)} />
      )}
    </aside>
  );
}

interface CalendarItemProps {
  calendar: CalendarType;
  onToggle: () => void;
  isUpdating: boolean;
}

function CalendarItem({ calendar, onToggle, isUpdating }: CalendarItemProps) {
  return (
    <label className="flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
      <input
        type="checkbox"
        checked={calendar.is_visible}
        onChange={onToggle}
        disabled={isUpdating}
        className="sr-only"
      />
      <span
        className={cn(
          'w-3 h-3 rounded-sm transition-opacity',
          !calendar.is_visible && 'opacity-30'
        )}
        style={{ backgroundColor: calendar.color }}
      />
      <span
        className={cn(
          'text-sm flex-1 truncate',
          calendar.is_visible ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {calendar.name}
      </span>
      {calendar.is_default && (
        <span className="text-xs text-muted-foreground">(default)</span>
      )}
    </label>
  );
}

function AddCalendarModal({ onClose }: { onClose: () => void }) {
  const createCalendar = useCreateCalendar();
  const [formData, setFormData] = useState<CalendarCreateInput>({
    name: '',
    color: COLOR_OPTIONS[0].value,
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Calendar name is required');
      return;
    }

    try {
      await createCalendar.mutateAsync(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create calendar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-base font-semibold text-white">Add Calendar</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
              placeholder="Calendar name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all',
                    formData.color === color.value
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                      : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
              placeholder="Optional description"
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
              disabled={createCalendar.isPending}
              className="px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg transition-colors"
            >
              {createCalendar.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
