import { MarkdownEditor } from '../editor/MarkdownEditor';
import { PrioritySelector, type Priority } from './PrioritySelector';
import { Star, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskBasicTabProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  priority: Priority;
  setPriority: (value: Priority) => void;
  isImportant: boolean;
  setIsImportant: (value: boolean) => void;
  isMyDay: boolean;
  setIsMyDay: (value: boolean) => void;
  disabled?: boolean;
}

export function TaskBasicTab({
  title,
  setTitle,
  description,
  setDescription,
  priority,
  setPriority,
  isImportant,
  setIsImportant,
  isMyDay,
  setIsMyDay,
  disabled,
}: TaskBasicTabProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title..."
          disabled={disabled}
          className={cn(
            'w-full px-3 py-2 rounded-lg border border-border bg-background',
            'text-foreground placeholder-muted-foreground',
            'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Description
        </label>
        <MarkdownEditor
          value={description}
          onChange={setDescription}
          placeholder="Add a description (supports markdown)..."
          disabled={disabled}
          minRows={4}
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Priority
        </label>
        <PrioritySelector
          value={priority}
          onChange={setPriority}
          disabled={disabled}
        />
      </div>

      {/* Checkboxes */}
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <Star className={cn('w-4 h-4', isImportant ? 'text-amber-400' : 'text-muted-foreground')} />
          <span className="text-sm text-foreground">Important</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isMyDay}
            onChange={(e) => setIsMyDay(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
          />
          <Sun className={cn('w-4 h-4', isMyDay ? 'text-amber-400' : 'text-muted-foreground')} />
          <span className="text-sm text-foreground">Add to My Day</span>
        </label>
      </div>
    </div>
  );
}
