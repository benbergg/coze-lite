# 资源管理 - 知识库系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-data/knowledge`, `@coze-foundation/knowledge-*`

## 一、概述

知识库系统为 Agent 提供外部知识检索能力，支持 RAG（Retrieval-Augmented Generation）场景。本文档提供完整的知识库管理和检索实现方案。

### 1.1 核心功能

- **文档管理**: 上传、索引、删除文档
- **向量检索**: 基于语义相似度的文档检索
- **分块策略**: 智能文档分块和向量化
- **多格式支持**: PDF、Word、TXT、Markdown 等
- **实时更新**: 文档变更自动重新索引

### 1.2 技术架构

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| **向量数据库** | Milvus / Qdrant | 存储文档向量 |
| **Embedding 模型** | text-embedding-ada-002 | OpenAI Embedding API |
| **文档解析** | pdf-parse, mammoth | 多格式文档解析 |
| **分块算法** | Recursive Character Text Splitter | LangChain 分块策略 |

## 二、数据模型

### 2.1 知识库定义

**文件**: `frontend/src/types/knowledge.ts`

```typescript
import { z } from 'zod';

// 知识库状态
export enum KnowledgeStatus {
  CREATING = 'creating',     // 创建中
  READY = 'ready',           // 就绪
  INDEXING = 'indexing',     // 索引中
  ERROR = 'error',           // 错误
}

// 文档类型
export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
  MARKDOWN = 'markdown',
  HTML = 'html',
}

// 检索策略
export enum RetrievalStrategy {
  SEMANTIC = 'semantic',     // 语义检索
  KEYWORD = 'keyword',       // 关键词检索
  HYBRID = 'hybrid',         // 混合检索
}

// 分块配置
export interface ChunkConfig {
  chunkSize: number;         // 分块大小（字符数）
  chunkOverlap: number;      // 分块重叠（字符数）
  separator: string;         // 分隔符
}

// 知识库配置
export interface KnowledgeConfig {
  embeddingModel: string;    // Embedding 模型
  chunkConfig: ChunkConfig;  // 分块配置
  retrievalStrategy: RetrievalStrategy;
  topK: number;              // 检索返回数量
  scoreThreshold: number;    // 相似度阈值
}

// 文档元数据
export interface DocumentMetadata {
  filename: string;
  fileType: DocumentType;
  fileSize: number;
  uploadedAt: string;
  author?: string;
  tags?: string[];
  customMetadata?: Record<string, any>;
}

// 文档定义
export interface Document {
  id: string;
  knowledgeId: string;
  content: string;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
  status: 'pending' | 'indexed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

// 文档分块
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];      // 向量
  metadata: {
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
}

// 知识库定义
export interface Knowledge {
  id: string;
  name: string;
  description: string;
  status: KnowledgeStatus;
  config: KnowledgeConfig;
  documents: Document[];
  stats: {
    documentCount: number;
    chunkCount: number;
    totalSize: number;
  };
  createdAt: string;
  updatedAt: string;
  workspace?: string;
}

// 检索请求
export interface RetrievalRequest {
  knowledgeId: string;
  query: string;
  topK?: number;
  scoreThreshold?: number;
  filters?: Record<string, any>;
}

// 检索结果
export interface RetrievalResult {
  chunks: Array<{
    content: string;
    score: number;
    metadata: DocumentMetadata;
  }>;
  totalResults: number;
}

// Zod Schema
export const KnowledgeSchema = z.object({
  name: z.string().min(1, '知识库名称不能为空').max(100),
  description: z.string().max(500),
  config: z.object({
    embeddingModel: z.string(),
    chunkConfig: z.object({
      chunkSize: z.number().min(100).max(4000).default(1000),
      chunkOverlap: z.number().min(0).max(500).default(200),
      separator: z.string().default('\n\n'),
    }),
    retrievalStrategy: z.nativeEnum(RetrievalStrategy),
    topK: z.number().min(1).max(20).default(5),
    scoreThreshold: z.number().min(0).max(1).default(0.7),
  }),
});
```

## 三、状态管理

### 3.1 Knowledge Store

