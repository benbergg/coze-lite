import { useEffect, useRef, useCallback } from 'react';
import { Button, Empty, Spin, Message } from '@arco-design/web-react';
import { IconRefresh, IconDelete } from '@arco-design/web-react/icon';
import { useChatStore, useAgentIdeStore } from '@/stores/agentIdeStore';
import { MessageRole, MessageStatus } from '@/types/agent';
import { MessageBubble } from '../MessageBubble';
import { ChatInput } from '../ChatInput';
import './index.css';

interface ChatAreaProps {
  /** Agent ID */
  agentId?: string;
  /** 是否只读 */
  readonly?: boolean;
}

export function ChatArea({ agentId, readonly = false }: ChatAreaProps) {
  const { currentAgent } = useAgentIdeStore();
  const {
    currentConversationId,
    streamingMessageId,
    createConversation,
    getCurrentMessages,
    clearConversation,
    addMessage,
    appendMessageContent,
    markMessageComplete,
    markMessageError,
    deleteMessage,
    setStreamingMessageId,
    addFunctionCall,
    updateFunctionCall,
  } = useChatStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messages = getCurrentMessages();

  const effectiveAgentId = agentId ?? currentAgent?.id;

  // 初始化会话
  useEffect(() => {
    if (effectiveAgentId && !currentConversationId) {
      createConversation(effectiveAgentId);
    }
  }, [effectiveAgentId, currentConversationId, createConversation]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(async (content: string) => {
    if (!currentConversationId || !effectiveAgentId) return;

    // 1. 添加用户消息
    addMessage(currentConversationId, {
      role: MessageRole.User,
      content,
      status: MessageStatus.Complete,
    });

    // 2. 创建助手消息（流式）
    const assistantMessageId = addMessage(currentConversationId, {
      role: MessageRole.Assistant,
      content: '',
      status: MessageStatus.Streaming,
      functionCalls: [],
    });

    setStreamingMessageId(assistantMessageId);

    // 3. 调用 API（流式）
    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          agent_id: effectiveAgentId,
          message: content,
          config: currentAgent?.config,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'content':
                  appendMessageContent(assistantMessageId, data.delta);
                  break;

                case 'function_call':
                  addFunctionCall(assistantMessageId, {
                    id: data.call_id,
                    name: data.name,
                    arguments: data.arguments,
                  });
                  break;

                case 'function_result':
                  updateFunctionCall(assistantMessageId, data.call_id, {
                    result: data.result,
                    duration: data.duration,
                  });
                  break;

                case 'function_error':
                  updateFunctionCall(assistantMessageId, data.call_id, {
                    error: data.error,
                    duration: data.duration,
                  });
                  break;

                case 'error':
                  throw new Error(data.message);

                case 'done':
                  // 流式结束
                  break;
              }
            } catch (parseError) {
              console.error('Failed to parse chunk:', parseError);
            }
          }
        }
      }

      // 4. 标记完成
      markMessageComplete(assistantMessageId);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户主动停止
        markMessageComplete(assistantMessageId);
        Message.info('已停止生成');
      } else {
        // 5. 标记错误
        markMessageError(assistantMessageId, error.message);
        Message.error(`生成失败: ${error.message}`);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    currentConversationId,
    effectiveAgentId,
    currentAgent,
    addMessage,
    setStreamingMessageId,
    appendMessageContent,
    markMessageComplete,
    markMessageError,
    addFunctionCall,
    updateFunctionCall,
  ]);

  // 停止生成
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // 清空对话
  const handleClear = useCallback(() => {
    if (currentConversationId) {
      clearConversation(currentConversationId);
      Message.success('已清空对话');
    }
  }, [currentConversationId, clearConversation]);

  // 重新开始
  const handleRefresh = useCallback(() => {
    if (currentConversationId) {
      clearConversation(currentConversationId);
    }
  }, [currentConversationId, clearConversation]);

  // 删除消息
  const handleDeleteMessage = useCallback((messageId: string) => {
    deleteMessage(messageId);
    Message.success('已删除消息');
  }, [deleteMessage]);

  // 重试消息
  const handleRetry = useCallback((content: string) => {
    handleSend(content);
  }, [handleSend]);

  if (!effectiveAgentId) {
    return (
      <div className="chat-area-empty">
        <Empty description="请先创建或选择一个 Agent" />
      </div>
    );
  }

  if (!currentConversationId) {
    return (
      <div className="chat-area-loading">
        <Spin size={32} />
      </div>
    );
  }

  return (
    <div className="chat-area">
      {/* 头部操作栏 */}
      <div className="chat-area-header">
        <div className="chat-area-actions">
          <Button
            type="text"
            size="small"
            icon={<IconRefresh />}
            onClick={handleRefresh}
            disabled={readonly || !!streamingMessageId}
          >
            重新开始
          </Button>
          <Button
            type="text"
            size="small"
            status="danger"
            icon={<IconDelete />}
            onClick={handleClear}
            disabled={readonly || !!streamingMessageId || messages.length === 0}
          >
            清空对话
          </Button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-area-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-area-welcome">
            <div className="welcome-icon">👋</div>
            <h3>开始对话</h3>
            <p>在下方输入框中输入消息，测试 Agent 的对话能力</p>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onDelete={!readonly ? handleDeleteMessage : undefined}
                onRetry={!readonly && message.role === MessageRole.User ? handleRetry : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* 输入框 */}
      {!readonly && (
        <ChatInput
          disabled={!currentAgent?.config.model}
          isStreaming={!!streamingMessageId}
          onSend={handleSend}
          onStop={handleStop}
        />
      )}
    </div>
  );
}
