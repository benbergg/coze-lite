# 账户系统模块

> 完整的账户系统实现：登录、注册、身份认证和用户状态管理

## 1. Coze Studio 账户系统分析

### 1.1 源码位置

```
coze-studio/frontend/packages/foundation/
├── account-base/          # 账户核心逻辑
├── account-adapter/       # 账户适配器
├── account-ui-base/       # UI 基础组件
└── account-ui-adapter/    # UI 适配器
```

### 1.2 核心设计

Coze Studio 采用 **Base + Adapter** 模式：

```
account-base (核心逻辑)
    ↓
account-adapter (环境适配)
    ↓
account-ui-base (UI 组件)
    ↓
account-ui-adapter (UI 适配)
    ↓
应用使用
```

**Coze Lite 简化**：去掉 Adapter 层，直接实现核心功能。

## 2. 账户系统架构

### 2.1 整体流程

```
┌─────────────┐
│  登录页面    │
└──────┬──────┘
       ↓
┌──────────────────┐
│  用户输入凭据     │
│  (username/pwd)  │
└──────┬───────────┘
       ↓
┌──────────────────┐
│  User Store      │
│  login() action  │
└──────┬───────────┘
       ↓
┌──────────────────┐
│  API 调用        │
│  POST /login     │
└──────┬───────────┘
       ↓
┌──────────────────┐
│  获取 Token      │
│  保存用户信息    │
└──────┬───────────┘
       ↓
┌──────────────────┐
│  持久化存储      │
│  (localStorage)  │
└──────┬───────────┘
       ↓
┌──────────────────┐
│  跳转到工作空间  │
└──────────────────┘
```

### 2.2 文件组织

```
src/
├── types/
│   └── user.ts              # 用户类型定义
├── stores/
│   └── user.ts              # 用户状态管理
├── components/
│   └── route-guard/
│       └── auth-guard.tsx   # 认证守卫
├── pages/
│   └── auth/
│       ├── login.tsx        # 登录页面
│       └── register.tsx     # 注册页面
└── services/
    └── api/
        └── user.ts          # 用户 API（待实现）
```

## 3. 类型定义

### 3.1 用户类型

```typescript
// src/types/user.ts
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
```

**设计要点**：
- ✅ 必填字段：id、username、email
- ✅ 可选字段：avatar、createdAt
- ✅ 登录请求：最小化字段
- ✅ 响应类型：包含 user 和 token

## 4. 用户状态管理（Zustand）

### 4.1 User Store 完整实现

```typescript
// src/stores/user.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest } from '@/types/user';
import { STORAGE_KEYS } from '@/config/constants';

interface UserState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      token: null,
      isLoading: false,

      // Actions
      setUser: (user) => set({ user }),

      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } else {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
      },

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          // TODO: 替换为真实 API 调用
          // const res = await userApi.login(credentials);

          // 模拟 API 调用
          await new Promise((resolve) => setTimeout(resolve, 500));

          const mockUser: User = {
            id: '1',
            username: credentials.username,
            email: `${credentials.username}@example.com`,
          };

          const mockToken = 'mock-token-' + Date.now();

          set({
            user: mockUser,
            token: mockToken,
            isLoading: false,
          });

          localStorage.setItem(STORAGE_KEYS.TOKEN, mockToken);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      },
    }),
    {
      name: STORAGE_KEYS.USER, // localStorage key
      partialize: (state) => ({
        // 只持久化部分状态
        user: state.user,
        token: state.token,
      }),
    }
  )
);
```

### 4.2 Store 设计要点

#### ✅ 状态设计
- `user`: 用户信息（可为 null）
- `token`: 认证令牌（可为 null）
- `isLoading`: 加载状态（登录中）

#### ✅ Actions 设计
- `setUser`: 设置用户信息
- `setToken`: 设置并持久化 token
- `login`: 登录逻辑（异步）
- `logout`: 登出并清理状态

#### ✅ 持久化配置
- 使用 `persist` 中间件
- 只持久化 `user` 和 `token`
- `isLoading` 不持久化（每次重新开始）

