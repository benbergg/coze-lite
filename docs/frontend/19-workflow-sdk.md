# Workflow - SDK 和 API 集成

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-workflow/sdk`, `@coze-workflow/base`

## 一、概述

Workflow SDK 提供了编程方式创建、管理和执行工作流的能力，支持在应用中嵌入工作流引擎。本文档提供完整的 SDK 设计和 API 集成方案。

### 1.1 核心功能

- **工作流创建**: 编程方式构建工作流
- **工作流执行**: 运行和监控工作流
- **事件订阅**: 监听工作流执行事件
- **数据管理**: 管理工作流数据和状态

### 1.2 使用场景

| 场景 | SDK 用途 |
|------|----------|
| **自动化任务** | 定时执行工作流 |
| **API 集成** | 通过 API 触发工作流 |
| **批量处理** | 批量执行工作流 |
| **嵌入应用** | 在应用中集成工作流引擎 |

## 二、SDK 设计

### 2.1 核心 API

**文件**: `frontend/src/sdk/WorkflowSDK.ts`

```typescript
export class WorkflowSDK {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  // 创建工作流
  async createWorkflow(workflow: CreateWorkflowRequest): Promise<Workflow> {
    const response = await fetch(`${this.baseUrl}/workflows`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(workflow),
    });

    return response.json();
  }

  // 获取工作流
  async getWorkflow(workflowId: string): Promise<Workflow> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
      headers: this.getHeaders(),
    });

    return response.json();
  }

  // 更新工作流
  async updateWorkflow(
    workflowId: string,
    updates: Partial<Workflow>
  ): Promise<Workflow> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    return response.json();
  }

  // 删除工作流
  async deleteWorkflow(workflowId: string): Promise<void> {
    await fetch(`${this.baseUrl}/workflows/${workflowId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  // 执行工作流
  async executeWorkflow(
    workflowId: string,
    inputs?: Record<string, any>
  ): Promise<ExecutionResult> {
    const response = await fetch(`${this.baseUrl}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ inputs }),
    });

    return response.json();
  }

  // 获取执行结果
  async getExecutionResult(executionId: string): Promise<ExecutionResult> {
    const response = await fetch(`${this.baseUrl}/executions/${executionId}`, {
      headers: this.getHeaders(),
    });

    return response.json();
  }

  // 订阅执行事件 (WebSocket)
  subscribeExecution(
    executionId: string,
    onEvent: (event: ExecutionEvent) => void
  ): () => void {
    const ws = new WebSocket(
      `${this.baseUrl.replace('http', 'ws')}/executions/${executionId}/subscribe`
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onEvent(data);
    };

    return () => ws.close();
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }
}

// 类型定义
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionResult {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  finishedAt?: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: string;
  nodeResults: NodeExecutionResult[];
}

export interface ExecutionEvent {
  type: 'node_started' | 'node_completed' | 'node_error' | 'workflow_completed';
  nodeId?: string;
  data: any;
  timestamp: string;
}
```

### 2.2 工作流构建器

```typescript
export class WorkflowBuilder {
  private nodes: WorkflowNode[] = [];
  private edges: WorkflowEdge[] = [];

  // 添加节点
  addNode(node: Omit<WorkflowNode, 'id'>): string {
    const id = `${node.type}_${Date.now()}`;
    this.nodes.push({
      ...node,
      id,
      position: node.position || { x: 0, y: 0 },
    } as WorkflowNode);
    return id;
  }

  // 连接节点
  connect(source: string, target: string): void {
    this.edges.push({
      id: `${source}_${target}`,
      source,
      target,
    });
  }

  // 构建工作流
  build(name: string, description?: string): CreateWorkflowRequest {
    return {
      name,
      description,
      nodes: this.nodes,
      edges: this.edges,
    };
  }

  // 链式 API
  llmNode(config: LLMNodeConfig): this {
    const id = this.addNode({
      type: NodeType.LLM,
      data: { label: 'LLM', config },
    } as Omit<WorkflowNode, 'id'>);
    this.lastNodeId = id;
    return this;
  }

  codeNode(config: CodeNodeConfig): this {
    const id = this.addNode({
      type: NodeType.CODE,
      data: { label: 'Code', config },
    } as Omit<WorkflowNode, 'id'>);

    // 自动连接上一个节点
    if (this.lastNodeId) {
      this.connect(this.lastNodeId, id);
    }
    this.lastNodeId = id;
    return this;
  }

