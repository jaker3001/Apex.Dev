import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MessageSquare, LayoutDashboard, Briefcase, Settings } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

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
            ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
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
    <header className="h-14 border-b border-slate-700 bg-slate-800 flex items-center justify-between px-4 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold text-white">Apex Assistant</h1>
      </div>

      {/* Center: Main Navigation */}
      <nav className="flex items-center gap-2">
        <TopNavItem
          to="/"
          icon={<LayoutDashboard className="h-4 w-4" />}
          label="Dashboard"
        />
        <TopNavItem
          to="/chat"
          icon={<MessageSquare className="h-4 w-4" />}
          label="Chat"
        />
        <TopNavItem
          to="/jobs"
          icon={<Briefcase className="h-4 w-4" />}
          label="Jobs"
        />
      </nav>

      {/* Right: Notifications & Settings */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
            'text-slate-400 hover:bg-slate-700 hover:text-white'
          )}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