## 5. 登录页面实现

### 5.1 完整代码

```typescript
// src/pages/auth/login.tsx
import { Button, Input, Form, Message } from '@arco-design/web-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/user';
import type { LoginRequest } from '@/types/user';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useUserStore((state) => state.login);
  const isLoading = useUserStore((state) => state.isLoading);

  // 记录登录前的页面，登录后跳回
  const from = (location.state as any)?.from?.pathname || '/workspace';

  const handleSubmit = async (values: LoginRequest) => {
    try {
      await login(values);
      Message.success('登录成功！');
      navigate(from, { replace: true });
    } catch (error) {
      Message.error('登录失败，请重试');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-96 p-8 bg-white border rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Coze Lite</h1>
          <p className="text-gray-500">欢迎回来</p>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Item
            label="用户名"
            field="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" size="large" />
          </Form.Item>

          <Form.Item
            label="密码"
            field="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              long
              size="large"
              loading={isLoading}
            >
              登录
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <span className="text-gray-500 text-sm">还没有账户？</span>
            <Button
              type="text"
              onClick={() => navigate('/register')}
              className="text-blue-600"
            >
              立即注册
            </Button>
          </div>
        </Form>

        {/* 演示提示 */}
        <div className="mt-6 p-3 bg-blue-50 rounded text-sm text-gray-600">
          <p className="font-medium mb-1">演示账户：</p>
          <p>用户名：任意</p>
          <p>密码：任意</p>
        </div>
      </div>
    </div>
  );
}
```

### 5.2 页面设计要点

#### ✅ 用户体验
- **加载状态**：登录按钮显示 loading
- **错误提示**：使用 Message 组件提示
- **表单验证**：必填字段验证
- **跳转逻辑**：登录后跳转到来源页面

#### ✅ 视觉设计
- **渐变背景**：提升视觉效果
- **圆角卡片**：现代化设计
- **大号按钮**：提升可点击性
- **演示提示**：开发阶段提示

#### ✅ 状态管理
```typescript
// 使用 Zustand selector 只订阅需要的状态
const login = useUserStore((state) => state.login);
const isLoading = useUserStore((state) => state.isLoading);
```

## 6. 注册页面实现

### 6.1 核心代码

```typescript
// src/pages/auth/register.tsx
import { Button, Input, Form, Message } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();

  const handleSubmit = async (values: any) => {
    console.log('注册:', values);
    // TODO: 实现注册逻辑
    Message.success('注册成功！请登录');
    navigate('/login');
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-96 p-8 bg-white border rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Coze Lite</h1>
          <p className="text-gray-500">创建新账户</p>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Item
            label="用户名"
            field="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" size="large" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            field="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" size="large" />
          </Form.Item>

          <Form.Item
            label="密码"
            field="password"
            rules={[
              { required: true, message: '请输入密码' },
              { minLength: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>

          <Form.Item
            label="确认密码"
            field="confirmPassword"
            rules={[
              { required: true, message: '请确认密码' },
              {
                validator: (value, callback) => {
                  // 自定义验证：密码一致性
                  const form = (callback as any)?.form;
                  if (value !== form?.getFieldValue('password')) {
                    callback('两次密码输入不一致');
                  } else {
                    callback();
                  }
                },
              },
            ]}
          >
            <Input.Password placeholder="请再次输入密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" long size="large">
              注册
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <span className="text-gray-500 text-sm">已有账户？</span>
            <Button
              type="text"
              onClick={() => navigate('/login')}
              className="text-blue-600"
            >
              立即登录
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
```

### 6.2 表单验证要点

#### ✅ 内置验证
- `required`: 必填验证
- `type: 'email'`: 邮箱格式验证
- `minLength`: 最小长度验证

#### ✅ 自定义验证
```typescript
{
  validator: (value, callback) => {
    const form = (callback as any)?.form;
    if (value !== form?.getFieldValue('password')) {
      callback('两次密码输入不一致');
    } else {
      callback();
    }
  },
}
```

