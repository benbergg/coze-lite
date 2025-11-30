# UI 组件和工具 - 组件系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-studio/components`, `@coze-arch/ui-*`

## 一、概述

组件系统是前端 UI 的基础，本文档介绍 Coze Lite 的组件架构，包括 Arco Design 组件库的使用、自定义组件开发规范和主题定制方案。

### 1.1 技术选型

| 技术 | 说明 | 理由 |
|------|------|------|
| **Arco Design** | 字节跳动开源 React UI 库 | 完整的企业级组件、TypeScript 支持、主题定制能力强 |
| **Tailwind CSS** | 原子化 CSS 框架 | 快速开发、高度可定制、体积小 |
| **CSS Modules** | CSS 模块化方案 | 避免样式冲突、支持局部作用域 |

### 1.2 组件分类

```
src/components/
├── layout/              # 布局组件
│   ├── root-layout.tsx
│   ├── workspace-layout.tsx
│   ├── header.tsx
│   └── sidebar.tsx
├── route-guard/         # 路由守卫
│   └── auth-guard.tsx
├── plugin/              # 插件相关组件
│   ├── PluginMarketplace/
│   └── PluginConfigPanel/
├── knowledge/           # 知识库组件
│   ├── KnowledgeManager/
│   └── DocumentManager/
└── common/              # 通用组件（待扩展）
    ├── Loading/
    ├── ErrorBoundary/
    └── Empty/
```

## 二、Arco Design 组件库

### 2.1 安装和配置

**安装依赖**:

```bash
pnpm add @arco-design/web-react
```

**引入样式**:

**文件**: `src/main.tsx`

```typescript
import '@arco-design/web-react/dist/css/arco.css';
```

**配置全局化**:

```typescript
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';

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

### 2.2 常用组件

#### 2.2.1 布局组件

**Layout - 页面布局**:

```typescript
import { Layout } from '@arco-design/web-react';

const { Sider, Header, Content } = Layout;

