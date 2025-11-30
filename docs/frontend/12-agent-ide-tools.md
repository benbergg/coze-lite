# Agent IDE - 工具管理系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-agent-ide/tool`, `@coze-agent-ide/tool-config`

## 一、概述

工具管理系统是 Agent IDE 的核心功能之一，负责管理 Agent 可使用的各类工具（插件、工作流、知识库、数据库等）。本文档深度剖析 Coze Studio 的工具管理架构，并提供 Coze Lite 的简化实现方案。

### 1.1 核心功能

- **工具注册**: 动态注册和发现可用工具
- **分组管理**: 按功能分组（技能、知识、记忆等）
- **显示控制**: 显示/隐藏工具模块
- **状态管理**: 工具配置数据的增删改查
- **验证检查**: 检查工具是否配置有效数据

### 1.2 Coze Studio 工具分类

#### 工具组（Tool Groups）

| 组名 | 英文 | 包含工具 | 用途 |
|------|------|----------|------|
| Skill | 技能 | Plugin, Workflow, ImageFlow | Agent 执行能力 |
| Knowledge | 知识 | Knowledge, Document, Table, Photo | 知识检索 |
| Memory | 记忆 | Variable, Database, Long-term Memory, FileBox | 数据存储 |
| Dialog | 对话 | Onboarding, Suggest, User Input | 对话控制 |
| Character | 角色 | Voice, Background | 角色设定 |
| Hooks | 钩子 | Trigger, Dev Hooks | 事件处理 |

#### 工具类型（Tool Keys）

```typescript
// Coze Studio 支持的 18 种工具类型
export const enum ToolKey {
  // Skill 组
  PLUGIN = 'plugin',           // 插件 API
  WORKFLOW = 'workflow',       // 工作流
  IMAGEFLOW = 'imageflow',     // 图像工作流

  // Knowledge 组
  KNOWLEDGE = 'knowledge',     // 知识库（全部）
  DOCUMENT = 'document',       // 文档知识
  TABLE = 'table',             // 表格知识
  PHOTO = 'photo',             // 图片知识

  // Memory 组
  VARIABLE = 'variable',       // 变量存储
  DATABASE = 'database',       // 数据库
  LONG_TERM_MEMORY = 'longTermMemory', // 长期记忆
  FILE_BOX = 'fileBox',        // 文件盒

  // Dialog 组
  ONBOARDING = 'onboarding',   // 开场白
  SUGGEST = 'suggest',         // 自动建议
  USER_INPUT = 'userInput',    // 用户输入

  // Character 组
  VOICE = 'voice',             // 语音 TTS
  BACKGROUND = 'background',   // 背景图片

  // Hooks 组
  TRIGGER = 'trigger',         // 定时任务
  DEV_HOOKS = 'devHooks',      // 开发者钩子
  SHORTCUT = 'shortcut',       // 快捷指令
}
```

## 二、Coze Studio 源码分析

### 2.1 包结构

工具管理相关的两个核心包：

```bash
# 1. 工具配置包（类型定义、常量）
packages/agent-ide/tool-config/
├── src/
│   ├── types.ts              # ToolKey, ToolGroupKey 等类型定义
│   └── constants.ts          # TOOL_GROUP_CONFIG, 映射关系

# 2. 工具管理包（UI 组件、状态管理）
packages/agent-ide/tool/
├── src/
│   ├── store/
│   │   ├── tool-area.ts      # ToolAreaStore（工具注册和初始化）
│   │   └── agent-area.ts     # AgentAreaStore
│   ├── components/
│   │   ├── tool-view/        # ToolView（容器组件）
│   │   ├── tool-container/   # ToolContainer（单工具包装器）
│   │   ├── tool-item/        # ToolItem（工具卡片）
│   │   ├── tool-item-list/   # ToolItemList（工具列表）
│   │   ├── tool-menu/        # ToolMenu（添加工具菜单按钮）
│   │   └── tool-menu-dropdown-menu/  # 下拉菜单内容
│   └── hooks/
│       ├── builtin/
│       │   ├── use-register-tool-key.ts    # 注册单个工具
│       │   └── use-register-tool-group.ts  # 注册工具组
│       └── public/
│           └── store/use-tool-store.ts     # 访问工具状态
```

### 2.2 核心 Store - ToolAreaStore

**文件位置**: `tool/src/store/tool-area.ts:22-152`

