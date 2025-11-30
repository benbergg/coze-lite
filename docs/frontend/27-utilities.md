# UI 组件和工具 - 工具函数和 Hooks

> **文档版本**: v1.0
> **创建时间**: 2025-11-30
> **Coze Studio 源码**: `@coze-arch/bot-hooks`, `@coze-arch/utils`

## 一、概述

本文档涵盖 Coze Lite 项目中的工具函数和自定义 Hooks，包括常用库的使用、自定义工具开发和最佳实践。

### 1.1 技术栈

| 库 | 说明 | 用途 |
|------|------|------|
| **ahooks** | React Hooks 工具库 | 提供实用的自定义 Hooks |
| **lodash-es** | JavaScript 工具库 | 数组、对象、字符串处理 |
| **dayjs** | 日期处理库 | 日期格式化和计算 |
| **classnames** | CSS 类名工具 | 动态组合类名 |
| **immer** | 不可变数据 | 简化状态更新 |
| **zod** | 类型验证 | 运行时类型检查 |

### 1.2 项目结构

```
src/
├── utils/                    # 工具函数
│   ├── format.ts             # 格式化工具
│   ├── validation.ts         # 验证工具
│   ├── storage.ts            # 存储工具
│   ├── request.ts            # 请求工具
│   ├── dom.ts                # DOM 操作
│   ├── file.ts               # 文件处理
│   └── index.ts              # 统一导出
├── hooks/                    # 自定义 Hooks
│   ├── useDebounce.ts
│   ├── useThrottle.ts
│   ├── useLocalStorage.ts
│   ├── useAsync.ts
│   ├── useCopyToClipboard.ts
│   └── index.ts
└── services/
    └── utils/
        └── error-handler.ts  # 错误处理
```

## 二、第三方工具库

### 2.1 ahooks - React Hooks 工具库

#### 2.1.1 状态管理 Hooks

**useBoolean - 布尔值管理**:

```typescript
import { useBoolean } from 'ahooks';

function Modal() {
  const [visible, { setTrue, setFalse, toggle }] = useBoolean(false);

  return (
    <>
      <Button onClick={setTrue}>打开</Button>
      <Modal
        visible={visible}
        onCancel={setFalse}
        onOk={toggle}
      >
        内容
      </Modal>
    </>
  );
}
```

**useToggle - 状态切换**:

```typescript
import { useToggle } from 'ahooks';

function Theme() {
  const [theme, { toggle, set }] = useToggle('light', 'dark');

  return (
    <div>
      <p>当前主题: {theme}</p>
      <Button onClick={toggle}>切换主题</Button>
      <Button onClick={() => set('light')}>浅色</Button>
      <Button onClick={() => set('dark')}>深色</Button>
    </div>
  );
}
```

**useSet - Set 管理**:

```typescript
import { useSet } from 'ahooks';

function TagManager() {
  const [tags, { add, remove, has }] = useSet<string>(['react', 'vue']);

  return (
    <div>
      {Array.from(tags).map(tag => (
        <Tag key={tag} closable onClose={() => remove(tag)}>
          {tag}
        </Tag>
      ))}
      <Input onPressEnter={(e) => add(e.currentTarget.value)} />
    </div>
  );
}
```

**useMap - Map 管理**:

```typescript
import { useMap } from 'ahooks';

function FormData() {
  const [formData, { set, get, remove }] = useMap<string, any>([
    ['name', 'John'],
    ['age', 25],
  ]);

  return (
    <div>
      <Input
        value={get('name')}
        onChange={(val) => set('name', val)}
      />
    </div>
  );
}
```

#### 2.1.2 副作用 Hooks

**useDebounce - 防抖**:

```typescript
import { useDebounce } from 'ahooks';

function SearchInput() {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, { wait: 500 });

  useEffect(() => {
    // 使用防抖后的值进行搜索
    if (debouncedValue) {
      searchAPI(debouncedValue);
    }
  }, [debouncedValue]);

  return <Input value={value} onChange={setValue} />;
}
```

**useThrottle - 节流**:

```typescript
import { useThrottle } from 'ahooks';

function ScrollComponent() {
  const [scrollTop, setScrollTop] = useState(0);
  const throttledScrollTop = useThrottle(scrollTop, { wait: 200 });

  useEffect(() => {
    // 使用节流后的值
    console.log('Throttled scroll:', throttledScrollTop);
  }, [throttledScrollTop]);

  return (
    <div onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      {/* 内容 */}
    </div>
  );
}
```

