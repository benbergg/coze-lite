export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888';
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Coze Lite';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  WORKSPACE: '/workspace',
  WORKSPACE_DETAIL: '/workspace/:workspaceId',
  AGENTS: '/workspace/:workspaceId/agents',
  AGENT_EDITOR: '/agent/:agentId',
  WORKFLOW_EDITOR: '/workflow/:workflowId',
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'coze_lite_token',
  USER: 'coze_lite_user',
  THEME: 'coze_lite_theme',
} as const;
