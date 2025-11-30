# API 集成和数据管理

> HTTP 客户端封装、请求/响应处理、错误管理的最佳实践

## 1. API 架构设计

### 1.1 分层架构

```
组件层 (Components)
     ↓
Store 层 (Zustand)
     ↓
Service 层 (API Services)
     ↓
HTTP 客户端层 (Axios)
     ↓
后端 API
```

### 1.2 目录结构

```
src/services/
├── api/
│   ├── client.ts          # HTTP 客户端配置
│   ├── interceptors.ts    # 请求/响应拦截器
│   ├── user.ts           # 用户相关 API
│   ├── workspace.ts      # 工作空间 API
│   ├── agent.ts          # Agent API
│   └── workflow.ts       # Workflow API
├── types/
│   ├── user.ts           # 用户类型
│   ├── workspace.ts      # 工作空间类型
│   ├── agent.ts          # Agent 类型
│   └── common.ts         # 通用类型
└── utils/
    └── error-handler.ts  # 错误处理工具
```

## 2. HTTP 客户端封装

### 2.1 基础配置

```typescript
// src/services/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/config/constants';

// 创建 axios 实例
export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求配置类型
export interface RequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;      // 跳过认证
  skipErrorHandler?: boolean;  // 跳过错误处理
}
```

### 2.2 请求拦截器

```typescript
// src/services/api/interceptors.ts
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { client } from './client';
import { useUserStore } from '@/stores/user';
import { Message } from '@arco-design/web-react';

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
    if (process.env.NODE_ENV === 'development') {
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
    if (process.env.NODE_ENV === 'development') {
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
      Message.error('没有权限访问');
    }

    // 500 服务器错误
    if (error.response?.status === 500) {
      if (!config?.skipErrorHandler) {
        Message.error('服务器错误，请稍后重试');
      }
    }

    // 网络错误
    if (!error.response) {
      Message.error('网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

// 生成请求 ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
```

## 3. API Service 层

### 3.1 通用响应类型

```typescript
// src/services/types/common.ts
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
```

### 3.2 用户 API

```typescript
// src/services/api/user.ts
import { client } from './client';
import type { ApiResponse } from '../types/common';
import type { User, LoginRequest, RegisterRequest } from '../types/user';

export const userApi = {
  // 登录
  login: async (data: LoginRequest) => {
    const res = await client.post<ApiResponse<{
      user: User;
      token: string;
    }>>('/api/auth/login', data);
    return res.data.data;
  },

  // 注册
  register: async (data: RegisterRequest) => {
    const res = await client.post<ApiResponse<{
      user: User;
      token: string;
    }>>('/api/auth/register', data);
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
```

### 3.3 工作空间 API

```typescript
// src/services/api/workspace.ts
import { client } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type { Workspace, CreateWorkspaceRequest } from '../types/workspace';

export const workspaceApi = {
  // 获取工作空间列表
  getWorkspaces: async () => {
    const res = await client.get<ApiResponse<Workspace[]>>('/api/workspaces');
    return res.data.data;
  },

  // 获取单个工作空间
  getWorkspace: async (id: string) => {
    const res = await client.get<ApiResponse<Workspace>>(`/api/workspaces/${id}`);
    return res.data.data;
  },

  // 创建工作空间
  createWorkspace: async (data: CreateWorkspaceRequest) => {
    const res = await client.post<ApiResponse<Workspace>>('/api/workspaces', data);
    return res.data.data;
  },

  // 更新工作空间
  updateWorkspace: async (id: string, data: Partial<Workspace>) => {
    const res = await client.put<ApiResponse<Workspace>>(
      `/api/workspaces/${id}`,
      data
    );
    return res.data.data;
  },

  // 删除工作空间
  deleteWorkspace: async (id: string) => {
    await client.delete(`/api/workspaces/${id}`);
  },
};
```

### 3.4 Agent API

