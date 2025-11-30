import { create } from 'zustand';
import type { Workspace, CreateWorkspaceRequest } from '@/types/workspace';
import { workspaceApi } from '@/services/api/workspace';

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  error: Error | null;

  // Computed
  getCurrentWorkspace: () => Workspace | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string) => void;
  createWorkspace: (data: CreateWorkspaceRequest) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: null,
  isLoading: false,
  error: null,

  // Computed getter
  getCurrentWorkspace: () => {
    const { workspaces, currentWorkspaceId } = get();
    return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
  },

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspaceApi.getWorkspaces();
      set({ workspaces, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error as Error,
      });
      throw error;
    }
  },

  setCurrentWorkspace: (id) => {
    set({ currentWorkspaceId: id });
  },

  createWorkspace: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newWorkspace = await workspaceApi.createWorkspace(data);

      set((state) => ({
        workspaces: [...state.workspaces, newWorkspace],
        isLoading: false,
      }));

      return newWorkspace;
    } catch (error) {
      set({
        isLoading: false,
        error: error as Error,
      });
      throw error;
    }
  },

  updateWorkspace: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await workspaceApi.updateWorkspace(id, data);

      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === id ? { ...w, ...updated } : w
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error as Error,
      });
      throw error;
    }
  },

  deleteWorkspace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await workspaceApi.deleteWorkspace(id);

      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.id !== id),
        currentWorkspaceId:
          state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
        isLoading: false,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error as Error,
      });
      throw error;
    }
  },
}));
