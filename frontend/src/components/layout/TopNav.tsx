import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Calendar,
  CheckSquare,
  Briefcase,
  Inbox,
  Users,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from './NotificationDropdown';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
}

function NavItem({ icon: Icon, label, to }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}

const navItems: NavItemProps[] = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: Bot, label: 'Assistant', to: '/chat' },
  { icon: Calendar, label: 'Calendar', to: '/calendar' },
  { icon: CheckSquare, label: 'Tasks', to: '/tasks' },
  { icon: Briefcase, label: 'Jobs', to: '/jobs' },
  { icon: Inbox, label: 'Inbox', to: '/inbox' },
  { icon: Users, label: 'People', to: '/people' },
  { icon: FileText, label: 'Docs', to: '/docs' },
];

export function TopNav() {
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-white/5 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 z-30 sticky top-0">
      {/* Left: Logo + Primary Navigation */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
            Apex
          </span>
        </NavLink>

        {/* Primary Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </div>

      {/* Right: Notifications & Settings & User */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            "p-2 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          )}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 ml-2 shadow-lg cursor-pointer" />
      </div>
    </header>
  );
}
