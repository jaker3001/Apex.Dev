import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Simple page title based on path
  const getPageTitle = (path: string) => {
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/chat')) return 'Chat';
    if (path.startsWith('/jobs')) return 'Jobs';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Apex Assistant';
  };

  return (
    <header className="h-16 border-b border-white/5 bg-background/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      {/* Left: Page Title */}
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold text-foreground tracking-tight">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      {/* Right: Notifications & Settings */}
      <div className="flex items-center gap-3">
        <NotificationDropdown />
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 ml-2 shadow-lg" />
      </div>
    </header>
  );
}
