import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Knowledge,
  Document,
  RetrievalRequest,
  RetrievalResult,
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
    (set, get) => ({
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

          const knowledgeBases: Record<string, Knowledge> = {};
          const documents: Record<string, Document> = {};

          data.forEach((kb: Knowledge) => {
            knowledgeBases[kb.id] = kb;
            // 缓存文档
            kb.documents?.forEach((doc) => {
              documents[doc.id] = doc;
            });
          });

          set({ knowledgeBases, documents, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      // 获取单个知识库
      getKnowledge: async (id: string) => {
        const cached = get().knowledgeBases[id];
        if (cached) return cached;

        const response = await fetch(`/api/knowledge/${id}`);
        const knowledge = await response.json();

        set((state) => ({
          knowledgeBases: { ...state.knowledgeBases, [id]: knowledge },
        }));

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

        set((state) => ({
          knowledgeBases: {
            ...state.knowledgeBases,
            [newKnowledge.id]: newKnowledge,
          },
        }));

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

        set((state) => ({
          knowledgeBases: {
            ...state.knowledgeBases,
            [id]: { ...state.knowledgeBases[id], ...updated },
          },
        }));
      },

      // 删除知识库
      deleteKnowledge: async (id: string) => {
        await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });

        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: removed, ...restKnowledgeBases } = state.knowledgeBases;
          const knowledge = state.knowledgeBases[id];

          // 删除关联文档
          const newDocuments = { ...state.documents };
          knowledge?.documents?.forEach((doc) => {
            delete newDocuments[doc.id];
          });

          return {
            knowledgeBases: restKnowledgeBases,
            documents: newDocuments,
          };
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

        set((state) => ({
          documents: { ...state.documents, [document.id]: document },
          knowledgeBases: {
            ...state.knowledgeBases,
            [knowledgeId]: {
              ...state.knowledgeBases[knowledgeId],
              documents: [
                ...(state.knowledgeBases[knowledgeId]?.documents || []),
                document,
              ],
              stats: {
                ...state.knowledgeBases[knowledgeId].stats,
                documentCount:
                  state.knowledgeBases[knowledgeId].stats.documentCount + 1,
              },
            },
          },
        }));

        return document;
      },

      // 删除文档
      deleteDocument: async (documentId: string) => {
        const document = get().documents[documentId];
        if (!document) return;

        await fetch(`/api/knowledge/documents/${documentId}`, {
          method: 'DELETE',
        });

        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [documentId]: removed, ...restDocuments } = state.documents;
          const knowledge = state.knowledgeBases[document.knowledgeId];

          return {
            documents: restDocuments,
            knowledgeBases: {
              ...state.knowledgeBases,
              [document.knowledgeId]: {
                ...knowledge,
                documents: knowledge.documents.filter(
                  (d) => d.id !== documentId
                ),
                stats: {
                  ...knowledge.stats,
                  documentCount: knowledge.stats.documentCount - 1,
                },
              },
            },
          };
        });
      },

      // 重新索引文档
      reindexDocument: async (documentId: string) => {
        const response = await fetch(
          `/api/knowledge/documents/${documentId}/reindex`,
          {
            method: 'POST',
          }
        );

        const updated = await response.json();

        set((state) => ({
          documents: {
            ...state.documents,
            [documentId]: { ...state.documents[documentId], ...updated },
          },
        }));
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
    }),
    {
      name: 'knowledge-store',
      partialize: (state) => ({
        knowledgeBases: state.knowledgeBases,
      }),
    }
  )
);
