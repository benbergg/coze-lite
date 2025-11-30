# Prompt 编辑器（Prompt Editor）

> 基于 Coze Studio 源码分析和 Coze Lite 设计的 Prompt 编辑器技术文档

## 目录

1. [概述](#概述)
2. [Coze Studio Prompt 架构分析](#coze-studio-prompt-架构分析)
3. [核心概念](#核心概念)
4. [编辑器组件设计](#编辑器组件设计)
5. [变量系统](#变量系统)
6. [Prompt 模板库](#prompt-模板库)
7. [语法高亮和自动补全](#语法高亮和自动补全)
8. [Coze Lite 实现方案](#coze-lite-实现方案)
9. [完整代码示例](#完整代码示例)
10. [最佳实践](#最佳实践)

---

## 概述

Prompt 编辑器是 Agent IDE 的核心组件之一，用于编辑 Agent 的系统提示词（System Prompt）。一个优秀的 Prompt 编辑器应该提供：

- **变量插入**：支持插入动态变量（如 `{{user_name}}`、`{{current_time}}`）
- **语法高亮**：高亮显示变量和特殊语法
- **自动补全**：提供变量和模板的自动补全
- **模板库**：内置常用 Prompt 模板
- **实时预览**：显示变量替换后的效果
- **历史记录**：保存 Prompt 的修改历史

### Prompt 的重要性

Prompt 是 AI Agent 的"灵魂"，它定义了：

- **角色设定**：Agent 扮演的角色（如客服、翻译、编程助手）
- **能力范围**：Agent 能做什么、不能做什么
- **回复风格**：正式/非正式、简洁/详细
- **约束条件**：不能违反的规则和限制

### Prompt 示例

```
你是一个专业的客服助手，名字叫{{agent_name}}。

你的主要职责：
1. 解答用户关于产品的问题
2. 协助用户完成订单操作
3. 记录和反馈用户的意见和建议

你可以使用以下工具：
{{available_tools}}

当前时间：{{current_time}}
用户信息：{{user_info}}

请始终保持礼貌和专业，用简洁明了的语言回答用户的问题。
```

---

## Coze Studio Prompt 架构分析

### 包结构

Coze Studio 的 Prompt 功能分布在多个包中：

```
packages/
├── agent-ide/
│   └── prompt/                     # Prompt 编辑器主包
│       ├── src/
│       │   ├── components/
│       │   │   ├── prompt-editor/  # 编辑器组件
│       │   │   └── prompt-view/    # Prompt 视图
│       │   ├── hooks/
│       │   │   └── use-prompt/     # Prompt 相关 Hooks
│       │   └── index.ts
│       └── package.json
└── common/
    ├── prompt-kit/                 # Prompt 工具包（Base + Adapter）
    │   ├── base/                   # 基础功能
    │   ├── adapter/                # 适配器
    │   └── main/                   # 主要功能
    │       ├── src/
    │       │   ├── prompt-library/  # Prompt 库
    │       │   └── prompt-recommend/ # Prompt 推荐
    │       └── package.json
    └── editor-plugins/             # 编辑器插件
```

### 核心文件分析

#### 1. PromptEditorEntry 组件

**文件**：`agent-ide/prompt/src/components/prompt-editor/index.tsx`

```typescript
export interface PromptEditorEntryProps {
  className?: string;
  isSingle: boolean;              // 是否单 Agent 模式
  editorExtensions?: React.ReactNode;  // 编辑器扩展
}

export const PromptEditorEntry: React.FC<PromptEditorEntryProps> = ({
  className,
  isSingle,
  editorExtensions,
}) => {
  // 从 PersonaStore 获取系统消息
  const { systemMessageData, setPersonaByImmer } = usePersonaStore(
    useShallow(state => ({
      systemMessageData: state.systemMessage.data,
      setPersonaByImmer: state.setPersonaByImmer,
    })),
  );

  const isReadonly = useBotDetailIsReadonly();

  const onChange = (value: string) => {
    setPersonaByImmer(persona => {
      persona.systemMessage.data = value;
    });
  };

  return (
    <Suspense fallback={<Spin />}>
      <AgentIdePrompt
        className={className}
        defaultValue={systemMessageData}
        onChange={onChange}
        readonly={isReadonly}
        isSingle={isSingle}
        editorExtensions={editorExtensions}
      />
    </Suspense>
  );
};
```

**关键设计点**：

1. **懒加载**：使用 `lazy()` 动态导入编辑器组件
2. **状态管理**：使用 Zustand 的 `usePersonaStore` 管理 Prompt 状态
3. **Immer 更新**：使用 `setPersonaByImmer` 实现不可变更新
4. **只读模式**：支持只读模式（如查看已发布的 Agent）
5. **模式切换**：支持单/多 Agent 模式

#### 2. PromptView 组件

**文件**：`agent-ide/prompt/src/components/prompt-view/index.tsx`

```typescript
export interface PromptViewProps {
  actionButton?: React.ReactNode;     // 操作按钮（如 Prompt 库）
  editorExtensions?: React.ReactNode; // 编辑器扩展
  className?: string;
}

export const PromptView: React.FC<PropsWithChildren<PromptViewProps>> = props => {
  const { actionButton, className, children, editorExtensions } = props;

  const isReadonly = useBotDetailIsReadonly();
  const mode = useBotInfoStore(innerS => innerS.mode);

  const isSingle = mode === BotMode.SingleMode;
  const isMulti = mode === BotMode.MultiMode;

  return (
    <div className={classNames(
      s['system-area'],
      isMulti && s['system-area-multi'],
    )}>
      <ToolContentBlock
        header={I18n.t('bot_persona_and_prompt')}
        actionButton={actionButton}
        collapsible={isMulti}
        defaultExpand
      >
        <PromptEditorEntry
          isSingle={isSingle}
          className={s['bot-debug-system']}
          editorExtensions={editorExtensions}
        />
        {children}
      </ToolContentBlock>
    </div>
  );
};
```

**PromptView 的作用**：

- 提供 Prompt 编辑器的容器
- 集成 `ToolContentBlock`（可折叠的内容块）
- 支持操作按钮（如打开 Prompt 库）
- 支持扩展内容（如变量列表）

#### 3. 依赖关系

**从 package.json 提取的关键依赖**：

```json
{
  "@coze-common/prompt-kit": "workspace:*",           // Prompt 工具包
  "@coze-common/prompt-kit-adapter": "workspace:*",   // Prompt 适配器
  "@coze-common/prompt-kit-base": "workspace:*",      // Prompt 基础
  "@coze-common/editor-plugins": "workspace:*",       // 编辑器插件
  "@coze-studio/bot-detail-store": "workspace:*"      // Bot 详情状态
}
```

### Prompt 库功能

Coze Studio 提供了完整的 Prompt 库功能：

```typescript
// 导出的 API
export { PromptLibrary } from './components/prompt-view/components/actions';
export { ImportToLibrary } from './components/prompt-view/components/actions';
export { useGetLibrarysData } from './hooks/use-prompt/use-get-library-data';
export { useAddLibrary } from './hooks/use-prompt/use-add-library';
```

---

## 核心概念

### 1. System Prompt（系统提示词）

**定义**：System Prompt 是发送给 AI 模型的第一条消息，定义 Agent 的角色和行为。

**结构**：

```
┌─────────────────────────────────────┐
│  System Prompt                      │
├─────────────────────────────────────┤
│                                     │
│  1. 角色设定                         │
│     - 你是谁                         │
│     - 你的能力                       │
│                                     │
│  2. 任务描述                         │
│     - 主要职责                       │
│     - 工作流程                       │
│                                     │
│  3. 工具和资源                       │
│     - 可用工具列表                   │
│     - 知识库引用                     │
│                                     │
│  4. 约束和规则                       │
│     - 必须遵守的规则                 │
│     - 禁止的行为                     │
│                                     │
│  5. 输出格式                         │
│     - 回复风格                       │
│     - 格式要求                       │
│                                     │
└─────────────────────────────────────┘
```

### 2. 变量（Variables）

**定义**：变量是 Prompt 中的动态占位符，在运行时被实际值替换。

**变量语法**：`{{variable_name}}`

**常用变量类型**：

```typescript
interface PromptVariable {
  name: string;                 // 变量名
  type: VariableType;          // 变量类型
  description: string;         // 描述
  defaultValue?: any;          // 默认值
  required: boolean;           // 是否必填
  source: VariableSource;      // 数据来源
}

enum VariableType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Array = 'array',
  Object = 'object',
}

enum VariableSource {
  System = 'system',       // 系统变量（如 current_time）
  User = 'user',           // 用户变量（如 user_name）
  Context = 'context',     // 上下文变量（如 conversation_history）
  Custom = 'custom',       // 自定义变量
}
```

**内置系统变量**：

```typescript
const SYSTEM_VARIABLES: PromptVariable[] = [
  {
    name: 'agent_name',
    type: VariableType.String,
    description: 'Agent 的名称',
    source: VariableSource.System,
    required: false,
  },
  {
    name: 'current_time',
    type: VariableType.String,
    description: '当前时间（ISO 8601 格式）',
    source: VariableSource.System,
    required: false,
  },
  {
    name: 'available_tools',
    type: VariableType.Array,
    description: '可用工具列表',
    source: VariableSource.System,
    required: false,
  },
  {
    name: 'user_name',
    type: VariableType.String,
    description: '用户名称',
    source: VariableSource.User,
    required: false,
  },
  {
    name: 'user_info',
    type: VariableType.Object,
    description: '用户信息',
    source: VariableSource.User,
    required: false,
  },
];
```

### 3. Prompt 模板

**定义**：预定义的 Prompt 结构，用户可以直接使用或修改。

**模板分类**：

- **角色模板**：客服、翻译、编程助手、写作助手等
- **任务模板**：数据分析、内容生成、问答等
- **行业模板**：电商、教育、医疗、金融等

**模板数据结构**：

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;          // 分类
  tags: string[];            // 标签
  content: string;           // Prompt 内容
  variables: PromptVariable[]; // 使用的变量
  author?: string;           // 作者
  rating?: number;           // 评分
  usageCount?: number;       // 使用次数
}
```

### 4. Prompt 库

**定义**：用户保存的常用 Prompt 集合，可以跨 Agent 复用。

**功能**：

- 保存当前 Prompt 到库
- 从库中导入 Prompt
- 搜索和筛选 Prompt
- 分享 Prompt 给团队

---

## 编辑器组件设计

### 组件层次结构

```
PromptEditor
├── PromptToolbar              # 工具栏
│   ├── VariableButton         # 插入变量按钮
│   ├── TemplateButton         # 模板库按钮
│   └── FormatButton           # 格式化按钮
├── PromptTextArea             # 文本编辑区域
│   ├── SyntaxHighlight        # 语法高亮
│   └── AutoComplete           # 自动补全
├── VariableList               # 变量列表
│   └── VariableCard           # 变量卡片
└── PromptPreview              # 预览区域（可选）
```

### 核心组件接口

```typescript
// 主编辑器组件
interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  showToolbar?: boolean;
  showVariableList?: boolean;
  showPreview?: boolean;
  variables?: PromptVariable[];
  onVariableInsert?: (variable: PromptVariable) => void;
}

// 工具栏组件
interface PromptToolbarProps {
  onInsertVariable: () => void;
  onOpenTemplates: () => void;
  onFormat: () => void;
  disabled?: boolean;
}

// 变量选择器
interface VariableSelectorProps {
  variables: PromptVariable[];
  onSelect: (variable: PromptVariable) => void;
  searchable?: boolean;
}

// Prompt 预览
interface PromptPreviewProps {
  template: string;
  variables: Record<string, any>;
}
```

---

## 变量系统

### 变量插入流程

```
┌─────────────────┐
│ 用户点击        │
│ "插入变量" 按钮  │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ 显示变量选择器   │
│ (Dropdown/Modal)│
└────────┬────────┘
         │
         v
┌─────────────────┐
│ 用户选择变量     │
│ 如：user_name   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ 插入到光标位置   │
│ {{user_name}}   │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ 更新编辑器内容   │
│ 触发 onChange   │
└─────────────────┘
```

### 变量替换逻辑

```typescript
function replaceVariables(
  template: string,
  variables: Record<string, any>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (variables.hasOwnProperty(varName)) {
      const value = variables[varName];

      // 根据值的类型进行格式化
      if (Array.isArray(value)) {
        return value.map(item => `- ${item}`).join('\n');
      }

      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }

      return String(value);
    }

    // 变量未找到，保留原样
    return match;
  });
}

// 使用示例
const template = `
你是{{agent_name}}，当前时间是{{current_time}}。
可用工具：
{{available_tools}}
`;

const variables = {
  agent_name: '小助手',
  current_time: new Date().toISOString(),
  available_tools: ['搜索', '计算器', '翻译'],
};

const result = replaceVariables(template, variables);
// 输出：
// 你是小助手，当前时间是2025-11-30T08:00:00Z。
// 可用工具：
// - 搜索
// - 计算器
// - 翻译
```

### 变量验证

```typescript
function validatePrompt(
  prompt: string,
  availableVariables: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 提取所有使用的变量
  const usedVariables = extractVariables(prompt);

  // 检查未定义的变量
  usedVariables.forEach((varName) => {
    if (!availableVariables.includes(varName)) {
      errors.push(`未定义的变量: {{${varName}}}`);
    }
  });

  // 检查未闭合的大括号
  const openBraces = (prompt.match(/\{\{/g) || []).length;
  const closeBraces = (prompt.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push('变量语法错误：大括号未正确配对');
  }

  // 检查空 Prompt
  if (prompt.trim().length === 0) {
    warnings.push('Prompt 不能为空');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function extractVariables(prompt: string): string[] {
  const matches = prompt.matchAll(/\{\{(\w+)\}\}/g);
  return Array.from(matches, match => match[1]);
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

## Prompt 模板库

### 模板数据结构

```typescript
const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'customer-service',
    name: '客服助手',
    description: '专业的客户服务 Agent，能够解答问题和处理投诉',
    category: '客户服务',
    tags: ['客服', '问答', '电商'],
    content: `你是一个专业的客服助手，名字叫{{agent_name}}。

你的主要职责：
1. 解答用户关于产品的问题
2. 协助用户完成订单操作
3. 记录和反馈用户的意见和建议

你可以使用以下工具：
{{available_tools}}

请始终保持礼貌和专业，用简洁明了的语言回答用户的问题。`,
    variables: [
      { name: 'agent_name', type: VariableType.String, ... },
      { name: 'available_tools', type: VariableType.Array, ... },
    ],
    rating: 4.8,
    usageCount: 1250,
  },

  {
    id: 'translator',
    name: '翻译助手',
    description: '专业的多语言翻译 Agent',
    category: '语言',
    tags: ['翻译', '多语言'],
    content: `你是一个专业的翻译助手。

你的能力：
- 支持多种语言之间的互译
- 保持原文的语气和风格
- 解释文化背景和习语

翻译要求：
1. 准确传达原文含义
2. 符合目标语言的表达习惯
3. 标注难以直译的内容

当前语言设置：
源语言：{{source_language}}
目标语言：{{target_language}}`,
    variables: [
      { name: 'source_language', type: VariableType.String, ... },
      { name: 'target_language', type: VariableType.String, ... },
    ],
    rating: 4.9,
    usageCount: 2340,
  },

  {
    id: 'code-assistant',
    name: '编程助手',
    description: '帮助开发者编写、调试和优化代码',
    category: '开发',
    tags: ['编程', '代码', '调试'],
    content: `你是一个专业的编程助手，擅长{{programming_language}}。

你的能力：
1. 编写高质量的代码
2. 解释代码逻辑
3. 发现和修复 bug
4. 提供性能优化建议

代码规范：
- 使用清晰的变量命名
- 添加必要的注释
- 遵循最佳实践

当前环境：
编程语言：{{programming_language}}
框架：{{framework}}`,
    variables: [
      { name: 'programming_language', type: VariableType.String, ... },
      { name: 'framework', type: VariableType.String, ... },
    ],
    rating: 4.7,
    usageCount: 3120,
  },
];
```

### 模板选择器组件

```typescript
interface TemplateLibraryProps {
  templates: PromptTemplate[];
  onSelect: (template: PromptTemplate) => void;
  onClose: () => void;
}

function TemplateLibrary({
  templates,
  onSelect,
  onClose,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));

  return (
    <Modal
      title="Prompt 模板库"
      visible
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <div className="template-library">
        {/* 搜索栏 */}
        <Input
          prefix={<IconSearch />}
          placeholder="搜索模板..."
          value={searchQuery}
          onChange={(value) => setSearchQuery(value)}
        />

        {/* 分类筛选 */}
        <div className="category-filter">
          <Button
            type={!selectedCategory ? 'primary' : 'default'}
            onClick={() => setSelectedCategory(null)}
          >
            全部
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              type={selectedCategory === category ? 'primary' : 'default'}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* 模板列表 */}
        <div className="template-list">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              hoverable
              onClick={() => onSelect(template)}
            >
              <div className="template-header">
                <h3>{template.name}</h3>
                <Tag>{template.category}</Tag>
              </div>
              <p>{template.description}</p>
              <div className="template-meta">
                <span>⭐ {template.rating}</span>
                <span>使用 {template.usageCount} 次</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Modal>
  );
}
```

---

## 语法高亮和自动补全

### 语法高亮

**实现方式**：

1. **简单方案**：使用 CSS + 正则表达式高亮变量
2. **完整方案**：使用 Monaco Editor 或 CodeMirror

**简单实现示例**：

```typescript
function highlightVariables(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // 匹配变量 {{var_name}}
  const regex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // 添加变量前的普通文本
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // 添加高亮的变量
    parts.push(
      <span key={`var-${match.index}`} className="prompt-variable">
        {match[0]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余文本
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}

// CSS
.prompt-variable {
  color: #0066cc;
  font-weight: 600;
  background-color: #e6f2ff;
  padding: 2px 4px;
  border-radius: 3px;
}
```

### 自动补全

**触发条件**：输入 `{{` 时显示变量建议

```typescript
interface AutoCompleteProps {
  variables: PromptVariable[];
  onSelect: (variable: PromptVariable) => void;
  position: { top: number; left: number };
}

function AutoComplete({ variables, onSelect, position }: AutoCompleteProps) {
  const [filterText, setFilterText] = useState('');

  const filteredVariables = variables.filter((v) =>
    v.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div
      className="autocomplete-dropdown"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
      }}
    >
      {filteredVariables.map((variable) => (
        <div
          key={variable.name}
          className="autocomplete-item"
          onClick={() => onSelect(variable)}
        >
          <div className="variable-name">{{variable.name}}</div>
          <div className="variable-description">{variable.description}</div>
        </div>
      ))}
    </div>
  );
}
```

---

## Coze Lite 实现方案

### 简化策略

Coze Lite 将简化 Prompt 编辑器：

❌ **移除**：
- 复杂的编辑器插件系统
- Monaco Editor 集成
- Prompt 推荐功能
- 多 Agent 模式

✅ **保留**：
- 基础文本编辑器（TextArea）
- 变量插入功能
- 简单的语法高亮（CSS 实现）
- 内置模板库（5-10 个常用模板）

### 目录结构

```
frontend/src/
├── pages/
│   └── agent/
│       └── components/
│           ├── prompt-editor/
│           │   ├── index.tsx           # Prompt 编辑器
│           │   ├── toolbar.tsx         # 工具栏
│           │   ├── variable-selector.tsx  # 变量选择器
│           │   ├── template-library.tsx   # 模板库
│           │   └── prompt-editor.css   # 样式
│           └── config-panel/
│               └── prompt-tab.tsx      # Prompt 配置标签页
├── constants/
│   ├── prompt-variables.ts         # 变量定义
│   └── prompt-templates.ts         # 模板定义
└── utils/
    └── prompt-utils.ts             # Prompt 工具函数
```

### 实现阶段

**Phase 1：基础编辑器**（2-3 天）
- ✅ 基础 TextArea 组件
- ✅ 字符计数
- ✅ 只读模式

**Phase 2：变量系统**（2-3 天）
- ✅ 变量选择器
- ✅ 变量插入
- ✅ 变量列表展示
- ✅ 简单的语法高亮

**Phase 3：模板库**（1-2 天）
- ✅ 内置 5-10 个模板
- ✅ 模板选择器
- ✅ 模板应用

**Phase 4：增强功能**（1-2 天）
- ✅ Prompt 验证
- ✅ 实时预览（可选）

**总预计工作量**：6-10 天

---

## 完整代码示例

### 1. PromptEditor 主组件

**文件**：`frontend/src/pages/agent/components/prompt-editor/index.tsx`

```typescript
import { useState, useRef, useCallback } from 'react';
import { Input, Message } from '@arco-design/web-react';
import { PromptToolbar } from './toolbar';
import { VariableSelector } from './variable-selector';
import { TemplateLibrary } from './template-library';
import { SYSTEM_VARIABLES } from '@/constants/prompt-variables';
import { PROMPT_TEMPLATES } from '@/constants/prompt-templates';
import { validatePrompt, extractVariables } from '@/utils/prompt-utils';
import type { PromptVariable, PromptTemplate } from '@/types/prompt';
import './prompt-editor.css';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  maxLength?: number;
}

export function PromptEditor({
  value,
  onChange,
  placeholder = '输入 System Prompt...',
  readonly = false,
  maxLength = 10000,
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVariableSelector, setShowVariableSelector] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  // 插入变量
  const handleInsertVariable = useCallback((variable: PromptVariable) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variableText = `{{${variable.name}}}`;

    const newValue =
      value.substring(0, start) +
      variableText +
      value.substring(end);

    onChange(newValue);

    // 设置光标位置
    setTimeout(() => {
      const newPosition = start + variableText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);

    setShowVariableSelector(false);
  }, [value, onChange]);

  // 应用模板
  const handleApplyTemplate = useCallback((template: PromptTemplate) => {
    onChange(template.content);
    setShowTemplateLibrary(false);
    Message.success(`已应用模板：${template.name}`);
  }, [onChange]);

  // 格式化 Prompt
  const handleFormat = useCallback(() => {
    const formatted = value.trim().replace(/\n{3,}/g, '\n\n');
    onChange(formatted);
    Message.success('格式化完成');
  }, [value, onChange]);

  // 验证 Prompt
  const usedVariables = extractVariables(value);
  const availableVariableNames = SYSTEM_VARIABLES.map(v => v.name);
  const validation = validatePrompt(value, availableVariableNames);

  return (
    <div className="prompt-editor">
      {/* 工具栏 */}
      <PromptToolbar
        onInsertVariable={() => setShowVariableSelector(true)}
        onOpenTemplates={() => setShowTemplateLibrary(true)}
        onFormat={handleFormat}
        disabled={readonly}
      />

      {/* 编辑器 */}
      <div className="prompt-editor-content">
        <Input.TextArea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={readonly}
          maxLength={maxLength}
          showWordLimit
          autoSize={{ minRows: 10, maxRows: 30 }}
          className="prompt-textarea"
        />

        {/* 变量高亮提示 */}
        {usedVariables.length > 0 && (
          <div className="prompt-variables-hint">
            使用的变量：
            {usedVariables.map((varName) => (
              <span key={varName} className="variable-tag">
                {'{{'}{varName}{'}}'}
              </span>
            ))}
          </div>
        )}

        {/* 验证错误 */}
        {validation.errors.length > 0 && (
          <div className="prompt-errors">
            {validation.errors.map((error, index) => (
              <div key={index} className="error-item">
                ⚠️ {error}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 变量选择器 */}
      {showVariableSelector && (
        <VariableSelector
          variables={SYSTEM_VARIABLES}
          onSelect={handleInsertVariable}
          onClose={() => setShowVariableSelector(false)}
        />
      )}

      {/* 模板库 */}
      {showTemplateLibrary && (
        <TemplateLibrary
          templates={PROMPT_TEMPLATES}
          onSelect={handleApplyTemplate}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}
    </div>
  );
}
```

### 2. PromptToolbar 工具栏

**文件**：`frontend/src/pages/agent/components/prompt-editor/toolbar.tsx`

```typescript
import { Button, Tooltip } from '@arco-design/web-react';
import {
  IconCode,
  IconBook,
  IconFormat,
} from '@arco-design/web-react/icon';

interface PromptToolbarProps {
  onInsertVariable: () => void;
  onOpenTemplates: () => void;
  onFormat: () => void;
  disabled?: boolean;
}

export function PromptToolbar({
  onInsertVariable,
  onOpenTemplates,
  onFormat,
  disabled = false,
}: PromptToolbarProps) {
  return (
    <div className="prompt-toolbar">
      <Tooltip content="插入变量">
        <Button
          icon={<IconCode />}
          onClick={onInsertVariable}
          disabled={disabled}
        >
          变量
        </Button>
      </Tooltip>

      <Tooltip content="选择模板">
        <Button
          icon={<IconBook />}
          onClick={onOpenTemplates}
          disabled={disabled}
        >
          模板
        </Button>
      </Tooltip>

      <Tooltip content="格式化 Prompt">
        <Button
          icon={<IconFormat />}
          onClick={onFormat}
          disabled={disabled}
        >
          格式化
        </Button>
      </Tooltip>
    </div>
  );
}
```

### 3. VariableSelector 变量选择器

**文件**：`frontend/src/pages/agent/components/prompt-editor/variable-selector.tsx`

```typescript
import { useState } from 'react';
import { Modal, Input, List, Tag } from '@arco-design/web-react';
import { IconSearch } from '@arco-design/web-react/icon';
import type { PromptVariable } from '@/types/prompt';

interface VariableSelectorProps {
  variables: PromptVariable[];
  onSelect: (variable: PromptVariable) => void;
  onClose: () => void;
}

export function VariableSelector({
  variables,
  onSelect,
  onClose,
}: VariableSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVariables = variables.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      title="选择变量"
      visible
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Input
        prefix={<IconSearch />}
        placeholder="搜索变量..."
        value={searchQuery}
        onChange={(value) => setSearchQuery(value)}
        style={{ marginBottom: 16 }}
      />

      <List
        dataSource={filteredVariables}
        render={(variable) => (
          <List.Item
            key={variable.name}
            onClick={() => onSelect(variable)}
            className="variable-list-item"
          >
            <div className="variable-info">
              <div className="variable-name">
                {'{{'}{variable.name}{'}}'}
              </div>
              <div className="variable-description">
                {variable.description}
              </div>
            </div>
            <Tag color="blue">{variable.type}</Tag>
          </List.Item>
        )}
      />
    </Modal>
  );
}
```

### 4. 样式文件

**文件**：`frontend/src/pages/agent/components/prompt-editor/prompt-editor.css`

```css
/* Prompt Editor Container */
.prompt-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Toolbar */
.prompt-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  background-color: #f7f8fa;
  border-radius: 4px;
}

/* Editor Content */
.prompt-editor-content {
  position: relative;
}

.prompt-textarea textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
}

/* Variables Hint */
.prompt-variables-hint {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #e8f3ff;
  border-radius: 4px;
  font-size: 12px;
  color: #4e5969;
}

.variable-tag {
  display: inline-block;
  margin: 0 4px;
  padding: 2px 8px;
  background-color: #0066cc;
  color: white;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

/* Errors */
.prompt-errors {
  margin-top: 8px;
  padding: 12px;
  background-color: #ffece8;
  border-left: 3px solid #f53f3f;
  border-radius: 4px;
}

.error-item {
  font-size: 13px;
  color: #c9252d;
  margin-bottom: 4px;
}

.error-item:last-child {
  margin-bottom: 0;
}

/* Variable List Item */
.variable-list-item {
  cursor: pointer;
  padding: 12px;
  transition: background-color 0.2s;
}

.variable-list-item:hover {
  background-color: #f7f8fa;
}

.variable-info {
  flex: 1;
}

.variable-name {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: #0066cc;
  margin-bottom: 4px;
}

.variable-description {
  font-size: 12px;
  color: #86909c;
}
```

---

## 最佳实践

### 1. Prompt 编写技巧

✅ **清晰的角色定义**

```
// ✅ Good
你是一个专业的客服助手，擅长解答用户关于产品的问题。

// ❌ Bad
你是一个助手。
```

✅ **具体的任务说明**

```
// ✅ Good
你的主要职责：
1. 解答产品功能相关问题
2. 协助用户完成订单操作
3. 记录用户反馈

// ❌ Bad
帮助用户。
```

✅ **明确的约束条件**

```
// ✅ Good
请注意：
- 不要提供医疗建议
- 不要讨论政治话题
- 如遇到不确定的问题，请诚实告知

// ❌ Bad
做一个好助手。
```

### 2. 变量使用

✅ **使用描述性的变量名**

```
// ✅ Good
{{user_name}}
{{current_time}}
{{available_tools}}

// ❌ Bad
{{u}}
{{t}}
{{tools}}
```

✅ **提供默认值**

```typescript
const variables = {
  agent_name: config.agentName || '助手',
  current_time: new Date().toISOString(),
  available_tools: tools.length > 0 ? tools : ['暂无工具'],
};
```

### 3. 性能优化

✅ **延迟验证**

```typescript
// 使用 debounce 避免频繁验证
import { debounce } from 'lodash-es';

const debouncedValidate = useCallback(
  debounce((value: string) => {
    const result = validatePrompt(value, availableVariables);
    setValidationResult(result);
  }, 500),
  []
);

useEffect(() => {
  debouncedValidate(value);
}, [value]);
```

✅ **懒加载模板库**

```typescript
const TemplateLibrary = lazy(() => import('./template-library'));

{showTemplates && (
  <Suspense fallback={<Spin />}>
    <TemplateLibrary />
  </Suspense>
)}
```

---

## 总结

### 核心要点

1. **Prompt 是 Agent 的核心**，决定了 Agent 的能力和表现
2. **变量系统**让 Prompt 更加动态和灵活
3. **模板库**提高 Prompt 编写效率
4. **Coze Lite** 采用简化实现，专注核心功能

### Coze Lite 实现要点

- ✅ 基础 TextArea 编辑器
- ✅ 变量插入和高亮
- ✅ 5-10 个内置模板
- ✅ Prompt 验证
- ✅ 简洁的 UI 设计

### 预计工作量

**Phase 1-4 总计**：6-10 天

### 下一步

接下来将创建：
- **12-agent-ide-tools.md** - 工具管理系统
- **13-agent-ide-chat.md** - 聊天调试区
- **14-agent-ide-publish.md** - 发布管理

---

## 参考资源

### Coze Studio 源码

- `packages/agent-ide/prompt/` - Prompt 编辑器
- `packages/common/prompt-kit/` - Prompt 工具包

### 相关文档

- [09-agent-ide-overview.md](./09-agent-ide-overview.md) - Agent IDE 总体架构
- [10-agent-ide-layout.md](./10-agent-ide-layout.md) - 布局系统

### 外部资源

- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

**文档版本**：1.0
**最后更新**：2025-11-30
**作者**：Coze Lite Team