  apiNode(config: APINodeConfig): this {
    const id = this.addNode({
      type: NodeType.API,
      data: { label: 'API', config },
    } as Omit<WorkflowNode, 'id'>);

    if (this.lastNodeId) {
      this.connect(this.lastNodeId, id);
    }
    this.lastNodeId = id;
    return this;
  }

  private lastNodeId: string | null = null;
}
```

### 2.3 使用示例

```typescript
// 初始化 SDK
const sdk = new WorkflowSDK({
  baseUrl: 'https://api.coze-lite.com',
  apiKey: 'your-api-key',
});

// 创建工作流（方式 1：直接定义）
const workflow = await sdk.createWorkflow({
  name: '文本摘要工作流',
  description: '使用 LLM 生成文本摘要',
  nodes: [
    {
      id: 'start',
      type: NodeType.START,
      position: { x: 100, y: 100 },
      data: { label: '开始' },
    },
    {
      id: 'llm',
      type: NodeType.LLM,
      position: { x: 300, y: 100 },
      data: {
        label: 'LLM 摘要',
        config: {
          model: 'gpt-4',
          userPrompt: '请总结以下内容：{input}',
        },
      },
    },
    {
      id: 'end',
      type: NodeType.END,
      position: { x: 500, y: 100 },
      data: { label: '结束' },
    },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'llm' },
    { id: 'e2', source: 'llm', target: 'end' },
  ],
});

// 创建工作流（方式 2：使用构建器）
const builder = new WorkflowBuilder();
const workflow2 = await sdk.createWorkflow(
  builder
    .llmNode({
      model: 'gpt-4',
      userPrompt: '分析以下文本：{input}',
    })
    .codeNode({
      language: 'python',
      code: 'result = len(input.split())\nreturn {"word_count": result}',
    })
    .apiNode({
      url: 'https://api.example.com/save',
      method: 'POST',
      body: '{summary}',
    })
    .build('文本分析工作流', '分析文本并保存结果')
);

// 执行工作流
const execution = await sdk.executeWorkflow(workflow.id, {
  input: '这是一段需要摘要的长文本...',
});

// 轮询执行结果
const pollResult = async () => {
  const result = await sdk.getExecutionResult(execution.id);

  if (result.status === 'running') {
    setTimeout(pollResult, 1000);
  } else {
    console.log('执行完成:', result);
  }
};
pollResult();

// 或使用 WebSocket 订阅
const unsubscribe = sdk.subscribeExecution(execution.id, (event) => {
  console.log('事件:', event);

  if (event.type === 'workflow_completed') {
    console.log('工作流完成');
    unsubscribe();
  }
});
```

## 三、后端 API 实现

### 3.1 工作流 CRUD

**文件**: `backend/src/controllers/workflow.controller.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { WorkflowService } from '../services/workflow.service';

