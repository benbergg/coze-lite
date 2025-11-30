# 工作空间模块（Workspace Module）

> 基于 Coze Studio 源码分析和 Coze Lite 实现的工作空间模块技术文档

## 目录

1. [概述](#概述)
2. [Coze Studio 工作空间架构分析](#coze-studio-工作空间架构分析)
3. [核心概念](#核心概念)
4. [Coze Lite 实现](#coze-lite-实现)
5. [数据类型定义](#数据类型定义)
6. [状态管理](#状态管理)
7. [工作空间列表页](#工作空间列表页)
8. [工作空间切换逻辑](#工作空间切换逻辑)
9. [布局集成](#布局集成)
10. [最佳实践](#最佳实践)
11. [API 集成](#api-集成)
12. [未来扩展](#未来扩展)

---

## 概述

工作空间（Workspace）是 Coze 平台中组织和管理 AI Agent、Workflow、知识库等资源的容器。每个用户可以拥有多个工作空间，用于隔离不同项目或团队的资源。

### 工作空间的作用

- **资源隔离**：不同工作空间之间的资源相互独立
- **权限管理**：支持成员角色和权限控制
- **团队协作**：团队空间支持多人协作开发
- **项目组织**：按项目或部门组织 AI 资产

### 已实现功能

✅ 工作空间列表展示
✅ 工作空间创建（带表单验证）
✅ 工作空间切换逻辑
✅ 工作空间状态持久化
✅ 工作空间布局集成
✅ Mock 数据支持

🚧 待实现：
- 工作空间编辑和删除
- 成员管理和权限控制
- 工作空间转移
- 收藏夹功能

---

## Coze Studio 工作空间架构分析

### 包结构

Coze Studio 的工作空间功能分布在多个包中：

```
frontend/packages/foundation/
├── space-store/              # 工作空间状态管理（Base 层）
├── space-store-adapter/      # 工作空间状态适配器
├── space-ui-base/            # 工作空间 UI 组件（Base 层）
└── space-ui-adapter/         # 工作空间 UI 适配器

frontend/packages/common/
└── auth/src/space/           # 工作空间权限控制
    ├── constants.ts          # 权限枚举
    ├── calc-permission.ts    # 权限计算
    ├── use-space-auth.ts     # 权限钩子
    └── use-space-role.ts     # 角色钩子
```

### 核心文件分析

#### 1. 工作空间 Store（`space-store-adapter/src/space/index.ts`）

**关键代码结构**：

```typescript
interface SpaceStoreState {
  space: BotSpace;                    // 当前工作空间
  spaceList: BotSpace[];              // 所有工作空间列表
  recentlyUsedSpaceList: BotSpace[];  // 最近使用列表
  loading: false | Promise<SpaceInfo | undefined>;
  inited?: boolean;
  createdTeamSpaceNum: number;        // 创建的团队空间数量
  maxTeamSpaceNum: number;            // 最大团队空间数量
}

interface SpaceStoreAction {
  reset: () => void;
  getSpaceId: () => string;
  getPersonalSpaceID: () => string | undefined;
  checkSpaceID: (spaceID: string) => boolean;
  setSpace: (spaceId?: string) => void;
  createSpace: (request: SaveSpaceV2Request) => Promise<SaveSpaceRet>;
  exitSpace: (request: ExitSpaceV2Request) => Promise<string | undefined>;
  deleteSpace: (id: string) => Promise<string | undefined>;
  updateSpace: (request: SaveSpaceV2Request) => Promise<{...}>;
  transferSpace: (request: TransferSpaceV2Request) => Promise<string | undefined>;
  fetchSpaces: (force?: boolean) => Promise<SpaceInfo | undefined>;
}
```

**核心逻辑**：

1. **自动创建个人空间**：如果用户没有个人空间，自动创建
2. **轮询机制**：创建空间后轮询检查是否创建成功
3. **缓存机制**：使用 `loading` Promise 避免重复请求
4. **Devtools 集成**：使用 `zustand/middleware` 的 `devtools`

#### 2. 工作空间初始化（`space-ui-base/src/hooks/use-init-space.ts`）

**关键功能**：

- 路由参数中没有 `spaceId` 时，自动跳转到默认工作空间
- 从 localStorage 读取上次访问的工作空间和子菜单
- 验证工作空间 ID 的有效性
- 错误处理和提示

**回退逻辑**：

```typescript
const getFallbackWorkspaceURL = async (
  fallbackSpaceID: string,
  fallbackSpaceMenu: string,
  checkSpaceID: (id: string) => boolean,
) => {
  // 1. 优先使用 localStorage 中保存的 spaceId
  const targetSpaceId =
    (await localStorageService.getValueSync('workspace-spaceId')) ??
    fallbackSpaceID;

  // 2. 优先使用 localStorage 中保存的子菜单
  const targetSpaceSubMenu =
    (await localStorageService.getValueSync('workspace-subMenu')) ??
    fallbackSpaceMenu;

  // 3. 验证并返回 URL
  if (targetSpaceId && checkSpaceID(targetSpaceId)) {
    return `/space/${targetSpaceId}/${targetSpaceSubMenu}`;
  }

  return `/space/${fallbackSpaceID}/${targetSpaceSubMenu}`;
};
```

#### 3. 权限系统（`auth/src/space/constants.ts`）

**权限枚举**：

```typescript
enum ESpacePermisson {
  UpdateSpace,        // 更新工作空间
  DeleteSpace,        // 删除工作空间
  AddBotSpaceMember,  // 添加成员
  RemoveSpaceMember,  // 移除成员
  ExitSpace,          // 退出工作空间
  TransferSpace,      // 转移所有权
  UpdateSpaceMember,  // 更新成员权限
  API,                // 管理 API-KEY
}
```

**角色类型**：从 `@coze-arch/idl/developer_api` 导入

---

## 核心概念

### 工作空间类型

Coze Studio 支持两种类型的工作空间：

1. **个人空间（Personal Space）**
   - 每个用户自动拥有一个个人空间
   - 只有自己可以访问
   - 不计入团队空间配额

2. **团队空间（Team Space）**
   - 可以邀请成员协作
   - 支持角色和权限管理
   - 受配额限制（默认最多 3 个）

### 工作空间状态

- **当前工作空间**：用户正在访问的工作空间
- **工作空间列表**：用户有权访问的所有工作空间
- **最近使用**：最近访问过的工作空间（快速切换）
- **收藏夹**：用户收藏的 Agent/Workflow

### 工作空间生命周期

```
创建 → 配置 → 使用 → 归档/删除
  ↓      ↓      ↓
初始化  添加成员  资源管理
```

---

## Coze Lite 实现

### 简化策略

Coze Lite 简化了工作空间实现，去除了以下复杂特性：

❌ Base + Adapter 双层架构
❌ 企业组织（Enterprise）支持
❌ 复杂的成员和角色管理
❌ 工作空间配额限制
❌ 轮询创建机制

✅ 保留核心功能：
- 工作空间 CRUD
- 工作空间列表和切换
- 当前工作空间状态
- 简单的权限控制（未来）

### 技术栈

- **状态管理**：Zustand（无 persist，因为用户信息已持久化）
- **UI 组件**：Arco Design（Card, Modal, Form）
- **路由**：React Router v6（嵌套路由）
- **类型安全**：TypeScript 严格模式

---

## 数据类型定义

### Workspace 接口

**文件**：`frontend/src/types/workspace.ts`

```typescript
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 工作空间唯一标识符 |
| `name` | `string` | ✅ | 工作空间名称 |
| `description` | `string` | ❌ | 工作空间描述 |
| `createdAt` | `string` | ✅ | 创建时间（ISO 8601 格式） |
| `updatedAt` | `string` | ✅ | 更新时间（ISO 8601 格式） |

### 创建工作空间请求

```typescript
export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}
```

### Coze Studio 对比

Coze Studio 的 `BotSpace` 类型包含更多字段：

```typescript
interface BotSpace {
  id?: string;
  name?: string;
  description?: string;
  icon_uri?: string;
  space_type?: SpaceType;  // Personal | Team
  role_type?: SpaceRoleType;
  create_time?: number;
  update_time?: number;
}
```

**Coze Lite 简化**：
- 移除 `icon_uri`（使用默认图标）
- 移除 `space_type`（暂不区分个人/团队空间）
- 移除 `role_type`（暂不实现角色）
- 使用 ISO 字符串而非时间戳

---

## 状态管理

### Workspace Store

**文件**：`frontend/src/stores/workspace.ts`

```typescript
import { create } from 'zustand';
import type { Workspace, CreateWorkspaceRequest } from '@/types/workspace';

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;

  // Computed
  getCurrentWorkspace: () => Workspace | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (id: string) => void;
  createWorkspace: (data: CreateWorkspaceRequest) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
}
```

### Store 实现详解

#### 1. 状态定义

```typescript
export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: null,
  isLoading: false,

  // ...
}));
```

#### 2. 计算属性（Computed Getter）

```typescript
getCurrentWorkspace: () => {
  const { workspaces, currentWorkspaceId } = get();
  return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
},
```

**使用方式**：

```typescript
const getCurrentWorkspace = useWorkspaceStore((state) => state.getCurrentWorkspace);
const currentWorkspace = getCurrentWorkspace();
```

#### 3. 获取工作空间列表

```typescript
fetchWorkspaces: async () => {
  set({ isLoading: true });
  try {
    // TODO: 替换为真实 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockWorkspaces: Workspace[] = [
      {
        id: '1',
        name: '我的工作空间',
        description: '默认工作空间',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    set({ workspaces: mockWorkspaces, isLoading: false });
  } catch (error) {
    set({ isLoading: false });
    throw error;
  }
},
```

**特点**：
- 使用 async/await 处理异步请求
- 提供加载状态（`isLoading`）
- 错误处理
- Mock 数据支持（方便开发）

#### 4. 设置当前工作空间

```typescript
setCurrentWorkspace: (id) => {
  set({ currentWorkspaceId: id });
},
```

**应用场景**：
- 用户点击工作空间卡片
- 从 URL 参数初始化
- 工作空间切换

#### 5. 创建工作空间

```typescript
createWorkspace: async (data) => {
  // TODO: 替换为真实 API 调用
  const newWorkspace: Workspace = {
    id: Date.now().toString(),
    name: data.name,
    description: data.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  set((state) => ({
    workspaces: [...state.workspaces, newWorkspace],
  }));

  return newWorkspace;
},
```

**特点**：
- 返回新创建的工作空间对象
- 自动添加到工作空间列表
- 使用时间戳作为临时 ID

#### 6. 删除工作空间

```typescript
deleteWorkspace: async (id) => {
  // TODO: 替换为真实 API 调用
  set((state) => ({
    workspaces: state.workspaces.filter((w) => w.id !== id),
    currentWorkspaceId:
      state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
  }));
},
```

**特点**：
- 同时清理 `currentWorkspaceId`（如果删除的是当前工作空间）
- 使用函数式 setState 保证状态一致性

### Store 使用示例

```typescript
// 在组件中使用
function WorkspaceListPage() {
  // 1. 获取状态和方法
  const { workspaces, isLoading, fetchWorkspaces, createWorkspace } =
    useWorkspaceStore();

  // 2. 初始化数据
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // 3. 创建工作空间
  const handleCreate = async (values: CreateWorkspaceRequest) => {
    const workspace = await createWorkspace(values);
    navigate(`/workspace/${workspace.id}/agents`);
  };

  // ...
}
```

---

## 工作空间列表页

### 页面组件

**文件**：`frontend/src/pages/workspace/list.tsx`

### 功能特性

✅ 工作空间卡片展示
✅ 创建工作空间模态框
✅ 表单验证
✅ 加载状态
✅ 空状态提示
✅ 响应式布局

### 核心代码解析

#### 1. 组件结构

```typescript
import { useEffect, useState } from 'react';
import { Button, Card, Empty, Spin, Modal, Form, Input, Message } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/workspace';
import type { CreateWorkspaceRequest } from '@/types/workspace';

const FormItem = Form.Item;

export default function WorkspaceListPage() {
  const navigate = useNavigate();
  const { workspaces, isLoading, fetchWorkspaces, createWorkspace } =
    useWorkspaceStore();

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);

  // ...
}
```

#### 2. 数据初始化

```typescript
useEffect(() => {
  fetchWorkspaces();
}, [fetchWorkspaces]);
```

**注意事项**：
- `fetchWorkspaces` 作为依赖项
- Zustand 的 actions 是稳定的，不会导致无限循环

#### 3. 创建工作空间处理

```typescript
const handleCreate = async (values: CreateWorkspaceRequest) => {
  try {
    const workspace = await createWorkspace(values);
    Message.success('工作空间创建成功！');
    setModalVisible(false);
    form.resetFields();
    navigate(`/workspace/${workspace.id}/agents`);
  } catch (error) {
    Message.error('创建失败，请重试');
  }
};
```

**流程**：
1. 调用 Store 的 `createWorkspace`
2. 显示成功提示
3. 关闭模态框并重置表单
4. 导航到新工作空间的 Agents 页面

#### 4. 加载状态

```typescript
if (isLoading) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Spin size={40} />
    </div>
  );
}
```

#### 5. 工作空间列表渲染

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {workspaces.map((workspace) => (
    <Card
      key={workspace.id}
      hoverable
      className="cursor-pointer"
      onClick={() => navigate(`/workspace/${workspace.id}/agents`)}
    >
      <div className="mb-2">
        <h3 className="text-lg font-semibold">{workspace.name}</h3>
      </div>
      {workspace.description && (
        <p className="text-gray-500 text-sm line-clamp-2">
          {workspace.description}
        </p>
      )}
      <div className="mt-4 text-xs text-gray-400">
        创建于 {new Date(workspace.createdAt).toLocaleDateString()}
      </div>
    </Card>
  ))}
</div>
```

**样式特点**：
- 响应式网格布局（1/2/3 列）
- Hover 效果
- 文本截断（`line-clamp-2`）
- 日期格式化

#### 6. 创建模态框

```typescript
<Modal
  title="创建工作空间"
  visible={modalVisible}
  onCancel={() => setModalVisible(false)}
  onOk={() => form.submit()}
  autoFocus={false}
  focusLock={true}
>
  <Form form={form} onSubmit={handleCreate}>
    <FormItem
      label="工作空间名称"
      field="name"
      rules={[{ required: true, message: '请输入工作空间名称' }]}
    >
      <Input placeholder="请输入工作空间名称" />
    </FormItem>
    <FormItem label="描述（可选）" field="description">
      <Input.TextArea
        placeholder="请输入描述"
        rows={3}
        maxLength={200}
      />
    </FormItem>
  </Form>
</Modal>
```

**表单验证**：
- `name` 字段必填
- `description` 可选，最多 200 字符

---

## 工作空间切换逻辑

### 路由结构

```typescript
// frontend/src/routes/index.tsx
<Route path="workspace" element={
  <AuthGuard>
    <WorkspaceLayout />
  </AuthGuard>
}>
  <Route index element={<WorkspaceListPage />} />
  <Route path=":workspaceId">
    <Route index element={<Navigate to="agents" replace />} />
    <Route path="agents" element={<AgentListPage />} />
    <Route path="workflows" element={<WorkflowListPage />} />
    <Route path="library" element={<LibraryPage />} />
  </Route>
</Route>
```

### URL 结构

```
/workspace                          → 工作空间列表
/workspace/:workspaceId             → 自动重定向到 agents
/workspace/:workspaceId/agents      → Agent 列表
/workspace/:workspaceId/workflows   → Workflow 列表
/workspace/:workspaceId/library     → 资源库
```

### 切换流程

```
用户点击工作空间卡片
  ↓
navigate(`/workspace/${id}/agents`)
  ↓
WorkspaceLayout 获取 workspaceId
  ↓
传递给 Sidebar 组件
  ↓
Sidebar 渲染工作空间相关菜单
```

### 关键代码

#### WorkspaceLayout

```typescript
// frontend/src/components/layout/workspace-layout.tsx
export function WorkspaceLayout() {
  const { workspaceId } = useParams();

  return (
    <Layout className="h-full">
      <Sider width={240}>
        <Sidebar workspaceId={workspaceId} />
      </Sider>
      <Layout className="flex-1">
        <Header />
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

#### Sidebar 动态菜单

```typescript
// frontend/src/components/layout/sidebar.tsx
export function Sidebar({ workspaceId }: SidebarProps) {
  const menuItems = [
    {
      key: 'home',
      icon: <IconHome />,
      label: '首页',
      path: '/workspace',
    },
    // 只有在工作空间内才显示以下菜单
    ...(workspaceId
      ? [
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
        ]
      : []),
  ];

  // ...
}
```

### 持久化当前工作空间（未来）

可以使用 localStorage 或 Zustand persist 记住用户最后访问的工作空间：

```typescript
// 未来实现示例
useEffect(() => {
  if (workspaceId) {
    localStorage.setItem('last-workspace-id', workspaceId);
  }
}, [workspaceId]);

// 在根路由或 App.tsx 中重定向
useEffect(() => {
  const lastWorkspaceId = localStorage.getItem('last-workspace-id');
  if (lastWorkspaceId && location.pathname === '/') {
    navigate(`/workspace/${lastWorkspaceId}/agents`);
  }
}, []);
```

---

## 布局集成

### WorkspaceLayout 组件

**文件**：`frontend/src/components/layout/workspace-layout.tsx`

```typescript
import { Outlet, useParams } from 'react-router-dom';
import { Layout } from '@arco-design/web-react';
import { Sidebar } from './sidebar';
import { Header } from './header';

const { Sider, Content } = Layout;

export function WorkspaceLayout() {
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

### 布局特点

- **固定侧边栏宽度**：240px
- **响应式内容区**：flex-1 自适应剩余空间
- **滚动容器**：Content 区域独立滚动
- **背景色区分**：侧边栏白色，内容区灰色

### Sidebar 集成

Sidebar 根据 `workspaceId` 动态显示菜单项：

```typescript
const menuItems = [
  { key: 'home', label: '首页', path: '/workspace' },
  ...(workspaceId ? [
    { key: 'agents', label: 'Agents', path: `/workspace/${workspaceId}/agents` },
    { key: 'library', label: '资源库', path: `/workspace/${workspaceId}/library` },
  ] : []),
];
```

---

## 最佳实践

### 1. 状态管理

✅ **推荐做法**：

```typescript
// ✅ 使用 selector 避免不必要的重渲染
const workspaces = useWorkspaceStore((state) => state.workspaces);
const isLoading = useWorkspaceStore((state) => state.isLoading);

// ✅ 批量获取相关状态
const { workspaces, isLoading, fetchWorkspaces } = useWorkspaceStore();
```

❌ **避免做法**：

```typescript
// ❌ 不要订阅整个 store
const store = useWorkspaceStore();  // 导致所有状态变化都重渲染
```

### 2. 数据获取

✅ **推荐做法**：

```typescript
// ✅ 在组件挂载时获取数据
useEffect(() => {
  fetchWorkspaces();
}, [fetchWorkspaces]);

// ✅ 处理加载和错误状态
if (isLoading) return <Spin />;
if (error) return <ErrorMessage error={error} />;
```

❌ **避免做法**：

```typescript
// ❌ 不要在渲染阶段调用
fetchWorkspaces();  // 会导致无限循环
```

### 3. 表单处理

✅ **推荐做法**：

```typescript
// ✅ 使用 Arco Design Form 的 onSubmit
<Form form={form} onSubmit={handleCreate}>
  {/* ... */}
</Form>

const handleCreate = async (values: CreateWorkspaceRequest) => {
  try {
    await createWorkspace(values);
    Message.success('创建成功');
    form.resetFields();
  } catch (error) {
    Message.error('创建失败');
  }
};
```

❌ **避免做法**：

```typescript
// ❌ 不要手动读取表单值
const values = {
  name: nameInput.value,
  description: descInput.value,
};
```

### 4. 导航逻辑

✅ **推荐做法**：

```typescript
// ✅ 创建成功后立即导航
const workspace = await createWorkspace(values);
navigate(`/workspace/${workspace.id}/agents`);

// ✅ 使用 replace 避免历史记录堆积
<Route index element={<Navigate to="agents" replace />} />
```

### 5. 类型安全

✅ **推荐做法**：

```typescript
// ✅ 始终定义类型
interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

const handleCreate = async (values: CreateWorkspaceRequest) => {
  // TypeScript 确保类型正确
};
```

### 6. 错误处理

✅ **推荐做法**：

```typescript
try {
  await createWorkspace(values);
  Message.success('操作成功');
} catch (error) {
  console.error('Create workspace error:', error);
  Message.error('操作失败，请重试');
}
```

---

## API 集成

### API 设计（未来实现）

#### 1. 获取工作空间列表

```typescript
GET /api/workspaces

Response:
{
  "code": 0,
  "data": {
    "workspaces": [
      {
        "id": "ws_123",
        "name": "我的工作空间",
        "description": "默认工作空间",
        "createdAt": "2025-11-30T10:00:00Z",
        "updatedAt": "2025-11-30T10:00:00Z"
      }
    ]
  }
}
```

#### 2. 创建工作空间

```typescript
POST /api/workspaces
Content-Type: application/json

Request:
{
  "name": "新工作空间",
  "description": "用于测试"
}

Response:
{
  "code": 0,
  "data": {
    "id": "ws_124",
    "name": "新工作空间",
    "description": "用于测试",
    "createdAt": "2025-11-30T11:00:00Z",
    "updatedAt": "2025-11-30T11:00:00Z"
  }
}
```

#### 3. 更新工作空间

```typescript
PUT /api/workspaces/:id
Content-Type: application/json

Request:
{
  "name": "更新后的名称",
  "description": "更新后的描述"
}
```

#### 4. 删除工作空间

```typescript
DELETE /api/workspaces/:id

Response:
{
  "code": 0,
  "message": "删除成功"
}
```

### API 客户端实现

**文件**：`frontend/src/services/api/workspace.ts`（未来创建）

```typescript
import { apiClient } from './client';
import type { Workspace, CreateWorkspaceRequest } from '@/types/workspace';

export const workspaceApi = {
  // 获取工作空间列表
  list: async (): Promise<Workspace[]> => {
    const { data } = await apiClient.get<{ workspaces: Workspace[] }>('/workspaces');
    return data.workspaces;
  },

  // 创建工作空间
  create: async (payload: CreateWorkspaceRequest): Promise<Workspace> => {
    const { data } = await apiClient.post<Workspace>('/workspaces', payload);
    return data;
  },

  // 更新工作空间
  update: async (id: string, payload: CreateWorkspaceRequest): Promise<Workspace> => {
    const { data } = await apiClient.put<Workspace>(`/workspaces/${id}`, payload);
    return data;
  },

  // 删除工作空间
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workspaces/${id}`);
  },
};
```

### 更新 Store 以使用 API

```typescript
// frontend/src/stores/workspace.ts
import { workspaceApi } from '@/services/api/workspace';

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  // ...

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const workspaces = await workspaceApi.list();
      set({ workspaces, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createWorkspace: async (data) => {
    const newWorkspace = await workspaceApi.create(data);
    set((state) => ({
      workspaces: [...state.workspaces, newWorkspace],
    }));
    return newWorkspace;
  },

  deleteWorkspace: async (id) => {
    await workspaceApi.delete(id);
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspaceId:
        state.currentWorkspaceId === id ? null : state.currentWorkspaceId,
    }));
  },
}));
```

---

## 未来扩展

### 1. 工作空间编辑

**UI 设计**：

- 在工作空间卡片上添加"编辑"按钮
- 弹出模态框，预填充当前信息
- 支持修改名称和描述

**实现示例**：

```typescript
const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

