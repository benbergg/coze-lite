import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { Spin } from '@arco-design/web-react';

export function RootLayout() {
  return (
    <div className="w-full h-full">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <Spin size={40} />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </div>
  );
}
