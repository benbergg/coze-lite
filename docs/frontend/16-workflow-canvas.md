# Workflow - 工作流画布系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-workflow/render`, `@coze-workflow/fabric-canvas`

## 一、概述

工作流画布是 Workflow 系统的核心视觉界面，负责节点的渲染、连线绘制、交互控制等功能。本文档深度剖析 Coze Studio 的画布系统架构，并提供基于 React Flow 的 Coze Lite 简化实现方案。

### 1.1 核心功能

- **节点渲染**: 可视化展示工作流节点
- **连线绘制**: 节点间的连接关系
- **交互操作**: 拖拽、缩放、平移、框选
- **对齐工具**: 智能吸附、对齐辅助线
- **自动布局**: 一键优化节点布局
- **小地图**: 全局视图导航

### 1.2 Coze Studio vs Coze Lite

| 功能 | Coze Studio | Coze Lite | 说明 |
|------|-------------|-----------|------|
| 画布引擎 | Flowgram.ai + Fabric.js | React Flow | 轻量级开源方案 |
| 连线类型 | 贝塞尔曲线 + 折线 | 贝塞尔曲线 | 简化为单一类型 |
| 吸附对齐 | 完整吸附系统 | 基础网格吸附 | 简化对齐功能 |
| 自动布局 | Dagre 算法 | Dagre 算法 | 保持核心能力 |
| Fabric 画布 | 支持 | 不支持 | 去除图形编辑 |
| 小地图 | 完整实现 | React Flow 内置 | 使用内置组件 |

## 二、Coze Studio 架构分析

### 2.1 双引擎架构

Coze Studio 采用**双画布引擎架构**：

#### **主画布引擎：Flowgram.ai**

**依赖包**:
```json
{
  "@flowgram.ai/core": "^0.1.28",
  "@flowgram.ai/document": "^0.1.28",
  "@flowgram.ai/free-layout-core": "^0.1.28",
  "@flowgram.ai/free-layout-editor": "^0.1.28",
  "@flowgram.ai/renderer": "^0.1.28",
  "@flowgram.ai/minimap-plugin": "^0.1.28",
  "@flowgram.ai/free-auto-layout-plugin": "^0.1.28",
  "@flowgram.ai/free-snap-plugin": "^0.1.28",
  "@flowgram.ai/free-lines-plugin": "^0.1.28"
}
```

**特性**:
- 基于 Inversify 依赖注入容器
- 插件化扩展架构
- 分层渲染系统
- 自由布局能力

#### **辅助画布引擎：Fabric.js**

**版本**: `fabric@6.0.0-rc2`

**用途**:
- 节点内部的富图形编辑
- 文本编辑、形状绘制
- 图片处理
- 自由画笔

### 2.2 渲染层次架构

**文件位置**: `render/src/layer/*.tsx`

Workflow 使用 6 层渲染架构：

```
┌─────────────────────────────────────┐
│  6. ShortcutsLayer (快捷操作层)      │ ← 工具提示、右键菜单
├─────────────────────────────────────┤
│  5. SelectorBoundsLayer (选择框层)   │ ← 框选、多选
├─────────────────────────────────────┤
│  4. HoverLayer (悬停高亮层)          │ ← 节点悬停效果
├─────────────────────────────────────┤
│  3. LinesLayer.frontLines (前置线层) │ ← 节点上方的连线
├─────────────────────────────────────┤
│  2. NodesContentLayer (节点内容层)   │ ← 节点主体渲染
├─────────────────────────────────────┤
│  1. LinesLayer.backLines (后置线层)  │ ← 节点下方的连线
├─────────────────────────────────────┤
│  0. BackgroundLayer (背景网格层)     │ ← 网格背景
└─────────────────────────────────────┘
```

**连线层实现**:

**文件位置**: `render/src/layer/lines-layer.tsx:18-85`

