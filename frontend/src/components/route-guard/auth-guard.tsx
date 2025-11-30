import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/stores/user';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const token = useUserStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    // 未登录，重定向到登录页，并记录来源页面
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
