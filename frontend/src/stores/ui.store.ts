import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      toggleSidebar: (): void => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },
      setSidebarOpen: (open: boolean): void => {
        set({ sidebarOpen: open });
      },
    }),
    {
      name: 'srh-ui-storage',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    },
  ),
);