```typescript
@injectable()
export class LinesLayer extends Layer {
  static type = 'WorkflowLinesLayer';

  @observeEntities(WorkflowLineEntity) readonly lines: WorkflowLineEntity[];

  private _frontLineEntities: WorkflowLineEntity[] = [];
  private _backLineEntities: WorkflowLineEntity[] = [];

  // 线条在节点下方
  protected backLines = domUtils.createDivWithClass(
    'gedit-playground-layer gedit-flow-lines-layer back',
  );

  // 线条在节点前方
  protected frontLines = domUtils.createDivWithClass(
    'gedit-playground-layer gedit-flow-lines-layer front',
  );

  onZoom(scale: number): void {
    this.backLines.style.transform = `scale(${scale})`;
    this.frontLines.style.transform = `scale(${scale})`;
  }

  renderLines(lines: WorkflowLineEntity[]) {
    const { lineType } = this.workflowDocument.linesManager;

    return (
      <>
        {lines.map(line => {
          const color = this.getLineColor(line);
          const selected = this.selectService.isSelected(line.id);

          // 折线渲染
          if (lineType === LineType.LINE_CHART) {
            return <FoldLineRender key={line.id} color={color} selected={selected} line={line} />;
          }

          // 贝塞尔曲线渲染
          return <BezierLineRender key={line.id} color={color} selected={selected} line={line} />;
        })}
      </>
    );
  }
}
```

### 2.3 连线渲染系统

#### 2.3.1 贝塞尔曲线连线

**文件位置**: `render/src/components/lines/bezier-line/index.tsx:25-65`

```typescript
export const BezierLineRender = React.memo((props: BezierLineProps) => {
  const { line, color, selected } = props;
  const renderData = line.getData(WorkflowLineRenderData);
  const { bounds: bbox } = renderData;
  const strokeWidth = selected ? STROKE_WIDTH_SELECTED : STROKE_WIDTH;

  return (
    <div
      className="gedit-flow-activity-edge"
      style={{
        left: bbox.x - PADDING,
        top: bbox.y - PADDING,
        position: 'absolute',
      }}
    >
      <svg width={bbox.width + PADDING * 2} height={bbox.height + PADDING * 2}>
        <defs>
          {/* 渐变色定义 */}
          <linearGradient x1="0%" y1="100%" x2="100%" y2="100%" id={line.id}>
            <stop stopColor={color || linearStartColor} offset="0%" />
            <stop stopColor={color || linearEndColor} offset="100%" />
          </linearGradient>
        </defs>
        <g>
          {/* 贝塞尔曲线路径 */}
          <path
            d={renderData.path}
            fill="none"
            stroke={`url(#${line.id})`}
            strokeWidth={strokeWidth}
          />
          {/* 箭头 */}
          <ArrowRenderer id={line.id} pos={arrowToPos} strokeWidth={strokeWidth} />
        </g>
      </svg>
    </div>
  );
});
```

**贝塞尔曲线路径计算**:
```typescript
// 计算贝塞尔曲线控制点
const dx = targetX - sourceX;
const dy = targetY - sourceY;
const controlPointOffset = Math.min(Math.abs(dx) / 2, 100);

const path = `M ${sourceX},${sourceY}
              C ${sourceX + controlPointOffset},${sourceY}
                ${targetX - controlPointOffset},${targetY}
                ${targetX},${targetY}`;
```

#### 2.3.2 折线连线

**文件位置**: `render/src/components/lines/fold-line/index.tsx:20-55`

```typescript
export const FoldLineRender = React.memo((props: BezierLineProps) => {
  const { selected, color, line } = props;
  const strokeWidth = selected ? STROKE_WIDTH_SELECTED : STROKE_WIDTH;
  const renderData = line.getData(WorkflowLineRenderData);

  return (
    <div className="gedit-flow-activity-edge" style={{ position: 'absolute' }}>
      <svg overflow="visible">
        <g>
          <path
            d={renderData.path}
            fill="none"
            strokeLinecap="round"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <ArrowRenderer id={line.id} pos={arrowToPos} strokeWidth={strokeWidth} />
        </g>
      </svg>
    </div>
  );
});
```

**折线路径计算**:
```typescript
// 计算折线路径（正交路径）
const midX = (sourceX + targetX) / 2;
const path = `M ${sourceX},${sourceY}
              L ${midX},${sourceY}
              L ${midX},${targetY}
              L ${targetX},${targetY}`;
