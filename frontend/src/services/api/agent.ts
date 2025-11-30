import { client } from './client';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import type { Agent, AgentConfig } from '@/types/agent';

export const agentApi = {
  // 获取 Agent 列表
  getAgents: async (workspaceId: string, page = 1, pageSize = 20) => {
    const res = await client.get<ApiResponse<PaginatedResponse<Agent>>>(
      `/api/workspaces/${workspaceId}/agents`,
      { params: { page, pageSize } }
    );
    return res.data.data;
  },

  // 获取单个 Agent
  getAgent: async (id: string) => {
    const res = await client.get<ApiResponse<Agent>>(`/api/agents/${id}`);
    return res.data.data;
  },

  // 创建 Agent
  createAgent: async (workspaceId: string, data: Partial<Agent>) => {
    const res = await client.post<ApiResponse<Agent>>(
      `/api/workspaces/${workspaceId}/agents`,
      data
    );
    return res.data.data;
  },

  // 更新 Agent 配置
  updateAgent: async (id: string, config: Partial<AgentConfig>) => {
    const res = await client.put<ApiResponse<Agent>>(
      `/api/agents/${id}`,
      config
    );
    return res.data.data;
  },

  // 发布 Agent
  publishAgent: async (id: string) => {
    const res = await client.post<ApiResponse<Agent>>(
      `/api/agents/${id}/publish`
    );
    return res.data.data;
  },

  // 删除 Agent
  deleteAgent: async (id: string) => {
    await client.delete(`/api/agents/${id}`);
  },

  // 测试 Agent（流式响应）
  testAgent: async (
    id: string,
    message: string,
    onMessage: (chunk: string) => void
  ) => {
    const response = await fetch(`${client.defaults.baseURL}/api/agents/${id}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': client.defaults.headers.common['Authorization'] as string,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      onMessage(chunk);
    }
  },
};
