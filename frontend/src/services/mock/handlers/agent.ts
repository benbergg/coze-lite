import type MockAdapter from 'axios-mock-adapter';
import { mockAgents } from '../fixtures/agents';
import type { Agent } from '@/types/agent';

export function setupAgentMocks(mock: MockAdapter) {
  // 获取 Agent 列表（带分页）
  mock.onGet(/\/api\/workspaces\/(.+)\/agents/).reply((config) => {
    const url = new URL(config.url!, 'http://localhost');
    const workspaceId = config.url?.match(/\/api\/workspaces\/([^/]+)\/agents/)?.[1];
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    // 过滤该工作空间的 agents
    const workspaceAgents = mockAgents.filter(a => a.workspaceId === workspaceId);

    // 分页
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = workspaceAgents.slice(start, end);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: {
          items,
          total: workspaceAgents.length,
          page,
          pageSize,
        },
      },
    ];
  });

  // 获取单个 Agent
  mock.onGet(/\/api\/agents\/(.+)/).reply((config) => {
    const agentId = config.url?.split('/').pop();
    const agent = mockAgents.find(a => a.id === agentId);

    if (!agent) {
      return [
        404,
        {
          code: 404,
          message: 'Agent 不存在',
        },
      ];
    }

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: agent,
      },
    ];
  });

  // 创建 Agent
  mock.onPost(/\/api\/workspaces\/(.+)\/agents/).reply((config) => {
    const workspaceId = config.url?.match(/\/api\/workspaces\/([^/]+)\/agents/)?.[1];
    const data = JSON.parse(config.data);

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      workspaceId: workspaceId || 'workspace-1',
      name: data.name,
      description: data.description || '',
      config: data.config || {
        name: data.name,
        description: data.description || '',
        prompt: '',
        model: 'gpt-3.5-turbo',
        tools: [],
        workflows: [],
      },
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockAgents.push(newAgent);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: newAgent,
      },
    ];
  });

  // 更新 Agent
  mock.onPut(/\/api\/agents\/(.+)/).reply((config) => {
    const agentId = config.url?.split('/').pop();
    const updates = JSON.parse(config.data);

    const agentIndex = mockAgents.findIndex(a => a.id === agentId);
    if (agentIndex === -1) {
      return [
        404,
        {
          code: 404,
          message: 'Agent 不存在',
        },
      ];
    }

    mockAgents[agentIndex] = {
      ...mockAgents[agentIndex],
      config: {
        ...mockAgents[agentIndex].config,
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    };

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: mockAgents[agentIndex],
      },
    ];
  });

  // 发布 Agent
  mock.onPost(/\/api\/agents\/(.+)\/publish/).reply((config) => {
    const agentId = config.url?.match(/\/api\/agents\/([^/]+)\/publish/)?.[1];
    const agentIndex = mockAgents.findIndex(a => a.id === agentId);

    if (agentIndex === -1) {
      return [
        404,
        {
          code: 404,
          message: 'Agent 不存在',
        },
      ];
    }

    mockAgents[agentIndex] = {
      ...mockAgents[agentIndex],
      published: true,
      updatedAt: new Date().toISOString(),
    };

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: mockAgents[agentIndex],
      },
    ];
  });

  // 删除 Agent
  mock.onDelete(/\/api\/agents\/(.+)/).reply((config) => {
    const agentId = config.url?.split('/').pop();
    const agentIndex = mockAgents.findIndex(a => a.id === agentId);

    if (agentIndex === -1) {
      return [
        404,
        {
          code: 404,
          message: 'Agent 不存在',
        },
      ];
    }

    mockAgents.splice(agentIndex, 1);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: null,
      },
    ];
  });

  // 测试 Agent（模拟流式响应）
  // 注意：这里只能返回普通响应，因为 axios-mock-adapter 不支持真正的流式响应
  mock.onPost(/\/api\/agents\/(.+)\/test/).reply(() => {
    return [
      200,
      {
        code: 0,
        message: 'success',
        data: {
          response: '这是一个模拟的 Agent 响应。在真实环境中，这将是流式返回的内容。',
        },
      },
    ];
  });
}
