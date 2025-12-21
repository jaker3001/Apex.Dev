/**
 * Filters State Store (Zustand)
 *
 * Manages filter states across different features:
 * - Tasks filters
 * - Projects filters
 * - Notes filters
 * - Jobs filters
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TaskFilters {
  list_id?: number;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'none' | 'low' | 'medium' | 'high';
  is_my_day?: boolean;
  is_important?: boolean;
  due_date?: string;
  view?: 'my_day' | 'important' | 'planned' | 'all';
  search?: string;
  project_id?: number;
}

interface ProjectFilters {
  category?: 'project' | 'area' | 'resource' | 'archive';
  status?: 'active' | 'on_hold' | 'completed' | 'archived';
  is_favorite?: boolean;
  search?: string;
  parent_id?: number;
}

interface NoteFilters {
  note_type?: 'note' | 'journal' | 'reference' | 'meeting';
  project_id?: number;
  tags?: string[];
  is_favorite?: boolean;
  is_archived?: boolean;
  search?: string;
}

interface JobFilters {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  damage_category?: string;
  client_id?: number;
}

interface FiltersState {
  // Task filters
  taskFilters: TaskFilters;
  setTaskFilters: (filters: Partial<TaskFilters>) => void;
  resetTaskFilters: () => void;
  setTaskView: (view: TaskFilters['view']) => void;
  setTaskListFilter: (listId: number | undefined) => void;

  // Project filters
  projectFilters: ProjectFilters;
  setProjectFilters: (filters: Partial<ProjectFilters>) => void;
  resetProjectFilters: () => void;
  setProjectCategory: (category: ProjectFilters['category']) => void;

  // Note filters
  noteFilters: NoteFilters;
  setNoteFilters: (filters: Partial<NoteFilters>) => void;
  resetNoteFilters: () => void;
  toggleNoteTag: (tag: string) => void;
  clearNoteTags: () => void;

  // Job filters
  jobFilters: JobFilters;
  setJobFilters: (filters: Partial<JobFilters>) => void;
  resetJobFilters: () => void;

  // Global search
  globalSearch: string;
  setGlobalSearch: (search: string) => void;

  // Reset all filters
  resetAllFilters: () => void;
}

const defaultTaskFilters: TaskFilters = {
  view: 'all',
};

const defaultProjectFilters: ProjectFilters = {
  category: 'project',
  status: 'active',
};

const defaultNoteFilters: NoteFilters = {
  is_archived: false,
};

const defaultJobFilters: JobFilters = {};

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      // Task filters
      taskFilters: defaultTaskFilters,
      setTaskFilters: (filters) =>
        set((state) => ({
          taskFilters: { ...state.taskFilters, ...filters },
        })),
      resetTaskFilters: () => set({ taskFilters: defaultTaskFilters }),
      setTaskView: (view) =>
        set((state) => ({
          taskFilters: { ...state.taskFilters, view },
        })),
      setTaskListFilter: (listId) =>
        set((state) => ({
          taskFilters: { ...state.taskFilters, list_id: listId },
        })),

      // Project filters
      projectFilters: defaultProjectFilters,
      setProjectFilters: (filters) =>
        set((state) => ({
          projectFilters: { ...state.projectFilters, ...filters },
        })),
      resetProjectFilters: () => set({ projectFilters: defaultProjectFilters }),
      setProjectCategory: (category) =>
        set((state) => ({
          projectFilters: { ...state.projectFilters, category },
        })),

      // Note filters
      noteFilters: defaultNoteFilters,
      setNoteFilters: (filters) =>
        set((state) => ({
          noteFilters: { ...state.noteFilters, ...filters },
        })),
      resetNoteFilters: () => set({ noteFilters: defaultNoteFilters }),
      toggleNoteTag: (tag) =>
        set((state) => {
          const currentTags = state.noteFilters.tags || [];
          const newTags = currentTags.includes(tag)
            ? currentTags.filter((t) => t !== tag)
            : [...currentTags, tag];
          return {
            noteFilters: { ...state.noteFilters, tags: newTags },
          };
        }),
      clearNoteTags: () =>
        set((state) => ({
          noteFilters: { ...state.noteFilters, tags: [] },
        })),

      // Job filters
      jobFilters: defaultJobFilters,
      setJobFilters: (filters) =>
        set((state) => ({
          jobFilters: { ...state.jobFilters, ...filters },
        })),
      resetJobFilters: () => set({ jobFilters: defaultJobFilters }),

      // Global search
      globalSearch: '',
      setGlobalSearch: (search) => set({ globalSearch: search }),

      // Reset all
      resetAllFilters: () =>
        set({
          taskFilters: defaultTaskFilters,
          projectFilters: defaultProjectFilters,
          noteFilters: defaultNoteFilters,
          jobFilters: defaultJobFilters,
          globalSearch: '',
        }),
    }),
    {
      name: 'apex-filters-store',
      partialize: (state) => ({
        // Persist all filter states
        taskFilters: state.taskFilters,
        projectFilters: state.projectFilters,
        noteFilters: state.noteFilters,
        jobFilters: state.jobFilters,
      }),
    }
  )
);