```typescript
// src/services/api/agent.ts
import { client } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/common';
import type { Agent, AgentConfig } from '../types/agent';

export const agentApi = {
  // 获取 Agent 列表
  getAgents: async (workspaceId: string, page = 1, pageSize = 20) => {
    const res = await client.get<ApiResponse<PaginatedResponse<Agent>>>(
      `/api/workspaces/${workspaceId}/agents`,
      { params: { page, pageSize } }
    );
    return res.data.data;
  },

  // 获取单个 Agent
  getAgent: async (id: string) => {
    const res = await client.get<ApiResponse<Agent>>(`/api/agents/${id}`);
    return res.data.data;
  },

  // 创建 Agent
  createAgent: async (workspaceId: string, data: Partial<Agent>) => {
    const res = await client.post<ApiResponse<Agent>>(
      `/api/workspaces/${workspaceId}/agents`,
      data
    );
    return res.data.data;
  },

  // 更新 Agent 配置
  updateAgent: async (id: string, config: Partial<AgentConfig>) => {
    const res = await client.put<ApiResponse<Agent>>(
      `/api/agents/${id}`,
      config
    );
    return res.data.data;
  },

  // 发布 Agent
  publishAgent: async (id: string) => {
    const res = await client.post<ApiResponse<Agent>>(
      `/api/agents/${id}/publish`
    );
    return res.data.data;
  },

  // 删除 Agent
  deleteAgent: async (id: string) => {
    await client.delete(`/api/agents/${id}`);
  },

  // 测试 Agent（流式响应）
  testAgent: async (
    id: string,
    message: string,
    onMessage: (chunk: string) => void
  ) => {
    const res = await client.post(
      `/api/agents/${id}/test`,
      { message },
      {
        responseType: 'stream',
        adapter: 'fetch', // 使用 fetch adapter 处理流
      }
    );

    // 处理流式响应
    const reader = res.data.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      onMessage(chunk);
    }
  },
};
```

## 4. 类型定义

### 4.1 用户类型

```typescript
// src/services/types/user.ts
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
```

### 4.2 Agent 类型

```typescript
// src/services/types/agent.ts
export interface Agent {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  config: AgentConfig;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools: Tool[];
  workflows: string[];
}

export interface Tool {
  id: string;
  type: 'function' | 'plugin';
  name: string;
  description: string;
  parameters?: any;
}
```

## 5. 与 Store 集成

### 5.1 在 Store 中调用 API

```typescript
// src/stores/agent.ts
import { create } from 'zustand';
import { agentApi } from '@/services/api/agent';
import type { Agent, AgentConfig } from '@/services/types/agent';

interface AgentState {
  agent: Agent | null;
  agents: Agent[];
  isLoading: boolean;
  error: Error | null;

  fetchAgent: (id: string) => Promise<void>;
  fetchAgents: (workspaceId: string) => Promise<void>;
  updateConfig: (config: Partial<AgentConfig>) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agent: null,
  agents: [],
  isLoading: false,
  error: null,

  fetchAgent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const agent = await agentApi.getAgent(id);
      set({ agent, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },

  fetchAgents: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await agentApi.getAgents(workspaceId);
      set({ agents: data.items, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },

  updateConfig: async (config) => {
    const { agent } = get();
    if (!agent) return;

    try {
      const updated = await agentApi.updateAgent(agent.id, config);
      set({ agent: updated });
    } catch (error) {
      throw error;
    }
  },
}));
```

## 6. 错误处理

### 6.1 统一错误处理

```typescript
// src/services/utils/error-handler.ts
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
```

### 6.2 在组件中使用

```typescript
import { showApiError } from '@/services/utils/error-handler';

function MyComponent() {
  const handleSubmit = async () => {
    try {
      await agentApi.createAgent(workspaceId, data);
      Message.success('创建成功');
    } catch (error) {
      showApiError(error);
    }
  };

  return <button onClick={handleSubmit}>创建</button>;
}
```

## 7. 请求取消