**文件**: `frontend/src/stores/knowledgeStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Knowledge,
  Document,
  RetrievalRequest,
  RetrievalResult
} from '@/types/knowledge';

interface KnowledgeState {
  // 状态
  knowledgeBases: Record<string, Knowledge>;
  documents: Record<string, Document>;

  // 加载状态
  loading: boolean;
  error: string | null;
}

interface KnowledgeActions {
  // 知识库 CRUD
  fetchKnowledgeBases: () => Promise<void>;
  getKnowledge: (id: string) => Promise<Knowledge>;
  createKnowledge: (knowledge: Partial<Knowledge>) => Promise<Knowledge>;
  updateKnowledge: (id: string, updates: Partial<Knowledge>) => Promise<void>;
  deleteKnowledge: (id: string) => Promise<void>;

  // 文档管理
  uploadDocument: (knowledgeId: string, file: File) => Promise<Document>;
  deleteDocument: (documentId: string) => Promise<void>;
  reindexDocument: (documentId: string) => Promise<void>;

  // 检索
  retrieve: (request: RetrievalRequest) => Promise<RetrievalResult>;

  // 工具方法
  getDocuments: (knowledgeId: string) => Document[];
}

export const useKnowledgeStore = create<KnowledgeState & KnowledgeActions>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      knowledgeBases: {},
      documents: {},
      loading: false,
      error: null,

      // 获取知识库列表
      fetchKnowledgeBases: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/knowledge');
          const data = await response.json();

          set(state => {
            data.forEach((kb: Knowledge) => {
              state.knowledgeBases[kb.id] = kb;
              // 缓存文档
              kb.documents?.forEach(doc => {
                state.documents[doc.id] = doc;
              });
            });
            state.loading = false;
          });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // 获取单个知识库
      getKnowledge: async (id: string) => {
        const cached = get().knowledgeBases[id];
        if (cached) return cached;

        const response = await fetch(`/api/knowledge/${id}`);
        const knowledge = await response.json();

        set(state => {
          state.knowledgeBases[id] = knowledge;
        });

        return knowledge;
      },

      // 创建知识库
      createKnowledge: async (knowledge: Partial<Knowledge>) => {
        const response = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(knowledge),
        });

        const newKnowledge = await response.json();

        set(state => {
          state.knowledgeBases[newKnowledge.id] = newKnowledge;
        });

        return newKnowledge;
      },

      // 更新知识库
      updateKnowledge: async (id: string, updates: Partial<Knowledge>) => {
        const response = await fetch(`/api/knowledge/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const updated = await response.json();

        set(state => {
          state.knowledgeBases[id] = { ...state.knowledgeBases[id], ...updated };
        });
      },

      // 删除知识库
      deleteKnowledge: async (id: string) => {
        await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });

        set(state => {
          const knowledge = state.knowledgeBases[id];
          // 删除关联文档
          knowledge?.documents?.forEach(doc => {
            delete state.documents[doc.id];
          });
          delete state.knowledgeBases[id];
        });
      },

      // 上传文档
      uploadDocument: async (knowledgeId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('knowledgeId', knowledgeId);

        const response = await fetch('/api/knowledge/documents', {
          method: 'POST',
          body: formData,
        });

        const document = await response.json();

        set(state => {
          state.documents[document.id] = document;
          const knowledge = state.knowledgeBases[knowledgeId];
          if (knowledge) {
            knowledge.documents = knowledge.documents || [];
            knowledge.documents.push(document);
            knowledge.stats.documentCount += 1;
          }
        });

        return document;
      },

      // 删除文档
      deleteDocument: async (documentId: string) => {
        const document = get().documents[documentId];
        if (!document) return;

        await fetch(`/api/knowledge/documents/${documentId}`, {
          method: 'DELETE',
        });

        set(state => {
          const knowledge = state.knowledgeBases[document.knowledgeId];
          if (knowledge) {
            knowledge.documents = knowledge.documents.filter(d => d.id !== documentId);
            knowledge.stats.documentCount -= 1;
          }
          delete state.documents[documentId];
        });
      },

      // 重新索引文档
      reindexDocument: async (documentId: string) => {
        const response = await fetch(`/api/knowledge/documents/${documentId}/reindex`, {
          method: 'POST',
        });

        const updated = await response.json();

        set(state => {
          state.documents[documentId] = { ...state.documents[documentId], ...updated };
        });
      },

      // 检索
      retrieve: async (request: RetrievalRequest) => {
        const response = await fetch('/api/knowledge/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        return await response.json();
      },

      // 获取知识库的所有文档
      getDocuments: (knowledgeId: string) => {
        const knowledge = get().knowledgeBases[knowledgeId];
        if (!knowledge) return [];

        return knowledge.documents || [];
      },
    })),
    {
      name: 'knowledge-store',
      partialize: (state) => ({
        knowledgeBases: state.knowledgeBases,
      }),
    }
  )
);
```

## 四、UI 组件

### 4.1 知识库管理

**文件**: `frontend/src/components/knowledge/KnowledgeManager/index.tsx`

```typescript
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
  Upload,
  Message,
  Tag,
  Progress,
} from '@arco-design/web-react';
import {
  IconPlus,
  IconUpload,
  IconDelete,
  IconRefresh,
} from '@arco-design/web-react/icon';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { KnowledgeStatus, RetrievalStrategy } from '@/types/knowledge';
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
  }, []);

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
      Message.error(`创建失败: ${error.message}`);
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
          Message.error(`删除失败: ${error.message}`);
        }
      },
    });
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
      dataIndex: 'stats.documentCount',
    },
    {
      title: '检索策略',
      dataIndex: 'config.retrievalStrategy',
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
```

### 4.2 文档管理

**文件**: `frontend/src/components/knowledge/DocumentManager/index.tsx`

```typescript
import { useState, useEffect } from 'react';
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
      Message.error(`上传失败: ${error.message}`);
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
          Message.error(`删除失败: ${error.message}`);
        }
      },
    });
  };

  const handleReindex = async (documentId: string) => {
    try {
      await reindexDocument(documentId);
      Message.success('重新索引成功');
    } catch (error) {
      Message.error(`重新索引失败: ${error.message}`);
    }
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'metadata.filename',
    },
    {
      title: '文件类型',
      dataIndex: 'metadata.fileType',
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: '文件大小',
      dataIndex: 'metadata.fileSize',
      render: (size: number) => formatFileSize(size),
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
      dataIndex: 'metadata.uploadedAt',
      render: (date: string) => new Date(date).toLocaleString(),
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
```

## 五、检索服务

### 5.1 检索实现

**文件**: `frontend/src/services/KnowledgeRetriever.ts`

```typescript
import type { RetrievalRequest, RetrievalResult } from '@/types/knowledge';

export class KnowledgeRetriever {
  // 执行检索
  static async retrieve(request: RetrievalRequest): Promise<RetrievalResult> {
    const response = await fetch('/api/knowledge/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`检索失败: ${response.statusText}`);
    }

    return await response.json();
  }

  // 流式检索（用于实时显示结果）
  static async *retrieveStream(request: RetrievalRequest): AsyncGenerator<any> {
    const response = await fetch('/api/knowledge/retrieve/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          yield data;
        } catch (error) {
          console.error('解析检索结果失败:', error);
        }
      }
    }
  }

  // 混合检索（语义 + 关键词）
  static async hybridRetrieve(
    knowledgeId: string,
    query: string,
    options?: {
      semanticWeight?: number;
      keywordWeight?: number;
      topK?: number;
    }
  ): Promise<RetrievalResult> {
    const { semanticWeight = 0.7, keywordWeight = 0.3, topK = 5 } = options || {};

    // 并行执行语义检索和关键词检索
    const [semanticResults, keywordResults] = await Promise.all([
      this.retrieve({
        knowledgeId,
        query,
        topK: topK * 2, // 获取更多结果用于重排序
      }),
      this.keywordSearch(knowledgeId, query, topK * 2),
    ]);

    // 合并结果并重排序
    const mergedResults = this.mergeResults(
      semanticResults.chunks,
      keywordResults.chunks,
      semanticWeight,
      keywordWeight
    );

    return {
      chunks: mergedResults.slice(0, topK),
      totalResults: mergedResults.length,
    };
  }

  // 关键词搜索
  private static async keywordSearch(
    knowledgeId: string,
    query: string,
    topK: number
  ): Promise<RetrievalResult> {
    const response = await fetch('/api/knowledge/keyword-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knowledgeId, query, topK }),
    });

    return await response.json();
  }

  // 合并检索结果
  private static mergeResults(
    semanticChunks: any[],
    keywordChunks: any[],
    semanticWeight: number,
    keywordWeight: number
  ) {
    const mergedMap = new Map<string, any>();

    // 添加语义检索结果
    semanticChunks.forEach(chunk => {
      mergedMap.set(chunk.id, {
        ...chunk,
        score: chunk.score * semanticWeight,
      });
    });

    // 添加关键词检索结果
    keywordChunks.forEach(chunk => {
      if (mergedMap.has(chunk.id)) {
        const existing = mergedMap.get(chunk.id);
        existing.score += chunk.score * keywordWeight;
      } else {
        mergedMap.set(chunk.id, {
          ...chunk,
          score: chunk.score * keywordWeight,
        });
      }
    });

    // 按分数降序排序
    return Array.from(mergedMap.values()).sort((a, b) => b.score - a.score);
  }
}
```

## 六、后端 API 设计

### 6.1 RESTful API

```
GET    /api/knowledge                    # 获取知识库列表
GET    /api/knowledge/:id                # 获取知识库详情
POST   /api/knowledge                    # 创建知识库
PUT    /api/knowledge/:id                # 更新知识库
DELETE /api/knowledge/:id                # 删除知识库

