import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from '@arco-design/web-react';
import { RootLayout, WorkspaceLayout } from '@/components/layout';
import { AuthGuard } from '@/components/route-guard';

// 懒加载页面组件
const LoginPage = lazy(() => import('@/pages/auth/login'));
const RegisterPage = lazy(() => import('@/pages/auth/register'));
const WorkspaceListPage = lazy(() => import('@/pages/workspace/list'));
const AgentListPage = lazy(() => import('@/pages/workspace/agent-list'));
const PluginMarketplacePage = lazy(() => import('@/pages/plugin/marketplace'));
const KnowledgePage = lazy(() => import('@/pages/knowledge'));
const AgentEditorPage = lazy(() => import('@/pages/agent/editor'));

function LoadingFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Spin size={40} />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          {/* 默认重定向 */}
          <Route index element={<Navigate to="/workspace" replace />} />

          {/* 认证路由（无需登录） */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          {/* 工作空间路由（需要登录） */}
          <Route
            path="workspace"
            element={
              <AuthGuard>
                <WorkspaceLayout />
              </AuthGuard>
            }
          >
            <Route index element={<WorkspaceListPage />} />
            <Route path=":workspaceId">
              <Route index element={<Navigate to="agents" replace />} />
              <Route path="agents" element={<AgentListPage />} />
              <Route path="plugins" element={<PluginMarketplacePage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route
                path="library"
                element={<div className="p-8">资源库（开发中）</div>}
              />
            </Route>
          </Route>

          {/* Agent 编辑器（全屏，需要登录） */}
          <Route
            path="agent/:id"
            element={
              <AuthGuard>
                <AgentEditorPage />
              </AuthGuard>
            }
          />

          {/* Workflow 编辑器（全屏，需要登录） */}
          <Route
            path="workflow/:workflowId"
            element={
              <AuthGuard>
                <div className="w-full h-full p-8">
                  Workflow 编辑器（开发中）
                </div>
              </AuthGuard>
            }
          />

          {/* 404 页面 */}
          <Route
            path="*"
            element={
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-300">404</h1>
                  <p className="text-gray-500 mt-4">页面不存在</p>
                </div>
              </div>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