const handleEdit = async (values: CreateWorkspaceRequest) => {
  if (!editingWorkspace) return;

  await updateWorkspace(editingWorkspace.id, values);
  Message.success('更新成功');
  setEditingWorkspace(null);
};

<Modal
  title="编辑工作空间"
  visible={!!editingWorkspace}
  onCancel={() => setEditingWorkspace(null)}
>
  <Form
    form={form}
    initialValues={{
      name: editingWorkspace?.name,
      description: editingWorkspace?.description,
    }}
    onSubmit={handleEdit}
  >
    {/* 表单字段 */}
  </Form>
</Modal>
```

### 2. 工作空间删除

**安全措施**：

- 二次确认对话框
- 显示警告信息（删除后无法恢复）
- 检查工作空间内是否有资源

```typescript
const handleDelete = (workspace: Workspace) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除工作空间"${workspace.name}"吗？此操作无法撤销。`,
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      await deleteWorkspace(workspace.id);
      Message.success('删除成功');
    },
  });
};
```

### 3. 成员管理

**功能设计**：

- 工作空间设置页面
- 成员列表展示
- 邀请成员（通过邮箱）
- 角色分配（Owner, Admin, Member）
- 移除成员

**数据类型**：

```typescript
interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  email: string;
  username: string;
  joinedAt: string;
}

interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member';
}
```

