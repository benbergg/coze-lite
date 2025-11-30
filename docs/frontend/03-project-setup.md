# Coze Lite 项目初始化指南

> 从零开始搭建 Coze Lite 前端项目

## 1. 项目结构规划

### 1.1 目录结构

```
coze-lite/
├── docs/                        # 文档
│   └── frontend/               # 前端文档
├── frontend/                    # 前端项目
│   ├── src/                    # 源代码
│   │   ├── app.tsx            # App 根组件
│   │   ├── main.tsx           # 入口文件
│   │   ├── routes/            # 路由配置
│   │   │   └── index.tsx
│   │   ├── pages/             # 页面组件
│   │   │   ├── auth/         # 登录/注册
│   │   │   ├── workspace/    # 工作空间
│   │   │   ├── agent/        # Agent 编辑器
│   │   │   └── workflow/     # 工作流编辑器
│   │   ├── components/        # 共享组件
│   │   │   ├── layout/       # 布局组件
│   │   │   └── common/       # 通用组件
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── services/         # API 服务
│   │   │   ├── api/         # API 客户端
│   │   │   └── types/       # API 类型
│   │   ├── stores/           # Zustand stores
│   │   │   ├── user.ts      # 用户状态
│   │   │   ├── workspace.ts # 工作空间状态
│   │   │   └── agent.ts     # Agent 状态
│   │   ├── types/            # TypeScript 类型
│   │   ├── utils/            # 工具函数
│   │   ├── styles/           # 全局样式
│   │   │   └── index.css
│   │   └── config/           # 配置文件
│   │       └── constants.ts
│   ├── public/                # 静态资源
│   ├── .env                   # 环境变量
│   ├── .env.example          # 环境变量示例
│   ├── .eslintrc.json        # ESLint 配置
│   ├── .prettierrc           # Prettier 配置
│   ├── .gitignore            # Git 忽略配置
│   ├── index.html            # HTML 模板
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json         # TS 配置
│   ├── tsconfig.node.json    # Node TS 配置
│   ├── vite.config.ts        # Vite 配置
│   ├── tailwind.config.ts    # Tailwind 配置
│   └── postcss.config.js     # PostCSS 配置
└── backend/                     # 后端项目（未来添加）
```

## 2. 初始化步骤

### 2.1 创建项目

```bash
# 确保在 coze-lite 目录中
cd /Users/lg/Projects/lab/coze-lite

# 创建 frontend 目录
mkdir -p frontend
cd frontend

# 使用 Vite 创建项目（如果还没有创建）
pnpm create vite . --template react-ts

# 或者手动创建必要文件和目录
mkdir -p src/{components/{layout,route-guard,breadcrumb,error-boundary,common},pages/{auth,workspace,agent,workflow,error},routes,hooks,services/{api,types,utils},stores,styles,config,types,utils} public
```

### 2.2 安装依赖

```bash
# 核心依赖
pnpm add react react-dom react-router-dom
pnpm add zustand
pnpm add @arco-design/web-react
pnpm add ahooks lodash-es classnames dayjs
pnpm add react-i18next i18next
pnpm add axios

# 开发依赖
pnpm add -D typescript @types/react @types/react-dom @types/node
pnpm add -D @types/lodash-es
pnpm add -D @vitejs/plugin-react
pnpm add -D vite
pnpm add -D tailwindcss autoprefixer postcss
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
pnpm add -D prettier
pnpm add -D vitest @vitest/ui
```

## 3. 配置文件

### 3.1 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

### 3.2 TypeScript 配置

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
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### 3.3 Tailwind CSS 配置

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
  // 不与 Arco Design 冲突
  corePlugins: {
    preflight: false,
  },
} satisfies Config;
```

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 3.4 ESLint 配置

```json
// .eslintrc.json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

