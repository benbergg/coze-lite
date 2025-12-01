import { useState, useRef, type KeyboardEvent } from 'react';
import { Button, Input } from '@arco-design/web-react';
import { IconSend } from '@arco-design/web-react/icon';
import './index.css';

const { TextArea } = Input;

interface ChatInputProps {
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否正在流式输出中 */
  isStreaming?: boolean;
  /** 发送消息回调 */
  onSend?: (content: string) => void;
  /** 停止生成回调 */
  onStop?: () => void;
  /** 占位文本 */
  placeholder?: string;
}

export function ChatInput({
  disabled = false,
  isStreaming = false,
  onSend,
  onStop,
  placeholder,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<any>(null);

  const canSend = input.trim().length > 0 && !disabled && !isStreaming;

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isStreaming) return;

    onSend?.(trimmed);
    setInput('');

    // 聚焦输入框
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 发送
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    onStop?.();
  };

  const getPlaceholder = () => {
    if (disabled) return '请先选择模型...';
    if (isStreaming) return 'AI 正在生成中...';
    return placeholder ?? '输入消息... (Ctrl/Cmd + Enter 发送)';
  };

  return (
    <div className="chat-input">
      <div className="chat-input-wrapper">
        <TextArea
          ref={textareaRef}
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          autoSize={{ minRows: 1, maxRows: 6 }}
          disabled={disabled || isStreaming}
          className="chat-input-textarea"
        />

        {isStreaming ? (
          <Button
            type="secondary"
            status="warning"
            onClick={handleStop}
            className="chat-input-btn"
          >
            停止生成
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<IconSend />}
            onClick={handleSend}
            disabled={!canSend}
            className="chat-input-btn"
          >
            发送
          </Button>
        )}
      </div>

      <div className="chat-input-tips">
        AI 生成内容可能不准确，请仔细甄别
      </div>
    </div>
  );
}
