import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from './shared/lib/query/client';
import { router } from './app/router/router';
import './styles/globals.css';
import './features/finance/view/finance.css';
import './features/services/view/services.css';
import './features/management/view/management.css';
import './features/access/view/access.css';
import './features/branding/view/branding.css';
import './features/appearance/view/appearance.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento raiz não encontrado.');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
