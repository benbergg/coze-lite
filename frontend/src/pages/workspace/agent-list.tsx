import { Button, Card, Empty } from '@arco-design/web-react';
import { IconPlus, IconRobot } from '@arco-design/web-react/icon';
import { useNavigate } from 'react-router-dom';

export default function AgentListPage() {
  const navigate = useNavigate();

  // TODO: 实际从 API 获取数据
  const agents: any[] = [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-gray-500 mt-1">创建和管理您的 AI Agents</p>
        </div>
        <Button
          type="primary"
          icon={<IconPlus />}
          onClick={() => {
            // TODO: 创建 Agent
            console.log('创建 Agent');
          }}
        >
          新建 Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="mt-20">
          <Empty
            icon={<IconRobot style={{ fontSize: 64, color: '#999' }} />}
            description={
              <div>
                <p>还没有 Agent</p>
                <Button
                  type="primary"
                  className="mt-4"
                  onClick={() => console.log('创建 Agent')}
                >
                  创建第一个 Agent
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              hoverable
              className="cursor-pointer"
              onClick={() => navigate(`/agent/${agent.id}`)}
            >
              <div className="mb-2">
                <h3 className="text-lg font-semibold">{agent.name}</h3>
              </div>
              {agent.description && (
                <p className="text-gray-500 text-sm line-clamp-2">
                  {agent.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
