# Agent IDE - 聊天调试区

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-agent-ide/chat-debug-area`, `@coze-common/chat-area`, `@coze-common/chat-core`

## 一、概述

聊天调试区是 Agent IDE 的核心交互界面，开发者在这里测试 Agent 的对话能力、调试工具调用、查看执行日志。本文档深度剖析 Coze Studio 的聊天系统架构，并提供 Coze Lite 的简化实现方案。

### 1.1 核心功能

- **消息渲染**: 用户消息、助手消息、系统消息的展示
- **流式输出**: 实时逐字显示 AI 生成的内容
- **多模态支持**: 文本、图片、文件的上传和展示
- **工具调用展示**: 可视化 Agent 调用的工具和参数
- **调试控制**: 清空对话、停止生成、重新发送
- **对话历史**: 加载更多历史消息

### 1.2 Coze Studio 包架构

Coze Studio 的聊天系统分为 3 层架构：

```bash
├── chat-core                      # 底层 SDK（核心逻辑）
│   ├── message-manager            # 消息状态管理
│   ├── http-chunk                 # HTTP 流式传输
│   ├── channel                    # 通信通道
│   └── plugins                    # 上传等插件
│
├── chat-area                      # UI 组件层（通用）
│   ├── components/
│   │   ├── message-box            # 消息气泡
│   │   ├── chat-input             # 输入框
│   │   ├── message-group-list     # 消息列表
│   │   └── function-call-message  # 工具调用消息
│   ├── context/                   # 上下文管理
│   └── hooks/                     # 通用 Hooks
│
└── chat-debug-area                # Agent IDE 专用层
    ├── BotDebugChatArea           # 调试聊天区主组件
    ├── BotDebugChatAreaProvider   # Provider 封装
    ├── plugins/shortcut           # 快捷指令插件
    └── components/onboarding      # 开场白组件
```

## 二、Coze Studio 源码分析

### 2.1 核心组件 - BotDebugChatArea

**文件位置**: `chat-debug-area/src/index.tsx:50-145`

```typescript
export const BotDebugChatArea = ({
  readOnly = false,
  headerNode,
}: {
  readOnly?: boolean;
  headerNode?: ReactNode;
}) => {
  const [enableSendMultimodalMessage, setEnableSendMultimodalMessage] = useState<boolean>(true);

  // 初始化状态（unInit, loading, success, initFail）
  const initStatus = useInitStatus();

  // 自动保存状态（拦截发送）
  const { savingInfo } = usePageRuntimeStore(
    useShallow(state => ({ savingInfo: state.savingInfo }))
  );
  const interceptSend = savingInfo.saving;

  // 发送前拦截
  const onBeforeSubmit = () => {
    if (interceptSend) {
      Toast.warning({ content: '正在自动保存，请稍后...' });
    }
    return !interceptSend;
  };

  const { latestSectionMessageLength } = useLatestSectionMessage();
  const injectComponents = useBotDebugChatAreaComponent();
  const userHasSentMessage = latestSectionMessageLength > 0;

  // 加载中状态
  if (initStatus === 'unInit' || initStatus === 'loading') {
    return (
      <div className={retryStyles['home-state']}>
        <Spin size="middle" />
      </div>
    );
  }

  // 初始化失败状态
  if (initStatus === 'initFail') {
    return <InitFail />;
  }

  // 自定义组件类型映射
  const chatAreaComponentTypes: Partial<ComponentTypesMap> = {
    // 消息操作栏（复制、重试等）
    messageActionBarFooter: MessageBoxActionBarAdapter,
    messageActionBarHoverContent: () => null,

    // 工作流渲染器
    contentBox: WorkflowRender,

    // 开场白组件
    onboarding: OnboardingMessagePop,

    // 接收消息盒子（自定义样式）
    receiveMessageBox: ReceiveMessageBox,

    // 输入框顶部插槽（快捷指令栏）
    chatInputIntegration: {
      renderChatInputTopSlot: controller =>
        ShortcutBarRender({
          controller,
          onShortcutActive: shortcut => {
            // 根据快捷指令类型切换多模态支持
            const isTemplateShortcutActive = shortcut?.send_type === SendType.SendTypePanel;
            const enableMultimodalArea = !isTemplateShortcutActive;
            setEnableSendMultimodalMessage(enableMultimodalArea);
          },
        }),
    },
  };

  return (
    <ChatArea
      readonly={readOnly}
      componentTypes={merge(chatAreaComponentTypes, injectComponents)}
      enableMessageBoxActionBar              // 启用消息操作栏
      enableMultimodalUpload={enableSendMultimodalMessage}  // 多模态上传
      enableLegacyUpload={!enableSendMultimodalMessage}     // 传统上传
      textareaBottomTips="AI 生成内容可能不准确"
      chatInputProps={{
        wrapperClassName: s['chat-input-wrapper'],
        onBeforeSubmit,
        uploadButtonTooltipContent: <UploadTooltipsContent />,
        submitClearInput: !interceptSend,
      }}
      textareaPlaceholder={
        userHasSentMessage
          ? '继续对话...'
          : '输入消息开始对话'
      }
      isOnboardingCentered                   // 开场白居中
      headerNode={headerNode}                // 自定义头部
      fileLimit={10}                         // 文件上传限制 10 个
    />
  );
};
```

**关键设计点**:
1. **组件注入机制**: 通过 `componentTypes` 自定义各部分 UI
2. **状态拦截**: 自动保存时拦截发送操作
3. **多模态控制**: 根据快捷指令动态切换上传模式
4. **占位符智能化**: 首次对话和后续对话不同提示

### 2.2 Provider 层 - BotDebugChatAreaProvider

**文件位置**: `chat-area-provider/src/provider/index.tsx:39-74`

```typescript
export interface BotDebugChatAreaProviderProps {
  botId: string;
  pluginRegistryList?: PluginRegistryEntry<any>[];
  onInitRequestSuccess?: (params: { conversationId: string }) => void;
  requestToInit: () => Promise<MixInitResponse>;
  showBackground: boolean;
  grabEnableUpload: boolean;
}

