import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Message,
  Tag,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { KnowledgeStatus, RetrievalStrategy } from '@/types/knowledge';
import type { Knowledge } from '@/types/knowledge';
import './index.css';

const FormItem = Form.Item;

export function KnowledgeManager() {
  const {
    knowledgeBases,
    fetchKnowledgeBases,
    createKnowledge,
    deleteKnowledge,
  } = useKnowledgeStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  const handleCreate = async (values: any) => {
    try {
      await createKnowledge({
        name: values.name,
        description: values.description,
        config: {
          embeddingModel: values.embeddingModel,
          chunkConfig: {
            chunkSize: values.chunkSize,
            chunkOverlap: values.chunkOverlap,
            separator: '\n\n',
          },
          retrievalStrategy: values.retrievalStrategy,
          topK: 5,
          scoreThreshold: 0.7,
        },
        status: KnowledgeStatus.CREATING,
        documents: [],
        stats: {
          documentCount: 0,
          chunkCount: 0,
          totalSize: 0,
        },
      });

      Message.success('知识库创建成功');
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      Message.error(`创建失败: ${(error as Error).message}`);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除知识库将同时删除所有文档，此操作不可恢复',
      onOk: async () => {
        try {
          await deleteKnowledge(id);
          Message.success('删除成功');
        } catch (error) {
          Message.error(`删除失败: ${(error as Error).message}`);
        }
      },
    });
  };

  const handleManageDocuments = (id: string) => {
    // TODO: Navigate to document management page or open document manager modal
    console.log('Manage documents for knowledge base:', id);
    Message.info('文档管理功能开发中');
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (name: string, record: Knowledge) => (
        <Space>
          <strong>{name}</strong>
          <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
    },
    {
      title: '文档数量',
      dataIndex: 'stats',
      render: (_: any, record: Knowledge) => record.stats.documentCount,
    },
    {
      title: '检索策略',
      dataIndex: 'config',
      render: (_: any, record: Knowledge) => record.config.retrievalStrategy,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      render: (_: any, record: Knowledge) => (
        <Space>
          <Button type="text" onClick={() => handleManageDocuments(record.id)}>
            管理文档
          </Button>
          <Button type="text" status="danger" onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const knowledgeList = Object.values(knowledgeBases);

  return (
    <div className="knowledge-manager">
      <Card
        title="知识库管理"
        extra={
          <Button type="primary" icon={<IconPlus />} onClick={() => setCreateModalVisible(true)}>
            创建知识库
          </Button>
        }
      >
        <Table columns={columns} data={knowledgeList} pagination={{ pageSize: 10 }} />
      </Card>

      {/* 创建知识库 Modal */}
      <Modal
        title="创建知识库"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={form.submit}
      >
        <Form form={form} onSubmit={handleCreate}>
          <FormItem label="名称" field="name" rules={[{ required: true }]}>
            <Input placeholder="请输入知识库名称" />
          </FormItem>

          <FormItem label="描述" field="description">
            <Input.TextArea placeholder="请输入描述" />
          </FormItem>

          <FormItem
            label="Embedding 模型"
            field="embeddingModel"
            initialValue="text-embedding-ada-002"
          >
            <Select>
              <Select.Option value="text-embedding-ada-002">
                text-embedding-ada-002
              </Select.Option>
              <Select.Option value="text-embedding-3-small">
                text-embedding-3-small
              </Select.Option>
              <Select.Option value="text-embedding-3-large">
                text-embedding-3-large
              </Select.Option>
            </Select>
          </FormItem>

          <FormItem
            label="检索策略"
            field="retrievalStrategy"
            initialValue={RetrievalStrategy.SEMANTIC}
          >
            <Select>
              <Select.Option value={RetrievalStrategy.SEMANTIC}>语义检索</Select.Option>
              <Select.Option value={RetrievalStrategy.KEYWORD}>关键词检索</Select.Option>
              <Select.Option value={RetrievalStrategy.HYBRID}>混合检索</Select.Option>
            </Select>
          </FormItem>

          <FormItem label="分块大小" field="chunkSize" initialValue={1000}>
            <Input type="number" suffix="字符" />
          </FormItem>

          <FormItem label="分块重叠" field="chunkOverlap" initialValue={200}>
            <Input type="number" suffix="字符" />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

function getStatusColor(status: KnowledgeStatus): string {
  switch (status) {
    case KnowledgeStatus.READY:
      return 'green';
    case KnowledgeStatus.CREATING:
    case KnowledgeStatus.INDEXING:
      return 'blue';
    case KnowledgeStatus.ERROR:
      return 'red';
    default:
      return 'gray';
  }
}
