import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { produce } from 'immer';
import {
  type Agent,
  type AgentConfig,
  type PanelType,
  type Message,
  type Conversation,
  type FunctionCall,
  type PublishRecord,
  type PublishConfig,
  MessageStatus,
  PublishStatus,
} from '@/types/agent';
import { nanoid } from 'nanoid';

// ==================== Agent IDE Store ====================

interface AgentIdeState {
  // Agent 状态
  currentAgent: Agent | null;
  activePanel: PanelType;
  leftPanelWidth: number;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  error: string | null;

  // 操作方法
  setCurrentAgent: (agent: Agent | null) => void;
  setActivePanel: (panel: PanelType) => void;
  setLeftPanelWidth: (width: number) => void;
  updateAgentConfig: (updates: Partial<AgentConfig>) => void;
  markAsChanged: () => void;
  markAsSaved: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialAgentIdeState = {
  currentAgent: null,
  activePanel: 'prompt' as PanelType,
  leftPanelWidth: 480,
  isSaving: false,
  hasUnsavedChanges: false,
  isLoading: false,
  error: null,
};

export const useAgentIdeStore = create<AgentIdeState>()(
  devtools(
    persist(
      (set) => ({
        ...initialAgentIdeState,

        setCurrentAgent: (agent) => {
          set({ currentAgent: agent, hasUnsavedChanges: false });
        },

        setActivePanel: (panel) => {
          set({ activePanel: panel });
        },

        setLeftPanelWidth: (width) => {
          set({ leftPanelWidth: Math.max(320, Math.min(width, 800)) });
        },

        updateAgentConfig: (updates) => {
          set(
            produce<AgentIdeState>((state) => {
              if (state.currentAgent) {
                state.currentAgent.config = {
                  ...state.currentAgent.config,
                  ...updates,
                };
                state.hasUnsavedChanges = true;
              }
            })
          );
        },

        markAsChanged: () => {
          set({ hasUnsavedChanges: true });
        },

        markAsSaved: () => {
          set({ hasUnsavedChanges: false, isSaving: false });
        },

        setLoading: (loading) => {
          set({ isLoading: loading });
        },

        setError: (error) => {
          set({ error });
        },

        reset: () => {
          set(initialAgentIdeState);
        },
      }),
      {
        name: 'coze-lite-agent-ide',
        partialize: (state) => ({
          leftPanelWidth: state.leftPanelWidth,
        }),
      }
    ),
    { name: 'AgentIdeStore' }
  )
);

// ==================== Chat Store ====================

interface ChatState {
  // 会话状态
  conversations: Record<string, Conversation>;
  currentConversationId: string | null;
  streamingMessageId: string | null;

  // 会话操作
  createConversation: (agentId: string) => string;
  deleteConversation: (conversationId: string) => void;
  setCurrentConversation: (conversationId: string | null) => void;
  clearConversation: (conversationId: string) => void;

  // 消息操作
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'conversationId' | 'createdAt' | 'updatedAt'>) => string;
  appendMessageContent: (messageId: string, delta: string) => void;
  markMessageComplete: (messageId: string) => void;
  markMessageError: (messageId: string, error: string) => void;
  deleteMessage: (messageId: string) => void;

  // 工具调用操作
  addFunctionCall: (messageId: string, functionCall: FunctionCall) => void;
  updateFunctionCall: (messageId: string, callId: string, updates: Partial<FunctionCall>) => void;

