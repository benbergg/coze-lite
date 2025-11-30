import type {
  Plugin,
  PluginConfig,
  PluginExecutionContext,
  PluginExecutionResult,
  OpenAPIOperation,
} from '@/types/plugin';

export class PluginExecutor {
  // 执行插件
  static async execute(
    plugin: Plugin,
    context: PluginExecutionContext
  ): Promise<PluginExecutionResult> {
    const startTime = performance.now();

    try {
      // 查找对应的 operation
      const operation = this.findOperation(plugin.config, context.operationId);
      if (!operation) {
        throw new Error(`Operation ${context.operationId} not found`);
      }

      // 验证参数
      this.validateParameters(operation, context.parameters);

      // 构建请求
      const request = this.buildRequest(plugin, operation, context);

      // 执行请求
      const response = await fetch(request.url, request.options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
        metadata: {
          executionTime: performance.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
        },
        metadata: {
          executionTime: performance.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // 查找 operation
  private static findOperation(
    config: PluginConfig,
    operationId: string
  ): OpenAPIOperation | null {
    for (const [, methods] of Object.entries(config.paths)) {
      for (const [, operation] of Object.entries(methods)) {
        if (operation.operationId === operationId) {
          return operation;
        }
      }
    }
    return null;
  }

  // 验证参数
  private static validateParameters(
    operation: OpenAPIOperation,
    parameters: Record<string, any>
  ): void {
    for (const param of operation.parameters) {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      // 类型验证
      const value = parameters[param.name];
      if (value !== undefined) {
        const expectedType = param.schema.type;
        const actualType = typeof value;

        if (expectedType === 'number' && actualType !== 'number') {
          throw new Error(`Parameter ${param.name} must be a number`);
        }
        if (expectedType === 'boolean' && actualType !== 'boolean') {
          throw new Error(`Parameter ${param.name} must be a boolean`);
        }
      }
    }
  }

  // 构建请求
  private static buildRequest(
    plugin: Plugin,
    operation: OpenAPIOperation,
    context: PluginExecutionContext
  ) {
    const baseUrl = plugin.config.servers[0].url;
    let url = baseUrl;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 添加认证
    if (context.credentials) {
      Object.assign(headers, context.credentials);
    }

    // 处理参数
    const queryParams: string[] = [];
    let body: any = undefined;

    for (const param of operation.parameters) {
      const value = context.parameters[param.name];
      if (value === undefined) continue;

      switch (param.in) {
        case 'query':
          queryParams.push(`${param.name}=${encodeURIComponent(value)}`);
          break;
        case 'path':
          url = url.replace(`{${param.name}}`, encodeURIComponent(value));
          break;
        case 'header':
          headers[param.name] = String(value);
          break;
      }
    }

    // 添加 query 参数
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }

    // 处理 request body
    if (operation.requestBody) {
      body = JSON.stringify(context.parameters);
    }

    return {
      url,
      options: {
        method: 'GET', // 从 operation 获取实际方法
        headers,
        body,
        signal: context.timeout
          ? AbortSignal.timeout(context.timeout)
          : undefined,
      },
    };
  }
}
