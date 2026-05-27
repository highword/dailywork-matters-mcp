import { createBrowserRouter, RouterProvider } from 'react-router';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppShell } from './components/layout/app-shell';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, lazy: () => import('./pages/summaries') },
      { path: 'summaries/:date?', lazy: () => import('./pages/summaries') },
      { path: 'generate', lazy: () => import('./pages/generate') },
      { path: 'charts', lazy: () => import('./pages/charts') },
      { path: 'settings', lazy: () => import('./pages/settings') },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
    <Toaster position="bottom-right" />
  </QueryClientProvider>,
);
