import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Star,
  Calendar,
  Inbox,
  List,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasksStore, type SmartListType, type TaskView } from '@/stores/tasksStore';
import type { TaskList } from '@/hooks/useTasks';

interface SmartListConfig {
  id: SmartListType;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const smartLists: SmartListConfig[] = [
  {
    id: 'my_day',
    name: 'My Day',
    icon: Sun,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'important',
    name: 'Important',
    icon: Star,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    id: 'planned',
    name: 'Planned',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'all',
    name: 'All Tasks',
    icon: Inbox,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

interface TaskListSidebarProps {
  lists: TaskList[];
  taskCounts: Record<string, number>; // list_id or smart_list -> count
  onCreateList: () => void;
  onEditList: (list: TaskList) => void;
  onDeleteList: (list: TaskList) => void;
  className?: string;
}

export function TaskListSidebar({
  lists,
  taskCounts,
  onCreateList,
  onEditList,
  onDeleteList,
  className,
}: TaskListSidebarProps) {
  const { selectedView, setSelectedView, collapsedGroups, toggleGroupCollapsed } =
    useTasksStore();
  const [contextMenuList, setContextMenuList] = useState<TaskList | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const isViewSelected = (view: TaskView) => {
    if (view.type === 'smart' && selectedView.type === 'smart') {
      return view.list === selectedView.list;
    }
    if (view.type === 'list' && selectedView.type === 'list') {
      return view.listId === selectedView.listId;
    }
    return false;
  };

  const handleContextMenu = (e: React.MouseEvent, list: TaskList) => {
    e.preventDefault();
    setContextMenuList(list);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenuList(null);
  };

  // Group lists by group_name (if any)
  const groupedLists = lists.reduce(
    (acc, list) => {
      if (list.is_system) return acc; // Skip system lists
      const group = 'My Lists'; // Could use list.group_name here
      if (!acc[group]) acc[group] = [];
      acc[group].push(list);
      return acc;
    },
    {} as Record<string, TaskList[]>
  );

  return (
    <div
      className={cn('flex flex-col bg-muted/30 border-r border-border', className)}
      onClick={closeContextMenu}
    >
      {/* Smart Lists */}
      <div className="p-3 space-y-1">
        {smartLists.map((smartList) => {
          const view: TaskView = { type: 'smart', list: smartList.id };
          const isSelected = isViewSelected(view);
          const count = taskCounts[smartList.id] || 0;

          return (
            <button
              key={smartList.id}
              onClick={() => setSelectedView(view)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isSelected
                  ? cn(smartList.bgColor, smartList.color)
                  : 'hover:bg-muted/50 text-foreground'
              )}
            >
              <smartList.icon
                className={cn(
                  'w-5 h-5',
                  isSelected ? smartList.color : 'text-muted-foreground'
                )}
              />
              <span className="flex-1 text-left text-sm font-medium">
                {smartList.name}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    isSelected ? smartList.color : 'text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-border mx-3" />

      {/* Custom Lists */}
      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(groupedLists).map(([groupName, groupLists]) => {
          const isCollapsed = collapsedGroups.has(groupName);

          return (
            <div key={groupName} className="mb-2">
              {/* Group header */}
              <button
                onClick={() => toggleGroupCollapsed(groupName)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                <span className="uppercase tracking-wide">{groupName}</span>
              </button>

              {/* Group lists */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {groupLists.map((list) => {
                      const view: TaskView = { type: 'list', listId: list.id };
                      const isSelected = isViewSelected(view);
                      const count = taskCounts[`list_${list.id}`] || list.task_count || 0;

                      return (
                        <button
                          key={list.id}
                          onClick={() => setSelectedView(view)}
                          onContextMenu={(e) => handleContextMenu(e, list)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-muted/50 text-foreground'
                          )}
                        >
                          {list.icon === 'home' ? (
                            <Home
                              className="w-4 h-4"
                              style={{ color: list.color || undefined }}
                            />
                          ) : (
                            <List
                              className="w-4 h-4"
                              style={{ color: list.color || undefined }}
                            />
                          )}
                          <span className="flex-1 text-left text-sm truncate">
                            {list.name}
                          </span>
                          {count > 0 && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {count}
                            </span>
                          )}
                          <MoreHorizontal
                            className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContextMenu(e, list);
                            }}
                          />
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Add list button */}
      <div className="p-3 border-t border-border">
        <button
          onClick={onCreateList}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New list</span>
        </button>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenuList && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={closeContextMenu}
            />
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                left: contextMenuPos.x,
                top: contextMenuPos.y,
              }}
              className="z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px]"
            >
              <button
                onClick={() => {
                  onEditList(contextMenuList);
                  closeContextMenu();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <Pencil className="w-4 h-4" />
                <span>Rename list</span>
              </button>
              {!contextMenuList.is_system && (
                <button
                  onClick={() => {
                    onDeleteList(contextMenuList);
                    closeContextMenu();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete list</span>
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
