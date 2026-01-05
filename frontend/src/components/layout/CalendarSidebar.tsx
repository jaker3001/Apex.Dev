import {
  CalendarDays,
  CalendarRange,
  Calendar,
  ListTodo,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';

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

export function CalendarSidebar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'month';

  const handleViewChange = (view: string) => {
    setSearchParams({ view });
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
      <div className="flex-1 p-3">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          My Calendars
        </p>
        <div className="space-y-2">
          <CalendarItem name="Personal" color="bg-blue-500" enabled />
          <CalendarItem name="Work" color="bg-green-500" enabled />
          <CalendarItem name="Holidays" color="bg-purple-500" enabled={false} />
        </div>
      </div>

      {/* Add Calendar */}
      <div className="p-3 border-t border-white/5">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          Add Calendar
        </button>
      </div>
    </aside>
  );
}

interface CalendarItemProps {
  name: string;
  color: string;
  enabled: boolean;
}

function CalendarItem({ name, color, enabled }: CalendarItemProps) {
  return (
    <label className="flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
      <input
        type="checkbox"
        defaultChecked={enabled}
        className="sr-only"
      />
      <span className={cn("w-3 h-3 rounded-sm", color, !enabled && "opacity-30")} />
      <span className={cn("text-sm", enabled ? "text-foreground" : "text-muted-foreground")}>{name}</span>
    </label>
  );
}
