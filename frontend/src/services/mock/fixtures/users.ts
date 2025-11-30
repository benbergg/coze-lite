import type { User } from '@/types/user';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'admin',
    email: 'admin@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    username: 'testuser',
    email: 'test@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

export const mockToken = 'mock-jwt-token-' + Date.now();