### 4. 权限控制

**权限矩阵**：

| 操作 | Owner | Admin | Member |
|------|-------|-------|--------|
| 查看工作空间 | ✅ | ✅ | ✅ |
| 创建 Agent | ✅ | ✅ | ✅ |
| 编辑 Agent | ✅ | ✅ | ❌ |
| 删除 Agent | ✅ | ✅ | ❌ |
| 邀请成员 | ✅ | ✅ | ❌ |
| 移除成员 | ✅ | ✅ | ❌ |
| 编辑工作空间 | ✅ | ✅ | ❌ |
| 删除工作空间 | ✅ | ❌ | ❌ |
| 转移所有权 | ✅ | ❌ | ❌ |

**实现方式**：

```typescript
// 权限钩子
const useWorkspacePermission = (workspaceId: string) => {
  const currentUser = useUserStore((state) => state.user);
  const workspace = useWorkspaceStore((state) =>
    state.workspaces.find((w) => w.id === workspaceId)
  );

  const member = workspace?.members?.find((m) => m.userId === currentUser?.id);

  return {
    canEdit: member?.role === 'owner' || member?.role === 'admin',
    canDelete: member?.role === 'owner',
    canInvite: member?.role === 'owner' || member?.role === 'admin',
    isOwner: member?.role === 'owner',
  };
};

// 使用示例
const { canEdit, canDelete } = useWorkspacePermission(workspaceId);

{canEdit && <Button onClick={handleEdit}>编辑</Button>}
{canDelete && <Button status="danger" onClick={handleDelete}>删除</Button>}
```

