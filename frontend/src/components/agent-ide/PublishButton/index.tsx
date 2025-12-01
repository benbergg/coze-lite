import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Checkbox,
  Message,
  Timeline,
  Tag,
  Empty,
} from '@arco-design/web-react';
import {
  IconSend,
  IconHistory,
  IconCheck,
  IconClose,
  IconLoading,
} from '@arco-design/web-react/icon';
import { usePublishStore } from '@/stores/agentIdeStore';
import {
  type PublishConfig,
  type PublishRecord,
  PublishChannel,
  PublishStatus,
  CHANNEL_CONFIGS,
} from '@/types/agent';
import { nanoid } from 'nanoid';
import './index.css';

const FormItem = Form.Item;
const TextArea = Input.TextArea;

interface PublishButtonProps {
  agentId: string;
}

export function PublishButton({ agentId }: PublishButtonProps) {
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [form] = Form.useForm();

  const {
    getNextVersion,
    loadDraft,
    saveDraft,
    clearDraft,
    addPublishRecord,
    getPublishRecords,
    getLatestPublishRecord,
  } = usePublishStore();

  const latestRecord = getLatestPublishRecord(agentId);
  const publishRecords = getPublishRecords(agentId);

  // 打开发布弹窗时加载草稿
  useEffect(() => {
    if (publishModalVisible) {
      const draft = loadDraft(agentId);
      if (draft) {
        form.setFieldsValue({
          version: draft.version,
          description: draft.description,
          selectedChannels: draft.selectedChannels,
        });
      } else {
        form.setFieldsValue({
          version: getNextVersion(agentId),
          description: '',
          selectedChannels: [PublishChannel.WEB_SDK, PublishChannel.API],
        });
      }
    }
  }, [publishModalVisible, agentId, form, loadDraft, getNextVersion]);

  // 自动保存草稿
  const handleValuesChange = useCallback((_: any, allValues: any) => {
    const draft: PublishConfig = {
      agentId,
      version: allValues.version ?? '',
      description: allValues.description ?? '',
      selectedChannels: allValues.selectedChannels ?? [],
    };
    saveDraft(draft);
  }, [agentId, saveDraft]);

  // 发布
  const handlePublish = useCallback(async () => {
    try {
      await form.validate();
      const values = form.getFields();

      if (!values.selectedChannels || values.selectedChannels.length === 0) {
        Message.error('请至少选择一个发布渠道');
        return;
      }

      setPublishing(true);

      // 模拟发布 API 调用
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 创建发布记录
      const record: PublishRecord = {
        id: nanoid(),
        agentId,
        version: values.version,
        description: values.description,
        channels: values.selectedChannels,
        status: PublishStatus.SUCCESS,
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      };

      addPublishRecord(record);
      clearDraft(agentId);

      Message.success('发布成功！');
      setPublishModalVisible(false);
    } catch (error: any) {
      Message.error(`发布失败: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  }, [form, agentId, addPublishRecord, clearDraft]);

  // 获取状态标签
  const getStatusTag = (status: PublishStatus) => {
    switch (status) {
      case PublishStatus.SUCCESS:
        return <Tag color="green" icon={<IconCheck />}>发布成功</Tag>;
      case PublishStatus.FAILED:
        return <Tag color="red" icon={<IconClose />}>发布失败</Tag>;
      case PublishStatus.PUBLISHING:
        return <Tag color="blue" icon={<IconLoading />}>发布中</Tag>;
      default:
        return <Tag>草稿</Tag>;
    }
  };

  // 获取渠道名称
  const getChannelName = (channel: PublishChannel) => {
    return channel === PublishChannel.WEB_SDK ? 'Web SDK' : 'API';
  };

  return (
    <>
      {/* 发布历史按钮 */}
      <Button
        type="text"
        icon={<IconHistory />}
        onClick={() => setHistoryModalVisible(true)}
      >
        发布历史
      </Button>

      {/* 发布按钮 */}
      <Button
        type="primary"
        icon={<IconSend />}
        onClick={() => setPublishModalVisible(true)}
      >
        {latestRecord ? '重新发布' : '发布'}
      </Button>

      {/* 发布配置弹窗 */}
      <Modal
        title="发布 Agent"
        visible={publishModalVisible}
        onCancel={() => setPublishModalVisible(false)}
        footer={
          <>
            <Button onClick={() => setPublishModalVisible(false)}>取消</Button>
            <Button type="primary" loading={publishing} onClick={handlePublish}>
              {publishing ? '发布中...' : '确认发布'}
            </Button>
          </>
        }
        style={{ width: 560 }}
        unmountOnExit
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValuesChange}
        >
          {/* 版本号 */}
          <FormItem
            label="版本号"
            field="version"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="例如: v1, v2, v3..." />
          </FormItem>

          {/* 更新说明 */}
          <FormItem
            label="更新说明"
            field="description"
            rules={[{ required: true, message: '请输入更新说明' }]}
          >
            <TextArea
              placeholder="描述本次更新的内容..."
              autoSize={{ minRows: 3, maxRows: 6 }}
              showWordLimit
              maxLength={500}
            />
          </FormItem>

          {/* 发布渠道 */}
          <FormItem
            label="发布渠道"
            field="selectedChannels"
            rules={[{ required: true, message: '请选择发布渠道' }]}
          >
            <Checkbox.Group className="channel-checkbox-group">
              {CHANNEL_CONFIGS.map((channel) => (
                <div key={channel.channel} className="channel-option">
                  <Checkbox value={channel.channel} disabled={!channel.enabled}>
                    <div className="channel-info">
                      <span className="channel-icon">{channel.icon === 'icon-global' ? '🌐' : '🔌'}</span>
                      <div className="channel-text">
                        <div className="channel-name">{channel.name}</div>
                        <div className="channel-desc">{channel.description}</div>
                      </div>
                    </div>
                  </Checkbox>
                </div>
              ))}
            </Checkbox.Group>
          </FormItem>
        </Form>
      </Modal>

      {/* 发布历史弹窗 */}
      <Modal
        title="发布历史"
        visible={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        style={{ width: 640 }}
        unmountOnExit
      >
        {publishRecords.length === 0 ? (
          <Empty description="暂无发布记录" style={{ padding: '40px 0' }} />
        ) : (
          <Timeline className="publish-history-timeline">
            {publishRecords.map((record, index) => (
              <Timeline.Item
                key={record.id}
                dot={
                  index === 0 ? (
                    <div className="timeline-dot-latest">最新</div>
                  ) : undefined
                }
              >
                <div className="publish-record-item">
                  <div className="record-header">
                    <h4>{record.version}</h4>
                    {getStatusTag(record.status)}
                  </div>
                  <p className="record-description">{record.description}</p>
                  <div className="record-channels">
                    {record.channels.map((channel) => (
                      <Tag key={channel} size="small">
                        {getChannelName(channel)}
                      </Tag>
                    ))}
                  </div>
                  <div className="record-time">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </div>
                  {record.errorMessage && (
                    <div className="record-error">
                      错误：{record.errorMessage}
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Modal>
    </>
  );
}
