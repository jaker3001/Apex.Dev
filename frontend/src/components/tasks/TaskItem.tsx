import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Star,
  Sun,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskCheckbox } from './TaskCheckbox';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import type { Task } from '@/hooks/useTasks';

interface TaskItemProps {
  task: Task;
  onSelect: () => void;
  onToggleComplete: () => void;
  onToggleImportant: () => void;
  isSelected?: boolean;
  isDraggable?: boolean;
}

function formatDueDate(dateStr: string): { text: string; isOverdue: boolean } {
  const date = parseISO(dateStr);
  const isOverdue = isPast(date) && !isToday(date);

  if (isToday(date)) {
    return { text: 'Today', isOverdue: false };
  }
  if (isTomorrow(date)) {
    return { text: 'Tomorrow', isOverdue: false };
  }
  return { text: format(date, 'MMM d'), isOverdue };
}

export function TaskItem({
  task,
  onSelect,
  onToggleComplete,
  onToggleImportant,
  isSelected = false,
  isDraggable = true,
}: TaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status === 'completed';
  const dueInfo = task.due_date ? formatDueDate(task.due_date) : null;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer',
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted/50 border border-transparent',
        isDragging && 'opacity-50 shadow-lg bg-card',
        isCompleted && 'opacity-60'
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      {isDraggable && (
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-0.5 -ml-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Checkbox */}
      <TaskCheckbox
        checked={isCompleted}
        priority={task.priority as 'none' | 'low' | 'medium' | 'high'}
        onToggle={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-tight',
            isCompleted && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* My Day indicator */}
          {task.is_my_day && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-500">
              <Sun className="w-3 h-3" />
              <span>My Day</span>
            </span>
          )}

          {/* Due date */}
          {dueInfo && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                dueInfo.isOverdue && !isCompleted
                  ? 'text-red-500'
                  : 'text-muted-foreground'
              )}
            >
              <Calendar className="w-3 h-3" />
              <span>{dueInfo.text}</span>
            </span>
          )}

          {/* Subtask count */}
          {task.subtask_total > 0 && (
            <span className="text-xs text-muted-foreground">
              {task.subtask_completed}/{task.subtask_total}
            </span>
          )}

          {/* List name (if showing in "All" view) */}
          {task.list_id && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {/* List name would come from task list data */}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Important star - always visible if set */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleImportant();
          }}
          className={cn(
            'p-1 rounded transition-all',
            task.is_important
              ? 'text-amber-400'
              : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-400'
          )}
        >
          <Star
            className={cn('w-4 h-4', task.is_important && 'fill-current')}
          />
        </button>

        {/* Chevron for selection indicator */}
        <ChevronRight
          className={cn(
            'w-4 h-4 text-muted-foreground transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
          )}
        />
      </div>
    </motion.div>
  );
}