export const BotDebugChatAreaProvider: React.FC<
  PropsWithChildren<BotDebugChatAreaProviderProps>
> = ({
  children,
  botId,
  pluginRegistryList,
  requestToInit,
  showBackground,
  grabEnableUpload,
}) => {
  useMessageReportEvent();  // 消息上报事件
  const userSenderInfo = useUserSenderInfo();

  return (
    <ChatAreaProvider
      spaceId={useSpaceStore.getState().getSpaceId()}
      botId={botId}
      scene={Scene.Playground}        // 场景：Playground（调试模式）
      userInfo={userSenderInfo}
      requestToInit={requestToInit}   // 初始化请求（获取会话ID、历史消息）
      reporter={reporter}             // 日志上报器
      enableChatActionLock            // 启用操作锁（防止重复发送）
      enableChatCoreDebug             // 启用调试日志
      pluginRegistryList={pluginRegistryList}  // 插件注册列表
      enableImageAutoSize={true}
      enablePasteUpload={grabEnableUpload}     // 粘贴上传
      enableDragUpload={grabEnableUpload}      // 拖拽上传
      uikitChatInputButtonStatus={{
        isMoreButtonDisabled: !grabEnableUpload,
      }}
      showBackground={showBackground}
    >
      {children}
    </ChatAreaProvider>
  );
};
```

**关键设计点**:
1. **Scene 概念**: Playground（调试）vs Production（生产）
2. **插件系统**: 可扩展的插件注册机制
3. **上传控制**: 统一管理粘贴/拖拽上传开关

### 2.3 消息数据流

#### 发送消息流程

```typescript
// 1. 用户输入 → ChatInput
const handleSend = async (content: string, files: File[]) => {
  // 2. 创建预发送本地消息（立即展示）
  const localMessage = createPresendLocalMessage({
    content,
    files,
    senderId: userId,
    timestamp: Date.now(),
  });

  // 3. 添加到消息列表
  messageManager.addPresendMessage(localMessage);

  // 4. 调用 HTTP Chunk API（流式传输）
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        message: content,
        files: fileIds,
      }),
    });

    // 5. 处理 SSE 流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          // 6. 更新消息内容
          if (data.type === 'answer') {
            messageManager.updateAssistantMessage(data.message_id, {
              content: data.content,
              isDelta: true,  // 增量更新
            });
          }

          // 7. 工具调用
          if (data.type === 'function_call') {
            messageManager.addFunctionCallMessage({
              tool_name: data.tool,
              arguments: data.arguments,
              result: data.result,
            });
          }
        }
      }
    }

    // 8. 标记消息完成
    messageManager.markMessageComplete(messageId);
  } catch (error) {
    // 9. 错误处理
    messageManager.markMessageError(localMessage.id, error.message);
  }
};
```

#### 消息状态类型

```typescript
// Coze Studio 消息状态
export enum MessageStatus {
  Sending = 'sending',       // 发送中
  Sent = 'sent',            // 已发送
  Streaming = 'streaming',  // 流式生成中
  Complete = 'complete',    // 已完成
  Error = 'error',          // 错误
  Stopped = 'stopped',      // 已停止
}

// 消息类型
export enum MessageType {
  User = 'user',            // 用户消息
  Assistant = 'assistant',  // 助手消息
  System = 'system',        // 系统消息
  FunctionCall = 'function_call',  // 工具调用
}

// 消息数据结构
export interface Message {
  id: string;
  conversation_id: string;
  type: MessageType;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: MessageStatus;
  created_at: number;
  updated_at: number;

  // 可选字段
  files?: FileAttachment[];
  function_calls?: FunctionCall[];
  metadata?: Record<string, any>;
}
```

### 2.4 流式渲染机制

Coze Studio 使用 **HTTP Chunk** 实现流式渲染：

**文件位置**: `chat-core/src/channel/http-chunk/index.ts`

```typescript
export class HttpChunkChannel {
  private decoder = new TextDecoder();
  private buffer = '';

  async startStreaming(url: string, body: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        this.processBuffer();  // 处理剩余缓冲
        break;
      }

      // 解码并累积到缓冲区
      this.buffer += this.decoder.decode(value, { stream: true });

