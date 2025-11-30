# 资源管理 - 插件系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-studio/bot-plugin-store`, `@coze-foundation/plugin-*`

## 一、概述

插件系统为 Agent 和 Workflow 提供可扩展的工具能力。本文档基于 Coze Studio 源码分析，提供完整的插件系统实现方案。

### 1.1 核心功能

- **插件商店**: 浏览和搜索插件
- **插件管理**: 安装、配置、卸载插件
- **插件类型**: 表单插件、代码插件、API 插件
- **权限控制**: 插件授权和安全沙箱
- **版本管理**: 插件版本更新和回滚

### 1.2 插件类型

| 类型 | 说明 | 应用场景 |
|------|------|----------|
| **表单插件** | 通过表单配置调用 API | 搜索、天气查询、数据库查询 |
| **代码插件** | 执行自定义代码逻辑 | 数据转换、复杂计算 |
| **API 插件** | 调用外部 API 服务 | 第三方服务集成 |
| **知识库插件** | 检索知识库内容 | RAG、文档问答 |

## 二、数据模型

### 2.1 插件定义

**文件**: `frontend/src/types/plugin.ts`

```typescript
import { z } from 'zod';

// 插件类型枚举
export enum PluginType {
  FORM = 'form',      // 表单插件
  CODE = 'code',      // 代码插件
  API = 'api',        // API 插件
  KNOWLEDGE = 'knowledge', // 知识库插件
}

// 插件状态
export enum PluginStatus {
  DRAFT = 'draft',           // 草稿
  PUBLISHED = 'published',   // 已发布
  DEPRECATED = 'deprecated', // 已废弃
}

// 插件可见性
export enum PluginVisibility {
  PUBLIC = 'public',     // 公开
  PRIVATE = 'private',   // 私有
  TEAM = 'team',         // 团队
}

// OpenAPI 参数定义
export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'body';
  required: boolean;
  schema: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    default?: any;
    enum?: any[];
  };
}

// OpenAPI 操作定义
export interface OpenAPIOperation {
  operationId: string;
  summary: string;
  description?: string;
  parameters: OpenAPIParameter[];
  requestBody?: {
    required: boolean;
    content: {
      'application/json': {
        schema: Record<string, any>;
      };
    };
  };
  responses: Record<string, any>;
}

// 插件配置（基于 OpenAPI 3.0）
export interface PluginConfig {
  openapi: '3.0.0' | '3.1.0';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

// 插件元数据
export interface PluginMetadata {
  author: string;
  authorAvatar?: string;
  category: string;
  tags: string[];
  icon?: string;
  homepage?: string;
  documentation?: string;
  license?: string;
}

// 插件统计
export interface PluginStats {
  installs: number;
  rating: number;
  reviews: number;
  lastUpdated: string;
}

// 插件完整定义
export interface Plugin {
  id: string;
  name: string;
  description: string;
  type: PluginType;
  status: PluginStatus;
  visibility: PluginVisibility;
  version: string;
  config: PluginConfig;
  metadata: PluginMetadata;
  stats?: PluginStats;
  createdAt: string;
  updatedAt: string;
  workspace?: string;
}

// Zod Schema 验证
export const PluginSchema = z.object({
  name: z.string().min(1, '插件名称不能为空').max(100),
  description: z.string().max(500),
  type: z.nativeEnum(PluginType),
  config: z.object({
    openapi: z.enum(['3.0.0', '3.1.0']),
    info: z.object({
      title: z.string(),
      version: z.string(),
      description: z.string().optional(),
    }),
    servers: z.array(z.object({
      url: z.string().url(),
      description: z.string().optional(),
    })),
    paths: z.record(z.any()),
  }),
  metadata: z.object({
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
  }),
});
```

### 2.2 插件调用参数

```typescript
// 插件执行上下文
export interface PluginExecutionContext {
  pluginId: string;
  operationId: string;
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  timeout?: number;
}

// 插件执行结果
export interface PluginExecutionResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    executionTime: number;
    timestamp: string;
  };
}
```

## 三、状态管理

### 3.1 Plugin Store

