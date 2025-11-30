# Workflow - 节点系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-workflow/playground/node-registries`, `@coze-workflow/nodes`

## 一、概述

节点系统是 Workflow 的核心，定义了工作流中每个节点的行为、配置和数据流。本文档深度剖析 Coze Studio 的节点系统架构，并提供 Coze Lite 的简化实现方案。

### 1.1 核心节点类型

| 节点 | 用途 | Coze Studio | Coze Lite |
|------|------|-------------|-----------|
| **Start** | 工作流入口 | ✅ | ✅ |
| **End** | 工作流出口 | ✅ | ✅ |
| **LLM** | 大模型对话 | ✅ | ✅ |
| **Code** | Python/JS 代码 | ✅ | ✅ |
| **API** | HTTP 请求 | ✅ | ✅ |
| **If** | 条件分支 | ✅ | ✅ |
| **Loop** | 循环处理 | ✅ | ❌ |
| **Variable** | 变量存储 | ✅ | ✅ |
| **Database** | 数据库查询 | ✅ | ✅ |

### 1.2 节点注册机制

**Coze Studio**: 使用 `WorkflowNodeRegistry` 接口统一注册
**Coze Lite**: 使用简化的节点配置对象

## 二、Coze Studio 节点架构

### 2.1 节点注册接口

**文件**: `base/src/types/registry.ts:18-85`

```typescript
export interface WorkflowNodeRegistry<NodeTestMeta = any> {
  type: StandardNodeType;           // 节点类型
  meta: NodeMeta<NodeTestMeta>;     // 节点元数据
  formMeta: FormMetaV2;             // 表单配置
  variablesMeta?: WorkflowNodeVariablesMeta;  // 变量元数据

  // 生命周期钩子
  onInit?: (nodeJSON: WorkflowNodeJSON, context: any) => Promise<void>;
  checkError?: (nodeJSON: WorkflowNodeJSON, context: any) => string | undefined;
  onDispose?: (nodeJSON: WorkflowNodeJSON, context: any) => void;
  beforeNodeSubmit?: (node: WorkflowNodeJSON) => WorkflowNodeJSON;

  // 自定义方法
  getNodeInputParameters?: (node: FlowNodeEntity) => InputValueVO[];
  getNodeOutputs?: (node: FlowNodeEntity) => OutputValueVO[];
}

export interface NodeMeta<NodeTest = any> {
  nodeDTOType: StandardNodeType;
  size?: { width: number; height: number };
  isStart?: boolean;
  isNodeEnd?: boolean;
  deleteDisable?: boolean;
  copyDisable?: boolean;
  nodeMetaPath?: string;
  inputParametersPath?: string;
  outputsPath?: string;
  helpLink?: string;
}
```

### 2.2 表单引擎 (FormMetaV2)

```typescript
export interface FormMetaV2<FormData> {
  // 表单渲染
  render: (props: FormRenderProps<FormData>) => React.ReactElement;

  // 验证触发时机
  validateTrigger: ValidateTrigger;

  // 验证规则（支持路径匹配）
  validate: {
    [path: string]: Validate;
  };

  // 副作用（字段变化时执行）
  effect?: {
    [path: string]: Effect;
  };

  // 数据转换
  formatOnInit?: (value: any, context: NodeContext) => FormData;
  formatOnSubmit?: (value: FormData, context: NodeContext) => any;
}
```

### 2.3 节点示例 - Code 节点

**文件**: `playground/src/node-registries/code/node-registry.ts`

```typescript
export const CODE_NODE_REGISTRY: WorkflowNodeRegistry = {
  type: StandardNodeType.Code,
  meta: {
    nodeDTOType: StandardNodeType.Code,
    size: { width: 360, height: 130 },
    nodeMetaPath: '/nodeMeta',
    outputsPath: '/outputs',
    inputParametersPath: '/inputs/inputParameters',
    helpLink: '/open/docs/guides/code_node',
  },
  formMeta: CODE_FORM_META,
};
```

**表单配置**:

