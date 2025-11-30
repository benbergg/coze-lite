# Coze Studio 技术栈详解与 Coze Lite 选型建议

> 深入分析 Coze Studio 的技术选型，为 Coze Lite 提供简化建议

## 1. Coze Studio 技术栈全貌

### 1.1 核心框架

| 技术 | 版本 | 用途 | Coze Lite 建议 |
|------|------|------|----------------|
| React | 18.2.0 | UI 框架 | ✅ 保留 18.2+ |
| TypeScript | 5.8.2 | 类型系统 | ✅ 保留 5.x |
| React Router | 6.x | 路由管理 | ✅ 保留 v6 |

### 1.2 构建和包管理

| 技术 | 版本 | 用途 | Coze Lite 建议 |
|------|------|------|----------------|
| Rsbuild | 1.1.0 | 构建工具（基于 Rspack） | 🔄 改用 **Vite** |
| Rush | 5.147.1 | Monorepo 管理 | 🔄 改用 **PNPM Workspace** |
| PNPM | 8.15.8 | 包管理器 | ✅ 保留 PNPM |

**为什么换成 Vite？**
- ✅ 开发体验更好（HMR 更快）
- ✅ 配置更简单
- ✅ 生态更成熟
- ✅ 对学习项目更友好

### 1.3 状态管理

| 技术 | 版本 | 用途 | Coze Lite 建议 |
|------|------|------|----------------|
| Zustand | 4.4.7 | 轻量状态管理 | ✅ 保留 |
| React Context | - | 跨组件通信 | ✅ 保留 |

**为什么选 Zustand？**
- ✅ API 简单（比 Redux 简单很多）
- ✅ 性能好（基于 selector）
- ✅ TypeScript 支持好
- ✅ 无需 Provider 包裹

### 1.4 UI 框架

| 技术 | 版本 | 用途 | Coze Lite 建议 |
|------|------|------|----------------|
| @coze-design | 0.0.6 | 自定义 UI 库（基于 Semi Design） | 🔄 改用 **Arco Design** |
| TailwindCSS | 3.3.3 | CSS 工具库 | ✅ 保留 |
| CSS Modules | - | CSS 作用域 | ✅ 保留 |

**为什么用 Arco Design？**
- ✅ 字节开源，与 Coze 风格接近
- ✅ 组件丰富，文档完善
- ✅ TypeScript 支持好
- ✅ 主题定制能力强

### 1.5 工具库

| 技术 | 版本 | 用途 | Coze Lite 建议 |
|------|------|------|----------------|
| ahooks | 3.7.8 | React Hooks 集合 | ✅ 保留 |
| lodash-es | 4.17.21 | 工具函数 | ✅ 保留 |
| classnames | 2.3.2 | className 处理 | ✅ 保留 |

### 1.6 特殊功能

| 技术 | 用途 | Coze Lite 建议 |
|------|------|----------------|
| FlowGram | 工作流编辑器（字节开源） | ✅ 保留或简化 |
| Fabric.js | Canvas 渲染 | ✅ 保留（Workflow 需要） |
| @coze-arch/i18n | 国际化 | 🔄 改用 **react-i18next** |

## 2. Coze Lite 推荐技术栈

### 2.1 完整技术栈

```yaml
核心框架:
  - React: ^18.2.0
  - TypeScript: ^5.3.0
  - React Router: ^6.20.0

构建工具:
  - Vite: ^5.0.0
  - PNPM: ^8.15.0

状态管理:
  - Zustand: ^4.4.7

UI 框架:
  - Arco Design: ^2.60.0
  - TailwindCSS: ^3.4.0

工具库:
  - ahooks: ^3.7.8
  - lodash-es: ^4.17.21
  - classnames: ^2.3.2
  - dayjs: ^1.11.10

工作流:
  - Fabric.js: ^5.3.0
  - react-flow (可选): ^11.10.0

国际化:
  - react-i18next: ^14.0.0
  - i18next: ^23.7.0

开发工具:
  - ESLint: ^8.56.0
  - Prettier: ^3.1.0
  - Vitest: ^1.0.0
```

### 2.2 package.json 示例

```json
{
  "name": "coze-lite",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "@arco-design/web-react": "^2.60.0",
    "ahooks": "^3.7.8",
    "lodash-es": "^4.17.21",
    "classnames": "^2.3.2",
    "dayjs": "^1.11.10",
    "react-i18next": "^14.0.0",
    "i18next": "^23.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/lodash-es": "^4.17.12",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "eslint": "^8.56.0",
    "prettier": "^3.1.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "vitest": "^1.0.0"
  }
}
```

## 3. 技术栈详细对比

### 3.1 构建工具：Rsbuild vs Vite

#### Coze Studio (Rsbuild)

```typescript
// rsbuild.config.ts
export default {
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
  },
  plugins: [
    // 各种插件...
  ],
};
```

**特点**：
- ✅ 基于 Rspack（性能好）
- ✅ 配置简单
- ❌ 相对较新，生态小

