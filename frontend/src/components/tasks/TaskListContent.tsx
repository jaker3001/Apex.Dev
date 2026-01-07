import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import {
  Sun,
  Star,
  Calendar,
  Inbox,
  Check,
  EyeOff,
  Eye,
  ArrowUpDown,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskItem } from './TaskItem';
import { QuickAddTask } from './QuickAddTask';
import { useTasksStore, type SmartListType } from '@/stores/tasksStore';
import type { Task } from '@/hooks/useTasks';
import { isToday, isTomorrow, parseISO, isBefore, startOfDay } from 'date-fns';

interface TaskListContentProps {
  tasks: Task[];
  listName: string;
  listIcon?: SmartListType | 'list';
  onSelectTask: (taskId: number) => void;
  onToggleComplete: (taskId: number) => void;
  onToggleImportant: (taskId: number) => void;
  onCreateTask: (data: {
    title: string;
    is_my_day?: boolean;
    is_important?: boolean;
    due_date?: string;
    list_id?: number;
  }) => void;
  onReorderTasks?: (updates: { id: number; sort_order: number }[]) => void;
  isLoading?: boolean;
  selectedTaskId?: number | null;
  listId?: number;
}

const iconMap: Record<SmartListType | 'list', React.ElementType> = {
  my_day: Sun,
  important: Star,
  planned: Calendar,
  all: Inbox,
  list: Inbox,
};

const colorMap: Record<SmartListType | 'list', string> = {
  my_day: 'text-amber-500',
  important: 'text-rose-500',
  planned: 'text-blue-500',
  all: 'text-purple-500',
  list: 'text-muted-foreground',
};

// Group tasks by date for Planned view
function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    upcoming: [],
    someday: [],
  };

  const today = startOfDay(new Date());

  tasks.forEach((task) => {
    if (!task.due_date) {
      groups.someday.push(task);
      return;
    }

    const dueDate = startOfDay(parseISO(task.due_date));

    if (isBefore(dueDate, today)) {
      groups.overdue.push(task);
    } else if (isToday(dueDate)) {
      groups.today.push(task);
    } else if (isTomorrow(dueDate)) {
      groups.tomorrow.push(task);
    } else {
      groups.upcoming.push(task);
    }
  });

  return groups;
}

export function TaskListContent({
  tasks,
  listName,
  listIcon = 'list',
  onSelectTask,
  onToggleComplete,
  onToggleImportant,
  onCreateTask,
  onReorderTasks,
  isLoading = false,
  selectedTaskId,
  listId,
}: TaskListContentProps) {
  const { showCompleted, toggleShowCompleted, sortBy, selectedView } = useTasksStore();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const Icon = iconMap[listIcon];
  const iconColor = colorMap[listIcon];

  // Filter and sort tasks
  const { activeTasks, completedTasks } = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'completed');
    const completed = tasks.filter((t) => t.status === 'completed');

    // Sort active tasks
    const sortedActive = [...active].sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'importance':
          return (b.is_important ? 1 : 0) - (a.is_important ? 1 : 0);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'created_at':
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        default:
          return (a.sort_order || 0) - (b.sort_order || 0);
      }
    });

    return { activeTasks: sortedActive, completedTasks: completed };
  }, [tasks, sortBy]);

  // For planned view, group by date
  const groupedTasks =
    selectedView.type === 'smart' && selectedView.list === 'planned'
      ? groupTasksByDate(activeTasks)
      : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !onReorderTasks) return;

    const oldIndex = activeTasks.findIndex((t) => t.id === active.id);
    const newIndex = activeTasks.findIndex((t) => t.id === over.id);

    const reordered = arrayMove(activeTasks, oldIndex, newIndex);
    const updates = reordered.map((task, index) => ({
      id: task.id,
      sort_order: index,
    }));

    onReorderTasks(updates);
  };

  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId)
    : null;

  const renderTaskList = (taskList: Task[], draggable = true) => (
    <AnimatePresence mode="popLayout">
      {taskList.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isSelected={selectedTaskId === task.id}
          isDraggable={draggable && sortBy === 'manual'}
          onSelect={() => onSelectTask(task.id)}
          onToggleComplete={() => onToggleComplete(task.id)}
          onToggleImportant={() => onToggleImportant(task.id)}
        />
      ))}
    </AnimatePresence>
  );

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Icon className={cn('w-6 h-6', iconColor)} />
          <h1 className="text-2xl font-bold">{listName}</h1>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>
            {activeTasks.length} {activeTasks.length === 1 ? 'task' : 'tasks'}
          </span>

          {/* Show completed toggle */}
          <button
            onClick={toggleShowCompleted}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            {showCompleted ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span>{showCompleted ? 'Hide' : 'Show'} completed</span>
          </button>

          {/* Sort menu */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Sort</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[150px]"
                  >
                    {[
                      { id: 'manual', label: 'Manual' },
                      { id: 'due_date', label: 'Due date' },
                      { id: 'importance', label: 'Importance' },
                      { id: 'alphabetical', label: 'Alphabetical' },
                      { id: 'created_at', label: 'Created date' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          useTasksStore.getState().setSortBy(option.id as any);
                          setShowSortMenu(false);
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2',
                          sortBy === option.id && 'text-primary'
                        )}
                      >
                        {sortBy === option.id && <Check className="w-4 h-4" />}
                        <span className={cn(sortBy !== option.id && 'ml-6')}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div className="px-6 py-4 shrink-0">
        <QuickAddTask
          onAdd={onCreateTask}
          isLoading={isLoading}
          listId={listId}
          placeholder={`Add a task to ${listName}`}
        />
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No tasks</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add a task to get started
            </p>
          </div>
        ) : groupedTasks ? (
          /* Planned view with date groups */
          <div className="space-y-6">
            {groupedTasks.overdue.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-2">
                  Overdue
                  <span className="text-xs bg-red-500/10 px-1.5 py-0.5 rounded">
                    {groupedTasks.overdue.length}
                  </span>
                </h3>
                <div className="space-y-1">{renderTaskList(groupedTasks.overdue, false)}</div>
              </div>
            )}
            {groupedTasks.today.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-500 mb-2">Today</h3>
                <div className="space-y-1">{renderTaskList(groupedTasks.today, false)}</div>
              </div>
            )}
            {groupedTasks.tomorrow.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-blue-500 mb-2">Tomorrow</h3>
                <div className="space-y-1">{renderTaskList(groupedTasks.tomorrow, false)}</div>
              </div>
            )}
            {groupedTasks.upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h3>
                <div className="space-y-1">{renderTaskList(groupedTasks.upcoming, false)}</div>
              </div>
            )}
          </div>
        ) : (
          /* Standard view with drag and drop */
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">{renderTaskList(activeTasks)}</div>
            </SortableContext>

            <DragOverlay>
              {activeTask && (
                <div className="bg-card shadow-lg rounded-lg opacity-90">
                  <TaskItem
                    task={activeTask}
                    isSelected={false}
                    isDraggable={false}
                    onSelect={() => {}}
                    onToggleComplete={() => {}}
                    onToggleImportant={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Completed tasks */}
        {showCompleted && completedTasks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Completed
              <span className="text-xs">{completedTasks.length}</span>
            </h3>
            <div className="space-y-1 opacity-60">
              {renderTaskList(completedTasks, false)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
