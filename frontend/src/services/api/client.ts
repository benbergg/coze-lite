import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/config/constants';

// 请求配置类型
export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;           // 跳过认证
  skipErrorHandler?: boolean;   // 跳过错误处理
}

// 创建 axios 实例
export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 导出 axios 用于其他需要的地方
export { axios };
