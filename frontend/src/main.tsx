import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import './styles/index.css';
import '@arco-design/web-react/dist/css/arco.css';

// 初始化 Mock API（仅在开发环境且启用时）
import { setupMockAdapter } from './services/mock/adapter';
setupMockAdapter();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