```typescript
export const CODE_FORM_META: FormMetaV2<FormData> = {
  render: () => <CodeFormRender />,
  validateTrigger: ValidateTrigger.onChange,

  validate: {
    nodeMeta: nodeMetaValidate,
    inputParameters: createInputTreeValidator(),
    code: ({ value }) => !value ? '请输入代码' : undefined,
    outputs: outputTreeMetaValidator,
  },

  effect: {
    nodeMeta: fireNodeTitleChange,
    outputs: provideNodeOutputVariablesEffect,
  },

  formatOnInit: (value) => ({
    nodeMeta: value?.nodeMeta,
    inputParameters: value?.inputs?.inputParameters || [],
    code: value?.inputs?.code || '',
    language: value?.inputs?.language || 'python',
    outputs: value?.outputs || [],
  }),

  formatOnSubmit: (value) => ({
    nodeMeta: value.nodeMeta,
    inputs: {
      inputParameters: value.inputParameters,
      code: value.code,
      language: value.language,
    },
    outputs: value.outputs,
  }),
};
```

## 三、Coze Lite 设计方案

### 3.1 简化的节点配置

**文件**: `frontend/src/config/workflow-nodes.ts`

```typescript
import { z } from 'zod';

export interface NodeConfig {
  type: NodeType;
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  category: 'basic' | 'ai' | 'logic' | 'data';

  // 配置表单 Schema (使用 Zod)
  configSchema: z.ZodType<any>;

  // 默认配置
  defaultConfig: Record<string, any>;

  // 输入输出定义
  inputs?: PortConfig[];
  outputs?: PortConfig[];

  // 配置表单组件
  ConfigForm: React.ComponentType<NodeConfigFormProps>;
}

interface PortConfig {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
}

interface NodeConfigFormProps {
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  errors?: Record<string, string>;
}
```

### 3.2 节点配置示例 - LLM 节点

```typescript
import { z } from 'zod';
import { IconRobot } from '@arco-design/web-react/icon';
import { LLMNodeConfigForm } from './LLMNodeConfigForm';

export const LLM_NODE_CONFIG: NodeConfig = {
  type: NodeType.LLM,
  label: 'LLM 节点',
  description: '调用大语言模型进行对话',
  icon: <IconRobot />,
  color: '#3b82f6',
  category: 'ai',

  // Zod Schema 验证
  configSchema: z.object({
    model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3']),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(4000).default(1000),
    systemPrompt: z.string().optional(),
    userPrompt: z.string().min(1, '用户提示词不能为空'),
  }),

  defaultConfig: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: '',
    userPrompt: '',
  },

  inputs: [
    { id: 'input', label: '输入', type: 'string', required: true },
  ],

  outputs: [
    { id: 'output', label: '输出', type: 'string' },
  ],

  ConfigForm: LLMNodeConfigForm,
};
```

### 3.3 节点配置表单组件

**文件**: `frontend/src/components/workflow/nodes/LLMNodeConfigForm.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Select, Slider, TextArea } from '@arco-design/web-react';
import { LLM_NODE_CONFIG } from '@/config/workflow-nodes';

const FormItem = Form.Item;

export function LLMNodeConfigForm({ value, onChange, errors }: NodeConfigFormProps) {
  const { register, watch, setValue, formState } = useForm({
    resolver: zodResolver(LLM_NODE_CONFIG.configSchema),
    defaultValues: value,
  });

  // 监听变化并同步到父组件
  useEffect(() => {
    const subscription = watch((formData) => {
      onChange(formData as any);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange]);

  return (
    <Form layout="vertical">
      {/* 模型选择 */}
      <FormItem label="模型" validateStatus={formState.errors.model ? 'error' : undefined}>
        <Select
          {...register('model')}
          value={watch('model')}
          onChange={(value) => setValue('model', value)}
        >
          <Select.Option value="gpt-4">GPT-4</Select.Option>
          <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
          <Select.Option value="claude-3">Claude 3</Select.Option>
        </Select>
      </FormItem>

      {/* 温度 */}
      <FormItem label="温度">
        <Slider
          {...register('temperature')}
          value={watch('temperature')}
          onChange={(value) => setValue('temperature', value)}
          min={0}
          max={2}
          step={0.1}
          marks={{ 0: '0', 1: '1', 2: '2' }}
        />
      </FormItem>

      {/* 最大 Token */}
      <FormItem label="最大 Token">
        <Input
          {...register('maxTokens', { valueAsNumber: true })}
          type="number"
          min={1}
          max={4000}
        />
      </FormItem>

      {/* 系统提示词 */}
      <FormItem label="系统提示词">
        <TextArea
          {...register('systemPrompt')}
          placeholder="定义 AI 的角色和行为..."
          rows={3}
        />
      </FormItem>

      {/* 用户提示词 */}
      <FormItem
        label="用户提示词"
        required
        validateStatus={formState.errors.userPrompt ? 'error' : undefined}
        help={formState.errors.userPrompt?.message}
      >
        <TextArea
          {...register('userPrompt')}
          placeholder="输入提示词模板，使用 {input} 引用变量..."
          rows={5}
        />
      </FormItem>
    </Form>
  );
}
```