```typescript
// 注册的工具配置
export interface IRegisteredToolKeyConfig {
  toolGroupKey: ToolGroupKey;  // 所属工具组
  toolKey: ToolKey;            // 工具唯一标识
  toolTitle: string;           // 工具显示名称
  hasValidData: boolean;       // 是否有有效配置数据
}

// 注册的工具组配置
export interface IRegisteredToolGroupConfig {
  toolGroupKey: ToolGroupKey;
  groupTitle: string;
}

// Store 状态
export interface IToolAreaState {
  isInitialed: boolean;                               // 是否已初始化
  isModeSwitching: boolean;                          // 是否正在切换模式
  initialedToolKeyList: ToolKey[];                   // 已初始化的工具列表
  registeredToolKeyConfigList: IRegisteredToolKeyConfig[];  // 已注册工具配置
  registeredToolGroupList: IRegisteredToolGroupConfig[];    // 已注册工具组
}

// Store 操作
export interface IToolAreaAction {
  updateIsInitialed: (isInitialed: boolean) => void;
  appendIntoInitialedToolKeyList: (toolKey: ToolKey) => void;
  hasToolKeyInInitialedToolKeyList: (toolKey: ToolKey) => boolean;

  // 工具注册
  appendIntoRegisteredToolKeyConfigList: (params: IRegisteredToolKeyConfig) => void;
  hasToolKeyInRegisteredToolKeyList: (toolKey: ToolKey) => boolean;

  // 工具数据验证
  setToolHasValidData: (data: { toolKey: ToolKey; hasValidData: boolean }) => void;

  // 工具组注册
  appendIntoRegisteredToolGroupList: (params: IRegisteredToolGroupConfig) => void;

  clearStore: () => void;
}

// 创建 Store（使用 Zustand + Immer）
export const createToolAreaStore = () =>
  create<IToolAreaState & IToolAreaAction>()(
    devtools((set, get) => ({
      // 初始状态
      initialedToolKeyList: [],
      registeredToolKeyConfigList: [],
      registeredToolGroupList: [],
      isInitialed: false,
      isModeSwitching: false,

      // 注册工具
      appendIntoRegisteredToolKeyConfigList: params => {
        const { toolKey } = params;
        const { registeredToolKeyConfigList } = get();
        // 防止重复注册
        if (!registeredToolKeyConfigList.find(config => config.toolKey === toolKey)) {
          set({ registeredToolKeyConfigList: [...registeredToolKeyConfigList, params] });
        }
      },

      // 更新工具数据验证状态（使用 Immer）
      setToolHasValidData: ({ toolKey, hasValidData }) => {
        set(produce<IToolAreaState>(state => {
          const tool = state.registeredToolKeyConfigList.find(
            config => config.toolKey === toolKey
          );
          if (tool) {
            tool.hasValidData = hasValidData;
          }
        }));
      },

      // ... 其他操作
    }), {
      name: 'botStudio.tool.ToolAreaStore',
      enabled: IS_DEV_MODE,
    })
  );
```

**关键设计点**:
- 使用 Zustand 管理工具注册状态
- Immer 处理嵌套数据更新
- 防止重复注册检查
- DevTools 支持（开发模式）

### 2.3 工具注册 Hook

**文件位置**: `tool/src/hooks/builtin/use-register-tool-key.ts:25-36`

```typescript
export const useRegisterToolKey = () => {
  const { store: { useToolAreaStore } } = useAbilityAreaContext();
  const appendIntoRegisteredToolKeyConfigList = useToolAreaStore(
    useShallow(state => state.appendIntoRegisteredToolKeyConfigList)
  );

  return (params: IRegisteredToolKeyConfig) => {
    appendIntoRegisteredToolKeyConfigList(params);
  };
};

// 使用示例
const registerToolKey = useRegisterToolKey();
registerToolKey({
  toolGroupKey: ToolGroupKey.SKILL,
  toolKey: ToolKey.PLUGIN,
  toolTitle: '插件',
  hasValidData: false,
});
```

### 2.4 工具菜单组件 - ToolMenuDropdownMenu

**文件位置**: `tool/src/components/tool-menu-dropdown-menu/index.tsx:39-130`

```typescript
export const ToolMenuDropdownMenu: FC = () => {
  // 获取已注册的工具和工具组
  const registeredToolKeyConfigList = useRegisteredToolKeyConfigList();
  const registeredToolGroupList = useRegisteredToolGroupList();

  // 获取工具显示状态（TabStatus.Default | TabStatus.Hide）
  const { botSkillBlockCollapsible, setBotSkillBlockCollapsibleState } =
    usePageRuntimeStore(useShallow(state => ({
      botSkillBlockCollapsible: state.botSkillBlockCollapsibleState,
      setBotSkillBlockCollapsibleState: state.setBotSkillBlockCollapsibleState,
    })));

  const { isReadonly } = usePreference();

  // 按工具组分组工具列表
  const menuConfig = Object.keys(TOOL_GROUP_CONFIG)
    .map(toolGroupKey => ({
      toolGroupKey,
      toolGroupTitle: registeredToolGroupList.find(
        config => config.toolGroupKey === toolGroupKey
      )?.groupTitle,
      toolList: registeredToolKeyConfigList.filter(
        config => config.toolGroupKey === toolGroupKey
      ),
    }))
    .filter(group => group.toolList.length);

  // 获取工具显示状态
  const getToolStatus = (toolKey: ToolKey) =>
    botSkillBlockCollapsible[TOOL_KEY_TO_API_STATUS_KEY_MAP[toolKey]];

  // 切换工具显示/隐藏
  const handleClick = (toolKey: ToolKey, currentStatus?: TabStatus) => {
    if (isReadonly) return;

    setBotSkillBlockCollapsibleState({
      [TOOL_KEY_TO_API_STATUS_KEY_MAP[toolKey]]:
        currentStatus === TabStatus.Hide ? TabStatus.Default : TabStatus.Hide,
    });
  };

  return (
    <div className={styles['tool-menu-dropdown-menu']}>
      <Menu.SubMenu mode="menu">
        {menuConfig.map((toolGroup, groupIdx) => (
          <div key={toolGroup.toolGroupKey}>
            {/* 工具组标题 */}
            <Menu.Title style={{ paddingLeft: '32px' }}>
              {toolGroup.toolGroupTitle}
            </Menu.Title>

            {/* 工具列表（带 Checkbox） */}
            {toolGroup.toolList.map(tool => {
              const toolStatus = getToolStatus(tool.toolKey);
              return (
                <ToolTooltip
                  content={tool.hasValidData ? '该工具已有配置数据，无法隐藏' : undefined}
                  key={`tooltips-${tool.toolKey}`}
                >
                  <Menu.Item
                    key={tool.toolKey}
                    disabled={tool.hasValidData}  // 有数据的工具不可隐藏
                    onClick={() => handleClick(tool.toolKey, toolStatus)}
                  >
                    <div className={styles['dropdown-item-container']}>
                      <Checkbox
                        checked={toolStatus !== TabStatus.Hide}
                        disabled={tool.hasValidData}
                      />
                      <span>{tool.toolTitle}</span>
                    </div>
                  </Menu.Item>
                </ToolTooltip>
              );
            })}

            {/* 分割线（最后一组除外） */}
            {groupIdx < menuConfig.length - 1 && <Menu.Divider />}
          </div>
        ))}
      </Menu.SubMenu>
    </div>
  );
};
```

