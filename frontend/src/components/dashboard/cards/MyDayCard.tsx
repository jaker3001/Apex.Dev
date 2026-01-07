import { Sun, Check, Clock, X, ChevronRight } from 'lucide-react';
import { useTasks, useCompleteTask, useRemoveFromMyDay, type Task } from '@/hooks/useTasks';
import { format, parseISO, isToday } from 'date-fns';

interface MyDayCardProps {
  onViewAll?: () => void;
}

export function MyDayCard({ onViewAll }: MyDayCardProps) {
  // Fetch tasks with is_my_day = true
  const { data, isLoading } = useTasks({ view: 'my_day' });
  const completeTask = useCompleteTask();
  const removeFromMyDay = useRemoveFromMyDay();

  const tasks = data?.tasks || [];
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;

  const handleComplete = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    try {
      await completeTask.mutateAsync(taskId);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleRemove = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    try {
      await removeFromMyDay.mutateAsync(taskId);
    } catch (error) {
      console.error('Failed to remove from My Day:', error);
    }
  };

  const getTimeLabel = (task: Task) => {
    if (task.due_time) {
      return task.due_time;
    }
    if (task.due_date) {
      const date = parseISO(task.due_date);
      if (!isToday(date)) {
        return format(date, 'MMM d');
      }
    }
    return null;
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-foreground">My Day</h3>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">No tasks for today</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Add tasks from Project Tasks to plan your day
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Pending tasks */}
            {pendingTasks.map((task) => {
              const timeLabel = getTimeLabel(task);
              return (
                <div
                  key={task.id}
                  className="group flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <button
                    onClick={(e) => handleComplete(e, task.id)}
                    disabled={completeTask.isPending}
                    className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-border hover:border-green-500 dark:hover:border-green-400 hover:bg-green-500/20 transition-colors flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-transparent group-hover:text-green-500 dark:group-hover:text-green-400" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                    {timeLabel && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {timeLabel}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, task.id)}
                    disabled={removeFromMyDay.isPending}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 transition-all"
                    title="Remove from My Day"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Completed ({completedTasks.length})</span>
                </div>
                {completedTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 opacity-50"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-500 dark:text-green-400" />
                    </div>
                    <p className="text-sm text-muted-foreground truncate line-through">{task.title}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
