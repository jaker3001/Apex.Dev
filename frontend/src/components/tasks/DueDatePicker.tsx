import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Sun,
  CalendarDays,
  CalendarRange,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';

interface DueDatePickerProps {
  value?: string | null;
  onChange: (date: string | null) => void;
  showLabel?: boolean;
}

const presets = [
  {
    label: 'Today',
    icon: Sun,
    getValue: () => new Date(),
    color: 'text-amber-500',
  },
  {
    label: 'Tomorrow',
    icon: CalendarDays,
    getValue: () => addDays(new Date(), 1),
    color: 'text-blue-500',
  },
  {
    label: 'Next Week',
    icon: CalendarRange,
    getValue: () => addDays(new Date(), 7),
    color: 'text-purple-500',
  },
];

export function DueDatePicker({
  value,
  onChange,
  showLabel = true,
}: DueDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? parseISO(value) : new Date()
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

  const selectedDate = value ? parseISO(value) : null;

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handleSelectDate = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!selectedDate) return 'Add due date';
    if (isToday(selectedDate)) return 'Today';
    if (isSameDay(selectedDate, addDays(new Date(), 1))) return 'Tomorrow';
    return format(selectedDate, 'MMM d');
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
        <Calendar className="w-4 h-4" />
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
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleSelectDate(preset.getValue())}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted text-sm transition-colors"
                >
                  <preset.icon className={cn('w-4 h-4', preset.color)} />
                  <span>{preset.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {format(preset.getValue(), 'EEE')}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-border pt-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-muted"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 rounded hover:bg-muted"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs text-muted-foreground py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleSelectDate(day)}
                      className={cn(
                        'w-7 h-7 text-sm rounded transition-colors',
                        isSelected && 'bg-primary text-primary-foreground',
                        !isSelected && isTodayDate && 'bg-muted font-medium',
                        !isSelected && !isTodayDate && 'hover:bg-muted',
                        !isCurrentMonth && 'text-muted-foreground/50'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear button */}
            {value && (
              <button
                onClick={handleClear}
                className="w-full mt-3 px-2 py-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors"
              >
                Remove due date
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
