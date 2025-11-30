import { useState } from 'react';
import {
  Card,
  Upload,
  Table,
  Space,
  Button,
  Modal,
  Message,
  Tag,
  Progress,
} from '@arco-design/web-react';
import { IconUpload, IconDelete, IconRefresh } from '@arco-design/web-react/icon';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import type { Document } from '@/types/knowledge';
import './index.css';

interface DocumentManagerProps {
  knowledgeId: string;
}

export function DocumentManager({ knowledgeId }: DocumentManagerProps) {
  const {
    getDocuments,
    uploadDocument,
    deleteDocument,
    reindexDocument,
  } = useKnowledgeStore();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const documents = getDocuments(knowledgeId);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await uploadDocument(knowledgeId, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      Message.success('文档上传成功');

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      Message.error(`上传失败: ${(error as Error).message}`);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (documentId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，是否继续？',
      onOk: async () => {
        try {
          await deleteDocument(documentId);
          Message.success('删除成功');
        } catch (error) {
          Message.error(`删除失败: ${(error as Error).message}`);
        }
      },
    });
  };

  const handleReindex = async (documentId: string) => {
    try {
      await reindexDocument(documentId);
      Message.success('重新索引成功');
    } catch (error) {
      Message.error(`重新索引失败: ${(error as Error).message}`);
    }
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'metadata',
      render: (_: any, record: Document) => record.metadata.filename,
    },
    {
      title: '文件类型',
      dataIndex: 'metadata',
      render: (_: any, record: Document) => (
        <Tag>{record.metadata.fileType.toUpperCase()}</Tag>
      ),
    },
    {
      title: '文件大小',
      dataIndex: 'metadata',
      render: (_: any, record: Document) => formatFileSize(record.metadata.fileSize),
    },
    {
      title: '分块数量',
      dataIndex: 'chunks',
      render: (chunks: any[]) => chunks?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'indexed' ? 'green' : status === 'failed' ? 'red' : 'blue'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'metadata',
      render: (_: any, record: Document) => new Date(record.metadata.uploadedAt).toLocaleString(),
    },
    {
      title: '操作',
      render: (_: any, record: Document) => (
        <Space>
          <Button
            type="text"
            icon={<IconRefresh />}
            onClick={() => handleReindex(record.id)}
          >
            重新索引
          </Button>
          <Button
            type="text"
            status="danger"
            icon={<IconDelete />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="文档管理"
      extra={
        <Upload
          accept=".pdf,.docx,.txt,.md"
          showUploadList={false}
          beforeUpload={file => {
            handleUpload(file);
            return false; // 阻止自动上传
          }}
        >
          <Button type="primary" icon={<IconUpload />} loading={uploading}>
            上传文档
          </Button>
        </Upload>
      }
    >
      {uploading && (
        <div style={{ marginBottom: 16 }}>
          <Progress percent={uploadProgress} />
        </div>
      )}

      <Table columns={columns} data={documents} pagination={{ pageSize: 10 }} />
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
