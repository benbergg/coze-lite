import { useState, useEffect } from 'react';
import {
  Input,
  Select,
  Card,
  Grid,
  Button,
  Tag,
  Empty,
  Message,
} from '@arco-design/web-react';
import {
  IconSearch,
  IconStar,
  IconStarFill,
  IconDownload,
} from '@arco-design/web-react/icon';
import { usePluginStore } from '@/stores';
import { PluginType, type Plugin } from '@/types/plugin';
import './index.css';

const { Row, Col } = Grid;

export function PluginMarketplace() {
  const {
    fetchPlugins,
    searchPlugins,
    setFilters,
    filters,
    toggleFavorite,
    installPlugin,
    uninstallPlugin,
    favoritePlugins,
    installedPlugins,
    loading,
  } = usePluginStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  useEffect(() => {
    const results = searchPlugins(searchQuery);
    setPlugins(results);
  }, [searchQuery, filters, searchPlugins]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleCategoryChange = (value: string) => {
    setFilters({ category: value || undefined });
  };

  const handleTypeChange = (value: PluginType) => {
    setFilters({ type: value || undefined });
  };

  return (
    <div className="plugin-marketplace">
      {/* 搜索和过滤 */}
      <div className="marketplace-header">
        <Input.Search
          placeholder="搜索插件..."
          prefix={<IconSearch />}
          onChange={handleSearch}
          style={{ width: 400 }}
          allowClear
        />

        <div className="marketplace-filters">
          <Select
            placeholder="选择分类"
            onChange={handleCategoryChange}
            allowClear
            style={{ width: 200 }}
          >
            <Select.Option value="search">搜索</Select.Option>
            <Select.Option value="database">数据库</Select.Option>
            <Select.Option value="ai">AI 工具</Select.Option>
            <Select.Option value="utility">实用工具</Select.Option>
          </Select>

          <Select
            placeholder="插件类型"
            onChange={handleTypeChange}
            allowClear
            style={{ width: 200 }}
          >
            <Select.Option value={PluginType.FORM}>表单插件</Select.Option>
            <Select.Option value={PluginType.CODE}>代码插件</Select.Option>
            <Select.Option value={PluginType.API}>API 插件</Select.Option>
          </Select>
        </div>
      </div>

      {/* 插件列表 */}
      <div className="marketplace-content">
        {loading ? (
          <div className="loading-container">加载中...</div>
        ) : plugins.length === 0 ? (
          <Empty description="未找到插件" />
        ) : (
          <Row gutter={16}>
            {plugins.map((plugin) => (
              <Col span={8} key={plugin.id}>
                <PluginCard
                  plugin={plugin}
                  isFavorite={favoritePlugins.has(plugin.id)}
                  isInstalled={installedPlugins.has(plugin.id)}
                  onToggleFavorite={() => toggleFavorite(plugin.id)}
                  onInstall={async () => {
                    try {
                      await installPlugin(plugin.id);
                      Message.success(`${plugin.name} 安装成功`);
                    } catch (error) {
                      Message.error(`安装失败: ${(error as Error).message}`);
                    }
                  }}
                  onUninstall={async () => {
                    try {
                      await uninstallPlugin(plugin.id);
                      Message.success(`${plugin.name} 卸载成功`);
                    } catch (error) {
                      Message.error(`卸载失败: ${(error as Error).message}`);
                    }
                  }}
                />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}

// 插件卡片组件
interface PluginCardProps {
  plugin: Plugin;
  isFavorite: boolean;
  isInstalled: boolean;
  onToggleFavorite: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}

function PluginCard({
  plugin,
  isFavorite,
  isInstalled,
  onToggleFavorite,
  onInstall,
  onUninstall,
}: PluginCardProps) {
  return (
    <Card
      className="plugin-card"
      hoverable
      cover={
        plugin.metadata.icon ? (
          <img src={plugin.metadata.icon} alt={plugin.name} />
        ) : (
          <div className="plugin-card-placeholder">
            {plugin.name.substring(0, 2).toUpperCase()}
          </div>
        )
      }
      actions={[
        <Button
          key="favorite"
          type="text"
          icon={isFavorite ? <IconStarFill /> : <IconStar />}
          onClick={onToggleFavorite}
        />,
        <Button
          key="install"
          type={isInstalled ? 'default' : 'primary'}
          icon={<IconDownload />}
          onClick={isInstalled ? onUninstall : onInstall}
        >
          {isInstalled ? '卸载' : '安装'}
        </Button>,
      ]}
    >
      <Card.Meta
        title={plugin.name}
        description={
          <>
            <p className="plugin-description">{plugin.description}</p>
            <div className="plugin-tags">
              {plugin.metadata.tags.map((tag) => (
                <Tag key={tag} size="small">
                  {tag}
                </Tag>
              ))}
            </div>
            {plugin.stats && (
              <div className="plugin-stats">
                <span>⭐ {plugin.stats.rating.toFixed(1)}</span>
                <span>📦 {plugin.stats.installs.toLocaleString()} 安装</span>
              </div>
            )}
          </>
        }
      />
    </Card>
  );
}
