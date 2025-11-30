import { useEffect, useState } from 'react';
import { Button, Card, Empty, Spin, Modal, Form, Input, Message } from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/workspace';
import type { CreateWorkspaceRequest } from '@/types/workspace';

const FormItem = Form.Item;

export default function WorkspaceListPage() {
  const navigate = useNavigate();
  const { workspaces, isLoading, fetchWorkspaces, createWorkspace } =
    useWorkspaceStore();

  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (values: CreateWorkspaceRequest) => {
    try {
      const workspace = await createWorkspace(values);
      Message.success('工作空间创建成功！');
      setModalVisible(false);
      form.resetFields();
      navigate(`/workspace/${workspace.id}/agents`);
    } catch (error) {
      Message.error('创建失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spin size={40} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">工作空间</h1>
          <p className="text-gray-500 mt-1">选择或创建一个工作空间来开始</p>
        </div>
        <Button
          type="primary"
          icon={<IconPlus />}
          onClick={() => setModalVisible(true)}
        >
          新建工作空间
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <Empty
          description="还没有工作空间，点击上方按钮创建一个吧"
          className="mt-20"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.id}
              hoverable
              className="cursor-pointer"
              onClick={() => navigate(`/workspace/${workspace.id}/agents`)}
            >
              <div className="mb-2">
                <h3 className="text-lg font-semibold">{workspace.name}</h3>
              </div>
              {workspace.description && (
                <p className="text-gray-500 text-sm line-clamp-2">
                  {workspace.description}
                </p>
              )}
              <div className="mt-4 text-xs text-gray-400">
                创建于 {new Date(workspace.createdAt).toLocaleDateString()}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="创建工作空间"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        autoFocus={false}
        focusLock={true}
      >
        <Form form={form} onSubmit={handleCreate}>
          <FormItem
            label="工作空间名称"
            field="name"
            rules={[{ required: true, message: '请输入工作空间名称' }]}
          >
            <Input placeholder="请输入工作空间名称" />
          </FormItem>
          <FormItem label="描述（可选）" field="description">
            <Input.TextArea
              placeholder="请输入描述"
              rows={3}
              maxLength={200}
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
}