## 7. 路由守卫实现

### 7.1 AuthGuard 组件

```typescript
// src/components/route-guard/auth-guard.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/user';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const token = useUserStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    // 未登录，重定向到登录页，并记录来源页面
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

### 7.2 使用方式

```typescript
// 在路由中使用
<Route
  path="workspace"
  element={
    <AuthGuard>
      <WorkspaceLayout />
    </AuthGuard>
  }
>
  {/* 子路由 */}
</Route>
```

### 7.3 守卫工作流程

```
用户访问受保护路由
       ↓
AuthGuard 检查 token
       ↓
    有 token？
    ↙     ↘
  是        否
  ↓          ↓
渲染内容   重定向到登录页
           (记录来源页面)
```

## 8. Token 管理

### 8.1 Token 存储策略

```typescript
// 双重存储：Zustand + localStorage
const setToken = (token) => {
  // 1. 更新 Zustand 状态（内存）
  set({ token });

  // 2. 持久化到 localStorage（磁盘）
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
};
```

**为什么双重存储？**
- **Zustand**：快速访问，组件响应
- **localStorage**：页面刷新后保持登录

### 8.2 Token 自动注入（API 拦截器）

```typescript
// src/services/api/interceptors.ts
import { useUserStore } from '@/stores/user';

client.interceptors.request.use(
  (config) => {
    // 从 Store 获取 token
    const token = useUserStore.getState().token;

    if (token) {
      // 自动添加到请求头
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);
```

### 8.3 Token 失效处理

```typescript
// 响应拦截器
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 401 未授权
    if (error.response?.status === 401) {
      const { logout } = useUserStore.getState();
      logout(); // 清理状态
      window.location.href = '/login'; // 跳转登录
    }

    return Promise.reject(error);
  }
);
```

## 9. 登录流程完整示例

### 9.1 用户操作流程

```typescript
// 1. 用户在登录页输入账号密码
<Form onSubmit={handleSubmit}>
  <Form.Item field="username">
    <Input />
  </Form.Item>
  <Form.Item field="password">
    <Input.Password />
  </Form.Item>
  <Button htmlType="submit">登录</Button>
</Form>

// 2. 提交表单，调用 Store 的 login
const handleSubmit = async (values: LoginRequest) => {
  try {
    await login(values); // 调用 Zustand action
    Message.success('登录成功！');
    navigate('/workspace');
  } catch (error) {
    Message.error('登录失败');
  }
};

// 3. Store 处理登录
login: async (credentials) => {
  set({ isLoading: true });

  // 调用 API
  const res = await userApi.login(credentials);

  // 更新状态
  set({
    user: res.user,
    token: res.token,
    isLoading: false,
  });

  // 持久化
  localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
}

// 4. 登录后访问受保护路由
// AuthGuard 检查 token，允许访问
```

### 9.2 自动登录（页面刷新后）

```typescript
// 1. 页面加载
// 2. Zustand persist 自动从 localStorage 恢复状态
// 3. 如果有 token，自动"登录"
// 4. AuthGuard 检查通过，直接进入工作空间
```

## 10. API 集成（真实实现）

### 10.1 用户 API

```typescript
// src/services/api/user.ts
import { client } from './client';
import type { LoginRequest, LoginResponse } from '@/types/user';