**关键设计点**:
1. **按组分组显示**: 6 个工具组，每组显示其下的工具
2. **Checkbox 控制显示**: 勾选=显示，不勾选=隐藏
3. **智能禁用**: 已配置数据的工具不可隐藏（防止用户误操作）
4. **Tooltip 提示**: 鼠标悬停显示禁用原因

### 2.5 工具容器组件 - ToolContainer

**文件位置**: `tool/src/components/tool-container/index.tsx:41-120`

```typescript
interface IProps {
  scope: AbilityScope;        // 'tool' | 'agentSkill'
  toolKey?: ToolKey;
  onMouseOver?: (toolKey: string | undefined) => void;
  onMouseLeave?: (toolKey: string | undefined) => void;
}

export const ToolContainer: FC<PropsWithChildren<IProps>> = ({
  children,
  toolKey,
  onMouseOver,
  onMouseLeave,
}) => {
  const { enableToolHiddenMode, isReadonly } = usePreference();

  // 获取工具显示状态
  const toolStatus = usePageRuntimeStore(state =>
    toolKey ? state.botSkillBlockCollapsibleState[
      TOOL_KEY_TO_API_STATUS_KEY_MAP[toolKey]
    ] : null
  );

  const getToolConfig = useGetToolConfig();
  const toolConfig = getToolConfig(toolKey);

  // 计算是否隐藏
  const getInvisible = () => {
    if (!enableToolHiddenMode) return false;

    if (isReadonly) {
      // 只读模式：隐藏没有数据的工具
      return !toolConfig?.hasValidData;
    }

    // 编辑模式：根据 TabStatus 决定
    return toolStatus === TabStatus.Hide;
  };

  const invisible = getInvisible();

  return (
    <div
      className={classNames({
        hidden: invisible,
        'collapse-panel': true,
        [`collapse-panel-${toolKey}`]: true,
      })}
    >
      <ErrorBoundary
        errorBoundaryName={`botEditorTool${toolConfig?.toolKey}`}
        FallbackComponent={() => (
          <ToolContainerFallback toolTitle={toolConfig?.toolTitle} />
        )}
      >
        <AbilityConfigContextProvider abilityKey={toolKey} scope={AbilityScope.TOOL}>
          {children}
        </AbilityConfigContextProvider>
      </ErrorBoundary>
    </div>
  );
};
```

**关键设计点**:
1. **条件渲染**: 根据 `toolStatus` 和 `hasValidData` 控制显示
2. **错误边界**: 每个工具独立的错误处理
3. **Context 隔离**: 每个工具有独立的配置上下文

### 2.6 工具卡片组件 - ToolItem

**文件位置**: `tool/src/components/tool-item/index.tsx:18-120`

```typescript
interface IProps {
  title: string;                // 工具标题
  description?: string;         // 工具描述
  avatar?: ReactNode;           // 工具图标
  actions?: ReactNode;          // 右侧操作按钮
  icons?: ReactNode[];          // 状态图标
  disabled?: boolean;           // 是否禁用
  onClick?: () => void;
  className?: string;
}

export const ToolItem: FC<IProps> = ({
  title,
  description,
  avatar,
  actions,
  icons,
  disabled = false,
  onClick,
  className,
}) => {
  return (
    <div
      className={classNames(
        'group relative flex items-center gap-[12px] rounded-[8px] border border-solid',
        'border-transparent bg-fill-2 px-[12px] py-[10px] transition-all',
        {
          'cursor-pointer hover:border-line-3 hover:bg-fill-3': !disabled && onClick,
          'cursor-not-allowed opacity-50': disabled,
        },
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      {/* 工具图标 */}
      {avatar && <div className="flex-shrink-0">{avatar}</div>}

      {/* 工具信息 */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-[4px]">
          <span className="truncate text-[14px] font-medium text-text-1">
            {title}
          </span>
          {/* 状态图标（如已配置、错误等） */}
          {icons && icons.length > 0 && (
            <div className="flex items-center gap-[4px]">
              {icons.map((icon, idx) => (
                <span key={idx}>{icon}</span>
              ))}
            </div>
          )}
        </div>

        {/* 工具描述 */}
        {description && (
          <div className="mt-[2px] truncate text-[12px] text-text-3">
            {description}
          </div>
        )}
      </div>

      {/* 右侧操作按钮（悬停显示） */}
      {actions && (
        <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
};
```

## 三、核心概念

### 3.1 工具注册机制

工具注册是通过 React 组件的生命周期触发的：

