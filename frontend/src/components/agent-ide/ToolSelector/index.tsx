import { useState, useCallback, useMemo } from 'react';
import {
  Button,
  Input,
  Empty,
  Checkbox,
  Tag,
  Modal,
  Tabs,
  Message,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconDelete,
  IconSearch,
  IconApps,
  IconShareInternal,
  IconBook,
} from '@arco-design/web-react/icon';
import { useAgentIdeStore } from '@/stores/agentIdeStore';
import { usePluginStore } from '@/stores/pluginStore';
import type { Tool } from '@/types/agent';
import type { Plugin } from '@/types/plugin';
import './index.css';

const TabPane = Tabs.TabPane;

/** 工具类型 */
type ToolType = 'plugin' | 'workflow' | 'knowledge';

/** 工具分类配置 */
const TOOL_CATEGORIES: Array<{ type: ToolType; label: string; icon: React.ReactNode }> = [
  { type: 'plugin', label: '插件', icon: <IconApps /> },
  { type: 'workflow', label: '工作流', icon: <IconShareInternal /> },
  { type: 'knowledge', label: '知识库', icon: <IconBook /> },
];

export function ToolSelector() {
  const { currentAgent, updateAgentConfig } = useAgentIdeStore();
  const { plugins } = usePluginStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ToolType>('plugin');
  const [searchKeyword, setSearchKeyword] = useState('');

  const currentTools = currentAgent?.config.tools ?? [];
  const currentWorkflows = currentAgent?.config.workflows ?? [];

  // 将 plugins Record 转换为数组
  const pluginList = useMemo(() => Object.values(plugins), [plugins]);

  // 获取已选择的工具 ID 列表
  const selectedToolIds = useMemo(() => {
    return new Set(currentTools.map((t) => t.id));
  }, [currentTools]);

  // 过滤可用工具
  const filteredPlugins = useMemo(() => {
    if (!searchKeyword) return pluginList;
    const keyword = searchKeyword.toLowerCase();
    return pluginList.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword)
    );
  }, [pluginList, searchKeyword]);

  // 添加工具
  const handleAddTool = useCallback((tool: Tool) => {
    if (selectedToolIds.has(tool.id)) {
      Message.warning('该工具已添加');
      return;
    }
    updateAgentConfig({
      tools: [...currentTools, tool],
    });
    Message.success(`已添加: ${tool.name}`);
  }, [currentTools, selectedToolIds, updateAgentConfig]);

  // 移除工具
  const handleRemoveTool = useCallback((toolId: string) => {
    updateAgentConfig({
      tools: currentTools.filter((t) => t.id !== toolId),
    });
    Message.success('已移除工具');
  }, [currentTools, updateAgentConfig]);

  // 从插件创建工具
  const handleSelectPlugin = useCallback((plugin: Plugin) => {
    const tool: Tool = {
      id: plugin.id,
      type: 'plugin',
      name: plugin.name,
      description: plugin.description ?? '',
    };
    handleAddTool(tool);
  }, [handleAddTool]);

  // 切换工具选中状态
  const handleToggleTool = useCallback((plugin: Plugin, checked: boolean) => {
    if (checked) {
      handleSelectPlugin(plugin);
    } else {
      handleRemoveTool(plugin.id);
    }
  }, [handleSelectPlugin, handleRemoveTool]);

  return (
    <div className="tool-selector">
      {/* 已选工具列表 */}
      <section className="tool-selector-section">
        <div className="section-header">
          <h3 className="section-title">已添加的工具</h3>
          <Button
            type="primary"
            size="small"
            icon={<IconPlus />}
            onClick={() => setModalVisible(true)}
          >
            添加工具
          </Button>
        </div>

        {currentTools.length === 0 ? (
          <Empty
            description="暂无工具，点击上方按钮添加"
            style={{ padding: '40px 0' }}
          />
        ) : (
          <div className="selected-tools-list">
            {currentTools.map((tool) => (
              <div key={tool.id} className="selected-tool-item">
                <div className="tool-info">
                  <div className="tool-icon">
                    {tool.type === 'plugin' ? <IconApps /> : <IconShareInternal />}
                  </div>
                  <div className="tool-content">
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-desc">{tool.description}</div>
                  </div>
                </div>
                <div className="tool-actions">
                  <Tag size="small" color={tool.type === 'plugin' ? 'arcoblue' : 'green'}>
                    {tool.type === 'plugin' ? '插件' : '工作流'}
                  </Tag>
                  <Button
                    type="text"
                    size="mini"
                    status="danger"
                    icon={<IconDelete />}
                    onClick={() => handleRemoveTool(tool.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 工具统计 */}
      <section className="tool-selector-section">
        <h3 className="section-title">工具统计</h3>
        <div className="tool-stats">
          <div className="stat-item">
            <span className="stat-value">{currentTools.filter((t) => t.type === 'plugin').length}</span>
            <span className="stat-label">插件</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{currentTools.filter((t) => t.type === 'function').length}</span>
            <span className="stat-label">工作流</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{currentWorkflows.length}</span>
            <span className="stat-label">知识库</span>
          </div>
        </div>
      </section>

      {/* 添加工具弹窗 */}
      <Modal
        title="添加工具"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        style={{ width: 720 }}
        unmountOnExit
      >
        <div className="add-tool-modal">
          {/* 搜索框 */}
          <Input
            prefix={<IconSearch />}
            placeholder="搜索工具..."
            value={searchKeyword}
            onChange={setSearchKeyword}
            allowClear
            className="tool-search-input"
          />

          {/* 工具分类 Tabs */}
          <Tabs
            activeTab={activeTab}
            onChange={(key) => setActiveTab(key as ToolType)}
            type="rounded"
          >
            {TOOL_CATEGORIES.map((cat) => (
              <TabPane
                key={cat.type}
                title={
                  <span className="tab-title">
                    {cat.icon}
                    <span>{cat.label}</span>
                  </span>
                }
              >
                {cat.type === 'plugin' && (
                  <div className="tool-list">
                    {filteredPlugins.length === 0 ? (
                      <Empty description="暂无可用插件" />
                    ) : (
                      filteredPlugins.map((plugin) => (
                        <div key={plugin.id} className="tool-list-item">
                          <Checkbox
                            checked={selectedToolIds.has(plugin.id)}
                            onChange={(checked) => handleToggleTool(plugin, checked)}
                          >
                            <div className="tool-list-item-content">
                              <div className="tool-list-item-name">{plugin.name}</div>
                              <div className="tool-list-item-desc">
                                {plugin.description ?? '暂无描述'}
                              </div>
                            </div>
                          </Checkbox>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {cat.type === 'workflow' && (
                  <Empty
                    description="工作流功能即将上线"
                    style={{ padding: '60px 0' }}
                  />
                )}

                {cat.type === 'knowledge' && (
                  <Empty
                    description="知识库功能即将上线"
                    style={{ padding: '60px 0' }}
                  />
                )}
              </TabPane>
            ))}
          </Tabs>
        </div>
      </Modal>
    </div>
  );
}
