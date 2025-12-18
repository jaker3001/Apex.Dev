import { useState } from 'react';
import {
  Sun,
  Plus,
  Check,
  Star,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTasks,
  useCreateTask,
  useCompleteTask,
  useUpdateTask,
} from '@/hooks/useTasks';
import type { Task } from '@/hooks/useTasks';

interface MyDayViewProps {
  onNavigateToTasks: () => void;
}

export function MyDayView({ onNavigateToTasks }: MyDayViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { data: myDayData, isLoading } = useTasks({ view: 'my_day' });
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();

  const tasks = myDayData?.tasks || [];
  const incompleteTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    createTask.mutate(
      { title: newTaskTitle.trim(), is_my_day: true },
      { onSuccess: () => setNewTaskTitle('') }
    );
  };

  const handleToggleComplete = (task: Task) => {
    if (task.status === 'completed') {
      updateTask.mutate({ id: task.id, data: { status: 'open' } });
    } else {
      completeTask.mutate(task.id);
    }
  };

  const handleToggleImportant = (task: Task) => {
    updateTask.mutate({ id: task.id, data: { is_important: !task.is_important } });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
      {/* Header */}
      <div className="px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Sun className="w-8 h-8 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">My Day</h1>
        </div>
        <p className="text-slate-400">{dateStr}</p>
      </div>

      {/* Quick Add */}
      <div className="px-8 pb-4">
        <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-1">
          <div className="flex-1 relative">
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Add a task to My Day..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
          <button
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim() || createTask.isPending}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors mr-1"
          >
            {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <Sun className="w-16 h-16 mx-auto mb-4 text-amber-400/30" />
            <h3 className="text-lg font-medium text-white mb-2">Focus on what matters today</h3>
            <p className="text-slate-400 mb-6">Add tasks to My Day to plan your work</p>
            <button
              onClick={onNavigateToTasks}
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300"
            >
              Browse all tasks
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Incomplete Tasks */}
            {incompleteTasks.length > 0 && (
              <div className="space-y-2">
                {incompleteTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={() => handleToggleComplete(task)}
                    onToggleImportant={() => handleToggleImportant(task)}
                  />
                ))}
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  Completed ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={() => handleToggleComplete(task)}
                      onToggleImportant={() => handleToggleImportant(task)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* View All Link */}
            <button
              onClick={onNavigateToTasks}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              View all tasks
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: () => void;
  onToggleImportant: () => void;
}

function TaskCard({ task, onToggleComplete, onToggleImportant }: TaskCardProps) {
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800/70 transition-colors',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleComplete}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
          isCompleted
            ? 'bg-amber-500 border-amber-500'
            : 'border-slate-500 hover:border-amber-500'
        )}
      >
        {isCompleted && <Check className="w-3 h-3 text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm text-white',
          isCompleted && 'line-through text-slate-400'
        )}>
          {task.title}
        </p>
        {task.due_date && (
          <span className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {task.due_date}
          </span>
        )}
      </div>

      {/* Important Star */}
      <button
        onClick={onToggleImportant}
        className={cn(
          'p-1 rounded transition-colors opacity-0 group-hover:opacity-100',
          task.is_important ? 'opacity-100 text-amber-400' : 'text-slate-400 hover:text-white'
        )}
      >
        <Star className={cn('w-4 h-4', task.is_important && 'fill-current')} />
      </button>
    </div>
  );
}
