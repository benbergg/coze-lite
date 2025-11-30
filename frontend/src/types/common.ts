// API 响应通用格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API 错误
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
