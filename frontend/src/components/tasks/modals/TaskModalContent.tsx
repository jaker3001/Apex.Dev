import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TaskBasicTab } from '../form/TaskBasicTab';
import { TaskScheduleTab } from '../form/TaskScheduleTab';
import { TaskAdvancedTab, type PendingSubtask } from '../form/TaskAdvancedTab';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { PriorityBadge, type Priority } from '../form/PrioritySelector';
import type { Task, TaskList } from '@/hooks/useTasks';
import { Calendar, Star, Sun, Loader2, Pencil, Trash2, Check } from 'lucide-react';

// Re-export PendingSubtask for use by parent components
export type { PendingSubtask } from '../form/TaskAdvancedTab';

export type TaskModalMode = 'create' | 'view' | 'edit';

interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: Priority;
  isImportant: boolean;
  isMyDay: boolean;
  reminder: string;
  listId?: number;
  projectId?: number;
  parentId?: number;
  recurrenceRule: string;
}

interface TaskModalContentProps {
  mode: TaskModalMode;
  task?: Task;
  lists: TaskList[];
  projects: { id: number; name: string }[];
  parentTasks: Task[];
  onSave: (data: TaskFormData, pendingSubtasks?: PendingSubtask[]) => void;
  onDelete?: () => void;
  onComplete?: () => void;
  onModeChange: (mode: TaskModalMode) => void;
  isSaving?: boolean;
  defaultValues?: Partial<TaskFormData>;
  // Subtask support
  pendingSubtasks?: PendingSubtask[];
  onAddSubtask?: () => void;
  onRemovePendingSubtask?: (tempId: string) => void;
  onEditPendingSubtask?: (tempId: string) => void;
  isSubtask?: boolean; // True when this modal is creating a subtask
}

const initialFormData: TaskFormData = {
  title: '',
  description: '',
  dueDate: '',
  dueTime: '',
  priority: 'none',
  isImportant: false,
  isMyDay: false,
  reminder: '',
  listId: undefined,
  projectId: undefined,
  parentId: undefined,
  recurrenceRule: '',
};

function taskToFormData(task: Task): TaskFormData {
  return {
    title: task.title,
    description: task.description || '',
    dueDate: task.due_date || '',
    dueTime: task.due_time || '',
    priority: task.priority as Priority,
    isImportant: task.is_important,
    isMyDay: task.is_my_day,
    reminder: '',
    listId: task.list_id,
    projectId: task.project_id,
    parentId: task.parent_id,
    recurrenceRule: task.recurrence_rule || '',
  };
}

function getInitialFormData(task?: Task, defaultValues?: Partial<TaskFormData>): TaskFormData {
  if (task) return taskToFormData(task);
  return { ...initialFormData, ...defaultValues };
}

export function TaskModalContent({
  mode,
  task,
  lists,
  projects,
  parentTasks,
  onSave,
  onDelete,
  onComplete,
  onModeChange,
  isSaving,
  defaultValues,
  pendingSubtasks = [],
  onAddSubtask,
  onRemovePendingSubtask,
  onEditPendingSubtask,
  isSubtask = false,
}: TaskModalContentProps) {
  // Initialize form data once on mount - use key prop from parent to remount when task changes
  const [formData, setFormData] = useState<TaskFormData>(() =>
    getInitialFormData(task, defaultValues)
  );
  const [activeTab, setActiveTab] = useState('basic');

  const updateField = useCallback(<K extends keyof TaskFormData>(
    field: K,
    value: TaskFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave(formData, pendingSubtasks.length > 0 ? pendingSubtasks : undefined);
  };

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && mode !== 'view') {
        e.preventDefault();
        if (formData.title.trim()) {
          onSave(formData, pendingSubtasks.length > 0 ? pendingSubtasks : undefined);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, mode, onSave, pendingSubtasks]);

  // View Mode
  if (mode === 'view' && task) {
    return (
      <div className="space-y-6">
        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {task.due_date && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {new Date(task.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {task.due_time && ` at ${task.due_time}`}
            </span>
          )}
          <PriorityBadge priority={task.priority as Priority} />
          {task.is_important && (
            <span className="flex items-center gap-1 text-amber-400">
              <Star className="w-4 h-4 fill-current" />
              Important
            </span>
          )}
          {task.is_my_day && (
            <span className="flex items-center gap-1 text-amber-400">
              <Sun className="w-4 h-4 fill-current" />
              My Day
            </span>
          )}
        </div>

        {/* Description */}
        {task.description ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={task.description} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm italic">No description</p>
        )}

        {/* Additional info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
          {task.list_id && (
            <span>List: {lists.find((l) => l.id === task.list_id)?.name || 'Unknown'}</span>
          )}
          {task.project_id && (
            <span>Project: {projects.find((p) => p.id === task.project_id)?.name || 'Unknown'}</span>
          )}
          {task.subtask_total > 0 && (
            <span>Subtasks: {task.subtask_completed}/{task.subtask_total}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          {task.status !== 'completed' && onComplete && (
            <Button variant="outline" onClick={onComplete}>
              <Check className="w-4 h-4 mr-2" />
              Mark Complete
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={() => onModeChange('edit')}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
    );
  }

  // Create/Edit Mode
  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
          <TabsTrigger value="schedule" className="flex-1">Schedule</TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <TaskBasicTab
            title={formData.title}
            setTitle={(v) => updateField('title', v)}
            description={formData.description}
            setDescription={(v) => updateField('description', v)}
            priority={formData.priority}
            setPriority={(v) => updateField('priority', v)}
            isImportant={formData.isImportant}
            setIsImportant={(v) => updateField('isImportant', v)}
            isMyDay={formData.isMyDay}
            setIsMyDay={(v) => updateField('isMyDay', v)}
            disabled={isSaving}
          />
        </TabsContent>

        <TabsContent value="schedule">
          <TaskScheduleTab
            dueDate={formData.dueDate}
            setDueDate={(v) => updateField('dueDate', v)}
            dueTime={formData.dueTime}
            setDueTime={(v) => updateField('dueTime', v)}
            reminder={formData.reminder}
            setReminder={(v) => updateField('reminder', v)}
            disabled={isSaving}
          />
        </TabsContent>

        <TabsContent value="advanced">
          <TaskAdvancedTab
            listId={formData.listId}
            setListId={(v) => updateField('listId', v)}
            projectId={formData.projectId}
            setProjectId={(v) => updateField('projectId', v)}
            parentId={formData.parentId}
            setParentId={(v) => updateField('parentId', v)}
            recurrenceRule={formData.recurrenceRule}
            setRecurrenceRule={(v) => updateField('recurrenceRule', v)}
            lists={lists}
            projects={projects}
            parentTasks={parentTasks.filter((t) => t.id !== task?.id)}
            disabled={isSaving}
            // Subtask props - only show section when not creating a subtask itself
            showSubtaskSection={!isSubtask}
            existingSubtasks={task?.subtasks || []}
            pendingSubtasks={pendingSubtasks}
            onAddSubtask={onAddSubtask}
            onRemovePendingSubtask={onRemovePendingSubtask}
            onEditPendingSubtask={onEditPendingSubtask}
          />
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Ctrl+S</kbd> to save
        </p>
        <div className="flex items-center gap-2">
          {mode === 'edit' && (
            <Button type="button" variant="ghost" onClick={() => onModeChange('view')}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!formData.title.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              mode === 'create' ? 'Create Task' : 'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
