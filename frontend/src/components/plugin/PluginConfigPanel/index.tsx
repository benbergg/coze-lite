import { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Message,
  Collapse,
  Select,
  Switch,
  InputNumber,
} from '@arco-design/web-react';
import { useForm, Controller } from 'react-hook-form';
import type { Plugin, PluginConfig, OpenAPIParameter } from '@/types/plugin';
import './index.css';

const FormItem = Form.Item;
const CollapseItem = Collapse.Item;

interface PluginConfigPanelProps {
  plugin: Plugin;
  onSave: (config: Record<string, any>) => void;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: any[];
  defaultValue?: any;
}

export function PluginConfigPanel({ plugin, onSave }: PluginConfigPanelProps) {
  const [loading, setLoading] = useState(false);

  // 根据 OpenAPI 定义生成表单字段
  const formFields = generateFormFields(plugin.config);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: getDefaultValues(formFields),
  });

  const onSubmit = async (data: Record<string, any>) => {
    setLoading(true);
    try {
      await onSave(data);
      Message.success('配置已保存');
    } catch (error) {
      Message.error(`保存失败: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plugin-config-panel">
      <h3>{plugin.name} 配置</h3>

      <Form onSubmit={handleSubmit(onSubmit)} layout="vertical">
        <Collapse defaultActiveKey={['basic']}>
          {/* 基本配置 */}
          <CollapseItem header="基本配置" name="basic">
            {formFields.map((field) => (
              <Controller
                key={field.name}
                name={field.name}
                control={control}
                rules={{ required: field.required ? '此字段为必填项' : false }}
                render={({ field: { onChange, value } }) => (
                  <FormItem
                    label={field.label}
                    required={field.required}
                    validateStatus={errors[field.name] ? 'error' : undefined}
                    help={errors[field.name]?.message as string}
                  >
                    {renderFormField(field, value, onChange)}
                  </FormItem>
                )}
              />
            ))}
          </CollapseItem>

          {/* 高级配置 */}
          <CollapseItem header="高级配置" name="advanced">
            <Controller
              name="timeout"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormItem label="超时时间（秒）">
                  <InputNumber
                    value={value}
                    onChange={onChange}
                    min={1}
                    max={300}
                    defaultValue={30}
                    style={{ width: '100%' }}
                  />
                </FormItem>
              )}
            />

            <Controller
              name="retryCount"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormItem label="重试次数">
                  <InputNumber
                    value={value}
                    onChange={onChange}
                    min={0}
                    max={5}
                    defaultValue={0}
                    style={{ width: '100%' }}
                  />
                </FormItem>
              )}
            />
          </CollapseItem>
        </Collapse>

        <FormItem>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存配置
          </Button>
        </FormItem>
      </Form>
    </div>
  );
}

// 从 OpenAPI 定义生成表单字段
function generateFormFields(config: PluginConfig): FormField[] {
  const fields: FormField[] = [];

  // 遍历所有 paths 和 operations
  Object.entries(config.paths).forEach(([, methods]) => {
    Object.entries(methods).forEach(([, operation]) => {
      operation.parameters?.forEach((param: OpenAPIParameter) => {
        fields.push({
          name: param.name,
          label: param.schema.description || param.name,
          type: param.schema.type,
          required: param.required,
          options: param.schema.enum,
          defaultValue: param.schema.default,
        });
      });
    });
  });

  return fields;
}

// 渲染表单字段
function renderFormField(
  field: FormField,
  value: any,
  onChange: (value: any) => void
) {
  if (field.options) {
    return (
      <Select value={value} onChange={onChange} placeholder={`请选择${field.label}`}>
        {field.options.map((opt: any) => (
          <Select.Option key={opt} value={opt}>
            {opt}
          </Select.Option>
        ))}
      </Select>
    );
  }

  switch (field.type) {
    case 'number':
      return (
        <InputNumber
          value={value}
          onChange={onChange}
          placeholder={`请输入${field.label}`}
          style={{ width: '100%' }}
        />
      );
    case 'boolean':
      return <Switch checked={value} onChange={onChange} />;
    default:
      return (
        <Input
          value={value}
          onChange={onChange}
          placeholder={`请输入${field.label}`}
        />
      );
  }
}

// 获取默认值
function getDefaultValues(fields: FormField[]): Record<string, any> {
  const defaults: Record<string, any> = {
    timeout: 30,
    retryCount: 0,
  };

  fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue;
    }
  });

  return defaults;
}