      // 按行处理
      this.processBuffer();
    }
  }

  private processBuffer() {
    const lines = this.buffer.split('\n');

    // 保留最后一行（可能不完整）
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() === '') continue;

      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          this.handleChunk(data);
        } catch (error) {
          console.error('Failed to parse chunk:', error);
        }
      }
    }
  }

  private handleChunk(data: any) {
    switch (data.type) {
      case 'answer':
        // 增量更新助手消息
        this.updateMessage(data.message_id, data.content, true);
        break;

      case 'function_call':
        // 添加工具调用消息
        this.addFunctionCall(data);
        break;

      case 'done':
        // 标记完成
        this.markComplete(data.message_id);
        break;

      case 'error':
        // 标记错误
        this.markError(data.message_id, data.error);
        break;
    }
  }
}
```

### 2.5 工具调用展示

**文件位置**: `chat-area/src/components/function-call-message/index.tsx`

```typescript
export const FunctionCallMessage: FC<{
  functionCall: FunctionCall;
}> = ({ functionCall }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="function-call-message">
      {/* 折叠面板头部 */}
      <div
        className="function-call-header"
        onClick={() => setExpanded(!expanded)}
      >
        <IconPlugin className="tool-icon" />
        <span className="tool-name">{functionCall.name}</span>
        <span className="tool-status">
          {functionCall.status === 'success' ? '✓ 成功' : '✗ 失败'}
        </span>
        <IconDown className={expanded ? 'expanded' : ''} />
      </div>

      {/* 折叠面板内容 */}
      {expanded && (
        <div className="function-call-body">
          {/* 输入参数 */}
          <div className="section">
            <h4>输入参数</h4>
            <pre>{JSON.stringify(functionCall.arguments, null, 2)}</pre>
          </div>

          {/* 输出结果 */}
          <div className="section">
            <h4>输出结果</h4>
            <pre>{JSON.stringify(functionCall.result, null, 2)}</pre>
          </div>

          {/* 执行时间 */}
          <div className="meta">
            执行时间: {functionCall.duration}ms
          </div>
        </div>
      )}
    </div>
  );
};
```

## 三、核心概念

### 3.1 消息分组（Message Group）

Coze Studio 将连续的同角色消息分组展示：

```typescript
// 消息分组逻辑
function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const message of messages) {
    // 如果当前分组为空或角色不同，创建新分组
    if (!currentGroup || currentGroup.role !== message.role) {
      currentGroup = {
        role: message.role,
        messages: [message],
        avatar: getUserAvatar(message.role),
        timestamp: message.created_at,
      };
      groups.push(currentGroup);
    } else {
      // 否则追加到当前分组
      currentGroup.messages.push(message);
    }
  }

  return groups;
}
```

**展示效果**:
```
┌─────────────────────────────┐
│ 👤 User  (10:30)            │
├─────────────────────────────┤
│ 帮我查一下天气              │
│ 顺便告诉我明天的日程        │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🤖 Assistant  (10:31)       │
├─────────────────────────────┤
│ 🔧 [调用工具] 天气查询      │
│ 今天晴天，温度 22°C         │
│                             │
│ 🔧 [调用工具] 日程查询      │
│ 明天有 3 个会议...          │
└─────────────────────────────┘
```

### 3.2 流式渲染原理

流式渲染的核心是 **增量更新** + **React 状态管理**：

```typescript
// Zustand Store
interface ChatStore {
  messages: Message[];
  streamingMessageId: string | null;

  // 增量更新消息内容
  appendToMessage: (messageId: string, delta: string) => void;
}

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  streamingMessageId: null,

  appendToMessage: (messageId, delta) => {
    set(produce((state: ChatStore) => {
      const message = state.messages.find(m => m.id === messageId);
      if (message) {
        message.content += delta;  // 追加内容
        message.updated_at = Date.now();
      }
    }));
  },
}));

// 组件中使用
function AssistantMessage({ message }: { message: Message }) {
  const [displayedContent, setDisplayedContent] = useState('');

  useEffect(() => {
    // 模拟打字机效果（可选）
    let index = 0;
    const timer = setInterval(() => {
      if (index < message.content.length) {
        setDisplayedContent(message.content.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 20);  // 每 20ms 显示一个字符

    return () => clearInterval(timer);
  }, [message.content]);

  return (
    <div className="assistant-message">
      <ReactMarkdown>{displayedContent}</ReactMarkdown>
    </div>
  );
}
```

### 3.3 自动滚动策略

```typescript
function useAutoScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // 监听用户滚动
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      setIsUserScrolling(!isAtBottom);
    };

    scrollRef.current?.addEventListener('scroll', handleScroll);
    return () => scrollRef.current?.removeEventListener('scroll', handleScroll);
  }, []);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current && !isUserScrolling) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [isUserScrolling]);

  return { scrollRef, scrollToBottom, isUserScrolling };
}
```

### 3.4 消息操作栏

```typescript
interface MessageAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const MESSAGE_ACTIONS: Record<MessageType, MessageAction[]> = {
  user: [
    {
      icon: <IconEdit />,
      label: '编辑',
      onClick: () => { /* ... */ },
    },
    {
      icon: <IconDelete />,
      label: '删除',
      onClick: () => { /* ... */ },
      danger: true,
    },
  ],
  assistant: [
    {
      icon: <IconCopy />,
      label: '复制',
      onClick: () => { /* ... */ },
    },
    {
      icon: <IconRefresh />,
      label: '重新生成',
      onClick: () => { /* ... */ },
    },
    {
      icon: <IconThumbsUp />,
      label: '好评',
      onClick: () => { /* ... */ },
    },
    {
      icon: <IconThumbsDown />,
      label: '差评',
      onClick: () => { /* ... */ },
    },
  ],
};
```

## 四、Coze Lite 设计方案

### 4.1 简化策略

| 功能 | Coze Studio | Coze Lite | 简化说明 |
|------|-------------|-----------|----------|
| 消息类型 | 7 种（含多模态） | 3 种 | User, Assistant, System |
| 流式传输 | HTTP Chunk + SSE | Fetch Stream API | 简化协议 |
| 工具调用展示 | 可折叠、高亮、JSON 美化 | 简单折叠面板 | 减少交互 |
| 消息操作 | 10+ 操作 | 4 操作 | 复制、删除、重试、编辑 |
| 插件系统 | 可扩展插件 | 固定功能 | 无插件机制 |
| 多模态 | 图片、文件、语音 | 仅文本 | 简化输入 |

### 4.2 消息数据结构

```typescript
// 简化的消息类型
export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

