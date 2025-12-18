import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { ChatSidebar } from './ChatSidebar';
import { ProjectsSidebar } from './ProjectsSidebar';
import { SettingsSidebar } from './SettingsSidebar';

type ActiveSection = 'chat' | 'dashboard' | 'jobs' | 'settings';

function getActiveSection(pathname: string): ActiveSection {
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/jobs')) return 'jobs';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return 'chat';
}

export function AppLayout() {
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation */}
      <TopNav />

      {/* Main content area with conditional sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Contextual Sidebar */}
        {activeSection === 'chat' && <ChatSidebar />}
        {activeSection === 'jobs' && <ProjectsSidebar />}
        {activeSection === 'settings' && <SettingsSidebar />}

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