**useInterval - 定时器**:

```typescript
import { useInterval } from 'ahooks';

function Timer() {
  const [count, setCount] = useState(0);

  useInterval(() => {
    setCount(count + 1);
  }, 1000);

  return <div>计数: {count}</div>;
}
```

**useTimeout - 延迟执行**:

```typescript
import { useTimeout } from 'ahooks';

function DelayedMessage() {
  const [visible, setVisible] = useState(false);

  useTimeout(() => {
    setVisible(true);
  }, 3000);

  return visible ? <div>3秒后显示</div> : null;
}
```

#### 2.1.3 请求 Hooks

**useRequest - 异步请求**:

```typescript
import { useRequest } from 'ahooks';
import { getWorkspaces } from '@/services/api/workspace';

function WorkspaceList() {
  const {
    data,
    loading,
    error,
    run,
    refresh,
  } = useRequest(getWorkspaces, {
    manual: false, // 自动执行
    onSuccess: (data) => {
      console.log('Success:', data);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

  if (loading) return <Spin />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.map(workspace => (
        <Card key={workspace.id}>{workspace.name}</Card>
      ))}
      <Button onClick={refresh}>刷新</Button>
    </div>
  );
}
```

**usePagination - 分页**:

```typescript
import { usePagination } from 'ahooks';

function AgentList() {
  const {
    data,
    loading,
    pagination,
  } = usePagination(
    ({ current, pageSize }) => {
      return getAgents({ page: current, pageSize });
    },
    {
      defaultPageSize: 10,
    }
  );

  return (
    <Table
      dataSource={data?.list}
      loading={loading}
      pagination={{
        ...pagination,
        showTotal: (total) => `共 ${total} 条`,
      }}
    />
  );
}
```

#### 2.1.4 DOM Hooks

**useClickAway - 点击外部**:

```typescript
import { useClickAway } from 'ahooks';

function Dropdown() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useClickAway(() => {
    setVisible(false);
  }, ref);

  return (
    <div ref={ref}>
      <Button onClick={() => setVisible(true)}>打开</Button>
      {visible && <Menu>...</Menu>}
    </div>
  );
}
```

**useScroll - 滚动监听**:

```typescript
import { useScroll } from 'ahooks';

function ScrollTop() {
  const scroll = useScroll(document);

  return (
    <div>
      <p>滚动位置: {scroll?.top}</p>
      {scroll && scroll.top > 100 && (
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          回到顶部
        </Button>
      )}
    </div>
  );
}
```

**useSize - 元素尺寸**:

```typescript
import { useSize } from 'ahooks';

function ResizableComponent() {
  const ref = useRef(null);
  const size = useSize(ref);

  return (
    <div ref={ref}>
      <p>宽度: {size?.width}</p>
      <p>高度: {size?.height}</p>
    </div>
  );
}
```

#### 2.1.5 其他实用 Hooks

**useLocalStorageState - localStorage 状态**:

```typescript
import { useLocalStorageState } from 'ahooks';

function ThemeSwitcher() {
  const [theme, setTheme] = useLocalStorageState('theme', {
    defaultValue: 'light',
  });

  return (
    <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      当前主题: {theme}
    </Button>
  );
}
```

**useCopyToClipboard - 复制到剪贴板**:

```typescript
import { useCopyToClipboard } from 'ahooks';

function CopyButton({ text }: { text: string }) {
  const [copiedText, copy] = useCopyToClipboard();

  return (
    <Button onClick={() => copy(text)}>
      {copiedText ? '已复制' : '复制'}
    </Button>
  );
}
```

**useTitle - 修改页面标题**:

```typescript
import { useTitle } from 'ahooks';

function WorkspacePage() {
  useTitle('工作空间 - Coze Lite');

  return <div>工作空间内容</div>;
}
```

### 2.2 lodash-es - 工具函数库

#### 2.2.1 数组操作

