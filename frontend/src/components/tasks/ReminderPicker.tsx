import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, X, Sun, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addHours, setHours, setMinutes, isToday, parseISO } from 'date-fns';

interface ReminderPickerProps {
  value?: string | null; // ISO datetime string
  dueDate?: string | null; // To show due-date relative options
  onChange: (datetime: string | null) => void;
  showLabel?: boolean;
}

export function ReminderPicker({
  value,
  dueDate,
  onChange,
  showLabel = true,
}: ReminderPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customTime, setCustomTime] = useState('09:00');
  const [customDate, setCustomDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presets = [
    {
      label: 'Later today',
      icon: Clock,
      getValue: () => {
        const now = new Date();
        const later = addHours(now, 3);
        // Round to next hour
        later.setMinutes(0, 0, 0);
        return later;
      },
      show: () => new Date().getHours() < 21,
    },
    {
      label: 'Tomorrow morning',
      icon: Sun,
      getValue: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return setMinutes(setHours(tomorrow, 9), 0);
      },
      show: () => true,
    },
    {
      label: 'Next week',
      icon: CalendarClock,
      getValue: () => {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return setMinutes(setHours(nextWeek, 9), 0);
      },
      show: () => true,
    },
  ];

  // If there's a due date, add a "Day before" option
  if (dueDate) {
    const dueDateObj = parseISO(dueDate);
    if (!isToday(dueDateObj)) {
      presets.splice(1, 0, {
        label: 'Day before due',
        icon: Bell,
        getValue: () => {
          const dayBefore = new Date(dueDateObj);
          dayBefore.setDate(dayBefore.getDate() - 1);
          return setMinutes(setHours(dayBefore, 9), 0);
        },
        show: () => true,
      });
    }
  }

  const handleSelectPreset = (getValue: () => Date) => {
    const date = getValue();
    onChange(date.toISOString());
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const [hours, minutes] = customTime.split(':').map(Number);
    const date = parseISO(customDate);
    date.setHours(hours, minutes, 0, 0);
    onChange(date.toISOString());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value) return 'Remind me';
    const date = parseISO(value);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    }
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors w-full',
          value ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <Bell className="w-4 h-4" />
        {showLabel && <span className="text-sm">{getDisplayText()}</span>}
        {value && (
          <button
            onClick={handleClear}
            className="ml-auto p-0.5 rounded hover:bg-muted"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-64"
          >
            {/* Presets */}
            <div className="space-y-1 mb-3">
              {presets
                .filter((p) => p.show())
                .map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleSelectPreset(preset.getValue)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted text-sm transition-colors"
                  >
                    <preset.icon className="w-4 h-4 text-muted-foreground" />
                    <span>{preset.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(preset.getValue(), 'h:mm a')}
                    </span>
                  </button>
                ))}
            </div>

            {/* Custom picker */}
            <div className="border-t border-border pt-3">
              <div className="text-xs text-muted-foreground mb-2">
                Pick a date & time
              </div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm bg-muted border border-border rounded focus:outline-none focus:border-primary"
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-24 px-2 py-1.5 text-sm bg-muted border border-border rounded focus:outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleCustomSubmit}
                className="w-full mt-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Set reminder
              </button>
            </div>

            {/* Clear button */}
            {value && (
              <button
                onClick={handleClear}
                className="w-full mt-3 px-2 py-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors"
              >
                Remove reminder
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
