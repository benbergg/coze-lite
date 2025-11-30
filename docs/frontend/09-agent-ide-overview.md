# Agent IDE 总体架构（Agent IDE Overview）

> 基于 Coze Studio 源码分析和 Coze Lite 设计的 Agent 集成开发环境架构文档

## 目录

1. [概述](#概述)
2. [Coze Studio Agent IDE 架构分析](#coze-studio-agent-ide-架构分析)
3. [核心概念](#核心概念)
4. [整体架构设计](#整体架构设计)
5. [核心组件](#核心组件)
6. [数据流和状态管理](#数据流和状态管理)
7. [Coze Lite 实现策略](#coze-lite-实现策略)
8. [开发路线图](#开发路线图)
9. [技术选型](#技术选型)
10. [最佳实践](#最佳实践)

---

## 概述

Agent IDE（Agent Integrated Development Environment）是 Coze 平台的核心功能，为用户提供一个完整的 AI Agent 开发环境。它类似于传统的代码 IDE，但专注于 AI Agent 的配置、调试和发布。

### Agent IDE 的核心价值

- **可视化配置**：通过图形界面配置 Agent 的 Prompt、工具和知识库
- **即时调试**：实时测试 Agent 的响应效果，支持流式输出
- **版本管理**：保存和发布 Agent 的不同版本
- **插件生态**：集成丰富的工具和插件，扩展 Agent 能力
- **协作开发**：支持团队协作和权限管理

### Agent IDE vs 传统 IDE

| 特性 | 传统 IDE（VS Code） | Agent IDE（Coze） |
|------|---------------------|-------------------|
| 编辑对象 | 代码文件 | Prompt、配置 |
| 调试方式 | 断点调试 | 对话调试 |
| 运行环境 | 本地/服务器 | 云端 AI 模型 |
| 输出结果 | 控制台日志 | 对话消息 |
| 版本控制 | Git | 内置版本系统 |
| 协作方式 | 代码仓库 | 工作空间共享 |

---

## Coze Studio Agent IDE 架构分析

### 包结构概览

Coze Studio 的 Agent IDE 功能分布在 **51 个子包**中，采用高度模块化的 Base + Adapter 架构：

```
frontend/packages/agent-ide/
├── space-bot/                     # 核心 Bot 功能包（⭐ 核心）
├── layout/                        # 编辑器布局（Base）
├── layout-adapter/                # 编辑器布局适配器
├── bot-config-area/               # Bot 配置区域（Base）
├── bot-config-area-adapter/       # Bot 配置区域适配器
├── prompt/                        # Prompt 编辑器（Base）
├── prompt-adapter/                # Prompt 编辑器适配器
├── plugin-*/                      # 插件系统（6 个包）
├── chat-*/                        # 聊天/调试区（9 个包）
├── tool/                          # 工具管理
├── tool-config/                   # 工具配置
├── workflow/                      # Workflow 集成
├── agent-publish/                 # 发布管理
├── bot-editor-context-store/      # 编辑器上下文状态
├── model-manager/                 # 模型管理
├── onboarding/                    # 欢迎消息
├── debug-tool-list/               # 调试工具列表
└── ...（其他 35 个包）
```

### 核心包分析

#### 1. `space-bot` - 核心功能包

**描述**：空间下的 Bot 能力总成，整合所有 Bot 相关功能

**主要导出**：

```typescript
// package.json 导出结构
{
  "exports": {
    ".": "./src/index.tsx",                    // 主入口
    "./hook": "./src/hook/index.ts",           // 自定义 Hooks
    "./util": "./src/util/index.ts",           // 工具函数
    "./store": "./src/store/index.ts",         // 状态管理
    "./component/*": "./src/component/*",      // 组件
    "./use-create-bot": "./src/hook/use-create-bot/index.tsx",
    ...
  }
}
```

**核心 Store**：

```typescript
// src/store/index.ts
export { useBotListFilterStore } from './bot-list-filter';
export { useRiskWarningStore } from './risk-warning/store';
export { useBotPageStore } from './bot-page/store';
export { useDebugStore } from './debug-panel';         // ⭐ 调试面板状态
export { useBotModeStore } from './bot-mode';          // ⭐ Bot 模式状态
export { useEvaluationPanelStore } from './evaluation-panel';
```

**核心组件**：

```typescript
// src/component/
├── bot-debug-panel/        # 调试面板
├── bot-debug-button/       # 调试按钮
├── bot-diff-view/          # 版本对比视图
├── bot-move-modal/         # 移动 Bot 对话框
├── config-area/            # 配置区域
├── data-memory/            # 数据记忆
├── onboarding-message/     # 欢迎消息
├── table-memory/           # 表格记忆
└── ...
```

#### 2. `layout` / `layout-adapter` - 编辑器布局

**核心组件**：

```typescript
// layout/src/index.tsx
export {
  BotEditorInitLayout,              // 编辑器主布局
  type BotEditorLayoutSlot,         // 布局插槽类型
  type BotEditorLayoutProps,
  type CustomProviderProps,
};

export { BotHeader, type BotHeaderProps } from './components/header';
export { DeployButton } from './components/header/deploy-button';
```

**布局插槽（Slot）设计**：

```typescript
export interface BotEditorLayoutSlot {
  header?: ReactNode;          // 头部区域
  sider?: ReactNode;           // 侧边栏（配置区）
  content?: ReactNode;         // 内容区（预览/调试）
  footer?: ReactNode;          // 底部区域
}
```

#### 3. `bot-config-area` - 配置区域

**功能**：Bot 参数配置界面

```typescript
// bot-config-area/src/model-config-view/
├── dialogue-config-view/    # 对话配置视图
├── single-agent-model-view/ # 单 Agent 模型视图
└── model-config-view.tsx    # 模型配置视图

// 其他配置
├── monetize-config/         # 变现配置
├── query-collect/           # 查询收集
└── ...
```

#### 4. `prompt` - Prompt 编辑器

**核心功能**：
- Prompt 模板编辑
- 变量插入和管理
- 语法高亮
- 自动补全

#### 5. `chat-*` 系列 - 聊天/调试区

**相关包**：

```
chat-area-plugin-debug-common/    # 插件调试通用逻辑
chat-area-provider/               # 聊天区域提供者（Base）
chat-area-provider-adapter/       # 聊天区域提供者适配器
chat-background/                  # 聊天背景
chat-background-config-content/   # 背景配置内容
chat-background-shared/           # 背景共享逻辑
chat-components-adapter/          # 聊天组件适配器
chat-debug-area/                  # 聊天调试区域
```

#### 6. `plugin-*` 系列 - 插件系统

**相关包**：

```
plugin-area-adapter/           # 插件区域适配器
plugin-content/                # 插件内容（Base）
plugin-content-adapter/        # 插件内容适配器
plugin-modal-adapter/          # 插件模态框适配器
plugin-setting/                # 插件设置（Base）
plugin-setting-adapter/        # 插件设置适配器
plugin-shared/                 # 插件共享逻辑
```

#### 7. `agent-publish` - 发布管理

**核心组件**：

```typescript
// agent-publish/src/components/bot-publish/
├── hooks/
│   ├── use-auth-fail.ts
│   └── use-get-bot-info.ts
├── publish-result/           # 发布结果
├── publish-table/            # 发布表格
│   └── table-collection/     # 表格集合
└── index.tsx
```

### 调试面板实现详解

**文件**：`space-bot/src/component/bot-debug-panel/index.tsx`

```typescript
import { useHotkeys } from 'react-hotkeys-hook';
import { Suspense, lazy, useEffect } from 'react';
import { useDebugStore } from '../../store/debug-panel';

const DebugPanel = lazy(() => import('@coze-devops/debug-panel'));

export const BotDebugPanel = () => {
  const {
    isDebugPanelShow,
    currentDebugQueryId,
    setIsDebugPanelShow,
    setCurrentDebugQueryId,
  } = useDebugStore();

  // ⭐ 快捷键支持：Ctrl+K / Cmd+K
  useHotkeys('ctrl+k, meta+k', () => {
    setCurrentDebugQueryId('');
    setIsDebugPanelShow(!isDebugPanelShow);
  });

  // ⭐ 调整页面布局以适应调试面板
  useEffect(() => {
    if (isDebugPanelShow) {
      setPCBodyWithDebugPanel();
      window.scrollTo(document.body.scrollWidth, 0);
    } else {
      setPCBody();
    }
    return () => setPCBody();
  }, [isDebugPanelShow]);

  return isDebugPanelShow ? (
    <Suspense fallback={<Spin />}>
      <DebugPanel
        isShow={isDebugPanelShow}
        botId={botId}
        userID={userID}
        spaceID={spaceID}
        placement="left"
        currentQueryLogId={currentDebugQueryId}
        onClose={() => {
          setIsDebugPanelShow(false);
          setCurrentDebugQueryId('');
        }}
      />
    </Suspense>
  ) : null;
};
```

**关键技术点**：
1. **懒加载**：使用 `lazy()` 动态导入调试面板
2. **快捷键**：使用 `react-hotkeys-hook` 支持键盘快捷键
3. **布局适配**：动态调整页面布局以容纳调试面板
4. **Suspense**：提供加载状态

### 依赖关系

`space-bot` 包的主要依赖（从 `package.json` 提取）：

**Agent IDE 内部依赖**：
```json
{
  "@coze-agent-ide/agent-ide-commons": "workspace:*",
  "@coze-agent-ide/bot-creator-context": "workspace:*",
  "@coze-agent-ide/bot-editor-context-store": "workspace:*",
  "@coze-agent-ide/chat-background": "workspace:*",
  "@coze-agent-ide/debug-tool-list": "workspace:*",
  "@coze-agent-ide/model-manager": "workspace:*",
  "@coze-agent-ide/tool": "workspace:*",
  "@coze-agent-ide/tool-config": "workspace:*"
}
```

**架构层依赖**：
```json
{
  "@coze-arch/bot-api": "workspace:*",
  "@coze-arch/bot-studio-store": "workspace:*",
  "@coze-arch/coze-design": "0.0.6-alpha.346d77"
}
```

**数据层依赖**：
```json
{
  "@coze-data/database": "workspace:*",
  "@coze-data/knowledge-data-set-for-agent": "workspace:*"
}
```

**第三方库**：
```json
{
  "zustand": "^4.4.7",
  "ahooks": "^3.7.8",
  "react-hotkeys-hook": "~4.5.0",
  "immer": "^10.0.3",
  "lodash-es": "^4.17.21"
}
```

---

## 核心概念

### 1. Agent（智能体）

**定义**：Agent 是一个具有特定能力和知识的 AI 助手，由以下部分组成：

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;

  // 核心配置
  prompt: string;              // 系统 Prompt
  model: string;               // 使用的 AI 模型

  // 能力扩展
  tools: Tool[];               // 工具/插件列表
  knowledgeBases: KnowledgeBase[];  // 知识库
  workflows: Workflow[];       // 关联的 Workflow

  // 交互配置
  welcomeMessage?: string;     // 欢迎消息
  suggestedQueries?: string[]; // 建议问题

  // 高级配置
  temperature: number;         // 温度参数（0-1）
  maxTokens: number;          // 最大 Token 数

  // 元数据
  version: string;            // 版本号
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}
```

### 2. Prompt（提示词）

**定义**：Prompt 是 Agent 的核心配置，定义 Agent 的行为和能力。

**类型**：

- **System Prompt**：定义 Agent 的角色和能力范围
- **User Prompt**：用户输入的问题
- **Assistant Prompt**：AI 的回复
- **Function Call Prompt**：工具调用的 Prompt

**变量系统**：

```typescript
interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description?: string;
  defaultValue?: any;
  required: boolean;
}

// 示例 Prompt
const systemPrompt = `
你是一个专业的客服助手，名字叫{{agent_name}}。
你可以访问以下工具：{{available_tools}}
当前时间：{{current_time}}
`;
```

### 3. Tool（工具）

**定义**：Tool 是 Agent 可以调用的外部能力，如 API、插件、数据库查询等。

```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'plugin' | 'api' | 'workflow' | 'knowledge';

  // 工具配置
  parameters: ToolParameter[];
  authentication?: AuthConfig;

  // 调用配置
  enabled: boolean;
  priority: number;
}

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
  default?: any;
}
```

### 4. Knowledge Base（知识库）

**定义**：知识库是 Agent 的外部知识来源，支持 RAG（检索增强生成）。

```typescript
interface KnowledgeBase {
  id: string;
  name: string;
  type: 'document' | 'table' | 'api';

  // 文档知识库
  documents?: Document[];

  // 表格知识库（结构化数据）
  tables?: Table[];

  // 检索配置
  retrievalConfig: {
    topK: number;              // 返回 Top-K 结果
    similarityThreshold: number; // 相似度阈值
  };
}
```

### 5. Debug Session（调试会话）

**定义**：调试会话记录 Agent 的完整执行过程，用于调试和优化。

```typescript
interface DebugSession {
  id: string;
  agentId: string;

  // 对话记录
  messages: Message[];

  // 执行跟踪
  trace: {
    toolCalls: ToolCall[];     // 工具调用记录
    knowledgeRetrieval: RetrievalRecord[];  // 知识检索记录
    modelCalls: ModelCall[];   // 模型调用记录
  };

  // 性能指标
  metrics: {
    totalTokens: number;
    latency: number;           // 延迟（ms）
    cost: number;              // 成本
  };

  createdAt: string;
}
```

---

## 整体架构设计

### 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│                         (呈现层)                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Header    │  │   Config    │  │    Debug    │         │
│  │   头部区域   │  │   配置区域   │  │   调试区域   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│                         (业务逻辑层)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Agent     │  │   Prompt    │  │    Tool     │         │
│  │   Manager   │  │   Editor    │  │   Manager   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Knowledge  │  │   Debug     │  │   Publish   │         │
│  │   Manager   │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
│                        (数据层)                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Agent     │  │   Session   │  │    User     │         │
│  │   Store     │  │   Store     │  │    Store    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │              API Client Layer                     │       │
│  │   (Agent API, Tool API, Knowledge API)           │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent IDE Header                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Logo   │  │Agent Info│  │  Debug   │  │ Publish  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────────┐
│                               │                                 │
│   Left Config Panel           │   Right Preview/Debug Area      │
│   (左侧配置面板)               │   (右侧预览/调试区)              │
│                               │                                 │
│  ┌─────────────────────────┐  │  ┌──────────────────────────┐  │
│  │  Basic Info             │  │  │  Chat Interface          │  │
│  │  - Agent Name           │  │  │  ┌────────────────────┐  │  │
│  │  - Description          │  │  │  │ User: Hello        │  │  │
│  │  - Icon                 │  │  │  │ Agent: Hi there!   │  │  │
│  └─────────────────────────┘  │  │  │ User: ...          │  │  │
│                               │  │  └────────────────────┘  │  │
│  ┌─────────────────────────┐  │  │                          │  │
│  │  Model Config           │  │  │  ┌────────────────────┐  │  │
│  │  - Model Selection      │  │  │  │ Input Box          │  │  │
│  │  - Temperature          │  │  │  └────────────────────┘  │  │
│  │  - Max Tokens           │  │  └──────────────────────────┘  │
│  └─────────────────────────┘  │                                 │
│                               │  ┌──────────────────────────┐  │
│  ┌─────────────────────────┐  │  │  Debug Panel (Ctrl+K)    │  │
│  │  Prompt Editor          │  │  │  - Tool Calls            │  │
│  │  ┌───────────────────┐  │  │  │  - Knowledge Retrieval   │  │
│  │  │ You are a ...     │  │  │  │  - Token Usage           │  │
│  │  │ {{agent_name}}    │  │  │  │  - Latency               │  │
│  │  └───────────────────┘  │  │  └──────────────────────────┘  │
│  └─────────────────────────┘  │                                 │
│                               │                                 │
│  ┌─────────────────────────┐  │                                 │
│  │  Tools                  │  │                                 │
│  │  □ Web Search           │  │                                 │
│  │  ☑ Database Query       │  │                                 │
│  │  ☑ Image Generation     │  │                                 │
│  └─────────────────────────┘  │                                 │
│                               │                                 │
│  ┌─────────────────────────┐  │                                 │
│  │  Knowledge Base         │  │                                 │
│  │  + Add Knowledge        │  │                                 │
│  └─────────────────────────┘  │                                 │
│                               │                                 │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## 核心组件

### 1. AgentEditorLayout 组件

**职责**：提供 Agent IDE 的整体布局结构

```typescript
interface AgentEditorLayoutProps {
  agentId?: string;

  // 插槽
  slots?: {
    header?: ReactNode;
    sidebar?: ReactNode;
    content?: ReactNode;
  };

  // 配置
  showDebugPanel?: boolean;
  onDebugToggle?: (visible: boolean) => void;
}

export function AgentEditorLayout({
  agentId,
  slots,
  showDebugPanel,
  onDebugToggle,
}: AgentEditorLayoutProps) {
  return (
    <div className="agent-editor-layout">
      <Header>{slots?.header}</Header>
      <div className="agent-editor-body">
        <Sidebar>{slots?.sidebar || <DefaultConfigPanel />}</Sidebar>
        <Main>{slots?.content || <DefaultChatArea />}</Main>
        {showDebugPanel && <DebugPanel />}
      </div>
    </div>
  );
}
```

### 2. ConfigPanel 组件

**职责**：Agent 配置面板（左侧）

```typescript
interface ConfigPanelProps {
  agentId: string;
  onSave?: (config: AgentConfig) => void;
}

export function ConfigPanel({ agentId, onSave }: ConfigPanelProps) {
  const { agent, updateAgent } = useAgentStore();

  return (
    <div className="config-panel">
      <Tabs>
        <TabPane key="basic" tab="基本信息">
          <BasicInfoForm agent={agent} onChange={updateAgent} />
        </TabPane>

        <TabPane key="prompt" tab="Prompt">
          <PromptEditor
            value={agent.prompt}
            onChange={(value) => updateAgent({ prompt: value })}
          />
        </TabPane>

        <TabPane key="model" tab="模型">
          <ModelConfigForm
            model={agent.model}
            temperature={agent.temperature}
            maxTokens={agent.maxTokens}
            onChange={updateAgent}
          />
        </TabPane>

        <TabPane key="tools" tab="工具">
          <ToolSelector
            selectedTools={agent.tools}
            onChange={(tools) => updateAgent({ tools })}
          />
        </TabPane>

        <TabPane key="knowledge" tab="知识库">
          <KnowledgeBaseManager
            knowledgeBases={agent.knowledgeBases}
            onChange={(kbs) => updateAgent({ knowledgeBases: kbs })}
          />
        </TabPane>
      </Tabs>

      <div className="config-panel-footer">
        <Button onClick={() => onSave?.(agent)}>保存</Button>
      </div>
    </div>
  );
}
```

### 3. PromptEditor 组件

**职责**：Prompt 编辑器，支持变量插入和语法高亮

```typescript
interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables?: PromptVariable[];
}

export function PromptEditor({
  value,
  onChange,
  variables,
}: PromptEditorProps) {
  const [cursorPosition, setCursorPosition] = useState(0);

  const insertVariable = (variableName: string) => {
    const newValue =
      value.slice(0, cursorPosition) +
      `{{${variableName}}}` +
      value.slice(cursorPosition);
    onChange(newValue);
  };

  return (
    <div className="prompt-editor">
      <Toolbar>
        <Dropdown
          trigger={<Button>插入变量</Button>}
          overlay={
            <Menu>
              {variables?.map((v) => (
                <Menu.Item key={v.name} onClick={() => insertVariable(v.name)}>
                  {v.name} - {v.description}
                </Menu.Item>
              ))}
            </Menu>
          }
        />
      </Toolbar>

      <TextArea
        value={value}
        onChange={onChange}
        onCursorChange={setCursorPosition}
        placeholder="输入 System Prompt..."
        rows={10}
      />

      <VariableList variables={variables} />
    </div>
  );
}
```

### 4. ChatArea 组件

**职责**：对话调试区域（右侧）

```typescript
interface ChatAreaProps {
  agentId: string;
  sessionId?: string;
}

export function ChatArea({ agentId, sessionId }: ChatAreaProps) {
  const { messages, sendMessage, isLoading } = useChatSession(agentId, sessionId);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;

    await sendMessage(input);
    setInput('');
  };

  return (
    <div className="chat-area">
      <MessageList messages={messages} />

      <InputArea>
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="输入消息..."
        />
        <Button
          type="primary"
          onClick={handleSend}
          loading={isLoading}
        >
          发送
        </Button>
      </InputArea>
    </div>
  );
}
```

### 5. DebugPanel 组件

**职责**：调试面板，展示执行细节

```typescript
interface DebugPanelProps {
  sessionId: string;
  onClose?: () => void;
}

export function DebugPanel({ sessionId, onClose }: DebugPanelProps) {
  const { trace, metrics } = useDebugSession(sessionId);

  return (
    <Drawer
      title="调试信息"
      visible
      onClose={onClose}
      width={400}
    >
      <Tabs>
        <TabPane key="trace" tab="执行跟踪">
          <Timeline>
            {trace?.toolCalls?.map((call) => (
              <Timeline.Item key={call.id}>
                <div>调用工具: {call.toolName}</div>
                <Code>{JSON.stringify(call.arguments, null, 2)}</Code>
              </Timeline.Item>
            ))}
          </Timeline>
        </TabPane>

        <TabPane key="knowledge" tab="知识检索">
          {trace?.knowledgeRetrieval?.map((retrieval) => (
            <Card key={retrieval.id}>
              <div>查询: {retrieval.query}</div>
              <div>相似度: {retrieval.similarity}</div>
              <div>内容: {retrieval.content}</div>
            </Card>
          ))}
        </TabPane>

        <TabPane key="metrics" tab="性能指标">
          <Descriptions>
            <Descriptions.Item label="Token 使用">
              {metrics?.totalTokens}
            </Descriptions.Item>
            <Descriptions.Item label="延迟">
              {metrics?.latency}ms
            </Descriptions.Item>
            <Descriptions.Item label="成本">
              ${metrics?.cost}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>
      </Tabs>
    </Drawer>
  );
}
```

---

## 数据流和状态管理

### Store 架构

```typescript
// Agent Store - Agent 配置和状态
interface AgentStore {
  // State
  currentAgent: Agent | null;
  agents: Agent[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  fetchAgent: (id: string) => Promise<void>;
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<void>;
  createAgent: (data: CreateAgentRequest) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
  publishAgent: (id: string) => Promise<void>;
}

// Chat Session Store - 对话会话状态
interface ChatSessionStore {
  sessions: Record<string, ChatSession>;
  currentSessionId: string | null;

  // Actions
  createSession: (agentId: string) => string;
  sendMessage: (sessionId: string, content: string) => Promise<void>;
  clearSession: (sessionId: string) => void;
}

// Debug Store - 调试状态
interface DebugStore {
  isDebugPanelVisible: boolean;
  currentDebugSession: DebugSession | null;

  // Actions
  toggleDebugPanel: () => void;
  setDebugSession: (session: DebugSession) => void;
}
```

### 实现示例（Zustand）

```typescript
// frontend/src/stores/agent.ts
import { create } from 'zustand';
import { agentApi } from '@/services/api/agent';

export const useAgentStore = create<AgentStore>((set, get) => ({
  currentAgent: null,
  agents: [],
  isLoading: false,
  error: null,

  fetchAgent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const agent = await agentApi.getById(id);
      set({ currentAgent: agent, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },

  updateAgent: async (id, updates) => {
    const updatedAgent = await agentApi.update(id, updates);
    set((state) => ({
      currentAgent: state.currentAgent?.id === id ? updatedAgent : state.currentAgent,
      agents: state.agents.map((a) => (a.id === id ? updatedAgent : a)),
    }));
  },

  createAgent: async (data) => {
    const newAgent = await agentApi.create(data);
    set((state) => ({
      agents: [...state.agents, newAgent],
    }));
    return newAgent;
  },

  // ...
}));
```

### 数据流向

```
┌─────────────┐
│   User      │
│   Action    │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  UI Component    │ ← useAgentStore()
└──────┬───────────┘
       │
       v
┌──────────────────┐
│  Store Action    │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│   API Client     │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│   Backend API    │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│  Store Update    │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│  UI Re-render    │
└──────────────────┘
```

---

## Coze Lite 实现策略

### 简化原则

Coze Lite 将大幅简化 Coze Studio 的 Agent IDE 实现：

❌ **移除的复杂特性**：
- Base + Adapter 双层架构
- 51 个子包拆分
- 复杂的插槽系统
- 企业级权限控制
- 多版本管理
- 复杂的发布流程

✅ **保留的核心功能**：
- Agent 基本配置（Name, Description, Prompt, Model）
- Prompt 编辑器（基础版）
- 工具选择和配置（简化版）
- 对话调试界面
- 基础调试信息

### 实现阶段

#### Phase 1: 基础 Agent IDE（MVP）

**目标**：实现最基本的 Agent 配置和调试

**功能**：
- ✅ Agent 列表页（已完成，见 workspace 模块）
- Agent 创建和编辑页面
- 基础配置表单（Name, Description, Model）
- 简单的 Prompt 编辑器
- 基础对话调试界面

**实现文件**：
```
frontend/src/
├── pages/
│   └── agent/
│       ├── list.tsx          # Agent 列表（已有）
│       ├── editor.tsx         # Agent 编辑器（新建）
│       └── components/
│           ├── config-panel.tsx    # 配置面板
│           ├── chat-area.tsx       # 对话区域
│           └── prompt-editor.tsx   # Prompt 编辑器
├── stores/
│   ├── agent.ts              # Agent Store
│   └── chat-session.ts       # Chat Session Store
├── types/
│   └── agent.ts              # Agent 类型定义
└── services/
    └── api/
        └── agent.ts          # Agent API 客户端
```

**预计工作量**：5-7 天

#### Phase 2: 工具系统

**目标**：支持工具/插件的选择和配置

**功能**：
- 工具列表展示
- 工具启用/禁用
- 工具参数配置
- 工具调用记录

**预计工作量**：3-5 天

#### Phase 3: 知识库集成

**目标**：支持知识库的添加和管理

**功能**：
- 知识库选择器
- 文档上传
- RAG 配置

**预计工作量**：4-6 天

#### Phase 4: 调试增强

**目标**：提供更详细的调试信息

**功能**：
- 调试面板（Ctrl+K）
- 工具调用跟踪
- Token 使用统计
- 性能指标

**预计工作量**：3-4 天

#### Phase 5: 发布管理

**目标**：支持 Agent 的发布和版本管理

**功能**：
- 版本列表
- 发布流程
- 版本对比

**预计工作量**：2-3 天

### 总预计工作量

**Phase 1-5 总计**：17-25 天

---

## 技术选型

### UI 组件

- **表单组件**：Arco Design Form, Input, Select
- **编辑器**：Arco Design Input.TextArea（简化版）
- **布局**：Arco Design Layout, Split
- **数据展示**：Arco Design Table, Card, Tabs

### 状态管理

- **Zustand**：轻量级状态管理
- **React Query**（可选）：服务端状态缓存

### 工具库

- **ahooks**：实用 Hooks
- **dayjs**：时间处理
- **lodash-es**：工具函数

### 代码高亮（未来）

- **monaco-editor**（Coze Studio 使用）或
- **@uiw/react-textarea-code-editor**（轻量级选择）

---

## 开发路线图

### 第 1 周：Agent 编辑器基础

- [ ] 创建 Agent 编辑器页面路由
- [ ] 实现 Agent Store
- [ ] 实现 ConfigPanel 组件
- [ ] 实现基础表单（Name, Description, Model）

### 第 2 周：Prompt 编辑器和对话调试

- [ ] 实现 PromptEditor 组件
- [ ] 实现 ChatArea 组件
- [ ] 实现 ChatSession Store
- [ ] 集成流式输出

### 第 3 周：工具系统

- [ ] 设计 Tool 数据类型
- [ ] 实现 ToolSelector 组件
- [ ] 实现工具配置表单
- [ ] 集成工具 API

### 第 4 周：知识库和调试

- [ ] 实现知识库选择器
- [ ] 实现 DebugPanel 组件
- [ ] 实现调试信息展示
- [ ] 完善整体交互

### 第 5 周：发布和优化

- [ ] 实现发布流程
- [ ] 性能优化
- [ ] Bug 修复
- [ ] 文档完善

---

## 最佳实践

### 1. 组件设计

✅ **单一职责**：每个组件只负责一个明确的功能

```typescript
// ✅ Good: 单一职责
function PromptEditor({ value, onChange }) {
  // 只负责 Prompt 编辑
}

function ToolSelector({ tools, onChange }) {
  // 只负责工具选择
}

// ❌ Bad: 职责过多
function AgentConfig({ agent, onChange }) {
  // 包含 Prompt 编辑、工具选择、模型配置...
}
```

### 2. 状态管理

✅ **按领域拆分 Store**

```typescript
// ✅ Good: 按领域拆分
useAgentStore()       // Agent 配置
useChatSessionStore() // 对话会话
useDebugStore()       // 调试状态

// ❌ Bad: 所有状态混在一起
useGlobalStore()
```

### 3. API 设计

✅ **RESTful 风格**

```typescript
// Agent API
GET    /api/agents           # 列表
POST   /api/agents           # 创建
GET    /api/agents/:id       # 详情
PUT    /api/agents/:id       # 更新
DELETE /api/agents/:id       # 删除

// Chat API
POST   /api/agents/:id/chat  # 发送消息
```

### 4. 错误处理

✅ **统一错误处理**

```typescript
try {
  await updateAgent(id, updates);
  Message.success('保存成功');
} catch (error) {
  console.error('Update agent error:', error);
  Message.error(error.message || '保存失败');
}
```

### 5. 类型安全

✅ **完整的类型定义**

```typescript
// ✅ 定义所有接口
interface Agent { ... }
interface CreateAgentRequest { ... }
interface UpdateAgentRequest { ... }

// ✅ 使用 TypeScript 泛型
const useAgentStore = create<AgentStore>()(...);
```

---

## 总结

### 核心要点

1. **Coze Studio Agent IDE** 是一个高度模块化的系统，包含 51 个子包
2. **核心功能** 包括：配置编辑、Prompt 编辑、工具管理、对话调试、发布管理
3. **Coze Lite** 将采用简化实现，专注于核心功能
4. **开发周期** 预计 4-5 周完成基础版本

### 下一步

根据文档规划，接下来将创建：

1. **10-agent-ide-layout.md** - 布局系统详解
2. **11-agent-ide-prompt.md** - Prompt 编辑器实现
3. **12-agent-ide-tools.md** - 工具管理系统
4. **13-agent-ide-chat.md** - 聊天调试区
5. **14-agent-ide-publish.md** - 发布管理

每个文档将深入讲解对应模块的实现细节和最佳实践。

---

## 参考资源

### Coze Studio 源码

- `packages/agent-ide/space-bot/` - 核心 Bot 功能
- `packages/agent-ide/layout/` - 编辑器布局
- `packages/agent-ide/prompt/` - Prompt 编辑器
- `packages/agent-ide/chat-*/` - 聊天调试系列

### 相关文档

- [01-architecture-overview.md](./01-architecture-overview.md) - 整体架构
- [05-state-management.md](./05-state-management.md) - 状态管理
- [08-workspace-module.md](./08-workspace-module.md) - 工作空间模块

### 外部资源

- [Coze 官方文档](https://www.coze.cn/docs)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [Arco Design](https://arco.design/)

---

**文档版本**：1.0
**最后更新**：2025-11-30
**作者**：Coze Lite Team
