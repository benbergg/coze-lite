# 状态管理方案

> 基于 Zustand 的轻量级状态管理实践

## 1. 为什么选择 Zustand？

### 1.1 对比其他方案

| 特性 | Redux | MobX | Zustand | Context API |
|------|-------|------|---------|-------------|
| 学习曲线 | 陡 | 中 | 平缓 ✅ | 简单 |
| 代码量 | 多 | 中 | 少 ✅ | 少 |
| 性能 | 好 | 好 | 好 ✅ | 一般 |
| TS 支持 | 好 | 好 | 优秀 ✅ | 中 |
| DevTools | ✅ | ✅ | ✅ | ❌ |
| Boilerplate | 多 | 中 | 少 ✅ | 少 |

### 1.2 Zustand 优势

```typescript
// ✅ Zustand - 简洁直观
const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// 使用
const user = useUserStore((state) => state.user);

// ❌ Redux - 需要 actions, reducers, types...
// 代码量是 Zustand 的 3-5 倍
```

## 2. Coze Studio 状态管理分析

### 2.1 Store 组织方式

```
packages/
├── foundation/
│   ├── global-store/          # 全局状态
│   └── space-store/           # 工作空间状态
├── agent-ide/
│   └── bot-editor-context-store/  # Bot 编辑器状态
└── studio/
    └── bot-detail-store/      # Bot 详情状态
```

### 2.2 核心模式

- ✅ **按模块拆分** Store
- ✅ **Selector 优化**性能
- ✅ **Middleware** 支持（persist、devtools）
- ✅ **TypeScript** 严格类型

## 3. Coze Lite Store 设计

### 3.1 Store 目录结构

```
src/stores/
├── index.ts              # 导出所有 stores
├── user.ts              # 用户状态
├── workspace.ts         # 工作空间状态
├── agent.ts             # Agent 编辑器状态
├── workflow.ts          # Workflow 编辑器状态
└── ui.ts                # UI 状态（主题、侧边栏等）
```

## 4. 核心 Store 实现

### 4.1 用户 Store

```typescript
// src/stores/user.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface UserState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isLoading: false,

      // Actions
      setUser: (user) => set({ user }),

      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
      },

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await api.login({ username, password });
          set({
            user: res.user,
            token: res.token,
            isLoading: false,
          });
          get().setToken(res.token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem('token');
      },

      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        const updated = await api.updateUser(user.id, data);
        set({ user: updated });
      },
    }),
    {
      name: 'user-storage', // localStorage key
      partialState: (state) => ({
        // 只持久化部分状态
        user: state.user,
        token: state.token,
      }),
    }
  )
);
```

### 4.2 工作空间 Store

```typescript
// src/stores/workspace.ts
import { create } from 'zustand';
import type { Workspace } from '@/types';

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;

  // Computed (getters)
  getCurrentWorkspace: () => Workspace | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string) => void;
  createWorkspace: (data: Partial<Workspace>) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: null,
  isLoading: false,

  // Computed getter
  getCurrentWorkspace: () => {
    const { workspaces, currentWorkspaceId } = get();
    return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
  },

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const workspaces = await api.getWorkspaces();
      set({ workspaces, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setCurrentWorkspace: (id) => {
    set({ currentWorkspaceId: id });
  },

  createWorkspace: async (data) => {
    const workspace = await api.createWorkspace(data);
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    }));
    return workspace;
  },

  updateWorkspace: async (id, data) => {
    const updated = await api.updateWorkspace(id, data);
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? updated : w
      ),
    }));
  },

  deleteWorkspace: async (id) => {
    await api.deleteWorkspace(id);
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspaceId:
        state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
    }));
  },
}));
```

### 4.3 Agent 编辑器 Store

