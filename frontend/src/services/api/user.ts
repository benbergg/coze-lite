import { client } from './client';
import type { ApiResponse } from '@/types/common';
import type { User, LoginRequest, RegisterRequest } from '@/types/user';

export const userApi = {
  // 登录
  login: async (data: LoginRequest) => {
    const res = await client.post<ApiResponse<{
      user: User;
      token: string;
    }>>('/api/auth/login', data, { skipAuth: true } as any);
    return res.data.data;
  },

  // 注册
  register: async (data: RegisterRequest) => {
    const res = await client.post<ApiResponse<{
      user: User;
      token: string;
    }>>('/api/auth/register', data, { skipAuth: true } as any);
    return res.data.data;
  },

  // 获取当前用户
  getCurrentUser: async () => {
    const res = await client.get<ApiResponse<User>>('/api/user/me');
    return res.data.data;
  },

  // 更新用户信息
  updateUser: async (id: string, data: Partial<User>) => {
    const res = await client.put<ApiResponse<User>>(`/api/user/${id}`, data);
    return res.data.data;
  },

  // 登出
  logout: async () => {
    await client.post('/api/auth/logout');
  },
};
