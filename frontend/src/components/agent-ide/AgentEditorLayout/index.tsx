import { type ReactNode } from 'react';
import { Tabs } from '@arco-design/web-react';
import {
  IconEdit,
  IconApps,
  IconBook,
  IconSettings,
} from '@arco-design/web-react/icon';
import { SplitPanel } from '../SplitPanel';
import { AgentEditorHeader } from '../AgentEditorHeader';
import { useAgentIdeStore } from '@/stores/agentIdeStore';
import type { PanelType } from '@/types/agent';
import './index.css';

const TabPane = Tabs.TabPane;

interface AgentEditorLayoutProps {
  /** Prompt 编辑器组件 */
  promptEditor?: ReactNode;
  /** 工具选择器组件 */
  toolSelector?: ReactNode;
  /** 知识库选择器组件 */
  knowledgeSelector?: ReactNode;
  /** 设置面板组件 */
  settingsPanel?: ReactNode;
  /** 聊天调试区组件 */
  chatArea?: ReactNode;
  /** 保存回调 */
  onSave?: () => Promise<void>;
  /** 发布回调 */
  onPublish?: () => void;
  /** 查看历史回调 */
  onViewHistory?: () => void;
}

/** 左侧面板 Tab 配置 */
const PANEL_TABS: Array<{ key: PanelType; label: string; icon: ReactNode }> = [
  { key: 'prompt', label: 'Prompt', icon: <IconEdit /> },
  { key: 'tools', label: '工具', icon: <IconApps /> },
  { key: 'knowledge', label: '知识库', icon: <IconBook /> },
  { key: 'settings', label: '设置', icon: <IconSettings /> },
];

export function AgentEditorLayout({
  promptEditor,
  toolSelector,
  knowledgeSelector,
  settingsPanel,
  chatArea,
  onSave,
  onPublish,
  onViewHistory,
}: AgentEditorLayoutProps) {
  const { activePanel, setActivePanel, leftPanelWidth, setLeftPanelWidth } = useAgentIdeStore();

  const handleTabChange = (key: string) => {
    setActivePanel(key as PanelType);
  };

  /** 左侧配置面板 */
  const renderLeftPanel = () => (
    <div className="agent-editor-left-panel">
      <Tabs
        activeTab={activePanel}
        onChange={handleTabChange}
        type="rounded"
        size="small"
        className="agent-editor-tabs"
      >
        {PANEL_TABS.map((tab) => (
          <TabPane
            key={tab.key}
            title={
              <span className="tab-title">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
            }
          />
        ))}
      </Tabs>

      <div className="agent-editor-panel-content">
        {activePanel === 'prompt' && (promptEditor ?? <DefaultPromptPanel />)}
        {activePanel === 'tools' && (toolSelector ?? <DefaultToolsPanel />)}
        {activePanel === 'knowledge' && (knowledgeSelector ?? <DefaultKnowledgePanel />)}
        {activePanel === 'settings' && (settingsPanel ?? <DefaultSettingsPanel />)}
      </div>
    </div>
  );

  /** 右侧调试面板 */
  const renderRightPanel = () => (
    <div className="agent-editor-right-panel">
      <div className="agent-editor-right-header">
        <h3>聊天调试</h3>
      </div>
      <div className="agent-editor-right-content">
        {chatArea ?? <DefaultChatPanel />}
      </div>
    </div>
  );

  return (
    <div className="agent-editor-layout">
      <AgentEditorHeader
        onSave={onSave}
        onPublish={onPublish}
        onViewHistory={onViewHistory}
      />

      <div className="agent-editor-body">
        <SplitPanel
          left={renderLeftPanel()}
          right={renderRightPanel()}
          defaultLeftWidth={leftPanelWidth}
          minLeftWidth={320}
          maxLeftWidth={800}
          onWidthChange={setLeftPanelWidth}
        />
      </div>
    </div>
  );
}

/** 默认 Prompt 面板占位 */
function DefaultPromptPanel() {
  return (
    <div className="default-panel">
      <p>Prompt 编辑器将在这里显示</p>
    </div>
  );
}

/** 默认工具面板占位 */
function DefaultToolsPanel() {
  return (
    <div className="default-panel">
      <p>工具选择器将在这里显示</p>
    </div>
  );
}

/** 默认知识库面板占位 */
function DefaultKnowledgePanel() {
  return (
    <div className="default-panel">
      <p>知识库选择器将在这里显示</p>
    </div>
  );
}

/** 默认设置面板占位 */
function DefaultSettingsPanel() {
  return (
    <div className="default-panel">
      <p>设置面板将在这里显示</p>
    </div>
  );
}

/** 默认聊天面板占位 */
function DefaultChatPanel() {
  return (
    <div className="default-panel">
      <p>聊天调试区将在这里显示</p>
    </div>
  );
}
