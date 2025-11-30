# Workflow - 调试运行系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-workflow/test-run`, `@coze-workflow/playground`

## 一、概述

调试运行系统允许开发者测试和调试工作流，查看每个节点的执行结果、日志和错误信息。本文档提供完整的调试系统实现方案。

### 1.1 核心功能

- **单步调试**: 逐节点执行工作流
- **断点设置**: 在指定节点暂停执行
- **变量查看**: 查看节点输入输出
- **日志记录**: 记录执行过程和错误
- **性能分析**: 统计节点执行时间

### 1.2 执行模式

| 模式 | 说明 | 用途 |
|------|------|------|
| **连续执行** | 一次性执行完整工作流 | 快速测试 |
| **单步执行** | 逐个节点执行 | 详细调试 |
| **断点执行** | 执行到断点停止 | 定位问题 |

## 二、执行引擎设计

### 2.1 执行器接口

**文件**: `frontend/src/services/WorkflowExecutor.ts`

```typescript
export interface ExecutionContext {
  workflowId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
  mode: 'continuous' | 'step' | 'breakpoint';
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'skip';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: string;
  executionTime: number;
  timestamp: string;
}

export class WorkflowExecutor {
  private context: ExecutionContext;
  private executionHistory: NodeExecutionResult[] = [];
  private breakpoints: Set<string> = new Set();
  private currentNode: string | null = null;
  private isPaused: boolean = false;

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  // 执行工作流
  async execute(): Promise<NodeExecutionResult[]> {
    const startNode = this.findStartNode();
    if (!startNode) {
      throw new Error('未找到开始节点');
    }

    await this.executeNode(startNode.id);
    return this.executionHistory;
  }

  // 执行单个节点
  private async executeNode(nodeId: string): Promise<void> {
    this.currentNode = nodeId;
    const node = this.context.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 检查断点
    if (this.breakpoints.has(nodeId) && this.context.mode === 'breakpoint') {
      this.isPaused = true;
      return;
    }

    // 准备输入
    const inputs = await this.prepareInputs(node);

    // 执行节点
    const startTime = performance.now();
    try {
      const outputs = await this.runNode(node, inputs);
      const executionTime = performance.now() - startTime;

      // 记录结果
      this.executionHistory.push({
        nodeId,
        status: 'success',
        inputs,
        outputs,
        executionTime,
        timestamp: new Date().toISOString(),
      });

      // 更新变量
      this.updateVariables(nodeId, outputs);

      // 执行下一个节点
      if (this.context.mode === 'step') {
        this.isPaused = true;
      } else {
        await this.executeNextNodes(node);
      }
    } catch (error) {
      this.executionHistory.push({
        nodeId,
        status: 'error',
        inputs,
        outputs: {},
        error: error.message,
        executionTime: performance.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // 准备节点输入
  private async prepareInputs(node: WorkflowNode): Promise<Record<string, any>> {
    const inputs: Record<string, any> = {};

    // 获取上游节点的输出
    const incomingEdges = this.context.edges.filter(e => e.target === node.id);
    for (const edge of incomingEdges) {
      const sourceResult = this.executionHistory.find(r => r.nodeId === edge.source);
      if (sourceResult) {
        Object.assign(inputs, sourceResult.outputs);
      }
    }

    // 解析变量引用
    const config = node.data.config || {};
    for (const [key, value] of Object.entries(config)) {
      inputs[key] = this.resolveVariables(value);
    }

    return inputs;
  }

  // 解析变量引用
  private resolveVariables(value: any): any {
    if (typeof value !== 'string') return value;

    const regex = /\{([^}]+)\}/g;
    return value.replace(regex, (match, varPath) => {
      const keys = varPath.split('.');
      let result: any = this.context.variables;

      for (const key of keys) {
        result = result?.[key];
        if (result === undefined) return match;
      }

      return result;
    });
  }

  // 执行节点逻辑
  private async runNode(
    node: WorkflowNode,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    switch (node.type) {
      case NodeType.LLM:
        return await this.runLLMNode(node, inputs);
      case NodeType.CODE:
        return await this.runCodeNode(node, inputs);
      case NodeType.API:
        return await this.runAPINode(node, inputs);
      case NodeType.IF:
        return await this.runIfNode(node, inputs);
      default:
        return inputs;
    }
  }

  // LLM 节点执行
  private async runLLMNode(
    node: WorkflowNode,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const { model, temperature, userPrompt } = node.data.config;
    const prompt = this.resolveVariables(userPrompt);

    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature, prompt }),
    });

    const data = await response.json();
    return { output: data.message };
  }

  // Code 节点执行
  private async runCodeNode(
    node: WorkflowNode,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const { code, language } = node.data.config;

    const response = await fetch('/api/code/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, inputs }),
    });

    const data = await response.json();
    return data.outputs;
  }

  // API 节点执行
  private async runAPINode(
    node: WorkflowNode,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const { url, method, headers, body } = node.data.config;

    const response = await fetch(this.resolveVariables(url), {
      method,
      headers: headers || {},
      body: body ? JSON.stringify(this.resolveVariables(body)) : undefined,
    });

    return await response.json();
  }

  // If 节点执行
  private async runIfNode(
    node: WorkflowNode,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const { conditions, logic } = node.data.config;

    const results = conditions.map(cond => {
      const left = this.resolveVariables(cond.left);
      const right = this.resolveVariables(cond.right);
      return this.evaluateCondition(left, cond.operator, right);
    });

    const conditionMet = logic === 'and'
      ? results.every(r => r)
      : results.some(r => r);

    return { conditionMet, branch: conditionMet ? 'true' : 'false' };
  }

  // 条件评估
  private evaluateCondition(left: any, operator: string, right: any): boolean {
    switch (operator) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case 'contains': return String(left).includes(String(right));
      default: return false;
    }
  }

  // 更新变量
  private updateVariables(nodeId: string, outputs: Record<string, any>): void {
    this.context.variables[nodeId] = outputs;
  }

  // 执行下一个节点
  private async executeNextNodes(node: WorkflowNode): Promise<void> {
    const outgoingEdges = this.context.edges.filter(e => e.source === node.id);

    // If 节点特殊处理
    if (node.type === NodeType.IF) {
      const result = this.executionHistory.find(r => r.nodeId === node.id);
      const branch = result?.outputs.branch;
      const nextEdge = outgoingEdges.find(e => e.sourceHandle === branch);
      if (nextEdge) {
        await this.executeNode(nextEdge.target);
      }
    } else {
      // 普通节点执行所有下游节点
      for (const edge of outgoingEdges) {
        await this.executeNode(edge.target);
      }
    }
  }

  // 查找开始节点
  private findStartNode(): WorkflowNode | undefined {
    return this.context.nodes.find(n => n.type === NodeType.START);
  }

  // 控制方法
  setBreakpoint(nodeId: string): void {
    this.breakpoints.add(nodeId);
  }

  removeBreakpoint(nodeId: string): void {
    this.breakpoints.delete(nodeId);
  }

  resume(): void {
    this.isPaused = false;
    if (this.currentNode) {
      const currentIndex = this.context.nodes.findIndex(n => n.id === this.currentNode);
      if (currentIndex >= 0 && currentIndex < this.context.nodes.length - 1) {
        const nextNode = this.context.nodes[currentIndex + 1];
        this.executeNode(nextNode.id);
      }
    }
  }

  stop(): void {
    this.isPaused = true;
    this.currentNode = null;
  }
}
```