export function WorkspaceLayout() {
  return (
    <Layout className="h-screen">
      <Sider width={240}>
        <Sidebar />
      </Sider>
      <Layout>
        <Header>
          <Header />
        </Header>
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

**Grid - 栅格布局**:

```typescript
import { Grid } from '@arco-design/web-react';
const { Row, Col } = Grid;

<Row gutter={16}>
  <Col span={8}>左侧</Col>
  <Col span={16}>右侧</Col>
</Row>
```

**Space - 间距**:

```typescript
import { Space } from '@arco-design/web-react';

<Space size="large">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</Space>
```

#### 2.2.2 导航组件

**Menu - 菜单**:

```typescript
import { Menu } from '@arco-design/web-react';
import { IconHome, IconRobot } from '@arco-design/web-react/icon';

<Menu
  selectedKeys={selectedKeys}
  onClickMenuItem={(key) => handleMenuClick(key)}
>
  <Menu.Item key="home">
    <IconHome />
    首页
  </Menu.Item>
  <Menu.Item key="agents">
    <IconRobot />
    Agents
  </Menu.Item>
</Menu>
```

**Breadcrumb - 面包屑**:

```typescript
import { Breadcrumb } from '@arco-design/web-react';

<Breadcrumb>
  <Breadcrumb.Item>工作空间</Breadcrumb.Item>
  <Breadcrumb.Item>Agents</Breadcrumb.Item>
  <Breadcrumb.Item>编辑器</Breadcrumb.Item>
</Breadcrumb>
```

**Tabs - 标签页**:

```typescript
import { Tabs } from '@arco-design/web-react';

<Tabs activeTab="1" onChange={handleTabChange}>
  <Tabs.TabPane key="1" title="配置">
    配置内容
  </Tabs.TabPane>
  <Tabs.TabPane key="2" title="调试">
    调试内容
  </Tabs.TabPane>
</Tabs>
```

#### 2.2.3 数据录入组件

**Form - 表单**:

```typescript
import { Form, Input, Button } from '@arco-design/web-react';

<Form onSubmit={handleSubmit}>
  <Form.Item
    label="用户名"
    field="username"
    rules={[{ required: true, message: '请输入用户名' }]}
  >
    <Input placeholder="请输入用户名" />
  </Form.Item>

  <Form.Item>
    <Button type="primary" htmlType="submit">
      提交
    </Button>
  </Form.Item>
</Form>
```

**Input - 输入框**:

```typescript
import { Input } from '@arco-design/web-react';

// 基础输入框
<Input placeholder="请输入" />

// 密码输入框
<Input.Password placeholder="请输入密码" />

// 文本域
<Input.TextArea placeholder="请输入内容" rows={4} />

// 搜索框
<Input.Search placeholder="搜索" onSearch={handleSearch} />
```

**Select - 选择器**:

```typescript
import { Select } from '@arco-design/web-react';

<Select
  placeholder="请选择"
  options={[
    { label: '选项1', value: '1' },
    { label: '选项2', value: '2' },
  ]}
  onChange={handleChange}
/>
```

**Upload - 文件上传**:

```typescript
import { Upload } from '@arco-design/web-react';
import { IconUpload } from '@arco-design/web-react/icon';

<Upload
  action="/api/upload"
  onChange={handleUploadChange}
>
  <Button icon={<IconUpload />}>
    上传文件
  </Button>
</Upload>
```

#### 2.2.4 数据展示组件

**Table - 表格**:

```typescript
import { Table } from '@arco-design/web-react';

const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '状态', dataIndex: 'status' },
  {
    title: '操作',
    render: (_, record) => (
      <Button onClick={() => handleEdit(record)}>编辑</Button>
    ),
  },
];

<Table
  columns={columns}
  data={dataSource}
  pagination={{ pageSize: 10 }}
/>
```

**Card - 卡片**:

```typescript
import { Card } from '@arco-design/web-react';

<Card
  title="卡片标题"
  extra={<Button>更多</Button>}
>
  卡片内容
</Card>
```

**List - 列表**:

```typescript
import { List } from '@arco-design/web-react';

<List
  dataSource={items}
  render={(item, index) => (
    <List.Item key={index}>
      {item.name}
    </List.Item>
  )}
/>
```

**Empty - 空状态**:

```typescript
import { Empty } from '@arco-design/web-react';

<Empty description="暂无数据" />
```

#### 2.2.5 反馈组件

**Message - 消息提示**:

```typescript
import { Message } from '@arco-design/web-react';

// 成功消息
Message.success('操作成功！');

// 错误消息
Message.error('操作失败！');

// 警告消息
Message.warning('请注意！');

// 信息消息
Message.info('温馨提示');
```

**Modal - 对话框**:

```typescript
import { Modal } from '@arco-design/web-react';

const [visible, setVisible] = useState(false);

<Modal
  title="确认删除"
  visible={visible}
  onOk={handleDelete}
  onCancel={() => setVisible(false)}
>
  确定要删除这条记录吗？
</Modal>
```

**Notification - 通知**:

```typescript
import { Notification } from '@arco-design/web-react';

Notification.info({
  title: '系统通知',
  content: '您有新的消息',
});
```

**Spin - 加载中**:

```typescript
import { Spin } from '@arco-design/web-react';

// 基础加载
<Spin />

// 包裹内容
<Spin loading={isLoading}>
  <div>内容区域</div>
</Spin>
```

#### 2.2.6 其他组件

**Dropdown - 下拉菜单**:

```typescript
import { Dropdown, Menu } from '@arco-design/web-react';

const droplist = (
  <Menu>
    <Menu.Item key="1">菜单项1</Menu.Item>
    <Menu.Item key="2">菜单项2</Menu.Item>
  </Menu>
);

<Dropdown droplist={droplist}>
  <Button>下拉菜单</Button>
</Dropdown>
```

**Avatar - 头像**:

```typescript
import { Avatar } from '@arco-design/web-react';

// 文字头像
<Avatar>用户</Avatar>

// 图片头像
<Avatar>
  <img src={avatarUrl} alt="avatar" />
</Avatar>

// 图标头像
<Avatar>
  <IconUser />
</Avatar>
```

**Badge - 徽标**:

```typescript
import { Badge } from '@arco-design/web-react';

<Badge count={5}>
  <Button>消息</Button>
</Badge>
```

### 2.3 图标使用

**安装图标库**:

```typescript
import {
  IconHome,
  IconRobot,
  IconSettings,
  IconUser,
  IconPlus,
  IconDelete,
  IconEdit,
  IconSave,
  IconRefresh,
  IconUpload,
  IconDownload,
  IconSearch,
  IconClose,
} from '@arco-design/web-react/icon';

// 使用
<IconHome />
<IconRobot style={{ fontSize: 20 }} />
```

**常用图标分类**:

| 类别 | 图标 |
|------|------|
| **导航** | IconHome, IconMenu, IconLeft, IconRight, IconUp, IconDown |
| **编辑** | IconEdit, IconDelete, IconPlus, IconMinus, IconCopy, IconPaste |
| **文件** | IconFile, IconFolder, IconUpload, IconDownload, IconSave |
| **媒体** | IconImage, IconVideo, IconMusic, IconCamera |
| **交互** | IconClose, IconCheck, IconRefresh, IconSearch, IconFilter |
| **状态** | IconLoading, IconCheckCircle, IconCloseCircle, IconInfoCircle |

## 三、自定义组件开发

### 3.1 组件开发规范

#### 3.1.1 文件结构

```
ComponentName/
├── index.tsx          # 组件主文件
├── index.css          # 组件样式（可选）
├── types.ts           # 类型定义（可选）
└── README.md          # 组件文档（可选）
```

#### 3.1.2 组件模板

```typescript
import React from 'react';
import './index.css';

export interface ComponentNameProps {
  /** 组件标题 */
  title?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击事件 */
  onClick?: () => void;
  /** 子元素 */
  children?: React.ReactNode;
}

/**
 * ComponentName 组件
 * @description 组件功能描述
 */
export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  disabled = false,
  onClick,
  children,
}) => {
  return (
    <div className="component-name">
      {title && <h3>{title}</h3>}
      <div className="component-name-content">
        {children}
      </div>
      {!disabled && (
        <button onClick={onClick}>
          操作
        </button>
      )}
    </div>
  );
};
```

### 3.2 布局组件

#### 3.2.1 Header 组件

**文件**: `src/components/layout/header.tsx`

```typescript
import { Button, Breadcrumb } from '@arco-design/web-react';
import { IconSave, IconSettings } from '@arco-design/web-react/icon';

interface HeaderProps {
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
}

export function Header({ breadcrumbs = [], actions }: HeaderProps) {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
      {/* 面包屑 */}
      <div className="flex items-center gap-2">
        {breadcrumbs.length > 0 ? (
          <Breadcrumb>
            {breadcrumbs.map((item, index) => (
              <Breadcrumb.Item key={index}>{item.label}</Breadcrumb.Item>
            ))}
          </Breadcrumb>
        ) : (
          <div className="text-sm text-gray-500">Coze Lite</div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {actions || (
          <>
            <Button icon={<IconSave />}>保存</Button>
            <Button icon={<IconSettings />} type="secondary" />
          </>
        )}
      </div>
    </div>
  );
}
```

**使用示例**:

```typescript
<Header
  breadcrumbs={[
    { label: '工作空间' },
    { label: 'Agents' },
    { label: '编辑器' },
  ]}
  actions={
    <>
      <Button type="primary">发布</Button>
      <Button>保存</Button>
    </>
  }
/>
```

#### 3.2.2 Sidebar 组件

**文件**: `src/components/layout/sidebar.tsx`

```typescript
import { Menu, Avatar, Dropdown } from '@arco-design/web-react';
import { IconHome, IconRobot, IconApps } from '@arco-design/web-react/icon';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/user';

interface SidebarProps {
  workspaceId?: string;
}

export function Sidebar({ workspaceId }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((state) => state.user);

  const menuItems = [
    {
      key: 'home',
      icon: <IconHome />,
      label: '首页',
      path: '/workspace',
    },
    {
      key: 'agents',
      icon: <IconRobot />,
      label: 'Agents',
      path: `/workspace/${workspaceId}/agents`,
    },
    {
      key: 'library',
      icon: <IconApps />,
      label: '资源库',
      path: `/workspace/${workspaceId}/library`,
    },
  ];

  const selectedKeys = menuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .map((item) => item.key);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b">
        <h1 className="text-xl font-bold text-blue-600">Coze Lite</h1>
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 overflow-y-auto">
        <Menu
          selectedKeys={selectedKeys}
          onClickMenuItem={(key) => {
            const item = menuItems.find((i) => i.key === key);
            if (item) navigate(item.path);
          }}
        >
          {menuItems.map((item) => (
            <Menu.Item key={item.key}>
              {item.icon}
              {item.label}
            </Menu.Item>
          ))}
        </Menu>
      </div>

      {/* 用户信息 */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Avatar size={32}>
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {user?.username || '未登录'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3.3 通用组件

#### 3.3.1 Loading 组件

```typescript
import { Spin } from '@arco-design/web-react';

interface LoadingProps {
  tip?: string;
  size?: number;
}

export const Loading: React.FC<LoadingProps> = ({
  tip = '加载中...',
  size = 40
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Spin size={size} tip={tip} />
    </div>
  );
};
```

#### 3.3.2 ErrorBoundary 组件

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@arco-design/web-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">出错了</h2>
            <p className="text-gray-500 mb-4">
              {this.state.error?.message || '未知错误'}
            </p>
            <Button type="primary" onClick={this.handleReset}>
              重新加载
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 3.3.3 EmptyState 组件

```typescript
import { Empty, Button } from '@arco-design/web-react';

interface EmptyStateProps {
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  description = '暂无数据',
  action,
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Empty description={description}>
        {action && (
          <Button type="primary" onClick={action.onClick}>
            {action.text}
          </Button>
        )}
      </Empty>
    </div>
  );
};
```

### 3.4 业务组件示例

#### 3.4.1 PluginCard 组件

```typescript
import { Card, Tag, Button } from '@arco-design/web-react';
import { IconStar } from '@arco-design/web-react/icon';
import type { Plugin } from '@/types/plugin';

interface PluginCardProps {
  plugin: Plugin;
  onInstall?: (plugin: Plugin) => void;
}

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onInstall,
}) => {
  return (
    <Card
      hoverable
      className="plugin-card"
      cover={
        <div className="h-32 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <IconStar style={{ fontSize: 48, color: '#165dff' }} />
        </div>
      }
    >
      <Card.Meta
        title={plugin.name}
        description={plugin.description}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <Tag color="blue">{plugin.type}</Tag>
          {plugin.stats && (
            <span className="text-sm text-gray-500">
              {plugin.stats.installs} 次安装
            </span>
          )}
        </div>

        <Button
          type="primary"
          size="small"
          onClick={() => onInstall?.(plugin)}
        >
          安装
        </Button>
      </div>
    </Card>
  );
};
```

## 四、主题定制

### 4.1 Arco Design 主题配置

#### 4.1.1 使用内置主题

```typescript
import { ConfigProvider } from '@arco-design/web-react';