  // 辅助方法
  getCurrentConversation: () => Conversation | null;
  getCurrentMessages: () => Message[];
  setStreamingMessageId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      (set, get) => ({
        conversations: {},
        currentConversationId: null,
        streamingMessageId: null,

        createConversation: (agentId) => {
          const conversationId = nanoid();
          const now = new Date().toISOString();

          set(
            produce<ChatState>((state) => {
              state.conversations[conversationId] = {
                id: conversationId,
                agentId,
                messages: [],
                createdAt: now,
                updatedAt: now,
              };
              state.currentConversationId = conversationId;
            })
          );

          return conversationId;
        },

        deleteConversation: (conversationId) => {
          set(
            produce<ChatState>((state) => {
              delete state.conversations[conversationId];
              if (state.currentConversationId === conversationId) {
                state.currentConversationId = null;
              }
            })
          );
        },

        setCurrentConversation: (conversationId) => {
          set({ currentConversationId: conversationId });
        },

        clearConversation: (conversationId) => {
          set(
            produce<ChatState>((state) => {
              const conversation = state.conversations[conversationId];
              if (conversation) {
                conversation.messages = [];
                conversation.updatedAt = new Date().toISOString();
              }
            })
          );
        },

        addMessage: (conversationId, messageData) => {
          const messageId = nanoid();
          const now = new Date().toISOString();

          set(
            produce<ChatState>((state) => {
              const conversation = state.conversations[conversationId];
              if (conversation) {
                conversation.messages.push({
                  id: messageId,
                  conversationId,
                  createdAt: now,
                  updatedAt: now,
                  ...messageData,
                });
                conversation.updatedAt = now;
              }
            })
          );

          return messageId;
        },

        appendMessageContent: (messageId, delta) => {
          set(
            produce<ChatState>((state) => {
              for (const conversation of Object.values(state.conversations)) {
                const message = conversation.messages.find((m) => m.id === messageId);
                if (message) {
                  message.content += delta;
                  message.updatedAt = new Date().toISOString();
                  break;
                }
              }
            })
          );
        },

        markMessageComplete: (messageId) => {
          set(
            produce<ChatState>((state) => {
              for (const conversation of Object.values(state.conversations)) {
                const message = conversation.messages.find((m) => m.id === messageId);
                if (message) {
                  message.status = MessageStatus.Complete;
                  message.updatedAt = new Date().toISOString();
                  break;
                }
              }
              if (state.streamingMessageId === messageId) {
                state.streamingMessageId = null;
              }
            })
          );
        },

        markMessageError: (messageId, error) => {
          set(
            produce<ChatState>((state) => {
              for (const conversation of Object.values(state.conversations)) {
                const message = conversation.messages.find((m) => m.id === messageId);
                if (message) {
                  message.status = MessageStatus.Error;
                  message.error = error;
                  message.updatedAt = new Date().toISOString();
                  break;
                }
              }
              if (state.streamingMessageId === messageId) {
                state.streamingMessageId = null;
              }
            })
          );
        },

        deleteMessage: (messageId) => {
          set(
            produce<ChatState>((state) => {
              for (const conversation of Object.values(state.conversations)) {
                const index = conversation.messages.findIndex((m) => m.id === messageId);
                if (index !== -1) {
                  conversation.messages.splice(index, 1);
                  conversation.updatedAt = new Date().toISOString();
                  break;
                }
              }
            })
          );
        },

        addFunctionCall: (messageId, functionCall) => {
          set(
            produce<ChatState>((state) => {
              for (const conversation of Object.values(state.conversations)) {
                const message = conversation.messages.find((m) => m.id === messageId);
                if (message) {
                  if (!message.functionCalls) {
                    message.functionCalls = [];
                  }
                  message.functionCalls.push(functionCall);
                  break;
                }
              }
            })
          );
        },

        updateFunctionCall: (messageId, callId, updates) => {
          set(
            produce<ChatState>((state) => {
              for (const conversation of Object.values(state.conversations)) {
                const message = conversation.messages.find((m) => m.id === messageId);
                if (message?.functionCalls) {
                  const call = message.functionCalls.find((c) => c.id === callId);
                  if (call) {
                    Object.assign(call, updates);
                  }
                  break;
                }
              }
            })
          );
        },

        getCurrentConversation: () => {
          const { currentConversationId, conversations } = get();
          return currentConversationId ? conversations[currentConversationId] ?? null : null;
        },

        getCurrentMessages: () => {
          const conversation = get().getCurrentConversation();
          return conversation?.messages ?? [];
        },

        setStreamingMessageId: (id) => {
          set({ streamingMessageId: id });
        },
      }),
      {
        name: 'coze-lite-chat-store',
        partialize: (state) => ({
          conversations: state.conversations,
        }),
      }
    ),
    { name: 'ChatStore' }
  )
);

// ==================== Publish Store ====================

interface PublishState {
  publishRecords: PublishRecord[];
  publishStatus: PublishStatus;
  currentPublishConfig: PublishConfig | null;

  // 草稿管理
  saveDraft: (config: PublishConfig) => void;
  loadDraft: (agentId: string) => PublishConfig | null;
  clearDraft: (agentId: string) => void;

  // 发布操作
  setPublishStatus: (status: PublishStatus) => void;
  addPublishRecord: (record: PublishRecord) => void;
  getPublishRecords: (agentId: string) => PublishRecord[];
  getLatestPublishRecord: (agentId: string) => PublishRecord | null;
  getNextVersion: (agentId: string) => string;
}

export const usePublishStore = create<PublishState>()(
  devtools(
    persist(
      (set, get) => ({
        publishRecords: [],
        publishStatus: PublishStatus.DRAFT,
        currentPublishConfig: null,

        saveDraft: (config) => {
          const drafts = JSON.parse(localStorage.getItem('publish_drafts') ?? '{}');
          drafts[config.agentId] = config;
          localStorage.setItem('publish_drafts', JSON.stringify(drafts));
        },

        loadDraft: (agentId) => {
          const drafts = JSON.parse(localStorage.getItem('publish_drafts') ?? '{}');
          return drafts[agentId] ?? null;
        },

        clearDraft: (agentId) => {
          const drafts = JSON.parse(localStorage.getItem('publish_drafts') ?? '{}');
          delete drafts[agentId];
          localStorage.setItem('publish_drafts', JSON.stringify(drafts));
        },

        setPublishStatus: (status) => {
          set({ publishStatus: status });
        },

        addPublishRecord: (record) => {
          set(
            produce<PublishState>((state) => {
              state.publishRecords.unshift(record);
              // 只保留最近 50 条记录
              if (state.publishRecords.length > 50) {
                state.publishRecords = state.publishRecords.slice(0, 50);
              }
            })
          );
        },

        getPublishRecords: (agentId) => {
          return get().publishRecords.filter((r) => r.agentId === agentId);
        },

        getLatestPublishRecord: (agentId) => {
          const records = get().getPublishRecords(agentId);
          return records.length > 0 ? records[0] : null;
        },

        getNextVersion: (agentId) => {
          const latestRecord = get().getLatestPublishRecord(agentId);
          if (!latestRecord) {
            return 'v1';
          }

          const match = latestRecord.version.match(/v(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            return `v${num + 1}`;
          }

          return 'v1';
        },
      }),
      {
        name: 'coze-lite-publish-store',
        partialize: (state) => ({
          publishRecords: state.publishRecords,
        }),
      }
    ),
    { name: 'PublishStore' }
  )
);
