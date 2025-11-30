import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { client } from './client';
import { useUserStore } from '@/stores/user';
import { Message } from '@arco-design/web-react';

// 生成请求 ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// 请求拦截器
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加 token
    const token = useUserStore.getState().token;
    if (token && !(config as any).skipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加请求 ID（用于追踪）
    config.headers['X-Request-ID'] = generateRequestId();

    // 打印请求日志（开发环境）
    if (import.meta.env.DEV) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
client.interceptors.response.use(
  (response) => {
    // 打印响应日志
    if (import.meta.env.DEV) {
      console.log('API Response:', response.config.url, response.data);
    }

    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;

    // 401 未授权 - 自动跳转登录
    if (error.response?.status === 401) {
      const { logout } = useUserStore.getState();
      logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 403 禁止访问
    if (error.response?.status === 403) {
      if (!config?.skipErrorHandler) {
        Message.error('没有权限访问');
      }
    }

    // 500 服务器错误
    if (error.response?.status === 500) {
      if (!config?.skipErrorHandler) {
        Message.error('服务器错误，请稍后重试');
      }
    }

    // 网络错误
    if (!error.response) {
      if (!config?.skipErrorHandler) {
        Message.error('网络错误，请检查网络连接');
      }
    }

    return Promise.reject(error);
  }
);
