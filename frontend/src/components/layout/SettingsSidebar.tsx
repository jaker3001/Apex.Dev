import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Settings, Bot, Puzzle, Server, BarChart3, BookOpen } from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm'
            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export function SettingsSidebar() {
  return (
    <aside className="w-64 h-full bg-background/30 backdrop-blur-md border-r border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <h2 className="text-lg font-bold text-foreground tracking-tight">Configuration</h2>
        <p className="text-xs text-muted-foreground mt-1">Manage system settings</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* General Settings */}
        <div className="mb-6">
          <NavItem
            to="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="General"
          />
        </div>

        {/* Build Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
            Build
          </p>
          <div className="space-y-1">
            <NavItem
              to="/settings/agents"
              icon={<Bot className="h-4 w-4" />}
              label="Agents"
            />
            <NavItem
              to="/settings/skills"
              icon={<Puzzle className="h-4 w-4" />}
              label="Skills"
            />
            <NavItem
              to="/settings/mcp"
              icon={<Server className="h-4 w-4" />}
              label="MCP Servers"
            />
          </div>
        </div>

        {/* Insights Section */}
        <div className="mb-6">
          <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
            Insights
          </p>
          <NavItem
            to="/settings/analytics"
            icon={<BarChart3 className="h-4 w-4" />}
            label="Analytics"
          />
        </div>

        {/* Learn Section */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
            Resources
          </p>
          <NavItem
            to="/settings/learn"
            icon={<BookOpen className="h-4 w-4" />}
            label="Documentation"
          />
        </div>
      </nav>
    </aside>
  );
}