### 5. 收藏夹功能

**功能设计**：

- 收藏常用的 Agent 和 Workflow
- 在侧边栏快速访问
- 跨工作空间收藏

**数据类型**：

```typescript
interface Favorite {
  id: string;
  userId: string;
  resourceType: 'agent' | 'workflow';
  resourceId: string;
  workspaceId: string;
  createdAt: string;
}
```

**Sidebar 集成**：

```typescript
// 侧边栏显示收藏夹
<div className="mt-4 px-4">
  <h3 className="text-xs font-semibold text-gray-500 mb-2">收藏夹</h3>
  <Menu>
    {favorites.map((favorite) => (
      <Menu.Item
        key={favorite.id}
        onClick={() => navigate(favorite.path)}
      >
        <IconStar />
        {favorite.name}
      </Menu.Item>
    ))}
  </Menu>
</div>
```

### 6. 最近访问列表

**功能设计**：

- 记录最近访问的工作空间
- 快速切换（类似浏览器历史）
- 限制数量（如最多 5 个）

**实现示例**：

```typescript
// 在 Store 中添加
recentWorkspaces: string[] = [];

// 访问工作空间时更新
const visitWorkspace = (id: string) => {
  set((state) => {
    const recent = [id, ...state.recentWorkspaces.filter((wid) => wid !== id)];
    return {
      currentWorkspaceId: id,
      recentWorkspaces: recent.slice(0, 5),  // 保留最近 5 个
    };
  });
};
```

