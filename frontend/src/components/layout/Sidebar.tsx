import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Bot,
  Puzzle,
  Server,
  BarChart3,
  BookOpen,
  Settings,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
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

export function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-card border-r flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-foreground">Apex Assistant</h1>
        <p className="text-xs text-muted-foreground">AI for Apex Restoration</p>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button className="w-full justify-start gap-2" variant="outline">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Chat Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chat
          </p>
          <NavItem to="/" icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Build Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Build
          </p>
          <div className="space-y-1">
            <NavItem to="/agents" icon={<Bot className="h-4 w-4" />} label="Agents" />
            <NavItem to="/skills" icon={<Puzzle className="h-4 w-4" />} label="Skills" />
            <NavItem to="/mcp" icon={<Server className="h-4 w-4" />} label="MCP Servers" />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Insights Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Insights
          </p>
          <NavItem to="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Learn Section */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Learn
          </p>
          <NavItem to="/learn" icon={<BookOpen className="h-4 w-4" />} label="Documentation" />
        </div>
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t">
        <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
      </div>
    </aside>
  );
}
