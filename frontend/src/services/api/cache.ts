interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 过期时间（毫秒）
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const apiCache = new ApiCache();

// 使用缓存的请求
export async function getCachedData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // 尝试从缓存获取
  const cached = apiCache.get<T>(cacheKey);
  if (cached) return cached;

  // 缓存未命中，发起请求
  const data = await fetcher();
  apiCache.set(cacheKey, data, ttl);

  return data;
}