#### Coze Lite (Vite)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});
```

**优势**：
- ✅ 开发体验极佳（HMR 秒级）
- ✅ 生态成熟，插件丰富
- ✅ 配置简单直观
- ✅ 社区活跃

### 3.2 UI 库：@coze-design vs Arco Design

#### Coze Studio (@coze-design)

```tsx
import { Button, Input } from '@coze-arch/coze-design';

<Button type="primary">保存</Button>
```

**特点**：
- ✅ 深度定制
- ❌ 不开源，无法直接使用

#### Coze Lite (Arco Design)

```tsx
import { Button, Input } from '@arco-design/web-react';

<Button type="primary">保存</Button>
```

**优势**：
- ✅ 字节开源，风格接近
- ✅ 组件丰富（60+ 组件）
- ✅ TypeScript 原生支持
- ✅ 主题定制灵活

### 3.3 状态管理：Zustand 使用示例

#### 基础用法

```typescript
// stores/user.ts
import { create } from 'zustand';

interface UserStore {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  token: null,

  login: async (username, password) => {
    const res = await api.login({ username, password });
    set({ user: res.user, token: res.token });
    localStorage.setItem('token', res.token);
  },

  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem('token');
  },
}));

// 组件中使用
function UserProfile() {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  return <div onClick={logout}>{user?.name}</div>;
}
```

#### 持久化

```typescript
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist<UserStore>(
    (set) => ({
      user: null,
      token: null,
      // ...
    }),
    {
      name: 'user-storage', // localStorage key
    }
  )
);
```

### 3.4 国际化：自定义 vs react-i18next

#### Coze Studio (自定义 i18n)

```typescript
import { useTranslation } from '@coze-arch/i18n';

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t('common.save')}</div>;
}
```

#### Coze Lite (react-i18next)

```typescript
// i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        'common.save': 'Save',
      },
    },
    'zh-CN': {
      translation: {
        'common.save': '保存',
      },
    },
  },
  lng: 'zh-CN',
  fallbackLng: 'en',
});

// 使用
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t('common.save')}</div>;
}
```

## 4. Workflow 技术方案

### 4.1 Coze Studio 方案（FlowGram）

```typescript
// 基于 FlowGram + Fabric.js
import { FlowGram } from '@bytedance/flowgram';

const editor = new FlowGram({
  container: '#canvas',
  // 配置...
});
```

**特点**：
- ✅ 字节内部方案，功能强大
- ❌ 学习曲线陡

### 4.2 Coze Lite 备选方案

#### 方案 1：React Flow（推荐）

```typescript
import ReactFlow, { Controls, Background } from 'reactflow';
import 'reactflow/dist/style.css';

function WorkflowEditor() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  return (
    <ReactFlow nodes={nodes} edges={edges}>
      <Controls />
      <Background />
    </ReactFlow>
  );
}
```

**优势**：
- ✅ React 生态，易上手
- ✅ 文档完善，示例丰富
- ✅ 性能好，支持大规模节点

#### 方案 2：保留 FlowGram（深度学习）

如果想深入学习 Coze 的 Workflow 实现，可以保留 FlowGram。

## 5. 开发工具链

### 5.1 代码规范

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off"
  }
}

// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### 5.2 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 6. 技术选型决策树

```
选择技术栈时的考虑因素：

学习目的？
├─ 是：学习 Coze 完整技术 → 尽量保留原技术栈
└─ 否：快速实现功能 → 使用成熟简单的方案

有 Monorepo 需求？
├─ 是（50+ 包）→ Rush
├─ 中（5-10 包）→ PNPM Workspace
└─ 否（单体）→ 单 package.json

UI 定制程度？
├─ 高度定制 → 自建组件库
├─ 中等定制 → Arco Design + 主题
└─ 使用默认 → 任何 UI 库

团队规模？
├─ 大团队 → 复杂架构，严格规范
└─ 小团队/个人 → 简单架构，快速迭代
```

## 7. 总结对比

| 方面 | Coze Studio | Coze Lite（推荐） |
|------|-------------|-------------------|
| 构建工具 | Rsbuild | Vite |
| 包管理 | Rush + PNPM | PNPM (Workspace) |
| UI 库 | @coze-design | Arco Design |
| 国际化 | 自定义 | react-i18next |
| 状态管理 | Zustand ✅ | Zustand ✅ |
| 路由 | React Router v6 ✅ | React Router v6 ✅ |
| 工作流 | FlowGram | React Flow |
| 复杂度 | 高（企业级） | 中（学习级） |

## 8. 下一步

- ✅ 已了解技术栈选型
- 📝 下一步：阅读 `03-project-setup.md` 开始项目初始化

---

**推荐学习路径**：
1. 先用简化技术栈快速搭建 MVP
2. 核心功能完成后，再逐步对照 Coze Studio 优化
3. 深入学习特定模块（如 Workflow）时参考原始技术

**文档版本**：v1.0 | 2025-11-30
