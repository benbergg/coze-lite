import { useState, useCallback, useMemo } from 'react';
import {
  Input,
  Select,
  Slider,
  Collapse,
  Typography,
  Tag,
  Button,
  Tooltip,
  Message,
} from '@arco-design/web-react';
import {
  IconQuestionCircle,
  IconPlus,
  IconCopy,
} from '@arco-design/web-react/icon';
import { useAgentIdeStore } from '@/stores/agentIdeStore';
import './index.css';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;
const CollapseItem = Collapse.Item;

/** 可用的模型列表 */
const AVAILABLE_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: '最强大的多模态模型' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: '快速且经济实惠' },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', description: '平衡性能与速度' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus', description: '最高质量输出' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat', description: '高性价比中文模型' },
];

/** 预设 Prompt 模板 */
const PROMPT_TEMPLATES = [
  {
    id: 'assistant',
    name: '智能助手',
    prompt: '你是一个友好、专业的 AI 助手。请用简洁清晰的语言回答用户的问题，必要时提供具体的例子和步骤。',
  },
  {
    id: 'coder',
    name: '编程专家',
    prompt: '你是一个经验丰富的软件工程师。请帮助用户解决编程问题，提供清晰的代码示例和详细的解释。使用 Markdown 格式化你的回答。',
  },
  {
    id: 'writer',
    name: '写作助手',
    prompt: '你是一个专业的写作助手。帮助用户改进文章、提供写作建议、润色文字。注意保持用户的写作风格和意图。',
  },
  {
    id: 'translator',
    name: '翻译专家',
    prompt: '你是一个专业的翻译专家，精通多国语言。请提供准确、自然、符合目标语言习惯的翻译。保持原文的风格和语气。',
  },
];

