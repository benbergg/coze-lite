import { AxiosError } from 'axios';
import { Message } from '@arco-design/web-react';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const response = error.response?.data;

    // 服务器返回的错误
    if (response) {
      return new ApiError(
        response.code || 'UNKNOWN_ERROR',
        response.message || '未知错误',
        response.details
      );
    }

    // 网络错误
    if (error.code === 'ECONNABORTED') {
      return new ApiError('TIMEOUT', '请求超时');
    }

    if (!error.response) {
      return new ApiError('NETWORK_ERROR', '网络错误');
    }
  }

  // 其他错误
  return new ApiError(
    'UNKNOWN_ERROR',
    error instanceof Error ? error.message : '未知错误'
  );
}

// 显示错误提示
export function showApiError(error: unknown) {
  const apiError = handleApiError(error);
  Message.error(apiError.message);
}