export enum MessageStatus {
  Sending = 'sending',
  Streaming = 'streaming',
  Complete = 'complete',
  Error = 'error',
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;

  // 可选字段
  functionCalls?: FunctionCall[];
  error?: string;
}

export interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
}

export interface Conversation {
  id: string;
  agentId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
```

### 4.3 Chat Store 设计

**文件路径**: `frontend/src/stores/chatStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import { nanoid } from 'nanoid';

interface ChatState {
  // 会话列表
  conversations: Record<string, Conversation>;

  // 当前会话 ID
  currentConversationId: string | null;

  // 正在流式传输的消息 ID
  streamingMessageId: string | null;

  // 操作
  createConversation: (agentId: string) => string;
  deleteConversation: (conversationId: string) => void;
  setCurrentConversation: (conversationId: string) => void;

  sendMessage: (content: string) => Promise<void>;
  appendMessageContent: (messageId: string, delta: string) => void;
  markMessageComplete: (messageId: string) => void;
  markMessageError: (messageId: string, error: string) => void;

  addFunctionCall: (messageId: string, functionCall: FunctionCall) => void;
  updateFunctionCall: (messageId: string, callId: string, updates: Partial<FunctionCall>) => void;

  deleteMessage: (messageId: string) => void;
  clearConversation: (conversationId: string) => void;

  // 辅助方法
  getCurrentConversation: () => Conversation | null;
  getCurrentMessages: () => Message[];
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: {},
      currentConversationId: null,
      streamingMessageId: null,

      // 创建新会话
      createConversation: (agentId) => {
        const conversationId = nanoid();
        const now = new Date().toISOString();

        set(produce((state: ChatState) => {
          state.conversations[conversationId] = {
            id: conversationId,
            agentId,
            messages: [],
            createdAt: now,
            updatedAt: now,
          };
          state.currentConversationId = conversationId;
        }));

        return conversationId;
      },

      // 删除会话
      deleteConversation: (conversationId) => {
        set(produce((state: ChatState) => {
          delete state.conversations[conversationId];
          if (state.currentConversationId === conversationId) {
            state.currentConversationId = null;
          }
        }));
      },

      // 设置当前会话
      setCurrentConversation: (conversationId) => {
        set({ currentConversationId: conversationId });
      },

