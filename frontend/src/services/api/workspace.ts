import { client } from './client';
import type { ApiResponse } from '@/types/common';
import type { Workspace, CreateWorkspaceRequest } from '@/types/workspace';

export const workspaceApi = {
  // 获取工作空间列表
  getWorkspaces: async () => {
    const res = await client.get<ApiResponse<Workspace[]>>('/api/workspaces');
    return res.data.data;
  },

  // 获取单个工作空间
  getWorkspace: async (id: string) => {
    const res = await client.get<ApiResponse<Workspace>>(`/api/workspaces/${id}`);
    return res.data.data;
  },

  // 创建工作空间
  createWorkspace: async (data: CreateWorkspaceRequest) => {
    const res = await client.post<ApiResponse<Workspace>>('/api/workspaces', data);
    return res.data.data;
  },

  // 更新工作空间
  updateWorkspace: async (id: string, data: Partial<Workspace>) => {
    const res = await client.put<ApiResponse<Workspace>>(
      `/api/workspaces/${id}`,
      data
    );
    return res.data.data;
  },

  // 删除工作空间
  deleteWorkspace: async (id: string) => {
    await client.delete(`/api/workspaces/${id}`);
  },
};
