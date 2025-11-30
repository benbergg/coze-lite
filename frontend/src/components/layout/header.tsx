import { Button, Breadcrumb } from '@arco-design/web-react';
import { IconSave, IconSettings } from '@arco-design/web-react/icon';

interface HeaderProps {
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
}

export function Header({ breadcrumbs = [], actions }: HeaderProps) {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white">
      {/* 面包屑 */}
      <div className="flex items-center gap-2">
        {breadcrumbs.length > 0 ? (
          <Breadcrumb>
            {breadcrumbs.map((item, index) => (
              <Breadcrumb.Item key={index}>{item.label}</Breadcrumb.Item>
            ))}
          </Breadcrumb>
        ) : (
          <div className="text-sm text-gray-500">Coze Lite</div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {actions || (
          <>
            <Button icon={<IconSave />}>保存</Button>
            <Button icon={<IconSettings />} type="secondary" />
          </>
        )}
      </div>
    </div>
  );
}