### 3.5 Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always"
}
```

### 3.6 环境变量

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8888
VITE_APP_TITLE=Coze Lite

# .env.production
VITE_API_BASE_URL=https://api.coze-lite.com
VITE_APP_TITLE=Coze Lite
```

```bash
# .env.example
VITE_API_BASE_URL=http://localhost:8888
VITE_APP_TITLE=Coze Lite
```

## 4. 核心文件

### 4.1 HTML 模板

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Coze Lite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 4.2 入口文件

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import './styles/index.css';
import '@arco-design/web-react/dist/css/arco.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 4.3 全局样式

```css
/* src/styles/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#root {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
```

### 4.4 App 组件

```typescript
// src/app.tsx
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import { AppRoutes } from './routes';

export function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ConfigProvider>
  );
}
```

### 4.5 路由配置（基础）

```typescript
// src/routes/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from '@arco-design/web-react';

// 懒加载页面
const LoginPage = lazy(() => import('@/pages/auth/login'));
const WorkspacePage = lazy(() => import('@/pages/workspace'));

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Spin size={40} />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        {/* 更多路由后续添加 */}
      </Routes>
    </Suspense>
  );
}
```

### 4.6 配置常量

```typescript
// src/config/constants.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const APP_TITLE = import.meta.env.VITE_APP_TITLE;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  WORKSPACE: '/workspace',
  AGENT: '/agent/:id',
  WORKFLOW: '/workflow/:id',
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'coze_lite_token',
  USER: 'coze_lite_user',
  THEME: 'coze_lite_theme',
} as const;
```

## 5. package.json 脚本

```json
{
  "name": "coze-lite",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

## 6. Git 配置

```gitignore
# .gitignore
# 依赖
node_modules/
pnpm-lock.yaml

# 构建产物
dist/
dist-ssr/
*.local

# 编辑器
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~

# 环境变量
.env.local
.env.*.local

# 日志
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# 系统文件
.DS_Store
Thumbs.db

# 测试
coverage/
```

## 7. 验证安装

创建测试页面验证配置：

```typescript
// src/pages/workspace/index.tsx
import { Button } from '@arco-design/web-react';

export default function WorkspacePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Workspace</h1>
      <Button type="primary">测试按钮</Button>
    </div>
  );
}
```

```typescript
// src/pages/auth/login.tsx
import { Button, Input, Form } from '@arco-design/web-react';

export default function LoginPage() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-96 p-8 border rounded-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">登录</h1>
        <Form>
          <Form.Item label="用户名">
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码">
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" long>
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
```

## 8. 运行项目

```bash
# 开发模式
pnpm dev

# 访问 http://localhost:3000
# 应该能看到登录页面

# 代码检查
pnpm lint

# 格式化代码
pnpm format

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

## 9. VS Code 推荐配置

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "arco-design.arco-design-vscode"
  ]
}
```

## 10. 下一步

项目初始化完成后：

1. ✅ 验证项目能正常运行
2. 📝 继续阅读 `04-routing-layout.md` 完善路由和布局
3. 📝 阅读 `05-state-management.md` 学习状态管理
4. 📝 阅读 `06-api-integration.md` 集成后端 API

## 11. 常见问题

### Q1: pnpm 安装失败？

```bash
# 清理缓存
pnpm store prune

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Q2: Tailwind 样式不生效？

检查 `src/styles/index.css` 是否正确引入：

```typescript
// src/main.tsx
import './styles/index.css'; // ✅ 必须在这里引入
```

### Q3: TypeScript 路径别名不识别？

确保 `tsconfig.json` 和 `vite.config.ts` 都配置了：

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```typescript
// vite.config.ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

**检查清单**：
- ✅ 项目结构创建完成
- ✅ 依赖安装成功
- ✅ 配置文件全部配置
- ✅ 开发服务器能正常启动
- ✅ 能看到登录页面

**下一步**：`04-routing-layout.md` - 完整的路由和布局系统

**文档版本**：v1.0 | 2025-11-30