```typescript
import {
  chunk,
  compact,
  difference,
  intersection,
  union,
  uniq,
  uniqBy,
  groupBy,
  orderBy,
} from 'lodash-es';

// 数组分块
chunk([1, 2, 3, 4, 5], 2);
// => [[1, 2], [3, 4], [5]]

// 移除假值
compact([0, 1, false, 2, '', 3, null]);
// => [1, 2, 3]

// 差集
difference([1, 2, 3], [2, 3, 4]);
// => [1]

// 交集
intersection([1, 2, 3], [2, 3, 4]);
// => [2, 3]

// 并集
union([1, 2], [2, 3]);
// => [1, 2, 3]

// 去重
uniq([1, 2, 1, 3, 2]);
// => [1, 2, 3]

// 按属性去重
uniqBy([{ id: 1 }, { id: 1 }, { id: 2 }], 'id');
// => [{ id: 1 }, { id: 2 }]

// 分组
groupBy([6.1, 4.2, 6.3], Math.floor);
// => { '4': [4.2], '6': [6.1, 6.3] }

// 排序
orderBy(
  [{ name: 'bob', age: 30 }, { name: 'alice', age: 25 }],
  ['age'],
  ['asc']
);
```

#### 2.2.2 对象操作

```typescript
import {
  pick,
  omit,
  merge,
  cloneDeep,
  get,
  set,
  has,
} from 'lodash-es';

// 选择属性
pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);
// => { a: 1, c: 3 }

// 排除属性
omit({ a: 1, b: 2, c: 3 }, ['b']);
// => { a: 1, c: 3 }

// 深度合并
merge({ a: 1 }, { b: 2 }, { c: 3 });
// => { a: 1, b: 2, c: 3 }

// 深拷贝
const obj = { a: 1, b: { c: 2 } };
const clone = cloneDeep(obj);

// 安全获取嵌套值
get({ a: { b: { c: 3 } } }, 'a.b.c', 'default');
// => 3

// 设置嵌套值
const obj = {};
set(obj, 'a.b.c', 3);
// => { a: { b: { c: 3 } } }

// 检查路径是否存在
has({ a: { b: 2 } }, 'a.b');
// => true
```

#### 2.2.3 字符串操作

```typescript
import {
  camelCase,
  kebabCase,
  snakeCase,
  startCase,
  capitalize,
  truncate,
} from 'lodash-es';

// 驼峰命名
camelCase('hello world');
// => 'helloWorld'

// 短横线命名
kebabCase('helloWorld');
// => 'hello-world'

// 下划线命名
snakeCase('helloWorld');
// => 'hello_world'

// 首字母大写每个单词
startCase('hello world');
// => 'Hello World'

// 首字母大写
capitalize('hello');
// => 'Hello'

// 截断字符串
truncate('Hello World', { length: 10 });
// => 'Hello W...'
```

#### 2.2.4 函数操作

```typescript
import {
  debounce,
  throttle,
  once,
  memoize,
} from 'lodash-es';

// 防抖
const handleSearch = debounce((value: string) => {
  search(value);
}, 300);

// 节流
const handleScroll = throttle(() => {
  console.log('Scrolling...');
}, 200);

// 只执行一次
const initialize = once(() => {
  console.log('Initialized');
});

// 记忆化
const fibonacci = memoize((n: number): number => {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});
```

### 2.3 dayjs - 日期处理

#### 2.3.1 基础用法

```typescript
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 扩展插件
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 当前时间
dayjs();

// 解析日期
dayjs('2025-11-30');
dayjs(new Date());
dayjs(1701331200000);

// 格式化
dayjs().format('YYYY-MM-DD HH:mm:ss');
// => '2025-11-30 21:00:00'

// 相对时间
dayjs('2025-11-29').fromNow();
// => '1 天前'

// 日期操作
dayjs().add(1, 'day');      // 加一天
dayjs().subtract(1, 'month'); // 减一个月
dayjs().startOf('month');    // 月初
dayjs().endOf('year');       // 年末

// 比较
dayjs('2025-11-30').isBefore(dayjs());
dayjs('2025-11-30').isAfter(dayjs());
dayjs('2025-11-30').isSame(dayjs(), 'day');
```

#### 2.3.2 实用工具函数

**文件**: `src/utils/date.ts`

```typescript
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 格式化日期
 */
export function formatDate(
  date: string | Date | number,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  return dayjs(date).format(format);
}

/**
 * 相对时间
 */
export function fromNow(date: string | Date | number): string {
  return dayjs(date).fromNow();
}

/**
 * 是否是今天
 */
export function isToday(date: string | Date | number): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

/**
 * 是否在范围内
 */
export function isInRange(
  date: string | Date | number,
  start: string | Date | number,
  end: string | Date | number
): boolean {
  const d = dayjs(date);
  return d.isAfter(start) && d.isBefore(end);
}
```