```typescript
// src/stores/agent.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Agent, AgentConfig } from '@/types';

interface AgentState {
  // State
  agent: Agent | null;
  config: AgentConfig;
  isDirty: boolean; // 是否有未保存的更改
  isSaving: boolean;

  // Actions
  loadAgent: (id: string) => Promise<void>;
  updateConfig: (config: Partial<AgentConfig>) => void;
  save: () => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;
}

export const useAgentStore = create<AgentState>()(
  devtools(
    (set, get) => ({
      agent: null,
      config: {
        name: '',
        description: '',
        prompt: '',
        model: 'gpt-3.5-turbo',
        tools: [],
      },
      isDirty: false,
      isSaving: false,

      loadAgent: async (id) => {
        const agent = await api.getAgent(id);
        set({
          agent,
          config: agent.config,
          isDirty: false,
        });
      },

      updateConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
          isDirty: true,
        }));
      },

      save: async () => {
        const { agent, config } = get();
        if (!agent) return;

        set({ isSaving: true });
        try {
          const updated = await api.updateAgent(agent.id, config);
          set({
            agent: updated,
            config: updated.config,
            isDirty: false,
            isSaving: false,
          });
        } catch (error) {
          set({ isSaving: false });
          throw error;
        }
      },

      publish: async () => {
        const { agent } = get();
        if (!agent) return;

        await api.publishAgent(agent.id);
        set((state) => ({
          agent: state.agent ? { ...state.agent, published: true } : null,
        }));
      },

      reset: () => {
        set({
          agent: null,
          config: {
            name: '',
            description: '',
            prompt: '',
            model: 'gpt-3.5-turbo',
            tools: [],
          },
          isDirty: false,
        });
      },
    }),
    { name: 'AgentStore' }
  )
);
```

### 4.4 UI Store

```typescript
// src/stores/ui.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // State
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  language: 'zh-CN' | 'en';

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setLanguage: (lang: 'zh-CN' | 'en') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      language: 'zh-CN',

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setLanguage: (language) => set({ language }),
    }),
    { name: 'ui-storage' }
  )
);
```

## 5. Store 使用模式

### 5.1 组件中使用

```typescript
import { useUserStore } from '@/stores/user';
import { useAgentStore } from '@/stores/agent';

function MyComponent() {
  // ✅ 推荐：使用 selector 只订阅需要的状态
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  // ❌ 避免：订阅整个 store（会导致不必要的重渲染）
  const userStore = useUserStore();

  // ✅ 订阅多个状态
  const { agent, isDirty, save } = useAgentStore((state) => ({
    agent: state.agent,
    isDirty: state.isDirty,
    save: state.save,
  }));

  return (
    <div>
      <p>{user?.name}</p>
      <button onClick={logout}>登出</button>
      <button onClick={save} disabled={!isDirty}>
        保存
      </button>
    </div>
  );
}
```

### 5.2 在组件外使用

```typescript
// src/services/api.ts
import { useUserStore } from '@/stores/user';

// ✅ 在组件外获取 store 状态
export async function apiRequest(url: string) {
  const token = useUserStore.getState().token;

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
```

### 5.3 监听状态变化

```typescript
import { useEffect } from 'react';
import { useUserStore } from '@/stores/user';

function App() {
  useEffect(() => {
    // 监听 token 变化
    const unsubscribe = useUserStore.subscribe(
      (state) => state.token,
      (token) => {
        console.log('Token changed:', token);
        // 处理 token 变化（如刷新权限等）
      }
    );

    return unsubscribe;
  }, []);

  return <div>App</div>;
}
```

## 6. 高级模式

### 6.1 Immer 中间件（不可变更新）

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface TodoState {
  todos: Array<{ id: string; text: string; done: boolean }>;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
}

export const useTodoStore = create<TodoState>()(
  immer((set) => ({
    todos: [],

    addTodo: (text) =>
      set((state) => {
        // ✅ 使用 Immer，可以直接修改
        state.todos.push({
          id: Date.now().toString(),
          text,
          done: false,
        });
      }),

    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.done = !todo.done;
        }
      }),
  }))
);
```

### 6.2 切片模式（Slices）

```typescript
// src/stores/slices/userSlice.ts
export const createUserSlice = (set, get) => ({
  user: null,
  login: async (username, password) => {
    const res = await api.login({ username, password });
    set({ user: res.user });
  },
});

// src/stores/slices/workspaceSlice.ts
export const createWorkspaceSlice = (set, get) => ({
  workspaces: [],
  fetchWorkspaces: async () => {
    const data = await api.getWorkspaces();
    set({ workspaces: data });
  },
});

// src/stores/index.ts
import { create } from 'zustand';
import { createUserSlice } from './slices/userSlice';
import { createWorkspaceSlice } from './slices/workspaceSlice';

export const useStore = create((set, get) => ({
  ...createUserSlice(set, get),
  ...createWorkspaceSlice(set, get),
}));
```

### 6.3 异步 Actions 错误处理

```typescript
interface DataState {
  data: any[];
  isLoading: boolean;
  error: Error | null;
  fetchData: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  data: [],
  isLoading: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getData();
      set({ data, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },
}));

