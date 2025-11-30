# Coze Lite 前端实现指南

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **目的**: 为后续代码编写提供目录结构和规范说明

## 一、项目结构总览

```
coze-lite/
├── docs/                          # 文档目录
│   └── frontend/                  # 前端开发文档
│       ├── 00-documentation-plan.md
│       ├── 14-agent-ide-publish.md
│       ├── 15-workflow-overview.md
│       ├── 16-workflow-canvas.md
│       ├── 17-workflow-nodes.md
│       ├── 18-workflow-playground.md
│       ├── 19-workflow-sdk.md
│       ├── 20-resource-management.md
│       ├── 21-plugin-system.md
│       ├── 22-knowledge-base.md
│       └── 23-database-module.md
│
└── frontend/                      # 前端代码（React + Vite）
    ├── src/                       # 源代码目录
    │   ├── app.tsx               # 根组件
    │   ├── main.tsx              # 入口文件
    │   ├── vite-env.d.ts         # Vite 类型声明
    │   │
    │   ├── components/           # React 组件
    │   │   ├── layout/          # 布局组件
    │   │   │   ├── root-layout.tsx
    │   │   │   ├── workspace-layout.tsx
    │   │   │   ├── header.tsx
    │   │   │   └── sidebar.tsx
    │   │   ├── route-guard/     # 路由守卫
    │   │   │   └── auth-guard.tsx
    │   │   ├── breadcrumb/      # 面包屑（待开发）
    │   │   ├── common/          # 通用组件（待开发）
    │   │   └── error-boundary/  # 错误边界（待开发）
    │   │
    │   ├── pages/               # 页面组件
    │   │   ├── auth/           # 认证页面
    │   │   │   ├── login.tsx
    │   │   │   └── register.tsx
    │   │   ├── workspace/      # 工作空间页面
    │   │   │   ├── list.tsx
    │   │   │   ├── index.tsx
    │   │   │   └── agent-list.tsx
    │   │   ├── agent/          # Agent IDE（待开发）
    │   │   ├── workflow/       # Workflow 编辑器（待开发）
    │   │   └── error/          # 错误页面（待开发）
    │   │
    │   ├── routes/             # 路由配置
    │   │   └── index.tsx       # 路由定义
    │   │
    │   ├── stores/             # Zustand 状态管理
    │   │   ├── index.ts        # Store 导出
    │   │   ├── user.ts         # 用户状态
    │   │   └── workspace.ts    # 工作空间状态
    │   │
    │   ├── services/           # API 服务
    │   │   ├── api/           # API 调用层（待开发）
    │   │   ├── types/         # 服务类型（待开发）
    │   │   └── utils/         # 服务工具（待开发）
    │   │
    │   ├── types/              # TypeScript 类型定义
    │   │   ├── user.ts
    │   │   └── workspace.ts
    │   │
    │   ├── hooks/              # 自定义 Hooks（待开发）
    │   ├── utils/              # 工具函数（待开发）
    │   ├── config/             # 配置文件
    │   │   └── constants.ts
    │   └── styles/             # 样式文件（待开发）
    │
    ├── public/                 # 静态资源
    ├── index.html             # HTML 模板
    ├── package.json           # 依赖配置
    ├── vite.config.ts         # Vite 配置
    ├── tsconfig.json          # TypeScript 配置
    ├── tailwind.config.ts     # Tailwind CSS 配置
    └── .eslintrc.json         # ESLint 配置
```

## 二、技术栈

### 2.1 核心依赖（已安装）

| 依赖 | 版本 | 用途 |
|------|------|------|
| **react** | ^18.2.0 | UI 框架 |
| **react-dom** | ^18.2.0 | React DOM 渲染 |
| **react-router-dom** | ^6.20.0 | 路由管理 |
| **zustand** | ^4.4.7 | 状态管理 |
| **@arco-design/web-react** | ^2.60.0 | UI 组件库 |
| **ahooks** | ^3.7.8 | React Hooks 库 |
| **axios** | ^1.6.0 | HTTP 客户端 |
| **i18next** | ^23.7.0 | 国际化 |
| **react-i18next** | ^14.0.0 | React 国际化 |
| **dayjs** | ^1.11.10 | 日期处理 |
| **lodash-es** | ^4.17.21 | 工具函数库 |
| **classnames** | ^2.3.2 | CSS 类名工具 |

### 2.2 开发依赖（已安装）

| 依赖 | 版本 | 用途 |
|------|------|------|
| **vite** | ^5.0.8 | 构建工具 |
| **typescript** | ^5.3.3 | TypeScript |
| **tailwindcss** | ^3.4.0 | CSS 框架 |
| **eslint** | ^8.56.0 | 代码检查 |
| **prettier** | ^3.1.0 | 代码格式化 |
| **vitest** | ^1.0.0 | 单元测试 |

### 2.3 待安装依赖（按需添加）

根据文档规划，后续需要安装：