### 2.4 classnames - 类名组合

```typescript
import classNames from 'classnames';

// 基础用法
classNames('foo', 'bar');
// => 'foo bar'

// 条件类名
classNames('foo', { bar: true, baz: false });
// => 'foo bar'

// 数组
classNames(['foo', 'bar']);
// => 'foo bar'

// 混合使用
classNames('foo', { bar: true }, ['baz']);
// => 'foo bar baz'

// 在 React 中使用
function Button({ primary, disabled, className }: ButtonProps) {
  return (
    <button
      className={classNames(
        'btn',
        {
          'btn-primary': primary,
          'btn-disabled': disabled,
        },
        className
      )}
    >
      按钮
    </button>
  );
}
```

### 2.5 immer - 不可变数据

```typescript
import { produce } from 'immer';

// 简化状态更新
const state = {
  user: { name: 'John', age: 25 },
  todos: [
    { id: 1, text: 'Learn React', done: true },
    { id: 2, text: 'Learn Immer', done: false },
  ],
};

// 使用 Immer
const nextState = produce(state, draft => {
  draft.user.age = 26;
  draft.todos[1].done = true;
  draft.todos.push({ id: 3, text: 'Learn TypeScript', done: false });
});

// 在 Zustand 中使用
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface State {
  count: number;
  increase: () => void;
}

const useStore = create<State>()(
  immer((set) => ({
    count: 0,
    increase: () =>
      set((state) => {
        state.count += 1;
      }),
  }))
);
```

## 三、自定义工具函数

### 3.1 格式化工具

**文件**: `src/utils/format.ts`

```typescript
/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化数字
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化货币
 */
export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * 截断字符串
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + suffix;
}

/**
 * 高亮关键词
 */
export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text;

  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
```

### 3.2 验证工具

**文件**: `src/utils/validation.ts`

```typescript
/**
 * 验证邮箱
 */
export function isEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * 验证手机号
 */
export function isPhone(phone: string): boolean {
  const regex = /^1[3-9]\d{9}$/;
  return regex.test(phone);
}

/**
 * 验证 URL
 */
export function isURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证身份证号
 */
export function isIDCard(id: string): boolean {
  const regex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return regex.test(id);
}

/**
 * 验证密码强度
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 6) return 'weak';

  let strength = 0;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength === 3) return 'medium';
  return 'strong';
}
```

### 3.3 存储工具

**文件**: `src/utils/storage.ts`

```typescript
/**
 * localStorage 封装
 */
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue ?? null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  clear(): void {
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

/**
 * sessionStorage 封装
 */
export const sessionStorage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch (error) {
      console.error('SessionStorage get error:', error);
      return defaultValue ?? null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('SessionStorage set error:', error);
    }
  },

  remove(key: string): void {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.error('SessionStorage remove error:', error);
    }
  },

  clear(): void {
    try {
      window.sessionStorage.clear();
    } catch (error) {
      console.error('SessionStorage clear error:', error);
    }
  },
};
```

### 3.4 文件处理

**文件**: `src/utils/file.ts`

```typescript
/**
 * 下载文件
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 导出 JSON
 */
export function exportJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * 读取文件内容
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * 读取图片
 */
export function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩图片
 */
export function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, file.type, quality);
      };

      img.onerror = reject;
      img.src = e.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### 3.5 DOM 操作

**文件**: `src/utils/dom.ts`

```typescript
/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * 滚动到元素
 */
export function scrollToElement(
  element: HTMLElement | string,
  options?: ScrollIntoViewOptions
): void {
  const el = typeof element === 'string'
    ? document.querySelector(element)
    : element;

  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      ...options,
    });
  }
}

/**
 * 获取元素位置
 */
export function getElementPosition(element: HTMLElement): {
  top: number;
  left: number;
  width: number;
  height: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * 全屏
 */
export async function enterFullscreen(element?: HTMLElement): Promise<void> {
  const el = element || document.documentElement;

  if (el.requestFullscreen) {
    await el.requestFullscreen();
  }
}

/**
 * 退出全屏
 */
export async function exitFullscreen(): Promise<void> {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  }
}
```

## 四、自定义 Hooks

### 4.1 状态管理 Hooks

**useToggle**:

**文件**: `src/hooks/useToggle.ts`

```typescript
import { useState, useCallback } from 'react';

