# 路由和布局系统

> 基于 Coze Studio 的路由和布局实现，为 Coze Lite 提供完整的导航和页面结构方案

## 1. Coze Studio 路由架构分析

### 1.1 路由结构

Coze Studio 使用 **React Router v6** 的嵌套路由：

```typescript
路由层级：
/                           # 根布局
├── /sign                  # 登录/注册（无侧边栏）
├── /space                 # 工作空间布局（有侧边栏）
│   └── /:space_id        # 特定空间
│       ├── /develop      # 开发页
│       ├── /library      # 资源库
│       ├── /bot/:bot_id  # Agent 编辑器（无侧边栏）
│       └── /project-ide/:project_id  # 项目编辑器
├── /work_flow            # 独立工作流编辑器
└── /explore              # 探索/商店
    ├── /plugin
    └── /template
```

### 1.2 核心特点

- ✅ **嵌套路由**：通过 `children` 实现多层布局
- ✅ **路由元数据**：使用 `loader` 配置布局属性
- ✅ **懒加载**：页面组件按需加载
- ✅ **布局复用**：不同路由共享布局组件

## 2. 布局系统

### 2.1 布局层次

```
GlobalLayout (全局布局)
├── Banner (可选顶部横幅)
├── Sider (侧边栏 - 可选)
│   ├── Logo
│   ├── Navigation Menu
│   └── User Profile
└── Content (主内容区)
    ├── Header (可选)
    └── Main Content
```

### 2.2 布局组件分析

**源码位置**：`frontend/packages/foundation/layout`

```typescript
// GlobalLayout 核心结构
<GlobalLayout hasSider={true}>
  {/* 响应式处理：桌面显示侧边栏，移动端显示抽屉 */}
  {hasSider && <Sider />}

  <Layout>
    {/* 页面内容通过 <Outlet /> 渲染 */}
    {children}
  </Layout>
</GlobalLayout>
```

## 3. Coze Lite 路由实现

### 3.1 路由配置

```typescript
// src/routes/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { RootLayout } from '@/components/layout/root-layout';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';

// 懒加载页面组件
const LoginPage = lazy(() => import('@/pages/auth/login'));
const RegisterPage = lazy(() => import('@/pages/auth/register'));
const WorkspaceListPage = lazy(() => import('@/pages/workspace/list'));
const AgentListPage = lazy(() => import('@/pages/workspace/agent-list'));
const AgentEditorPage = lazy(() => import('@/pages/agent/editor'));
const WorkflowEditorPage = lazy(() => import('@/pages/workflow/editor'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/workspace" replace />,
      },

      // 认证路由（无侧边栏）
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },

      // 工作空间路由（有侧边栏）
      {
        path: 'workspace',
        element: <WorkspaceLayout />,
        children: [
          {
            index: true,
            element: <WorkspaceListPage />,
          },
          {
            path: ':workspaceId',
            children: [
              {
                index: true,
                element: <Navigate to="agents" replace />,
              },
              {
                path: 'agents',
                element: <AgentListPage />,
              },
              {
                path: 'library',
                element: <div>资源库</div>,
              },
            ],
          },
        ],
      },

      // Agent 编辑器（全屏，无侧边栏）
      {
        path: 'agent/:agentId',
        element: <AgentEditorPage />,
      },

      // Workflow 编辑器（全屏）
      {
        path: 'workflow/:workflowId',
        element: <WorkflowEditorPage />,
      },
    ],
  },
]);
```

### 3.2 路由类型定义

```typescript
// src/types/route.ts
export interface RouteConfig {
  hasSider?: boolean;        // 是否显示侧边栏
  requireAuth?: boolean;     // 是否需要登录
  title?: string;           // 页面标题
  breadcrumb?: string[];    // 面包屑
}

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  WORKSPACE: '/workspace',
  WORKSPACE_DETAIL: '/workspace/:workspaceId',
  AGENTS: '/workspace/:workspaceId/agents',
  AGENT_EDITOR: '/agent/:agentId',
  WORKFLOW_EDITOR: '/workflow/:workflowId',
} as const;
```

## 4. 布局组件实现

### 4.1 根布局组件

```typescript
// src/components/layout/root-layout.tsx
import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { Spin } from '@arco-design/web-react';

export function RootLayout() {
  return (
    <div className="w-full h-full">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Spin size={40} />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
```

### 4.2 工作空间布局组件

