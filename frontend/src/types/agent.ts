// ==================== Agent 基础类型 ====================

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

// ==================== Agent IDE 类型 ====================

/** Agent IDE 面板类型 */
export type PanelType = 'prompt' | 'tools' | 'knowledge' | 'settings';

/** 面板配置项 */
export interface PanelConfig {
  key: PanelType;
  label: string;
  icon: string;
}

/** Agent IDE Store 状态 */
export interface AgentIdeState {
  /** 当前编辑的 Agent */
  currentAgent: Agent | null;
  /** 当前激活的面板 */
  activePanel: PanelType;
  /** 左侧面板宽度 */
  leftPanelWidth: number;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 是否有未保存的更改 */
  hasUnsavedChanges: boolean;
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
}

// ==================== 消息和聊天类型 ====================

/** 消息角色 */
export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

/** 消息状态 */
export enum MessageStatus {
  Sending = 'sending',
  Streaming = 'streaming',
  Complete = 'complete',
  Error = 'error',
}

/** 工具调用 */
export interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
}

/** 消息 */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  functionCalls?: FunctionCall[];
  error?: string;
}

/** 会话 */
export interface Conversation {
  id: string;
  agentId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// ==================== 发布类型 ====================

/** 发布渠道 */
export enum PublishChannel {
  WEB_SDK = 'web_sdk',
  API = 'api',
}

/** 发布状态 */
export enum PublishStatus {
  DRAFT = 'draft',
  PUBLISHING = 'publishing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

/** 渠道配置 */
export interface ChannelConfig {
  channel: PublishChannel;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

/** 发布记录 */
export interface PublishRecord {
  id: string;
  agentId: string;
  version: string;
  description: string;
  channels: PublishChannel[];
  status: PublishStatus;
  createdAt: string;
  publishedAt?: string;
  errorMessage?: string;
}

/** 发布配置 */
export interface PublishConfig {
  agentId: string;
  version: string;
  description: string;
  selectedChannels: PublishChannel[];
  webSdkConfig?: {
    theme: 'light' | 'dark';
    position: 'bottom-right' | 'bottom-left';
  };
  apiConfig?: {
    rateLimit: number;
    allowedOrigins: string[];
  };
}

/** 渠道配置列表 */
export const CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    channel: PublishChannel.WEB_SDK,
    name: 'Web SDK',
    icon: 'icon-global',
    description: '嵌入到网页的聊天窗口',
    enabled: true,
  },
  {
    channel: PublishChannel.API,
    name: 'API',
    icon: 'icon-code',
    description: 'RESTful API 接口调用',
    enabled: true,
  },
];