```typescript
// src/hooks/use-cancelable-request.ts
import { useEffect, useRef } from 'axios';
import axios, { CancelTokenSource } from 'axios';

export function useCancelableRequest() {
  const cancelTokenRef = useRef<CancelTokenSource>();

  useEffect(() => {
    // 组件卸载时取消请求
    return () => {
      cancelTokenRef.current?.cancel('Component unmounted');
    };
  }, []);

  const makeRequest = async <T>(
    requestFn: (cancelToken: CancelTokenSource['token']) => Promise<T>
  ): Promise<T> => {
    // 取消之前的请求
    cancelTokenRef.current?.cancel('New request started');

    // 创建新的 cancel token
    cancelTokenRef.current = axios.CancelToken.source();

    return requestFn(cancelTokenRef.current.token);
  };

  return { makeRequest };
}

// 使用
function SearchComponent() {
  const { makeRequest } = useCancelableRequest();

  const handleSearch = async (keyword: string) => {
    try {
      const results = await makeRequest((cancelToken) =>
        client.get('/api/search', {
          params: { keyword },
          cancelToken,
        })
      );
      // 处理结果
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request canceled');
      }
    }
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

## 8. 请求缓存

```typescript
// src/services/api/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 过期时间（毫秒）
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const apiCache = new ApiCache();

// 使用缓存的请求
export async function getCachedData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 尝试从缓存获取
  const cached = apiCache.get<T>(cacheKey);
  if (cached) return cached;

  // 缓存未命中，发起请求
  const data = await fetcher();
  apiCache.set(cacheKey, data, ttl);

  return data;
}

// 示例
export const workspaceApi = {
  getWorkspaces: async () => {
    return getCachedData(
      'workspaces',
      async () => {
        const res = await client.get<ApiResponse<Workspace[]>>('/api/workspaces');
        return res.data.data;
      },
      5 * 60 * 1000 // 缓存 5 分钟
    );
  },
};
```

## 9. 文件上传

```typescript
// src/services/api/upload.ts
export const uploadApi = {
  // 上传单个文件
  uploadFile: async (
    file: File,
    onProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await client.post<ApiResponse<{ url: string }>>(
      '/api/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        },
      }
    );

    return res.data.data;
  },

  // 上传多个文件
  uploadFiles: async (
    files: File[],
    onProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await client.post<ApiResponse<{ urls: string[] }>>(
      '/api/upload/multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        },
      }
    );

    return res.data.data;
  },
};
```

## 10. Mock 数据（开发环境）

```typescript
// src/services/api/mock.ts
import MockAdapter from 'axios-mock-adapter';
import { client } from './client';

// 仅在开发环境启用 mock
if (process.env.NODE_ENV === 'development' && process.env.VITE_USE_MOCK) {
  const mock = new MockAdapter(client, { delayResponse: 500 });

  // Mock 登录
  mock.onPost('/api/auth/login').reply(200, {
    code: 0,
    message: 'success',
    data: {
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      },
      token: 'mock-token-123',
    },
  });

  // Mock 获取工作空间
  mock.onGet('/api/workspaces').reply(200, {
    code: 0,
    message: 'success',
    data: [
      {
        id: '1',
        name: 'My Workspace',
        description: 'Test workspace',
      },
    ],
  });

  // 其他 API mock...
}
```

## 11. 最佳实践

### ✅ 推荐

1. **统一响应格式**：所有 API 返回统一的数据结构
2. **错误处理**：使用拦截器统一处理错误
3. **类型定义**：完整的 TypeScript 类型
4. **请求取消**：长时间请求支持取消
5. **缓存策略**：适当使用缓存减少请求
6. **加载状态**：在 Store 中管理 loading/error 状态

### ❌ 避免

1. 不要在组件中直接使用 axios
2. 不要硬编码 API URL
3. 不要忘记处理错误情况
4. 不要重复定义类型
5. 不要在请求中直接操作 DOM

## 12. 下一步

- 📝 `07-account-system.md` - 完整账户系统实现
- 📝 `08-workspace-module.md` - 工作空间模块实现

---

**文档版本**：v1.0 | 2025-11-30
