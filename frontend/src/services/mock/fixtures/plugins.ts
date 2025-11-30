import type { Plugin } from '@/types/plugin';
import { PluginType, PluginStatus, PluginVisibility } from '@/types/plugin';

export const mockPlugins: Plugin[] = [
  {
    id: 'plugin-1',
    name: '天气查询',
    description: '查询全球天气信息',
    type: PluginType.API,
    status: PluginStatus.PUBLISHED,
    visibility: PluginVisibility.PUBLIC,
    version: '1.0.0',
    config: {
      openapi: '3.0.0',
      info: {
        title: 'Weather API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'https://api.weather.com',
        },
      ],
      paths: {
        '/weather': {
          get: {
            operationId: 'getWeather',
            summary: '获取天气信息',
            parameters: [
              {
                name: 'city',
                in: 'query',
                required: true,
                schema: { type: 'string' },
              },
            ],
            responses: {
              '200': {
                description: '成功',
              },
            },
          },
        },
      },
    },
    metadata: {
      author: 'Weather Inc.',
      category: '工具',
      tags: ['天气', '查询'],
      homepage: 'https://example.com/weather',
      documentation: 'https://docs.example.com/weather',
    },
    stats: {
      installs: 1234,
      rating: 4.5,
      reviews: 89,
      lastUpdated: '2025-01-15T10:30:00Z',
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'plugin-2',
    name: '图片生成',
    description: '使用 AI 生成图片',
    type: PluginType.CODE,
    status: PluginStatus.PUBLISHED,
    visibility: PluginVisibility.PUBLIC,
    version: '2.1.0',
    config: {
      openapi: '3.0.0',
      info: {
        title: 'Image Generation API',
        version: '2.1.0',
      },
      servers: [
        {
          url: 'https://api.image-gen.com',
        },
      ],
      paths: {
        '/generate': {
          post: {
            operationId: 'generateImage',
            summary: '生成图片',
            parameters: [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      prompt: { type: 'string' },
                      size: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: '成功',
              },
            },
          },
        },
      },
    },
    metadata: {
      author: 'ImageAI Team',
      category: 'AI工具',
      tags: ['图片', 'AI', '生成'],
      homepage: 'https://example.com/image',
    },
    stats: {
      installs: 5678,
      rating: 4.8,
      reviews: 234,
      lastUpdated: '2025-01-20T14:20:00Z',
    },
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'plugin-3',
    name: '数据分析',
    description: '强大的数据分析工具',
    type: PluginType.KNOWLEDGE,
    status: PluginStatus.DRAFT,
    visibility: PluginVisibility.PRIVATE,
    version: '0.9.0',
    config: {
      openapi: '3.0.0',
      info: {
        title: 'Data Analysis API',
        version: '0.9.0',
      },
      servers: [
        {
          url: 'https://api.datalytics.com',
        },
      ],
      paths: {
        '/analyze': {
          post: {
            operationId: 'analyzeData',
            summary: '分析数据',
            parameters: [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array' },
                      type: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: '成功',
              },
            },
          },
        },
      },
    },
    metadata: {
      author: 'DataLytics Corp',
      category: '数据分析',
      tags: ['数据', '分析', '统计'],
    },
    stats: {
      installs: 456,
      rating: 4.2,
      reviews: 23,
      lastUpdated: '2025-01-10T09:15:00Z',
    },
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
];