POST   /api/knowledge/documents          # 上传文档
DELETE /api/knowledge/documents/:id      # 删除文档
POST   /api/knowledge/documents/:id/reindex  # 重新索引文档

POST   /api/knowledge/retrieve           # 执行检索
POST   /api/knowledge/retrieve/stream    # 流式检索
POST   /api/knowledge/keyword-search     # 关键词搜索
```

### 6.2 Go 服务接口

```go
// internal/domain/knowledge/service.go
package knowledge

import "context"

type Service interface {
    // 知识库管理
    ListKnowledgeBases(ctx context.Context) ([]*Knowledge, error)
    GetKnowledge(ctx context.Context, id string) (*Knowledge, error)
    CreateKnowledge(ctx context.Context, knowledge *Knowledge) (*Knowledge, error)
    UpdateKnowledge(ctx context.Context, id string, updates map[string]interface{}) error
    DeleteKnowledge(ctx context.Context, id string) error

    // 文档管理
    UploadDocument(ctx context.Context, knowledgeID string, file []byte, metadata *DocumentMetadata) (*Document, error)
    DeleteDocument(ctx context.Context, documentID string) error
    ReindexDocument(ctx context.Context, documentID string) error

    // 检索
    Retrieve(ctx context.Context, req *RetrievalRequest) (*RetrievalResult, error)
    KeywordSearch(ctx context.Context, knowledgeID, query string, topK int) (*RetrievalResult, error)
}