```

### 2.4 节点渲染系统

#### 2.4.1 端口（Port）渲染

**文件位置**: `render/src/components/workflow-port-render/index.tsx:35-85`

```typescript
export const WorkflowPortRender: React.FC<WorkflowPortRenderProps> = React.memo(props => {
  const { entity } = props;
  const { portType, portID, relativePosition, disabled, errorMessage } = entity;

  // 拖拽开始绘制连线
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (portType === 'input' || disabled) return;
    e.stopPropagation();
    dragService.startDrawingLine(entity, e);
  }, [dragService, portType, portID]);

  const hasError = !!errorMessage;

  const icon = (
    <div className={classNames({
      [styles.bg]: true,
      [styles.hasError]: hasError,
    })}>
      {hasError ? <WarningIcon /> : <CrossHairIcon />}
    </div>
  );

  return (
    <div
      className={className}
      style={{ left: posX, top: posY }}
      onMouseDown={onMouseDown}
    >
      <div className={styles.bgCircle}></div>
      {icon}
      <div className={styles['focus-circle']} />
    </div>
  );
});
```

**端口样式**:
```css
.workflow-port {
  position: absolute;
  width: 16px;
  height: 16px;
  cursor: crosshair;
  z-index: 10;
}

.workflow-port .bg {
  width: 8px;
  height: 8px;
  background: #fff;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
}

.workflow-port:hover .focus-circle {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-primary);
  opacity: 0.3;
  animation: pulse 1.5s ease-in-out infinite;
}
```

#### 2.4.2 节点头部组件

**文件位置**: `playground/src/nodes-v2/components/node-header/index.tsx:25-65`

```typescript
export const NodeHeader = withValidation<NodeHeaderProps>(({
  value,
  onChange,
  readonly = false,
  hideTest = false,
}) => {
  const { title, icon, subTitle, description } = value || {};

  return (
    <NodeHeaderComponent
      title={title}
      subTitle={subTitle}
      description={description}
      logo={icon}
      onTitleChange={newTitle => {
        onChange({ ...value, title: newTitle });
      }}
      readonly={readonly}
    />
  );
});
```

## 三、画布交互功能

### 3.1 缩放与平移

**文件位置**: `fabric-canvas/src/hooks/use-viewport.tsx:18-75`

```typescript
export const useViewport = ({ canvas, schema, minZoom, maxZoom }) => {
  const [viewport, _setViewport] = useState<TMat2D>([1, 0, 0, 1, 0, 0]);

  // 设置视口（带边界限制）
  const setCanvasViewport = useCallback((vpt: TMat2D) => {
    const _vpt: TMat2D = [...vpt];

    // 限制视口移动区域：不能移出画布
    if (_vpt[4] > 0) _vpt[4] = 0;
    if (_vpt[4] < -schema.width * (_vpt[0] - 1)) {
      _vpt[4] = -schema.width * (_vpt[0] - 1);
    }
    if (_vpt[5] > 0) _vpt[5] = 0;
    if (_vpt[5] < -schema.height * (_vpt[0] - 1)) {
      _vpt[5] = -schema.height * (_vpt[0] - 1);
    }

    setViewport({ canvas, vpt: _vpt });
    _setViewport(_vpt);
    canvas.fire('object:moving');
  }, [canvas, schema, minZoom, maxZoom]);

  // 缩放到指定点
  const _zoomToPoint = useCallback((point: Point, zoomLevel: number) => {
    const vpt = zoomToPoint({ canvas, point, zoomLevel, minZoom, maxZoom });
    setCanvasViewport(vpt);
  }, [setCanvasViewport]);

  return { setViewport: setCanvasViewport, viewport, zoomToPoint: _zoomToPoint };
};
```

**缩放配置**:
```typescript
const MIN_ZOOM = 0.3;  // 最小缩放 30%
const MAX_ZOOM = 3;    // 最大缩放 300%
const ZOOM_STEP = 0.05; // 缩放步长 5%
```

**手势支持**:
```typescript
import { useGesture } from '@use-gesture/react';

