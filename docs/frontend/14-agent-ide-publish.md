# Agent IDE - 发布管理系统

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-agent-ide/agent-publish`, `@coze-studio/workspace/project-publish`

## 一、概述

发布管理系统负责将 Agent 从草稿状态发布到各种渠道（WebSDK、API、社交平台等），并管理版本历史和发布记录。本文档深度剖析 Coze Studio 的发布管理架构，并提供 Coze Lite 的简化实现方案。

### 1.1 核心功能

- **发布流程管理**: 草稿 → 渠道配置 → 发布 → 进度追踪
- **版本控制**: 自动版本号递增、版本历史记录
- **渠道管理**: 支持多渠道同时发布（WebSDK、API、Slack 等）
- **状态追踪**: 实时轮询发布进度（打包 → 审核 → 渠道发布）
- **草稿保存**: 自动保存发布配置，防止数据丢失
- **发布历史**: 查看历史发布记录和回滚

### 1.2 发布渠道类型

| 渠道类型 | 说明 | 配置方式 |
|---------|------|----------|
| **WebSDK** | 嵌入到网页的聊天窗口 | 自动生成 SDK 代码 |
| **API** | RESTful API 调用 | 生成 API Key 和文档 |
| **社交平台** | Slack、Discord、Teams 等 | OAuth 授权绑定 |
| **移动端** | iOS/Android SDK | 配置 App ID |

### 1.3 发布状态流转

```
草稿 (Draft)
    ↓
选择渠道 (Select Channels)
    ↓
打包 (Packing)
    ↓
审核 (Auditing) [可选]
    ↓
渠道发布 (Publishing)
    ↓
发布完成 (Published)
```

## 二、Coze Studio 源码分析

### 2.1 包结构

发布管理相关的核心包：

```bash
# 1. Agent 发布包
packages/agent-ide/agent-publish/
├── src/
│   ├── components/
│   │   └── bot-publish/
│   │       ├── index.tsx                        # 主发布页面
│   │       ├── hooks/
│   │       │   ├── use-get-bot-info.ts         # 获取 Bot 信息
│   │       │   └── use-auth-fail.ts            # 授权失败处理
│   │       ├── publish-table/                   # 发布配置表格
│   │       │   ├── index.tsx
│   │       │   ├── hooks/use-connectors-publish.ts  # 发布核心逻辑
│   │       │   ├── table-collection/           # 渠道列表
│   │       │   └── context/                    # 发布上下文
│   │       └── publish-result/                  # 发布结果展示
│   │           ├── index.tsx
│   │           └── component/publish-result-area/
│   └── index.ts

# 2. 项目发布包
packages/studio/workspace/project-publish/
├── src/
│   ├── store.ts                                 # Zustand 状态管理
│   ├── publish-button/                          # 发布按钮组件
│   │   └── index.tsx
│   ├── publish-progress/                        # 发布进度组件
│   │   └── index.tsx
│   ├── publish-main/                            # 发布主流程
│   │   ├── index.tsx
│   │   ├── publish-title-bar.tsx               # 发布标题栏
│   │   ├── publish-record.tsx                  # 发布记录
│   │   ├── publish-basic-info.tsx              # 基本信息
│   │   ├── publish-connectors.tsx              # 渠道选择
│   │   ├── utils/
│   │   │   ├── publish-draft.ts                # 草稿管理
│   │   │   ├── init-publish-store.ts           # Store 初始化
│   │   │   ├── get-fixed-version-number.ts     # 版本号生成
│   │   │   └── increment-version-number.ts     # 版本号递增
│   │   └── components/
│   │       ├── connector-card.tsx
│   │       └── version-desc-input/
│   └── hooks/
│       └── use-publish-status.tsx              # 发布状态管理

# 3. 发布管理业务 Hooks
packages/studio/publish-manage-hooks/
└── src/
    └── hooks/
        └── use-is-publish-record-ready.ts      # 发布记录就绪检测
```

### 2.2 核心 Store - ProjectPublishStore

**文件位置**: `project-publish/src/store.ts:18-85`

```typescript
export interface ProjectPublishStore {
  /** 页面加载状态 */
  pageLoading: boolean;

  /** 渠道列表 */
  connectorList: PublishConnectorInfo[];

  /** 渠道聚合映射（如社交平台统一配置） */
  connectorUnionMap: Record<string, ConnectorUnionInfo>;

  /** 选中的渠道 ID */
  selectedConnectorIds: string[];

  /** 是否显示发布结果 */
  showPublishResult: boolean;

  /** 上次发布的版本号 */
  lastVersionNumber: string;

  /** 当前版本号 */
  versionNumber: string;

  /** 版本描述（更新日志） */
  versionDescription: string;

  /** 渠道发布配置 (key: connector_id) */
  connectorPublishConfig: Record<string, ConnectorPublishConfig>;

  /** 发布配置信息 */
  connectors: Record<string, Record<string, string>>;

  /** 聚合渠道选择信息 */
  unions: Record<string, string>;

  /** 发布记录详情（轮询结果） */
  publishRecordDetail: PublishRecordDetail;

  /** 付费配置 */
  monetizeConfig?: BotMonetizationConfigData;
}

interface ProjectPublishAction {
  setProjectPublishInfo: SetterAction<ProjectPublishStore>;
  setSelectedConnectorIds: (ids: string[]) => void;
  setPublishRecordDetail: (val: Partial<PublishRecordDetail>) => void;
  resetProjectPublishInfo: () => void;
  exportDraft: (projectId: string) => ProjectPublishDraft;
}

