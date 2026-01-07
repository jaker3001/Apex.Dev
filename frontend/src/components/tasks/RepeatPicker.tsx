import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RepeatConfig {
  interval: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
  days?: string[]; // For weekly: ["Monday", "Wednesday", "Friday"]
}

interface RepeatPickerProps {
  value?: RepeatConfig | null;
  onChange: (config: RepeatConfig | null) => void;
  showLabel?: boolean;
}

const presets: { label: string; config: RepeatConfig }[] = [
  { label: 'Daily', config: { interval: 1, unit: 'days' } },
  { label: 'Weekdays', config: { interval: 1, unit: 'weeks', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] } },
  { label: 'Weekly', config: { interval: 1, unit: 'weeks' } },
  { label: 'Monthly', config: { interval: 1, unit: 'months' } },
  { label: 'Yearly', config: { interval: 1, unit: 'years' } },
];

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function RepeatPicker({
  value,
  onChange,
  showLabel = true,
}: RepeatPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState<RepeatConfig['unit']>('weeks');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPreset = (config: RepeatConfig) => {
    onChange(config);
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const config: RepeatConfig = {
      interval: customInterval,
      unit: customUnit,
    };
    if (customUnit === 'weeks' && selectedDays.length > 0) {
      config.days = selectedDays;
    }
    onChange(config);
    setIsOpen(false);
    setShowCustom(false);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!value) return 'Repeat';

    // Check if matches a preset
    const preset = presets.find(
      (p) =>
        p.config.interval === value.interval &&
        p.config.unit === value.unit &&
        JSON.stringify(p.config.days || []) === JSON.stringify(value.days || [])
    );
    if (preset) return preset.label;

    // Custom display
    const unitLabel = value.interval === 1
      ? value.unit.slice(0, -1) // Remove 's' for singular
      : value.unit;

    let text = `Every ${value.interval === 1 ? '' : value.interval + ' '}${unitLabel}`;
    if (value.days && value.days.length > 0 && value.days.length < 7) {
      text += ` on ${value.days.map((d) => d.slice(0, 3)).join(', ')}`;
    }
    return text;
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
        <Repeat className="w-4 h-4" />
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
            {!showCustom ? (
              <>
                {/* Presets */}
                <div className="space-y-1">
                  {presets.map((preset) => {
                    const isSelected =
                      value &&
                      value.interval === preset.config.interval &&
                      value.unit === preset.config.unit &&
                      JSON.stringify(value.days || []) ===
                        JSON.stringify(preset.config.days || []);

                    return (
                      <button
                        key={preset.label}
                        onClick={() => handleSelectPreset(preset.config)}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors',
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                        <span className={cn(!isSelected && 'ml-6')}>
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-border mt-3 pt-3">
                  <button
                    onClick={() => setShowCustom(true)}
                    className="w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  >
                    Custom...
                  </button>
                </div>
              </>
            ) : (
              /* Custom picker */
              <div className="space-y-3">
                <div className="text-sm font-medium">Custom repeat</div>

                {/* Interval and unit */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Every</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={customInterval}
                    onChange={(e) =>
                      setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-16 px-2 py-1 text-sm bg-muted border border-border rounded focus:outline-none focus:border-primary"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) =>
                      setCustomUnit(e.target.value as RepeatConfig['unit'])
                    }
                    className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded focus:outline-none focus:border-primary"
                  >
                    <option value="days">
                      {customInterval === 1 ? 'day' : 'days'}
                    </option>
                    <option value="weeks">
                      {customInterval === 1 ? 'week' : 'weeks'}
                    </option>
                    <option value="months">
                      {customInterval === 1 ? 'month' : 'months'}
                    </option>
                    <option value="years">
                      {customInterval === 1 ? 'year' : 'years'}
                    </option>
                  </select>
                </div>

                {/* Day picker for weekly */}
                {customUnit === 'weeks' && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">
                      On these days
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {weekdays.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={cn(
                            'px-2 py-1 text-xs rounded transition-colors',
                            selectedDays.includes(day)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          )}
                        >
                          {day.slice(0, 2)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCustom(false)}
                    className="flex-1 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCustomSubmit}
                    className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Clear button */}
            {value && !showCustom && (
              <button
                onClick={handleClear}
                className="w-full mt-3 px-2 py-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-muted rounded transition-colors"
              >
                Don't repeat
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
