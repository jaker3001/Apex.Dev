/**
 * UI State Store (Zustand)
 *
 * Manages global UI state including:
 * - Sidebar visibility
 * - Modal states
 * - Toast notifications
 * - Theme preferences
 * - Active views
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Active views
  activeTaskView: 'list' | 'kanban' | 'calendar';
  setActiveTaskView: (view: 'list' | 'kanban' | 'calendar') => void;

  activeProjectView: 'grid' | 'kanban' | 'list';
  setActiveProjectView: (view: 'grid' | 'kanban' | 'list') => void;

  activeNoteView: 'list' | 'grid' | 'editor';
  setActiveNoteView: (view: 'list' | 'grid' | 'editor') => void;

  // Quick capture
  quickCaptureOpen: boolean;
  setQuickCaptureOpen: (open: boolean) => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: true,
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Modals
      activeModal: null,
      modalData: null,
      openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: null, modalData: null }),

      // Toasts
      toasts: [],
      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            { ...toast, id: crypto.randomUUID() } as Toast,
          ],
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
      clearToasts: () => set({ toasts: [] }),

      // Active views
      activeTaskView: 'list',
      setActiveTaskView: (view) => set({ activeTaskView: view }),

      activeProjectView: 'grid',
      setActiveProjectView: (view) => set({ activeProjectView: view }),

      activeNoteView: 'list',
      setActiveNoteView: (view) => set({ activeNoteView: view }),

      // Quick capture
      quickCaptureOpen: false,
      setQuickCaptureOpen: (open) => set({ quickCaptureOpen: open }),

      // Loading states
      globalLoading: false,
      setGlobalLoading: (loading) => set({ globalLoading: loading }),

      // Command palette
      commandPaletteOpen: false,
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'apex-ui-store',
      partialize: (state) => ({
        // Only persist these fields
        sidebarCollapsed: state.sidebarCollapsed,
        activeTaskView: state.activeTaskView,
        activeProjectView: state.activeProjectView,
        activeNoteView: state.activeNoteView,
      }),
    }
  )
);

/**
 * Hook for toast notifications
 */
export function useToast() {
  const addToast = useUIStore((state) => state.addToast);
  const removeToast = useUIStore((state) => state.removeToast);

  const toast = {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message, duration: 3000 }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message, duration: 5000 }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message, duration: 3000 }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message, duration: 4000 }),
  };

  return { toast, removeToast };
}