export async function workflowRoutes(fastify: FastifyInstance) {
  const workflowService = new WorkflowService();

  // 创建工作流
  fastify.post('/workflows', async (request, reply) => {
    const workflow = await workflowService.create(request.body);
    reply.code(201).send(workflow);
  });

  // 获取工作流
  fastify.get('/workflows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const workflow = await workflowService.findById(id);

    if (!workflow) {
      reply.code(404).send({ error: '工作流不存在' });
      return;
    }

    reply.send(workflow);
  });

  // 更新工作流
  fastify.put('/workflows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const workflow = await workflowService.update(id, request.body);
    reply.send(workflow);
  });

  // 删除工作流
  fastify.delete('/workflows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await workflowService.delete(id);
    reply.code(204).send();
  });

  // 执行工作流
  fastify.post('/workflows/:id/execute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { inputs } = request.body as { inputs?: Record<string, any> };

    const execution = await workflowService.execute(id, inputs);
    reply.send(execution);
  });

  // 获取执行结果
  fastify.get('/executions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const execution = await workflowService.getExecution(id);
    reply.send(execution);
  });

  // 订阅执行事件 (WebSocket)
  fastify.get('/executions/:id/subscribe', { websocket: true }, (connection, req) => {
    const { id } = req.params as { id: string };

    const subscription = workflowService.subscribeExecution(id, (event) => {
      connection.socket.send(JSON.stringify(event));
    });

    connection.socket.on('close', () => {
      subscription.unsubscribe();
    });
  });
}
```

### 3.2 执行服务

**文件**: `backend/src/services/workflow.service.ts`

```typescript
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export class WorkflowService {
  private db: Database;
  private executor: WorkflowExecutor;
  private eventEmitter: EventEmitter;

  constructor() {
    this.db = new Database();
    this.executor = new WorkflowExecutor();
    this.eventEmitter = new EventEmitter();
  }

  async create(data: CreateWorkflowRequest): Promise<Workflow> {
    const workflow: Workflow = {
      id: uuidv4(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.workflows.insert(workflow);
    return workflow;
  }

  async findById(id: string): Promise<Workflow | null> {
    return await this.db.workflows.findOne({ id });
  }

  async update(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const workflow = await this.findById(id);
    if (!workflow) {
      throw new Error('工作流不存在');
    }

    const updated = {
      ...workflow,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.db.workflows.update({ id }, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.workflows.remove({ id });
  }

  async execute(workflowId: string, inputs?: Record<string, any>): Promise<ExecutionResult> {
    const workflow = await this.findById(workflowId);
    if (!workflow) {
      throw new Error('工作流不存在');
    }

    const execution: ExecutionResult = {
      id: uuidv4(),
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      inputs: inputs || {},
      outputs: {},
      nodeResults: [],
    };

    await this.db.executions.insert(execution);

    // 异步执行工作流
    this.executeWorkflowAsync(execution);

    return execution;
  }

  async executeWorkflowAsync(execution: ExecutionResult): Promise<void> {
    try {
      const workflow = await this.findById(execution.workflowId);
      if (!workflow) return;

      // 执行工作流
      const result = await this.executor.execute({
        nodes: workflow.nodes,
        edges: workflow.edges,
        inputs: execution.inputs,
        onNodeComplete: (nodeId, result) => {
          this.emit(execution.id, {
            type: 'node_completed',
            nodeId,
            data: result,
            timestamp: new Date().toISOString(),
          });
        },
      });

      // 更新执行结果
      execution.status = 'success';
      execution.finishedAt = new Date().toISOString();
      execution.outputs = result.outputs;
      execution.nodeResults = result.nodeResults;

      await this.db.executions.update({ id: execution.id }, execution);

      // 发送完成事件
      this.emit(execution.id, {
        type: 'workflow_completed',
        data: execution,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      execution.status = 'error';
      execution.finishedAt = new Date().toISOString();
      execution.error = error.message;

      await this.db.executions.update({ id: execution.id }, execution);
    }
  }

  async getExecution(id: string): Promise<ExecutionResult | null> {
    return await this.db.executions.findOne({ id });
  }

  subscribeExecution(
    executionId: string,
    callback: (event: ExecutionEvent) => void
  ): { unsubscribe: () => void } {
    const listener = (event: ExecutionEvent) => callback(event);
    this.eventEmitter.on(executionId, listener);

    return {
      unsubscribe: () => {
        this.eventEmitter.off(executionId, listener);
      },
    };
  }

  private emit(executionId: string, event: ExecutionEvent): void {
    this.eventEmitter.emit(executionId, event);
  }
}
```

## 四、最佳实践

### 4.1 错误重试

```typescript
async function executeWithRetry(
  sdk: WorkflowSDK,
  workflowId: string,
  inputs: Record<string, any>,
  maxRetries = 3
): Promise<ExecutionResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const execution = await sdk.executeWorkflow(workflowId, inputs);

      // 轮询直到完成
      while (true) {
        const result = await sdk.getExecutionResult(execution.id);

        if (result.status === 'success') {
          return result;
        } else if (result.status === 'error') {
          if (i < maxRetries - 1) {
            console.log(`执行失败，重试 ${i + 1}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
          } else {
            throw new Error(result.error);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }

  throw new Error('执行失败');
}
```

### 4.2 批量执行

```typescript
async function batchExecute(
  sdk: WorkflowSDK,
  workflowId: string,
  inputsList: Record<string, any>[]
): Promise<ExecutionResult[]> {
  const executions = await Promise.all(
    inputsList.map(inputs => sdk.executeWorkflow(workflowId, inputs))
  );

  // 等待所有执行完成
  const results = await Promise.all(
    executions.map(async (execution) => {
      while (true) {
        const result = await sdk.getExecutionResult(execution.id);
        if (result.status !== 'running') {
          return result;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    })
  );

  return results;
}
```

---

**文档状态**: ✅ 完成
**Workflow 模块全部完成！**
