import { useNavigate } from 'react-router-dom';
import { Button, Tag, Message, Popconfirm } from '@arco-design/web-react';
import {
  IconLeft,
  IconSave,
  IconHistory,
  IconSend,
} from '@arco-design/web-react/icon';
import { useAgentIdeStore } from '@/stores/agentIdeStore';
import './index.css';

interface AgentEditorHeaderProps {
  onSave?: () => Promise<void>;
  onPublish?: () => void;
  onViewHistory?: () => void;
}

export function AgentEditorHeader({
  onSave,
  onPublish,
  onViewHistory,
}: AgentEditorHeaderProps) {
  const navigate = useNavigate();
  const {
    currentAgent,
    hasUnsavedChanges,
    isSaving,
    markAsSaved,
  } = useAgentIdeStore();

  const handleBack = () => {
    if (hasUnsavedChanges) {
      return;
    }
    navigate(-1);
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
      await onSave();
      markAsSaved();
      Message.success('保存成功');
    } catch (error: any) {
      Message.error(`保存失败: ${error.message}`);
    }
  };

  return (
    <header className="agent-editor-header">
      {/* 左侧：返回和标题 */}
      <div className="agent-editor-header-left">
        {hasUnsavedChanges ? (
          <Popconfirm
            title="你有未保存的更改"
            content="确定要离开吗？未保存的更改将会丢失。"
            onOk={() => navigate(-1)}
            okText="离开"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<IconLeft />}
              className="back-button"
            />
          </Popconfirm>
        ) : (
          <Button
            type="text"
            icon={<IconLeft />}
            className="back-button"
            onClick={handleBack}
          />
        )}

        <div className="agent-info">
          <h1 className="agent-name">
            {currentAgent?.name ?? '未命名 Agent'}
          </h1>
          {hasUnsavedChanges && (
            <Tag color="orange" size="small">
              未保存
            </Tag>
          )}
          {currentAgent?.published && (
            <Tag color="green" size="small">
              已发布
            </Tag>
          )}
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="agent-editor-header-right">
        {onViewHistory && (
          <Button
            type="text"
            icon={<IconHistory />}
            onClick={onViewHistory}
          >
            发布历史
          </Button>
        )}

        <Button
          type="secondary"
          icon={<IconSave />}
          loading={isSaving}
          disabled={!hasUnsavedChanges}
          onClick={handleSave}
        >
          保存
        </Button>

        {onPublish && (
          <Button
            type="primary"
            icon={<IconSend />}
            onClick={onPublish}
          >
            发布
          </Button>
        )}
      </div>
    </header>
  );
}
