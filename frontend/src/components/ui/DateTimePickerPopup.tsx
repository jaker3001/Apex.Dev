import { useState } from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';

interface DateTimePickerPopupProps {
  value?: string;
  onSave: (value: string) => void;
  onClose: () => void;
  label: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DateTimePickerPopup({ value, onSave, onClose, label }: DateTimePickerPopupProps) {
  // Parse initial value or use current date
  const initialDate = value ? new Date(value) : new Date();

  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? initialDate : null);
  const [hour, setHour] = useState(value ? initialDate.getHours().toString().padStart(2, '0') : '12');
  const [minute, setMinute] = useState(value ? initialDate.getMinutes().toString().padStart(2, '0') : '00');

  // Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(viewMonth, viewYear);
    const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
    const days: (number | null)[] = [];

    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    setSelectedDate(newDate);
  };

  const handleNow = () => {
    const now = new Date();
    setSelectedDate(now);
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    setHour(now.getHours().toString().padStart(2, '0'));
    setMinute(now.getMinutes().toString().padStart(2, '0'));
  };

  const handleSave = () => {
    if (!selectedDate) return;

    const finalDate = new Date(selectedDate);
    finalDate.setHours(parseInt(hour) || 0);
    finalDate.setMinutes(parseInt(minute) || 0);
    finalDate.setSeconds(0);
    finalDate.setMilliseconds(0);

    // Format as ISO string for the API
    onSave(finalDate.toISOString());
  };

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Popup */}
      <div className="relative bg-background border rounded-lg shadow-lg w-[320px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{label}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-medium">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-muted"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {calendarDays.map((day, index) => (
            <button
              key={index}
              disabled={day === null}
              onClick={() => day && handleDayClick(day)}
              className={`
                h-8 w-8 rounded text-sm flex items-center justify-center
                ${day === null ? 'invisible' : 'hover:bg-muted'}
                ${isSelectedDay(day!) ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}
                ${isToday(day!) && !isSelectedDay(day!) ? 'border border-primary' : ''}
              `}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Time Input */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Time:</span>
          <input
            type="text"
            value={hour}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 2);
              if (parseInt(val) <= 23 || val === '') setHour(val);
            }}
            onBlur={() => setHour(hour.padStart(2, '0'))}
            className="w-10 text-center border rounded px-1 py-1 text-sm"
            placeholder="HH"
          />
          <span className="font-bold">:</span>
          <input
            type="text"
            value={minute}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 2);
              if (parseInt(val) <= 59 || val === '') setMinute(val);
            }}
            onBlur={() => setMinute(minute.padStart(2, '0'))}
            className="w-10 text-center border rounded px-1 py-1 text-sm"
            placeholder="MM"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleNow}
            className="ml-auto"
          >
            Now
          </Button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!selectedDate}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