### 3.4 节点 Store

**文件**: `frontend/src/stores/workflowNodeStore.ts`

```typescript
import { create } from 'zustand';
import { NODE_CONFIGS } from '@/config/workflow-nodes';

interface WorkflowNodeState {
  // 节点配置注册表
  nodeConfigs: Map<NodeType, NodeConfig>;

  // 获取节点配置
  getNodeConfig: (type: NodeType) => NodeConfig | undefined;

  // 验证节点配置
  validateNodeConfig: (type: NodeType, config: any) => {
    success: boolean;
    errors?: Record<string, string>;
  };

  // 获取节点默认配置
  getDefaultConfig: (type: NodeType) => Record<string, any>;
}

export const useWorkflowNodeStore = create<WorkflowNodeState>((set, get) => ({
  nodeConfigs: new Map(NODE_CONFIGS.map(config => [config.type, config])),

  getNodeConfig: (type) => {
    return get().nodeConfigs.get(type);
  },

  validateNodeConfig: (type, config) => {
    const nodeConfig = get().getNodeConfig(type);
    if (!nodeConfig) {
      return { success: false, errors: { _: '未知节点类型' } };
    }

    try {
      nodeConfig.configSchema.parse(config);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {} as Record<string, string>);
        return { success: false, errors };
      }
      return { success: false, errors: { _: '验证失败' } };
    }
  },

  getDefaultConfig: (type) => {
    const nodeConfig = get().getNodeConfig(type);
    return nodeConfig?.defaultConfig || {};
  },
}));
```

### 3.5 节点配置面板

**文件**: `frontend/src/components/workflow/NodeConfigPanel/index.tsx`

```typescript
import { useWorkflowNodeStore } from '@/stores/workflowNodeStore';
import { useReactFlow } from 'reactflow';
import { Drawer, Button, Message } from '@arco-design/web-react';

interface NodeConfigPanelProps {
  nodeId: string;
  visible: boolean;
  onClose: () => void;
}

export function NodeConfigPanel({ nodeId, visible, onClose }: NodeConfigPanelProps) {
  const reactFlow = useReactFlow();
  const { getNodeConfig, validateNodeConfig } = useWorkflowNodeStore();

  const node = reactFlow.getNode(nodeId);
  if (!node) return null;

  const nodeConfig = getNodeConfig(node.type as NodeType);
  if (!nodeConfig) return null;

  const [config, setConfig] = useState(node.data.config || nodeConfig.defaultConfig);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    // 验证配置
    const validation = validateNodeConfig(node.type as NodeType, config);
    if (!validation.success) {
      setErrors(validation.errors || {});
      Message.error('配置验证失败，请检查输入');
      return;
    }

    // 更新节点
    reactFlow.setNodes(nodes =>
      nodes.map(n =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config } }
          : n
      )
    );

    Message.success('保存成功');
    onClose();
  };

  const ConfigForm = nodeConfig.ConfigForm;

  return (
    <Drawer
      title={`配置 ${nodeConfig.label}`}
      visible={visible}
      onCancel={onClose}
      width={500}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            取消
          </Button>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </div>
      }
    >
      <ConfigForm value={config} onChange={setConfig} errors={errors} />
    </Drawer>
  );
}
```

## 四、核心节点实现

### 4.1 Code 节点配置

```typescript
export const CODE_NODE_CONFIG: NodeConfig = {
  type: NodeType.CODE,
  label: '代码节点',
  description: '执行 Python 或 JavaScript 代码',
  icon: <IconCode />,
  color: '#10b981',
  category: 'logic',

  configSchema: z.object({
    language: z.enum(['python', 'javascript']),
    code: z.string().min(1, '代码不能为空'),
    inputVariables: z.array(z.object({
      name: z.string(),
      type: z.string(),
    })).default([]),
    outputVariables: z.array(z.object({
      name: z.string(),
      type: z.string(),
    })).default([]),
  }),

  defaultConfig: {
    language: 'python',
    code: '# 输入代码\nresult = input_value\nreturn result',
    inputVariables: [{ name: 'input_value', type: 'string' }],
    outputVariables: [{ name: 'result', type: 'string' }],
  },

  ConfigForm: CodeNodeConfigForm,
};
```

