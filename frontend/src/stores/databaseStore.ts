import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Database,
  DatabaseConnection,
  TableDefinition,
  QueryRequest,
  QueryResult,
} from '@/types/database';
import { DatabaseStatus } from '@/types/database';

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
  updateTable: (
    databaseId: string,
    tableName: string,
    updates: Partial<TableDefinition>
  ) => Promise<void>;
  deleteTable: (databaseId: string, tableName: string) => Promise<void>;
  getTables: (databaseId: string) => TableDefinition[];

  // 查询
  executeQuery: (request: QueryRequest) => Promise<QueryResult>;
  getQueryHistory: () => QueryRequest[];
  clearQueryHistory: () => void;
}

export const useDatabaseStore = create<DatabaseState & DatabaseActions>()(
  persist(
    (set, get) => ({
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

          const databases: Record<string, Database> = {};
          data.forEach((db: Database) => {
            databases[db.id] = db;
          });

          set({ databases, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      // 获取单个数据库
      getDatabase: async (id: string) => {
        const cached = get().databases[id];
        if (cached) return cached;

        const response = await fetch(`/api/databases/${id}`);
        const database = await response.json();

        set((state) => ({
          databases: { ...state.databases, [id]: database },
        }));

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

        set((state) => ({
          databases: { ...state.databases, [newDatabase.id]: newDatabase },
        }));

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

        set((state) => ({
          databases: {
            ...state.databases,
            [id]: { ...state.databases[id], ...updated },
          },
        }));
      },

      // 删除数据库
      deleteDatabase: async (id: string) => {
        await fetch(`/api/databases/${id}`, { method: 'DELETE' });

        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: removed, ...rest } = state.databases;
          return { databases: rest };
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

        set((state) => ({
          databases: {
            ...state.databases,
            [id]: {
              ...state.databases[id],
              status: result.status,
            },
          },
        }));
      },

      // 断开连接
      disconnect: async (id: string) => {
        await fetch(`/api/databases/${id}/disconnect`, {
          method: 'POST',
        });

        set((state) => ({
          databases: {
            ...state.databases,
            [id]: {
              ...state.databases[id],
              status: DatabaseStatus.DISCONNECTED,
            },
          },
        }));
      },

      // 创建表
      createTable: async (databaseId: string, table: TableDefinition) => {
        const response = await fetch(`/api/databases/${databaseId}/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(table),
        });

        const newTable = await response.json();

        set((state) => ({
          databases: {
            ...state.databases,
            [databaseId]: {
              ...state.databases[databaseId],
              tables: [
                ...(state.databases[databaseId]?.tables || []),
                newTable,
              ],
            },
          },
        }));
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

        set((state) => {
          const database = state.databases[databaseId];
          if (!database) return state;

          const tables = database.tables.map((t) =>
            t.name === tableName ? { ...t, ...updates } : t
          );

          return {
            databases: {
              ...state.databases,
              [databaseId]: {
                ...database,
                tables,
              },
            },
          };
        });
      },

      // 删除表
      deleteTable: async (databaseId: string, tableName: string) => {
        await fetch(`/api/databases/${databaseId}/tables/${tableName}`, {
          method: 'DELETE',
        });

        set((state) => {
          const database = state.databases[databaseId];
          if (!database) return state;

          return {
            databases: {
              ...state.databases,
              [databaseId]: {
                ...database,
                tables: database.tables.filter((t) => t.name !== tableName),
              },
            },
          };
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
        set((state) => {
          const newHistory = [request, ...state.queryHistory].slice(0, 50);
          return { queryHistory: newHistory };
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
    }),
    {
      name: 'database-store',
      partialize: (state) => ({
        databases: state.databases,
        queryHistory: state.queryHistory,
      }),
    }
  )
);