### 7. 工作空间图标

**功能设计**：

- 支持上传自定义图标
- 提供默认图标库
- 在列表和侧边栏显示

**类型扩展**：

```typescript
interface Workspace {
  // ...
  iconUrl?: string;
  iconColor?: string;  // 默认图标的颜色
}
```

**UI 实现**：

```typescript
<Card>
  <div className="flex items-start gap-3">
    <Avatar
      size={48}
      style={{ backgroundColor: workspace.iconColor }}
    >
      {workspace.iconUrl ? (
        <img src={workspace.iconUrl} alt="" />
      ) : (
        workspace.name.charAt(0).toUpperCase()
      )}
    </Avatar>
    <div>
      <h3>{workspace.name}</h3>
      <p>{workspace.description}</p>
    </div>
  </div>
</Card>
```

### 8. 工作空间模板

**功能设计**：

- 预定义的工作空间模板
- 包含示例 Agent 和 Workflow
- 快速开始学习

**模板示例**：

```typescript
interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  includedResources: {
    agents: string[];      // Agent 模板 ID
    workflows: string[];   // Workflow 模板 ID
  };
}

const templates: WorkspaceTemplate[] = [
  {
    id: 'customer-service',
    name: '客服助手',
    description: '包含客服 Agent 和常用工作流',
    icon: '💬',
    includedResources: {
      agents: ['customer-service-agent'],
      workflows: ['ticket-routing', 'auto-reply'],
    },
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    description: '数据分析和可视化工作空间',
    icon: '📊',
    includedResources: {
      agents: ['data-analyst-agent'],
      workflows: ['etl-pipeline', 'report-generation'],
    },
  },
];
```

