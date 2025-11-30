# 资源管理 - 数据库模块

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-data/database`, `@coze-foundation/database-*`

## 一、概述

数据库模块为 Agent 和 Workflow 提供结构化数据存储和查询能力。本文档提供完整的数据库管理和操作实现方案。

### 1.1 核心功能

- **数据库管理**: 创建、配置、删除数据库
- **表结构设计**: 可视化设计表结构
- **数据操作**: CRUD 操作和 SQL 查询
- **数据导入导出**: CSV、JSON 格式支持
- **权限控制**: 细粒度的访问控制

### 1.2 支持的数据库类型

| 类型 | 说明 | 应用场景 |
|------|------|----------|
| **内置 SQLite** | 轻量级嵌入式数据库 | 小型应用、原型开发 |
| **PostgreSQL** | 功能强大的关系型数据库 | 生产环境、复杂查询 |
| **MySQL** | 流行的开源数据库 | Web 应用、数据存储 |
| **连接外部数据库** | 连接已有数据库 | 数据集成 |

## 二、数据模型

### 2.1 数据库定义

**文件**: `frontend/src/types/database.ts`

```typescript
import { z } from 'zod';

// 数据库类型
export enum DatabaseType {
  SQLITE = 'sqlite',
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
}

// 数据库状态
export enum DatabaseStatus {
  CONNECTING = 'connecting',   // 连接中
  CONNECTED = 'connected',     // 已连接
  DISCONNECTED = 'disconnected', // 已断开
  ERROR = 'error',             // 错误
}

// 数据类型
export enum DataType {
  INTEGER = 'integer',
  FLOAT = 'float',
  TEXT = 'text',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  JSON = 'json',
}

// 列定义
export interface ColumnDefinition {
  name: string;
  type: DataType;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: any;
  autoIncrement?: boolean;
  comment?: string;
}

// 索引定义
export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
}

// 表定义
export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  comment?: string;
}

// 数据库连接配置
export interface DatabaseConnection {
  type: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  // SQLite 特定
  filepath?: string;
  // 连接池配置
  maxConnections?: number;
  minConnections?: number;
  connectionTimeout?: number;
}

// 数据库元数据
export interface DatabaseMetadata {
  tableCount: number;
  totalRows: number;
  totalSize: number;
  lastQueried?: string;
}

// 数据库定义
export interface Database {
  id: string;
  name: string;
  description: string;
  type: DatabaseType;
  status: DatabaseStatus;
  connection: DatabaseConnection;
  tables: TableDefinition[];
  metadata: DatabaseMetadata;
  createdAt: string;
  updatedAt: string;
  workspace?: string;
}

// 查询请求
export interface QueryRequest {
  databaseId: string;
  sql: string;
  parameters?: any[];
  limit?: number;
}

// 查询结果
export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

// Zod Schema
export const DatabaseSchema = z.object({
  name: z.string().min(1, '数据库名称不能为空').max(100),
  description: z.string().max(500),
  type: z.nativeEnum(DatabaseType),
  connection: z.object({
    type: z.nativeEnum(DatabaseType),
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    filepath: z.string().optional(),
  }),
});

export const TableSchema = z.object({
  name: z.string().min(1, '表名不能为空').max(100),
  columns: z.array(
    z.object({
      name: z.string().min(1, '列名不能为空'),
      type: z.nativeEnum(DataType),
      primaryKey: z.boolean().optional(),
      nullable: z.boolean().optional(),
      unique: z.boolean().optional(),
    })
  ).min(1, '至少需要一列'),
});
```

## 三、状态管理

### 3.1 Database Store

**文件**: `frontend/src/stores/databaseStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Database,
  TableDefinition,
  QueryRequest,
  QueryResult
} from '@/types/database';

interface DatabaseState {
  // 状态
  databases: Record<string, Database>;
  queryHistory: QueryRequest[];

  // 加载状态
  loading: boolean;
  error: string | null;
}

interface DatabaseActions {
  // 数据库 CRUD
  fetchDatabases: () => Promise<void>;
  getDatabase: (id: string) => Promise<Database>;
  createDatabase: (database: Partial<Database>) => Promise<Database>;
  updateDatabase: (id: string, updates: Partial<Database>) => Promise<void>;
  deleteDatabase: (id: string) => Promise<void>;

  // 连接测试
  testConnection: (connection: DatabaseConnection) => Promise<boolean>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;

