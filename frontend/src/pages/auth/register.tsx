import { Button, Input, Form, Message } from '@arco-design/web-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/user';
import type { RegisterRequest } from '@/types/user';

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useUserStore((state) => state.register);
  const isLoading = useUserStore((state) => state.isLoading);

  const handleSubmit = async (values: RegisterRequest & { confirmPassword: string }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registerData } = values;
      await register(registerData);
      Message.success('注册成功！');
      navigate('/workspace', { replace: true });
    } catch (error) {
      Message.error('注册失败，请重试');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-96 p-8 bg-white border rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Coze Lite</h1>
          <p className="text-gray-500">创建新账户</p>
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
            label="邮箱"
            field="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" size="large" />
          </Form.Item>

          <Form.Item
            label="密码"
            field="password"
            rules={[
              { required: true, message: '请输入密码' },
              { minLength: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>

          <Form.Item
            label="确认密码"
            field="confirmPassword"
            rules={[
              { required: true, message: '请确认密码' },
              {
                validator: (value, callback) => {
                  const form = (callback as any)?.form;
                  if (value !== form?.getFieldValue('password')) {
                    callback('两次密码输入不一致');
                  } else {
                    callback();
                  }
                },
              },
            ]}
          >
            <Input.Password placeholder="请再次输入密码" size="large" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              long
              size="large"
              loading={isLoading}
            >
              注册
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <span className="text-gray-500 text-sm">已有账户？</span>
            <Button
              type="text"
              onClick={() => navigate('/login')}
              className="text-blue-600"
            >
              立即登录
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
