import MockAdapter from 'axios-mock-adapter';
import { client } from '../api/client';

// 创建 mock adapter（仅在开发环境且启用 mock 时）
let mock: MockAdapter | null = null;

export function setupMockAdapter() {
  // 检查是否在开发环境且启用 mock
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    console.log('🎭 Mock API enabled');

    // 创建 mock adapter，延迟 500ms 模拟网络请求
    mock = new MockAdapter(client, {
      delayResponse: 500,
      onNoMatch: 'passthrough', // 未匹配的请求继续传递到真实后端
    });

    // 导入所有 mock 处理器
    import('./handlers/user').then(module => module.setupUserMocks(mock!));
    import('./handlers/workspace').then(module => module.setupWorkspaceMocks(mock!));
    import('./handlers/agent').then(module => module.setupAgentMocks(mock!));
    import('./handlers/plugin').then(module => module.setupPluginMocks(mock!));

    return mock;
  }

  return null;
}

// 重置 mock
export function resetMock() {
  if (mock) {
    mock.reset();
  }
}

// 恢复真实请求
export function restoreMock() {
  if (mock) {
    mock.restore();
  }
}
