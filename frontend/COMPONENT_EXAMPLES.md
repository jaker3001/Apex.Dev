# Component Examples

This document provides complete, ready-to-use component examples demonstrating best practices with the new Supabase + React Query architecture.

---

## Table of Contents

1. [Task List Component](#task-list-component)
2. [Task Quick Add](#task-quick-add)
3. [Project Card](#project-card)
4. [Note Editor](#note-editor)
5. [Filter Sidebar](#filter-sidebar)
6. [Modal Component](#modal-component)
7. [Loading States](#loading-states)

---

## Task List Component

**File:** `src/features/tasks/components/TaskList.tsx`

```tsx
import React from 'react';
import { useTasksQuery, useUpdateTask, useDeleteTask } from '@/hooks/queries/useTasksQuery';
import { useFiltersStore } from '@/stores/filtersStore';
import { useToast } from '@/stores/uiStore';
import { Checkbox, Trash2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function TaskList() {
  const { taskFilters } = useFiltersStore();
  const { data: tasks, isLoading, error } = useTasksQuery(taskFilters);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { toast } = useToast();

  const handleToggleComplete = (taskId: number, currentStatus: string) => {
    updateTask.mutate({
      id: taskId,
      updates: {
        status: currentStatus === 'completed' ? 'open' : 'completed',
        completed_at: currentStatus === 'completed' ? null : new Date().toISOString(),
      },
    });
  };

  const handleToggleImportant = (taskId: number, isImportant: boolean) => {
    updateTask.mutate({
      id: taskId,
      updates: { is_important: !isImportant },
    });
  };

  const handleDelete = (taskId: number) => {
    if (confirm('Delete this task?')) {
      deleteTask.mutate(taskId, {
        onSuccess: () => toast.success('Task deleted'),
        onError: () => toast.error('Failed to delete task'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
        <p className="text-red-400">Failed to load tasks</p>
        <p className="text-sm text-gray-400 mt-1">{error.message}</p>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No tasks found</p>
        <p className="text-sm text-gray-500 mt-1">Create one to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="group bg-gray-800/50 hover:bg-gray-800 rounded-lg p-4 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={() => handleToggleComplete(task.id, task.status)}
              className="mt-0.5"
              aria-label={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
            >
              <Checkbox
                className={`w-5 h-5 ${
                  task.status === 'completed'
                    ? 'text-green-400 fill-green-400'
                    : 'text-gray-400'
                }`}
              />
            </button>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`font-medium ${
                    task.status === 'completed'
                      ? 'line-through text-gray-500'
                      : 'text-gray-200'
                  }`}
                >
                  {task.title}
                </h3>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleImportant(task.id, task.is_important)}
                    aria-label="Toggle important"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        task.is_important
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-400 hover:text-yellow-400'
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-gray-400 hover:text-red-400"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <p className="text-sm text-gray-400 mt-1">{task.description}</p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {task.due_date && (
                  <span>Due {formatDistanceToNow(new Date(task.due_date))}</span>
                )}
                {task.subtask_total > 0 && (
                  <span>
                    {task.subtask_completed}/{task.subtask_total} subtasks
                  </span>
                )}
                {task.is_my_day && (
                  <span className="text-blue-400">My Day</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Task Quick Add

**File:** `src/features/tasks/components/TaskQuickAdd.tsx`

```tsx
import React, { useState } from 'react';
import { useCreateTask } from '@/hooks/queries/useTasksQuery';
import { useToast } from '@/stores/uiStore';
import { Plus } from 'lucide-react';

interface TaskQuickAddProps {
  listId?: number;
  projectId?: number;
  defaultMyDay?: boolean;
}

export function TaskQuickAdd({ listId, projectId, defaultMyDay = false }: TaskQuickAddProps) {
  const [title, setTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const createTask = useCreateTask();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        list_id: listId,
        project_id: projectId,
        is_my_day: defaultMyDay,
        status: 'open',
        priority: 'none',
      });

      setTitle('');
      setIsExpanded(false);
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setTitle('');
      setIsExpanded(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <div className="flex items-center gap-2">
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add a task</span>
          </button>
        ) : (
          <>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!title.trim()) setIsExpanded(false);
              }}
              placeholder="Task title"
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={!title.trim() || createTask.isPending}
              className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-white font-medium transition-colors"
            >
              {createTask.isPending ? 'Adding...' : 'Add'}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
```

---

## Project Card

**File:** `src/features/projects/components/ProjectCard.tsx`

```tsx
import React from 'react';
import { useUpdateProject } from '@/hooks/queries/useProjectsQuery';
import { Star, MoreVertical } from 'lucide-react';
import type { ChatProject } from '@/lib/supabase/types';

interface ProjectCardProps {
  project: ChatProject;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const updateProject = useUpdateProject();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateProject.mutate({
      id: project.id,
      updates: { is_favorite: !project.is_favorite },
    });
  };

  const categoryColors = {
    project: 'bg-blue-500',
    area: 'bg-green-500',
    resource: 'bg-purple-500',
    archive: 'bg-gray-500',
  };

  const statusLabels = {
    active: 'Active',
    on_hold: 'On Hold',
    completed: 'Completed',
    archived: 'Archived',
  };

  return (
    <div
      onClick={onClick}
      className="group bg-gray-800/50 hover:bg-gray-800 rounded-lg p-4 cursor-pointer transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${categoryColors[project.category]}`} />
          <h3 className="font-medium text-gray-200">{project.name}</h3>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleFavorite}
            className="p-1 hover:bg-gray-700 rounded"
            aria-label="Toggle favorite"
          >
            <Star
              className={`w-4 h-4 ${
                project.is_favorite
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-400'
              }`}
            />
          </button>
          <button className="p-1 hover:bg-gray-700 rounded">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{statusLabels[project.status]}</span>
        <span className="text-gray-500">
          {new Date(project.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
```

---

## Filter Sidebar

**File:** `src/features/tasks/components/TaskFilters.tsx`

```tsx
import React from 'react';
import { useFiltersStore } from '@/stores/filtersStore';
import { useTaskListsQuery } from '@/hooks/queries/useTasksQuery';
import { Star, Calendar, ListTodo, Inbox } from 'lucide-react';

export function TaskFilters() {
  const { taskFilters, setTaskView, setTaskListFilter } = useFiltersStore();
  const { data: lists } = useTaskListsQuery();

  const views = [
    { id: 'my_day', label: 'My Day', icon: Star },
    { id: 'important', label: 'Important', icon: Star },
    { id: 'planned', label: 'Planned', icon: Calendar },
    { id: 'all', label: 'All Tasks', icon: Inbox },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Smart Views */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          Views
        </h3>
        <div className="space-y-1">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = taskFilters.view === view.id;

            return (
              <button
                key={view.id}
                onClick={() => setTaskView(view.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{view.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lists */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          Lists
        </h3>
        <div className="space-y-1">
          <button
            onClick={() => setTaskListFilter(undefined)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              !taskFilters.list_id
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span className="text-sm">All Lists</span>
          </button>

          {lists?.map((list) => {
            const isActive = taskFilters.list_id === list.id;

            return (
              <button
                key={list.id}
                onClick={() => setTaskListFilter(list.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  {list.icon && <span>{list.icon}</span>}
                  <span className="text-sm">{list.name}</span>
                </div>
                {list.task_count > 0 && (
                  <span className="text-xs">{list.task_count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## Loading States

**File:** `src/components/shared/LoadingStates.tsx`

```tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={`${sizes[size]} animate-spin text-blue-500`} />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
      <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse" />
      <div className="h-3 bg-gray-700 rounded w-1/2 animate-pulse" />
      <div className="flex gap-2">
        <div className="h-2 bg-gray-700 rounded w-16 animate-pulse" />
        <div className="h-2 bg-gray-700 rounded w-16 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
```

---

## Usage in Pages

**File:** `src/pages/TasksPage.tsx`

```tsx
import React from 'react';
import { TaskList } from '@/features/tasks/components/TaskList';
import { TaskQuickAdd } from '@/features/tasks/components/TaskQuickAdd';
import { TaskFilters } from '@/features/tasks/components/TaskFilters';
import { useUIStore } from '@/stores/uiStore';

export function TasksPage() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-64 border-r border-gray-800 p-4">
          <TaskFilters />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-200 mb-6">Tasks</h1>
          <TaskQuickAdd />
          <TaskList />
        </div>
      </div>
    </div>
  );
}
```

---

These examples demonstrate:

- ✅ Proper use of hooks
- ✅ Loading states
- ✅ Error handling
- ✅ Optimistic updates
- ✅ Accessibility
- ✅ TypeScript types
- ✅ Responsive design
- ✅ User feedback (toasts)

Copy and adapt these patterns for your components!
