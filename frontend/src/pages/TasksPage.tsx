import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useTaskLists,
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useAddToMyDay,
  useRemoveFromMyDay,
} from '@/hooks/useTasks';
import type { Task, TaskFilters } from '@/hooks/useTasks';
import {
  Sun,
  Star,
  Calendar,
  Plus,
  Check,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TasksPage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'my_day';
  const listParam = searchParams.get('list');

  // Convert URL params to selected view
  const selectedView = listParam ? parseInt(listParam) : viewParam as 'my_day' | 'important' | 'planned' | 'inbox';
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Build filters based on selected view
  const filters: TaskFilters = {};
  if (selectedView === 'my_day') filters.view = 'my_day';
  else if (selectedView === 'important') filters.view = 'important';
  else if (selectedView === 'planned') filters.view = 'planned';
  else if (selectedView === 'inbox') {
    // Inbox shows tasks with no list_id
    // For now, we'll show all non-my-day, non-important tasks
  } else if (typeof selectedView === 'number') {
    filters.list_id = selectedView;
  }

  const { data: listsData, isLoading: listsLoading } = useTaskLists();
  const { data: tasksData, isLoading: tasksLoading } = useTasks(filters);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const addToMyDay = useAddToMyDay();
  const removeFromMyDay = useRemoveFromMyDay();

  const lists = listsData?.lists || [];
  const tasks = tasksData?.tasks || [];

  // Get current view title
  const getViewTitle = () => {
    if (selectedView === 'my_day') return 'My Day';
    if (selectedView === 'important') return 'Important';
    if (selectedView === 'planned') return 'Planned';
    if (selectedView === 'inbox') return 'Inbox';
    const list = lists.find(l => l.id === selectedView);
    return list?.name || 'Tasks';
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    const taskData: Parameters<typeof createTask.mutate>[0] = {
      title: newTaskTitle.trim(),
      is_my_day: selectedView === 'my_day',
      is_important: selectedView === 'important',
    };

    if (typeof selectedView === 'number') {
      taskData.list_id = selectedView;
    }

    createTask.mutate(taskData, {
      onSuccess: () => setNewTaskTitle(''),
    });
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

  const handleToggleMyDay = (task: Task) => {
    if (task.is_my_day) {
      removeFromMyDay.mutate(task.id);
    } else {
      addToMyDay.mutate(task.id);
    }
  };

  const handleDeleteTask = (id: number) => {
    deleteTask.mutate(id);
  };

  if (listsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border">
        <h1 className="text-3xl font-bold text-foreground">{getViewTitle()}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </p>
      </div>

      {/* Quick Add */}
      <div className="px-8 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Add a task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim() || createTask.isPending}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg text-sm font-medium transition-colors"
          >
            {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tasksLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Add a task to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={() => handleToggleComplete(task)}
                onToggleImportant={() => handleToggleImportant(task)}
                onToggleMyDay={() => handleToggleMyDay(task)}
                onDelete={() => handleDeleteTask(task.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Task Item Component
interface TaskItemProps {
  task: Task;
  onToggleComplete: () => void;
  onToggleImportant: () => void;
  onToggleMyDay: () => void;
  onDelete: () => void;
}

function TaskItem({ task, onToggleComplete, onToggleImportant, onToggleMyDay, onDelete }: TaskItemProps) {
  const [showActions, setShowActions] = useState(false);
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 bg-card rounded-lg hover:bg-card/80 transition-colors',
        isCompleted && 'opacity-60'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleComplete}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          isCompleted
            ? 'bg-primary border-primary'
            : 'border-muted-foreground hover:border-primary'
        )}
      >
        {isCompleted && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm text-foreground',
          isCompleted && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {task.due_date && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.due_date}
            </span>
          )}
          {task.subtask_total > 0 && (
            <span className="text-xs text-muted-foreground">
              {task.subtask_completed}/{task.subtask_total} subtasks
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={cn(
        'flex items-center gap-1 transition-opacity',
        showActions ? 'opacity-100' : 'opacity-0'
      )}>
        <button
          onClick={onToggleMyDay}
          className={cn(
            'p-1.5 rounded hover:bg-muted transition-colors',
            task.is_my_day ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'
          )}
          title={task.is_my_day ? 'Remove from My Day' : 'Add to My Day'}
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleImportant}
          className={cn(
            'p-1.5 rounded hover:bg-muted transition-colors',
            task.is_important ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground'
          )}
          title={task.is_important ? 'Remove from Important' : 'Mark as Important'}
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