```typescript
// 工具组件内部调用
function PluginToolView() {
  const registerToolKey = useRegisterToolKey();

  useEffect(() => {
    registerToolKey({
      toolGroupKey: ToolGroupKey.SKILL,
      toolKey: ToolKey.PLUGIN,
      toolTitle: '插件',
      hasValidData: plugins.length > 0,  // 动态判断是否有数据
    });
  }, [plugins]);

  return <PluginList plugins={plugins} />;
}
```

### 3.2 显示状态管理

工具的显示状态通过 `TabStatus` 枚举管理：

```typescript
export enum TabStatus {
  Default = 0,  // 显示（默认）
  Hide = 1,     // 隐藏
}

// 状态存储在 PageRuntimeStore 中
interface PageRuntimeStore {
  botSkillBlockCollapsibleState: {
    plugin_tab_status: TabStatus;
    workflow_tab_status: TabStatus;
    knowledge_tab_status: TabStatus;
    // ... 其他工具
  };
  setBotSkillBlockCollapsibleState: (state: Partial<TabDisplayItems>) => void;
}
```

### 3.3 工具分组策略

6 大工具组按功能划分，每个工具归属一个组：

| 工具组 | 工具列表 | 设计理念 |
|--------|----------|----------|
| **Skill** | Plugin, Workflow, ImageFlow | Agent 主动执行的能力 |
| **Knowledge** | Knowledge, Document, Table, Photo | 被动知识检索源 |
| **Memory** | Variable, Database, Long-term Memory | 数据存储和记忆 |
| **Dialog** | Onboarding, Suggest, User Input | 对话流程控制 |
| **Character** | Voice, Background | 角色外观和声音 |
| **Hooks** | Trigger, Dev Hooks, Shortcut | 高级事件钩子 |

### 3.4 数据验证（hasValidData）

`hasValidData` 字段用于判断工具是否已配置有效数据：

| 工具 | hasValidData = true 的条件 |
|------|---------------------------|
| Plugin | 至少添加了 1 个插件 |
| Workflow | 至少添加了 1 个工作流 |
| Knowledge | 至少添加了 1 个知识库 |
| Variable | 至少定义了 1 个变量 |
| Database | 至少连接了 1 个数据库 |

**作用**:
- **防止误隐藏**: 已配置数据的工具不可隐藏
- **只读模式优化**: 自动隐藏空工具，减少界面混乱

## 四、Coze Lite 设计方案

### 4.1 简化策略

| 功能 | Coze Studio | Coze Lite | 简化说明 |
|------|-------------|-----------|----------|
| 工具数量 | 18 种 | 6 种 | 仅实现核心工具 |
| 工具组 | 6 组 | 3 组 | 合并为 Skill/Knowledge/Advanced |
| 状态管理 | PageRuntimeStore + ToolAreaStore | 单一 ToolStore | 简化状态管理 |
| 注册机制 | 动态注册 | 静态配置 | 简化注册流程 |
| 错误边界 | 每工具独立 | 全局统一 | 简化错误处理 |

### 4.2 Coze Lite 工具定义

```typescript
// 简化为 6 种核心工具
export enum ToolKey {
  // Skill 组
  PLUGIN = 'plugin',
  WORKFLOW = 'workflow',

  // Knowledge 组
  KNOWLEDGE = 'knowledge',

  // Advanced 组
  VARIABLE = 'variable',
  DATABASE = 'database',
  TRIGGER = 'trigger',
}

export enum ToolGroupKey {
  SKILL = 'skill',
  KNOWLEDGE = 'knowledge',
  ADVANCED = 'advanced',
}

// 工具分组配置
export const TOOL_GROUP_CONFIG = {
  [ToolGroupKey.SKILL]: '技能',
  [ToolGroupKey.KNOWLEDGE]: '知识',
  [ToolGroupKey.ADVANCED]: '高级',
};

// 工具配置
export interface ToolConfig {
  key: ToolKey;
  group: ToolGroupKey;
  title: string;
  description: string;
  icon: ReactNode;
  defaultVisible: boolean;
}

export const TOOL_CONFIGS: ToolConfig[] = [
  {
    key: ToolKey.PLUGIN,
    group: ToolGroupKey.SKILL,
    title: '插件',
    description: '调用外部 API 插件',
    icon: <IconPlugin />,
    defaultVisible: true,
  },
  {
    key: ToolKey.WORKFLOW,
    group: ToolGroupKey.SKILL,
    title: '工作流',
    description: '复杂任务编排',
    icon: <IconWorkflow />,
    defaultVisible: true,
  },
  {
    key: ToolKey.KNOWLEDGE,
    group: ToolGroupKey.KNOWLEDGE,
    title: '知识库',
    description: 'RAG 知识检索',
    icon: <IconKnowledge />,
    defaultVisible: true,
  },
  {
    key: ToolKey.VARIABLE,
    group: ToolGroupKey.ADVANCED,
    title: '变量',
    description: '数据存储变量',
    icon: <IconVariable />,
    defaultVisible: false,
  },
  {
    key: ToolKey.DATABASE,
    group: ToolGroupKey.ADVANCED,
    title: '数据库',
    description: '结构化数据存储',
    icon: <IconDatabase />,
    defaultVisible: false,
  },
  {
    key: ToolKey.TRIGGER,
    group: ToolGroupKey.ADVANCED,
    title: '定时任务',
    description: '定时触发 Agent',
    icon: <IconTrigger />,
    defaultVisible: false,
  },
];
```

### 4.3 工具 Store 设计