// 使用
function MyComponent() {
  const { data, isLoading, error, fetchData } = useDataStore();

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) return <Spin />;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* 渲染 data */}</div>;
}
```

## 7. 性能优化

### 7.1 使用浅比较

```typescript
import { shallow } from 'zustand/shallow';

function MyComponent() {
  // ✅ 使用浅比较，只有数组内容变化时才重渲染
  const { name, age } = useUserStore(
    (state) => ({ name: state.user?.name, age: state.user?.age }),
    shallow
  );

  return <div>{name}, {age}</div>;
}
```

### 7.2 拆分 Store

```typescript
// ❌ 不好：一个大 store，任何更新都可能触发重渲染
const useBigStore = create(() => ({
  user: {},
  workspace: {},
  agent: {},
  // ... 很多状态
}));

// ✅ 好：按领域拆分
const useUserStore = create(() => ({ user: {} }));
const useWorkspaceStore = create(() => ({ workspace: {} }));
const useAgentStore = create(() => ({ agent: {} }));
```

### 7.3 选择器优化

```typescript
// ❌ 避免：每次都创建新对象，导致重渲染
const data = useStore((state) => ({
  name: state.user.name,
  age: state.user.age,
}));

// ✅ 推荐：使用 shallow 或者只选择基本类型
const name = useStore((state) => state.user.name);
const age = useStore((state) => state.user.age);

// 或
const data = useStore(
  (state) => ({
    name: state.user.name,
    age: state.user.age,
  }),
  shallow
);
```

## 8. DevTools 调试

```typescript
import { devtools } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    (set) => ({
      // ...state
    }),
    {
      name: 'MyStore', // DevTools 中显示的名称
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
```

**使用**：
1. 安装 Redux DevTools 浏览器扩展
2. 打开开发者工具
3. 切换到 Redux 标签查看状态变化

## 9. 测试

```typescript
// src/stores/__tests__/user.test.ts
import { renderHook, act } from '@testing-library/react';
import { useUserStore } from '../user';

describe('useUserStore', () => {
  beforeEach(() => {
    // 重置 store
    useUserStore.setState({
      user: null,
      token: null,
      isLoading: false,
    });
  });

  it('should set user', () => {
    const { result } = renderHook(() => useUserStore());

    act(() => {
      result.current.setUser({ id: '1', name: 'Test' });
    });

    expect(result.current.user).toEqual({ id: '1', name: 'Test' });
  });

  it('should handle login', async () => {
    const { result } = renderHook(() => useUserStore());

    await act(async () => {
      await result.current.login('user', 'pass');
    });

    expect(result.current.user).not.toBeNull();
    expect(result.current.token).not.toBeNull();
  });
});
```

## 10. 最佳实践

### ✅ 推荐

1. **按领域拆分 Store**：user、workspace、agent 等
2. **使用 TypeScript**：严格的类型定义
3. **使用 Selector**：只订阅需要的状态
4. **持久化关键状态**：用户信息、主题等
5. **错误处理**：异步操作要有完整的错误处理
6. **DevTools 调试**：开发环境启用 DevTools

### ❌ 避免

1. 不要订阅整个 store
2. 不要在 store 中存储派生状态（用 computed）
3. 不要在 selector 中创建新对象（除非使用 shallow）
4. 不要把所有状态都放在一个 store
5. 不要忘记清理副作用

## 11. 完整示例

```typescript
// src/stores/index.ts
export { useUserStore } from './user';
export { useWorkspaceStore } from './workspace';
export { useAgentStore } from './agent';
export { useWorkflowStore } from './workflow';
export { useUIStore } from './ui';

// 类型导出
export type { UserState } from './user';
export type { WorkspaceState } from './workspace';
```

```typescript
// 使用示例
import { useUserStore, useWorkspaceStore } from '@/stores';

function Dashboard() {
  const user = useUserStore((state) => state.user);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return (
    <div>
      <h1>欢迎, {user?.name}</h1>
      <ul>
        {workspaces.map((ws) => (
          <li key={ws.id}>{ws.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 12. 下一步

- 📝 `06-api-integration.md` - API 集成与 Store 结合
- 📝 `07-account-system.md` - 完整账户系统实现

---

**文档版本**：v1.0 | 2025-11-30