<ConfigProvider
  theme={{
    primaryColor: '#165dff',  // 主色
    successColor: '#00b42a',  // 成功色
    warningColor: '#ff7d00',  // 警告色
    errorColor: '#f53f3f',    // 错误色
  }}
>
  <App />
</ConfigProvider>
```

#### 4.1.2 自定义主题变量

**创建主题文件**: `src/styles/theme.less`

```less
@arcoblue-6: #165dff;  // 主色
@orange-6: #ff7d00;    // 辅助色

// 字体
@font-size-body: 14px;
@line-height-base: 1.5715;

// 圆角
@border-radius-small: 2px;
@border-radius-medium: 4px;
@border-radius-large: 8px;

// 间距
@spacing-1: 4px;
@spacing-2: 8px;
@spacing-3: 12px;
@spacing-4: 16px;
```

### 4.2 Tailwind CSS 配置

**文件**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f3ff',
          100: '#bedaff',
          200: '#94bfff',
          300: '#6aa4ff',
          400: '#4080ff',
          500: '#165dff',  // 主色
          600: '#0e42d2',
          700: '#072ca6',
          800: '#031a79',
          900: '#000d4d',
        },
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
};
```

### 4.3 CSS 变量

**文件**: `src/styles/variables.css`

```css
:root {
  /* 颜色 */
  --color-primary: #165dff;
  --color-success: #00b42a;
  --color-warning: #ff7d00;
  --color-error: #f53f3f;

  /* 文字颜色 */
  --text-primary: #1d2129;
  --text-secondary: #4e5969;
  --text-disabled: #c9cdd4;

  /* 背景色 */
  --bg-1: #ffffff;
  --bg-2: #f7f8fa;
  --bg-3: #f2f3f5;

  /* 边框 */
  --border-color: #e5e6eb;
  --border-radius: 4px;

  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

**使用 CSS 变量**:

```css
.custom-button {
  background-color: var(--color-primary);
  color: var(--bg-1);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-md);
}
```

## 五、最佳实践

### 5.1 组件设计原则

1. **单一职责**: 每个组件只负责一个功能
2. **可复用性**: 通过 props 配置实现组件复用
3. **可组合性**: 小组件组合成大组件
4. **可测试性**: 易于编写单元测试
5. **可访问性**: 支持键盘操作、屏幕阅读器

### 5.2 性能优化

#### 5.2.1 使用 React.memo

```typescript
export const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <div>{/* 渲染逻辑 */}</div>;
});
```

#### 5.2.2 使用 useMemo 和 useCallback

```typescript
const memoizedValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

