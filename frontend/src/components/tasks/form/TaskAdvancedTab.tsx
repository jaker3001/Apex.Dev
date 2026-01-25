import { List, FolderKanban, GitBranch, Repeat, Plus, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { TaskList, Task } from '@/hooks/useTasks';

// Pending subtask type for tasks being created alongside the parent
export interface PendingSubtask {
  tempId: string;
  title: string;
  description?: string;
  priority: 'none' | 'low' | 'medium' | 'high';
  dueDate?: string;
  dueTime?: string;
  isImportant: boolean;
  isMyDay: boolean;
  recurrenceRule?: string;
  listId?: number;
  projectId?: number;
}

interface TaskAdvancedTabProps {
  listId: number | undefined;
  setListId: (value: number | undefined) => void;
  projectId: number | undefined;
  setProjectId: (value: number | undefined) => void;
  parentId: number | undefined;
  setParentId: (value: number | undefined) => void;
  recurrenceRule: string;
  setRecurrenceRule: (value: string) => void;
  lists: TaskList[];
  projects: { id: number; name: string }[];
  parentTasks: Task[];
  disabled?: boolean;
  // Subtask props
  existingSubtasks?: Task[];
  pendingSubtasks?: PendingSubtask[];
  onAddSubtask?: () => void;
  onRemovePendingSubtask?: (tempId: string) => void;
  onEditPendingSubtask?: (tempId: string) => void;
  showSubtaskSection?: boolean;
}

const recurrenceOptions = [
  { value: '', label: 'No repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
];

export function TaskAdvancedTab({
  listId,
  setListId,
  projectId,
  setProjectId,
  parentId,
  setParentId,
  recurrenceRule,
  setRecurrenceRule,
  lists,
  projects,
  parentTasks,
  disabled,
  existingSubtasks = [],
  pendingSubtasks = [],
  onAddSubtask,
  onRemovePendingSubtask,
  onEditPendingSubtask,
  showSubtaskSection = false,
}: TaskAdvancedTabProps) {
  const totalSubtasks = existingSubtasks.length + pendingSubtasks.length;
  const completedSubtasks = existingSubtasks.filter(t => t.status === 'completed').length;
  return (
    <div className="space-y-6">
      {/* List Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          List
        </label>
        <div className="relative">
          <List className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={listId ?? ''}
            onChange={(e) => setListId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background',
              'text-foreground appearance-none cursor-pointer',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <option value="">No list</option>
            {lists.filter((l) => !l.is_system).map((list) => (
              <option key={list.id} value={list.id}>
                {list.icon} {list.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Project
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Link this task to a business project
        </p>
        <div className="relative">
          <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={projectId ?? ''}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background',
              'text-foreground appearance-none cursor-pointer',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Parent Task Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Parent Task
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Make this a subtask of another task
        </p>
        <div className="relative">
          <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background',
              'text-foreground appearance-none cursor-pointer',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <option value="">No parent (top-level task)</option>
            {parentTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recurrence */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Repeat
        </label>
        <div className="relative">
          <Repeat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={recurrenceRule}
            onChange={(e) => setRecurrenceRule(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-background',
              'text-foreground appearance-none cursor-pointer',
              'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {recurrenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {recurrenceRule && (
          <p className="text-xs text-muted-foreground">
            Task will repeat {recurrenceRule} after completion
          </p>
        )}
      </div>

      {/* Subtasks Section - Only shown when editing/creating a parent task */}
      {showSubtaskSection && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Subtasks
              </label>
              {totalSubtasks > 0 && (
                <p className="text-xs text-muted-foreground">
                  {completedSubtasks}/{totalSubtasks} completed
                </p>
              )}
            </div>
            {onAddSubtask && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddSubtask}
                disabled={disabled}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Subtask
              </Button>
            )}
          </div>

          {/* Existing subtasks */}
          {existingSubtasks.length > 0 && (
            <div className="space-y-2">
              {existingSubtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm',
                    subtask.status === 'completed' && 'opacity-60'
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      'w-4 h-4 shrink-0',
                      subtask.status === 'completed' ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span className={cn(
                    'flex-1 truncate',
                    subtask.status === 'completed' && 'line-through'
                  )}>
                    {subtask.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pending subtasks (not yet saved) */}
          {pendingSubtasks.length > 0 && (
            <div className="space-y-2">
              {existingSubtasks.length > 0 && pendingSubtasks.length > 0 && (
                <p className="text-xs text-muted-foreground font-medium mt-2">
                  New subtasks (will be saved with task):
                </p>
              )}
              {pendingSubtasks.map((subtask) => (
                <div
                  key={subtask.tempId}
                  className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-sm"
                >
                  <Plus className="w-4 h-4 shrink-0 text-primary" />
                  <span
                    className="flex-1 truncate cursor-pointer hover:underline"
                    onClick={() => onEditPendingSubtask?.(subtask.tempId)}
                  >
                    {subtask.title}
                  </span>
                  {onRemovePendingSubtask && (
                    <button
                      type="button"
                      onClick={() => onRemovePendingSubtask(subtask.tempId)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      disabled={disabled}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalSubtasks === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No subtasks yet. Add subtasks to break down this task.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
