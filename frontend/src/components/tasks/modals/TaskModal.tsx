import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskModalContent, type TaskModalMode, type PendingSubtask } from './TaskModalContent';
import type { Task, TaskList } from '@/hooks/useTasks';
import type { Priority } from '../form/PrioritySelector';

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

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: TaskModalMode;
  task?: Task;
  lists: TaskList[];
  projects: { id: number; name: string }[];
  allTasks: Task[];
  onSave: (data: TaskFormData, pendingSubtasks?: PendingSubtask[]) => void;
  onDelete?: (id: number) => void;
  onComplete?: (id: number) => void;
  isSaving?: boolean;
  defaultValues?: Partial<TaskFormData>;
}

export function TaskModal({
  isOpen,
  onClose,
  mode: initialMode,
  task,
  lists,
  projects,
  allTasks,
  onSave,
  onDelete,
  onComplete,
  isSaving,
  defaultValues,
}: TaskModalProps) {
  // Use internal mode state for edit/view switching within the modal
  // Initialize from initialMode, but only update when modal context changes
  const [internalMode, setInternalMode] = useState<TaskModalMode>(initialMode);

  // Track the last task id to detect when we switch to a different task
  const [lastTaskId, setLastTaskId] = useState<number | undefined>(task?.id);
  const [lastInitialMode, setLastInitialMode] = useState<TaskModalMode>(initialMode);

  // Pending subtasks state - subtasks being created alongside the parent task
  const [pendingSubtasks, setPendingSubtasks] = useState<PendingSubtask[]>([]);

  // Subtask modal state
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);

  // Derive the effective mode - reset when task or initial mode changes
  const taskId = task?.id;
  let mode = internalMode;
  if (taskId !== lastTaskId || initialMode !== lastInitialMode) {
    mode = initialMode;
  }

  // Sync tracking state after render
  if (taskId !== lastTaskId) {
    setLastTaskId(taskId);
    setInternalMode(initialMode);
    setPendingSubtasks([]); // Reset pending subtasks when switching tasks
  }
  if (initialMode !== lastInitialMode) {
    setLastInitialMode(initialMode);
    setInternalMode(initialMode);
  }

  // Handle escape key - close subtask modal first if open
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (subtaskModalOpen) {
          setSubtaskModalOpen(false);
          setEditingSubtaskId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, subtaskModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleSave = useCallback((data: TaskFormData, subtasks?: PendingSubtask[]) => {
    onSave(data, subtasks || pendingSubtasks.length > 0 ? pendingSubtasks : undefined);
    setPendingSubtasks([]); // Clear pending subtasks after save
  }, [onSave, pendingSubtasks]);

  // Subtask handlers
  const handleAddSubtask = useCallback(() => {
    setEditingSubtaskId(null);
    setSubtaskModalOpen(true);
  }, []);

  const handleEditSubtask = useCallback((tempId: string) => {
    setEditingSubtaskId(tempId);
    setSubtaskModalOpen(true);
  }, []);

  const handleRemoveSubtask = useCallback((tempId: string) => {
    setPendingSubtasks(prev => prev.filter(s => s.tempId !== tempId));
  }, []);

  const handleSaveSubtask = useCallback((data: TaskFormData) => {
    if (editingSubtaskId) {
      // Update existing pending subtask
      setPendingSubtasks(prev =>
        prev.map(s =>
          s.tempId === editingSubtaskId
            ? {
                ...s,
                title: data.title,
                description: data.description || undefined,
                priority: data.priority,
                dueDate: data.dueDate || undefined,
                dueTime: data.dueTime || undefined,
                isImportant: data.isImportant,
                isMyDay: data.isMyDay,
                recurrenceRule: data.recurrenceRule || undefined,
                listId: data.listId,
                projectId: data.projectId,
              }
            : s
        )
      );
    } else {
      // Add new pending subtask
      const newSubtask: PendingSubtask = {
        tempId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
        dueTime: data.dueTime || undefined,
        isImportant: data.isImportant,
        isMyDay: data.isMyDay,
        recurrenceRule: data.recurrenceRule || undefined,
        listId: data.listId,
        projectId: data.projectId,
      };
      setPendingSubtasks(prev => [...prev, newSubtask]);
    }
    setSubtaskModalOpen(false);
    setEditingSubtaskId(null);
  }, [editingSubtaskId]);

  const handleCloseSubtaskModal = useCallback(() => {
    setSubtaskModalOpen(false);
    setEditingSubtaskId(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (task && onDelete) {
      onDelete(task.id);
    }
  }, [task, onDelete]);

  const handleComplete = useCallback(() => {
    if (task && onComplete) {
      onComplete(task.id);
    }
  }, [task, onComplete]);

  const handleModeChange = useCallback((newMode: TaskModalMode) => {
    setInternalMode(newMode);
  }, []);

  if (!isOpen) return null;

  const getTitle = () => {
    if (mode === 'create') return 'Add Task';
    if (mode === 'edit') return 'Edit Task';
    return task?.title || 'Task Details';
  };

  // Filter parent tasks to exclude current task and its subtasks
  const availableParentTasks = allTasks.filter(
    (t) => t.id !== task?.id && t.parent_id !== task?.id && t.status !== 'completed'
  );

  // Use key to force remount of TaskModalContent when task changes
  const contentKey = `${task?.id ?? 'new'}-${initialMode}`;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg truncate pr-4">{getTitle()}</h2>
          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setInternalMode('edit')}
                title="Edit task"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <TaskModalContent
            key={contentKey}
            mode={mode}
            task={task}
            lists={lists}
            projects={projects}
            parentTasks={availableParentTasks}
            onSave={handleSave}
            onDelete={onDelete ? handleDelete : undefined}
            onComplete={onComplete ? handleComplete : undefined}
            onModeChange={handleModeChange}
            isSaving={isSaving}
            defaultValues={defaultValues}
            pendingSubtasks={pendingSubtasks}
            onAddSubtask={handleAddSubtask}
            onRemovePendingSubtask={handleRemoveSubtask}
            onEditPendingSubtask={handleEditSubtask}
          />
        </div>
      </div>

      {/* Nested Subtask Modal */}
      {subtaskModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          onClick={handleCloseSubtaskModal}
        >
          <div
            className="bg-background rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtask Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseSubtaskModal}
                  title="Back to parent task"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold text-lg">
                  {editingSubtaskId ? 'Edit Subtask' : 'Add Subtask'}
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseSubtaskModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Subtask Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <TaskModalContent
                mode="create"
                lists={lists}
                projects={projects}
                parentTasks={[]}
                onSave={handleSaveSubtask}
                onModeChange={() => {}}
                isSaving={false}
                isSubtask={true}
                defaultValues={
                  editingSubtaskId
                    ? (() => {
                        const subtask = pendingSubtasks.find(s => s.tempId === editingSubtaskId);
                        if (!subtask) return {};
                        return {
                          title: subtask.title,
                          description: subtask.description || '',
                          priority: subtask.priority,
                          dueDate: subtask.dueDate || '',
                          dueTime: subtask.dueTime || '',
                          isImportant: subtask.isImportant,
                          isMyDay: subtask.isMyDay,
                          recurrenceRule: subtask.recurrenceRule || '',
                          listId: subtask.listId,
                          projectId: subtask.projectId,
                        };
                      })()
                    : defaultValues
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export types for external use
export type { TaskFormData, TaskModalMode };
