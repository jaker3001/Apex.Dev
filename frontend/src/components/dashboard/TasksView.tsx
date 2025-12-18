import { useState } from 'react';
import {
  Sun,
  Star,
  Calendar,
  Inbox,
  List,
  Plus,
  Check,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

type TaskView = 'my_day' | 'important' | 'planned' | 'inbox' | number;

export function TasksView() {
  const [selectedView, setSelectedView] = useState<TaskView>('inbox');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Build filters based on selected view
  const filters: TaskFilters = {};
  if (selectedView === 'my_day') filters.view = 'my_day';
  else if (selectedView === 'important') filters.view = 'important';
  else if (selectedView === 'planned') filters.view = 'planned';
  else if (typeof selectedView === 'number') {
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

  const systemLists = lists.filter(l => l.is_system);
  const customLists = lists.filter(l => !l.is_system);

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

  if (listsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Task Lists Sidebar */}
      <div className="w-52 border-r border-slate-700 bg-slate-800/30 flex flex-col">
        <div className="p-3 space-y-1">
          <TaskListItem
            icon={Sun}
            label="My Day"
            count={systemLists.find(l => l.name === 'My Day')?.task_count}
            isSelected={selectedView === 'my_day'}
            onClick={() => setSelectedView('my_day')}
          />
          <TaskListItem
            icon={Star}
            label="Important"
            count={systemLists.find(l => l.name === 'Important')?.task_count}
            isSelected={selectedView === 'important'}
            onClick={() => setSelectedView('important')}
          />
          <TaskListItem
            icon={Calendar}
            label="Planned"
            count={systemLists.find(l => l.name === 'Planned')?.task_count}
            isSelected={selectedView === 'planned'}
            onClick={() => setSelectedView('planned')}
          />
          <TaskListItem
            icon={Inbox}
            label="Inbox"
            count={systemLists.find(l => l.name === 'Inbox')?.task_count}
            isSelected={selectedView === 'inbox'}
            onClick={() => setSelectedView('inbox')}
          />
        </div>

        {customLists.length > 0 && (
          <>
            <div className="h-px bg-slate-700 mx-3" />
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {customLists.map(list => (
                <TaskListItem
                  key={list.id}
                  icon={List}
                  label={list.name}
                  count={list.task_count}
                  isSelected={selectedView === list.id}
                  onClick={() => setSelectedView(list.id)}
                  color={list.color}
                />
              ))}
            </div>
          </>
        )}

        <div className="p-3 border-t border-slate-700">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            New List
          </button>
        </div>
      </div>

      {/* Task Content */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">{getViewTitle()}</h2>
          <p className="text-sm text-slate-400 mt-1">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>

        {/* Quick Add */}
        <div className="px-6 py-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim() || createTask.isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400">No tasks yet</p>
              <p className="text-sm text-slate-500 mt-1">Add a task to get started</p>
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
                  onDelete={() => deleteTask.mutate(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TaskListItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
  color?: string;
}

function TaskListItem({ icon: Icon, label, count, isSelected, onClick, color }: TaskListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isSelected
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      )}
    >
      <Icon className="w-4 h-4" style={color ? { color } : undefined} />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-slate-500">{count}</span>
      )}
    </button>
  );
}

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
        'group flex items-start gap-3 p-3 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors',
        isCompleted && 'opacity-60'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={onToggleComplete}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          isCompleted
            ? 'bg-blue-600 border-blue-600'
            : 'border-slate-500 hover:border-blue-500'
        )}
      >
        {isCompleted && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm text-white',
          isCompleted && 'line-through text-slate-400'
        )}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-slate-400 mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {task.due_date && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {task.due_date}
            </span>
          )}
          {task.subtask_total > 0 && (
            <span className="text-xs text-slate-500">
              {task.subtask_completed}/{task.subtask_total} subtasks
            </span>
          )}
        </div>
      </div>

      <div className={cn(
        'flex items-center gap-1 transition-opacity',
        showActions ? 'opacity-100' : 'opacity-0'
      )}>
        <button
          onClick={onToggleMyDay}
          className={cn(
            'p-1.5 rounded hover:bg-slate-700 transition-colors',
            task.is_my_day ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          )}
          title={task.is_my_day ? 'Remove from My Day' : 'Add to My Day'}
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleImportant}
          className={cn(
            'p-1.5 rounded hover:bg-slate-700 transition-colors',
            task.is_important ? 'text-amber-400' : 'text-slate-400 hover:text-white'
          )}
          title={task.is_important ? 'Remove from Important' : 'Mark as Important'}
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