// 使用 Zustand 创建 Store
export const useProjectPublishStore = create<ProjectPublishStore & ProjectPublishAction>()(
  devtools((set, get) => ({
    // 初始状态
    pageLoading: false,
    connectorList: [],
    connectorUnionMap: {},
    selectedConnectorIds: [],
    showPublishResult: false,
    lastVersionNumber: '',
    versionNumber: DEFAULT_VERSION_NUMBER,
    versionDescription: '',
    connectorPublishConfig: {},
    connectors: {},
    unions: {},
    publishRecordDetail: {},

    // 操作
    setProjectPublishInfo: (data) => {
      set(typeof data === 'function' ? data : () => data);
    },

    setSelectedConnectorIds: (ids) => {
      set({ selectedConnectorIds: ids });
    },

    setPublishRecordDetail: (val) => {
      set(produce<ProjectPublishStore>(state => {
        state.publishRecordDetail = { ...state.publishRecordDetail, ...val };
      }));
    },

    resetProjectPublishInfo: () => {
      set({
        selectedConnectorIds: [],
        showPublishResult: false,
        versionNumber: DEFAULT_VERSION_NUMBER,
        versionDescription: '',
        connectors: {},
        unions: {},
        publishRecordDetail: {},
      });
    },

    exportDraft: (projectId) => ({
      projectId,
      versionNumber: get().versionNumber,
      versionDescription: get().versionDescription,
      selectedConnectorIds: get().selectedConnectorIds,
      unions: get().unions,
    }),
  }), {
    name: 'ProjectPublishStore',
    enabled: IS_DEV_MODE,
  })
);
```

### 2.3 发布主流程

**文件位置**: `agent-publish/src/components/bot-publish/index.tsx:35-120`

```typescript
export const AgentPublishPage = () => {
  const params = useParams<DynamicParams>();
  const { bot_id, commit_version } = params;

  // 发布状态
  const [publishStatus, setPublishStatus] = useState(Publish.NoPublish);
  const [connectInfoList, setConnectInfoList] = useState<PublishConnectorInfo[]>();
  const [publishResult, setPublishResult] = useState<PublishResultInfo>();
  const [publishLoading, setPublishLoading] = useState(false);

  // 1. 加载发布渠道列表
  useRequest(async () => {
    const res = await SpaceApi.PublishConnectorList({
      bot_id: bot_id ?? '',
      commit_version,
    });

    setConnectInfoList(res?.publish_connector_list);
    setConnectorBrandInfoMap(res?.connector_brand_info_map);
  });

  // 2. 渲染：未发布 = 配置页面，已发布 = 结果页面
  return (
    <UILayout>
      {publishStatus === Publish.NoPublish ? (
        <PublishTable
          connectInfoList={connectInfoList ?? []}
          setPublishStatus={setPublishStatus}
          setPublishResult={setPublishResult}
          ref={publishRef}
        />
      ) : (
        <PublishResult publishResult={publishResult} />
      )}
    </UILayout>
  );
};
```

### 2.4 发布执行逻辑

**文件位置**: `agent-publish/src/components/bot-publish/publish-table/hooks/use-connectors-publish.ts:28-75`

```typescript
export const useConnectorsPublish = ({ onSuccess, botInfo }: UsePublishProps) => {
  const { commit_version, space_id = '' } = useParams<DynamicParams>();

  const { runAsync: publishBot, loading } = useRequest(
    async (params: UsePublishParamsType) => {
      const { botId, changeLog, connectors, publishId } = params;

      // 1. 验证 Bot Prompt 中的括号格式（防止模板语法错误）
      if (!verifyBracesAndToast(botInfo.prompt)) {
        throw new CustomError(ReportEventNames.publishBot, hasBracesErrorI18nKey);
      }

      // 2. 调用发布 API
      const resp = await DeveloperApi.PublishDraftBot({
        space_id,
        bot_id: botId,
        history_info: changeLog,  // 更新日志
        connectors,                // 渠道配置
        botMode: mode,
        publish_id: publishId,
        commit_version: commit_version ?? '',
        publish_type: PublishType.OnlinePublish,
      });

      return resp.data;
    },
    {
      manual: true,
      onSuccess: resp => {
        if (resp?.publish_result) {
          onSuccess(resp);
        }
      },
    },
  );

  return { handlePublishBot: publishBot, loading };
};
```

### 2.5 版本号管理

#### 2.5.1 版本号生成策略

**文件位置**: `project-publish/src/publish-main/utils/get-fixed-version-number.ts:8-26`

```typescript
export const getFixedVersionNumber = ({
  lastPublishVersionNumber,
  draftVersionNumber,
  defaultVersionNumber,
}: {
  lastPublishVersionNumber: string | undefined;
  draftVersionNumber: string | undefined;
  defaultVersionNumber: string;
}): string => {
  // 优先级 1: 如果有草稿版本号，使用草稿
  if (draftVersionNumber) {
    return draftVersionNumber;
  }

  // 优先级 2: 如果有上次发布的版本号，自动递增
  if (lastPublishVersionNumber && !draftVersionNumber) {
    return incrementVersionNumber(lastPublishVersionNumber);
  }

  // 优先级 3: 使用默认版本号（通常是 "1.0.0"）
  return defaultVersionNumber;
};
```

#### 2.5.2 版本号自动递增

**文件位置**: `project-publish/src/publish-main/utils/increment-version-number.ts:5-14`

```typescript
export const incrementVersionNumber = (input: string) => {
  // 匹配 "数字.数字.数字" 格式的版本号
  const regex = /(\d+)\.(\d+)\.(\d+)/g;

  // 将最后一位数字 +1
  const result = input.replace(regex, (_match, p1, p2, p3) => {
    const incrementedP3 = parseInt(String(p3), 10) + 1;
    return `${p1}.${p2}.${incrementedP3}`;
  });

  return result;
};

