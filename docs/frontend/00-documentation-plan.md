# Coze Lite 前端开发文档计划

## 文档概述

本文档集旨在通过深入分析 Coze Studio 源码，为 Coze Lite 项目提供完整的前端开发指南。文档采用模块化组织，每个模块包含架构分析、技术实现和开发指南。

## 文档结构

### 第一阶段：整体架构（已规划）

- [x] `00-documentation-plan.md` - 文档计划和索引（本文档）
- [ ] `01-architecture-overview.md` - 前端整体架构文档
- [ ] `02-tech-stack.md` - 技术栈选型和说明

### 第二阶段：基础设施模块

#### 2.1 项目基础配置
- [ ] `03-project-setup.md` - 项目初始化和构建配置
  - Monorepo 架构（Rush vs PNPM Workspace）
  - Vite/Rsbuild 构建配置
  - TypeScript 配置
  - 代码规范（ESLint、Prettier、Stylelint）

#### 2.2 路由和布局系统
- [ ] `04-routing-layout.md` - 路由和布局系统
  - React Router v6 配置
  - 布局组件架构
  - 权限路由
  - 页面加载策略

#### 2.3 状态管理
- [ ] `05-state-management.md` - 状态管理方案
  - Zustand 使用模式
  - 全局状态设计
  - 模块状态隔离
  - 状态持久化

#### 2.4 API 集成
- [ ] `06-api-integration.md` - API 集成和数据管理
  - API 客户端封装
  - 请求/响应拦截
  - 错误处理
  - 数据缓存策略

### 第三阶段：核心功能模块

#### 3.1 账户系统模块
- [ ] `07-account-system.md` - 账户系统模块
  - 登录/注册页面
  - 身份认证流程
  - Token 管理
  - 用户状态管理
  - 源码参考：`@coze-foundation/account-*`

#### 3.2 工作空间模块
- [ ] `08-workspace-module.md` - 工作空间模块
  - 工作空间列表和管理
  - 空间切换逻辑
  - 项目组织结构
  - 权限控制
  - 源码参考：`@coze-foundation/space-*`

#### 3.3 Agent IDE 模块
- [ ] `09-agent-ide-overview.md` - Agent IDE 总览
- [ ] `10-agent-ide-layout.md` - Agent IDE 布局系统
  - 编辑器整体布局
  - 左侧配置区
  - 右侧预览/调试区
  - 源码参考：`@coze-agent-ide/layout*`

- [ ] `11-agent-ide-prompt.md` - Prompt 编辑器
  - Prompt 编辑器组件
  - 变量系统
  - 模板管理
  - 源码参考：`@coze-agent-ide/prompt*`

- [ ] `12-agent-ide-tools.md` - 工具管理
  - 工具选择和配置
  - 插件集成
  - 工具调试
  - 源码参考：`@coze-agent-ide/tool*`

- [ ] `13-agent-ide-chat.md` - 聊天调试区
  - 对话界面
  - 消息渲染
  - 流式响应处理
  - 源码参考：`@coze-agent-ide/chat-*`

- [x] `14-agent-ide-publish.md` - Agent 发布
  - 发布流程
  - 版本管理
  - 源码参考：`@coze-agent-ide/agent-publish`

#### 3.4 Workflow 模块
- [x] `15-workflow-overview.md` - Workflow 总览
- [x] `16-workflow-canvas.md` - 工作流画布
  - Fabric Canvas 集成
  - 节点渲染系统
  - 连线系统
  - 源码参考：`@coze-workflow/fabric-canvas`

- [x] `17-workflow-nodes.md` - 节点系统
  - 节点类型和组件
  - 节点配置面板
  - 自定义节点开发
  - 源码参考：`@coze-workflow/nodes`

- [x] `18-workflow-playground.md` - Workflow 调试运行
  - 调试运行环境
  - 变量查看
  - 执行日志
  - 源码参考：`@coze-workflow/playground`