```bash
# Workflow 相关
pnpm add reactflow        # React Flow（工作流画布）
pnpm add dagre            # 自动布局算法
pnpm add @hookform/resolvers react-hook-form  # 表单管理
pnpm add zod              # Schema 验证

# 代码编辑器
pnpm add @uiw/react-codemirror @codemirror/lang-sql @codemirror/lang-javascript

# 向量存储（可选，看是否需要前端处理）
# pnpm add @xenova/transformers

# 工具库
pnpm add immer            # 不可变数据
pnpm add lru-cache        # 缓存
pnpm add crypto-js        # 加密
```

## 三、代码编写位置规范

### 3.1 按模块组织代码

根据文档计划，代码应按以下模块组织：

#### **资源管理模块（文档 20-23）**

```
frontend/src/
├── types/
│   ├── resource.ts          # 通用资源类型
│   ├── plugin.ts            # 插件类型（文档 21）
│   ├── knowledge.ts         # 知识库类型（文档 22）
│   └── database.ts          # 数据库类型（文档 23）
│
├── stores/
│   ├── resourceStore.ts     # 资源通用 Store（文档 20）
│   ├── pluginStore.ts       # 插件 Store（文档 21）
│   ├── knowledgeStore.ts    # 知识库 Store（文档 22）
│   └── databaseStore.ts     # 数据库 Store（文档 23）
│
├── services/
│   ├── ResourceService.ts   # 资源服务
│   ├── PluginExecutor.ts    # 插件执行器（文档 21）
│   └── KnowledgeRetriever.ts # 知识库检索（文档 22）
│
└── components/
    ├── plugin/              # 插件组件（文档 21）
    │   ├── PluginMarketplace/
    │   │   └── index.tsx
    │   └── PluginConfigPanel/
    │       └── index.tsx
    │
    ├── knowledge/           # 知识库组件（文档 22）
    │   ├── KnowledgeManager/
    │   │   └── index.tsx
    │   └── DocumentManager/
    │       └── index.tsx
    │
    └── database/            # 数据库组件（文档 23）
        ├── DatabaseManager/
        │   └── index.tsx
        ├── SQLEditor/
        │   └── index.tsx
        └── TableDesigner/
            └── index.tsx
```

#### **Workflow 模块（文档 15-19）**

```
frontend/src/
├── types/
│   └── workflow.ts          # Workflow 类型（文档 15）
│
├── stores/
│   └── workflowStore.ts     # Workflow Store（文档 16）
│
├── services/
│   ├── WorkflowExecutor.ts  # 执行器（文档 18）
│   └── WorkflowSDK.ts       # SDK（文档 19）
│
└── components/
    └── workflow/
        ├── Canvas/          # 画布（文档 16）
        │   ├── index.tsx
        │   ├── CustomNode.tsx
        │   └── CustomEdge.tsx
        │
        ├── nodes/           # 节点（文档 17）
        │   ├── NodeRegistry.ts
        │   ├── LLMNode/
        │   ├── CodeNode/
        │   ├── IfNode/
        │   └── ToolNode/
        │
        └── DebugPanel/      # 调试面板（文档 18）
            └── index.tsx
```

#### **Agent IDE 模块（文档 14）**

```
frontend/src/
├── types/
│   └── agent.ts             # Agent 类型
│
├── stores/
│   └── agentStore.ts        # Agent Store
│
└── components/
    └── agent/
        ├── PublishPanel/    # 发布面板（文档 14）
        │   └── index.tsx
        ├── PromptEditor/    # Prompt 编辑器（待开发）
        ├── ToolManager/     # 工具管理（待开发）
        └── ChatDebugger/    # 聊天调试（待开发）
```

### 3.2 文件命名规范

- **组件文件**: PascalCase，如 `PluginMarketplace/index.tsx`
- **Store 文件**: camelCase + Store 后缀，如 `pluginStore.ts`
- **Service 文件**: PascalCase，如 `PluginExecutor.ts`
- **类型文件**: camelCase，如 `plugin.ts`
- **工具文件**: camelCase，如 `formatUtils.ts`

### 3.3 导入路径别名

项目已配置 `@/` 别名指向 `src/`：

```typescript
import { usePluginStore } from '@/stores/pluginStore';
import type { Plugin } from '@/types/plugin';
import { PluginExecutor } from '@/services/PluginExecutor';
```

## 四、开发流程建议

### 4.1 按优先级开发

根据文档计划的开发优先级：

**高优先级（MVP 核心功能）**
1. [ ] 项目基础配置（文档 03 - 待创建）
2. [ ] 路由和布局系统（文档 04 - 待创建，部分已实现）
3. [ ] 状态管理（文档 05 - 待创建，部分已实现）
4. [ ] API 集成（文档 06 - 待创建）
5. [ ] 账户系统（文档 07 - 待创建，基础已实现）
6. [ ] 工作空间模块（文档 08 - 待创建，基础已实现）
7. [ ] Agent IDE 基础（文档 09-13 - 待创建）