**文件路径**: `frontend/src/stores/toolStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';

// 工具项数据
export interface ToolItem {
  id: string;
  type: ToolKey;
  name: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 工具状态
interface ToolState {
  // 工具显示状态（true=显示, false=隐藏）
  visibilityMap: Record<ToolKey, boolean>;

  // 工具数据（按工具类型分类）
  toolItems: {
    [ToolKey.PLUGIN]: ToolItem[];
    [ToolKey.WORKFLOW]: ToolItem[];
    [ToolKey.KNOWLEDGE]: ToolItem[];
    [ToolKey.VARIABLE]: ToolItem[];
    [ToolKey.DATABASE]: ToolItem[];
    [ToolKey.TRIGGER]: ToolItem[];
  };

  // 当前选中的工具项
  selectedToolId: string | null;

  // 操作
  setToolVisibility: (toolKey: ToolKey, visible: boolean) => void;
  toggleToolVisibility: (toolKey: ToolKey) => void;

  addToolItem: (type: ToolKey, item: Omit<ToolItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateToolItem: (id: string, updates: Partial<ToolItem>) => void;
  deleteToolItem: (id: string) => void;

  setSelectedTool: (id: string | null) => void;

  // 辅助方法
  getToolItems: (type: ToolKey) => ToolItem[];
  hasValidData: (type: ToolKey) => boolean;
  getVisibleTools: () => ToolKey[];
}

export const useToolStore = create<ToolState>()(
  persist(
    (set, get) => ({
      // 初始状态（从 TOOL_CONFIGS 读取默认值）
      visibilityMap: TOOL_CONFIGS.reduce((acc, config) => {
        acc[config.key] = config.defaultVisible;
        return acc;
      }, {} as Record<ToolKey, boolean>),

      toolItems: {
        [ToolKey.PLUGIN]: [],
        [ToolKey.WORKFLOW]: [],
        [ToolKey.KNOWLEDGE]: [],
        [ToolKey.VARIABLE]: [],
        [ToolKey.DATABASE]: [],
        [ToolKey.TRIGGER]: [],
      },

      selectedToolId: null,

      // 设置工具显示状态
      setToolVisibility: (toolKey, visible) => {
        set(produce<ToolState>(state => {
          state.visibilityMap[toolKey] = visible;
        }));
      },

      // 切换工具显示状态
      toggleToolVisibility: (toolKey) => {
        set(produce<ToolState>(state => {
          state.visibilityMap[toolKey] = !state.visibilityMap[toolKey];
        }));
      },

      // 添加工具项
      addToolItem: (type, item) => {
        const id = `${type}_${Date.now()}`;
        const now = new Date().toISOString();

        set(produce<ToolState>(state => {
          state.toolItems[type].push({
            ...item,
            id,
            type,
            createdAt: now,
            updatedAt: now,
          });
        }));
      },

      // 更新工具项
      updateToolItem: (id, updates) => {
        set(produce<ToolState>(state => {
          // 查找所有工具类型中的目标项
          for (const type of Object.keys(state.toolItems) as ToolKey[]) {
            const index = state.toolItems[type].findIndex(item => item.id === id);
            if (index !== -1) {
              state.toolItems[type][index] = {
                ...state.toolItems[type][index],
                ...updates,
                updatedAt: new Date().toISOString(),
              };
              break;
            }
          }
        }));
      },

      // 删除工具项
      deleteToolItem: (id) => {
        set(produce<ToolState>(state => {
          for (const type of Object.keys(state.toolItems) as ToolKey[]) {
            state.toolItems[type] = state.toolItems[type].filter(item => item.id !== id);
          }
        }));
      },

      // 设置选中工具
      setSelectedTool: (id) => {
        set({ selectedToolId: id });
      },

      // 获取指定类型的工具项
      getToolItems: (type) => {
        return get().toolItems[type];
      },

      // 判断工具是否有数据
      hasValidData: (type) => {
        return get().toolItems[type].length > 0;
      },

      // 获取所有可见工具
      getVisibleTools: () => {
        const { visibilityMap } = get();
        return Object.entries(visibilityMap)
          .filter(([_, visible]) => visible)
          .map(([key]) => key as ToolKey);
      },
    }),
    {
      name: 'coze-lite-tool-store',
      // 只持久化 visibilityMap 和 toolItems
      partialize: (state) => ({
        visibilityMap: state.visibilityMap,
        toolItems: state.toolItems,
      }),
    }
  )
);
```

## 五、组件实现

### 5.1 工具菜单按钮 - ToolMenu

**文件路径**: `frontend/src/components/agent-ide/ToolMenu/index.tsx`

