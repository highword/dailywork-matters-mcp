import { NavLink } from 'react-router';
import { LayoutList, Sparkles, BarChart3, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/summaries', label: 'Summaries', icon: LayoutList },
  { to: '/generate', label: 'Generate', icon: Sparkles },
  { to: '/charts', label: 'Charts', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] lg:w-[240px] w-12 flex flex-col border-r border-border bg-card/80 backdrop-blur-md z-50">
      <div className="p-6 lg:block hidden">
        <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.01em] font-sans">
          Dailywork Matters
        </h1>
      </div>
      <div className="p-2 lg:hidden flex items-center justify-center h-16">
        <span className="text-lg font-bold">DM</span>
      </div>
      <nav className="flex-1 flex flex-col gap-1 px-2 mt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors duration-100 ease-out',
                'hover:bg-muted',
                isActive
                  ? 'border-l-2 border-accent text-foreground bg-muted/50'
                  : 'border-l-2 border-transparent text-muted-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="lg:block hidden">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