export const userApi = {
  // 登录
  login: async (data: LoginRequest) => {
    const res = await client.post<ApiResponse<LoginResponse>>(
      '/api/auth/login',
      data
    );
    return res.data.data;
  },

  // 注册
  register: async (data: RegisterRequest) => {
    const res = await client.post<ApiResponse<LoginResponse>>(
      '/api/auth/register',
      data
    );
    return res.data.data;
  },

  // 获取当前用户
  getCurrentUser: async () => {
    const res = await client.get<ApiResponse<User>>('/api/user/me');
    return res.data.data;
  },

  // 登出
  logout: async () => {
    await client.post('/api/auth/logout');
  },
};
```

### 10.2 在 Store 中使用

```typescript
// 替换 mock 数据
login: async (credentials) => {
  set({ isLoading: true });
  try {
    // 真实 API 调用
    const res = await userApi.login(credentials);

    set({
      user: res.user,
      token: res.token,
      isLoading: false,
    });

    localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
},
```

## 11. 最佳实践

### ✅ 推荐做法

1. **安全存储**
   - Token 存储在 localStorage（不是 cookie）
   - 敏感信息不存储在前端

2. **状态管理**
   - 使用 Zustand 统一管理
   - 持久化关键状态（user、token）

3. **错误处理**
   - 统一的错误提示
   - 登录失败清理状态

4. **用户体验**
   - 加载状态提示
   - 登录后跳回来源页面
   - 记住登录状态

5. **路由守卫**
   - 统一的认证检查
   - 未登录自动跳转

### ❌ 避免的做法

1. 不要在多个地方重复登录逻辑
2. 不要忘记清理登出后的状态
3. 不要在前端存储明文密码
4. 不要忘记处理 token 过期
5. 不要在组件中直接操作 localStorage

## 12. 调试技巧

### 12.1 查看当前登录状态

```typescript
// 在控制台执行
import { useUserStore } from '@/stores/user';

// 查看完整状态
console.log(useUserStore.getState());

// 查看用户信息
console.log(useUserStore.getState().user);

// 查看 token
console.log(useUserStore.getState().token);
```

### 12.2 手动登出

```typescript
// 控制台执行
useUserStore.getState().logout();
```

### 12.3 模拟 Token 过期

```typescript
// 清除 token
localStorage.removeItem('coze_lite_token');
// 刷新页面，会被守卫拦截
```

## 13. 扩展功能

### 13.1 记住我功能

```typescript
interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean; // 新增字段
}

// 根据 rememberMe 决定存储位置
const storage = rememberMe ? localStorage : sessionStorage;
storage.setItem(STORAGE_KEYS.TOKEN, token);
```

### 13.2 第三方登录

```typescript
// OAuth 登录
loginWithOAuth: async (provider: 'github' | 'google') => {
  // 跳转到第三方授权页
  window.location.href = `/api/auth/${provider}`;
}
```

### 13.3 双因素认证（2FA）

```typescript
interface LoginResponse {
  user?: User;
  token?: string;
  requires2FA?: boolean; // 需要二次验证
}

// 登录流程
if (res.requires2FA) {
  // 跳转到 2FA 页面
  navigate('/login/2fa');
} else {
  // 正常登录
  set({ user: res.user, token: res.token });
}
```

## 14. 总结

### 已实现功能
- ✅ 完整的登录页面（含加载状态）
- ✅ 注册页面（含表单验证）
- ✅ 用户状态管理（Zustand）
- ✅ Token 持久化存储
- ✅ 路由守卫（AuthGuard）
- ✅ 登录后跳转逻辑

### 待实现功能
- [ ] 真实 API 集成（替换 mock）
- [ ] Token 自动刷新
- [ ] 密码找回功能
- [ ] 个人资料编辑
- [ ] 头像上传

### 关键文件
```
✅ src/types/user.ts                   - 类型定义
✅ src/stores/user.ts                  - 状态管理
✅ src/pages/auth/login.tsx            - 登录页面
✅ src/pages/auth/register.tsx         - 注册页面
✅ src/components/route-guard/auth-guard.tsx - 路由守卫
⏳ src/services/api/user.ts            - API（待实现）
```

## 15. 下一步

完成账户系统后，可以继续：
- 📝 `08-workspace-module.md` - 工作空间模块
- 📝 `09-agent-ide-overview.md` - Agent IDE 总览

---

**源码参考**：
- Coze Studio: `frontend/packages/foundation/account-*`
- 当前实现：`frontend/src/stores/user.ts`, `frontend/src/pages/auth/`

**文档版本**：v1.0 | 2025-11-30
