export interface Agent {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  config: AgentConfig;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools: Tool[];
  workflows: string[];
}

export interface Tool {
  id: string;
  type: 'function' | 'plugin';
  name: string;
  description: string;
  parameters?: any;
}
