import type MockAdapter from 'axios-mock-adapter';
import { mockWorkspaces } from '../fixtures/workspaces';
import type { Workspace } from '@/types/workspace';

export function setupWorkspaceMocks(mock: MockAdapter) {
  // 获取工作空间列表
  mock.onGet('/api/workspaces').reply(() => {
    return [
      200,
      {
        code: 0,
        message: 'success',
        data: mockWorkspaces,
      },
    ];
  });

  // 获取单个工作空间
  mock.onGet(/\/api\/workspaces\/(.+)/).reply((config) => {
    const workspaceId = config.url?.split('/').pop();
    const workspace = mockWorkspaces.find(w => w.id === workspaceId);

    if (!workspace) {
      return [
        404,
        {
          code: 404,
          message: '工作空间不存在',
        },
      ];
    }

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: workspace,
      },
    ];
  });

  // 创建工作空间
  mock.onPost('/api/workspaces').reply((config) => {
    const { name, description } = JSON.parse(config.data);

    const newWorkspace: Workspace = {
      id: `workspace-${Date.now()}`,
      name,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockWorkspaces.push(newWorkspace);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: newWorkspace,
      },
    ];
  });

  // 更新工作空间
  mock.onPut(/\/api\/workspaces\/(.+)/).reply((config) => {
    const workspaceId = config.url?.split('/').pop();
    const updates = JSON.parse(config.data);

    const workspaceIndex = mockWorkspaces.findIndex(w => w.id === workspaceId);
    if (workspaceIndex === -1) {
      return [
        404,
        {
          code: 404,
          message: '工作空间不存在',
        },
      ];
    }

    mockWorkspaces[workspaceIndex] = {
      ...mockWorkspaces[workspaceIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: mockWorkspaces[workspaceIndex],
      },
    ];
  });

  // 删除工作空间
  mock.onDelete(/\/api\/workspaces\/(.+)/).reply((config) => {
    const workspaceId = config.url?.split('/').pop();
    const workspaceIndex = mockWorkspaces.findIndex(w => w.id === workspaceId);

    if (workspaceIndex === -1) {
      return [
        404,
        {
          code: 404,
          message: '工作空间不存在',
        },
      ];
    }

    mockWorkspaces.splice(workspaceIndex, 1);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: null,
      },
    ];
  });
}
