import { Outlet } from 'react-router';
import { Sidebar } from './sidebar';

export function AppShell() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto ml-12 lg:ml-[240px]">
        <Outlet />
      </main>
    </div>
  );
}