```typescript
// src/components/layout/workspace-layout.tsx
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@arco-design/web-react';
import { Sidebar } from './sidebar';
import { Header } from './header';

const { Sider, Content } = Layout;

export function WorkspaceLayout() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  return (
    <Layout className="h-full">
      <Sider
        width={240}
        className="h-full border-r border-gray-200"
        style={{ backgroundColor: '#fff' }}
      >
        <Sidebar workspaceId={workspaceId} />
      </Sider>

      <Layout className="flex-1">
        <Header />
        <Content className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

### 4.3 侧边栏组件

```typescript
// src/components/layout/sidebar.tsx
import { Menu } from '@arco-design/web-react';
import { IconHome, IconRobot, IconApps } from '@arco-design/web-react/icon';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  workspaceId?: string;
}

export function Sidebar({ workspaceId }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: 'home',
      icon: <IconHome />,
      label: '首页',
      path: '/workspace',
    },
    {
      key: 'agents',
      icon: <IconRobot />,
      label: 'Agents',
      path: `/workspace/${workspaceId}/agents`,
    },
    {
      key: 'library',
      icon: <IconApps />,
      label: '资源库',
      path: `/workspace/${workspaceId}/library`,
    },
  ];

  const selectedKeys = menuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .map((item) => item.key);

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">Coze Lite</h1>
      </div>

      {/* 导航菜单 */}
      <Menu
        selectedKeys={selectedKeys}
        onClickMenuItem={(key) => {
          const item = menuItems.find((i) => i.key === key);
          if (item) navigate(item.path);
        }}
        style={{ flex: 1 }}
      >
        {menuItems.map((item) => (
          <Menu.Item key={item.key}>
            {item.icon}
            {item.label}
          </Menu.Item>
        ))}
      </Menu>

      {/* 用户信息 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
            U
          </div>
          <span>用户名</span>
        </div>
      </div>
    </div>
  );
}
```

### 4.4 头部组件

```typescript
// src/components/layout/header.tsx
import { Button } from '@arco-design/web-react';
import { IconSave, IconSettings } from '@arco-design/web-react/icon';

export function Header() {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">工作空间</span>
        <span className="text-gray-300">/</span>
        <span>Agents</span>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <Button icon={<IconSave />}>保存</Button>
        <Button icon={<IconSettings />} type="secondary" />
      </div>
    </div>
  );
}
```

## 5. 路由守卫

### 5.1 认证守卫

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

**使用方式**：

```typescript
// 在路由配置中使用
{
  path: 'workspace',
  element: (
    <AuthGuard>
      <WorkspaceLayout />
    </AuthGuard>
  ),
}
```

### 5.2 权限守卫

```typescript
// src/components/route-guard/permission-guard.tsx
import { Navigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: string;
}

export function PermissionGuard({
  children,
  requiredPermission,
}: PermissionGuardProps) {
  const user = useUserStore((state) => state.user);

  if (!user?.permissions.includes(requiredPermission)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
```

## 6. 面包屑导航

### 6.1 面包屑组件

```typescript
// src/components/breadcrumb/index.tsx
import { Breadcrumb } from '@arco-design/web-react';
import { useMatches, useNavigate } from 'react-router-dom';

export function AppBreadcrumb() {
  const matches = useMatches();
  const navigate = useNavigate();

  // 从路由配置中提取面包屑信息
  const breadcrumbs = matches
    .filter((match: any) => match.handle?.breadcrumb)
    .map((match: any) => ({
      label: match.handle.breadcrumb,
      path: match.pathname,
    }));

  return (
    <Breadcrumb>
      {breadcrumbs.map((item, index) => (
        <Breadcrumb.Item
          key={item.path}
          onClick={() => {
            if (index < breadcrumbs.length - 1) {
              navigate(item.path);
            }
          }}
        >
          {item.label}
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  );
}
```

### 6.2 路由配置中添加 handle

```typescript
{
  path: 'workspace/:workspaceId/agents',
  element: <AgentListPage />,
  handle: {
    breadcrumb: 'Agents',
  },
}
```

## 7. 响应式布局

### 7.1 响应式 Hook

```typescript
// src/hooks/use-responsive.ts
import { useState, useEffect } from 'react';

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile };
}
```

### 7.2 响应式侧边栏

```typescript
// src/components/layout/workspace-layout.tsx (更新版)
import { Drawer } from '@arco-design/web-react';
import { useResponsive } from '@/hooks/use-responsive';
import { useState } from 'react';

export function WorkspaceLayout() {
  const { isMobile } = useResponsive();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const sidebarContent = <Sidebar />;

  return (
    <Layout className="h-full">
      {/* 桌面端：固定侧边栏 */}
      {!isMobile && (
        <Sider width={240}>
          {sidebarContent}
        </Sider>
      )}

      {/* 移动端：抽屉 */}
      {isMobile && (
        <Drawer
          visible={drawerVisible}
          onCancel={() => setDrawerVisible(false)}
          placement="left"
          width={240}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout className="flex-1">
        {/* 移动端显示菜单按钮 */}
        {isMobile && (
          <button onClick={() => setDrawerVisible(true)}>
            菜单
          </button>
        )}
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

## 8. 路由跳转和导航

### 8.1 编程式导航

```typescript
import { useNavigate, useParams } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();

  const goToAgent = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  const goBack = () => {
    navigate(-1); // 返回上一页
  };

  return (
    <div>
      <button onClick={() => goToAgent('123')}>打开 Agent</button>
      <button onClick={goBack}>返回</button>
    </div>
  );
}
```

### 8.2 声明式导航

```typescript
import { Link, NavLink } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      {/* 普通链接 */}
      <Link to="/workspace">工作空间</Link>

      {/* 带样式的活动链接 */}
      <NavLink
        to="/workspace"
        className={({ isActive }) =>
          isActive ? 'text-blue-500' : 'text-gray-700'
        }
      >
        工作空间
      </NavLink>
    </nav>
  );
}
```

## 9. 错误边界

### 9.1 错误页面

```typescript
// src/pages/error/404.tsx
import { Button } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-gray-500 mt-4">页面不存在</p>
      <Button type="primary" className="mt-6" onClick={() => navigate('/')}>
        返回首页
      </Button>
    </div>
  );
}
```

### 9.2 全局错误边界

```typescript
// src/components/error-boundary/index.tsx
import { Component, ReactNode } from 'react';
import { Button } from '@arco-design/web-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-red-500">出错了</h1>
          <p className="text-gray-500 mt-2">{this.state.error?.message}</p>
          <Button
            type="primary"
            className="mt-6"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 10. 完整示例

### 10.1 App.tsx 完整配置

```typescript
// src/app.tsx
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import { ErrorBoundary } from '@/components/error-boundary';
import { router } from './routes';

export function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </ErrorBoundary>
  );
}
```

### 10.2 目录结构

```
src/
├── components/
│   ├── layout/
│   │   ├── root-layout.tsx        # 根布局
│   │   ├── workspace-layout.tsx   # 工作空间布局
│   │   ├── sidebar.tsx            # 侧边栏
│   │   └── header.tsx             # 头部
│   ├── route-guard/
│   │   ├── auth-guard.tsx         # 认证守卫
│   │   └── permission-guard.tsx   # 权限守卫
│   ├── breadcrumb/
│   │   └── index.tsx              # 面包屑
│   └── error-boundary/
│       └── index.tsx              # 错误边界
├── pages/
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── workspace/
│   │   ├── list.tsx
│   │   └── agent-list.tsx
│   ├── agent/
│   │   └── editor.tsx
│   ├── workflow/
│   │   └── editor.tsx
│   └── error/
│       ├── 404.tsx
│       └── 403.tsx
└── routes/
    └── index.tsx                  # 路由配置