```typescript
import { useState } from 'react';
import { Dropdown, Button } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useToolStore } from '@/stores/toolStore';
import { TOOL_CONFIGS, TOOL_GROUP_CONFIG, ToolGroupKey, ToolKey } from '@/config/tools';
import './index.css';

export function ToolMenu() {
  const [visible, setVisible] = useState(false);
  const { visibilityMap, toggleToolVisibility, hasValidData } = useToolStore();

  // 按工具组分组
  const groupedTools = TOOL_CONFIGS.reduce((acc, config) => {
    if (!acc[config.group]) {
      acc[config.group] = [];
    }
    acc[config.group].push(config);
    return acc;
  }, {} as Record<ToolGroupKey, typeof TOOL_CONFIGS>);

  const handleToggle = (toolKey: ToolKey) => {
    // 如果工具已有数据，不允许隐藏
    if (visibilityMap[toolKey] && hasValidData(toolKey)) {
      return;
    }
    toggleToolVisibility(toolKey);
  };

  const dropdownContent = (
    <div className="tool-menu-dropdown">
      {Object.entries(groupedTools).map(([groupKey, tools], groupIdx) => (
        <div key={groupKey}>
          {/* 工具组标题 */}
          <div className="tool-menu-group-title">
            {TOOL_GROUP_CONFIG[groupKey as ToolGroupKey]}
          </div>

          {/* 工具列表 */}
          {tools.map((tool) => {
            const isVisible = visibilityMap[tool.key];
            const disabled = isVisible && hasValidData(tool.key);

            return (
              <div
                key={tool.key}
                className={`tool-menu-item ${disabled ? 'disabled' : ''}`}
                onClick={() => handleToggle(tool.key)}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  disabled={disabled}
                  onChange={() => {}} // Controlled by parent onClick
                />
                <span className="tool-menu-item-icon">{tool.icon}</span>
                <div className="tool-menu-item-info">
                  <div className="tool-menu-item-title">{tool.title}</div>
                  {disabled && (
                    <div className="tool-menu-item-hint">该工具已有配置，无法隐藏</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 分割线 */}
          {groupIdx < Object.keys(groupedTools).length - 1 && (
            <div className="tool-menu-divider" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dropdown
      trigger="click"
      position="br"
      droplist={dropdownContent}
      popupVisible={visible}
      onVisibleChange={setVisible}
    >
      <Button type="secondary" icon={<IconPlus />}>
        添加工具
      </Button>
    </Dropdown>
  );
}
```

**CSS 样式**: `frontend/src/components/agent-ide/ToolMenu/index.css`

```css
/* 下拉菜单容器 */
.tool-menu-dropdown {
  width: 280px;
  max-height: 500px;
  overflow-y: auto;
  padding: 8px 0;
  background: var(--color-bg-2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 工具组标题 */
.tool-menu-group-title {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-3);
  text-transform: uppercase;
}

/* 工具项 */
.tool-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tool-menu-item:hover:not(.disabled) {
  background-color: var(--color-fill-3);
}

.tool-menu-item.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.tool-menu-item input[type="checkbox"] {
  margin: 0;
  cursor: inherit;
}

.tool-menu-item-icon {
  font-size: 20px;
  color: var(--color-text-2);
}

.tool-menu-item-info {
  flex: 1;
}

.tool-menu-item-title {
  font-size: 14px;
  color: var(--color-text-1);
  font-weight: 500;
}

.tool-menu-item-hint {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}

/* 分割线 */
.tool-menu-divider {
  height: 1px;
  margin: 8px 0;
  background-color: var(--color-border-2);
}
```

### 5.2 工具列表容器 - ToolSection

**文件路径**: `frontend/src/components/agent-ide/ToolSection/index.tsx`

```typescript
import { ReactNode } from 'react';
import { Collapse } from '@arco-design/web-react';
import { IconDown } from '@arco-design/web-react/icon';
import { useToolStore } from '@/stores/toolStore';
import { TOOL_CONFIGS, ToolKey } from '@/config/tools';
import { ToolItem } from '../ToolItem';
import './index.css';

const CollapseItem = Collapse.Item;

export function ToolSection() {
  const { visibilityMap, getToolItems, setSelectedTool, selectedToolId } = useToolStore();

  // 只显示可见的工具
  const visibleTools = TOOL_CONFIGS.filter(config => visibilityMap[config.key]);

  const handleItemClick = (id: string) => {
    setSelectedTool(id);
  };

  if (visibleTools.length === 0) {
    return (
      <div className="tool-section-empty">
        <p>暂无工具</p>
        <p className="hint">点击右上角「添加工具」按钮开始配置</p>
      </div>
    );
  }

  return (
    <div className="tool-section">
      <Collapse
        defaultActiveKey={visibleTools.map(t => t.key)}
        expandIcon={<IconDown />}
      >
        {visibleTools.map(toolConfig => {
          const items = getToolItems(toolConfig.key);

          return (
            <CollapseItem
              key={toolConfig.key}
              name={toolConfig.key}
              header={
                <div className="tool-section-header">
                  <span className="tool-section-icon">{toolConfig.icon}</span>
                  <span className="tool-section-title">{toolConfig.title}</span>
                  <span className="tool-section-count">{items.length}</span>
                </div>
              }
            >
              <div className="tool-section-content">
                {items.length === 0 ? (
                  <div className="tool-section-placeholder">
                    暂无{toolConfig.title}，点击右侧按钮添加
                  </div>
                ) : (
                  <div className="tool-item-list">
                    {items.map(item => (
                      <ToolItem
                        key={item.id}
                        item={item}
                        selected={item.id === selectedToolId}
                        onClick={() => handleItemClick(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CollapseItem>
          );
        })}
      </Collapse>
    </div>
  );
}
```

**CSS 样式**: `frontend/src/components/agent-ide/ToolSection/index.css`

```css
.tool-section {
  height: 100%;
  overflow-y: auto;
}

/* 折叠面板头部 */
.tool-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

.tool-section-icon {
  font-size: 18px;
  color: var(--color-text-2);
}

.tool-section-count {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-text-3);
  background-color: var(--color-fill-3);
  border-radius: 10px;
}

/* 折叠面板内容 */
.tool-section-content {
  padding: 8px 0;
}

.tool-section-placeholder {
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
}

.tool-item-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 空状态 */
.tool-section-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-3);
}

.tool-section-empty p {
  margin: 4px 0;
}

.tool-section-empty .hint {
  font-size: 13px;
  color: var(--color-text-4);
}
```