const gestureBind = useGesture({
  onPinch: state => {
    const e = state.event as WheelEvent;
    onWheelZoom(e, state.first);
  },
  onWheel: state => {
    if (state.metaKey) {
      // Cmd/Ctrl + 滚轮 = 缩放
      onWheelZoom(e, state.first);
    } else {
      // 单纯滚轮 = 平移
      onWheelTransform(e.deltaX, e.deltaY);
    }
  },
});
```

### 3.2 智能吸附对齐

**文件位置**: `fabric-canvas/src/utils/snap/snap.tsx:25-95`

```typescript
class SnapService {
  helpline: Helpline;
  canvas: Canvas;
  threshold = 10;  // 吸附阈值 10px
  rules: Snap.Rule[] = [paddingRule, alignRule];

  constructor(canvas: Canvas, helpLineLayerId: string, scale?: number) {
    this.canvas = canvas;
    this.helpline = new Helpline(canvas, helpLineLayerId, scale);
  }

  private _move = ({ target, controlType }) => {
    const targetPoints = getObjectPoints(target);

    // 应用吸附规则
    const snapRs = this.rules.map(rule =>
      rule({
        otherPoints: this.points,
        targetPoint: targetPoints,
        threshold: this.threshold,
        controlType,
      }),
    );

    // 合并结果
    const rs: Snap.RuleResult = {
      top: getLatestSnapRs(snapRs.map(d => d.top).filter(Boolean)),
      left: getLatestSnapRs(snapRs.map(d => d.left).filter(Boolean)),
      height: getLatestSnapRs(snapRs.map(d => d.height).filter(Boolean)),
      width: getLatestSnapRs(snapRs.map(d => d.width).filter(Boolean)),
    };

    // 显示辅助线
    const helplines = [...(rs.top?.helplines || []), ...];
    this.helpline.show(helplines);

    // 应用吸附位置
    Object.keys(newAttrs).forEach(key => {
      if (rs[key]?.isSnap) {
        target.set(key, newAttrs[key]);
      }
    });
  };
}
```

**吸附规则**:
1. **对齐规则** (`alignRule`) - 左、中、右、上、中、下对齐
2. **间距规则** (`paddingRule`) - 等间距分布

### 3.3 对齐工具

**文件位置**: `fabric-canvas/src/hooks/use-align.tsx:12-85`

```typescript
export const useAlign = ({ canvas, selectObjects = [] }) => {
  // 水平左对齐
  const alignLeft = useCallback(() => {
    if (!canvas || selectObjects.length < 2) return;
    const activeObject = canvas.getActiveObject();

    selectObjects.forEach(obj => {
      obj.set({ left: -activeObject.width / 2 });
      obj.setCoords();
    });
    canvas.fire('object:moving');
    canvas.requestRenderAll();
  }, [canvas, selectObjects]);

  // 水平居中对齐
  const alignCenter = useCallback(() => {
    selectObjects.forEach(obj => {
      obj.set({ left: -obj.getBoundingRect().width / 2 });
    });
    canvas.requestRenderAll();
  }, [canvas, selectObjects]);

  // 垂直顶部对齐
  const alignTop = useCallback(() => {
    selectObjects.forEach(obj => {
      obj.set({ top: -activeObject.height / 2 });
    });
    canvas.requestRenderAll();
  }, [canvas, selectObjects]);

  return {
    alignLeft,       // 左对齐
    alignRight,      // 右对齐
    alignCenter,     // 水平居中
    alignTop,        // 顶部对齐
    alignBottom,     // 底部对齐
    alignMiddle,     // 垂直居中
    verticalAverage,   // 垂直均分
    horizontalAverage, // 水平均分
  };
};
```

## 四、UI 组件

### 4.1 顶部工具栏

**文件位置**: `fabric-canvas/src/components/topbar/index.tsx:35-125`

```typescript
interface TopBarProps {
  mode?: Mode;  // 当前绘图模式
  onModeChange: (currentMode?: Mode, prevMode?: Mode) => void;

