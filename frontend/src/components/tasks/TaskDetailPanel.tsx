import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Sun,
  Star,
  Trash2,
  MoreHorizontal,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { TaskCheckbox } from './TaskCheckbox';
import { SubtaskList } from './SubtaskList';
import { DueDatePicker } from './DueDatePicker';
import { ReminderPicker } from './ReminderPicker';
import { RepeatPicker } from './RepeatPicker';
import { formatDistanceToNow } from 'date-fns';
import type { Task, TaskUpdateData } from '@/hooks/useTasks';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (data: TaskUpdateData) => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subtaskId: number) => void;
  onDeleteSubtask: (subtaskId: number) => void;
  onUpdateSubtask: (subtaskId: number, title: string) => void;
}

export function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
  onDelete,
  onToggleComplete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtask,
}: TaskDetailPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(task.description || '');

  const isCompleted = task.status === 'completed';

  // Sync with prop changes
  useEffect(() => {
    setTitleDraft(task.title);
    setNotesDraft(task.description || '');
  }, [task.title, task.description]);

  const handleTitleSave = () => {
    if (titleDraft.trim() && titleDraft !== task.title) {
      onUpdate({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleNotesSave = () => {
    if (notesDraft !== task.description) {
      onUpdate({ description: notesDraft });
    }
    setEditingNotes(false);
  };

  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 50, opacity: 0 }}
      className="h-full border-l border-border bg-card flex flex-col w-[360px]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
        <TaskCheckbox
          checked={isCompleted}
          priority={task.priority as 'none' | 'low' | 'medium' | 'high'}
          onToggle={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
        />

        <div className="flex-1" />

        {/* Action buttons */}
        <button
          onClick={() => onUpdate({ is_my_day: !task.is_my_day })}
          className={cn(
            'p-1.5 rounded hover:bg-muted transition-colors',
            task.is_my_day ? 'text-amber-400' : 'text-muted-foreground'
          )}
          title={task.is_my_day ? 'Remove from My Day' : 'Add to My Day'}
        >
          <Sun className="w-4 h-4" />
        </button>

        <button
          onClick={() => onUpdate({ is_important: !task.is_important })}
          className={cn(
            'p-1.5 rounded hover:bg-muted transition-colors',
            task.is_important ? 'text-amber-400' : 'text-muted-foreground'
          )}
          title={task.is_important ? 'Remove importance' : 'Mark as important'}
        >
          <Star className={cn('w-4 h-4', task.is_important && 'fill-current')} />
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="p-4 border-b border-border">
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitleDraft(task.title);
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className={cn(
                'w-full text-lg font-semibold bg-transparent focus:outline-none',
                isCompleted && 'line-through text-muted-foreground'
              )}
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className={cn(
                'text-lg font-semibold cursor-text hover:bg-muted/50 rounded px-1 -mx-1 py-0.5',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h2>
          )}
        </div>

        {/* Subtasks/Steps */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <ListTodo className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Steps</span>
          </div>
          <SubtaskList
            subtasks={task.subtasks || []}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onUpdateSubtask={onUpdateSubtask}
          />
        </div>

        {/* My Day toggle */}
        <button
          onClick={() => onUpdate({ is_my_day: !task.is_my_day })}
          className={cn(
            'w-full flex items-center gap-3 p-4 hover:bg-muted/50 border-b border-border transition-colors',
            task.is_my_day && 'bg-amber-400/5'
          )}
        >
          <Sun
            className={cn(
              'w-5 h-5',
              task.is_my_day ? 'text-amber-400' : 'text-muted-foreground'
            )}
          />
          <span className="text-sm">
            {task.is_my_day ? 'Added to My Day' : 'Add to My Day'}
          </span>
        </button>

        {/* Due Date */}
        <div className="border-b border-border">
          <DueDatePicker
            value={task.due_date}
            onChange={(date) => onUpdate({ due_date: date || undefined })}
          />
        </div>

        {/* Reminder */}
        <div className="border-b border-border">
          <ReminderPicker
            value={null} // TODO: Add reminder field to task
            dueDate={task.due_date}
            onChange={() => {
              // TODO: Handle reminder update
            }}
          />
        </div>

        {/* Repeat */}
        <div className="border-b border-border">
          <RepeatPicker
            value={
              task.recurrence_rule
                ? { interval: 1, unit: 'weeks' } // TODO: Parse recurrence_rule
                : null
            }
            onChange={() => {
              // TODO: Handle repeat update
            }}
          />
        </div>

        {/* Notes (Markdown) */}
        <div className="p-4">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Notes
          </label>
          {editingNotes ? (
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={handleNotesSave}
              autoFocus
              placeholder="Add notes (supports **markdown**)"
              className="w-full min-h-[200px] p-3 bg-muted/50 rounded-lg border border-border resize-none focus:outline-none focus:border-primary text-sm"
            />
          ) : (
            <div
              onClick={() => {
                setNotesDraft(task.description || '');
                setEditingNotes(true);
              }}
              className="min-h-[100px] p-3 bg-muted/30 rounded-lg cursor-text hover:bg-muted/50 transition-colors"
            >
              {task.description ? (
                <MarkdownRenderer
                  content={task.description}
                  className="text-sm"
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  Add notes...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border shrink-0 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Created{' '}
          {task.created_at
            ? formatDistanceToNow(new Date(task.created_at), { addSuffix: true })
            : 'recently'}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
