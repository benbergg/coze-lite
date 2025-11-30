import { Button, Input, Form, Message } from '@arco-design/web-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/user';
import type { LoginRequest } from '@/types/user';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useUserStore((state) => state.login);
  const isLoading = useUserStore((state) => state.isLoading);

  const from = (location.state as any)?.from?.pathname || '/workspace';

  const handleSubmit = async (values: LoginRequest) => {
    try {
      await login(values);
      Message.success('登录成功！');
      navigate(from, { replace: true });
    } catch (error) {
      Message.error('登录失败，请重试');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-96 p-8 bg-white border rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Coze Lite</h1>
          <p className="text-gray-500">欢迎回来</p>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Item
            label="用户名"
            field="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" size="large" />
          </Form.Item>

          <Form.Item
            label="密码"
            field="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              long
              size="large"
              loading={isLoading}
            >
              登录
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <span className="text-gray-500 text-sm">还没有账户？</span>
            <Button
              type="text"
              onClick={() => navigate('/register')}
              className="text-blue-600"
            >
              立即注册
            </Button>
          </div>
        </Form>

        <div className="mt-6 p-3 bg-blue-50 rounded text-sm text-gray-600">
          <p className="font-medium mb-1">演示账户：</p>
          <p>用户名：任意</p>
          <p>密码：任意</p>
        </div>
      </div>
    </div>
  );
}