- [x] `19-workflow-sdk.md` - Workflow SDK
  - SDK 使用方法
  - 事件系统
  - 数据流管理
  - 源码参考：`@coze-workflow/sdk`

#### 3.5 资源管理模块
- [x] `20-resource-management.md` - 资源管理总览
- [x] `21-plugin-system.md` - 插件系统
  - 插件列表和管理
  - 插件配置
  - 插件调试
  - 源码参考：`@coze-studio/bot-plugin-store`

- [x] `22-knowledge-base.md` - 知识库管理
  - 知识库创建和配置
  - 文档上传和索引
  - 知识库预览
  - 源码参考：`@coze-data/knowledge`

- [x] `23-database-module.md` - 数据库模块
  - 数据库管理
  - 表结构定义
  - 数据查看和编辑

#### 3.6 探索模块
- [ ] `24-explore-module.md` - 探索/商店模块
  - 插件商店
  - 模板商店
  - 搜索和过滤
  - 源码参考：`@coze-community/explore`

### 第四阶段：UI 组件和工具

#### 4.1 组件系统
- [ ] `25-component-library.md` - 组件库
  - UI 组件库选择（Arco Design）
  - 自定义组件开发
  - 组件主题定制
  - 源码参考：`@coze-studio/components`

#### 4.2 国际化
- [ ] `26-i18n.md` - 国际化方案
  - i18n 配置
  - 多语言管理
  - 动态切换
  - 源码参考：`@coze-arch/i18n`

#### 4.3 工具和辅助
- [ ] `27-utilities.md` - 工具函数和 Hooks
  - 常用工具函数
  - 自定义 Hooks
  - 源码参考：`@coze-arch/bot-hooks`

### 第五阶段：开发和部署

- [ ] `28-development-guide.md` - 开发指南
  - 开发环境搭建
  - 调试技巧
  - 性能优化

- [ ] `29-testing-strategy.md` - 测试策略
  - 单元测试
  - 集成测试
  - E2E 测试

- [ ] `30-build-deploy.md` - 构建和部署
  - 生产构建
  - 部署方案
  - Docker 化

## 文档编写原则

1. **源码驱动**：每个模块都基于 Coze Studio 源码分析
2. **实用导向**：提供可直接使用的代码示例和最佳实践
3. **渐进式**：从简单到复杂，支持逐步实现
4. **完整性**：包含架构设计、实现细节和开发指南

## 开发优先级

### 高优先级（MVP 核心功能）
1. 项目基础配置（文档 03）
2. 路由和布局系统（文档 04）
3. 账户系统（文档 07）
4. 工作空间模块（文档 08）
5. Agent IDE 基础（文档 09-11）

### 中优先级（完整功能）
6. Workflow 基础（文档 15-17）
7. 插件系统（文档 21）
8. API 集成（文档 06）

### 低优先级（增强功能）
9. 知识库管理（文档 22）
10. 探索模块（文档 24）
11. 测试和部署（文档 29-30）

## 使用说明

1. **顺序阅读**：建议按照文档编号顺序阅读，先理解整体架构再深入具体模块
2. **实践导向**：每个文档都包含实现步骤，可以边读边实现
3. **源码参考**：文档中标注了对应的源码位置，便于深入研究
4. **持续更新**：随着开发进展，文档会不断更新和完善

## 源码分析工具

- **源码位置**：`/Users/lg/Projects/lab/coze-studio`
- **主要关注目录**：
  - `frontend/apps/coze-studio` - 主应用
  - `frontend/packages/agent-ide` - Agent IDE
  - `frontend/packages/workflow` - Workflow
  - `frontend/packages/foundation` - 基础设施
  - `frontend/packages/arch` - 架构层

## 下一步

1. 完成 `01-architecture-overview.md`（整体架构文档）
2. 完成 `03-project-setup.md`（项目初始化）
3. 开始实现基础框架

---

**文档版本**：v0.1
**创建时间**：2025-11-30
**维护者**：Coze Lite Team