// 示例：
// "1.0.0" => "1.0.1"
// "2.3.5" => "2.3.6"
```

### 2.6 草稿自动保存

**文件位置**: `project-publish/src/publish-main/utils/publish-draft.ts:8-35`

```typescript
const PUBLISH_DRAFT_KEY = 'coze_project_publish_draft';

export interface ProjectPublishDraft {
  projectId: string;
  versionNumber: string;
  versionDescription: string;
  selectedConnectorIds: string[];
  unions: Record<string, string>;
  sdkConfig?: ConnectorPublishConfig;
  socialPlatformConfig?: ConnectorPublishConfig;
}

// 保存草稿到 LocalStorage
export function saveProjectPublishDraft(draft: ProjectPublishDraft) {
  localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify(draft));
}

// 加载草稿（自动删除）
export function loadProjectPublishDraft(projectId: string) {
  const str = localStorage.getItem(PUBLISH_DRAFT_KEY);
  localStorage.removeItem(PUBLISH_DRAFT_KEY);  // 读取后立即删除

  if (!str) return undefined;

  const draft = typeSafeJSONParse(str) as ProjectPublishDraft | undefined;
  if (draft?.projectId === projectId) {
    return draft;
  }
  return undefined;
}
```

**自动保存触发**:

```typescript
// 在 publish-main/index.tsx 中
useEffect(() => {
  const saveDraft = () => {
    saveProjectPublishDraft(exportDraft(project_id));
  };

  // 页面刷新前自动保存
  window.addEventListener('beforeunload', saveDraft);

  return () => {
    window.removeEventListener('beforeunload', saveDraft);
  };
}, [exportDraft, project_id]);
```

### 2.7 发布进度轮询

**文件位置**: `project-publish/src/publish-main/index.tsx:145-175`

```typescript
// 发布结果轮询（每 3 秒轮询一次）
const { run: getPublishRecordDetail, cancel } = useRequest(
  async (params: GetPublishRecordDetailRequest) =>
    await intelligenceApi.GetPublishRecordDetail(params),
  {
    pollingInterval: 3000,        // 3 秒轮询一次
    pollingWhenHidden: false,      // 页面隐藏时停止轮询
    pollingErrorRetryCount: 3,     // 错误重试 3 次
    manual: true,
    onSuccess: res => {
      if (res?.data) {
        setPublishRecordDetail(res.data);

        // 发布完成后停止轮询
        if (isPublishFinish(res.data)) {
          cancel();
        }

        if (!showPublishResult) {
          setShowPublishResult(true);
        }
      } else {
        cancel();
      }
    },
  },
);
```

**发布完成判断逻辑**:

```typescript
export function isPublishFinish(record: PublishRecordDetail) {
  // 项目本身打包失败或审核未通过
  const projectFailed =
    record.publish_status === PublishRecordStatus.PackFailed ||
    record.publish_status === PublishRecordStatus.AuditNotPass;

  // 所有渠道都处于完成状态（成功或失败）
  const allConnectorFinished =
    record.connector_publish_result?.every(
      item =>
        item.connector_publish_status === ConnectorPublishStatus.Success ||
        item.connector_publish_status === ConnectorPublishStatus.Failed,
    ) ?? false;

  // 发布完成：项目失败 或 (项目完成 且 所有渠道完成)
  return (
    projectFailed ||
    (record.publish_status === PublishRecordStatus.PublishDone && allConnectorFinished)
  );
}
```

## 三、API 接口设计

### 3.1 发布 API

#### 1. 发布 Agent

```typescript
// 请求参数
export interface PublishDraftBotRequest {
  space_id: string;
  bot_id: string;
  /** key 代表 connector_id，value 是发布的参数 */
  connectors?: Record<string, Record<string, string>>;
  /** 默认 0 */
  botMode?: BotMode;
  /** 更新日志 */
  history_info?: string;
  /** 发布 ID（用于追踪） */
  publish_id?: string;
  /** 指定发布某个 CommitVersion */
  commit_version?: string;
  /** 发布类型：线上发布/预发布 */
  publish_type?: PublishType;
}

// 响应数据
export interface PublishDraftBotData {
  /** key 代表 connector_id，value 是发布结果 */
  publish_result?: Record<string, ConnectorBindResult>;
  /** 是否命中人审 */
  hit_manual_check?: boolean;
  /** 上架 bot market 结果 */
  submit_bot_market_result?: SubmitBotMarketResult;
  /** 发布 bot 计费结果 */
  publish_monetization_result?: boolean;
}
```

#### 2. 获取发布渠道列表

```typescript
export interface PublishConnectorListRequest {
  project_id: string;
}

export interface PublishConnectorListData {
  /** 渠道列表 */
  connector_list?: Array<PublishConnectorInfo>;
  /** 上次发布信息 */
  last_publish_info?: LastPublishInfo;
  /** 渠道集合信息，key 是 connector_union_id */
  connector_union_info_map?: Record<string, ConnectorUnionInfo>;
}