**文件**: `frontend/src/stores/pluginStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Plugin, PluginExecutionContext, PluginExecutionResult } from '@/types/plugin';

interface PluginState {
  // 状态
  plugins: Record<string, Plugin>;
  installedPlugins: Set<string>;
  favoritePlugins: Set<string>;

  // 过滤和搜索
  filters: {
    category?: string;
    type?: PluginType;
    search?: string;
  };

  // 加载状态
  loading: boolean;
  error: string | null;
}

interface PluginActions {
  // 插件 CRUD
  fetchPlugins: () => Promise<void>;
  getPlugin: (id: string) => Promise<Plugin>;
  createPlugin: (plugin: Partial<Plugin>) => Promise<Plugin>;
  updatePlugin: (id: string, updates: Partial<Plugin>) => Promise<void>;
  deletePlugin: (id: string) => Promise<void>;

  // 插件安装管理
  installPlugin: (id: string) => Promise<void>;
  uninstallPlugin: (id: string) => Promise<void>;

  // 插件执行
  executePlugin: (context: PluginExecutionContext) => Promise<PluginExecutionResult>;

  // 收藏管理
  toggleFavorite: (id: string) => void;

  // 过滤和搜索
  setFilters: (filters: Partial<PluginState['filters']>) => void;
  clearFilters: () => void;

  // 工具方法
  getInstalledPlugins: () => Plugin[];
  getFavoritePlugins: () => Plugin[];
  searchPlugins: (query: string) => Plugin[];
}

export const usePluginStore = create<PluginState & PluginActions>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      plugins: {},
      installedPlugins: new Set(),
      favoritePlugins: new Set(),
      filters: {},
      loading: false,
      error: null,

      // 获取插件列表
      fetchPlugins: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/plugins');
          const data = await response.json();

          set(state => {
            data.forEach((plugin: Plugin) => {
              state.plugins[plugin.id] = plugin;
            });
            state.loading = false;
          });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // 获取单个插件
      getPlugin: async (id: string) => {
        const cached = get().plugins[id];
        if (cached) return cached;

        const response = await fetch(`/api/plugins/${id}`);
        const plugin = await response.json();

        set(state => {
          state.plugins[id] = plugin;
        });

        return plugin;
      },

      // 创建插件
      createPlugin: async (plugin: Partial<Plugin>) => {
        const response = await fetch('/api/plugins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plugin),
        });

        const newPlugin = await response.json();

        set(state => {
          state.plugins[newPlugin.id] = newPlugin;
        });

        return newPlugin;
      },

      // 更新插件
      updatePlugin: async (id: string, updates: Partial<Plugin>) => {
        const response = await fetch(`/api/plugins/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const updated = await response.json();

        set(state => {
          state.plugins[id] = { ...state.plugins[id], ...updated };
        });
      },

      // 删除插件
      deletePlugin: async (id: string) => {
        await fetch(`/api/plugins/${id}`, { method: 'DELETE' });

        set(state => {
          delete state.plugins[id];
          state.installedPlugins.delete(id);
          state.favoritePlugins.delete(id);
        });
      },

      // 安装插件
      installPlugin: async (id: string) => {
        await fetch(`/api/plugins/${id}/install`, { method: 'POST' });

        set(state => {
          state.installedPlugins.add(id);
        });
      },

      // 卸载插件
      uninstallPlugin: async (id: string) => {
        await fetch(`/api/plugins/${id}/uninstall`, { method: 'POST' });

        set(state => {
          state.installedPlugins.delete(id);
        });
      },

      // 执行插件
      executePlugin: async (context: PluginExecutionContext) => {
        const response = await fetch('/api/plugins/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context),
        });

        return await response.json();
      },

      // 切换收藏
      toggleFavorite: (id: string) => {
        set(state => {
          if (state.favoritePlugins.has(id)) {
            state.favoritePlugins.delete(id);
          } else {
            state.favoritePlugins.add(id);
          }
        });
      },

      // 设置过滤条件
      setFilters: (filters: Partial<PluginState['filters']>) => {
        set(state => {
          state.filters = { ...state.filters, ...filters };
        });
      },

      // 清空过滤
      clearFilters: () => {
        set({ filters: {} });
      },

      // 获取已安装插件
      getInstalledPlugins: () => {
        const { plugins, installedPlugins } = get();
        return Array.from(installedPlugins)
          .map(id => plugins[id])
          .filter(Boolean);
      },

      // 获取收藏插件
      getFavoritePlugins: () => {
        const { plugins, favoritePlugins } = get();
        return Array.from(favoritePlugins)
          .map(id => plugins[id])
          .filter(Boolean);
      },

      // 搜索插件
      searchPlugins: (query: string) => {
        const { plugins, filters } = get();
        const lowerQuery = query.toLowerCase();

        return Object.values(plugins).filter(plugin => {
          // 搜索匹配
          const matchesSearch = !query ||
            plugin.name.toLowerCase().includes(lowerQuery) ||
            plugin.description.toLowerCase().includes(lowerQuery);

          // 分类过滤
          const matchesCategory = !filters.category ||
            plugin.metadata.category === filters.category;

          // 类型过滤
          const matchesType = !filters.type ||
            plugin.type === filters.type;

          return matchesSearch && matchesCategory && matchesType;
        });
      },
    })),
    {
      name: 'plugin-store',
      partialize: (state) => ({
        installedPlugins: Array.from(state.installedPlugins),
        favoritePlugins: Array.from(state.favoritePlugins),
      }),
    }
  )
);
```

## 四、UI 组件

### 4.1 插件商店

**文件**: `frontend/src/components/plugin/PluginMarketplace/index.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Input, Select, Card, Grid, Button, Tag, Empty } from '@arco-design/web-react';
import { IconSearch, IconStar, IconStarFill, IconDownload } from '@arco-design/web-react/icon';
import { usePluginStore } from '@/stores/pluginStore';
import { PluginType } from '@/types/plugin';
import './index.css';

