import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Plugin,
  PluginType,
  PluginExecutionContext,
  PluginExecutionResult,
} from '@/types/plugin';

interface PluginState {
  // 状态
  plugins: Record<string, Plugin>;
  installedPlugins: Set<string>;
  favoritePlugins: Set<string>;

  // 过滤和搜索
  filters: {
    category?: string;
    type?: PluginType;
    search?: string;
  };

  // 加载状态
  loading: boolean;
  error: string | null;
}

interface PluginActions {
  // 插件 CRUD
  fetchPlugins: () => Promise<void>;
  getPlugin: (id: string) => Promise<Plugin>;
  createPlugin: (plugin: Partial<Plugin>) => Promise<Plugin>;
  updatePlugin: (id: string, updates: Partial<Plugin>) => Promise<void>;
  deletePlugin: (id: string) => Promise<void>;

  // 插件安装管理
  installPlugin: (id: string) => Promise<void>;
  uninstallPlugin: (id: string) => Promise<void>;

  // 插件执行
  executePlugin: (
    context: PluginExecutionContext
  ) => Promise<PluginExecutionResult>;

  // 收藏管理
  toggleFavorite: (id: string) => void;

  // 过滤和搜索
  setFilters: (filters: Partial<PluginState['filters']>) => void;
  clearFilters: () => void;

  // 工具方法
  getInstalledPlugins: () => Plugin[];
  getFavoritePlugins: () => Plugin[];
  searchPlugins: (query: string) => Plugin[];
}

export const usePluginStore = create<PluginState & PluginActions>()(
  persist((set, get) => ({
      // 初始状态
      plugins: {},
      installedPlugins: new Set(),
      favoritePlugins: new Set(),
      filters: {},
      loading: false,
      error: null,

      // 获取插件列表
      fetchPlugins: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/plugins');
          const data = await response.json();

          const plugins: Record<string, Plugin> = {};
          data.forEach((plugin: Plugin) => {
            plugins[plugin.id] = plugin;
          });

          set({ plugins, loading: false });
        } catch (error) {
          set({
            error: (error as Error).message,
            loading: false,
          });
        }
      },

      // 获取单个插件
      getPlugin: async (id: string) => {
        const cached = get().plugins[id];
        if (cached) return cached;

        const response = await fetch(`/api/plugins/${id}`);
        const plugin = await response.json();

        set((state) => ({
          plugins: { ...state.plugins, [id]: plugin },
        }));

        return plugin;
      },

      // 创建插件
      createPlugin: async (plugin: Partial<Plugin>) => {
        const response = await fetch('/api/plugins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plugin),
        });

        const newPlugin = await response.json();

        set((state) => ({
          plugins: { ...state.plugins, [newPlugin.id]: newPlugin },
        }));

        return newPlugin;
      },

      // 更新插件
      updatePlugin: async (id: string, updates: Partial<Plugin>) => {
        const response = await fetch(`/api/plugins/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const updated = await response.json();

        set((state) => ({
          plugins: {
            ...state.plugins,
            [id]: { ...state.plugins[id], ...updated },
          },
        }));
      },

      // 删除插件
      deletePlugin: async (id: string) => {
        await fetch(`/api/plugins/${id}`, { method: 'DELETE' });

        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: removed, ...rest } = state.plugins;
          const newInstalledPlugins = new Set(state.installedPlugins);
          const newFavoritePlugins = new Set(state.favoritePlugins);
          newInstalledPlugins.delete(id);
          newFavoritePlugins.delete(id);

          return {
            plugins: rest,
            installedPlugins: newInstalledPlugins,
            favoritePlugins: newFavoritePlugins,
          };
        });
      },

      // 安装插件
      installPlugin: async (id: string) => {
        await fetch(`/api/plugins/${id}/install`, { method: 'POST' });

        set((state) => {
          const newInstalledPlugins = new Set(state.installedPlugins);
          newInstalledPlugins.add(id);
          return { installedPlugins: newInstalledPlugins };
        });
      },

      // 卸载插件
      uninstallPlugin: async (id: string) => {
        await fetch(`/api/plugins/${id}/uninstall`, { method: 'POST' });

        set((state) => {
          const newInstalledPlugins = new Set(state.installedPlugins);
          newInstalledPlugins.delete(id);
          return { installedPlugins: newInstalledPlugins };
        });
      },

      // 执行插件
      executePlugin: async (context: PluginExecutionContext) => {
        const response = await fetch('/api/plugins/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context),
        });

        return await response.json();
      },

      // 切换收藏
      toggleFavorite: (id: string) => {
        set((state) => {
          const newFavoritePlugins = new Set(state.favoritePlugins);
          if (newFavoritePlugins.has(id)) {
            newFavoritePlugins.delete(id);
          } else {
            newFavoritePlugins.add(id);
          }
          return { favoritePlugins: newFavoritePlugins };
        });
      },

      // 设置过滤条件
      setFilters: (filters: Partial<PluginState['filters']>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      // 清空过滤
      clearFilters: () => {
        set({ filters: {} });
      },

      // 获取已安装插件
      getInstalledPlugins: () => {
        const { plugins, installedPlugins } = get();
        return Array.from(installedPlugins)
          .map((id) => plugins[id])
          .filter(Boolean);
      },

      // 获取收藏插件
      getFavoritePlugins: () => {
        const { plugins, favoritePlugins } = get();
        return Array.from(favoritePlugins)
          .map((id) => plugins[id])
          .filter(Boolean);
      },

      // 搜索插件
      searchPlugins: (query: string) => {
        const { plugins, filters } = get();
        const lowerQuery = query.toLowerCase();

        return Object.values(plugins).filter((plugin) => {
          // 搜索匹配
          const matchesSearch =
            !query ||
            plugin.name.toLowerCase().includes(lowerQuery) ||
            plugin.description.toLowerCase().includes(lowerQuery);

          // 分类过滤
          const matchesCategory =
            !filters.category || plugin.metadata.category === filters.category;

          // 类型过滤
          const matchesType = !filters.type || plugin.type === filters.type;

          return matchesSearch && matchesCategory && matchesType;
        });
      },
    }), {
      name: 'plugin-store',
      partialize: (state) => ({
        installedPlugins: Array.from(state.installedPlugins),
        favoritePlugins: Array.from(state.favoritePlugins),
      }),
    }
  )
);