## 三、调试 UI 组件

### 3.1 调试面板

**文件**: `frontend/src/components/workflow/DebugPanel/index.tsx`

```typescript
import { useState } from 'react';
import { Button, Tabs, Card, Timeline, Table } from '@arco-design/web-react';
import { IconPlayArrow, IconPause, IconRefresh } from '@arco-design/web-react/icon';
import { WorkflowExecutor, NodeExecutionResult } from '@/services/WorkflowExecutor';
import './index.css';

const TabPane = Tabs.TabPane;

interface DebugPanelProps {
  workflowId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function DebugPanel({ workflowId, nodes, edges }: DebugPanelProps) {
  const [executor, setExecutor] = useState<WorkflowExecutor | null>(null);
  const [executionHistory, setExecutionHistory] = useState<NodeExecutionResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);

  // 开始执行
  const handleRun = async (mode: 'continuous' | 'step' | 'breakpoint') => {
    const exec = new WorkflowExecutor({
      workflowId,
      nodes,
      edges,
      variables: {},
      mode,
    });

    setExecutor(exec);
    setIsRunning(true);
    setExecutionHistory([]);

    try {
      const results = await exec.execute();
      setExecutionHistory(results);
    } catch (error) {
      Message.error(`执行失败: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 单步执行
  const handleStep = () => {
    executor?.resume();
  };

  // 停止执行
  const handleStop = () => {
    executor?.stop();
    setIsRunning(false);
  };

  return (
    <Card className="debug-panel">
      {/* 控制栏 */}
      <div className="debug-controls">
        <Button.Group>
          <Button
            type="primary"
            icon={<IconPlayArrow />}
            onClick={() => handleRun('continuous')}
            disabled={isRunning}
          >
            运行
          </Button>
          <Button
            icon={<IconPlayArrow />}
            onClick={() => handleRun('step')}
            disabled={isRunning}
          >
            单步调试
          </Button>
          {isRunning && (
            <>
              <Button icon={<IconPause />} onClick={handleStop}>
                停止
              </Button>
              <Button onClick={handleStep}>下一步</Button>
            </>
          )}
          <Button icon={<IconRefresh />} onClick={() => setExecutionHistory([])}>
            清空
          </Button>
        </Button.Group>
      </div>

      {/* 结果展示 */}
      <Tabs defaultActiveTab="timeline">
        <TabPane key="timeline" title="执行时间线">
          <ExecutionTimeline history={executionHistory} />
        </TabPane>
        <TabPane key="variables" title="变量查看">
          <VariablesView history={executionHistory} />
        </TabPane>
        <TabPane key="logs" title="日志">
          <LogsView history={executionHistory} />
        </TabPane>
        <TabPane key="performance" title="性能">
          <PerformanceView history={executionHistory} />
        </TabPane>
      </Tabs>
    </Card>
  );
}

