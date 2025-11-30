import { Outlet, useParams } from 'react-router-dom';
import { Layout } from '@arco-design/web-react';
import { Sidebar } from './sidebar';
import { Header } from './header';

const { Sider, Content } = Layout;

export function WorkspaceLayout() {
  const { workspaceId } = useParams();

  return (
    <Layout className="h-full">
      <Sider
        width={240}
        className="h-full border-r border-gray-200"
        style={{ backgroundColor: '#fff' }}
      >
        <Sidebar workspaceId={workspaceId} />
      </Sider>

      <Layout className="flex-1">
        <Header />
        <Content className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
