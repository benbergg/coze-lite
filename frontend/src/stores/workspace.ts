import { create } from 'zustand';
import type { Workspace, CreateWorkspaceRequest } from '@/types/workspace';

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;

  // Computed
  getCurrentWorkspace: () => Workspace | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string) => void;
  createWorkspace: (data: CreateWorkspaceRequest) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: null,
  isLoading: false,

  // Computed getter
  getCurrentWorkspace: () => {
    const { workspaces, currentWorkspaceId } = get();
    return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
  },

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      // TODO: 替换为真实 API 调用
      // 模拟数据
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockWorkspaces: Workspace[] = [
        {
          id: '1',
          name: '我的工作空间',
          description: '默认工作空间',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      set({ workspaces: mockWorkspaces, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setCurrentWorkspace: (id) => {
    set({ currentWorkspaceId: id });
  },

  createWorkspace: async (data) => {
    // TODO: 替换为真实 API 调用
    const newWorkspace: Workspace = {
      id: Date.now().toString(),
      name: data.name,
      description: data.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      workspaces: [...state.workspaces, newWorkspace],
    }));

    return newWorkspace;
  },

  deleteWorkspace: async (id) => {
    // TODO: 替换为真实 API 调用
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspaceId:
        state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
    }));
  },
}));