### 5.3 工具卡片 - ToolItem

**文件路径**: `frontend/src/components/agent-ide/ToolItem/index.tsx`

```typescript
import { ReactNode } from 'react';
import { Button, Popconfirm } from '@arco-design/web-react';
import { IconEdit, IconDelete } from '@arco-design/web-react/icon';
import { useToolStore, type ToolItem as ToolItemType } from '@/stores/toolStore';
import { TOOL_CONFIGS } from '@/config/tools';
import './index.css';

interface ToolItemProps {
  item: ToolItemType;
  selected: boolean;
  onClick: () => void;
}

export function ToolItem({ item, selected, onClick }: ToolItemProps) {
  const { deleteToolItem } = useToolStore();

  const toolConfig = TOOL_CONFIGS.find(c => c.key === item.type);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteToolItem(item.id);
  };

  return (
    <div
      className={`tool-item ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* 工具图标 */}
      <div className="tool-item-icon">
        {toolConfig?.icon}
      </div>

      {/* 工具信息 */}
      <div className="tool-item-info">
        <div className="tool-item-name">{item.name}</div>
        <div className="tool-item-meta">
          更新于 {new Date(item.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {/* 操作按钮（悬停显示） */}
      <div className="tool-item-actions">
        <Button
          type="text"
          size="mini"
          icon={<IconEdit />}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
        <Popconfirm
          title="确定删除该工具吗？"
          onConfirm={handleDelete}
          onCancel={(e) => e?.stopPropagation()}
        >
          <Button
            type="text"
            size="mini"
            status="danger"
            icon={<IconDelete />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      </div>
    </div>
  );
}
```

**CSS 样式**: `frontend/src/components/agent-ide/ToolItem/index.css`

```css
.tool-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background-color: var(--color-fill-2);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-item:hover {
  background-color: var(--color-fill-3);
  border-color: var(--color-border-3);
}

.tool-item.selected {
  background-color: var(--color-primary-light-1);
  border-color: var(--color-primary-light-3);
}

/* 工具图标 */
.tool-item-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--color-text-2);
}

/* 工具信息 */
.tool-item-info {
  flex: 1;
  overflow: hidden;
}

.tool-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-item-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}

/* 操作按钮 */
.tool-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.tool-item:hover .tool-item-actions {
  opacity: 1;
}
```

## 六、使用示例

### 6.1 在 Agent 编辑器中集成

**文件路径**: `frontend/src/pages/agent/editor/[id].tsx`

```typescript
import { useState } from 'react';
import { Button } from '@arco-design/web-react';
import { AgentEditorLayout } from '@/components/agent-ide/AgentEditorLayout';
import { PromptEditor } from '@/components/agent-ide/PromptEditor';
import { ToolSection } from '@/components/agent-ide/ToolSection';
import { ToolMenu } from '@/components/agent-ide/ToolMenu';
import { ChatArea } from '@/components/agent-ide/ChatArea';