#### 5.2.3 代码分割

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### 5.3 样式组织

#### 5.3.1 优先级

1. **Tailwind 工具类**: 用于快速开发、常用样式
2. **CSS Modules**: 用于组件私有样式
3. **全局样式**: 用于重置样式、通用工具类

#### 5.3.2 命名规范

```css
/* BEM 命名 */
.component-name { }
.component-name__element { }
.component-name--modifier { }

/* 状态类 */
.is-active { }
.is-disabled { }
.has-error { }
```

### 5.4 TypeScript 类型

```typescript
// 使用泛型
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

// 使用联合类型
type ButtonType = 'primary' | 'secondary' | 'text';

// 使用交叉类型
type ButtonProps = BaseProps & {
  type?: ButtonType;
};

// 使用工具类型
type PartialProps = Partial<ComponentProps>;
type RequiredProps = Required<ComponentProps>;
type ReadonlyProps = Readonly<ComponentProps>;
```

## 六、开发工作流

### 6.1 创建新组件

```bash
# 1. 创建组件目录
mkdir -p src/components/MyComponent

# 2. 创建组件文件
touch src/components/MyComponent/index.tsx
touch src/components/MyComponent/index.css

# 3. 编写组件代码
# 4. 导出组件
# 5. 编写测试（可选）
```