type Knowledge struct {
    ID          string          `json:"id"`
    Name        string          `json:"name"`
    Description string          `json:"description"`
    Status      KnowledgeStatus `json:"status"`
    Config      KnowledgeConfig `json:"config"`
    Stats       KnowledgeStats  `json:"stats"`
    CreatedAt   time.Time       `json:"created_at"`
    UpdatedAt   time.Time       `json:"updated_at"`
}

type Document struct {
    ID          string           `json:"id"`
    KnowledgeID string           `json:"knowledge_id"`
    Content     string           `json:"content"`
    Metadata    DocumentMetadata `json:"metadata"`
    Chunks      []DocumentChunk  `json:"chunks"`
    Status      string           `json:"status"`
    CreatedAt   time.Time        `json:"created_at"`
    UpdatedAt   time.Time        `json:"updated_at"`
}
```

## 七、最佳实践

### 7.1 文档分块策略

```typescript
// 智能分块（按段落）
function splitByParagraph(text: string, chunkSize: number, overlap: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      // 添加重叠部分
      const words = currentChunk.split(' ');
      currentChunk = words.slice(-overlap).join(' ') + ' ' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
```

### 7.2 向量缓存

```typescript
// 缓存检索结果
import { LRUCache } from 'lru-cache';

const retrievalCache = new LRUCache<string, RetrievalResult>({
  max: 100,
  ttl: 1000 * 60 * 5, // 5 分钟
});

async function cachedRetrieve(request: RetrievalRequest): Promise<RetrievalResult> {
  const cacheKey = JSON.stringify(request);

  const cached = retrievalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await KnowledgeRetriever.retrieve(request);
  retrievalCache.set(cacheKey, result);

  return result;
}
```

### 7.3 批量处理

```typescript
// 批量上传文档
async function batchUploadDocuments(
  knowledgeId: string,
  files: File[]
): Promise<Document[]> {
  const results: Document[] = [];
  const batchSize = 5;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(file => uploadDocument(knowledgeId, file))
    );
    results.push(...batchResults);
  }

  return results;
}
```

---

**文档状态**: ✅ 完成
**下一步**: 创建 [23-database-module.md] - 数据库模块文档
