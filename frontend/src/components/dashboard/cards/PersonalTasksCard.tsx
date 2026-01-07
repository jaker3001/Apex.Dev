import { CheckCircle2, Circle, ChevronRight, ListTodo } from 'lucide-react';
import { useTasks, type Task } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

interface PersonalTasksCardProps {
  onViewAll: () => void;
}

export function PersonalTasksCard({ onViewAll }: PersonalTasksCardProps) {
  // Get tasks marked for "My Day"
  const { data, isLoading } = useTasks({ view: 'my_day' });

  const tasks = data?.tasks?.slice(0, 5) || [];
  const totalCount = data?.total || 0;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-foreground">My Tasks</h3>
          {totalCount > 0 && (
            <span className="bg-amber-500/20 text-amber-400 dark:text-amber-400 text-xs px-2 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>
        <button
          onClick={onViewAll}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <ListTodo className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No tasks for today</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Add tasks to stay organized</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const isCompleted = task.status === 'completed';

  const getDueDateLabel = () => {
    if (!task.due_date) return null;
    const dueDate = parseISO(task.due_date);
    if (isToday(dueDate)) return 'Today';
    if (isTomorrow(dueDate)) return 'Tomorrow';
    if (isPast(dueDate) && !isCompleted) return format(dueDate, 'MMM d');
    return format(dueDate, 'MMM d');
  };

  const dueDateLabel = getDueDateLabel();
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isCompleted;

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
      {isCompleted ? (
        <CheckCircle2 className="w-5 h-5 text-green-400 dark:text-green-400 flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm truncate',
            isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </p>
        {dueDateLabel && (
          <p
            className={cn(
              'text-xs mt-0.5',
              isOverdue ? 'text-red-400 dark:text-red-400' : 'text-muted-foreground/60'
            )}
          >
            {dueDateLabel}
          </p>
        )}
      </div>
      {task.priority && task.priority !== 'none' && (
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            task.priority === 'high' && 'bg-red-500/20 text-red-400 dark:text-red-400',
            task.priority === 'medium' && 'bg-amber-500/20 text-amber-400 dark:text-amber-400',
            task.priority === 'low' && 'bg-blue-500/20 text-blue-400 dark:text-blue-400'
          )}
        >
          {task.priority}
        </span>
      )}
    </div>
  );
}