// 执行时间线
function ExecutionTimeline({ history }: { history: NodeExecutionResult[] }) {
  return (
    <Timeline>
      {history.map((result, index) => {
        const node = nodes.find(n => n.id === result.nodeId);
        return (
          <Timeline.Item
            key={index}
            dot={
              result.status === 'success' ? (
                <CheckCircleIcon style={{ color: '#00b42a' }} />
              ) : (
                <CloseCircleIcon style={{ color: '#f53f3f' }} />
              )
            }
          >
            <div className="timeline-item">
              <div className="timeline-header">
                <strong>{node?.data.label}</strong>
                <span className="timeline-time">{result.executionTime.toFixed(2)}ms</span>
              </div>
              <div className="timeline-content">
                {result.status === 'error' && (
                  <div className="error-message">{result.error}</div>
                )}
                <details>
                  <summary>查看详情</summary>
                  <pre>{JSON.stringify({ inputs: result.inputs, outputs: result.outputs }, null, 2)}</pre>
                </details>
              </div>
            </div>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}

// 变量查看
function VariablesView({ history }: { history: NodeExecutionResult[] }) {
  const variables: Record<string, any> = {};
  history.forEach(result => {
    variables[result.nodeId] = result.outputs;
  });

  return (
    <Table
      data={Object.entries(variables).map(([key, value]) => ({ key, value: JSON.stringify(value) }))}
      columns={[
        { title: '节点 ID', dataIndex: 'key' },
        { title: '输出值', dataIndex: 'value' },
      ]}
    />
  );
}
```

## 四、最佳实践

### 4.1 错误处理

```typescript
try {
  const result = await executor.execute();
} catch (error) {
  if (error instanceof NetworkError) {
    Message.error('网络错误，请检查连接');
  } else if (error instanceof ValidationError) {
    Message.error(`验证失败: ${error.message}`);
  } else {
    Message.error(`未知错误: ${error.message}`);
  }
}
```

### 4.2 性能监控

```typescript
const performanceMetrics = {
  totalTime: executionHistory.reduce((acc, r) => acc + r.executionTime, 0),
  avgTime: executionHistory.length > 0
    ? executionHistory.reduce((acc, r) => acc + r.executionTime, 0) / executionHistory.length
    : 0,
  slowestNode: executionHistory.reduce((a, b) => a.executionTime > b.executionTime ? a : b),
};
```

---

**文档状态**: ✅ 完成
**下一步**: 创建 [19-workflow-sdk.md]