      // 发送消息
      sendMessage: async (content) => {
        const { currentConversationId, conversations } = get();
        if (!currentConversationId) return;

        const conversation = conversations[currentConversationId];
        if (!conversation) return;

        // 1. 创建用户消息
        const userMessageId = nanoid();
        const now = new Date().toISOString();

        set(produce((state: ChatState) => {
          const conv = state.conversations[currentConversationId];
          conv.messages.push({
            id: userMessageId,
            conversationId: currentConversationId,
            role: MessageRole.User,
            content,
            status: MessageStatus.Complete,
            createdAt: now,
            updatedAt: now,
          });
          conv.updatedAt = now;
        }));

        // 2. 创建助手消息（流式）
        const assistantMessageId = nanoid();

        set(produce((state: ChatState) => {
          const conv = state.conversations[currentConversationId];
          conv.messages.push({
            id: assistantMessageId,
            conversationId: currentConversationId,
            role: MessageRole.Assistant,
            content: '',
            status: MessageStatus.Streaming,
            createdAt: now,
            updatedAt: now,
            functionCalls: [],
          });
          state.streamingMessageId = assistantMessageId;
        }));

        // 3. 调用 API（流式）
        try {
          const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: currentConversationId,
              agent_id: conversation.agentId,
              message: content,
            }),
          });

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'content') {
                  get().appendMessageContent(assistantMessageId, data.delta);
                } else if (data.type === 'function_call') {
                  get().addFunctionCall(assistantMessageId, {
                    id: data.call_id,
                    name: data.name,
                    arguments: data.arguments,
                  });
                } else if (data.type === 'function_result') {
                  get().updateFunctionCall(assistantMessageId, data.call_id, {
                    result: data.result,
                    duration: data.duration,
                  });
                }
              }
            }
          }

          // 4. 标记完成
          get().markMessageComplete(assistantMessageId);
        } catch (error: any) {
          // 5. 标记错误
          get().markMessageError(assistantMessageId, error.message);
        }
      },

      // 追加消息内容（流式）
      appendMessageContent: (messageId, delta) => {
        set(produce((state: ChatState) => {
          const conversation = Object.values(state.conversations).find(conv =>
            conv.messages.some(msg => msg.id === messageId)
          );

          if (conversation) {
            const message = conversation.messages.find(msg => msg.id === messageId);
            if (message) {
              message.content += delta;
              message.updatedAt = new Date().toISOString();
            }
          }
        }));
      },

      // 标记消息完成
      markMessageComplete: (messageId) => {
        set(produce((state: ChatState) => {
          const conversation = Object.values(state.conversations).find(conv =>
            conv.messages.some(msg => msg.id === messageId)
          );

          if (conversation) {
            const message = conversation.messages.find(msg => msg.id === messageId);
            if (message) {
              message.status = MessageStatus.Complete;
              message.updatedAt = new Date().toISOString();
            }
          }

          if (state.streamingMessageId === messageId) {
            state.streamingMessageId = null;
          }
        }));
      },

      // 标记消息错误
      markMessageError: (messageId, error) => {
        set(produce((state: ChatState) => {
          const conversation = Object.values(state.conversations).find(conv =>
            conv.messages.some(msg => msg.id === messageId)
          );

          if (conversation) {
            const message = conversation.messages.find(msg => msg.id === messageId);
            if (message) {
              message.status = MessageStatus.Error;
              message.error = error;
              message.updatedAt = new Date().toISOString();
            }
          }

          if (state.streamingMessageId === messageId) {
            state.streamingMessageId = null;
          }
        }));
      },

      // 添加工具调用
      addFunctionCall: (messageId, functionCall) => {
        set(produce((state: ChatState) => {
          const conversation = Object.values(state.conversations).find(conv =>
            conv.messages.some(msg => msg.id === messageId)
          );

          if (conversation) {
            const message = conversation.messages.find(msg => msg.id === messageId);
            if (message && message.functionCalls) {
              message.functionCalls.push(functionCall);
            }
          }
        }));
      },

      // 更新工具调用
      updateFunctionCall: (messageId, callId, updates) => {
        set(produce((state: ChatState) => {
          const conversation = Object.values(state.conversations).find(conv =>
            conv.messages.some(msg => msg.id === messageId)
          );

          if (conversation) {
            const message = conversation.messages.find(msg => msg.id === messageId);
            if (message && message.functionCalls) {
              const call = message.functionCalls.find(c => c.id === callId);
              if (call) {
                Object.assign(call, updates);
              }
            }
          }
        }));
      },

      // 删除消息
      deleteMessage: (messageId) => {
        set(produce((state: ChatState) => {
          const conversation = Object.values(state.conversations).find(conv =>
            conv.messages.some(msg => msg.id === messageId)
          );

          if (conversation) {
            conversation.messages = conversation.messages.filter(
              msg => msg.id !== messageId
            );
            conversation.updatedAt = new Date().toISOString();
          }
        }));
      },

      // 清空会话
      clearConversation: (conversationId) => {
        set(produce((state: ChatState) => {
          const conversation = state.conversations[conversationId];
          if (conversation) {
            conversation.messages = [];
            conversation.updatedAt = new Date().toISOString();
          }
        }));
      },

      // 获取当前会话
      getCurrentConversation: () => {
        const { currentConversationId, conversations } = get();
        return currentConversationId ? conversations[currentConversationId] : null;
      },

      // 获取当前消息列表
      getCurrentMessages: () => {
        const conversation = get().getCurrentConversation();
        return conversation?.messages || [];
      },
    }),
    {
      name: 'coze-lite-chat-store',
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
      }),
    }
  )
);
```

## 五、组件实现

### 5.1 聊天区主组件 - ChatArea

**文件路径**: `frontend/src/components/agent-ide/ChatArea/index.tsx`

```typescript
import { useEffect, useRef } from 'react';
import { Button, Empty, Spin } from '@arco-design/web-react';
import { IconRefresh, IconDelete } from '@arco-design/web-react/icon';
import { useChatStore } from '@/stores/chatStore';
import { MessageList } from '../MessageList';
import { ChatInput } from '../ChatInput';
import './index.css';

interface ChatAreaProps {
  agentId: string;
  readonly?: boolean;
}

export function ChatArea({ agentId, readonly = false }: ChatAreaProps) {
  const {
    currentConversationId,
    streamingMessageId,
    createConversation,
    getCurrentMessages,
    clearConversation,
  } = useChatStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = getCurrentMessages();

  // 初始化会话
  useEffect(() => {
    if (!currentConversationId) {
      createConversation(agentId);
    }
  }, [agentId, currentConversationId]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleClear = () => {
    if (currentConversationId) {
      clearConversation(currentConversationId);
    }
  };

  const handleRefresh = () => {
    if (currentConversationId) {
      clearConversation(currentConversationId);
    }
  };

  if (!currentConversationId) {
    return (
      <div className="chat-area-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="chat-area">
      {/* 头部操作栏 */}
      <div className="chat-area-header">
        <h3>聊天调试</h3>
        <div className="chat-area-actions">
          <Button
            type="text"
            size="small"
            icon={<IconRefresh />}
            onClick={handleRefresh}
            disabled={readonly}
          >
            重新开始
          </Button>
          <Button
            type="text"
            size="small"
            status="danger"
            icon={<IconDelete />}
            onClick={handleClear}
            disabled={readonly}
          >
            清空对话
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-area-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <Empty
            description="暂无消息，开始对话吧"
            style={{ marginTop: '20%' }}
          />
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* 输入框 */}
      {!readonly && (
        <ChatInput disabled={!!streamingMessageId} />
      )}
    </div>
  );
}
```

**CSS 样式**: `frontend/src/components/agent-ide/ChatArea/index.css`

```css
.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-1);
}

