# Mock API 使用指南

本目录包含用于开发环境的 Mock API 实现。

## 目录结构

```
mock/
├── adapter.ts          # Mock 适配器配置
├── index.ts           # 统一导出
├── fixtures/          # Mock 数据
│   ├── users.ts
│   ├── workspaces.ts
│   ├── agents.ts
│   └── plugins.ts
└── handlers/          # API 处理器
    ├── user.ts
    ├── workspace.ts
    ├── agent.ts
    └── plugin.ts
```

## 如何使用

### 1. 启用 Mock 数据

在 `.env.development` 文件中设置：

```bash
VITE_USE_MOCK=true
```

### 2. 自动初始化

Mock 适配器会在 `main.tsx` 中自动初始化，无需手动配置。

### 3. 测试登录

使用以下凭证登录：

```
用户名: admin / testuser
密码: password / 123456
```

## Mock 数据说明

### 用户 (Users)
- `user-1`: admin@example.com
- `user-2`: test@example.com

### 工作空间 (Workspaces)
- `workspace-1`: 默认工作空间 🏠
- `workspace-2`: 测试工作空间 🧪
- `workspace-3`: 开发工作空间 💻

### Agent
- `agent-1`: 智能助手（workspace-1）
- `agent-2`: 代码助手（workspace-1）
- `agent-3`: 翻译助手（workspace-2）

### 插件 (Plugins)
- `plugin-1`: 天气查询（已安装）
- `plugin-2`: 图片生成
- `plugin-3`: 数据分析

## 添加新的 Mock API

### 1. 创建 fixtures

在 `fixtures/` 目录下创建新的数据文件：

```typescript
// fixtures/your-data.ts
export const mockYourData = [
  {
    id: '1',
    name: 'Example',
    // ...
  },
];
```

### 2. 创建 handler

在 `handlers/` 目录下创建处理器：

```typescript
// handlers/your-api.ts
import type MockAdapter from 'axios-mock-adapter';
import { mockYourData } from '../fixtures/your-data';

export function setupYourApiMocks(mock: MockAdapter) {
  mock.onGet('/api/your-endpoint').reply(() => {
    return [
      200,
      {
        code: 0,
        message: 'success',
        data: mockYourData,
      },
    ];
  });
}
```

### 3. 注册 handler

在 `adapter.ts` 中导入并注册：

```typescript
import('./handlers/your-api').then(module =>
  module.setupYourApiMocks(mock!)
);
```

## 注意事项

1. Mock 数据仅在开发环境生效
2. 未匹配的请求会自动传递到真实后端（passthrough）
3. 所有请求延迟 500ms，模拟真实网络环境
4. Mock 数据存储在内存中，刷新页面后重置

## 禁用 Mock

如果需要连接真实后端，设置环境变量：

```bash
VITE_USE_MOCK=false
```

或者直接删除/注释 `.env.development` 中的配置。
