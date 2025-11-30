import { Menu, Avatar, Dropdown } from '@arco-design/web-react';
import { IconHome, IconRobot, IconApps, IconUser, IconSettings, IconPoweroff } from '@arco-design/web-react/icon';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/user';

interface SidebarProps {
  workspaceId?: string;
}

export function Sidebar({ workspaceId }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const menuItems = [
    {
      key: 'home',
      icon: <IconHome />,
      label: '首页',
      path: '/workspace',
    },
    ...(workspaceId
      ? [
          {
            key: 'agents',
            icon: <IconRobot />,
            label: 'Agents',
            path: `/workspace/${workspaceId}/agents`,
          },
          {
            key: 'library',
            icon: <IconApps />,
            label: '资源库',
            path: `/workspace/${workspaceId}/library`,
          },
        ]
      : []),
  ];

  const selectedKeys = menuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .map((item) => item.key);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userDropdownList = (
    <Menu>
      <Menu.Item key="profile">
        <IconUser className="mr-2" />
        个人资料
      </Menu.Item>
      <Menu.Item key="settings">
        <IconSettings className="mr-2" />
        设置
      </Menu.Item>
      <Menu.Item key="logout" onClick={handleLogout}>
        <IconPoweroff className="mr-2" />
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">Coze Lite</h1>
      </div>

      {/* 导航菜单 */}
      <div className="flex-1 overflow-y-auto">
        <Menu
          selectedKeys={selectedKeys}
          onClickMenuItem={(key) => {
            const item = menuItems.find((i) => i.key === key);
            if (item) navigate(item.path);
          }}
        >
          {menuItems.map((item) => (
            <Menu.Item key={item.key}>
              {item.icon}
              {item.label}
            </Menu.Item>
          ))}
        </Menu>
      </div>

      {/* 用户信息 */}
      <div className="p-4 border-t border-gray-200">
        <Dropdown droplist={userDropdownList} position="top">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <Avatar size={32}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user?.username || '未登录'}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user?.email || ''}
              </div>
            </div>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}
