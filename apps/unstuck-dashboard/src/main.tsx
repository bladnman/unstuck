import React from 'react';
import ReactDOM from 'react-dom/client';

import '@toast-ui/editor/dist/toastui-editor.css';

import { App } from '@/App/App';
import '@/theme/theme.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