---

## 调试技巧

### 1. Zustand DevTools

安装 Redux DevTools 浏览器扩展后，可以查看工作空间状态变化：

```typescript
// Store 已配置 devtools（如果需要）
import { devtools } from 'zustand/middleware';

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    (set, get) => ({
      // ...
    }),
    { name: 'WorkspaceStore' }
  )
);
```

### 2. React DevTools

查看组件 Props 和 State：

- 选择 `WorkspaceListPage` 组件
- 查看 `hooks` → `State`
- 查看 Zustand Store 的值

### 3. 网络请求调试

当集成真实 API 后：

```typescript
// 在 Store 中添加日志
fetchWorkspaces: async () => {
  console.log('[WorkspaceStore] Fetching workspaces...');
  set({ isLoading: true });
  try {
    const workspaces = await workspaceApi.list();
    console.log('[WorkspaceStore] Fetched:', workspaces);
    set({ workspaces, isLoading: false });
  } catch (error) {
    console.error('[WorkspaceStore] Fetch error:', error);
    set({ isLoading: false });
    throw error;
  }
},
```

---

## 总结

### 已实现的功能

✅ 工作空间数据类型定义
✅ 工作空间 Store（Zustand）
✅ 工作空间列表页面
✅ 工作空间创建功能
✅ 工作空间切换逻辑
✅ WorkspaceLayout 布局组件
✅ 动态侧边栏菜单
✅ Mock 数据支持

