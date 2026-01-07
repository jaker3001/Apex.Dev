import { useState, useRef, useEffect } from 'react';
import { Plus, Calendar, Star, Sun, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasksStore } from '@/stores/tasksStore';

interface QuickAddTaskProps {
  onAdd: (data: {
    title: string;
    is_my_day?: boolean;
    is_important?: boolean;
    due_date?: string;
    list_id?: number;
  }) => void;
  isLoading?: boolean;
  listId?: number;
  placeholder?: string;
}

export function QuickAddTask({
  onAdd,
  isLoading = false,
  listId,
  placeholder = 'Add a task',
}: QuickAddTaskProps) {
  const [title, setTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [isMyDay, setIsMyDay] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { selectedView, setQuickAddFocused } = useTasksStore();

  // Auto-set flags based on current view
  useEffect(() => {
    if (selectedView.type === 'smart') {
      setIsMyDay(selectedView.list === 'my_day');
      setIsImportant(selectedView.list === 'important');
    }
  }, [selectedView]);

  const handleSubmit = () => {
    if (!title.trim() || isLoading) return;

    onAdd({
      title: title.trim(),
      is_my_day: isMyDay,
      is_important: isImportant,
      due_date: dueDate || undefined,
      list_id: listId,
    });

    setTitle('');
    setDueDate(null);
    // Keep focus on input for rapid entry
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setTitle('');
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setShowOptions(true);
    setQuickAddFocused(true);
  };

  const handleBlur = () => {
    // Delay to allow button clicks
    setTimeout(() => {
      if (!title.trim()) {
        setShowOptions(false);
      }
      setQuickAddFocused(false);
    }, 200);
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
      <div className="flex items-center gap-3 p-3">
        <div className="shrink-0">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : (
            <Plus className="w-5 h-5 text-primary" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none text-sm"
        />
      </div>

      {/* Quick options bar */}
      {showOptions && (
        <div className="flex items-center gap-1 px-3 pb-3 pt-0">
          <button
            type="button"
            onClick={() => setIsMyDay(!isMyDay)}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              isMyDay ? 'text-amber-400 bg-amber-400/10' : 'text-muted-foreground'
            )}
            title="Add to My Day"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsImportant(!isImportant)}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              isImportant ? 'text-amber-400 bg-amber-400/10' : 'text-muted-foreground'
            )}
            title="Mark as Important"
          >
            <Star className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setDueDate(dueDate === today ? null : today);
            }}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              dueDate ? 'text-primary bg-primary/10' : 'text-muted-foreground'
            )}
            title="Set Due Date"
          >
            <Calendar className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {title.trim() && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}
