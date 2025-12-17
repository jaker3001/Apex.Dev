import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MessageSquare, Briefcase, Settings } from 'lucide-react';

interface TopNavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function TopNavItem({ to, icon, label }: TopNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
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

export function TopNav() {
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-foreground">Apex Assistant</h1>
      </div>

      {/* Center: Main Navigation */}
      <nav className="flex items-center gap-2">
        <TopNavItem
          to="/"
          icon={<MessageSquare className="h-4 w-4" />}
          label="Chat"
        />
        <TopNavItem
          to="/projects"
          icon={<Briefcase className="h-4 w-4" />}
          label="Projects"
        />
      </nav>

      {/* Right: Settings */}
      <button
        onClick={() => navigate('/settings')}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>
    </header>
  );
}