### 与 Coze Studio 的差异

| 特性 | Coze Studio | Coze Lite |
|------|-------------|-----------|
| 架构模式 | Base + Adapter | 直接实现 |
| 工作空间类型 | Personal + Team | 不区分类型 |
| 权限控制 | 8 种权限 + 角色 | 暂未实现 |
| 成员管理 | 完整支持 | 暂未实现 |
| 收藏夹 | 支持 | 暂未实现 |
| 配额限制 | 团队空间限制 | 无限制 |
| 图标系统 | 支持自定义 | 暂未实现 |
| 最近访问 | 支持 | 暂未实现 |

### 下一步计划

1. **集成真实 API**（优先级：高）
   - 替换 Mock 数据
   - 实现完整的 CRUD 操作

2. **工作空间编辑和删除**（优先级：高）
   - 编辑模态框
   - 删除确认对话框

3. **权限系统**（优先级：中）
   - 定义角色和权限
   - 实现权限检查钩子

4. **成员管理**（优先级：中）
   - 成员列表页面
   - 邀请和移除成员

5. **收藏夹和最近访问**（优先级：低）
   - 收藏夹 UI
   - 最近访问记录

---

## 参考资源

### Coze Studio 源码

- `packages/foundation/space-store-adapter/` - 工作空间状态管理
- `packages/foundation/space-ui-base/` - 工作空间 UI 组件
- `packages/common/auth/src/space/` - 工作空间权限控制

### Coze Lite 相关文件

- `frontend/src/types/workspace.ts` - 类型定义
- `frontend/src/stores/workspace.ts` - 状态管理
- `frontend/src/pages/workspace/list.tsx` - 列表页面
- `frontend/src/components/layout/workspace-layout.tsx` - 布局组件
- `frontend/src/components/layout/sidebar.tsx` - 侧边栏

### 相关文档

- [05-state-management.md](./05-state-management.md) - Zustand 状态管理详解
- [04-routing-layout.md](./04-routing-layout.md) - 路由和布局系统
- [07-account-system.md](./07-account-system.md) - 账户系统模块

---

**文档版本**：1.0
**最后更新**：2025-11-30
**作者**：Coze Lite Team
