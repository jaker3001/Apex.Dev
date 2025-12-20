import { Outlet } from 'react-router-dom';
import { SettingsSidebar } from '@/components/layout/SettingsSidebar';

export function SettingsLayout() {
  return (
    <div className="flex h-full overflow-hidden">
      <SettingsSidebar />
      <div className="flex-1 overflow-y-auto bg-background/50">
        <Outlet />
      </div>
    </div>
  );
}