```

## 11. 最佳实践

### ✅ 推荐做法

1. **路由懒加载**：使用 `lazy()` 加载页面组件
2. **嵌套路由**：利用嵌套路由复用布局
3. **路由守卫**：统一处理认证和权限
4. **错误处理**：提供友好的错误页面
5. **响应式**：适配移动端和桌面端

### ❌ 避免的做法

1. 不要在组件内硬编码路由路径
2. 不要过度嵌套路由（超过 3 层）
3. 不要忘记处理 404 情况
4. 不要在每个页面重复布局代码

## 12. 对比 Coze Studio

| 特性 | Coze Studio | Coze Lite |
|------|-------------|-----------|
| 路由库 | React Router v6 ✅ | React Router v6 ✅ |
| 布局方式 | Layout 组件 + Outlet | 同左 ✅ |
| 路由元数据 | loader 函数 | handle 属性 |
| 响应式 | SideSheet（抽屉） | Drawer |
| 复杂度 | 高（适配器模式） | 简化 |

## 13. 下一步

完成路由和布局后：
- 📝 `05-state-management.md` - 状态管理
- 📝 `06-api-integration.md` - API 集成
- 📝 `07-account-system.md` - 账户系统实现

---

**源码参考**：
- Coze 路由配置：`apps/coze-studio/src/routes/index.tsx`
- Coze 布局组件：`packages/foundation/layout`

**文档版本**：v1.0 | 2025-11-30
