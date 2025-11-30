import { z } from 'zod';

// 知识库状态
export enum KnowledgeStatus {
  CREATING = 'creating', // 创建中
  READY = 'ready', // 就绪
  INDEXING = 'indexing', // 索引中
  ERROR = 'error', // 错误
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
  SEMANTIC = 'semantic', // 语义检索
  KEYWORD = 'keyword', // 关键词检索
  HYBRID = 'hybrid', // 混合检索
}

// 分块配置
export interface ChunkConfig {
  chunkSize: number; // 分块大小（字符数）
  chunkOverlap: number; // 分块重叠（字符数）
  separator: string; // 分隔符
}

// 知识库配置
export interface KnowledgeConfig {
  embeddingModel: string; // Embedding 模型
  chunkConfig: ChunkConfig; // 分块配置
  retrievalStrategy: RetrievalStrategy;
  topK: number; // 检索返回数量
  scoreThreshold: number; // 相似度阈值
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

// 文档分块
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[]; // 向量
  metadata: {
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
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

// 知识库元数据
export interface KnowledgeMetadata {
  tableCount: number;
  chunkCount: number;
  totalSize: number;
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

export type KnowledgeFormData = z.infer<typeof KnowledgeSchema>;