.chat-area-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-2);
  background-color: var(--color-bg-2);
}

.chat-area-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-1);
}

.chat-area-actions {
  display: flex;
  gap: 8px;
}

.chat-area-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.chat-area-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
```

### 5.2 消息列表 - MessageList

**文件路径**: `frontend/src/components/agent-ide/MessageList/index.tsx`

```typescript
import { MessageBubble } from '../MessageBubble';
import { FunctionCallCard } from '../FunctionCallCard';
import { type Message } from '@/stores/chatStore';
import './index.css';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <div key={message.id} className="message-item">
          <MessageBubble message={message} />

          {/* 工具调用卡片 */}
          {message.functionCalls && message.functionCalls.length > 0 && (
            <div className="function-calls">
              {message.functionCalls.map((call) => (
                <FunctionCallCard key={call.id} functionCall={call} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**CSS 样式**:

```css
.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.function-calls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 48px; /* 对齐消息气泡 */
}
```

### 5.3 消息气泡 - MessageBubble

**文件路径**: `frontend/src/components/agent-ide/MessageBubble/index.tsx`

```typescript
import { useState } from 'react';
import { Button, Popconfirm, Message as ArcoMessage } from '@arco-design/web-react';
import {
  IconCopy,
  IconDelete,
  IconRefresh,
  IconUser,
  IconRobot,
} from '@arco-design/web-react/icon';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import copy from 'copy-to-clipboard';
import { useChatStore, type Message, MessageRole, MessageStatus } from '@/stores/chatStore';
import './index.css';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { deleteMessage, sendMessage } = useChatStore();
  const [hovering, setHovering] = useState(false);

  const isUser = message.role === MessageRole.User;
  const isStreaming = message.status === MessageStatus.Streaming;
  const hasError = message.status === MessageStatus.Error;

  const handleCopy = () => {
    copy(message.content);
    ArcoMessage.success('已复制到剪贴板');
  };

  const handleDelete = () => {
    deleteMessage(message.id);
  };

  const handleRetry = () => {
    sendMessage(message.content);
  };

  return (
    <div
      className={`message-bubble ${isUser ? 'user' : 'assistant'} ${hasError ? 'error' : ''}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* 头像 */}
      <div className="message-avatar">
        {isUser ? (
          <IconUser className="avatar-icon" />
        ) : (
          <IconRobot className="avatar-icon" />
        )}
      </div>

      {/* 消息内容 */}
      <div className="message-content-wrapper">
        <div className="message-content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}

          {/* 流式加载光标 */}
          {isStreaming && <span className="streaming-cursor">▊</span>}

          {/* 错误提示 */}
          {hasError && (
            <div className="error-message">
              ❌ 生成失败: {message.error}
            </div>
          )}
        </div>

        {/* 操作按钮（悬停显示） */}
        {hovering && (
          <div className="message-actions">
            <Button
              type="text"
              size="mini"
              icon={<IconCopy />}
              onClick={handleCopy}
            />
            {isUser && (
              <Button
                type="text"
                size="mini"
                icon={<IconRefresh />}
                onClick={handleRetry}
              />
            )}
            <Popconfirm
              title="确定删除该消息吗？"
              onConfirm={handleDelete}
            >
              <Button
                type="text"
                size="mini"
                status="danger"
                icon={<IconDelete />}
              />
            </Popconfirm>
          </div>
        )}
      </div>
    </div>
  );
}
```

**CSS 样式**:

```css
.message-bubble {
  display: flex;
  gap: 12px;
  position: relative;
}

.message-bubble.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 20px;
  color: white;
}

.message-content-wrapper {
  flex: 1;
  max-width: 70%;
}

.message-content {
  padding: 12px 16px;
  border-radius: 8px;
  background-color: var(--color-fill-2);
  word-wrap: break-word;
}

.message-bubble.user .message-content {
  background-color: var(--color-primary-light-1);
}

.message-bubble.error .message-content {
  background-color: var(--color-danger-light-1);
  border: 1px solid var(--color-danger-light-3);
}

.message-content p {
  margin: 0;
  line-height: 1.6;
  color: var(--color-text-1);
}

/* Markdown 样式 */
.message-content pre {
  margin: 8px 0;
  border-radius: 6px;
  overflow-x: auto;
}

.message-content code {
  padding: 2px 6px;
  background-color: var(--color-fill-3);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

/* 流式光标动画 */
.streaming-cursor {
  display: inline-block;
  margin-left: 2px;
  animation: blink 1s infinite;
  color: var(--color-primary);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 错误提示 */
.error-message {
  margin-top: 8px;
  padding: 8px;
  background-color: var(--color-danger-light-2);
  border-radius: 4px;
  font-size: 13px;
  color: var(--color-danger-dark-1);
}

/* 操作按钮 */
.message-actions {
  margin-top: 4px;
  display: flex;
  gap: 4px;
}
```

### 5.4 工具调用卡片 - FunctionCallCard

**文件路径**: `frontend/src/components/agent-ide/FunctionCallCard/index.tsx`

```typescript
import { useState } from 'react';
import { Collapse } from '@arco-design/web-react';
import { IconDown, IconCheck, IconClose } from '@arco-design/web-react/icon';
import { type FunctionCall } from '@/stores/chatStore';
import './index.css';

const CollapseItem = Collapse.Item;

interface FunctionCallCardProps {
  functionCall: FunctionCall;
}

export function FunctionCallCard({ functionCall }: FunctionCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasResult = !!functionCall.result;
  const hasError = !!functionCall.error;

  return (
    <Collapse
      activeKey={expanded ? ['1'] : []}
      onChange={(keys) => setExpanded(keys.includes('1'))}
      className="function-call-card"
    >
      <CollapseItem
        name="1"
        header={
          <div className="function-call-header">
            <span className="tool-icon">🔧</span>
            <span className="tool-name">{functionCall.name}</span>
            {hasResult && (
              <span className="status success">
                <IconCheck /> 成功
              </span>
            )}
            {hasError && (
              <span className="status error">
                <IconClose /> 失败
              </span>
            )}
            {functionCall.duration && (
              <span className="duration">{functionCall.duration}ms</span>
            )}
          </div>
        }
        expandIcon={<IconDown />}
      >
        <div className="function-call-body">
          {/* 输入参数 */}
          <div className="section">
            <h4>输入参数</h4>
            <pre>{JSON.stringify(functionCall.arguments, null, 2)}</pre>
          </div>

          {/* 输出结果 */}
          {hasResult && (
            <div className="section">
              <h4>输出结果</h4>
              <pre>{JSON.stringify(functionCall.result, null, 2)}</pre>
            </div>
          )}

          {/* 错误信息 */}
          {hasError && (
            <div className="section error">
              <h4>错误信息</h4>
              <p>{functionCall.error}</p>
            </div>
          )}
        </div>
      </CollapseItem>
    </Collapse>
  );
}
```

**CSS 样式**:

```css
.function-call-card {
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  background-color: var(--color-bg-2);
}

.function-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.tool-icon {
  font-size: 18px;
}

.tool-name {
  flex: 1;
  font-weight: 500;
  color: var(--color-text-1);
}

.status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status.success {
  background-color: var(--color-success-light-1);
  color: var(--color-success-dark-1);
}

.status.error {
  background-color: var(--color-danger-light-1);
  color: var(--color-danger-dark-1);
}

.duration {
  font-size: 12px;
  color: var(--color-text-3);
}

.function-call-body {
  padding: 12px 0;
}

.section {
  margin-bottom: 12px;
}

.section:last-child {
  margin-bottom: 0;
}

.section h4 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-2);
}

.section pre {
  margin: 0;
  padding: 12px;
  background-color: var(--color-fill-1);
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  overflow-x: auto;
  line-height: 1.5;
}

.section.error p {
  margin: 0;
  padding: 8px 12px;
  background-color: var(--color-danger-light-2);
  border-radius: 4px;
  color: var(--color-danger-dark-1);
  font-size: 13px;
}
```

### 5.5 聊天输入框 - ChatInput

**文件路径**: `frontend/src/components/agent-ide/ChatInput/index.tsx`

```typescript
import { useState, useRef, KeyboardEvent } from 'react';
import { Button, Textarea } from '@arco-design/web-react';
import { IconSend } from '@arco-design/web-react/icon';
import { useChatStore } from '@/stores/chatStore';
import './index.css';

interface ChatInputProps {
  disabled?: boolean;
}

export function ChatInput({ disabled = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const { sendMessage } = useChatStore();
  const textareaRef = useRef<any>(null);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    setInput('');
    await sendMessage(trimmed);

    // 聚焦输入框
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 发送
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input">
      <div className="chat-input-wrapper">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'AI 正在生成中...'
              : '输入消息... (Ctrl/Cmd + Enter 发送)'
          }
          autoSize={{ minRows: 1, maxRows: 6 }}
          disabled={disabled}
          className="chat-input-textarea"
        />

        <Button
          type="primary"
          icon={<IconSend />}
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="chat-input-send-btn"
        >
          发送
        </Button>
      </div>

      <div className="chat-input-tips">
        AI 生成内容可能不准确，请仔细甄别
      </div>
    </div>
  );
}
```

**CSS 样式**:

```css
.chat-input {
  padding: 16px;
  border-top: 1px solid var(--color-border-2);
  background-color: var(--color-bg-2);
}