export interface PublishConnectorInfo {
  id: string;
  name: string;
  icon_url: string;
  description: string;
  /** 渠道类型（社交平台、WebSDK、API 等） */
  connector_classification: ConnectorClassification;
  /** 配置状态（已配置、未配置、需重新配置） */
  config_status: ConnectorConfigStatus;
  /** 渠道状态（正常、审核中、已下线） */
  connector_status?: ConnectorStatus;
  /** 绑定类型（无需绑定、Auth 绑定、KV 绑定等） */
  bind_type: ConnectorBindType;
  /** 绑定信息 */
  bind_info: Record<string, string>;
  /** 是否允许发布 */
  allow_publish?: boolean;
  /** 不允许发布的原因 */
  not_allow_publish_reason?: string;
}
```

#### 3. 获取发布记录详情（轮询）

```typescript
export interface GetPublishRecordDetailRequest {
  project_id: string;
  /** 不传则获取最近一次发布记录 */
  publish_record_id?: string;
}

export interface PublishRecordDetail {
  publish_record_id?: string;
  version_number?: string;
  description?: string;
  /** 发布状态 */
  publish_status?: PublishRecordStatus;
  /** 发布状态详细信息 */
  publish_status_detail?: PublishStatusDetail;
  /** 渠道发布结果 */
  connector_publish_result?: Array<ConnectorPublishResult>;
}

export enum PublishRecordStatus {
  /** 打包中 */
  Packing = 0,
  /** 打包失败 */
  PackFailed = 1,
  /** 审核中 */
  Auditing = 2,
  /** 审核未通过 */
  AuditNotPass = 3,
  /** 渠道发布中 */
  ConnectorPublishing = 4,
  /** 发布完成 */
  PublishDone = 5,
}

export enum ConnectorPublishStatus {
  /** 默认状态（发布中） */
  Default = 0,
  /** 审核中 */
  Auditing = 1,
  /** 发布成功 */
  Success = 2,
  /** 发布失败 */
  Failed = 3,
}
```

## 四、Coze Lite 设计方案

### 4.1 简化策略

| 功能 | Coze Studio | Coze Lite | 简化说明 |
|------|-------------|-----------|----------|
| 发布渠道 | 10+ 种 | 2 种 | 仅支持 WebSDK + API |
| 审核流程 | 支持人工审核 | 自动发布 | 去除审核环节 |
| 版本管理 | Semantic Versioning | 简化版本号 | v1, v2, v3... |
| 草稿保存 | LocalStorage + 云端 | LocalStorage | 仅本地保存 |
| 发布进度 | 3 阶段轮询 | 单步发布 | 简化进度展示 |
| 发布历史 | 完整历史记录 | 最近 10 条 | 限制历史条数 |

### 4.2 核心类型定义

**文件路径**: `frontend/src/types/publish.ts`

```typescript
// 发布渠道类型
export enum PublishChannel {
  WEB_SDK = 'web_sdk',
  API = 'api',
}

// 发布状态
export enum PublishStatus {
  DRAFT = 'draft',           // 草稿
  PUBLISHING = 'publishing', // 发布中
  SUCCESS = 'success',       // 发布成功
  FAILED = 'failed',         // 发布失败
}

// 发布渠道配置
export interface ChannelConfig {
  channel: PublishChannel;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

// 发布记录
export interface PublishRecord {
  id: string;
  agentId: string;
  version: string;
  description: string;
  channels: PublishChannel[];
  status: PublishStatus;
  createdAt: string;
  publishedAt?: string;
  errorMessage?: string;
}

// 发布配置
export interface PublishConfig {
  agentId: string;
  version: string;
  description: string;
  selectedChannels: PublishChannel[];
  webSdkConfig?: {
    theme: 'light' | 'dark';
    position: 'bottom-right' | 'bottom-left';
  };
  apiConfig?: {
    rateLimit: number;
    allowedOrigins: string[];
  };
}

// 渠道配置列表
export const CHANNEL_CONFIGS: ChannelConfig[] = [
  {
    channel: PublishChannel.WEB_SDK,
    name: 'Web SDK',
    icon: '🌐',
    description: '嵌入到网页的聊天窗口',
    enabled: true,
  },
  {
    channel: PublishChannel.API,
    name: 'API',
    icon: '🔌',
    description: 'RESTful API 接口调用',
    enabled: true,
  },
];
```

### 4.3 发布 Store 设计

**文件路径**: `frontend/src/stores/publishStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';

interface PublishState {
  // 发布配置
  publishConfig: PublishConfig | null;

  // 发布记录列表
  publishRecords: PublishRecord[];

  // 当前发布状态
  publishStatus: PublishStatus;

  // 草稿保存
  saveDraft: (config: PublishConfig) => void;
  loadDraft: (agentId: string) => PublishConfig | null;
  clearDraft: (agentId: string) => void;

  // 发布操作
  startPublish: (config: PublishConfig) => Promise<void>;
  updatePublishStatus: (status: PublishStatus) => void;

  // 发布记录
  addPublishRecord: (record: PublishRecord) => void;
  getPublishRecords: (agentId: string) => PublishRecord[];
  getLatestPublishRecord: (agentId: string) => PublishRecord | null;

