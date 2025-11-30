import type MockAdapter from 'axios-mock-adapter';
import { mockPlugins } from '../fixtures/plugins';

// 模拟已安装的插件 ID
const installedPluginIds = new Set<string>(['plugin-1']);

export function setupPluginMocks(mock: MockAdapter) {
  // 获取插件列表
  mock.onGet('/api/plugins').reply((config) => {
    const url = new URL(config.url!, 'http://localhost');
    const type = url.searchParams.get('type');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');

    let filteredPlugins = [...mockPlugins];

    // 过滤类型
    if (type) {
      filteredPlugins = filteredPlugins.filter(p => p.type === type);
    }

    // 过滤分类
    if (category) {
      filteredPlugins = filteredPlugins.filter(p => p.metadata.category === category);
    }

    // 搜索
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPlugins = filteredPlugins.filter(
        p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: filteredPlugins,
      },
    ];
  });

  // 获取单个插件
  mock.onGet(/\/api\/plugins\/(.+)/).reply((config) => {
    const pluginId = config.url?.split('/').pop();
    const plugin = mockPlugins.find(p => p.id === pluginId);

    if (!plugin) {
      return [
        404,
        {
          code: 404,
          message: '插件不存在',
        },
      ];
    }

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: plugin,
      },
    ];
  });

  // 安装插件
  mock.onPost(/\/api\/plugins\/(.+)\/install/).reply((config) => {
    const pluginId = config.url?.match(/\/api\/plugins\/([^/]+)\/install/)?.[1];

    if (!pluginId) {
      return [400, { code: 400, message: '插件 ID 无效' }];
    }

    const plugin = mockPlugins.find(p => p.id === pluginId);
    if (!plugin) {
      return [404, { code: 404, message: '插件不存在' }];
    }

    installedPluginIds.add(pluginId);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: { installed: true },
      },
    ];
  });

  // 卸载插件
  mock.onPost(/\/api\/plugins\/(.+)\/uninstall/).reply((config) => {
    const pluginId = config.url?.match(/\/api\/plugins\/([^/]+)\/uninstall/)?.[1];

    if (!pluginId) {
      return [400, { code: 400, message: '插件 ID 无效' }];
    }

    installedPluginIds.delete(pluginId);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: { installed: false },
      },
    ];
  });

  // 获取已安装的插件列表
  mock.onGet('/api/plugins/installed').reply(() => {
    const installed = mockPlugins.filter(p => installedPluginIds.has(p.id));

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: installed,
      },
    ];
  });

  // 执行插件
  mock.onPost(/\/api\/plugins\/(.+)\/execute/).reply((config) => {
    const pluginId = config.url?.match(/\/api\/plugins\/([^/]+)\/execute/)?.[1];
    const { operation, parameters } = JSON.parse(config.data);

    return [
      200,
      {
        code: 0,
        message: 'success',
        data: {
          pluginId,
          operation,
          parameters,
          result: `模拟执行结果: operation=${operation}, params=${JSON.stringify(parameters)}`,
          executionTime: 234,
        },
      },
    ];
  });
}