.chat-input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input-textarea {
  flex: 1;
}

.chat-input-send-btn {
  flex-shrink: 0;
}

.chat-input-tips {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-3);
  text-align: center;
}
```

## 六、API 接口设计

### 6.1 流式聊天接口

**接口**: `POST /api/chat/stream`

**请求**:
```json
{
  "conversation_id": "conv_xxx",
  "agent_id": "agent_xxx",
  "message": "帮我查一下天气"
}
```

**响应** (SSE 流):
```
data: {"type":"content","delta":"今"}

data: {"type":"content","delta":"天"}

data: {"type":"content","delta":"的"}

data: {"type":"content","delta":"天"}

data: {"type":"content","delta":"气"}

data: {"type":"function_call","call_id":"call_1","name":"get_weather","arguments":{"city":"北京"}}

data: {"type":"function_result","call_id":"call_1","result":{"temperature":22,"condition":"晴"},"duration":150}

data: {"type":"content","delta":"北京今天晴天，温度22°C"}

data: {"type":"done"}
```

**事件类型**:
- `content`: 消息内容（增量）
- `function_call`: 工具调用开始
- `function_result`: 工具调用结果
- `done`: 生成完成
- `error`: 生成错误

### 6.2 会话初始化接口

**接口**: `POST /api/conversations`

**请求**:
```json
{
  "agent_id": "agent_xxx"
}
```

**响应**:
```json
{
  "conversation_id": "conv_xxx",
  "agent_id": "agent_xxx",
  "created_at": "2025-11-30T10:00:00Z"
}
```

### 6.3 历史消息接口

**接口**: `GET /api/conversations/:id/messages`

**响应**:
```json
{
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "你好",
      "created_at": "2025-11-30T10:00:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "你好！有什么可以帮助你的吗？",
      "created_at": "2025-11-30T10:00:01Z"
    }
  ],
  "has_more": false
}
```

## 七、最佳实践

### 7.1 性能优化

1. **虚拟滚动**: 消息数量 > 100 时启用

```typescript
import { Virtuoso } from 'react-virtuoso';

