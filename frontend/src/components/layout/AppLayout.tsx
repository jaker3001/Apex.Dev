import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { UnifiedSidebar } from './UnifiedSidebar';
import { QuickCaptureButton } from './QuickCaptureButton';

export function AppLayout() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20">
      {/* Permanent Unified Sidebar */}
      <UnifiedSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <TopNav />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <Outlet />
        </main>
        
        {/* Floating Action Button (Global) */}
        <QuickCaptureButton />
      </div>
    </div>
  );
}