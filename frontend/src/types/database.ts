import { z } from 'zod';

// 数据库类型
export enum DatabaseType {
  SQLITE = 'sqlite',
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
}

// 数据库状态
export enum DatabaseStatus {
  CONNECTING = 'connecting', // 连接中
  CONNECTED = 'connected', // 已连接
  DISCONNECTED = 'disconnected', // 已断开
  ERROR = 'error', // 错误
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
  columns: z
    .array(
      z.object({
        name: z.string().min(1, '列名不能为空'),
        type: z.nativeEnum(DataType),
        primaryKey: z.boolean().optional(),
        nullable: z.boolean().optional(),
        unique: z.boolean().optional(),
      })
    )
    .min(1, '至少需要一列'),
});

export type DatabaseFormData = z.infer<typeof DatabaseSchema>;
export type TableFormData = z.infer<typeof TableSchema>;