  // 版本管理
  getNextVersion: (agentId: string) => string;
}

export const usePublishStore = create<PublishState>()(
  persist(
    (set, get) => ({
      publishConfig: null,
      publishRecords: [],
      publishStatus: PublishStatus.DRAFT,

      // 保存草稿
      saveDraft: (config) => {
        const drafts = JSON.parse(localStorage.getItem('publish_drafts') || '{}');
        drafts[config.agentId] = config;
        localStorage.setItem('publish_drafts', JSON.stringify(drafts));
      },

      // 加载草稿
      loadDraft: (agentId) => {
        const drafts = JSON.parse(localStorage.getItem('publish_drafts') || '{}');
        return drafts[agentId] || null;
      },

      // 清除草稿
      clearDraft: (agentId) => {
        const drafts = JSON.parse(localStorage.getItem('publish_drafts') || '{}');
        delete drafts[agentId];
        localStorage.setItem('publish_drafts', JSON.stringify(drafts));
      },

      // 开始发布
      startPublish: async (config) => {
        set({ publishConfig: config, publishStatus: PublishStatus.PUBLISHING });

        try {
          // 调用发布 API
          const response = await fetch('/api/agents/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
          });

          if (!response.ok) {
            throw new Error('发布失败');
          }

          const result = await response.json();

          // 创建发布记录
          const record: PublishRecord = {
            id: result.publishId,
            agentId: config.agentId,
            version: config.version,
            description: config.description,
            channels: config.selectedChannels,
            status: PublishStatus.SUCCESS,
            createdAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
          };

          set(produce<PublishState>(state => {
            state.publishRecords.unshift(record);
            state.publishStatus = PublishStatus.SUCCESS;
          }));

          // 清除草稿
          get().clearDraft(config.agentId);
        } catch (error) {
          set({ publishStatus: PublishStatus.FAILED });
          throw error;
        }
      },

      // 更新发布状态
      updatePublishStatus: (status) => {
        set({ publishStatus: status });
      },

      // 添加发布记录
      addPublishRecord: (record) => {
        set(produce<PublishState>(state => {
          state.publishRecords.unshift(record);
          // 只保留最近 10 条记录
          if (state.publishRecords.length > 10) {
            state.publishRecords = state.publishRecords.slice(0, 10);
          }
        }));
      },

      // 获取指定 Agent 的发布记录
      getPublishRecords: (agentId) => {
        return get().publishRecords.filter(r => r.agentId === agentId);
      },

      // 获取最新发布记录
      getLatestPublishRecord: (agentId) => {
        const records = get().getPublishRecords(agentId);
        return records.length > 0 ? records[0] : null;
      },

      // 获取下一个版本号
      getNextVersion: (agentId) => {
        const latestRecord = get().getLatestPublishRecord(agentId);
        if (!latestRecord) {
          return 'v1';
        }

        // 从 "v1" 提取数字并 +1
        const match = latestRecord.version.match(/v(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return `v${num + 1}`;
        }

        return 'v1';
      },
    }),
    {
      name: 'coze-lite-publish-store',
      partialize: (state) => ({
        publishRecords: state.publishRecords,
      }),
    }
  )
);
```

## 五、组件实现

### 5.1 发布按钮

**文件路径**: `frontend/src/components/agent-ide/PublishButton/index.tsx`

```typescript
import { useState } from 'react';
import { Button, Modal, Message } from '@arco-design/web-react';
import { IconRocket } from '@arco-design/web-react/icon';
import { usePublishStore } from '@/stores/publishStore';
import { PublishModal } from './PublishModal';
import './index.css';

interface PublishButtonProps {
  agentId: string;
}

export function PublishButton({ agentId }: PublishButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { getLatestPublishRecord } = usePublishStore();

  const latestRecord = getLatestPublishRecord(agentId);
  const hasPublished = !!latestRecord;

  const handleClick = () => {
    setModalVisible(true);
  };

  return (
    <>
      <Button
        type="primary"
        icon={<IconRocket />}
        onClick={handleClick}
      >
        {hasPublished ? '重新发布' : '发布'}
      </Button>

      <PublishModal
        agentId={agentId}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}
```

### 5.2 发布配置弹窗

**文件路径**: `frontend/src/components/agent-ide/PublishButton/PublishModal.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Modal, Form, Input, Checkbox, Button, Message } from '@arco-design/web-react';
import { usePublishStore } from '@/stores/publishStore';
import { CHANNEL_CONFIGS, PublishChannel, PublishConfig } from '@/types/publish';
import './PublishModal.css';

const FormItem = Form.Item;
const TextArea = Input.TextArea;

interface PublishModalProps {
  agentId: string;
  visible: boolean;
  onClose: () => void;
}

export function PublishModal({ agentId, visible, onClose }: PublishModalProps) {
  const [form] = Form.useForm();
  const [publishing, setPublishing] = useState(false);

  const {
    getNextVersion,
    loadDraft,
    saveDraft,
    startPublish,
    publishStatus,
  } = usePublishStore();

  // 加载草稿
  useEffect(() => {
    if (visible) {
      const draft = loadDraft(agentId);
      if (draft) {
        form.setFieldsValue({
          version: draft.version,
          description: draft.description,
          selectedChannels: draft.selectedChannels,
        });
      } else {
        // 自动填充版本号
        form.setFieldValue('version', getNextVersion(agentId));
        // 默认选中所有渠道
        form.setFieldValue('selectedChannels', [PublishChannel.WEB_SDK, PublishChannel.API]);
      }
    }
  }, [visible, agentId]);

  // 自动保存草稿
  const handleValuesChange = (changedValues: any, allValues: any) => {
    const draft: PublishConfig = {
      agentId,
      version: allValues.version,
      description: allValues.description,
      selectedChannels: allValues.selectedChannels || [],
    };
    saveDraft(draft);
  };

  // 发布
  const handlePublish = async () => {
    try {
      await form.validate();
      const values = form.getFields();

      if (!values.selectedChannels || values.selectedChannels.length === 0) {
        Message.error('请至少选择一个发布渠道');
        return;
      }

      setPublishing(true);

      const config: PublishConfig = {
        agentId,
        version: values.version,
        description: values.description,
        selectedChannels: values.selectedChannels,
      };

      await startPublish(config);

      Message.success('发布成功！');
      onClose();
    } catch (error) {
      Message.error(`发布失败: ${error.message}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal
      title="发布 Agent"
      visible={visible}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={publishing} onClick={handlePublish}>
            {publishing ? '发布中...' : '确认发布'}
          </Button>
        </>
      }
      style={{ width: 600 }}
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
      >
        {/* 版本号 */}
        <FormItem
          label="版本号"
          field="version"
          rules={[{ required: true, message: '请输入版本号' }]}
        >
          <Input placeholder="例如: v1, v2, v3..." />
        </FormItem>

        {/* 更新说明 */}
        <FormItem
          label="更新说明"
          field="description"
          rules={[{ required: true, message: '请输入更新说明' }]}
        >
          <TextArea
            placeholder="描述本次更新的内容..."
            rows={4}
            showWordLimit
            maxLength={500}
          />
        </FormItem>

        {/* 发布渠道 */}
        <FormItem
          label="发布渠道"
          field="selectedChannels"
          rules={[{ required: true, message: '请选择发布渠道' }]}
        >
          <Checkbox.Group>
            {CHANNEL_CONFIGS.map(channel => (
              <div key={channel.channel} className="channel-option">
                <Checkbox value={channel.channel} disabled={!channel.enabled}>
                  <div className="channel-info">
                    <span className="channel-icon">{channel.icon}</span>
                    <div>
                      <div className="channel-name">{channel.name}</div>
                      <div className="channel-desc">{channel.description}</div>
                    </div>
                  </div>
                </Checkbox>
              </div>
            ))}
          </Checkbox.Group>
        </FormItem>
      </Form>
    </Modal>
  );
}
```

**CSS 样式**: `frontend/src/components/agent-ide/PublishButton/PublishModal.css`

```css
.channel-option {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  transition: all 0.2s;
}

.channel-option:hover {
  border-color: var(--color-primary-light-3);
  background-color: var(--color-fill-2);
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.channel-icon {
  font-size: 24px;
}

.channel-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-1);
}

.channel-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-3);
}
```

### 5.3 发布历史列表

**文件路径**: `frontend/src/components/agent-ide/PublishHistory/index.tsx`

```typescript
import { useState } from 'react';
import { Modal, Button, Timeline, Tag, Empty } from '@arco-design/web-react';
import { IconHistory, IconCheck, IconClose, IconLoading } from '@arco-design/web-react/icon';
import { usePublishStore } from '@/stores/publishStore';
import { PublishStatus, PublishChannel } from '@/types/publish';
import './index.css';

interface PublishHistoryProps {
  agentId: string;
}

export function PublishHistory({ agentId }: PublishHistoryProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { getPublishRecords } = usePublishStore();

  const records = getPublishRecords(agentId);

  const getStatusTag = (status: PublishStatus) => {
    switch (status) {
      case PublishStatus.SUCCESS:
        return <Tag color="green" icon={<IconCheck />}>发布成功</Tag>;
      case PublishStatus.FAILED:
        return <Tag color="red" icon={<IconClose />}>发布失败</Tag>;
      case PublishStatus.PUBLISHING:
        return <Tag color="blue" icon={<IconLoading />}>发布中</Tag>;
      default:
        return <Tag>草稿</Tag>;
    }
  };

  const getChannelName = (channel: PublishChannel) => {
    return channel === PublishChannel.WEB_SDK ? 'Web SDK' : 'API';
  };

  return (
    <>
      <Button
        type="text"
        icon={<IconHistory />}
        onClick={() => setModalVisible(true)}
      >
        发布历史
      </Button>

      <Modal
        title="发布历史"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        style={{ width: 700 }}
      >
        {records.length === 0 ? (
          <Empty description="暂无发布记录" />
        ) : (
          <Timeline>
            {records.map((record, index) => (
              <Timeline.Item
                key={record.id}
                dot={
                  index === 0 ? (
                    <div className="timeline-dot-latest">最新</div>
                  ) : undefined
                }
              >
                <div className="publish-record-item">
                  {/* 版本号和状态 */}
                  <div className="record-header">
                    <h4>{record.version}</h4>
                    {getStatusTag(record.status)}
                  </div>

                  {/* 更新说明 */}
                  <p className="record-description">{record.description}</p>

                  {/* 发布渠道 */}
                  <div className="record-channels">
                    {record.channels.map(channel => (
                      <Tag key={channel}>{getChannelName(channel)}</Tag>
                    ))}
                  </div>

                  {/* 发布时间 */}
                  <div className="record-time">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </div>

                  {/* 错误信息 */}
                  {record.errorMessage && (
                    <div className="record-error">
                      错误：{record.errorMessage}
                    </div>
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Modal>
    </>
  );
}
```

**CSS 样式**: `frontend/src/components/agent-ide/PublishHistory/index.css`

```css
.timeline-dot-latest {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-white);
  background-color: var(--color-primary-6);
  border-radius: 10px;
}

.publish-record-item {
  padding: 12px;
  background-color: var(--color-fill-1);
  border-radius: 8px;
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.record-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
}

.record-description {
  margin: 8px 0;
  font-size: 14px;
  color: var(--color-text-2);
  line-height: 1.6;
}

.record-channels {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.record-time {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-3);
}

.record-error {
  margin-top: 8px;
  padding: 8px;
  font-size: 13px;
  color: var(--color-danger-6);
  background-color: var(--color-danger-light-1);
  border-radius: 4px;
}
```

## 六、使用示例

### 6.1 集成到 Agent 编辑器

**文件路径**: `frontend/src/pages/agent/editor/[id].tsx`

```typescript
import { AgentEditorLayout } from '@/components/agent-ide/AgentEditorLayout';
import { PromptEditor } from '@/components/agent-ide/PromptEditor';
import { ToolSection } from '@/components/agent-ide/ToolSection';
import { PublishButton } from '@/components/agent-ide/PublishButton';
import { PublishHistory } from '@/components/agent-ide/PublishHistory';

export default function AgentEditorPage() {
  const { id: agentId } = useParams();

  return (
    <AgentEditorLayout
      header={
        <div className="flex items-center justify-between p-4">
          <h2>编辑 Agent</h2>
          <div className="flex gap-2">
            <PublishHistory agentId={agentId} />
            <PublishButton agentId={agentId} />
          </div>
        </div>
      }
      leftPanel={
        <>
          <PromptEditor />
          <ToolSection />
        </>
      }
      rightPanel={
        <ChatArea agentId={agentId} />
      }
    />
  );
}
```

### 6.2 发布成功后的操作

```typescript
import { usePublishStore } from '@/stores/publishStore';
import { useNavigate } from 'react-router-dom';

function AfterPublishActions({ agentId }: { agentId: string }) {
  const navigate = useNavigate();
  const { getLatestPublishRecord } = usePublishStore();

  const latestRecord = getLatestPublishRecord(agentId);

  if (!latestRecord) return null;

  const handleViewWebSDK = () => {
    // 跳转到 Web SDK 配置页面
    navigate(`/agent/${agentId}/sdk`);
  };

  const handleViewAPI = () => {
    // 跳转到 API 文档页面
    navigate(`/agent/${agentId}/api-docs`);
  };

  return (
    <div className="after-publish-actions">
      <h3>发布成功！接下来你可以：</h3>
      <div className="action-buttons">
        {latestRecord.channels.includes(PublishChannel.WEB_SDK) && (
          <Button onClick={handleViewWebSDK}>
            查看 Web SDK 配置
          </Button>
        )}
        {latestRecord.channels.includes(PublishChannel.API) && (
          <Button onClick={handleViewAPI}>
            查看 API 文档
          </Button>
        )}
      </div>
    </div>
  );
}
```

## 七、最佳实践

### 7.1 发布前检查清单

在发布前应确保：

```typescript
export async function validateBeforePublish(agentId: string): Promise<string[]> {
  const errors: string[] = [];

  // 1. 检查是否配置了 Prompt
  const prompt = await getAgentPrompt(agentId);
  if (!prompt || prompt.trim().length === 0) {
    errors.push('未配置 System Prompt');
  }

  // 2. 检查是否至少添加了一个工具
  const tools = await getAgentTools(agentId);
  if (tools.length === 0) {
    errors.push('未添加任何工具，建议至少添加一个插件或知识库');
  }

  // 3. 检查 Prompt 中的变量是否都已定义
  const variables = extractVariables(prompt);
  const definedVars = await getDefinedVariables(agentId);
  const undefinedVars = variables.filter(v => !definedVars.includes(v));
  if (undefinedVars.length > 0) {
    errors.push(`Prompt 中使用了未定义的变量: ${undefinedVars.join(', ')}`);
  }

  // 4. 检查是否测试过对话
  const chatHistory = await getChatHistory(agentId);
  if (chatHistory.length === 0) {
    errors.push('建议先在右侧聊天区测试 Agent 功能后再发布');
  }

  return errors;
}

// 在发布按钮中使用
const handlePublish = async () => {
  const errors = await validateBeforePublish(agentId);

  if (errors.length > 0) {
    Modal.warning({
      title: '发布前检查',
      content: (
        <div>
          <p>发现以下问题：</p>
          <ul>
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
          <p>确定要继续发布吗？</p>
        </div>
      ),
      onOk: () => {
        setModalVisible(true);
      },
    });
  } else {
    setModalVisible(true);
  }
};
```

### 7.2 版本号命名规范

```typescript
/**
 * 版本号命名规范：
 * - 简化版：v1, v2, v3...
 * - 语义化版本：v1.0.0, v1.0.1, v1.1.0...
 */

export function parseVersion(version: string): {
  major: number;
  minor?: number;
  patch?: number;
} {
  // 简化版：v1 -> { major: 1 }
  const simpleMatch = version.match(/^v(\d+)$/);
  if (simpleMatch) {
    return { major: parseInt(simpleMatch[1], 10) };
  }

  // 语义化版本：v1.2.3 -> { major: 1, minor: 2, patch: 3 }
  const semanticMatch = version.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (semanticMatch) {
    return {
      major: parseInt(semanticMatch[1], 10),
      minor: parseInt(semanticMatch[2], 10),
      patch: parseInt(semanticMatch[3], 10),
    };
  }

  throw new Error(`无效的版本号格式: ${version}`);
}

export function getNextVersion(currentVersion: string, type: 'major' | 'minor' | 'patch' = 'patch'): string {
  const parsed = parseVersion(currentVersion);

  if (!parsed.minor && !parsed.patch) {
    // 简化版：v1 -> v2
    return `v${parsed.major + 1}`;
  }

  // 语义化版本
  switch (type) {
    case 'major':
      return `v${parsed.major! + 1}.0.0`;
    case 'minor':
      return `v${parsed.major}.${parsed.minor! + 1}.0`;
    case 'patch':
      return `v${parsed.major}.${parsed.minor}.${parsed.patch! + 1}`;
  }
}
```

### 7.3 发布失败重试机制

```typescript
export async function publishWithRetry(
  config: PublishConfig,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await startPublish(config);
      return; // 成功则返回
    } catch (error) {
      lastError = error;

      // 如果是最后一次重试，抛出错误
      if (i === maxRetries - 1) {
        break;
      }

      // 等待一段时间后重试（指数退避）
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s...
      await new Promise(resolve => setTimeout(resolve, delay));

      Message.warning(`发布失败，正在重试 (${i + 1}/${maxRetries})...`);
    }
  }

  throw new Error(`发布失败（已重试 ${maxRetries} 次）: ${lastError?.message}`);
}
```

### 7.4 发布回滚

```typescript
export async function rollbackToVersion(agentId: string, targetVersion: string) {
  const { getPublishRecords } = usePublishStore.getState();

  // 找到目标版本的发布记录
  const records = getPublishRecords(agentId);
  const targetRecord = records.find(r => r.version === targetVersion);

  if (!targetRecord) {
    throw new Error(`未找到版本 ${targetVersion} 的发布记录`);
  }

  // 创建回滚配置（基于目标版本）
  const rollbackConfig: PublishConfig = {
    agentId,
    version: getNextVersion(records[0].version), // 创建新版本号
    description: `回滚到版本 ${targetVersion}`,
    selectedChannels: targetRecord.channels,
  };

  // 执行发布
  await startPublish(rollbackConfig);

  Message.success(`已回滚到版本 ${targetVersion}`);
}
```

## 八、实施计划

### 阶段 1: 基础架构（1-2 天）

**任务**:
- [ ] 定义发布类型和接口（`types/publish.ts`）
- [ ] 实现 PublishStore（`stores/publishStore.ts`）
- [ ] 创建发布 API 端点（后端）

**验收标准**:
- 类型定义完整，无 TypeScript 错误
- Store 可正常保存/加载草稿
- API 可成功发布 Agent

### 阶段 2: 核心组件（2-3 天）

**任务**:
- [ ] 实现 PublishButton 组件
- [ ] 实现 PublishModal 组件
- [ ] 实现 PublishHistory 组件
- [ ] 编写组件单元测试

**验收标准**:
- 发布按钮可正常打开弹窗
- 发布弹窗可配置版本号、渠道
- 发布历史可查看记录列表
- 测试覆盖率 > 80%

### 阶段 3: 发布流程（2-3 天）

**任务**:
- [ ] 实现草稿自动保存
- [ ] 实现发布 API 调用
- [ ] 实现发布状态管理
- [ ] 实现发布前验证

**验收标准**:
- 页面刷新前自动保存草稿
- 发布成功后创建发布记录
- 发布失败显示错误信息
- 发布前检查必填项

### 阶段 4: 渠道集成（2-3 天）

**任务**:
- [ ] 实现 Web SDK 配置页面
- [ ] 生成 Web SDK 嵌入代码
- [ ] 实现 API 文档页面
- [ ] 生成 API Key 和示例

**验收标准**:
- Web SDK 可正常嵌入到网页
- API 文档清晰易懂
- API Key 可正常调用 Agent

### 阶段 5: 优化与测试（1-2 天）

**任务**:
- [ ] 集成到 Agent 编辑器
- [ ] 添加发布前检查清单
- [ ] 性能优化（懒加载）
- [ ] E2E 测试

**验收标准**:
- Agent 编辑器完整集成发布功能
- 发布流程流畅（无卡顿）
- 友好的错误处理和提示

**总计**: 8-13 天

## 九、扩展方向

### 9.1 高级发布选项

```typescript
interface AdvancedPublishConfig extends PublishConfig {
  // 灰度发布
  grayscaleConfig?: {
    enabled: boolean;
    percentage: number; // 0-100
    targetUsers?: string[]; // 特定用户列表
  };

  // 定时发布
  scheduledPublish?: {
    enabled: boolean;
    publishTime: string; // ISO 8601 时间
  };

  // A/B 测试
  abTestConfig?: {
    enabled: boolean;
    variantA: string; // Agent Version A
    variantB: string; // Agent Version B
    splitRatio: number; // 0-100
  };
}
```

### 9.2 发布审批流程

```typescript
// 发布审批状态
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface PublishApproval {
  id: string;
  publishConfig: PublishConfig;
  requesterId: string;
  approvers: string[];
  status: ApprovalStatus;
  comments?: string;
  createdAt: string;
  approvedAt?: string;
}

// 发布审批流程
export async function requestPublishApproval(config: PublishConfig) {
  const approval = await createApproval(config);
  await notifyApprovers(approval.approvers);
  return approval;
}
```

### 9.3 发布通知

```typescript
// 发布成功后发送通知
export async function notifyPublish(record: PublishRecord) {
  // 1. 邮件通知
  await sendEmail({
    to: record.teamMembers,
    subject: `Agent ${record.version} 发布成功`,
    body: `版本 ${record.version} 已成功发布到 ${record.channels.join(', ')}`,
  });

  // 2. Webhook 通知
  await sendWebhook({
    url: record.webhookUrl,
    data: {
      event: 'agent.published',
      version: record.version,
      channels: record.channels,
    },
  });

  // 3. 站内通知
  await createNotification({
    userId: record.createdBy,
    title: '发布成功',
    content: `版本 ${record.version} 已成功发布`,
  });
}
```

### 9.4 发布分析

```typescript
export interface PublishAnalytics {
  version: string;
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  channelBreakdown: Array<{
    channel: PublishChannel;
    calls: number;
    successRate: number;
  }>;
}

// 发布分析页面
export function PublishAnalyticsPage({ agentId, version }: Props) {
  const analytics = usePublishAnalytics(agentId, version);

  return (
    <div>
      <h2>版本 {version} 数据分析</h2>
      <Chart data={analytics} />
    </div>
  );
}
```

---

**文档状态**: ✅ 完成
**下一步**: 继续完成 Agent IDE 其他模块文档或进入 Workflow 模块
