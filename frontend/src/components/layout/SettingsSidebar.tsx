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
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
    <aside className="w-64 h-full bg-card border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-xs text-muted-foreground">Configure your workspace</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* General Settings */}
        <div className="mb-4">
          <NavItem
            to="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="General"
          />
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Build Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Insights Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Insights
          </p>
          <NavItem
            to="/settings/analytics"
            icon={<BarChart3 className="h-4 w-4" />}
            label="Analytics"
          />
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Learn Section */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
