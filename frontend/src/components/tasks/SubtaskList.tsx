import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskCheckbox } from './TaskCheckbox';
import type { Task } from '@/hooks/useTasks';

interface SubtaskListProps {
  subtasks: Task[];
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subtaskId: number) => void;
  onDeleteSubtask: (subtaskId: number) => void;
  onUpdateSubtask: (subtaskId: number, title: string) => void;
  isLoading?: boolean;
}

export function SubtaskList({
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtask,
  isLoading = false,
}: SubtaskListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const completedCount = subtasks.filter((s) => s.status === 'completed').length;
  const totalCount = subtasks.length;

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(newSubtaskTitle.trim());
    setNewSubtaskTitle('');
  };

  const handleStartEdit = (subtask: Task) => {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      onUpdateSubtask(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span>Steps</span>
          <span className="text-muted-foreground/60">
            {completedCount} of {totalCount}
          </span>
          {/* Progress bar */}
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Subtask items */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {subtasks.map((subtask) => (
            <motion.div
              key={subtask.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="group flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/50"
            >
              {/* Drag handle */}
              <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />

              {/* Checkbox */}
              <TaskCheckbox
                size="sm"
                checked={subtask.status === 'completed'}
                onToggle={(e) => {
                  e.stopPropagation();
                  onToggleSubtask(subtask.id);
                }}
              />

              {/* Title */}
              {editingId === subtask.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditingTitle('');
                    }
                  }}
                  autoFocus
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
              ) : (
                <span
                  onClick={() => handleStartEdit(subtask)}
                  className={cn(
                    'flex-1 text-sm cursor-text',
                    subtask.status === 'completed' &&
                      'line-through text-muted-foreground'
                  )}
                >
                  {subtask.title}
                </span>
              )}

              {/* Delete button */}
              <button
                onClick={() => onDeleteSubtask(subtask.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add subtask input */}
      <div className="flex items-center gap-2 px-1">
        <Plus className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddSubtask();
          }}
          placeholder="Add a step"
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm placeholder-muted-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
