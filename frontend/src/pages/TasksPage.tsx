import { useState, useCallback, useMemo } from 'react';
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
import { TaskModal, type TaskFormData, type TaskModalMode, type PendingSubtask } from '@/components/tasks';
import {
  Sun,
  Star,
  Calendar,
  Plus,
  Check,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TasksPage() {
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view') || 'my_day';
  const listParam = searchParams.get('list');

  // Convert URL params to selected view
  const selectedView = listParam ? parseInt(listParam) : viewParam as 'my_day' | 'important' | 'planned' | 'all';

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TaskModalMode>('create');
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  // Expanded tasks state (tracks which parent tasks have their subtasks visible)
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  // Build filters based on selected view
  const filters: TaskFilters = {};
  if (selectedView === 'my_day') filters.view = 'my_day';
  else if (selectedView === 'important') filters.view = 'important';
  else if (selectedView === 'planned') filters.view = 'planned';
  else if (selectedView === 'all') {
    // All view shows every task - no filters needed
  } else if (typeof selectedView === 'number') {
    filters.list_id = selectedView;
  }

  const { data: listsData, isLoading: listsLoading } = useTaskLists();
  const { data: tasksData, isLoading: tasksLoading } = useTasks(filters);
  const { data: allTasksData } = useTasks(); // For parent task selection
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const addToMyDay = useAddToMyDay();
  const removeFromMyDay = useRemoveFromMyDay();

  const lists = listsData?.lists || [];
  const tasks = useMemo(() => tasksData?.tasks || [], [tasksData?.tasks]);
  const allTasks = allTasksData?.tasks || [];

  // Organize tasks into parent tasks (top-level) and group subtasks by parent
  const { parentTasks, subtasksByParent } = useMemo(() => {
    const topLevelTasks: Task[] = [];
    const subtaskMap: Map<number, Task[]> = new Map();

    tasks.forEach(task => {
      if (task.parent_id) {
        // This is a subtask - group it under its parent
        const parentSubtasks = subtaskMap.get(task.parent_id) || [];
        parentSubtasks.push(task);
        subtaskMap.set(task.parent_id, parentSubtasks);
      } else {
        // This is a top-level task
        topLevelTasks.push(task);
      }
    });

    return { parentTasks: topLevelTasks, subtasksByParent: subtaskMap };
  }, [tasks]);

  // Toggle expanded state for a parent task
  const toggleExpanded = useCallback((taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Get current view title
  const getViewTitle = () => {
    if (selectedView === 'my_day') return 'My Day';
    if (selectedView === 'important') return 'Important';
    if (selectedView === 'planned') return 'Planned';
    if (selectedView === 'all') return 'All';
    const list = lists.find(l => l.id === selectedView);
    return list?.name || 'Tasks';
  };

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setSelectedTask(undefined);
    setModalMode('create');
    setModalOpen(true);
  }, []);

  const openViewModal = useCallback((task: Task) => {
    setSelectedTask(task);
    setModalMode('view');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setSelectedTask(undefined);
  }, []);

  const handleSaveTask = useCallback(async (data: TaskFormData, pendingSubtasks?: PendingSubtask[]) => {
    const taskPayload = {
      title: data.title,
      description: data.description || undefined,
      due_date: data.dueDate || undefined,
      due_time: data.dueTime || undefined,
      priority: data.priority,
      is_important: data.isImportant,
      is_my_day: data.isMyDay,
      list_id: data.listId,
      project_id: data.projectId,
      parent_id: data.parentId,
      recurrence_rule: data.recurrenceRule || undefined,
    };

    if (selectedTask) {
      // Update existing task
      updateTask.mutate(
        { id: selectedTask.id, data: taskPayload },
        {
          onSuccess: () => {
            // Create any pending subtasks with this task as parent
            if (pendingSubtasks && pendingSubtasks.length > 0) {
              pendingSubtasks.forEach(subtask => {
                createTask.mutate({
                  title: subtask.title,
                  description: subtask.description,
                  priority: subtask.priority,
                  due_date: subtask.dueDate,
                  due_time: subtask.dueTime,
                  is_important: subtask.isImportant,
                  is_my_day: subtask.isMyDay,
                  recurrence_rule: subtask.recurrenceRule,
                  list_id: subtask.listId,
                  project_id: subtask.projectId,
                  parent_id: selectedTask.id,
                });
              });
            }
            closeModal();
          }
        }
      );
    } else {
      // Create new task
      createTask.mutate(taskPayload, {
        onSuccess: (newTask) => {
          // Create any pending subtasks with the new task as parent
          if (pendingSubtasks && pendingSubtasks.length > 0) {
            pendingSubtasks.forEach(subtask => {
              createTask.mutate({
                title: subtask.title,
                description: subtask.description,
                priority: subtask.priority,
                due_date: subtask.dueDate,
                due_time: subtask.dueTime,
                is_important: subtask.isImportant,
                is_my_day: subtask.isMyDay,
                recurrence_rule: subtask.recurrenceRule,
                list_id: subtask.listId,
                project_id: subtask.projectId,
                parent_id: newTask.id,
              });
            });
          }
          closeModal();
        },
      });
    }
  }, [selectedTask, updateTask, createTask, closeModal]);

  const handleDeleteTask = useCallback((id: number) => {
    deleteTask.mutate(id, {
      onSuccess: () => closeModal(),
    });
  }, [deleteTask, closeModal]);

  const handleCompleteTask = useCallback((id: number) => {
    completeTask.mutate(id, {
      onSuccess: () => closeModal(),
    });
  }, [completeTask, closeModal]);

  const handleToggleComplete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === 'completed') {
      updateTask.mutate({ id: task.id, data: { status: 'open' } });
    } else {
      completeTask.mutate(task.id);
    }
  };

  const handleToggleImportant = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask.mutate({ id: task.id, data: { is_important: !task.is_important } });
  };

  const handleToggleMyDay = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.is_my_day) {
      removeFromMyDay.mutate(task.id);
    } else {
      addToMyDay.mutate(task.id);
    }
  };

  const handleDeleteTaskQuick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask.mutate(id);
  };

  // Default values for new tasks based on current view
  const getDefaultValues = useCallback(() => {
    const defaults: Partial<TaskFormData> = {};
    if (selectedView === 'important') defaults.isImportant = true;
    if (typeof selectedView === 'number') defaults.listId = selectedView;
    return defaults;
  }, [selectedView]);

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

      {/* Add Task Button */}
      <div className="px-8 py-4 border-b border-border">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
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
            {parentTasks.map(task => {
              const subtasks = subtasksByParent.get(task.id) || [];
              const hasSubtasks = subtasks.length > 0 || task.subtask_total > 0;
              const isExpanded = expandedTasks.has(task.id);

              return (
                <div key={task.id}>
                  <TaskItem
                    task={task}
                    onClick={() => openViewModal(task)}
                    onToggleComplete={(e) => handleToggleComplete(task, e)}
                    onToggleImportant={(e) => handleToggleImportant(task, e)}
                    onToggleMyDay={(e) => handleToggleMyDay(task, e)}
                    onDelete={(e) => handleDeleteTaskQuick(task.id, e)}
                    hasSubtasks={hasSubtasks}
                    isExpanded={isExpanded}
                    onToggleExpand={(e) => toggleExpanded(task.id, e)}
                  />
                  {/* Render subtasks when expanded */}
                  {isExpanded && subtasks.length > 0 && (
                    <div className="ml-8 mt-1 space-y-1 border-l-2 border-border pl-4">
                      {subtasks.map(subtask => (
                        <TaskItem
                          key={subtask.id}
                          task={subtask}
                          onClick={() => openViewModal(subtask)}
                          onToggleComplete={(e) => handleToggleComplete(subtask, e)}
                          onToggleImportant={(e) => handleToggleImportant(subtask, e)}
                          onToggleMyDay={(e) => handleToggleMyDay(subtask, e)}
                          onDelete={(e) => handleDeleteTaskQuick(subtask.id, e)}
                          isSubtask
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        task={selectedTask}
        lists={lists}
        projects={[]} // TODO: Load from projects API when available
        allTasks={allTasks}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onComplete={handleCompleteTask}
        isSaving={createTask.isPending || updateTask.isPending}
        defaultValues={getDefaultValues()}
      />
    </div>
  );
}

// Task Item Component
interface TaskItemProps {
  task: Task;
  onClick: () => void;
  onToggleComplete: (e: React.MouseEvent) => void;
  onToggleImportant: (e: React.MouseEvent) => void;
  onToggleMyDay: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  hasSubtasks?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (e: React.MouseEvent) => void;
  isSubtask?: boolean;
}

function TaskItem({
  task,
  onClick,
  onToggleComplete,
  onToggleImportant,
  onToggleMyDay,
  onDelete,
  hasSubtasks = false,
  isExpanded = false,
  onToggleExpand,
  isSubtask = false,
}: TaskItemProps) {
  const [showActions, setShowActions] = useState(false);
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 bg-card rounded-lg hover:bg-card/80 transition-colors cursor-pointer',
        isCompleted && 'opacity-60',
        isSubtask && 'bg-card/50 py-2'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onClick}
    >
      {/* Expand/Collapse button for parent tasks with subtasks */}
      {hasSubtasks && onToggleExpand ? (
        <button
          onClick={onToggleExpand}
          className="mt-0.5 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      ) : (
        // Spacer for alignment when no subtasks
        !isSubtask && <div className="w-5" />
      )}

      {/* Checkbox */}
      <button
        onClick={onToggleComplete}
        className={cn(
          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
          isCompleted
            ? 'bg-primary border-primary'
            : 'border-muted-foreground hover:border-primary',
          isSubtask && 'w-4 h-4'
        )}
      >
        {isCompleted && <Check className={cn('text-primary-foreground', isSubtask ? 'w-2.5 h-2.5' : 'w-3 h-3')} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-foreground',
          isCompleted && 'line-through text-muted-foreground',
          isSubtask ? 'text-xs' : 'text-sm'
        )}>
          {task.title}
        </p>
        {task.description && !isSubtask && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {task.due_date && (
            <span className={cn(
              'text-muted-foreground flex items-center gap-1',
              isSubtask ? 'text-[10px]' : 'text-xs'
            )}>
              <Calendar className={isSubtask ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              {task.due_date}
            </span>
          )}
          {!isSubtask && task.subtask_total > 0 && (
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
            task.is_my_day ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground',
            isSubtask && 'p-1'
          )}
          title={task.is_my_day ? 'Remove from My Day' : 'Add to My Day'}
        >
          <Sun className={isSubtask ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
        <button
          onClick={onToggleImportant}
          className={cn(
            'p-1.5 rounded hover:bg-muted transition-colors',
            task.is_important ? 'text-amber-400' : 'text-muted-foreground hover:text-foreground',
            isSubtask && 'p-1'
          )}
          title={task.is_important ? 'Remove from Important' : 'Mark as Important'}
        >
          <Star className={isSubtask ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
        <button
          onClick={onDelete}
          className={cn(
            'p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors',
            isSubtask && 'p-1'
          )}
          title="Delete"
        >
          <Trash2 className={isSubtask ? 'w-3 h-3' : 'w-4 h-4'} />
        </button>
      </div>
    </div>
  );
}