  // 表管理
  createTable: (databaseId: string, table: TableDefinition) => Promise<void>;
  updateTable: (databaseId: string, tableName: string, updates: Partial<TableDefinition>) => Promise<void>;
  deleteTable: (databaseId: string, tableName: string) => Promise<void>;
  getTables: (databaseId: string) => TableDefinition[];

  // 查询
  executeQuery: (request: QueryRequest) => Promise<QueryResult>;
  getQueryHistory: () => QueryRequest[];
  clearQueryHistory: () => void;
}

export const useDatabaseStore = create<DatabaseState & DatabaseActions>()(
  persist(
    immer((set, get) => ({
      // 初始状态
      databases: {},
      queryHistory: [],
      loading: false,
      error: null,

      // 获取数据库列表
      fetchDatabases: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/databases');
          const data = await response.json();

          set(state => {
            data.forEach((db: Database) => {
              state.databases[db.id] = db;
            });
            state.loading = false;
          });
        } catch (error) {
          set({ error: error.message, loading: false });
        }
      },

      // 获取单个数据库
      getDatabase: async (id: string) => {
        const cached = get().databases[id];
        if (cached) return cached;

        const response = await fetch(`/api/databases/${id}`);
        const database = await response.json();

        set(state => {
          state.databases[id] = database;
        });

        return database;
      },

      // 创建数据库
      createDatabase: async (database: Partial<Database>) => {
        const response = await fetch('/api/databases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(database),
        });

        const newDatabase = await response.json();

        set(state => {
          state.databases[newDatabase.id] = newDatabase;
        });

        return newDatabase;
      },

      // 更新数据库
      updateDatabase: async (id: string, updates: Partial<Database>) => {
        const response = await fetch(`/api/databases/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const updated = await response.json();

        set(state => {
          state.databases[id] = { ...state.databases[id], ...updated };
        });
      },

      // 删除数据库
      deleteDatabase: async (id: string) => {
        await fetch(`/api/databases/${id}`, { method: 'DELETE' });

        set(state => {
          delete state.databases[id];
        });
      },

      // 测试连接
      testConnection: async (connection: DatabaseConnection) => {
        try {
          const response = await fetch('/api/databases/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(connection),
          });

          const result = await response.json();
          return result.success;
        } catch (error) {
          return false;
        }
      },

      // 连接数据库
      connect: async (id: string) => {
        const response = await fetch(`/api/databases/${id}/connect`, {
          method: 'POST',
        });

        const result = await response.json();

        set(state => {
          if (state.databases[id]) {
            state.databases[id].status = result.status;
          }
        });
      },

      // 断开连接
      disconnect: async (id: string) => {
        await fetch(`/api/databases/${id}/disconnect`, {
          method: 'POST',
        });

        set(state => {
          if (state.databases[id]) {
            state.databases[id].status = DatabaseStatus.DISCONNECTED;
          }
        });
      },

      // 创建表
      createTable: async (databaseId: string, table: TableDefinition) => {
        const response = await fetch(`/api/databases/${databaseId}/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(table),
        });

        const newTable = await response.json();

        set(state => {
          const database = state.databases[databaseId];
          if (database) {
            database.tables = database.tables || [];
            database.tables.push(newTable);
          }
        });
      },

      // 更新表
      updateTable: async (
        databaseId: string,
        tableName: string,
        updates: Partial<TableDefinition>
      ) => {
        await fetch(`/api/databases/${databaseId}/tables/${tableName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        set(state => {
          const database = state.databases[databaseId];
          if (database) {
            const tableIndex = database.tables.findIndex(t => t.name === tableName);
            if (tableIndex >= 0) {
              database.tables[tableIndex] = {
                ...database.tables[tableIndex],
                ...updates,
              };
            }
          }
        });
      },

      // 删除表
      deleteTable: async (databaseId: string, tableName: string) => {
        await fetch(`/api/databases/${databaseId}/tables/${tableName}`, {
          method: 'DELETE',
        });

        set(state => {
          const database = state.databases[databaseId];
          if (database) {
            database.tables = database.tables.filter(t => t.name !== tableName);
          }
        });
      },

      // 获取表列表
      getTables: (databaseId: string) => {
        const database = get().databases[databaseId];
        return database?.tables || [];
      },

      // 执行查询
      executeQuery: async (request: QueryRequest) => {
        const response = await fetch('/api/databases/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        const result = await response.json();

        // 添加到查询历史
        set(state => {
          state.queryHistory.unshift(request);
          if (state.queryHistory.length > 50) {
            state.queryHistory = state.queryHistory.slice(0, 50);
          }
        });

        return result;
      },

      // 获取查询历史
      getQueryHistory: () => {
        return get().queryHistory;
      },

      // 清空查询历史
      clearQueryHistory: () => {
        set({ queryHistory: [] });
      },
    })),
    {
      name: 'database-store',
      partialize: (state) => ({
        databases: state.databases,
        queryHistory: state.queryHistory,
      }),
    }
  )
);
```

## 四、UI 组件

### 4.1 数据库管理

**文件**: `frontend/src/components/database/DatabaseManager/index.tsx`

```typescript
import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Message,
  Tag,
} from '@arco-design/web-react';
import { IconPlus, IconLink, IconClose } from '@arco-design/web-react/icon';
import { useDatabaseStore } from '@/stores/databaseStore';
import { DatabaseType, DatabaseStatus } from '@/types/database';
import './index.css';

const FormItem = Form.Item;

export function DatabaseManager() {
  const {
    databases,
    fetchDatabases,
    createDatabase,
    deleteDatabase,
    testConnection,
    connect,
    disconnect,
  } = useDatabaseStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const values = form.getFieldsValue();
      const success = await testConnection(values.connection);

      if (success) {
        Message.success('连接测试成功');
      } else {
        Message.error('连接测试失败');
      }
    } catch (error) {
      Message.error(`测试失败: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      await createDatabase({
        name: values.name,
        description: values.description,
        type: values.type,
        connection: values.connection,
        status: DatabaseStatus.DISCONNECTED,
        tables: [],
        metadata: {
          tableCount: 0,
          totalRows: 0,
          totalSize: 0,
        },
      });

      Message.success('数据库创建成功');
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      Message.error(`创建失败: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除数据库将同时删除所有表和数据，此操作不可恢复',
      onOk: async () => {
        try {
          await deleteDatabase(id);
          Message.success('删除成功');
        } catch (error) {
          Message.error(`删除失败: ${error.message}`);
        }
      },
    });
  };

  const handleConnect = async (id: string) => {
    try {
      await connect(id);
      Message.success('连接成功');
    } catch (error) {
      Message.error(`连接失败: ${error.message}`);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await disconnect(id);
      Message.success('已断开连接');
    } catch (error) {
      Message.error(`断开失败: ${error.message}`);
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (name: string, record: Database) => (
        <Space>
          <strong>{name}</strong>
          <Tag color={getStatusColor(record.status)}>{record.status}</Tag>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (type: DatabaseType) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: '表数量',
      dataIndex: 'metadata.tableCount',
    },
    {
      title: '总行数',
      dataIndex: 'metadata.totalRows',
      render: (rows: number) => rows.toLocaleString(),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      render: (_: any, record: Database) => (
        <Space>
          {record.status === DatabaseStatus.CONNECTED ? (
            <Button
              type="text"
              icon={<IconClose />}
              onClick={() => handleDisconnect(record.id)}
            >
              断开
            </Button>
          ) : (
            <Button
              type="text"
              icon={<IconLink />}
              onClick={() => handleConnect(record.id)}
            >
              连接
            </Button>
          )}
          <Button type="text" onClick={() => handleManageTables(record.id)}>
            管理表
          </Button>
          <Button type="text" status="danger" onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const databaseList = Object.values(databases);

  return (
    <div className="database-manager">
      <Card
        title="数据库管理"
        extra={
          <Button type="primary" icon={<IconPlus />} onClick={() => setCreateModalVisible(true)}>
            创建数据库
          </Button>
        }
      >
        <Table columns={columns} data={databaseList} pagination={{ pageSize: 10 }} />
      </Card>

      {/* 创建数据库 Modal */}
      <Modal
        title="创建数据库"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={form.submit}
        style={{ width: 600 }}
      >
        <Form form={form} onSubmit={handleCreate}>
          <FormItem label="名称" field="name" rules={[{ required: true }]}>
            <Input placeholder="请输入数据库名称" />
          </FormItem>

          <FormItem label="描述" field="description">
            <Input.TextArea placeholder="请输入描述" />
          </FormItem>

          <FormItem
            label="类型"
            field="type"
            initialValue={DatabaseType.SQLITE}
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value={DatabaseType.SQLITE}>SQLite</Select.Option>
              <Select.Option value={DatabaseType.POSTGRES}>PostgreSQL</Select.Option>
              <Select.Option value={DatabaseType.MYSQL}>MySQL</Select.Option>
            </Select>
          </FormItem>

          <Form.Item noStyle shouldUpdate>
            {(values) => {
              const dbType = values.type;

              if (dbType === DatabaseType.SQLITE) {
                return (
                  <FormItem label="文件路径" field={['connection', 'filepath']}>
                    <Input placeholder="/path/to/database.db" />
                  </FormItem>
                );
              }

              return (
                <>
                  <FormItem label="主机" field={['connection', 'host']}>
                    <Input placeholder="localhost" />
                  </FormItem>

                  <FormItem label="端口" field={['connection', 'port']}>
                    <Input
                      type="number"
                      placeholder={dbType === DatabaseType.POSTGRES ? '5432' : '3306'}
                    />
                  </FormItem>

                  <FormItem label="数据库名" field={['connection', 'database']}>
                    <Input placeholder="database_name" />
                  </FormItem>

                  <FormItem label="用户名" field={['connection', 'username']}>
                    <Input placeholder="username" />
                  </FormItem>

                  <FormItem label="密码" field={['connection', 'password']}>
                    <Input.Password placeholder="password" />
                  </FormItem>
                </>
              );
            }}
          </Form.Item>

          <FormItem>
            <Button onClick={handleTestConnection} loading={testingConnection}>
              测试连接
            </Button>
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}

function getStatusColor(status: DatabaseStatus): string {
  switch (status) {
    case DatabaseStatus.CONNECTED:
      return 'green';
    case DatabaseStatus.CONNECTING:
      return 'blue';
    case DatabaseStatus.DISCONNECTED:
      return 'gray';
    case DatabaseStatus.ERROR:
      return 'red';
    default:
      return 'gray';
  }
}
```

### 4.2 SQL 查询编辑器

**文件**: `frontend/src/components/database/SQLEditor/index.tsx`

```typescript
import { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Message,
  Tabs,
  Select,
} from '@arco-design/web-react';
import { IconPlayArrow, IconHistory, IconDownload } from '@arco-design/web-react/icon';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { useDatabaseStore } from '@/stores/databaseStore';
import type { QueryResult } from '@/types/database';
import './index.css';

const TabPane = Tabs.TabPane;

interface SQLEditorProps {
  databaseId: string;
}

export function SQLEditor({ databaseId }: SQLEditorProps) {
  const { executeQuery, getQueryHistory } = useDatabaseStore();

  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executing, setExecuting] = useState(false);

  const queryHistory = getQueryHistory();

  const handleExecute = async () => {
    if (!sqlQuery.trim()) {
      Message.warning('请输入 SQL 查询');
      return;
    }

    setExecuting(true);
    try {
      const result = await executeQuery({
        databaseId,
        sql: sqlQuery,
      });

      setQueryResult(result);
      Message.success(`查询成功，返回 ${result.rowCount} 行`);
    } catch (error) {
      Message.error(`查询失败: ${error.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleExport = () => {
    if (!queryResult) return;

    const csv = convertToCSV(queryResult);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `query_result_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sql-editor">
      <Card
        title="SQL 查询编辑器"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<IconPlayArrow />}
              onClick={handleExecute}
              loading={executing}
            >
              执行
            </Button>
            {queryResult && (
              <Button icon={<IconDownload />} onClick={handleExport}>
                导出
              </Button>
            )}
          </Space>
        }
      >
        {/* 编辑器 */}
        <div className="editor-container">
          <CodeMirror
            value={sqlQuery}
            height="200px"
            extensions={[sql()]}
            onChange={(value) => setSqlQuery(value)}
            placeholder="输入 SQL 查询..."
          />
        </div>

        {/* 结果展示 */}
        <Tabs defaultActiveTab="result">
          <TabPane key="result" title="查询结果">
            {queryResult ? (
              <div>
                <div className="result-info">
                  <span>返回 {queryResult.rowCount} 行</span>
                  <span>执行时间: {queryResult.executionTime.toFixed(2)}ms</span>
                </div>
                <Table
                  columns={queryResult.columns.map(col => ({
                    title: col,
                    dataIndex: col,
                  }))}
                  data={queryResult.rows.map((row, index) => {
                    const rowData: any = { key: index };
                    queryResult.columns.forEach((col, colIndex) => {
                      rowData[col] = row[colIndex];
                    });
                    return rowData;
                  })}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: true }}
                />
              </div>
            ) : (
              <div className="empty-result">执行查询后显示结果</div>
            )}
          </TabPane>

          <TabPane key="history" title="查询历史">
            <div className="query-history">
              {queryHistory.map((query, index) => (
                <div
                  key={index}
                  className="history-item"
                  onClick={() => setSqlQuery(query.sql)}
                >
                  <code>{query.sql}</code>
                </div>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}

// 转换为 CSV
function convertToCSV(result: QueryResult): string {
  const header = result.columns.join(',');
  const rows = result.rows.map(row => row.join(',')).join('\n');
  return `${header}\n${rows}`;
}
```

### 4.3 表结构设计器

**文件**: `frontend/src/components/database/TableDesigner/index.tsx`

```typescript
import { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Message,
} from '@arco-design/web-react';
import { IconPlus, IconDelete } from '@arco-design/web-react/icon';
import { useDatabaseStore } from '@/stores/databaseStore';
import { DataType, type ColumnDefinition } from '@/types/database';
import './index.css';

const FormItem = Form.Item;

interface TableDesignerProps {
  databaseId: string;
}

export function TableDesigner({ databaseId }: TableDesignerProps) {
  const { createTable } = useDatabaseStore();

  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [tableName, setTableName] = useState('');
  const [columnModalVisible, setColumnModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleAddColumn = (values: ColumnDefinition) => {
    setColumns([...columns, values]);
    setColumnModalVisible(false);
    form.resetFields();
  };

  const handleDeleteColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleCreateTable = async () => {
    if (!tableName) {
      Message.warning('请输入表名');
      return;
    }

    if (columns.length === 0) {
      Message.warning('请至少添加一列');
      return;
    }

    try {
      await createTable(databaseId, {
        name: tableName,
        columns,
      });

      Message.success('表创建成功');
      setTableName('');
      setColumns([]);
    } catch (error) {
      Message.error(`创建失败: ${error.message}`);
    }
  };

  const columnTableColumns = [
    {
      title: '列名',
      dataIndex: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
    },
    {
      title: '主键',
      dataIndex: 'primaryKey',
      render: (val: boolean) => (val ? '是' : '否'),
    },
    {
      title: '可空',
      dataIndex: 'nullable',
      render: (val: boolean) => (val ? '是' : '否'),
    },
    {
      title: '唯一',
      dataIndex: 'unique',
      render: (val: boolean) => (val ? '是' : '否'),
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
    },
    {
      title: '操作',
      render: (_: any, _record: any, index: number) => (
        <Button
          type="text"
          status="danger"
          icon={<IconDelete />}
          onClick={() => handleDeleteColumn(index)}
        />
      ),
    },
  ];

  return (
    <Card title="表结构设计">
      <Space direction="vertical" style={{ width: '100%' }}>
        <FormItem label="表名">
          <Input
            value={tableName}
            onChange={setTableName}
            placeholder="输入表名"
          />
        </FormItem>

        <div>
          <Button
            icon={<IconPlus />}
            onClick={() => setColumnModalVisible(true)}
            style={{ marginBottom: 16 }}
          >
            添加列
          </Button>

          <Table
            columns={columnTableColumns}
            data={columns}
            pagination={false}
          />
        </div>

        <Button type="primary" onClick={handleCreateTable}>
          创建表
        </Button>
      </Space>

      {/* 添加列 Modal */}
      <Modal
        title="添加列"
        visible={columnModalVisible}
        onCancel={() => setColumnModalVisible(false)}
        onOk={form.submit}
      >
        <Form form={form} onSubmit={handleAddColumn}>
          <FormItem label="列名" field="name" rules={[{ required: true }]}>
            <Input placeholder="请输入列名" />
          </FormItem>

          <FormItem label="数据类型" field="type" rules={[{ required: true }]}>
            <Select>
              {Object.values(DataType).map(type => (
                <Select.Option key={type} value={type}>
                  {type.toUpperCase()}
                </Select.Option>
              ))}
            </Select>
          </FormItem>

          <FormItem label="主键" field="primaryKey" initialValue={false}>
            <Switch />
          </FormItem>

          <FormItem label="可空" field="nullable" initialValue={true}>
            <Switch />
          </FormItem>

          <FormItem label="唯一" field="unique" initialValue={false}>
            <Switch />
          </FormItem>

          <FormItem label="自增" field="autoIncrement" initialValue={false}>
            <Switch />
          </FormItem>

          <FormItem label="默认值" field="defaultValue">
            <Input placeholder="留空表示无默认值" />
          </FormItem>

          <FormItem label="注释" field="comment">
            <Input.TextArea placeholder="列说明" />
          </FormItem>
        </Form>
      </Modal>
    </Card>
  );
}
```

## 五、后端 API 设计

### 5.1 RESTful API

```
GET    /api/databases                    # 获取数据库列表
GET    /api/databases/:id                # 获取数据库详情
POST   /api/databases                    # 创建数据库
PUT    /api/databases/:id                # 更新数据库
DELETE /api/databases/:id                # 删除数据库

POST   /api/databases/test-connection    # 测试连接
POST   /api/databases/:id/connect        # 连接数据库
POST   /api/databases/:id/disconnect     # 断开连接

GET    /api/databases/:id/tables         # 获取表列表
POST   /api/databases/:id/tables         # 创建表
PUT    /api/databases/:id/tables/:name   # 更新表
DELETE /api/databases/:id/tables/:name   # 删除表

POST   /api/databases/query              # 执行查询
POST   /api/databases/:id/import         # 导入数据
GET    /api/databases/:id/export         # 导出数据
```

### 5.2 Go 服务接口

```go
// internal/domain/database/service.go
package database

import "context"

type Service interface {
    // 数据库管理
    ListDatabases(ctx context.Context) ([]*Database, error)
    GetDatabase(ctx context.Context, id string) (*Database, error)
    CreateDatabase(ctx context.Context, database *Database) (*Database, error)
    UpdateDatabase(ctx context.Context, id string, updates map[string]interface{}) error
    DeleteDatabase(ctx context.Context, id string) error

    // 连接管理
    TestConnection(ctx context.Context, conn *DatabaseConnection) (bool, error)
    Connect(ctx context.Context, id string) error
    Disconnect(ctx context.Context, id string) error

    // 表管理
    ListTables(ctx context.Context, databaseID string) ([]*TableDefinition, error)
    CreateTable(ctx context.Context, databaseID string, table *TableDefinition) error
    UpdateTable(ctx context.Context, databaseID, tableName string, updates *TableDefinition) error
    DeleteTable(ctx context.Context, databaseID, tableName string) error

    // 查询
    ExecuteQuery(ctx context.Context, req *QueryRequest) (*QueryResult, error)
    ExecuteUpdate(ctx context.Context, req *QueryRequest) (int64, error)

    // 导入导出
    ImportData(ctx context.Context, databaseID string, data []byte, format string) error
    ExportData(ctx context.Context, databaseID, tableName string, format string) ([]byte, error)
}

type Database struct {
    ID          string              `json:"id"`
    Name        string              `json:"name"`
    Description string              `json:"description"`
    Type        DatabaseType        `json:"type"`
    Status      DatabaseStatus      `json:"status"`
    Connection  *DatabaseConnection `json:"connection"`
    Tables      []*TableDefinition  `json:"tables"`
    Metadata    DatabaseMetadata    `json:"metadata"`
    CreatedAt   time.Time           `json:"created_at"`
    UpdatedAt   time.Time           `json:"updated_at"`
}
```

## 六、最佳实践

### 6.1 SQL 注入防护

```typescript
// 使用参数化查询
async function safeQuery(databaseId: string, sql: string, params: any[]) {
  // 服务端会使用预处理语句
  return await executeQuery({
    databaseId,
    sql,
    parameters: params,
  });
}

// 错误示例：字符串拼接
// const sql = `SELECT * FROM users WHERE name = '${userName}'`; // 不安全！

// 正确示例：参数化查询
const sql = 'SELECT * FROM users WHERE name = ?';
const params = [userName];
await safeQuery(databaseId, sql, params);
```

### 6.2 连接池管理

```typescript
// 连接池配置
const poolConfig = {
  maxConnections: 10,
  minConnections: 2,
  connectionTimeout: 30000,
  idleTimeout: 60000,
};

// 自动释放连接
async function withConnection<T>(
  databaseId: string,
  callback: (conn: Connection) => Promise<T>
): Promise<T> {
  const conn = await getConnection(databaseId);
  try {
    return await callback(conn);
  } finally {
    await releaseConnection(conn);
  }
}
```

### 6.3 查询优化

```typescript
// 限制返回行数
const result = await executeQuery({
  databaseId,
  sql: 'SELECT * FROM large_table',
  limit: 1000, // 防止内存溢出
});

// 分页查询
async function paginatedQuery(
  databaseId: string,
  sql: string,
  page: number,
  pageSize: number
) {
  const offset = (page - 1) * pageSize;
  const paginatedSql = `${sql} LIMIT ${pageSize} OFFSET ${offset}`;

  return await executeQuery({ databaseId, sql: paginatedSql });
}
```

---

**文档状态**: ✅ 完成
**资源管理模块（20-23）**: 全部完成