### 6.2 组件导出

**文件**: `src/components/index.ts`

```typescript
// 布局组件
export { RootLayout } from './layout/root-layout';
export { WorkspaceLayout } from './layout/workspace-layout';
export { Header } from './layout/header';
export { Sidebar } from './layout/sidebar';

// 路由守卫
export { AuthGuard } from './route-guard/auth-guard';

// 通用组件
export { Loading } from './common/Loading';
export { ErrorBoundary } from './common/ErrorBoundary';
export { EmptyState } from './common/EmptyState';

// 业务组件
export { PluginCard } from './plugin/PluginCard';
```

### 6.3 组件文档

每个复杂组件应包含 README.md：

```markdown
# ComponentName

## 功能描述

组件的功能和用途说明。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| title | string | - | 标题 |
| disabled | boolean | false | 是否禁用 |

## 使用示例

\`\`\`tsx
<ComponentName title="示例" />
\`\`\`

## 注意事项

- 注意事项 1
- 注意事项 2
```

## 七、常见问题

### 7.1 样式冲突

**问题**: Arco Design 样式与自定义样式冲突

**解决**:
```typescript
// 使用 CSS Modules
import styles from './index.module.css';

<div className={styles.container}>
  <Button className={styles.button}>按钮</Button>
</div>
```

### 7.2 主题不生效

**问题**: ConfigProvider 主题配置不生效

**解决**: 确保 ConfigProvider 包裹在最外层
```typescript
<ConfigProvider theme={customTheme}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
</ConfigProvider>
```

### 7.3 图标不显示

**问题**: Arco 图标组件不显示

**解决**: 检查是否正确导入
```typescript
// ❌ 错误
import { IconHome } from '@arco-design/web-react';

// ✅ 正确
import { IconHome } from '@arco-design/web-react/icon';
```

## 八、参考资源

### 8.1 官方文档

- [Arco Design 官方文档](https://arco.design/react/docs/start)
- [Arco Design 组件库](https://arco.design/react/components/overview)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

### 8.2 源码参考

- **Coze Studio**: `@coze-studio/components`
- **UI 架构**: `@coze-arch/ui-*`
- **基础组件**: `@coze-foundation/ui-*`

### 8.3 设计规范

- [Arco Design 设计语言](https://arco.design/docs/spec/introduce)
- [Material Design](https://material.io/design)

---

**文档维护者**: Coze Lite Team
**最后更新**: 2025-11-30
