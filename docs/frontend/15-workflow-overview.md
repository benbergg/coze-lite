# Workflow - 工作流系统总览

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-workflow/*`

## 一、概述

Workflow（工作流）是 Coze Studio 的核心功能之一，允许用户通过可视化的方式编排复杂的 AI 任务流程。本文档深度剖析 Coze Studio 的 Workflow 系统架构，并提供 Coze Lite 的简化实现方案。

### 1.1 核心功能

- **可视化编辑**: 拖拽式节点编辑，支持自由布局
- **丰富节点类型**: LLM、API、代码、知识库、条件分支、循环等 20+ 种节点
- **变量系统**: 强大的变量引用和数据流管理
- **调试运行**: 支持单步调试、变量查看、日志输出
- **历史记录**: 完整的撤销/重做功能
- **子工作流**: 支持工作流嵌套和复用

### 1.2 应用场景

| 场景 | 示例 | 节点组合 |
|------|------|----------|
| **智能客服** | 多轮对话 + 知识库检索 | Start → LLM → Knowledge → If → End |
| **数据处理** | 批量处理文档并分类 | Start → Loop → Code → API → End |
| **内容生成** | 自动生成文章并配图 | Start → LLM → Code → ImageFlow → End |
| **自动化任务** | 定时爬虫 + 数据分析 | Start → API → Code → Database → End |

### 1.3 Coze Studio vs Coze Lite

| 功能 | Coze Studio | Coze Lite | 说明 |
|------|-------------|-----------|------|
| 节点类型 | 20+ 种 | 8 种 | 保留核心节点 |
| 画布引擎 | Flowgram.ai | React Flow | 使用轻量级方案 |
| 子工作流 | 支持 | 不支持 | 简化复杂度 |
| 历史记录 | 完整 | 基础 | 仅支持撤销/重做 |
| 批量处理 | 支持 | 不支持 | MVP 不包含 |

## 二、Coze Studio 架构分析

### 2.1 整体架构

Coze Studio 的 Workflow 系统采用**分层插件化架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                     WorkflowPlayground                       │
│  (主编辑器容器 - DnD + QueryClient + ErrorBoundary)         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  WorkflowRenderProvider                      │
│  (渲染引擎 - 依赖注入容器 + 插件系统)                        │
├─────────────────────────────────────────────────────────────┤
│  Modules:                                                    │
│  • FlowDocumentContainerModule    (文档模型)                 │
│  • FlowRendererContainerModule    (渲染层)                   │
│  • WorkflowNodesContainerModule   (节点系统)                 │
│  • WorkflowHistoryContainerModule (历史记录)                 │
│                                                              │
│  Plugins:                                                    │
│  • FreeAutoLayoutPlugin  (自动布局)                          │
│  • FreeStackPlugin       (层级管理)                          │
│  • NodeCorePlugin        (节点核心)                          │
│  • FreeHistoryPlugin     (历史记录)                          │
│  • VariablePlugin        (变量系统)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Document    │  │   Renderer   │  │   Form       │
│  (文档模型)  │  │   (渲染层)   │  │   (表单)     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 核心包结构

**源码位置**: `/Users/lg/Projects/lab/coze-studio/frontend/packages/workflow/`

```bash
workflow/
├── base/                    # 基础包 - 核心类型定义、Store、API
│   ├── src/
│   │   ├── types/
│   │   │   ├── node.ts                # 节点类型定义
│   │   │   ├── node-type.ts           # 标准节点类型枚举
│   │   │   ├── dto.ts                 # 后端数据格式
│   │   │   ├── vo.ts                  # 前端视图格式
│   │   │   ├── view-variable-type.ts  # 变量类型系统
│   │   │   └── registry.ts            # 节点注册接口
│   │   ├── store/
│   │   │   └── workflow/index.ts      # Workflow Store (Zustand)
│   │   └── api/                       # API 请求封装
│
├── playground/              # 画布编辑器 - 主编辑器界面
│   ├── src/
│   │   ├── workflow-playground.tsx    # Playground 主组件
│   │   ├── node-registries/           # 节点注册实现
│   │   │   ├── start/
│   │   │   ├── end/
│   │   │   ├── llm/
│   │   │   ├── code/
│   │   │   └── ...
│   │   └── components/                # 编辑器 UI 组件
│
├── render/                  # 渲染引擎 - 节点和画布渲染
│   └── src/
│       └── workflow-render-provider.tsx
│
├── nodes/                   # 节点系统 - 节点数据模型和服务
│   └── src/
│       └── entity-datas/
│           └── workflow-node-data/
│
├── fabric-canvas/           # Fabric.js 画布 - 图像处理画布
│
├── variable/                # 变量系统
│   ├── src/
│   │   ├── ast/                       # 抽象语法树解析
│   │   ├── scope/                     # 变量作用域
│   │   └── expression/                # 表达式处理
│
├── history/                 # 历史记录和撤销/重做
│
├── test-run/                # 测试运行
│
└── components/              # 通用组件
```

### 2.3 底层画布引擎

Coze Studio 使用 **@flowgram-adapter/free-layout-editor** 作为底层画布引擎：

**依赖关系**:
```
@coze-workflow/playground
    ↓
@flowgram-adapter/free-layout-editor
    ↓
@flowgram.ai/core          (核心依赖注入)
@flowgram.ai/document      (文档和节点数据模型)
@flowgram.ai/free-layout-core (自由布局核心)
@flowgram.ai/renderer      (渲染层)
@flowgram.ai/form          (表单引擎 FormV2)
```

**特性**:
- **依赖注入**: 使用 Inversify 进行依赖注入
- **插件系统**: 高度可扩展的插件架构
- **表单引擎**: 强大的 FormV2 声明式表单系统
- **历史管理**: 完整的操作历史和撤销/重做

## 三、核心概念

### 3.1 数据模型

#### 3.1.1 Workflow 数据结构

**文件位置**: `base/src/types/node.ts:15-25`

```typescript
export interface WorkflowJSON {
  nodes: WorkflowNodeJSON[];  // 节点列表
  edges: WorkflowEdgeJSON[];  // 边（连接）列表
}
```

#### 3.1.2 节点 (Node) 数据结构

```typescript
export interface WorkflowNodeJSON<T = Record<string, unknown>> {
  id: string;                  // 节点唯一 ID
  type: StandardNodeType | string;  // 节点类型
  meta?: WorkflowNodeMeta;     // 元数据（位置、大小等）
  data: T;                     // 节点具体数据
  version?: string;            // 节点数据版本
  blocks?: WorkflowNodeJSON[]; // 子节点（Loop、If 等容器节点）
  edges?: WorkflowEdgeJSON[];  // 边连接
}

export interface WorkflowNodeMeta {
  position?: { x: number; y: number };  // 节点位置
  size?: { width: number; height: number };  // 节点大小
  title?: string;              // 节点标题
  desc?: string;               // 节点描述
}
```

#### 3.1.3 边 (Edge) 数据结构

```typescript
export interface WorkflowEdgeJSON {
  id: string;                  // 边唯一 ID
  source: string;              // 源节点 ID
  target: string;              // 目标节点 ID
  sourceHandle?: string;       // 源端口 ID（用于多输出节点）
  targetHandle?: string;       // 目标端口 ID
}
```

### 3.2 标准节点类型

**文件位置**: `base/src/types/node-type.ts:8-45`

```typescript
export enum StandardNodeType {
  // 基础节点
  Start = '1',           // 开始节点（必须）
  End = '2',             // 结束节点（必须）

  // LLM 节点
  LLM = '3',             // 大模型节点

  // 工具节点
  Api = '4',             // API/插件节点
  Code = '5',            // 代码节点（Python/JavaScript）
  Dataset = '6',         // 知识库节点

  // 控制流节点
  If = '8',              // 条件分支
  Loop = '21',           // 循环节点
  SubWorkflow = '9',     // 子工作流

  // 数据节点
  Variable = '11',       // 变量节点
  Database = '12',       // 数据库节点

  // 批处理节点
  Batch = '28',          // 批处理节点

  // 其他节点
  Answer = '7',          // 回复节点
  Question = '10',       // 问题节点
  // ... 还有更多节点类型
}
```

### 3.3 变量系统

#### 3.3.1 变量类型 (ViewVariableType)

**文件位置**: `base/src/types/view-variable-type.ts:10-60`

```typescript
export enum ViewVariableType {
  // 基础类型
  String = 1,            // 字符串
  Integer = 2,           // 整数
  Boolean = 3,           // 布尔值
  Number = 4,            // 浮点数
  Object = 6,            // 对象

  // 文件类型
  Image = 7,             // 图片
  File = 8,              // 文件
  Doc = 9,               // 文档
  Code = 10,             // 代码
  Audio = 11,            // 音频
  Video = 12,            // 视频

  // 数组类型（从 99 开始）
  ArrayString = 99,      // 字符串数组
  ArrayInteger = 100,    // 整数数组
  ArrayBoolean = 101,    // 布尔数组
  ArrayNumber = 102,     // 浮点数组
  ArrayObject = 105,     // 对象数组
  ArrayImage = 106,      // 图片数组
  // ... 更多数组类型
}
```

#### 3.3.2 变量表达式 (ValueExpression)

**文件位置**: `base/src/types/vo.ts:45-75`

```typescript
// 值表达式类型
export enum ValueExpressionType {
  LITERAL = 'literal',      // 字面量（硬编码值）
  REF = 'ref',              // 引用其他节点的输出
  OBJECT_REF = 'object_ref' // 对象引用
}

// 字面量表达式
export interface LiteralExpression {
  type: ValueExpressionType.LITERAL;
  content?: string | number | boolean | Array<unknown>;
  rawMeta?: ValueExpressionRawMeta;
}

// 引用表达式（引用其他节点的输出）
export interface RefExpression {
  type: ValueExpressionType.REF;
  content?: RefExpressionContent;  // { keyPath: string[] }
  rawMeta?: ValueExpressionRawMeta;
}

// KeyPath 示例：["node_id", "output_key", "nested_key"]
// 表示：node_id.output_key.nested_key
```

#### 3.3.3 输入输出值对象

```typescript
// 节点输入值
export interface InputValueVO {
  name?: string;             // 输入参数名
  input: ValueExpression;    // 输入值表达式
  children?: InputValueVO[]; // 嵌套输入（对象类型）
}

// 节点输出值
export interface OutputValueVO {
  key: string;               // 输出键名
  name: string;              // 输出显示名称
  type: ViewVariableType;    // 输出类型
  description?: string;      // 输出描述
  children?: OutputValueVO[]; // 嵌套输出（对象类型）
}
```

### 3.4 节点注册系统

**文件位置**: `base/src/types/registry.ts:18-85`

每个节点通过注册对象定义其行为：

```typescript
export interface WorkflowNodeRegistry<NodeTestMeta = any> {
  type: string;                 // 节点类型
  meta: NodeMeta<NodeTestMeta>; // 节点元数据
  formMeta?: FormMetaV2;        // 表单定义
  variablesMeta?: WorkflowNodeVariablesMeta; // 变量元数据

  // 生命周期钩子
  getNodeInputParameters?: (node: FlowNodeEntity) => InputValueVO[];
  getNodeOutputs?: (node: FlowNodeEntity) => OutputValueVO[];
  beforeNodeSubmit?: (node: WorkflowNodeJSON) => WorkflowNodeJSON;
  onInit?: (nodeJSON: WorkflowNodeJSON, context: any) => Promise<void>;
  checkError?: (nodeJSON: WorkflowNodeJSON, context: any) => string | undefined;
  onDispose?: (nodeJSON: WorkflowNodeJSON, context: any) => void;
}

export interface NodeMeta<NodeTest = any> {
  nodeDTOType: StandardNodeType;  // 节点类型
  size?: { width: number; height: number };  // 默认大小
  defaultPorts?: Array<any>;      // 默认端口

  isStart?: boolean;              // 是否为开始节点
  isNodeEnd?: boolean;            // 是否为结束节点
  deleteDisable?: boolean;        // 禁止删除
  copyDisable?: boolean;          // 禁止复制

  nodeMetaPath?: string;          // 节点元数据路径
  inputParametersPath?: string;   // 输入参数路径
  outputsPath?: string;           // 输出路径

  helpLink?: string;              // 帮助文档链接
  test?: NodeTest;                // 测试配置
}
```

**节点注册示例 - End 节点**:

**文件位置**: `playground/src/node-registries/end/node-registry.ts:15-30`

```typescript
export const END_NODE_REGISTRY: WorkflowNodeRegistry = {
  type: StandardNodeType.End,
  meta: {
    isNodeEnd: true,             // 标记为结束节点
    deleteDisable: true,         // 不可删除
    copyDisable: true,           // 不可复制
    headerReadonly: true,        // 标题只读
    nodeDTOType: StandardNodeType.End,
    size: { width: 360, height: 78.2 },
    nodeMetaPath: DEFAULT_NODE_META_PATH,
    inputParametersPath: INPUT_PATH,
    defaultPorts: [{ type: 'input' }],  // 只有输入端口
    helpLink: '/open/docs/guides/start_end_node',
  },
  formMeta: END_FORM_META,       // 表单定义
};
```

### 3.5 表单引擎 (FormV2)

**文件位置**: `playground/src/node-registries/end/form-meta.tsx:35-75`

Workflow 使用声明式表单引擎 FormV2：

```typescript
export const END_FORM_META: FormMetaV2<FormData> = {
  // 表单渲染组件
  render: () => <FormRender />,

  // 验证触发时机
  validateTrigger: ValidateTrigger.onChange,

  // 验证规则
  validate: {
    nodeMeta: nodeMetaValidate,  // 节点元数据验证
    ...createInputsValidator(true),  // 输入验证
    ['inputs.content']: createAnswerContentValidator({
      required: true,
      message: '请输入回复内容',
    }),
  },

  // 副作用管理（当某字段变化时触发）
  effect: {
    nodeMeta: fireNodeTitleChange,  // 标题变化时更新节点
  },

  // 数据转换
  formatOnInit: transformOnInit,      // 后端数据 → 表单数据
  formatOnSubmit: transformOnSubmit,  // 表单数据 → 后端数据
};
```

**FormV2 核心特性**:
1. **声明式**: 通过 FormMeta 对象定义表单
2. **验证系统**: 支持同步和异步验证
3. **副作用管理**: Effect 系统处理字段变化副作用
4. **数据转换**: 双向转换（DTO ↔ VO）
5. **字段级别控制**: Field、FieldArray 组件

## 四、状态管理

### 4.1 Workflow Store (Zustand)

**文件位置**: `base/src/store/workflow/index.ts:12-38`

```typescript
interface WorkflowStoreState {
  nodes: WorkflowNodeJSON[];      // 节点列表
  edges: WorkflowEdgeJSON[];      // 边列表
  isCreatingWorkflow: boolean;    // 是否正在创建工作流
}

interface WorkflowStoreAction {
  setNodes: (value: WorkflowNodeJSON[]) => void;
  setEdges: (value: WorkflowEdgeJSON[]) => void;
  setIsCreatingWorkflow: (value: boolean) => void;
}

export const useWorkflowStore = create<WorkflowStoreState & WorkflowStoreAction>()(
  devtools(set => ({
    nodes: [],
    edges: [],
    isCreatingWorkflow: false,

    setNodes: nodes => set({ nodes: nodes ?? [] }),
    setEdges: edges => set({ edges: edges ?? [] }),
    setIsCreatingWorkflow: value => set({ isCreatingWorkflow: value }),
  }), {
    name: 'WorkflowStore',
    enabled: IS_DEV_MODE,
  })
);
```

### 4.2 节点数据实体 (WorkflowNodeData)

**文件位置**: `nodes/src/entity-datas/workflow-node-data/workflow-node-data.ts:18-55`

节点数据通过 EntityData 模式管理：

```typescript
export class WorkflowNodeData extends EntityData {
  private nodeData;
  private hasSetNodeData = false;

  // 设置节点数据（仅允许一次，防止重复初始化）
  setNodeData<T extends keyof NodeData>(data: NodeData[T]) {
    if (this.hasSetNodeData) {
      console.warn(`node ${this.entity.id} has already set WorkflowNodeData`);
      return;
    }
    this.nodeData = { ...data };
    this.hasSetNodeData = true;
  }

  // 更新节点数据（仅非只读字段）
  updateNodeData<T extends keyof NodeData>(
    data: Partial<EditAbleNodeData<T>>
  ) {
    this.nodeData = { ...this.nodeData, ...data };
  }

  // 获取节点数据
  getNodeData<T extends keyof NodeData>(): NodeData[T] {
    return this.nodeData;
  }
}
```

## 五、渲染系统

### 5.1 WorkflowRenderProvider

**文件位置**: `render/src/workflow-render-provider.tsx:28-65`

```typescript
export const WorkflowRenderProvider = (props: WorkflowRenderProviderProps) => {
  // 依赖注入容器模块
  const modules = useMemo(() => [
    FlowDocumentContainerModule,      // 默认文档模块
    FlowRendererContainerModule,      // 默认渲染模块
    WorkflowDocumentContainerModule,  // 扩展文档模块
    WorkflowRenderContainerModule,    // 扩展渲染模块
    ...(props.containerModules || []),
  ], [props.containerModules]);

  // 插件预设
  const preset = useCallback(() => [
    createFreeAutoLayoutPlugin({}),   // 自动布局插件
    createFreeStackPlugin({}),        // 层级管理插件
    createNodeCorePlugin({}),         // 节点核心插件
    ...(props.preset?.() || []),
  ], [props.preset]);

  return (
    <PlaygroundReactProvider
      containerModules={modules}
      plugins={preset}
      parentContainer={props.parentContainer}
    >
      <WorkflowLoader />
      {props.children}
    </PlaygroundReactProvider>
  );
};
```

### 5.2 WorkflowPlayground 主组件

**文件位置**: `playground/src/workflow-playground.tsx:45-75`

```typescript
export const WorkflowPlayground = forwardRef<
  WorkflowPlaygroundRef,
  WorkflowPlaygroundProps
>(({ spaceId, parentContainer, ...props }, ref) => {
  const preset = useWorkflowPreset(props);

  return (
    <DndProvider backend={HTML5Backend} context={window}>
      <QueryClientProvider client={workflowQueryClient}>
        <WorkflowRenderProvider
          parentContainer={parentContainer}
          containerModules={[
            WorkflowNodesContainerModule,    // 节点系统
            WorkflowPageContainerModule,     // 页面容器
            WorkflowHistoryContainerModule,  // 历史记录
          ]}
          preset={preset}
        >
          <PlayGroundErrorBoundary>
            <WorkflowContainer
              ref={ref}
              {...props}
              spaceId={spaceId}
            />
          </PlayGroundErrorBoundary>
        </WorkflowRenderProvider>
      </QueryClientProvider>
    </DndProvider>
  );
});
```

## 六、核心设计理念

### 6.1 插件化架构

- **依赖注入**: 使用 Inversify 进行依赖注入管理
- **贡献点**: ContainerModule 和 Contribution 模式
- **插件系统**: Plugin、PluginCreator 模式实现高度可扩展性

### 6.2 数据流转

```
后端 API 数据 (DTO)
        ↓
  formatOnInit
        ↓
前端表单数据 (VO)
        ↓
   用户编辑
        ↓
  formatOnSubmit
        ↓
后端 API 数据 (DTO)
```

**关键点**:
1. **DTO (Data Transfer Object)**: 后端数据格式
2. **VO (View Object)**: 前端视图数据格式
3. **双向转换**: 确保前后端数据一致性

### 6.3 节点生命周期

```
节点创建
    ↓
onInit (初始化)
    ↓
渲染表单 (FormV2)
    ↓
用户编辑
    ↓
validate (验证)
    ↓
beforeNodeSubmit (提交前处理)
    ↓
保存到 Store
    ↓
onDispose (销毁)
```

### 6.4 变量作用域

```
Workflow 全局作用域
    ├── Start 节点输出
    ├── LLM 节点输出
    ├── API 节点输出
    └── Loop 节点作用域
            ├── Loop Item (循环项变量)
            ├── Loop Index (循环索引变量)
            └── 子节点作用域
```

**作用域规则**:
- 子节点可以访问父节点的输出
- 循环节点内部有独立的作用域
- 变量引用通过 KeyPath 追踪（如 `["llm_node_1", "output", "text"]`）

## 七、Coze Lite 设计方案

### 7.1 简化策略

| 模块 | Coze Studio | Coze Lite | 简化说明 |
|------|-------------|-----------|----------|
| 画布引擎 | Flowgram.ai | React Flow | 轻量级开源方案 |
| 节点类型 | 20+ 种 | 8 种 | Start, End, LLM, Code, API, If, Variable, Database |
| 表单引擎 | FormV2 | React Hook Form | 常用表单库 |
| 变量系统 | AST 解析 | 简化引用 | 字符串模板 |
| 历史记录 | 完整插件 | 基础实现 | 仅撤销/重做 |
| 子工作流 | 支持 | 不支持 | 减少复杂度 |

### 7.2 核心节点类型

```typescript
export enum NodeType {
  // 必需节点
  START = 'start',
  END = 'end',

  // LLM 节点
  LLM = 'llm',

  // 工具节点
  CODE = 'code',
  API = 'api',

  // 控制流
  IF = 'if',

  // 数据节点
  VARIABLE = 'variable',
  DATABASE = 'database',
}
```

### 7.3 技术栈选型

```typescript
// 画布引擎
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState
} from 'reactflow';

// 表单管理
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 状态管理
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 拖拽
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
```

### 7.4 数据模型简化

```typescript
// Workflow 数据结构
export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

// 节点数据结构
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
    inputs?: Record<string, any>;
    outputs?: Record<string, any>;
  };
}

// 边数据结构
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}
```

## 八、实施路线图

### 阶段 1: 基础架构（2-3 天）

**任务**:
- [ ] 定义 Workflow 数据模型
- [ ] 实现 WorkflowStore (Zustand)
- [ ] 集成 React Flow
- [ ] 实现基础画布组件

**验收标准**:
- 类型定义完整
- 可创建空白工作流
- 画布支持拖拽和缩放

### 阶段 2: 核心节点（3-4 天）

**任务**:
- [ ] 实现 Start/End 节点
- [ ] 实现 LLM 节点
- [ ] 实现 Code 节点
- [ ] 实现 API 节点
- [ ] 实现节点配置面板

**验收标准**:
- 8 种核心节点可正常使用
- 节点配置表单完整
- 节点间可正常连线

### 阶段 3: 变量系统（2-3 天）

**任务**:
- [ ] 实现变量引用解析
- [ ] 实现变量选择器组件
- [ ] 实现变量预览功能
- [ ] 实现节点输出追踪

**验收标准**:
- 节点可引用其他节点输出
- 变量选择器交互流畅
- 变量类型校验正确

### 阶段 4: 执行引擎（3-4 天）

**任务**:
- [ ] 实现工作流执行引擎
- [ ] 实现单步调试
- [ ] 实现日志记录
- [ ] 实现错误处理

**验收标准**:
- 工作流可正常执行
- 支持单步调试
- 错误信息清晰

### 阶段 5: 优化与测试（2-3 天）

**任务**:
- [ ] 性能优化
- [ ] 历史记录（撤销/重做）
- [ ] 数据持久化
- [ ] E2E 测试

**验收标准**:
- 画布性能流畅（>60fps）
- 撤销/重做正常工作
- 数据可靠保存

**总计**: 12-17 天

## 九、扩展方向

### 9.1 高级节点

未来可扩展的节点类型：

- **Loop 节点**: 批量处理数据
- **SubWorkflow 节点**: 工作流复用
- **Parallel 节点**: 并行执行多个分支
- **Wait 节点**: 延迟执行
- **Webhook 节点**: 触发外部服务

### 9.2 协作功能

- **实时协作**: 多人同时编辑工作流
- **版本控制**: 工作流版本历史
- **权限管理**: 查看/编辑权限
- **评论系统**: 节点级别评论

### 9.3 可视化增强

- **小地图**: 全局视图导航
- **自动布局**: Dagre/ELK 算法优化布局
- **主题定制**: 暗黑模式、高对比度模式
- **节点分组**: Group 节点支持折叠

### 9.4 性能优化

- **虚拟化渲染**: 大规模节点场景优化
- **懒加载**: 节点配置面板按需加载
- **缓存策略**: 计算结果缓存
- **Web Worker**: 复杂计算移至后台线程

---

**文档状态**: ✅ 完成
**下一步**: 创建 [16-workflow-canvas.md] - 工作流画布文档
