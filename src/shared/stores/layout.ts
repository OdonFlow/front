import { create } from 'zustand';
interface LayoutState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}
export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
}));
