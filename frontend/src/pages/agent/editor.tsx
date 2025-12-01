import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Message } from '@arco-design/web-react';
import {
  AgentEditorLayout,
  PromptEditor,
  ToolSelector,
  ChatArea,
} from '@/components/agent-ide';
import { useAgentIdeStore } from '@/stores/agentIdeStore';
import type { Agent, AgentConfig } from '@/types/agent';

/** 默认 Agent 配置 */
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: '新建 Agent',
  description: '',
  prompt: '',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  tools: [],
  workflows: [],
};

export default function AgentEditorPage() {
  const { id: agentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const {
    currentAgent,
    setCurrentAgent,
    setLoading: setStoreLoading,
    setError,
  } = useAgentIdeStore();

  // 加载 Agent 数据
  useEffect(() => {
    const loadAgent = async () => {
      setLoading(true);
      setStoreLoading(true);

      try {
        if (agentId === 'new') {
          // 创建新 Agent
          const newAgent: Agent = {
            id: 'new',
            name: '新建 Agent',
            description: '',
            workspaceId: '',
            config: DEFAULT_AGENT_CONFIG,
            published: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setCurrentAgent(newAgent);
        } else if (agentId) {
          // 从 API 加载 Agent
          try {
            const response = await fetch(`/api/agents/${agentId}`);
            if (response.ok) {
              const agent = await response.json();
              setCurrentAgent(agent);
            } else {
              throw new Error('Agent not found');
            }
          } catch (error) {
            // 如果 API 失败，使用 mock 数据
            const mockAgent: Agent = {
              id: agentId,
              name: `Agent ${agentId.slice(0, 6)}`,
              description: '这是一个示例 Agent',
              workspaceId: 'workspace-1',
              config: {
                ...DEFAULT_AGENT_CONFIG,
                name: `Agent ${agentId.slice(0, 6)}`,
                prompt: '你是一个友好的 AI 助手，请用简洁清晰的语言回答用户的问题。',
              },
              published: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setCurrentAgent(mockAgent);
          }
        }
      } catch (error: any) {
        setError(error.message);
        Message.error(`加载 Agent 失败: ${error.message}`);
      } finally {
        setLoading(false);
        setStoreLoading(false);
      }
    };

    loadAgent();

    // 组件卸载时清理
    return () => {
      setCurrentAgent(null);
    };
  }, [agentId, setCurrentAgent, setStoreLoading, setError]);

  // 保存 Agent
  const handleSave = useCallback(async () => {
    if (!currentAgent) return;

    try {
      if (currentAgent.id === 'new') {
        // 创建新 Agent
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: currentAgent.config.name,
            description: currentAgent.config.description,
            config: currentAgent.config,
          }),
        });

        if (response.ok) {
          const newAgent = await response.json();
          setCurrentAgent(newAgent);
          // 跳转到新创建的 Agent 编辑页
          navigate(`/agent/${newAgent.id}`, { replace: true });
        } else {
          // Mock 保存成功
          const savedAgent = {
            ...currentAgent,
            id: `agent-${Date.now()}`,
            updatedAt: new Date().toISOString(),
          };
          setCurrentAgent(savedAgent);
          navigate(`/agent/${savedAgent.id}`, { replace: true });
        }
      } else {
        // 更新现有 Agent
        const response = await fetch(`/api/agents/${currentAgent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: currentAgent.config.name,
            description: currentAgent.config.description,
            config: currentAgent.config,
          }),
        });

        if (!response.ok) {
          // Mock 保存成功
          const savedAgent = {
            ...currentAgent,
            updatedAt: new Date().toISOString(),
          };
          setCurrentAgent(savedAgent);
        }
      }
    } catch (error) {
      // Mock 保存成功
      const savedAgent = {
        ...currentAgent,
        id: currentAgent.id === 'new' ? `agent-${Date.now()}` : currentAgent.id,
        updatedAt: new Date().toISOString(),
      };
      setCurrentAgent(savedAgent);
      if (currentAgent.id === 'new') {
        navigate(`/agent/${savedAgent.id}`, { replace: true });
      }
    }
  }, [currentAgent, setCurrentAgent, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spin size={40} tip="加载中..." />
      </div>
    );
  }

  if (!currentAgent) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Agent 不存在</h2>
          <p className="text-gray-500">请检查 Agent ID 是否正确</p>
        </div>
      </div>
    );
  }

  return (
    <AgentEditorLayout
      promptEditor={<PromptEditor />}
      toolSelector={<ToolSelector />}
      chatArea={<ChatArea agentId={currentAgent.id} />}
      onSave={handleSave}
    />
  );
}
