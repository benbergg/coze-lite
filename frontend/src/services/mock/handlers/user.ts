import type MockAdapter from 'axios-mock-adapter';
import { mockUsers, mockToken } from '../fixtures/users';
import type { User } from '@/types/user';

export function setupUserMocks(mock: MockAdapter) {
  // 登录
  mock.onPost('/api/auth/login').reply((config) => {
    const { username, password } = JSON.parse(config.data);

    // 简单验证
    if (password === 'password' || password === '123456') {
      const user = mockUsers.find(u => u.username === username) || mockUsers[0];

      return [
        200,
        {
          code: 0,
          message: 'success',
          data: {
            user,
            token: mockToken,
          },
        },
      ];
    }

    return [
      401,
      {
        code: 401,
        message: '用户名或密码错误',
      },
    ];
  });

  // 注册
  mock.onPost('/api/auth/register').reply((config) => {
    const { username, email } = JSON.parse(config.data);

    // 检查用户是否已存在
    const existingUser = mockUsers.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return [
        400,
        {
          code: 400,
          message: '用户名或邮箱已存在',
        },
      ];
    }

    // 创建新用户
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: {
          user: newUser,
          token: mockToken,
        },
      },
    ];
  });

  // 获取当前用户
  mock.onGet('/api/user/me').reply(() => {
    return [
      200,
      {
        code: 0,
        message: 'success',
        data: mockUsers[0],
      },
    ];
  });

  // 更新用户信息
  mock.onPut(/\/api\/user\/(.+)/).reply((config) => {
    const userId = config.url?.split('/').pop();
    const updates = JSON.parse(config.data);

    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return [
        404,
        {
          code: 404,
          message: '用户不存在',
        },
      ];
    }

    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: mockUsers[userIndex],
      },
    ];
  });

  // 登出
  mock.onPost('/api/auth/logout').reply(() => {
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
