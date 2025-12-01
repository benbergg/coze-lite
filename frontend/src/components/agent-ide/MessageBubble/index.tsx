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
import { type Message, MessageRole, MessageStatus } from '@/types/agent';
import { FunctionCallCard } from '../FunctionCallCard';
import './index.css';

interface MessageBubbleProps {
  message: Message;
  onDelete?: (messageId: string) => void;
  onRetry?: (content: string) => void;
}

export function MessageBubble({ message, onDelete, onRetry }: MessageBubbleProps) {
  const [hovering, setHovering] = useState(false);

  const isUser = message.role === MessageRole.User;
  const isStreaming = message.status === MessageStatus.Streaming;
  const hasError = message.status === MessageStatus.Error;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    ArcoMessage.success('已复制到剪贴板');
  };

  const handleDelete = () => {
    onDelete?.(message.id);
  };

  const handleRetry = () => {
    onRetry?.(message.content);
  };

  return (
    <div
      className={`message-bubble ${isUser ? 'user' : 'assistant'} ${hasError ? 'error' : ''}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* 头像 */}
      <div className={`message-avatar ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? (
          <IconUser className="avatar-icon" />
        ) : (
          <IconRobot className="avatar-icon" />
        )}
      </div>

      {/* 消息内容 */}
      <div className="message-content-wrapper">
        <div className={`message-content ${isUser ? 'user' : 'assistant'}`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className ?? '');
                    const isInline = !match;

                    if (isInline) {
                      return (
                        <code className="inline-code" {...props}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="code-block">
                        <div className="code-header">
                          <span className="code-lang">{match?.[1] ?? 'code'}</span>
                          <Button
                            type="text"
                            size="mini"
                            icon={<IconCopy />}
                            onClick={() => {
                              navigator.clipboard.writeText(String(children));
                              ArcoMessage.success('已复制代码');
                            }}
                          />
                        </div>
                        <pre className={className}>
                          <code {...props}>{children}</code>
                        </pre>
                      </div>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* 流式加载光标 */}
          {isStreaming && <span className="streaming-cursor">|</span>}

          {/* 错误提示 */}
          {hasError && (
            <div className="error-message">
              生成失败: {message.error ?? '未知错误'}
            </div>
          )}
        </div>

        {/* 工具调用卡片 */}
        {message.functionCalls && message.functionCalls.length > 0 && (
          <div className="function-calls">
            {message.functionCalls.map((call) => (
              <FunctionCallCard key={call.id} functionCall={call} />
            ))}
          </div>
        )}

        {/* 操作按钮（悬停显示） */}
        {hovering && !isStreaming && (
          <div className="message-actions">
            <Button
              type="text"
              size="mini"
              icon={<IconCopy />}
              onClick={handleCopy}
            />
            {isUser && onRetry && (
              <Button
                type="text"
                size="mini"
                icon={<IconRefresh />}
                onClick={handleRetry}
              />
            )}
            {onDelete && (
              <Popconfirm
                title="确定删除该消息吗？"
                onOk={handleDelete}
              >
                <Button
                  type="text"
                  size="mini"
                  status="danger"
                  icon={<IconDelete />}
                />
              </Popconfirm>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