export function PromptEditor() {
  const { currentAgent, updateAgentConfig } = useAgentIdeStore();
  const [variableInput, setVariableInput] = useState('');

  const config = currentAgent?.config;
  const prompt = config?.prompt ?? '';
  const model = config?.model ?? 'gpt-4o';
  const temperature = config?.temperature ?? 0.7;
  const maxTokens = config?.maxTokens ?? 4096;

  // 从 Prompt 中提取变量 {{variable}}
  const extractedVariables = useMemo(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(prompt)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  }, [prompt]);

  const handlePromptChange = useCallback((value: string) => {
    updateAgentConfig({ prompt: value });
  }, [updateAgentConfig]);

  const handleModelChange = useCallback((value: string) => {
    updateAgentConfig({ model: value });
  }, [updateAgentConfig]);

  const handleTemperatureChange = useCallback((value: number | number[]) => {
    const temp = Array.isArray(value) ? value[0] : value;
    updateAgentConfig({ temperature: temp });
  }, [updateAgentConfig]);

  const handleMaxTokensChange = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) {
      updateAgentConfig({ maxTokens: num });
    }
  }, [updateAgentConfig]);

  const handleInsertVariable = useCallback(() => {
    if (!variableInput.trim()) {
      Message.warning('请输入变量名');
      return;
    }
    const variable = `{{${variableInput.trim()}}}`;
    updateAgentConfig({ prompt: prompt + variable });
    setVariableInput('');
    Message.success(`已插入变量 ${variable}`);
  }, [variableInput, prompt, updateAgentConfig]);

  const handleUseTemplate = useCallback((template: typeof PROMPT_TEMPLATES[0]) => {
    updateAgentConfig({ prompt: template.prompt });
    Message.success(`已应用模板: ${template.name}`);
  }, [updateAgentConfig]);

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(prompt);
    Message.success('已复制到剪贴板');
  }, [prompt]);

  return (
    <div className="prompt-editor">
      {/* Agent 基本信息 */}
      <section className="prompt-editor-section">
        <h3 className="section-title">基本信息</h3>
        <div className="form-item">
          <label>Agent 名称</label>
          <Input
            value={config?.name ?? ''}
            onChange={(value) => updateAgentConfig({ name: value })}
            placeholder="给你的 Agent 起个名字"
          />
        </div>
        <div className="form-item">
          <label>描述</label>
          <TextArea
            value={config?.description ?? ''}
            onChange={(value) => updateAgentConfig({ description: value })}
            placeholder="简要描述 Agent 的功能"
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </div>
      </section>

      {/* System Prompt */}
      <section className="prompt-editor-section">
        <div className="section-header">
          <h3 className="section-title">System Prompt</h3>
          <div className="section-actions">
            <Tooltip content="复制 Prompt">
              <Button
                type="text"
                size="small"
                icon={<IconCopy />}
                onClick={handleCopyPrompt}
              />
            </Tooltip>
          </div>
        </div>

        <TextArea
          value={prompt}
          onChange={handlePromptChange}
          placeholder="定义 Agent 的角色、能力和行为..."
          autoSize={{ minRows: 8, maxRows: 20 }}
          className="prompt-textarea"
        />

        {/* 变量提示 */}
        {extractedVariables.length > 0 && (
          <div className="variables-display">
            <Text type="secondary" className="variables-label">
              检测到变量:
            </Text>
            {extractedVariables.map((v) => (
              <Tag key={v} color="arcoblue" size="small">
                {`{{${v}}}`}
              </Tag>
            ))}
          </div>
        )}

        {/* 变量插入 */}
        <div className="variable-insert">
          <Input
            value={variableInput}
            onChange={setVariableInput}
            placeholder="输入变量名"
            style={{ width: 150 }}
            onPressEnter={handleInsertVariable}
          />
          <Button
            type="secondary"
            size="small"
            icon={<IconPlus />}
            onClick={handleInsertVariable}
          >
            插入变量
          </Button>
        </div>
      </section>

      {/* Prompt 模板 */}
      <section className="prompt-editor-section">
        <Collapse bordered={false} defaultActiveKey={[]}>
          <CollapseItem
            header="Prompt 模板"
            name="templates"
            extra={
              <Tooltip content="选择预设模板快速开始">
                <IconQuestionCircle />
              </Tooltip>
            }
          >
            <div className="template-list">
              {PROMPT_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="template-item"
                  onClick={() => handleUseTemplate(template)}
                >
                  <div className="template-name">{template.name}</div>
                  <div className="template-preview">
                    {template.prompt.slice(0, 50)}...
                  </div>
                </div>
              ))}
            </div>
          </CollapseItem>
        </Collapse>
      </section>

      {/* 模型配置 */}
      <section className="prompt-editor-section">
        <h3 className="section-title">模型配置</h3>

        <div className="form-item">
          <label>
            模型选择
            <Tooltip content="选择用于生成回复的 AI 模型">
              <IconQuestionCircle className="help-icon" />
            </Tooltip>
          </label>
          <Select
            value={model}
            onChange={handleModelChange}
            style={{ width: '100%' }}
          >
            {AVAILABLE_MODELS.map((m) => (
              <Option key={m.value} value={m.value}>
                <div className="model-option">
                  <span className="model-name">{m.label}</span>
                  <span className="model-desc">{m.description}</span>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        <div className="form-item">
          <label>
            Temperature: {temperature}
            <Tooltip content="控制输出的随机性。值越高，输出越有创意；值越低，输出越确定">
              <IconQuestionCircle className="help-icon" />
            </Tooltip>
          </label>
          <Slider
            value={temperature}
            onChange={handleTemperatureChange}
            min={0}
            max={2}
            step={0.1}
            marks={{
              0: '精确',
              1: '平衡',
              2: '创意',
            }}
          />
        </div>

        <div className="form-item">
          <label>
            Max Tokens
            <Tooltip content="单次回复的最大 token 数量">
              <IconQuestionCircle className="help-icon" />
            </Tooltip>
          </label>
          <Input
            value={String(maxTokens)}
            onChange={handleMaxTokensChange}
            type="number"
            min={1}
            max={128000}
          />
        </div>
      </section>
    </div>
  );
}
