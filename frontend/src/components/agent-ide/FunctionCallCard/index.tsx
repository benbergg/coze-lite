import { useState } from 'react';
import { Collapse, Tag } from '@arco-design/web-react';
import { IconDown, IconCheck, IconClose, IconLoading } from '@arco-design/web-react/icon';
import type { FunctionCall } from '@/types/agent';
import './index.css';

const CollapseItem = Collapse.Item;

interface FunctionCallCardProps {
  functionCall: FunctionCall;
}

export function FunctionCallCard({ functionCall }: FunctionCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasResult = functionCall.result !== undefined;
  const hasError = !!functionCall.error;
  const isLoading = !hasResult && !hasError;

  const getStatusIcon = () => {
    if (isLoading) return <IconLoading spin />;
    if (hasError) return <IconClose />;
    return <IconCheck />;
  };

  const getStatusText = () => {
    if (isLoading) return '执行中';
    if (hasError) return '失败';
    return '成功';
  };

  const getStatusColor = (): 'green' | 'red' | 'blue' => {
    if (isLoading) return 'blue';
    if (hasError) return 'red';
    return 'green';
  };

  return (
    <div className="function-call-card">
      <Collapse
        activeKey={expanded ? ['1'] : []}
        onChange={(keys) => setExpanded(keys.includes('1'))}
        bordered={false}
      >
        <CollapseItem
          name="1"
          header={
            <div className="function-call-header">
              <span className="tool-icon">🔧</span>
              <span className="tool-name">{functionCall.name}</span>
              <Tag color={getStatusColor()} size="small" icon={getStatusIcon()}>
                {getStatusText()}
              </Tag>
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
              <pre className="json-content">
                {JSON.stringify(functionCall.arguments, null, 2)}
              </pre>
            </div>

            {/* 输出结果 */}
            {hasResult && (
              <div className="section">
                <h4>输出结果</h4>
                <pre className="json-content">
                  {typeof functionCall.result === 'string'
                    ? functionCall.result
                    : JSON.stringify(functionCall.result, null, 2)}
                </pre>
              </div>
            )}

            {/* 错误信息 */}
            {hasError && (
              <div className="section error">
                <h4>错误信息</h4>
                <p className="error-text">{functionCall.error}</p>
              </div>
            )}
          </div>
        </CollapseItem>
      </Collapse>
    </div>
  );
}