export default function AgentEditorPage() {
  return (
    <AgentEditorLayout
      leftPanel={
        <>
          {/* Prompt 编辑器 */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium mb-3">System Prompt</h3>
            <PromptEditor
              value={prompt}
              onChange={setPrompt}
              placeholder="输入 Agent 的系统提示词..."
            />
          </div>

          {/* 工具管理区 */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">工具配置</h3>
              <ToolMenu />
            </div>
            <div className="flex-1 overflow-hidden">
              <ToolSection />
            </div>
          </div>
        </>
      }
      rightPanel={
        <ChatArea agentId={id} />
      }
    />
  );
}
```

### 6.2 添加工具示例

```typescript
import { useToolStore } from '@/stores/toolStore';
import { ToolKey } from '@/config/tools';

function PluginAddDialog() {
  const { addToolItem } = useToolStore();

  const handleSubmit = (formData: any) => {
    addToolItem(ToolKey.PLUGIN, {
      name: formData.name,
      config: {
        apiUrl: formData.apiUrl,
        method: formData.method,
        headers: formData.headers,
      },
    });
  };

  return (
    <Modal>
      {/* 表单内容 */}
    </Modal>
  );
}
```

### 6.3 编辑工具示例

```typescript
import { useToolStore } from '@/stores/toolStore';

function PluginEditPanel({ toolId }: { toolId: string }) {
  const { getToolItems, updateToolItem } = useToolStore();
  const [formData, setFormData] = useState({});

  // 查找工具数据
  const plugin = getToolItems(ToolKey.PLUGIN).find(item => item.id === toolId);

  const handleSave = () => {
    updateToolItem(toolId, {
      name: formData.name,
      config: formData.config,
    });
  };

  return (
    <div>
      {/* 编辑表单 */}
    </div>
  );
}
```

## 七、最佳实践

### 7.1 工具设计原则

1. **单一职责**: 每个工具只做一件事
   - ✅ Plugin 工具专注于 API 调用
   - ✅ Workflow 工具专注于任务编排
   - ❌ 不要让 Plugin 工具包含工作流逻辑

2. **独立配置**: 工具配置互不干扰
   - 每个工具有独立的配置面板
   - 配置数据存储在独立的命名空间

3. **防御性 UI**: 防止用户误操作
   - 有数据的工具不可隐藏
   - 删除操作需要二次确认
   - 关键配置变更显示警告

### 7.2 性能优化

1. **按需渲染**: 只渲染可见工具

```typescript
// ✅ 好的实践
const visibleTools = TOOL_CONFIGS.filter(config => visibilityMap[config.key]);
return visibleTools.map(tool => <Tool key={tool.key} {...tool} />);

// ❌ 差的实践
return TOOL_CONFIGS.map(tool => (
  <Tool key={tool.key} {...tool} hidden={!visibilityMap[tool.key]} />
));
```

2. **状态分片**: 避免全局状态更新

```typescript
// ✅ 使用 useShallow 避免不必要的重渲染
const { visibilityMap } = useToolStore(useShallow(state => ({
  visibilityMap: state.visibilityMap
})));
```

3. **懒加载**: 工具配置面板按需加载

```typescript
const PluginConfigPanel = lazy(() => import('./PluginConfigPanel'));

function ToolConfigArea({ toolType }) {
  return (
    <Suspense fallback={<Spin />}>
      {toolType === ToolKey.PLUGIN && <PluginConfigPanel />}
    </Suspense>
  );
}
```

### 7.3 用户体验优化

1. **智能默认值**: 常用工具默认显示

```typescript
export const TOOL_CONFIGS: ToolConfig[] = [
  {
    key: ToolKey.PLUGIN,
    defaultVisible: true,  // 插件默认显示
  },
  {
    key: ToolKey.TRIGGER,
    defaultVisible: false, // 定时任务默认隐藏
  },
];
```

2. **空状态提示**: 引导用户添加工具

```tsx
{items.length === 0 && (
  <Empty
    description="暂无插件"
    extra={<Button type="primary">添加插件</Button>}
  />
)}
```

3. **操作反馈**: 及时的成功/错误提示

```typescript
const handleAdd = async (data) => {
  try {
    await addToolItem(ToolKey.PLUGIN, data);
    Message.success('插件添加成功');
  } catch (error) {
    Message.error(`添加失败: ${error.message}`);
  }
};
```

### 7.4 数据持久化策略

1. **本地优先**: 使用 Zustand persist

```typescript
export const useToolStore = create<ToolState>()(
  persist(
    (set, get) => ({ /* ... */ }),
    {
      name: 'coze-lite-tool-store',
      partialize: (state) => ({
        visibilityMap: state.visibilityMap,
        toolItems: state.toolItems,
      }),
    }
  )
);
```

2. **乐观更新**: 先更新 UI，后同步服务器

```typescript
const handleUpdate = async (id: string, updates: any) => {
  // 1. 立即更新本地状态
  updateToolItem(id, updates);

  // 2. 异步同步到服务器
  try {
    await api.updateTool(id, updates);
  } catch (error) {
    // 3. 失败时回滚
    updateToolItem(id, originalData);
    Message.error('同步失败，已回滚');
  }
};
```

3. **定期备份**: 导出配置 JSON

```typescript
const exportConfig = () => {
  const { toolItems } = useToolStore.getState();
  const json = JSON.stringify(toolItems, null, 2);

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `agent-tools-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
};
```

## 八、实施计划

### 阶段 1: 基础架构（1-2 天）

**任务**:
- [x] 定义工具类型和配置（`config/tools.ts`）
- [x] 实现 ToolStore（`stores/toolStore.ts`）
- [x] 创建工具图标资源

**验收标准**:
- 类型定义完整，无 TypeScript 错误
- Store 可正常增删改查工具
- 状态持久化到 localStorage

### 阶段 2: 核心组件（2-3 天）

**任务**:
- [ ] 实现 ToolMenu 组件
- [ ] 实现 ToolSection 组件
- [ ] 实现 ToolItem 组件
- [ ] 编写组件单元测试

**验收标准**:
- 工具菜单可正常显示/隐藏工具
- 工具列表按组折叠展示
- 工具卡片支持编辑/删除
- 测试覆盖率 > 80%

### 阶段 3: 工具配置（3-4 天）

**任务**:
- [ ] 实现 Plugin 配置面板
- [ ] 实现 Workflow 配置面板
- [ ] 实现 Knowledge 配置面板
- [ ] 实现表单验证逻辑

**验收标准**:
- 每个工具有独立配置面板
- 表单验证完善（必填项、格式校验）
- 配置数据正确保存到 Store

### 阶段 4: 集成与优化（1-2 天）

**任务**:
- [ ] 集成到 Agent 编辑器
- [ ] 添加空状态和加载状态
- [ ] 性能优化（懒加载、虚拟滚动）
- [ ] 用户体验打磨

**验收标准**:
- Agent 编辑器完整集成工具管理
- 流畅的用户体验（无卡顿）
- 友好的错误处理和提示

**总计**: 7-11 天

## 九、扩展方向

### 9.1 工具市场

未来可扩展为工具市场，支持：
- 官方工具库浏览
- 社区工具分享
- 一键安装工具
- 工具评分和评论

### 9.2 工具编排

支持工具之间的协作：
- 工具调用链可视化
- 工具输出 → 工具输入映射
- 条件分支和循环逻辑

### 9.3 工具调试

增强调试能力：
- 工具调用日志
- 输入输出预览
- 性能分析报告
- 错误堆栈追踪

### 9.4 工具模板

提供常用场景模板：
- 客服助手工具套件
- 数据分析工具套件
- 内容创作工具套件
- 一键导入工具配置

---

**文档状态**: ✅ 完成
**下一步**: 创建 [13-agent-ide-chat.md] - 聊天调试区文档
