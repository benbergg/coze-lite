# 资源管理系统总览

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-studio/workspace`, `@coze-data/*`

## 一、概述

资源管理系统是 Coze Studio 的核心基础设施，负责管理 Agent 可使用的各类资源，包括插件、知识库和数据库。本文档提供资源管理系统的整体架构和 Coze Lite 实现方案。

### 1.1 核心资源类型

| 资源类型 | 说明 | 用途 | 实现优先级 |
|---------|------|------|-----------|
| **插件 (Plugin)** | API 工具和扩展 | Agent 调用外部服务 | 高 |
| **知识库 (Knowledge)** | 文档和数据检索 | RAG 知识增强 | 高 |
| **数据库 (Database)** | 结构化数据存储 | 数据查询和管理 | 中 |
| **工作流 (Workflow)** | 复杂任务编排 | 流程自动化 | 高 |
| **文件 (File)** | 文件存储 | 文档管理 | 低 |

### 1.2 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     Resource Manager                     │
│                    (资源管理中心)                          │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Plugin     │ │  Knowledge   │ │   Database   │
│   插件系统    │ │   知识库      │ │   数据库      │
├──────────────┤ ├──────────────┤ ├──────────────┤
│ - OpenAPI    │ │ - 文档解析   │ │ - SQL查询     │
│ - OAuth      │ │ - 向量检索   │ │ - 记录管理    │
│ - 工具执行    │ │ - 切片管理   │ │ - 模式管理    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 1.3 Coze Studio vs Coze Lite

| 功能 | Coze Studio | Coze Lite | 说明 |
|------|-------------|-----------|------|
| 插件数量 | 无限制 | 20 个 | 限制插件数量 |
| 知识库类型 | 文本/表格/图片 | 文本/表格 | 简化类型 |
| 向量数据库 | 自建向量库 | Supabase/Pinecone | 使用托管服务 |
| 数据库类型 | 多种数据库 | SQLite/PostgreSQL | 简化数据库类型 |
| OAuth 认证 | 完整支持 | API Key | 简化认证 |

## 二、Coze Studio 架构分析

### 2.1 领域驱动设计 (DDD)

Coze Studio 采用 DDD 分层架构：

```
┌─────────────────────────────────────────────────────────┐
│                      API Layer                           │
│              (API 接口定义和路由)                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│                   Crossdomain Layer                      │
│              (跨域模型和数据转换)                          │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│                    Domain Layer                          │
│         (业务逻辑 - Service/Entity/Repository)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Layer                      │
│              (数据库、缓存、消息队列等)                     │
└─────────────────────────────────────────────────────────┘
```

### 2.2 状态管理

**Zustand Store 架构**:

```typescript
// 资源管理 Store
interface ResourceState {
  // 插件
  plugins: Plugin[];
  selectedPlugin: Plugin | null;

  // 知识库
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBase: KnowledgeBase | null;

  // 数据库
  databases: Database[];
  selectedDatabase: Database | null;

  // 操作
  loadPlugins: () => Promise<void>;
  loadKnowledgeBases: () => Promise<void>;
  loadDatabases: () => Promise<void>;

  selectResource: (type: ResourceType, id: string) => void;
}
```

### 2.3 资源生命周期

```
创建 (Create)
    ↓
配置 (Configure)
    ↓
测试 (Test)
    ↓
发布 (Publish)
    ↓
使用 (Use)
    ↓
更新 (Update)
    ↓
停用 (Disable)
    ↓
删除 (Delete)
```

## 三、Coze Lite 设计方案

### 3.1 简化架构

```typescript
// 资源管理核心接口
export interface ResourceManager {
  // 插件管理
  pluginManager: PluginManager;

  // 知识库管理
  knowledgeManager: KnowledgeManager;

  // 数据库管理
  databaseManager: DatabaseManager;

  // 通用方法
  list(type: ResourceType): Promise<Resource[]>;
  get(type: ResourceType, id: string): Promise<Resource>;
  create(type: ResourceType, data: any): Promise<Resource>;
  update(type: ResourceType, id: string, data: any): Promise<Resource>;
  delete(type: ResourceType, id: string): Promise<void>;
}
```

### 3.2 统一资源模型

**文件**: `frontend/src/types/resource.ts`

```typescript
export enum ResourceType {
  PLUGIN = 'plugin',
  KNOWLEDGE = 'knowledge',
  DATABASE = 'database',
  WORKFLOW = 'workflow',
}

export interface BaseResource {
  id: string;
  type: ResourceType;
  name: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  spaceId: string;
}

export interface ResourceMetadata {
  tags?: string[];
  category?: string;
  version?: string;
  isPublic?: boolean;
  permissions?: {
    read: string[];
    write: string[];
    execute: string[];
  };
}

export interface Resource extends BaseResource {
  metadata: ResourceMetadata;
  config: Record<string, any>;
  status: ResourceStatus;
}

export enum ResourceStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
  ERROR = 'error',
}
```

### 3.3 资源 Store

**文件**: `frontend/src/stores/resourceStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ResourceState {
  // 资源列表
  resources: Record<ResourceType, Resource[]>;

  // 当前选中资源
  selectedResource: {
    type: ResourceType | null;
    id: string | null;
  };

  // 加载状态
  loading: Record<ResourceType, boolean>;

  // 操作
  loadResources: (type: ResourceType) => Promise<void>;
  selectResource: (type: ResourceType, id: string) => void;
  createResource: (type: ResourceType, data: any) => Promise<Resource>;
  updateResource: (type: ResourceType, id: string, data: any) => Promise<Resource>;
  deleteResource: (type: ResourceType, id: string) => Promise<void>;

  // 搜索和过滤
  searchResources: (type: ResourceType, query: string) => Resource[];
  filterResources: (type: ResourceType, filters: ResourceFilter) => Resource[];
}

export const useResourceStore = create<ResourceState>()(
  persist(
    (set, get) => ({
      resources: {
        [ResourceType.PLUGIN]: [],
        [ResourceType.KNOWLEDGE]: [],
        [ResourceType.DATABASE]: [],
        [ResourceType.WORKFLOW]: [],
      },

      selectedResource: {
        type: null,
        id: null,
      },

      loading: {
        [ResourceType.PLUGIN]: false,
        [ResourceType.KNOWLEDGE]: false,
        [ResourceType.DATABASE]: false,
        [ResourceType.WORKFLOW]: false,
      },

      loadResources: async (type) => {
        set(state => ({
          loading: { ...state.loading, [type]: true },
        }));

        try {
          const response = await fetch(`/api/resources/${type}`);
          const resources = await response.json();

          set(state => ({
            resources: {
              ...state.resources,
              [type]: resources,
            },
            loading: { ...state.loading, [type]: false },
          }));
        } catch (error) {
          set(state => ({
            loading: { ...state.loading, [type]: false },
          }));
          throw error;
        }
      },

      selectResource: (type, id) => {
        set({ selectedResource: { type, id } });
      },

      createResource: async (type, data) => {
        const response = await fetch(`/api/resources/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const resource = await response.json();

        set(state => ({
          resources: {
            ...state.resources,
            [type]: [...state.resources[type], resource],
          },
        }));

        return resource;
      },

      updateResource: async (type, id, data) => {
        const response = await fetch(`/api/resources/${type}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const resource = await response.json();

        set(state => ({
          resources: {
            ...state.resources,
            [type]: state.resources[type].map(r =>
              r.id === id ? resource : r
            ),
          },
        }));

        return resource;
      },

      deleteResource: async (type, id) => {
        await fetch(`/api/resources/${type}/${id}`, {
          method: 'DELETE',
        });

        set(state => ({
          resources: {
            ...state.resources,
            [type]: state.resources[type].filter(r => r.id !== id),
          },
        }));
      },

      searchResources: (type, query) => {
        const resources = get().resources[type];
        const lowerQuery = query.toLowerCase();

        return resources.filter(r =>
          r.name.toLowerCase().includes(lowerQuery) ||
          r.description?.toLowerCase().includes(lowerQuery)
        );
      },

      filterResources: (type, filters) => {
        const resources = get().resources[type];

        return resources.filter(r => {
          if (filters.status && r.status !== filters.status) {
            return false;
          }
          if (filters.tags && !filters.tags.every(tag =>
            r.metadata.tags?.includes(tag)
          )) {
            return false;
          }
          return true;
        });
      },
    }),
    {
      name: 'coze-lite-resource-store',
      partialize: (state) => ({
        selectedResource: state.selectedResource,
      }),
    }
  )
);
```

### 3.4 资源列表组件

**文件**: `frontend/src/components/resources/ResourceList/index.tsx`

```typescript
import { useEffect } from 'react';
import { List, Card, Empty, Spin, Input, Select } from '@arco-design/web-react';
import { IconSearch } from '@arco-design/web-react/icon';
import { useResourceStore } from '@/stores/resourceStore';
import { ResourceType, ResourceStatus } from '@/types/resource';
import './index.css';

interface ResourceListProps {
  type: ResourceType;
  onSelect?: (id: string) => void;
}

export function ResourceList({ type, onSelect }: ResourceListProps) {
  const {
    resources,
    loading,
    loadResources,
    selectResource,
    searchResources,
    filterResources,
  } = useResourceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | null>(null);

  useEffect(() => {
    loadResources(type);
  }, [type]);

  const filteredResources = useMemo(() => {
    let result = resources[type];

    if (searchQuery) {
      result = searchResources(type, searchQuery);
    }

    if (statusFilter) {
      result = filterResources(type, { status: statusFilter });
    }

    return result;
  }, [resources, type, searchQuery, statusFilter]);

  const handleSelect = (id: string) => {
    selectResource(type, id);
    onSelect?.(id);
  };

  if (loading[type]) {
    return <Spin />;
  }

  return (
    <div className="resource-list">
      {/* 搜索和过滤 */}
      <div className="resource-list-header">
        <Input
          prefix={<IconSearch />}
          placeholder="搜索资源..."
          value={searchQuery}
          onChange={setSearchQuery}
          style={{ width: 300 }}
        />

        <Select
          placeholder="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
        >
          <Select.Option value={ResourceStatus.ACTIVE}>启用</Select.Option>
          <Select.Option value={ResourceStatus.INACTIVE}>停用</Select.Option>
          <Select.Option value={ResourceStatus.DRAFT}>草稿</Select.Option>
        </Select>
      </div>

      {/* 资源列表 */}
      {filteredResources.length === 0 ? (
        <Empty description="暂无资源" />
      ) : (
        <List
          dataSource={filteredResources}
          render={(item) => (
            <List.Item key={item.id}>
              <Card
                className="resource-card"
                hoverable
                onClick={() => handleSelect(item.id)}
              >
                <div className="resource-card-header">
                  {item.icon && <img src={item.icon} alt={item.name} />}
                  <h3>{item.name}</h3>
                  <span className={`status-badge status-${item.status}`}>
                    {item.status}
                  </span>
                </div>

                <p className="resource-description">{item.description}</p>

                <div className="resource-meta">
                  <span>创建于: {new Date(item.createdAt).toLocaleDateString()}</span>
                  {item.metadata.version && (
                    <span>版本: {item.metadata.version}</span>
                  )}
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
```

## 四、后端 API 设计

### 4.1 RESTful API

```typescript
// 资源 CRUD
GET    /api/resources/:type           # 获取资源列表
GET    /api/resources/:type/:id       # 获取资源详情
POST   /api/resources/:type           # 创建资源
PUT    /api/resources/:type/:id       # 更新资源
DELETE /api/resources/:type/:id       # 删除资源

// 资源操作
POST   /api/resources/:type/:id/test     # 测试资源
POST   /api/resources/:type/:id/publish  # 发布资源
POST   /api/resources/:type/:id/enable   # 启用资源
POST   /api/resources/:type/:id/disable  # 停用资源
```

### 4.2 API 实现

**文件**: `backend/routes/resources.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { ResourceService } from '../services/resource.service';

export async function resourceRoutes(fastify: FastifyInstance) {
  const resourceService = new ResourceService();

  // 获取资源列表
  fastify.get('/resources/:type', async (request, reply) => {
    const { type } = request.params as { type: ResourceType };
    const { status, tags } = request.query as { status?: string; tags?: string };

    const resources = await resourceService.list(type, {
      status,
      tags: tags?.split(','),
    });

    reply.send(resources);
  });

  // 创建资源
  fastify.post('/resources/:type', async (request, reply) => {
    const { type } = request.params as { type: ResourceType };
    const data = request.body;

    const resource = await resourceService.create(type, data);
    reply.code(201).send(resource);
  });

  // 更新资源
  fastify.put('/resources/:type/:id', async (request, reply) => {
    const { type, id } = request.params as { type: ResourceType; id: string };
    const data = request.body;

    const resource = await resourceService.update(type, id, data);
    reply.send(resource);
  });

  // 删除资源
  fastify.delete('/resources/:type/:id', async (request, reply) => {
    const { type, id } = request.params as { type: ResourceType; id: string };

    await resourceService.delete(type, id);
    reply.code(204).send();
  });
}
```

## 五、最佳实践

### 5.1 资源权限管理

```typescript
interface ResourcePermission {
  userId: string;
  resourceId: string;
  permissions: ('read' | 'write' | 'execute' | 'delete')[];
}

async function checkPermission(
  userId: string,
  resourceId: string,
  action: string
): Promise<boolean> {
  const permission = await getResourcePermission(userId, resourceId);
  return permission.permissions.includes(action);
}
```

### 5.2 资源缓存策略

```typescript
// 使用 React Query 缓存
import { useQuery } from '@tanstack/react-query';

export function useResource(type: ResourceType, id: string) {
  return useQuery({
    queryKey: ['resource', type, id],
    queryFn: () => fetchResource(type, id),
    staleTime: 5 * 60 * 1000, // 5 分钟
    cacheTime: 10 * 60 * 1000, // 10 分钟
  });
}
```

### 5.3 错误处理

```typescript
try {
  await createResource(type, data);
} catch (error) {
  if (error.code === 'DUPLICATE_NAME') {
    Message.error('资源名称已存在');
  } else if (error.code === 'QUOTA_EXCEEDED') {
    Message.error('资源配额已达上限');
  } else {
    Message.error(`创建失败: ${error.message}`);
  }
}
```

## 六、扩展方向

### 6.1 资源市场

- 公开资源浏览
- 资源评分和评论
- 一键导入资源

### 6.2 资源版本控制

- 版本历史记录
- 版本回滚
- 版本对比

### 6.3 资源监控

- 使用统计
- 性能监控
- 错误追踪

---

**文档状态**: ✅ 完成
**下一步**: 创建 [21-plugin-system.md] - 插件系统详细文档
