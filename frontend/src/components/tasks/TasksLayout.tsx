import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TaskListSidebar } from './TaskListSidebar';
import { TaskListContent } from './TaskListContent';
import { TaskDetailPanel } from './TaskDetailPanel';
import { CreateListModal } from './CreateListModal';
import { useTasksStore, type SmartListType } from '@/stores/tasksStore';
import {
  useTaskLists,
  useTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useCreateTaskList,
  useUpdateTaskList,
  useDeleteTaskList,
  type TaskFilters,
  type TaskList,
  type TaskUpdateData,
} from '@/hooks/useTasks';
import { Loader2 } from 'lucide-react';

const smartListNames: Record<SmartListType, string> = {
  my_day: 'My Day',
  important: 'Important',
  planned: 'Planned',
  all: 'All Tasks',
};

export function TasksLayout() {
  const { selectedView, selectedTaskId, setSelectedTaskId, detailPanelOpen } =
    useTasksStore();

  const [createListOpen, setCreateListOpen] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);

  // Build filters based on view
  const filters: TaskFilters = {};
  if (selectedView.type === 'smart') {
    filters.view = selectedView.list === 'all' ? undefined : selectedView.list;
  } else if (selectedView.type === 'list') {
    filters.list_id = selectedView.listId;
  }

  // Queries
  const { data: listsData, isLoading: listsLoading } = useTaskLists();
  const { data: tasksData } = useTasks(filters);
  const { data: selectedTask, isLoading: taskLoading } = useTask(
    selectedTaskId || 0
  );

  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const createTaskList = useCreateTaskList();
  const updateTaskList = useUpdateTaskList();
  const deleteTaskList = useDeleteTaskList();

  const lists = listsData?.lists || [];
  const tasks = tasksData?.tasks || [];

  // Calculate task counts for sidebar
  const taskCounts: Record<string, number> = {};

  // Smart list counts (approximate - would be better from API)
  const allTasks = tasks; // This is filtered, we'd need a separate query for counts
  taskCounts['my_day'] = allTasks.filter(
    (t) => t.is_my_day && t.status !== 'completed'
  ).length;
  taskCounts['important'] = allTasks.filter(
    (t) => t.is_important && t.status !== 'completed'
  ).length;
  taskCounts['planned'] = allTasks.filter(
    (t) => t.due_date && t.status !== 'completed'
  ).length;
  taskCounts['all'] = allTasks.filter((t) => t.status !== 'completed').length;

  // List counts from list data
  lists.forEach((list) => {
    taskCounts[`list_${list.id}`] = list.task_count || 0;
  });

  // Get current list name and icon
  const getListInfo = (): { name: string; icon: SmartListType | 'list'; listId?: number } => {
    if (selectedView.type === 'smart') {
      return {
        name: smartListNames[selectedView.list],
        icon: selectedView.list,
      };
    }
    if (selectedView.type === 'list') {
      const list = lists.find((l) => l.id === selectedView.listId);
      return {
        name: list?.name || 'Tasks',
        icon: 'list',
        listId: selectedView.listId,
      };
    }
    return { name: 'Tasks', icon: 'list' };
  };

  const { name: listName, icon: listIcon, listId } = getListInfo();

  // Handlers
  const handleCreateTask = useCallback(
    (data: {
      title: string;
      is_my_day?: boolean;
      is_important?: boolean;
      due_date?: string;
      list_id?: number;
    }) => {
      createTask.mutate(data);
    },
    [createTask]
  );

  const handleToggleComplete = useCallback(
    (taskId: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task?.status === 'completed') {
        updateTask.mutate({ id: taskId, data: { status: 'open' } });
      } else {
        completeTask.mutate(taskId);
      }
    },
    [tasks, updateTask, completeTask]
  );

  const handleToggleImportant = useCallback(
    (taskId: number) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        updateTask.mutate({
          id: taskId,
          data: { is_important: !task.is_important },
        });
      }
    },
    [tasks, updateTask]
  );

  const handleUpdateTask = useCallback(
    (data: TaskUpdateData) => {
      if (selectedTaskId) {
        updateTask.mutate({ id: selectedTaskId, data });
      }
    },
    [selectedTaskId, updateTask]
  );

  const handleDeleteTask = useCallback(() => {
    if (selectedTaskId) {
      deleteTask.mutate(selectedTaskId);
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, deleteTask, setSelectedTaskId]);

  const handleAddSubtask = useCallback(
    (title: string) => {
      if (selectedTaskId) {
        createTask.mutate({
          title,
          parent_id: selectedTaskId,
        });
      }
    },
    [selectedTaskId, createTask]
  );

  const handleToggleSubtask = useCallback(
    (subtaskId: number) => {
      const subtask = selectedTask?.subtasks?.find((s) => s.id === subtaskId);
      if (subtask) {
        if (subtask.status === 'completed') {
          updateTask.mutate({ id: subtaskId, data: { status: 'open' } });
        } else {
          completeTask.mutate(subtaskId);
        }
      }
    },
    [selectedTask, updateTask, completeTask]
  );

  const handleDeleteSubtask = useCallback(
    (subtaskId: number) => {
      deleteTask.mutate(subtaskId);
    },
    [deleteTask]
  );

  const handleUpdateSubtask = useCallback(
    (subtaskId: number, title: string) => {
      updateTask.mutate({ id: subtaskId, data: { title } });
    },
    [updateTask]
  );

  const handleCreateList = useCallback(
    (data: { name: string; icon?: string; color?: string }) => {
      createTaskList.mutate(data);
      setCreateListOpen(false);
    },
    [createTaskList]
  );

  const handleEditList = useCallback((list: TaskList) => {
    setEditingList(list);
    setCreateListOpen(true);
  }, []);

  const handleUpdateList = useCallback(
    (data: { name: string; icon?: string; color?: string }) => {
      if (editingList) {
        updateTaskList.mutate({ id: editingList.id, data });
        setEditingList(null);
        setCreateListOpen(false);
      }
    },
    [editingList, updateTaskList]
  );

  const handleDeleteList = useCallback(
    (list: TaskList) => {
      if (confirm(`Delete "${list.name}"? Tasks in this list will be moved to the default list.`)) {
        deleteTaskList.mutate(list.id);
      }
    },
    [deleteTaskList]
  );

  if (listsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Sidebar */}
      <TaskListSidebar
        lists={lists}
        taskCounts={taskCounts}
        onCreateList={() => {
          setEditingList(null);
          setCreateListOpen(true);
        }}
        onEditList={handleEditList}
        onDeleteList={handleDeleteList}
        className="w-64 shrink-0"
      />

      {/* Main content */}
      <TaskListContent
        tasks={tasks}
        listName={listName}
        listIcon={listIcon}
        listId={listId}
        onSelectTask={setSelectedTaskId}
        onToggleComplete={handleToggleComplete}
        onToggleImportant={handleToggleImportant}
        onCreateTask={handleCreateTask}
        isLoading={createTask.isPending}
        selectedTaskId={selectedTaskId}
      />

      {/* Detail panel */}
      <AnimatePresence>
        {detailPanelOpen && selectedTask && !taskLoading && (
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onToggleComplete={() => handleToggleComplete(selectedTask.id)}
            onAddSubtask={handleAddSubtask}
            onToggleSubtask={handleToggleSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onUpdateSubtask={handleUpdateSubtask}
          />
        )}
      </AnimatePresence>

      {/* Create/Edit list modal */}
      <CreateListModal
        open={createListOpen}
        onClose={() => {
          setCreateListOpen(false);
          setEditingList(null);
        }}
        onSubmit={editingList ? handleUpdateList : handleCreateList}
        initialData={editingList || undefined}
        isEditing={!!editingList}
      />
    </div>
  );
}
