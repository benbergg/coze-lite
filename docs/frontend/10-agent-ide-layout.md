# Agent IDE 布局系统（Agent IDE Layout System）

> 基于 Coze Studio 源码分析和 Coze Lite 设计的 Agent IDE 布局系统技术文档

## 目录

1. [概述](#概述)
2. [Coze Studio 布局架构分析](#coze-studio-布局架构分析)
3. [核心概念](#核心概念)
4. [布局组件详解](#布局组件详解)
5. [插槽系统](#插槽系统)
6. [响应式设计](#响应式设计)
7. [Coze Lite 实现方案](#coze-lite-实现方案)
8. [完整代码示例](#完整代码示例)
9. [样式设计](#样式设计)
10. [最佳实践](#最佳实践)

---

## 概述

Agent IDE 的布局系统是整个编辑器的骨架，定义了各个功能区域的位置和交互方式。一个良好的布局系统应该：

- **清晰的功能分区**：配置区、预览区、调试区分离明确
- **灵活的插槽系统**：支持自定义各个区域的内容
- **响应式设计**：适配不同屏幕尺寸
- **性能优化**：避免不必要的重渲染

### 布局结构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                          Header                                  │
│  ┌────────┐  ┌──────────────┐  ┌────────┐  ┌────────┐         │
│  │  Back  │  │  Bot Info    │  │  Mode  │  │ Deploy │         │
│  └────────┘  └──────────────┘  └────────┘  └────────┘         │
└─────────────────────────────────────────────────────────────────┘
┌───────────────────────────────┬─────────────────────────────────┐
│                               │                                 │
│   Config Panel (Left)         │   Preview Area (Right)          │
│   ┌─────────────────────────┐ │  ┌──────────────────────────┐  │
│   │  Tabs                   │ │  │  Chat Interface          │  │
│   │  - Basic Info           │ │  │  - Message List          │  │
│   │  - Prompt               │ │  │  - Input Box             │  │
│   │  - Model                │ │  └──────────────────────────┘  │
│   │  - Tools                │ │                                 │
│   │  - Knowledge            │ │  ┌──────────────────────────┐  │
│   └─────────────────────────┘ │  │  Debug Panel (Optional)  │  │
│                               │  │  - Execution Trace       │  │
│                               │  │  - Performance Metrics   │  │
│                               │  └──────────────────────────┘  │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## Coze Studio 布局架构分析

### 核心文件结构

```
packages/agent-ide/layout/
├── src/
│   ├── layout.tsx                    # ⭐ 主布局组件
│   ├── index.tsx                     # 导出入口
│   ├── index.module.less             # 布局样式
│   └── components/
│       └── header/
│           ├── index.tsx             # ⭐ Header 组件
│           ├── index.module.less     # Header 样式
│           ├── bot-info-card/        # Bot 信息卡片
│           ├── bot-status/           # Bot 状态
│           ├── deploy-button/        # 部署按钮
│           └── more-menu-button/     # 更多菜单
└── package.json
```

### BotEditorLayout 组件分析

**文件**：`layout/src/layout.tsx`

```typescript
export interface CustomProviderProps {
  botId: string;
}

export interface BotEditorLayoutProps {
  hasHeader?: boolean;
}

export interface BotEditorLayoutSlot {
  header?: ReactNode;           // 头部插槽
  headerBottom?: ReactNode;     // 头部底部插槽
  headerTop?: ReactNode;        // 头部顶部插槽
  customProvider?: ComponentType<PropsWithChildren<CustomProviderProps>>;
}

const BotEditorInitLayoutImpl: FC<
  PropsWithChildren<
    Omit<BotEditorLayoutProps, 'loading'> &
      BotEditorLayoutSlot &
      CustomProviderProps
  >
> = ({
  children,
  botId,
  hasHeader = true,
  headerBottom,
  headerTop,
  header,
  customProvider,
}) => {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const init = usePageRuntimeStore(state => state.init);
  const modeSwitching = useBotPageStore(state => state.bot.modeSwitching);
  const CustomProvider = customProvider || DefaultFragment;

  return (
    <div className={s.wrapper}>
      {isFirstLoad && !init ? (
        <Spin spinning wrapperClassName="h-full w-full" />
      ) : (
        <CustomProvider botId={botId}>
          <BotDebugChatAreaProviderAdapter
            botId={botId}
            userId={userInfo?.user_id_str}
          >
            <Spin spinning={modeSwitching}>
              {headerTop}
              {hasHeader ? header : null}
              {headerBottom}
              {children}
            </Spin>
          </BotDebugChatAreaProviderAdapter>
        </CustomProvider>
      )}
    </div>
  );
};
```

**关键设计点**：

1. **插槽系统**：提供 `header`、`headerTop`、`headerBottom` 三个插槽
2. **Provider 注入**：支持自定义 Provider（如聊天区域提供者）
3. **加载状态**：区分首次加载和模式切换加载
4. **路由参数**：从 URL 中获取 `bot_id`

### BotHeader 组件分析

**文件**：`layout/src/components/header/index.tsx`

```typescript
export interface BotHeaderProps {
  pageName?: string;
  isEditLocked?: boolean;
  addonAfter?: ReactNode;          // 右侧扩展区域
  modeOptionList: ModeSelectProps['optionList'];
  deployButton: ReactNode;         // 部署按钮
}

export const BotHeader: React.FC<BotHeaderProps> = props => {
  const navigate = useNavigate();
  const spaceID = useSpaceStore(state => state.space.id);
  const isReadonly = useBotDetailIsReadonly();
  const botInfo = useBotInfoStore();

  const goBackToBotList = () => {
    navigate(`/space/${spaceID}/develop`);
  };

  return (
    <>
      <div className={cx(s.header, 'coz-bg-primary')}>
        <Helmet>
          <title>{renderHtmlTitle(...)}</title>
        </Helmet>

        {/** 1. Left bot information area */}
        <div className="flex items-center">
          <BackButton onClickBack={goBackToBotList} />
          <BotInfoCard
            isReadonly={isReadonly}
            editBotInfoFn={editBotInfoFn}
            deployButton={props.deployButton}
          />
          {diffTask ? null : <ModeSelect optionList={props.modeOptionList} />}
        </div>

        {/* 2. Middle bot menu area - offline */}

        {/* 3. Right bot state area */}
        {props.addonAfter}
        {updateBotModal}
      </div>
    </>
  );
};
```

**Header 三区域结构**：

1. **左侧区域**：返回按钮 + Bot 信息卡片 + 模式选择器
2. **中间区域**：菜单区域（已下线）
3. **右侧区域**：状态信息和扩展区域

### 样式设计分析

**文件**：`layout/src/index.module.less`

```less
.wrapper {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  @apply bg-background-1;
}

.container {
  display: flex;
  flex: 1;
  flex-direction: row;
  width: 100%;
  // 动态撑满父容器且可以滚动
  min-height: 0;

  &.store {
    height: 100%;
  }
}

.develop-area {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  @apply coz-bg-plus;
}

.setting-area {
  overflow: hidden;
  display: flex;
  flex: 1 1;
  flex-direction: column;
  border-left: 1px solid rgb(28 29 35 / 12%);
}
```

**关键样式技术**：

1. **Flexbox 布局**：使用 `flex-direction: column` 垂直布局
2. **高度控制**：`height: 100%` + `min-height: 0` 确保正确滚动
3. **溢出处理**：`overflow: hidden` 配合子元素滚动
4. **Tailwind CSS**：使用 `@apply` 集成 Tailwind 工具类

---

## 核心概念

### 1. 插槽系统（Slot System）

**定义**：插槽是布局组件暴露的可自定义区域，允许外部传入自定义内容。

**优势**：
- 提高组件复用性
- 保持布局稳定性
- 支持渐进式增强

**示例**：

```typescript
interface LayoutSlots {
  header?: ReactNode;
  sidebar?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
}

function Layout({ header, sidebar, content, footer }: LayoutSlots) {
  return (
    <div className="layout">
      <header>{header || <DefaultHeader />}</header>
      <div className="layout-body">
        <aside>{sidebar}</aside>
        <main>{content}</main>
      </div>
      <footer>{footer}</footer>
    </div>
  );
}
```

### 2. 左右分栏布局（Split Layout）

**定义**：将编辑器分为左右两个主要区域，左侧为配置面板，右侧为预览/调试区域。

**特点**：
- 左侧宽度固定或可调节
- 右侧自适应剩余空间
- 支持拖拽调整分栏比例

**实现方式**：

```typescript
<div className="split-layout">
  <div className="split-left" style={{ width: leftWidth }}>
    {/* 配置面板 */}
  </div>
  <div className="split-divider" onMouseDown={handleResizeStart}>
    {/* 分隔条 */}
  </div>
  <div className="split-right">
    {/* 预览区域 */}
  </div>
</div>
```

### 3. 响应式设计

**定义**：根据屏幕尺寸自动调整布局。

**断点定义**：

```typescript
const BREAKPOINTS = {
  mobile: 640,    // < 640px
  tablet: 1024,   // 640px - 1024px
  desktop: 1440,  // 1024px - 1440px
  wide: 1920,     // >= 1440px
};
```

**响应策略**：

- **Mobile**：单列布局，配置和预览分开显示
- **Tablet**：左右分栏，左侧宽度固定
- **Desktop**：左右分栏，支持拖拽调整
- **Wide**：最大宽度限制，避免过宽

### 4. 层级系统（Z-Index）

**定义**：定义各个 UI 元素的显示优先级。

```typescript
const Z_INDEX = {
  base: 0,
  content: 1,
  sidebar: 10,
  header: 50,
  modal: 100,
  toast: 200,
  debugPanel: 150,
};
```

---

## 布局组件详解

### 1. AgentEditorLayout - 主布局组件

**职责**：提供 Agent IDE 的整体布局框架

```typescript
interface AgentEditorLayoutProps {
  agentId: string;
  showHeader?: boolean;
  showDebugPanel?: boolean;

  // 插槽
  headerSlot?: ReactNode;
  configSlot?: ReactNode;
  previewSlot?: ReactNode;

  // 事件
  onHeaderAction?: (action: string) => void;
  onDebugToggle?: (visible: boolean) => void;
}

export function AgentEditorLayout({
  agentId,
  showHeader = true,
  showDebugPanel = false,
  headerSlot,
  configSlot,
  previewSlot,
  onDebugToggle,
}: AgentEditorLayoutProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="agent-editor-layout">
      {/* Header */}
      {showHeader && (
        <div className="agent-editor-header">
          {headerSlot || <AgentHeader agentId={agentId} />}
        </div>
      )}

      {/* Body */}
      <div className="agent-editor-body">
        {isLoading ? (
          <Spin size={40} />
        ) : (
          <>
            {/* Left Config Panel */}
            <div className="agent-editor-config">
              {configSlot || <AgentConfigPanel agentId={agentId} />}
            </div>

            {/* Right Preview Area */}
            <div className="agent-editor-preview">
              {previewSlot || <AgentPreviewArea agentId={agentId} />}
            </div>

            {/* Debug Panel (Overlay) */}
            {showDebugPanel && (
              <div className="agent-editor-debug">
                <AgentDebugPanel
                  agentId={agentId}
                  onClose={() => onDebugToggle?.(false)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

### 2. AgentHeader - 头部组件

**职责**：显示 Agent 信息、模式切换、发布按钮等

```typescript
interface AgentHeaderProps {
  agentId: string;
  onBack?: () => void;
  onPublish?: () => void;
}

export function AgentHeader({
  agentId,
  onBack,
  onPublish,
}: AgentHeaderProps) {
  const { agent } = useAgentStore();
  const { currentWorkspace } = useWorkspaceStore();

  return (
    <div className="agent-header">
      {/* Left Area */}
      <div className="agent-header-left">
        <Button icon={<IconLeft />} onClick={onBack}>
          返回
        </Button>

        <div className="agent-info">
          <Avatar size={32}>
            {agent?.icon || agent?.name?.charAt(0)}
          </Avatar>
          <div className="agent-info-text">
            <div className="agent-name">{agent?.name || '未命名 Agent'}</div>
            <div className="agent-workspace">{currentWorkspace?.name}</div>
          </div>
        </div>
      </div>

      {/* Center Area (Optional) */}
      <div className="agent-header-center">
        {/* 可扩展菜单或状态信息 */}
      </div>

      {/* Right Area */}
      <div className="agent-header-right">
        <Button onClick={onPublish}>
          <IconUpload />
          发布
        </Button>

        <Dropdown
          trigger={<Button icon={<IconMore />} />}
          droplist={
            <Menu>
              <Menu.Item>设置</Menu.Item>
              <Menu.Item>导出</Menu.Item>
              <Menu.Item>删除</Menu.Item>
            </Menu>
          }
        />
      </div>
    </div>
  );
}
```

### 3. SplitPanel - 分栏面板

**职责**：实现可拖拽调整的左右分栏布局

```typescript
interface SplitPanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

export function SplitPanel({
  left,
  right,
  defaultLeftWidth = 400,
  minLeftWidth = 300,
  maxLeftWidth = 600,
}: SplitPanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newWidth = e.clientX;
      if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
        setLeftWidth(newWidth);
      }
    },
    [isDragging, minLeftWidth, maxLeftWidth]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  return (
    <div className="split-panel">
      <div className="split-panel-left" style={{ width: leftWidth }}>
        {left}
      </div>

      <div
        className={`split-panel-divider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="split-panel-handle" />
      </div>

      <div className="split-panel-right">
        {right}
      </div>
    </div>
  );
}
```

### 4. ResponsiveLayout - 响应式容器

**职责**：根据屏幕尺寸自动调整布局

```typescript
interface ResponsiveLayoutProps {
  children: ReactNode;
  breakpoint?: number;
}

export function ResponsiveLayout({
  children,
  breakpoint = 1024,
}: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkSize();
    window.addEventListener('resize', checkSize);

    return () => window.removeEventListener('resize', checkSize);
  }, [breakpoint]);

  return (
    <div className={`responsive-layout ${isMobile ? 'mobile' : 'desktop'}`}>
      {children}
    </div>
  );
}
```

---

## 插槽系统

### 插槽类型定义

```typescript
interface AgentEditorSlots {
  // Header 插槽
  headerLeft?: ReactNode;        // 头部左侧区域
  headerCenter?: ReactNode;      // 头部中间区域
  headerRight?: ReactNode;       // 头部右侧区域

  // Config 插槽
  configTabs?: ConfigTab[];      // 配置面板标签页
  configFooter?: ReactNode;      // 配置面板底部

  // Preview 插槽
  previewHeader?: ReactNode;     // 预览区域头部
  previewContent?: ReactNode;    // 预览区域内容
  previewFooter?: ReactNode;     // 预览区域底部

  // Debug 插槽
  debugTabs?: DebugTab[];        // 调试面板标签页
}

interface ConfigTab {
  key: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface DebugTab {
  key: string;
  label: string;
  content: ReactNode;
}
```

### 插槽使用示例

```typescript
function AgentEditorPage() {
  return (
    <AgentEditorLayout
      agentId="agent_123"
      slots={{
        headerLeft: <CustomBackButton />,
        headerRight: <CustomActions />,

        configTabs: [
          { key: 'basic', label: '基础信息', content: <BasicConfig /> },
          { key: 'prompt', label: 'Prompt', content: <PromptEditor /> },
          { key: 'tools', label: '工具', content: <ToolSelector /> },
        ],

        previewContent: <CustomChatArea />,
      }}
    />
  );
}
```

---

## 响应式设计

### 响应式布局策略

```typescript
// 1. 使用 CSS Media Queries
.agent-editor-body {
  display: flex;
  flex-direction: row;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
}

// 2. 使用 JavaScript 动态判断
function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('mobile');
      else if (width < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

// 3. 使用 ahooks 的 useResponsive
import { useResponsive } from 'ahooks';

function MyComponent() {
  const responsive = useResponsive();

  return (
    <div>
      {responsive.md ? <DesktopLayout /> : <MobileLayout />}
    </div>
  );
}
```

### 响应式配置面板

```typescript
function ResponsiveConfigPanel({ children }: { children: ReactNode }) {
  const breakpoint = useResponsive();
  const [isExpanded, setIsExpanded] = useState(false);

  if (breakpoint === 'mobile') {
    return (
      <Drawer
        visible={isExpanded}
        onCancel={() => setIsExpanded(false)}
        placement="bottom"
        height="80vh"
      >
        {children}
      </Drawer>
    );
  }

  return (
    <div className="config-panel">
      {children}
    </div>
  );
}
```

---

## Coze Lite 实现方案

### 简化策略

Coze Lite 将大幅简化布局系统：

❌ **移除**：
- 复杂的插槽系统（只保留基础插槽）
- 多 Provider 嵌套
- 模式切换逻辑
- 复杂的响应式适配

✅ **保留**：
- 基础的 Header + Body 结构
- 左右分栏布局
- 基础的插槽支持
- 简单的响应式（仅 Desktop/Mobile 两种）

### 目录结构

```
frontend/src/
├── pages/
│   └── agent/
│       ├── editor.tsx              # Agent 编辑器页面
│       └── components/
│           ├── layout/
│           │   ├── editor-layout.tsx    # 编辑器布局
│           │   ├── editor-header.tsx    # 编辑器头部
│           │   └── split-panel.tsx      # 分栏面板
│           ├── config-panel/
│           │   └── index.tsx            # 配置面板
│           └── preview-area/
│               └── index.tsx            # 预览区域
└── styles/
    └── agent-editor.css            # 编辑器样式
```

### 实现优先级

**Phase 1：基础布局**（2-3 天）
- ✅ EditorLayout 组件
- ✅ EditorHeader 组件
- ✅ 左右分栏布局（固定宽度）

**Phase 2：插槽系统**（1-2 天）
- ✅ Header 插槽
- ✅ Config 插槽
- ✅ Preview 插槽

**Phase 3：可调节分栏**（1-2 天）
- ✅ 拖拽调整分栏宽度
- ✅ 宽度持久化

**Phase 4：响应式**（1 天）
- ✅ Mobile/Desktop 适配

---

## 完整代码示例

### 1. AgentEditorLayout 完整实现

**文件**：`frontend/src/pages/agent/components/layout/editor-layout.tsx`

```typescript
import { useState, ReactNode } from 'react';
import { Layout, Spin } from '@arco-design/web-react';
import { EditorHeader } from './editor-header';
import { SplitPanel } from './split-panel';
import './editor-layout.css';

const { Header, Content } = Layout;

interface EditorLayoutProps {
  agentId: string;
  isLoading?: boolean;

  // 插槽
  headerSlot?: ReactNode;
  configSlot?: ReactNode;
  previewSlot?: ReactNode;

  // 配置
  showHeader?: boolean;
  defaultLeftWidth?: number;
}

export function AgentEditorLayout({
  agentId,
  isLoading = false,
  headerSlot,
  configSlot,
  previewSlot,
  showHeader = true,
  defaultLeftWidth = 400,
}: EditorLayoutProps) {
  return (
    <Layout className="agent-editor-layout">
      {/* Header */}
      {showHeader && (
        <Header className="agent-editor-layout-header">
          {headerSlot || <EditorHeader agentId={agentId} />}
        </Header>
      )}

      {/* Body */}
      <Content className="agent-editor-layout-body">
        {isLoading ? (
          <div className="agent-editor-loading">
            <Spin size={40} />
          </div>
        ) : (
          <SplitPanel
            left={configSlot}
            right={previewSlot}
            defaultLeftWidth={defaultLeftWidth}
          />
        )}
      </Content>
    </Layout>
  );
}
```

### 2. EditorHeader 完整实现

**文件**：`frontend/src/pages/agent/components/layout/editor-header.tsx`

```typescript
import { Button, Avatar, Dropdown, Menu, Message } from '@arco-design/web-react';
import {
  IconLeft,
  IconUpload,
  IconMore,
  IconSettings,
  IconExport,
  IconDelete,
} from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom';
import { useAgentStore } from '@/stores/agent';
import { useWorkspaceStore } from '@/stores/workspace';
import './editor-header.css';

interface EditorHeaderProps {
  agentId: string;
}

export function EditorHeader({ agentId }: EditorHeaderProps) {
  const navigate = useNavigate();
  const { currentAgent, publishAgent } = useAgentStore();
  const { currentWorkspaceId } = useWorkspaceStore();

  const handleBack = () => {
    navigate(`/workspace/${currentWorkspaceId}/agents`);
  };

  const handlePublish = async () => {
    try {
      await publishAgent(agentId);
      Message.success('发布成功！');
    } catch (error) {
      Message.error('发布失败');
    }
  };

  const handleMenuClick = (key: string) => {
    switch (key) {
      case 'settings':
        Message.info('打开设置');
        break;
      case 'export':
        Message.info('导出 Agent');
        break;
      case 'delete':
        Message.info('删除 Agent');
        break;
    }
  };

  return (
    <div className="editor-header">
      {/* Left */}
      <div className="editor-header-left">
        <Button
          type="text"
          icon={<IconLeft />}
          onClick={handleBack}
        >
          返回
        </Button>

        <div className="editor-header-agent-info">
          <Avatar size={32}>
            {currentAgent?.name?.charAt(0) || 'A'}
          </Avatar>
          <div className="editor-header-agent-text">
            <div className="editor-header-agent-name">
              {currentAgent?.name || '未命名 Agent'}
            </div>
            <div className="editor-header-workspace">
              工作空间
            </div>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="editor-header-right">
        <Button
          type="primary"
          icon={<IconUpload />}
          onClick={handlePublish}
        >
          发布
        </Button>

        <Dropdown
          trigger={
            <Button type="text" icon={<IconMore />} />
          }
          droplist={
            <Menu onClickMenuItem={handleMenuClick}>
              <Menu.Item key="settings">
                <IconSettings />
                设置
              </Menu.Item>
              <Menu.Item key="export">
                <IconExport />
                导出
              </Menu.Item>
              <Menu.Item key="delete">
                <IconDelete />
                删除
              </Menu.Item>
            </Menu>
          }
        />
      </div>
    </div>
  );
}
```

### 3. SplitPanel 完整实现

**文件**：`frontend/src/pages/agent/components/layout/split-panel.tsx`

```typescript
import { useState, useCallback, useEffect, ReactNode } from 'react';
import './split-panel.css';

interface SplitPanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

export function SplitPanel({
  left,
  right,
  defaultLeftWidth = 400,
  minLeftWidth = 300,
  maxLeftWidth = 600,
}: SplitPanelProps) {
  // 从 localStorage 读取上次的宽度
  const savedWidth = localStorage.getItem('agent-editor-left-width');
  const initialWidth = savedWidth ? parseInt(savedWidth, 10) : defaultLeftWidth;

  const [leftWidth, setLeftWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newWidth = e.clientX;
      if (newWidth >= minLeftWidth && newWidth <= maxLeftWidth) {
        setLeftWidth(newWidth);
      }
    },
    [isDragging, minLeftWidth, maxLeftWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // 保存宽度
    localStorage.setItem('agent-editor-left-width', leftWidth.toString());
  }, [leftWidth]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="split-panel">
      <div
        className="split-panel-left"
        style={{ width: leftWidth }}
      >
        {left}
      </div>

      <div
        className={`split-panel-divider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="split-panel-handle" />
      </div>

      <div className="split-panel-right">
        {right}
      </div>
    </div>
  );
}
```

---

## 样式设计

### 1. 编辑器布局样式

**文件**：`frontend/src/pages/agent/components/layout/editor-layout.css`

```css
/* Layout Container */
.agent-editor-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
}

/* Header */
.agent-editor-layout-header {
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e6eb;
  padding: 0 24px;
  display: flex;
  align-items: center;
}

/* Body */
.agent-editor-layout-body {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

/* Loading State */
.agent-editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

/* Responsive */
@media (max-width: 1024px) {
  .agent-editor-layout-body {
    flex-direction: column;
  }
}
```

### 2. Header 样式

**文件**：`frontend/src/pages/agent/components/layout/editor-header.css`

```css
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

/* Left Area */
.editor-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.editor-header-agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-header-agent-text {
  display: flex;
  flex-direction: column;
}

.editor-header-agent-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  line-height: 20px;
}

.editor-header-workspace {
  font-size: 12px;
  color: #86909c;
  line-height: 16px;
}

/* Right Area */
.editor-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### 3. SplitPanel 样式

**文件**：`frontend/src/pages/agent/components/layout/split-panel.css`

```css
.split-panel {
  display: flex;
  height: 100%;
  width: 100%;
}

/* Left Panel */
.split-panel-left {
  flex-shrink: 0;
  overflow-y: auto;
  background-color: #ffffff;
  border-right: 1px solid #e5e6eb;
}

/* Divider */
.split-panel-divider {
  width: 8px;
  background-color: #f7f8fa;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  user-select: none;
  transition: background-color 0.2s;
}

.split-panel-divider:hover,
.split-panel-divider.dragging {
  background-color: #4e5969;
}

.split-panel-handle {
  width: 2px;
  height: 40px;
  background-color: #c9cdd4;
  border-radius: 1px;
}

.split-panel-divider:hover .split-panel-handle,
.split-panel-divider.dragging .split-panel-handle {
  background-color: #ffffff;
}

/* Right Panel */
.split-panel-right {
  flex: 1;
  overflow-y: auto;
  background-color: #f7f8fa;
}

/* Mobile Responsive */
@media (max-width: 1024px) {
  .split-panel {
    flex-direction: column;
  }

  .split-panel-left {
    width: 100% !important;
    max-height: 40%;
    border-right: none;
    border-bottom: 1px solid #e5e6eb;
  }

  .split-panel-divider {
    width: 100%;
    height: 8px;
    cursor: row-resize;
  }

  .split-panel-handle {
    width: 40px;
    height: 2px;
  }

  .split-panel-right {
    flex: 1;
  }
}
```

---

## 最佳实践

### 1. 布局组件设计

✅ **职责单一**

```typescript
// ✅ Good: 每个组件只负责一个布局区域
<AgentEditorLayout>
  <EditorHeader />
  <EditorBody />
</AgentEditorLayout>

// ❌ Bad: 组件职责过多
<AgentEditor>  {/* 包含布局、逻辑、数据获取等 */}
```

✅ **使用插槽提高灵活性**

```typescript
// ✅ Good: 支持自定义内容
<Layout
  header={<CustomHeader />}
  content={<CustomContent />}
/>

// ❌ Bad: 硬编码内容
<Layout>
  <Header>...</Header>  {/* 无法自定义 */}
</Layout>
```

### 2. 样式管理

✅ **使用 CSS Modules 或 BEM**

```css
/* ✅ Good: CSS Modules */
.editorLayout {
  height: 100vh;
}

.editorLayout__header {
  height: 60px;
}

/* ✅ Good: BEM */
.editor-layout {
  height: 100vh;
}

.editor-layout__header {
  height: 60px;
}
```

✅ **避免内联样式**

```typescript
// ✅ Good: 使用 CSS 类
<div className="split-panel-left" style={{ width: leftWidth }}>

// ❌ Bad: 所有样式都用内联
<div style={{
  width: leftWidth,
  height: '100%',
  overflowY: 'auto',
  backgroundColor: '#fff',
  ...
}}>
```

### 3. 性能优化

✅ **避免不必要的重渲染**

```typescript
// ✅ Good: 使用 memo
export const EditorHeader = memo(function EditorHeader({ agentId }) {
  // ...
});

// ✅ Good: 使用 useMemo 缓存计算结果
const headerSlot = useMemo(() => <CustomHeader />, []);
```

✅ **懒加载大组件**

```typescript
// ✅ Good: 懒加载调试面板
const DebugPanel = lazy(() => import('./debug-panel'));

<Suspense fallback={<Spin />}>
  {showDebug && <DebugPanel />}
</Suspense>
```

### 4. 响应式设计

✅ **使用 CSS Grid/Flexbox**

```css
/* ✅ Good: 使用 Flexbox */
.split-panel {
  display: flex;
}

/* ✅ Good: 媒体查询 */
@media (max-width: 1024px) {
  .split-panel {
    flex-direction: column;
  }
}
```

✅ **使用 Hooks 检测屏幕尺寸**

```typescript
// ✅ Good: 使用 ahooks 的 useResponsive
import { useResponsive } from 'ahooks';

function MyComponent() {
  const responsive = useResponsive();

  return responsive.md ? <DesktopView /> : <MobileView />;
}
```

### 5. 可访问性（A11y）

✅ **添加语义化 HTML**

```typescript
// ✅ Good: 使用语义化标签
<header className="editor-header">
<main className="editor-body">
<aside className="editor-sidebar">

// ❌ Bad: 全部使用 div
<div className="editor-header">
<div className="editor-body">
```

✅ **添加 ARIA 属性**

```typescript
// ✅ Good: 添加 ARIA 标签
<button
  aria-label="返回列表"
  onClick={handleBack}
>
  <IconLeft />
</button>
```

---

## 总结

### 核心要点

1. **Coze Studio** 使用复杂的插槽系统和多层 Provider 实现灵活的布局
2. **布局组件** 应该保持简单，职责单一，通过插槽支持自定义
3. **左右分栏** 是 Agent IDE 的经典布局，支持拖拽调整提升用户体验
4. **响应式设计** 需要兼顾 Desktop 和 Mobile 两种场景

### Coze Lite 实现要点

- ✅ 简化为 Header + SplitPanel 两层结构
- ✅ 支持基础插槽（header, config, preview）
- ✅ 实现可拖拽调整的分栏（带宽度持久化）
- ✅ 基础响应式（Desktop/Mobile 两种布局）

### 预计工作量

- **Phase 1-4 总计**：5-8 天

### 下一步

接下来将创建：
- **11-agent-ide-prompt.md** - Prompt 编辑器实现
- **12-agent-ide-tools.md** - 工具管理系统
- **13-agent-ide-chat.md** - 聊天调试区
- **14-agent-ide-publish.md** - 发布管理

---

## 参考资源

### Coze Studio 源码

- `packages/agent-ide/layout/src/layout.tsx` - 主布局组件
- `packages/agent-ide/layout/src/components/header/` - Header 组件
- `packages/agent-ide/layout/src/index.module.less` - 布局样式

### 相关文档

- [09-agent-ide-overview.md](./09-agent-ide-overview.md) - Agent IDE 总体架构
- [04-routing-layout.md](./04-routing-layout.md) - 路由和布局系统

### 外部资源

- [Arco Design Layout](https://arco.design/react/components/layout)
- [React Split Pane](https://github.com/tomkp/react-split-pane)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

---

**文档版本**：1.0
**最后更新**：2025-11-30
**作者**：Coze Lite Team