  // 缩放设置
  zoomSettings: {
    zoom: number;
    onChange: (value: number) => void;
    reset: () => void;
    max: number;
    min: number;
  };

  // 画布设置
  canvasSettings: {
    width: number;
    height: number;
    background: string;
    onChange: (value: { width?, height?, background? }) => void;
  };

  // 对齐方法
  aligns: Record<AlignMode, () => void>;
}

export const TopBar = (props: TopBarProps) => {
  return (
    <div className="canvas-topbar">
      {/* 撤销/重做 */}
      <ButtonGroup>
        <IconButton icon={<IconUndo />} onClick={undo} />
        <IconButton icon={<IconRedo />} onClick={redo} />
      </ButtonGroup>

      {/* 绘图工具 */}
      <ButtonGroup>
        <IconButton icon={<IconText />} onClick={() => setMode('text')} />
        <IconButton icon={<IconRect />} onClick={() => setMode('rect')} />
        <IconButton icon={<IconCircle />} onClick={() => setMode('circle')} />
        <IconButton icon={<IconLine />} onClick={() => setMode('line')} />
        <IconButton icon={<IconPencil />} onClick={() => setMode('pencil')} />
      </ButtonGroup>

      {/* 对齐工具 */}
      <ButtonGroup>
        <IconButton icon={<IconAlignLeft />} onClick={aligns.alignLeft} />
        <IconButton icon={<IconAlignCenter />} onClick={aligns.alignCenter} />
        <IconButton icon={<IconAlignRight />} onClick={aligns.alignRight} />
      </ButtonGroup>

      {/* 缩放控制 */}
      <ZoomControl
        value={zoomSettings.zoom}
        onChange={zoomSettings.onChange}
        onReset={zoomSettings.reset}
        min={zoomSettings.min}
        max={zoomSettings.max}
      />
    </div>
  );
};
```

### 4.2 小地图

**文件位置**: `playground/src/components/toolbar/components/minimap.tsx:18-45`

```typescript
export const Minimap = (props: IMinimapProps) => {
  const minimapService = useService(FlowMinimapService);

  if (!minimapVisible) return <></>;

  return (
    <div className="workflow-toolbar-minimap">
      <MinimapRender
        service={minimapService}
        containerStyles={{
          pointerEvents: 'auto',
          position: 'relative',
        }}
        inactiveStyle={{
          opacity: 1,
          scale: 1,
        }}
      />
    </div>
  );
};
```

### 4.3 自动布局

**文件位置**: `playground/src/components/toolbar/components/auto-layout.tsx:12-35`

```typescript
export const AutoLayout = () => {
  const runAutoLayout = useAutoLayout();
  const playground = usePlayground();

  const autoLayout = useCallback(async () => {
    await runAutoLayout();
    reporter.event({
      eventName: 'workflow_control_auto_layout',
      namespace: 'workflow',
    });
  }, [runAutoLayout]);

  return (
    <Tooltip content={I18n.t('workflow_detail_layout_optimization_tooltip')}>
      <IconButton onClick={autoLayout} icon={<IconCozAutoLayout />} />
    </Tooltip>
  );
};
```

## 五、Coze Lite 设计方案

### 5.1 技术选型 - React Flow

**为什么选择 React Flow**:
1. **轻量级**: ~100KB，远小于 Flowgram.ai
2. **React 原生**: 完美集成 React 生态
3. **文档完善**: 官方文档和示例丰富
4. **活跃维护**: GitHub 14k+ stars，活跃社区
5. **功能完整**: 缩放、平移、连线、小地图一应俱全
6. **TypeScript 支持**: 完整类型定义

**安装**:
```bash
pnpm add reactflow
```

### 5.2 核心数据结构

**文件路径**: `frontend/src/types/workflow-canvas.ts`

```typescript
import { Node, Edge } from 'reactflow';

