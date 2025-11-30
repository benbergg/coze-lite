import type { Workspace } from '@/types/workspace';

export const mockWorkspaces: Workspace[] = [
  {
    id: 'workspace-1',
    name: '默认工作空间',
    description: '这是默认的工作空间',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'workspace-2',
    name: '测试工作空间',
    description: '用于测试的工作空间',
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
  {
    id: 'workspace-3',
    name: '开发工作空间',
    description: '开发环境专用',
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
  },
];
