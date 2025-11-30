import { Button } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';

export default function WorkspacePage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">工作空间</h1>
        <Button type="primary" icon={<IconPlus />}>
          新建工作空间
        </Button>
      </div>
      <div className="text-gray-500">
        <p>欢迎使用 Coze Lite!</p>
        <p className="mt-2">项目已成功初始化 ✨</p>
      </div>
    </div>
  );
}
