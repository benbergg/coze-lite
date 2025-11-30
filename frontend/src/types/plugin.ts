import { z } from 'zod';

// 插件类型枚举
export enum PluginType {
  FORM = 'form', // 表单插件
  CODE = 'code', // 代码插件
  API = 'api', // API 插件
  KNOWLEDGE = 'knowledge', // 知识库插件
}

// 插件状态
export enum PluginStatus {
  DRAFT = 'draft', // 草稿
  PUBLISHED = 'published', // 已发布
  DEPRECATED = 'deprecated', // 已废弃
}

// 插件可见性
export enum PluginVisibility {
  PUBLIC = 'public', // 公开
  PRIVATE = 'private', // 私有
  TEAM = 'team', // 团队
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
    servers: z.array(
      z.object({
        url: z.string().url(),
        description: z.string().optional(),
      })
    ),
    paths: z.record(z.string(), z.any()),
  }),
  metadata: z.object({
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
  }),
});

export type PluginFormData = z.infer<typeof PluginSchema>;