export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(v => !v);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, { toggle, setTrue, setFalse }] as const;
}
```

**useAsync**:

**文件**: `src/hooks/useAsync.ts`

```typescript
import { useState, useCallback } from 'react';

interface AsyncState<T> {
  loading: boolean;
  data: T | null;
  error: Error | null;
}

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    loading: false,
    data: null,
    error: null,
  });

  const execute = useCallback(async (promise: Promise<T>) => {
    setState({ loading: true, data: null, error: null });

    try {
      const data = await promise;
      setState({ loading: false, data, error: null });
      return data;
    } catch (error) {
      setState({ loading: false, data: null, error: error as Error });
      throw error;
    }
  }, []);

  return { ...state, execute };
}
```

### 4.2 副作用 Hooks

**useDebounce**:

**文件**: `src/hooks/useDebounce.ts`

```typescript
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**useThrottle**:

**文件**: `src/hooks/useThrottle.ts`

```typescript
import { useEffect, useRef, useState } from 'react';

export function useThrottle<T>(value: T, delay: number = 500): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}
```

### 4.3 存储 Hooks

**useLocalStorage**:

**文件**: `src/hooks/useLocalStorage.ts`

```typescript
import { useState, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
```

### 4.4 其他实用 Hooks

**useCopyToClipboard**:

**文件**: `src/hooks/useCopyToClipboard.ts`

```typescript
import { useState, useCallback } from 'react';
import { copyToClipboard } from '@/utils/dom';

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    }
    return success;
  }, []);

  return [copiedText, copy] as const;
}
```

**usePrevious**:

```typescript
import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
```

**useUpdateEffect**:

```typescript
import { useEffect, useRef, DependencyList, EffectCallback } from 'react';

export function useUpdateEffect(effect: EffectCallback, deps?: DependencyList) {
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
    } else {
      return effect();
    }
  }, deps);
}
```

## 五、最佳实践

### 5.1 工具函数设计原则

1. **纯函数**: 相同输入返回相同输出
2. **单一职责**: 每个函数只做一件事
3. **可测试**: 易于编写单元测试
4. **错误处理**: 妥善处理异常情况
5. **类型安全**: 使用 TypeScript 类型

### 5.2 Hooks 使用规范

1. **命名**: 以 `use` 开头
2. **依赖数组**: 正确声明依赖
3. **避免过度优化**: 不要过早使用 useMemo/useCallback
4. **抽取复用逻辑**: 提取可复用的 Hooks
5. **遵循 Hooks 规则**: 只在顶层调用 Hooks

### 5.3 性能优化

```typescript
// ✅ 使用 useMemo 缓存计算结果
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);

// ✅ 使用 useCallback 缓存函数
const handleClick = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// ✅ 使用防抖/节流
const debouncedSearch = useDebounceFn(search, { wait: 500 });
const throttledScroll = useThrottleFn(handleScroll, { wait: 200 });
```

## 六、测试

### 6.1 工具函数测试

```typescript
import { describe, it, expect } from 'vitest';
import { formatFileSize, isEmail } from '@/utils/format';

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(1048576)).toBe('1.00 MB');
  });
});

describe('isEmail', () => {
  it('should validate email', () => {
    expect(isEmail('test@example.com')).toBe(true);
    expect(isEmail('invalid')).toBe(false);
  });
});
```

### 6.2 Hooks 测试

```typescript
import { renderHook, act } from '@testing-library/react';
import { useToggle } from '@/hooks/useToggle';

describe('useToggle', () => {
  it('should toggle value', () => {
    const { result } = renderHook(() => useToggle(false));

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1].toggle();
    });

    expect(result.current[0]).toBe(true);
  });
});
```

## 七、参考资源

### 7.1 官方文档

- [ahooks 文档](https://ahooks.js.org/)
- [lodash 文档](https://lodash.com/)
- [dayjs 文档](https://day.js.org/)
- [React Hooks](https://react.dev/reference/react)

### 7.2 源码参考

- **Coze Studio**: `@coze-arch/bot-hooks`
- **工具函数**: `@coze-arch/utils`

---

**文档维护者**: Coze Lite Team
**最后更新**: 2025-11-30