// 节点数据结构
export interface WorkflowNode extends Node {
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
export interface WorkflowEdge extends Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'default' | 'step' | 'smoothstep' | 'straight';
  animated?: boolean;
  style?: React.CSSProperties;
}

// 节点类型
export enum NodeType {
  START = 'start',
  END = 'end',
  LLM = 'llm',
  CODE = 'code',
  API = 'api',
  IF = 'if',
  VARIABLE = 'variable',
  DATABASE = 'database',
}
```

### 5.3 画布组件实现

**文件路径**: `frontend/src/components/workflow/WorkflowCanvas/index.tsx`

```typescript
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StartNode } from './nodes/StartNode';
import { EndNode } from './nodes/EndNode';
import { LLMNode } from './nodes/LLMNode';
import { CodeNode } from './nodes/CodeNode';
import { IfNode } from './nodes/IfNode';

// 节点类型映射
const nodeTypes = {
  start: StartNode,
  end: EndNode,
  llm: LLMNode,
  code: CodeNode,
  if: IfNode,
  // ... 其他节点类型
};

interface WorkflowCanvasProps {
  workflowId: string;
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  readonly?: boolean;
}

export function WorkflowCanvas({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  readonly = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  // 处理连线
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge({ ...connection, type: 'smoothstep' }, eds));
    },
    [setEdges]
  );

  // 节点变化回调
  useEffect(() => {
    onNodesChange?.(nodes);
  }, [nodes]);

  // 边变化回调
  useEffect(() => {
    onEdgesChange?.(edges);
  }, [edges]);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
      >
        {/* 背景网格 */}
        <Background color="#aaa" gap={16} />

        {/* 缩放/平移控制 */}
        <Controls />

        {/* 小地图 */}
        <MiniMap
          nodeColor={node => {
            switch (node.type) {
              case 'start':
                return '#10b981';
              case 'end':
                return '#ef4444';
              case 'llm':
                return '#3b82f6';
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
```

### 5.4 自定义节点组件

**文件路径**: `frontend/src/components/workflow/WorkflowCanvas/nodes/LLMNode.tsx`

```typescript
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@arco-design/web-react';
import { IconRobot } from '@arco-design/web-react/icon';
import './LLMNode.css';

export const LLMNode = memo(({ data, selected }: NodeProps) => {
  return (
    <Card
      className={`workflow-node llm-node ${selected ? 'selected' : ''}`}
      size="small"
    >
      {/* 输入端口 */}
      <Handle
        type="target"
        position={Position.Left}
        className="workflow-node-handle"
      />

      {/* 节点头部 */}
      <div className="workflow-node-header">
        <IconRobot className="node-icon" />
        <span className="node-title">{data.label || 'LLM 节点'}</span>
      </div>

      {/* 节点内容 */}
      <div className="workflow-node-content">
        <div className="node-config">
          <div className="config-item">
            <label>模型:</label>
            <span>{data.config?.model || 'gpt-4'}</span>
          </div>
          <div className="config-item">
            <label>温度:</label>
            <span>{data.config?.temperature || 0.7}</span>
          </div>
        </div>
      </div>

      {/* 输出端口 */}
      <Handle
        type="source"
        position={Position.Right}
        className="workflow-node-handle"
      />
    </Card>
  );
});

LLMNode.displayName = 'LLMNode';
```

**CSS 样式**: `frontend/src/components/workflow/WorkflowCanvas/nodes/LLMNode.css`

```css
.workflow-node {
  min-width: 200px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.workflow-node.selected {
  box-shadow: 0 0 0 2px var(--color-primary-6);
}

.workflow-node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border-2);
}

.workflow-node-header .node-icon {
  font-size: 18px;
  color: var(--color-primary-6);
}

.workflow-node-header .node-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

.workflow-node-content {
  padding: 12px;
}

.node-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.config-item label {
  color: var(--color-text-3);
}

.config-item span {
  color: var(--color-text-1);
  font-weight: 500;
}

/* 端口样式 */
.workflow-node-handle {
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid var(--color-primary-6);
}

.workflow-node-handle:hover {
  width: 12px;
  height: 12px;
}

/* LLM 节点特定样式 */
.llm-node {
  border: 2px solid var(--color-primary-light-3);
}

.llm-node .node-icon {
  color: var(--color-primary-6);
}
```

### 5.5 工具栏组件

**文件路径**: `frontend/src/components/workflow/WorkflowToolbar/index.tsx`

```typescript
import { Button, Space, Tooltip } from '@arco-design/web-react';
import {
  IconPlus,
  IconMinus,
  IconRefresh,
  IconLayout,
  IconSave,
  IconPlayArrow,
} from '@arco-design/web-react/icon';
import { useReactFlow } from 'reactflow';
import './index.css';

interface WorkflowToolbarProps {
  onAutoLayout?: () => void;
  onSave?: () => void;
  onRun?: () => void;
}

export function WorkflowToolbar({ onAutoLayout, onSave, onRun }: WorkflowToolbarProps) {
  const reactFlow = useReactFlow();

  // 放大
  const handleZoomIn = () => {
    reactFlow.zoomIn();
  };

  // 缩小
  const handleZoomOut = () => {
    reactFlow.zoomOut();
  };

  // 适应视图
  const handleFitView = () => {
    reactFlow.fitView();
  };

  return (
    <div className="workflow-toolbar">
      <Space size="small">
        {/* 缩放控制 */}
        <Space.Group>
          <Tooltip content="放大">
            <Button icon={<IconPlus />} onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip content="缩小">
            <Button icon={<IconMinus />} onClick={handleZoomOut} />
          </Tooltip>
          <Tooltip content="适应视图">
            <Button icon={<IconRefresh />} onClick={handleFitView} />
          </Tooltip>
        </Space.Group>

        {/* 自动布局 */}
        {onAutoLayout && (
          <Tooltip content="自动布局">
            <Button icon={<IconLayout />} onClick={onAutoLayout} />
          </Tooltip>
        )}

        {/* 保存 */}
        {onSave && (
          <Button type="primary" icon={<IconSave />} onClick={onSave}>
            保存
          </Button>
        )}

        {/* 运行 */}
        {onRun && (
          <Button type="primary" status="success" icon={<IconPlayArrow />} onClick={onRun}>
            运行
          </Button>
        )}
      </Space>
    </div>
  );
}
```

### 5.6 自动布局实现

使用 **Dagre** 算法进行自动布局：

**安装**:
```bash
pnpm add dagre @types/dagre
```

**实现**:

**文件路径**: `frontend/src/components/workflow/utils/autoLayout.ts`

```typescript
import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

const nodeWidth = 220;
const nodeHeight = 120;

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  // 添加节点
  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // 添加边
  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // 执行布局
  dagre.layout(dagreGraph);

  // 更新节点位置
  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

**使用自动布局**:
```typescript
const handleAutoLayout = useCallback(() => {
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    nodes,
    edges,
    'TB'  // 从上到下布局
  );

  setNodes(layoutedNodes);
  setEdges(layoutedEdges);

  // 适应视图
  reactFlow.fitView();
}, [nodes, edges, setNodes, setEdges]);
```

## 六、使用示例

### 6.1 完整工作流编辑器

**文件路径**: `frontend/src/pages/workflow/editor/[id].tsx`

```typescript
import { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { WorkflowToolbar } from '@/components/workflow/WorkflowToolbar';
import { getLayoutedElements } from '@/components/workflow/utils/autoLayout';
import { useWorkflowStore } from '@/stores/workflowStore';

export default function WorkflowEditorPage() {
  const { id: workflowId } = useParams();
  const { getWorkflow, updateWorkflow } = useWorkflowStore();

  const workflow = getWorkflow(workflowId);
  const [nodes, setNodes] = useState(workflow.nodes);
  const [edges, setEdges] = useState(workflow.edges);

  // 自动布局
  const handleAutoLayout = () => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  };

  // 保存工作流
  const handleSave = () => {
    updateWorkflow(workflowId, { nodes, edges });
    Message.success('保存成功');
  };

  // 运行工作流
  const handleRun = () => {
    // 调用工作流执行 API
    navigate(`/workflow/${workflowId}/run`);
  };

  return (
    <div className="workflow-editor">
      <ReactFlowProvider>
        {/* 工具栏 */}
        <WorkflowToolbar
          onAutoLayout={handleAutoLayout}
          onSave={handleSave}
          onRun={handleRun}
        />

        {/* 画布 */}
        <WorkflowCanvas
          workflowId={workflowId}
          initialNodes={nodes}
          initialEdges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
        />
      </ReactFlowProvider>
    </div>
  );
}
```

### 6.2 添加节点

```typescript
import { useReactFlow } from 'reactflow';

export function NodePalette() {
  const reactFlow = useReactFlow();

  const addNode = (type: NodeType) => {
    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      data: {
        label: `新${getNodeLabel(type)}`,
        config: {},
      },
    };

    reactFlow.addNodes(newNode);
  };

  return (
    <div className="node-palette">
      <Button onClick={() => addNode('llm')}>添加 LLM 节点</Button>
      <Button onClick={() => addNode('code')}>添加代码节点</Button>
      <Button onClick={() => addNode('api')}>添加 API 节点</Button>
    </div>
  );
}
```

## 七、最佳实践

### 7.1 性能优化

1. **使用 memo 包裹节点组件**:
```typescript
export const LLMNode = memo(({ data, selected }: NodeProps) => {
  // ...
});
```

2. **避免不必要的重渲染**:
```typescript
const onNodesChange = useCallback((changes) => {
  setNodes(nds => applyNodeChanges(changes, nds));
}, []);
```

3. **懒加载节点内容**:
```typescript
const NodeContent = lazy(() => import('./NodeContent'));

<Suspense fallback={<Spin />}>
  <NodeContent />
</Suspense>
```

### 7.2 用户体验优化

1. **平滑动画**:
```css
.react-flow__node {
  transition: transform 0.2s ease;
}
```

2. **连线动画**:
```typescript
<Edge
  id={edge.id}
  source={edge.source}
  target={edge.target}
  animated={true}  // 启用动画
  style={{ strokeWidth: 2 }}
/>
```

3. **节点选中反馈**:
```css
.workflow-node.selected {
  box-shadow: 0 0 0 2px var(--color-primary-6);
  transform: scale(1.02);
}
```

### 7.3 数据持久化

```typescript
// 保存工作流到后端
const saveWorkflow = async () => {
  const workflow = {
    id: workflowId,
    nodes: reactFlow.getNodes(),
    edges: reactFlow.getEdges(),
  };

  await fetch(`/api/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify(workflow),
  });
};

// 自动保存（防抖）
const debouncedSave = useMemo(
  () => debounce(saveWorkflow, 2000),
  [workflowId]
);

useEffect(() => {
  debouncedSave();
}, [nodes, edges]);
```

## 八、扩展方向

### 8.1 高级功能

- **框选操作**: 多选节点批量操作
- **快捷键**: 复制/粘贴/删除/撤销/重做
- **右键菜单**: 节点/连线/画布右键菜单
- **拖拽添加**: 从侧边栏拖拽节点到画布

### 8.2 可视化增强

- **节点分组**: Group 节点支持折叠
- **节点注释**: 支持添加注释和说明
- **主题切换**: 暗黑模式支持
- **网格吸附**: 节点自动对齐网格

---

**文档状态**: ✅ 完成
**下一步**: 创建 [17-workflow-nodes.md] - 节点系统文档