**中优先级（完整功能）**
8. [ ] Workflow 基础（文档 15-19 - 文档已完成，代码待实现）
9. [ ] 插件系统（文档 21 - 文档已完成，代码待实现）
10. [ ] 资源管理（文档 20, 22-23 - 文档已完成，代码待实现）

**低优先级（增强功能）**
11. [ ] 探索模块（文档 24 - 待创建）
12. [ ] 组件库定制（文档 25 - 待创建）
13. [ ] 国际化（文档 26 - 待创建）
14. [ ] 测试和部署（文档 29-30 - 待创建）

### 4.2 实现步骤

对于每个模块（以插件系统为例）：

**步骤 1**: 创建类型定义
```bash
# 创建 frontend/src/types/plugin.ts
# 参考：docs/frontend/21-plugin-system.md 第二章
```

**步骤 2**: 创建 Store
```bash
# 创建 frontend/src/stores/pluginStore.ts
# 参考：docs/frontend/21-plugin-system.md 第三章
```

**步骤 3**: 创建 Service
```bash
# 创建 frontend/src/services/PluginExecutor.ts
# 参考：docs/frontend/21-plugin-system.md 第五章
```

**步骤 4**: 创建 UI 组件
```bash
# 创建 frontend/src/components/plugin/PluginMarketplace/index.tsx
# 参考：docs/frontend/21-plugin-system.md 第四章
```

**步骤 5**: 集成路由
```bash
# 更新 frontend/src/routes/index.tsx
# 添加插件管理路由
```

### 4.3 开发命令

```bash
# 启动开发服务器
pnpm dev

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 运行测试
pnpm test

# 构建生产版本
pnpm build
```

## 五、代码规范

### 5.1 TypeScript 规范

```typescript
// ✅ 使用 interface 定义对象类型
export interface Plugin {
  id: string;
  name: string;
  type: PluginType;
}

// ✅ 使用 enum 定义枚举
export enum PluginType {
  FORM = 'form',
  CODE = 'code',
  API = 'api',
}

// ✅ 使用 type 定义联合类型或工具类型
export type PluginStatus = 'draft' | 'published' | 'deprecated';
```

### 5.2 React 组件规范

```typescript
// ✅ 函数组件使用 export function
export function PluginMarketplace() {
  // ...
}

// ✅ Props 使用 interface 定义
interface PluginCardProps {
  plugin: Plugin;
  onInstall: () => void;
}

export function PluginCard({ plugin, onInstall }: PluginCardProps) {
  // ...
}
```

### 5.3 Zustand Store 规范

```typescript
// ✅ 分离 State 和 Actions 的类型定义
interface PluginState {
  plugins: Record<string, Plugin>;
  loading: boolean;
}

interface PluginActions {
  fetchPlugins: () => Promise<void>;
  createPlugin: (plugin: Partial<Plugin>) => Promise<void>;
}

export const usePluginStore = create<PluginState & PluginActions>()(
  persist(
    immer((set, get) => ({
      // 实现...
    })),
    { name: 'plugin-store' }
  )
);
```

## 六、下一步行动

### 6.1 立即可以开始的工作

基于已完成的文档（20-23），可以立即开始编写：

1. **插件系统实现**（文档 21）
   - [ ] 创建 `types/plugin.ts`
   - [ ] 创建 `stores/pluginStore.ts`
   - [ ] 创建 `services/PluginExecutor.ts`
   - [ ] 创建插件 UI 组件

2. **知识库系统实现**（文档 22）
   - [ ] 创建 `types/knowledge.ts`
   - [ ] 创建 `stores/knowledgeStore.ts`
   - [ ] 创建 `services/KnowledgeRetriever.ts`
   - [ ] 创建知识库 UI 组件

3. **数据库模块实现**（文档 23）
   - [ ] 创建 `types/database.ts`
   - [ ] 创建 `stores/databaseStore.ts`
   - [ ] 创建数据库 UI 组件

### 6.2 需要先创建文档的工作

在实现前需要先创建对应文档：

1. **API 集成**（文档 06 - 高优先级）
   - 需要先创建 API 集成文档
   - 定义 API 客户端封装规范
   - 定义错误处理和缓存策略

2. **Agent IDE**（文档 09-13 - 高优先级）
   - 需要先创建 Agent IDE 相关文档
   - 定义 Prompt 编辑器、工具管理等

## 七、注意事项

### 7.1 与后端配合

- 前端代码中的 API 调用目前可以使用 mock 数据
- 后端 API 设计参考文档中的 RESTful API 和 Go 服务接口章节
- 使用 TypeScript 类型确保前后端数据结构一致

### 7.2 性能优化

- 使用 React.lazy 和 Suspense 进行代码分割
- 使用 useMemo 和 useCallback 避免不必要的重渲染
- Zustand Store 使用 immer 中间件优化状态更新

### 7.3 测试策略

- 为关键业务逻辑编写单元测试（Vitest）
- 为复杂组件编写集成测试
- 使用 React Testing Library 测试组件

---

**文档状态**: ✅ 完成
**维护**: 随着开发进展持续更新