const { Row, Col } = Grid;

export function PluginMarketplace() {
  const {
    fetchPlugins,
    searchPlugins,
    setFilters,
    filters,
    toggleFavorite,
    installPlugin,
    favoritePlugins,
    installedPlugins,
  } = usePluginStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [plugins, setPlugins] = useState([]);

  useEffect(() => {
    fetchPlugins();
  }, []);

  useEffect(() => {
    const results = searchPlugins(searchQuery);
    setPlugins(results);
  }, [searchQuery, filters]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleCategoryChange = (value: string) => {
    setFilters({ category: value || undefined });
  };

  const handleTypeChange = (value: PluginType) => {
    setFilters({ type: value || undefined });
  };

  return (
    <div className="plugin-marketplace">
      {/* 搜索和过滤 */}
      <div className="marketplace-header">
        <Input.Search
          placeholder="搜索插件..."
          prefix={<IconSearch />}
          onChange={handleSearch}
          style={{ width: 400 }}
        />

        <div className="marketplace-filters">
          <Select
            placeholder="选择分类"
            onChange={handleCategoryChange}
            allowClear
            style={{ width: 200 }}
          >
            <Select.Option value="search">搜索</Select.Option>
            <Select.Option value="database">数据库</Select.Option>
            <Select.Option value="ai">AI 工具</Select.Option>
            <Select.Option value="utility">实用工具</Select.Option>
          </Select>

          <Select
            placeholder="插件类型"
            onChange={handleTypeChange}
            allowClear
            style={{ width: 200 }}
          >
            <Select.Option value={PluginType.FORM}>表单插件</Select.Option>
            <Select.Option value={PluginType.CODE}>代码插件</Select.Option>
            <Select.Option value={PluginType.API}>API 插件</Select.Option>
          </Select>
        </div>
      </div>

      {/* 插件列表 */}
      <div className="marketplace-content">
        {plugins.length === 0 ? (
          <Empty description="未找到插件" />
        ) : (
          <Row gutter={16}>
            {plugins.map(plugin => (
              <Col span={8} key={plugin.id}>
                <PluginCard
                  plugin={plugin}
                  isFavorite={favoritePlugins.has(plugin.id)}
                  isInstalled={installedPlugins.has(plugin.id)}
                  onToggleFavorite={() => toggleFavorite(plugin.id)}
                  onInstall={() => installPlugin(plugin.id)}
                />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}

// 插件卡片
interface PluginCardProps {
  plugin: Plugin;
  isFavorite: boolean;
  isInstalled: boolean;
  onToggleFavorite: () => void;
  onInstall: () => void;
}

function PluginCard({
  plugin,
  isFavorite,
  isInstalled,
  onToggleFavorite,
  onInstall,
}: PluginCardProps) {
  return (
    <Card
      className="plugin-card"
      hoverable
      cover={
        plugin.metadata.icon ? (
          <img src={plugin.metadata.icon} alt={plugin.name} />
        ) : (
          <div className="plugin-card-placeholder">{plugin.name[0]}</div>
        )
      }
      actions={[
        <Button
          key="favorite"
          type="text"
          icon={isFavorite ? <IconStarFill /> : <IconStar />}
          onClick={onToggleFavorite}
        />,
        <Button
          key="install"
          type={isInstalled ? 'default' : 'primary'}
          icon={<IconDownload />}
          onClick={onInstall}
          disabled={isInstalled}
        >
          {isInstalled ? '已安装' : '安装'}
        </Button>,
      ]}
    >
      <Card.Meta
        title={plugin.name}
        description={
          <>
            <p className="plugin-description">{plugin.description}</p>
            <div className="plugin-tags">
              {plugin.metadata.tags.map(tag => (
                <Tag key={tag} size="small">{tag}</Tag>
              ))}
            </div>
            {plugin.stats && (
              <div className="plugin-stats">
                <span>⭐ {plugin.stats.rating.toFixed(1)}</span>
                <span>📦 {plugin.stats.installs.toLocaleString()} 安装</span>
              </div>
            )}
          </>
        }
      />
    </Card>
  );
}
```

### 4.2 插件配置面板

**文件**: `frontend/src/components/plugin/PluginConfigPanel/index.tsx`

```typescript
import { useState } from 'react';
import { Form, Input, Button, Message, Collapse } from '@arco-design/web-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Plugin, PluginConfig } from '@/types/plugin';
import './index.css';

const FormItem = Form.Item;
const CollapseItem = Collapse.Item;

interface PluginConfigPanelProps {
  plugin: Plugin;
  onSave: (config: Record<string, any>) => void;
}

export function PluginConfigPanel({ plugin, onSave }: PluginConfigPanelProps) {
  const [loading, setLoading] = useState(false);

  // 根据 OpenAPI 定义生成表单
  const formFields = generateFormFields(plugin.config);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: getDefaultValues(formFields),
  });

  const onSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    try {
      await onSave(data);
      Message.success('配置已保存');
    } catch (error) {
      Message.error(`保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plugin-config-panel">
      <h3>{plugin.name} 配置</h3>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Collapse defaultActiveKey={['basic']}>
          {/* 基本配置 */}
          <CollapseItem header="基本配置" name="basic">
            {formFields.map(field => (
              <FormItem
                key={field.name}
                label={field.label}
                required={field.required}
                validateStatus={errors[field.name] ? 'error' : undefined}
                help={errors[field.name]?.message as string}
              >
                {renderFormField(field, register)}
              </FormItem>
            ))}
          </CollapseItem>

          {/* 高级配置 */}
          <CollapseItem header="高级配置" name="advanced">
            <FormItem label="超时时间（秒）">
              <Input {...register('timeout', { valueAsNumber: true })} type="number" />
            </FormItem>

            <FormItem label="重试次数">
              <Input {...register('retryCount', { valueAsNumber: true })} type="number" />
            </FormItem>
          </CollapseItem>
        </Collapse>

        <FormItem>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存配置
          </Button>
        </FormItem>
      </Form>
    </div>
  );
}

// 从 OpenAPI 定义生成表单字段
function generateFormFields(config: PluginConfig) {
  const fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: any[];
  }> = [];

  // 遍历所有 paths 和 operations
  Object.entries(config.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      operation.parameters?.forEach(param => {
        fields.push({
          name: param.name,
          label: param.schema.description || param.name,
          type: param.schema.type,
          required: param.required,
          options: param.schema.enum,
        });
      });
    });
  });

  return fields;
}

// 渲染表单字段
function renderFormField(field: any, register: any) {
  if (field.options) {
    return (
      <Select {...register(field.name)}>
        {field.options.map((opt: any) => (
          <Select.Option key={opt} value={opt}>
            {opt}
          </Select.Option>
        ))}
      </Select>
    );
  }

  switch (field.type) {
    case 'number':
      return <Input {...register(field.name, { valueAsNumber: true })} type="number" />;
    case 'boolean':
      return <Switch {...register(field.name)} />;
    default:
      return <Input {...register(field.name)} />;
  }
}

function getDefaultValues(fields: any[]) {
  const defaults: Record<string, any> = {};
  fields.forEach(field => {
    if (field.default !== undefined) {
      defaults[field.name] = field.default;
    }
  });
  return defaults;
}
```

## 五、插件执行服务

### 5.1 执行器实现

**文件**: `frontend/src/services/PluginExecutor.ts`

```typescript
import type {
  Plugin,
  PluginExecutionContext,
  PluginExecutionResult,
  OpenAPIOperation
} from '@/types/plugin';

export class PluginExecutor {
  // 执行插件
  static async execute(
    plugin: Plugin,
    context: PluginExecutionContext
  ): Promise<PluginExecutionResult> {
    const startTime = performance.now();

    try {
      // 查找对应的 operation
      const operation = this.findOperation(plugin.config, context.operationId);
      if (!operation) {
        throw new Error(`Operation ${context.operationId} not found`);
      }

      // 验证参数
      this.validateParameters(operation, context.parameters);

      // 构建请求
      const request = this.buildRequest(plugin, operation, context);

      // 执行请求
      const response = await fetch(request.url, request.options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          executionTime: performance.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
        },
        metadata: {
          executionTime: performance.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // 查找 operation
  private static findOperation(
    config: PluginConfig,
    operationId: string
  ): OpenAPIOperation | null {
    for (const [path, methods] of Object.entries(config.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (operation.operationId === operationId) {
          return operation;
        }
      }
    }
    return null;
  }

  // 验证参数
  private static validateParameters(
    operation: OpenAPIOperation,
    parameters: Record<string, any>
  ): void {
    for (const param of operation.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      // 类型验证
      const value = parameters[param.name];
      if (value !== undefined) {
        const expectedType = param.schema.type;
        const actualType = typeof value;

        if (expectedType === 'number' && actualType !== 'number') {
          throw new Error(`Parameter ${param.name} must be a number`);
        }
        if (expectedType === 'boolean' && actualType !== 'boolean') {
          throw new Error(`Parameter ${param.name} must be a boolean`);
        }
      }
    }
  }

  // 构建请求
  private static buildRequest(
    plugin: Plugin,
    operation: OpenAPIOperation,
    context: PluginExecutionContext
  ) {
    const baseUrl = plugin.config.servers[0].url;
    let url = baseUrl;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 添加认证
    if (context.credentials) {
      Object.assign(headers, context.credentials);
    }

    // 处理参数
    const queryParams: string[] = [];
    let body: any = undefined;

    for (const param of operation.parameters) {
      const value = context.parameters[param.name];
      if (value === undefined) continue;

      switch (param.in) {
        case 'query':
          queryParams.push(`${param.name}=${encodeURIComponent(value)}`);
          break;
        case 'path':
          url = url.replace(`{${param.name}}`, encodeURIComponent(value));
          break;
        case 'header':
          headers[param.name] = String(value);
          break;
      }
    }

    // 添加 query 参数
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    // 处理 request body
    if (operation.requestBody) {
      body = JSON.stringify(context.parameters);
    }

    return {
      url,
      options: {
        method: 'GET', // 从 operation 获取实际方法
        headers,
        body,
        signal: context.timeout
          ? AbortSignal.timeout(context.timeout)
          : undefined,
      },
    };
  }
}
```

## 六、后端 API 设计

### 6.1 RESTful API

```
GET    /api/plugins              # 获取插件列表
GET    /api/plugins/:id          # 获取插件详情
POST   /api/plugins              # 创建插件
PUT    /api/plugins/:id          # 更新插件
DELETE /api/plugins/:id          # 删除插件

POST   /api/plugins/:id/install    # 安装插件
POST   /api/plugins/:id/uninstall  # 卸载插件
POST   /api/plugins/execute        # 执行插件

GET    /api/plugins/categories   # 获取分类列表
GET    /api/plugins/search        # 搜索插件
```

### 6.2 Go 服务接口

```go
// internal/domain/plugin/service.go
package plugin

import "context"

type Service interface {
    // 插件管理
    ListPlugins(ctx context.Context, req *ListPluginsRequest) (*ListPluginsResponse, error)
    GetPlugin(ctx context.Context, id string) (*Plugin, error)
    CreatePlugin(ctx context.Context, plugin *Plugin) (*Plugin, error)
    UpdatePlugin(ctx context.Context, id string, updates map[string]interface{}) error
    DeletePlugin(ctx context.Context, id string) error

    // 插件安装
    InstallPlugin(ctx context.Context, pluginID, workspaceID string) error
    UninstallPlugin(ctx context.Context, pluginID, workspaceID string) error

    // 插件执行
    ExecutePlugin(ctx context.Context, req *ExecutePluginRequest) (*ExecutePluginResponse, error)

    // 搜索和过滤
    SearchPlugins(ctx context.Context, query string) ([]*Plugin, error)
    GetPluginsByCategory(ctx context.Context, category string) ([]*Plugin, error)
}

type Plugin struct {
    ID          string                 `json:"id"`
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Type        PluginType             `json:"type"`
    Status      PluginStatus           `json:"status"`
    Version     string                 `json:"version"`
    Config      map[string]interface{} `json:"config"`
    Metadata    PluginMetadata         `json:"metadata"`
    CreatedAt   time.Time              `json:"created_at"`
    UpdatedAt   time.Time              `json:"updated_at"`
}

type ExecutePluginRequest struct {
    PluginID    string                 `json:"plugin_id"`
    OperationID string                 `json:"operation_id"`
    Parameters  map[string]interface{} `json:"parameters"`
    Credentials map[string]string      `json:"credentials"`
    Timeout     int                    `json:"timeout"`
}
```

## 七、最佳实践

### 7.1 安全考虑

```typescript
// 参数清洗
function sanitizeParameters(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    // 移除潜在的危险字符
    if (typeof value === 'string') {
      sanitized[key] = value.replace(/<script>/gi, '');
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// 凭证加密存储
import CryptoJS from 'crypto-js';

function encryptCredentials(credentials: Record<string, string>, secretKey: string) {
  return CryptoJS.AES.encrypt(JSON.stringify(credentials), secretKey).toString();
}

function decryptCredentials(encrypted: string, secretKey: string) {
  const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}
```

### 7.2 错误处理

```typescript
async function safeExecutePlugin(context: PluginExecutionContext) {
  try {
    const result = await PluginExecutor.execute(plugin, context);

    if (!result.success) {
      // 记录错误日志
      console.error('Plugin execution failed:', result.error);

      // 用户友好的错误提示
      Message.error(getErrorMessage(result.error.code));
    }

    return result;
  } catch (error) {
    // 未预期的错误
    console.error('Unexpected error:', error);
    Message.error('插件执行失败，请稍后重试');
    throw error;
  }
}

function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    EXECUTION_ERROR: '插件执行失败',
    NETWORK_ERROR: '网络连接失败',
    TIMEOUT_ERROR: '请求超时',
    VALIDATION_ERROR: '参数验证失败',
  };

  return messages[code] || '未知错误';
}
```

### 7.3 性能优化

```typescript
// 插件预加载
useEffect(() => {
  // 预加载常用插件
  const popularPlugins = ['search', 'database', 'weather'];
  popularPlugins.forEach(id => {
    usePluginStore.getState().getPlugin(id);
  });
}, []);

// 请求去重
import { useMemo } from 'react';

const cachedPlugins = useMemo(() => {
  return searchPlugins(searchQuery);
}, [searchQuery, filters]);
```

---

**文档状态**: ✅ 完成
**下一步**: 创建 [22-knowledge-base.md] - 知识库管理文档
