import { Calendar, Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskScheduleTabProps {
  dueDate: string;
  setDueDate: (value: string) => void;
  dueTime: string;
  setDueTime: (value: string) => void;
  reminder: string;
  setReminder: (value: string) => void;
  disabled?: boolean;
}

export function TaskScheduleTab({
  dueDate,
  setDueDate,
  dueTime,
  setDueTime,
  reminder,
  setReminder,
  disabled,
}: TaskScheduleTabProps) {
  return (
    <div className="space-y-6">
      {/* Due Date */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Due Date
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background',
              'text-foreground',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
        </div>
      </div>

      {/* Due Time */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Due Time
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Set a specific time for this task to be due
        </p>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background',
              'text-foreground',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
        </div>
      </div>

      {/* Reminder */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Reminder
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Get notified at a specific date and time
        </p>
        <div className="relative">
          <Bell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="datetime-local"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background',
              'text-foreground',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
        </div>
        {reminder && (
          <button
            type="button"
            onClick={() => setReminder('')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear reminder
          </button>
        )}
      </div>

      {/* Helper text */}
      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Reminders will appear as notifications in the app.
          Make sure notifications are enabled in your browser settings.
        </p>
      </div>
    </div>
  );
}