function MessageList({ messages }: { messages: Message[] }) {
  if (messages.length > 100) {
    return (
      <Virtuoso
        data={messages}
        itemContent={(index, message) => (
          <MessageBubble key={message.id} message={message} />
        )}
      />
    );
  }

  return messages.map(msg => <MessageBubble key={msg.id} message={msg} />);
}
```

2. **消息分页加载**

```typescript
const handleLoadMore = async () => {
  const oldestMessageId = messages[0]?.id;
  const olderMessages = await fetchMessages({
    conversation_id: conversationId,
    before: oldestMessageId,
    limit: 20,
  });

  prependMessages(olderMessages);
};
```

3. **防抖输入**

```typescript
import { useDebounceFn } from 'ahooks';

const { run: handleInputChange } = useDebounceFn(
  (value: string) => {
    setInput(value);
    // 可选：保存草稿到 localStorage
    localStorage.setItem(`draft_${conversationId}`, value);
  },
  { wait: 300 }
);
```

### 7.2 用户体验优化

1. **智能滚动**: 只在底部时自动滚动

```typescript
const isNearBottom = () => {
  if (!scrollRef.current) return false;
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
  return scrollHeight - scrollTop - clientHeight < 100;
};

useEffect(() => {
  if (isNearBottom()) {
    scrollToBottom();
  }
}, [messages]);
```

2. **发送中禁用输入**

```typescript
<ChatInput
  disabled={!!streamingMessageId}
  placeholder={
    streamingMessageId
      ? 'AI 正在生成回复...'
      : '输入消息...'
  }
/>
```

3. **错误重试**

```typescript
const handleRetry = async (failedMessage: Message) => {
  // 删除失败消息
  deleteMessage(failedMessage.id);

  // 重新发送
  await sendMessage(failedMessage.content);
};
```

### 7.3 代码组织

1. **消息渲染器抽象**

```typescript
// 消息渲染器工厂
const MESSAGE_RENDERERS: Record<MessageRole, React.FC<{ message: Message }>> = {
  user: UserMessageBubble,
  assistant: AssistantMessageBubble,
  system: SystemMessageBubble,
};

function MessageBubble({ message }: { message: Message }) {
  const Renderer = MESSAGE_RENDERERS[message.role];
  return <Renderer message={message} />;
}
```

2. **钩子复用**

```typescript
// useStreamingMessage.ts
export function useStreamingMessage(messageId: string) {
  const message = useChatStore(state =>
    state.getCurrentMessages().find(m => m.id === messageId)
  );

  const isStreaming = message?.status === MessageStatus.Streaming;

  return {
    message,
    isStreaming,
    content: message?.content || '',
  };
}
```

## 八、实施计划

### 阶段 1: 基础架构（2-3 天）

- [ ] 实现 ChatStore（Zustand + Persist）
- [ ] 定义消息数据类型
- [ ] 创建流式 API Mock

### 阶段 2: 核心组件（3-4 天)

- [ ] 实现 ChatArea 主组件
- [ ] 实现 MessageList 和 MessageBubble
- [ ] 实现 ChatInput 输入框
- [ ] 实现 FunctionCallCard 工具调用卡片

### 阶段 3: 流式渲染（2-3 天）

- [ ] 实现 SSE 流式传输
- [ ] 实现增量消息更新
- [ ] 实现打字机效果（可选）
- [ ] 实现自动滚动逻辑

### 阶段 4: 增强功能（2-3 天）

- [ ] 消息操作（复制、删除、重试）
- [ ] 错误处理和重试
- [ ] Markdown 渲染
- [ ] 代码高亮

**总计**: 9-13 天

## 九、扩展方向

### 9.1 多模态支持

未来扩展图片、文件上传：
- 拖拽上传
- 粘贴上传
- 图片预览
- 文件列表

### 9.2 语音交互

支持语音输入和输出：
- 语音转文字（STT）
- 文字转语音（TTS）
- 语音播放控制

### 9.3 协同调试

多人同时调试同一 Agent：
- WebSocket 实时同步
- 用户在线状态
- 消息归属标识

### 9.4 调试工具

增强调试能力：
- Token 计数显示
- 响应时间统计
- 工具调用链路图
- 完整日志导出

---

**文档状态**: ✅ 完成
**下一步**: 创建 [14-agent-ide-publish.md] - Agent 发布管理文档
