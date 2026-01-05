import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { ContextualSidebar } from './ContextualSidebar';
import { QuickCaptureButton } from './QuickCaptureButton';

export function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">
      {/* Top Navigation - Primary nav */}
      <TopNav />

      {/* Content Area: Sidebar + Main */}
      <div className="flex flex-1 min-h-0">
        {/* Context-Specific Sidebar */}
        <ContextualSidebar />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button (Global) */}
      <QuickCaptureButton />
    </div>
  );
}