### 4.2 If 节点配置

```typescript
export const IF_NODE_CONFIG: NodeConfig = {
  type: NodeType.IF,
  label: '条件分支',
  description: '根据条件选择执行分支',
  icon: <IconBranch />,
  color: '#f59e0b',
  category: 'logic',

  configSchema: z.object({
    conditions: z.array(z.object({
      left: z.string(),
      operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'contains']),
      right: z.string(),
    })).min(1, '至少需要一个条件'),
    logic: z.enum(['and', 'or']).default('and'),
  }),

  defaultConfig: {
    conditions: [
      { left: '', operator: '==', right: '' },
    ],
    logic: 'and',
  },

  // 动态输出端口
  outputs: [
    { id: 'true', label: '满足条件', type: 'string' },
    { id: 'false', label: '不满足条件', type: 'string' },
  ],

  ConfigForm: IfNodeConfigForm,
};
```

### 4.3 Variable 节点配置

```typescript
export const VARIABLE_NODE_CONFIG: NodeConfig = {
  type: NodeType.VARIABLE,
  label: '变量节点',
  description: '设置或获取变量值',
  icon: <IconStorage />,
  color: '#8b5cf6',
  category: 'data',

  configSchema: z.object({
    operation: z.enum(['set', 'get']),
    variableName: z.string().min(1, '变量名不能为空'),
    variableType: z.enum(['string', 'number', 'boolean', 'object']),
    value: z.any().optional(),
  }),

  defaultConfig: {
    operation: 'set',
    variableName: '',
    variableType: 'string',
    value: '',
  },

  ConfigForm: VariableNodeConfigForm,
};
```

## 五、最佳实践

### 5.1 表单验证

使用 Zod 进行类型安全的验证：

```typescript
const schema = z.object({
  prompt: z.string()
    .min(1, '提示词不能为空')
    .max(5000, '提示词不能超过 5000 字符'),
  temperature: z.number()
    .min(0, '温度不能小于 0')
    .max(2, '温度不能大于 2'),
});

// 验证
const result = schema.safeParse(config);
if (!result.success) {
  console.error(result.error.format());
}
```

### 5.2 变量引用

使用 `{variable_name}` 语法引用其他节点输出：

```typescript
const promptTemplate = `请总结以下内容：{llm_node_1.output}`;

// 解析变量引用
function parseVariableReferences(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// 替换变量
function replaceVariables(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
```

### 5.3 节点数据持久化

```typescript
// 保存节点配置
const saveNodeConfig = async (nodeId: string, config: any) => {
  const node = reactFlow.getNode(nodeId);
  if (!node) return;

  // 更新本地状态
  reactFlow.setNodes(nodes =>
    nodes.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, config } }
        : n
    )
  );

  // 同步到后端
  await fetch(`/api/workflows/nodes/${nodeId}`, {
    method: 'PUT',
    body: JSON.stringify({ config }),
  });
};
```

## 六、扩展方向

### 6.1 自定义节点类型

```typescript
// 注册自定义节点
export const CUSTOM_NODE_CONFIG: NodeConfig = {
  type: 'custom_weather' as NodeType,
  label: '天气查询',
  description: '查询指定城市的天气',
  icon: <IconCloud />,
  color: '#06b6d4',
  category: 'custom',

  configSchema: z.object({
    city: z.string().min(1, '请输入城市名'),
    apiKey: z.string().min(1, '请输入 API Key'),
  }),

  defaultConfig: {
    city: '北京',
    apiKey: '',
  },

  ConfigForm: WeatherNodeConfigForm,
};

// 添加到配置列表
NODE_CONFIGS.push(CUSTOM_NODE_CONFIG);
```

### 6.2 节点模板

```typescript
export const NODE_TEMPLATES = [
  {
    name: '文本摘要',
    description: 'LLM 节点模板，用于文本摘要',
    nodes: [
      {
        type: NodeType.LLM,
        config: {
          model: 'gpt-4',
          userPrompt: '请总结以下内容：{input}',
        },
      },
    ],
  },
  // ... 更多模板
];
```

---

**文档状态**: ✅ 完成
**下一步**: 创建 [18-workflow-playground.md] 和 [19-workflow-sdk.md]
