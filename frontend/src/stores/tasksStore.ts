import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SmartListType = 'my_day' | 'important' | 'planned' | 'all';

export type TaskView =
  | { type: 'smart'; list: SmartListType }
  | { type: 'list'; listId: number }
  | { type: 'search'; query: string };

export type SortBy = 'manual' | 'due_date' | 'created_at' | 'importance' | 'alphabetical';

interface TasksState {
  // Current view
  selectedView: TaskView;
  setSelectedView: (view: TaskView) => void;

  // Selected task for detail panel
  selectedTaskId: number | null;
  setSelectedTaskId: (id: number | null) => void;

  // Detail panel visibility
  detailPanelOpen: boolean;
  setDetailPanelOpen: (open: boolean) => void;

  // UI preferences
  showCompleted: boolean;
  toggleShowCompleted: () => void;

  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;

  // Collapsed lists in sidebar
  collapsedGroups: Set<string>;
  toggleGroupCollapsed: (groupName: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Editing state
  editingTaskId: number | null;
  setEditingTaskId: (id: number | null) => void;

  // Quick add focus
  quickAddFocused: boolean;
  setQuickAddFocused: (focused: boolean) => void;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set) => ({
      // View
      selectedView: { type: 'smart', list: 'my_day' },
      setSelectedView: (view) => set({ selectedView: view, selectedTaskId: null }),

      // Selection
      selectedTaskId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id, detailPanelOpen: id !== null }),

      // Detail panel
      detailPanelOpen: false,
      setDetailPanelOpen: (open) => set({ detailPanelOpen: open, selectedTaskId: open ? undefined : null }),

      // Preferences
      showCompleted: false,
      toggleShowCompleted: () => set((s) => ({ showCompleted: !s.showCompleted })),

      sortBy: 'manual',
      setSortBy: (sortBy) => set({ sortBy }),

      // Collapsed groups
      collapsedGroups: new Set(),
      toggleGroupCollapsed: (groupName) =>
        set((s) => {
          const next = new Set(s.collapsedGroups);
          if (next.has(groupName)) next.delete(groupName);
          else next.add(groupName);
          return { collapsedGroups: next };
        }),

      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Editing
      editingTaskId: null,
      setEditingTaskId: (id) => set({ editingTaskId: id }),

      // Quick add
      quickAddFocused: false,
      setQuickAddFocused: (focused) => set({ quickAddFocused: focused }),
    }),
    {
      name: 'apex-tasks-store',
      partialize: (state) => ({
        showCompleted: state.showCompleted,
        sortBy: state.sortBy,
        collapsedGroups: Array.from(state.collapsedGroups),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<TasksState> & { collapsedGroups?: string[] };
        return {
          ...current,
          ...persistedState,
          collapsedGroups: new Set(persistedState.collapsedGroups || []),
        };
      },
    }
  )
);
