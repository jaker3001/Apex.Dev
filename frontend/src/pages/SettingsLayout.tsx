import { Outlet } from 'react-router-dom';

export function SettingsLayout() {
  // Sidebar is now rendered by ContextualSidebar in AppLayout
  return (
    <div className="flex-1 overflow-y-auto bg-background/50">
      <Outlet />
    </div>
  );
}
