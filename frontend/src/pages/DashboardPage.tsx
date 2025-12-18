import { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardOverlay } from '@/components/dashboard/DashboardOverlay';
import { NotesView } from '@/components/dashboard/views/NotesView';
import { InboxCard } from '@/components/dashboard/cards/InboxCard';
import { CalendarCard } from '@/components/dashboard/cards/CalendarCard';
import { WeatherCard } from '@/components/dashboard/cards/WeatherCard';
import { PersonalTasksCard } from '@/components/dashboard/cards/PersonalTasksCard';
import { RecentJobsCard } from '@/components/dashboard/cards/RecentJobsCard';
import { ActiveTasksCard } from '@/components/dashboard/cards/ActiveTasksCard';
import { NotificationsCard } from '@/components/dashboard/cards/NotificationsCard';
import { QuickCaptureModal } from '@/components/dashboard/QuickCaptureModal';

export type DashboardView = 'hub' | 'inbox' | 'tasks' | 'notes';
export type QuickCaptureType = 'note' | 'task' | 'photo' | 'audio' | 'document' | null;

export function DashboardPage() {
  const [activeOverlay, setActiveOverlay] = useState<DashboardView | null>(null);
  const [quickCaptureType, setQuickCaptureType] = useState<QuickCaptureType>(null);

  const handleQuickCapture = (type: QuickCaptureType) => {
    setQuickCaptureType(type);
  };

  const handleViewChange = (view: DashboardView) => {
    if (view === 'hub') {
      setActiveOverlay(null);
    } else {
      setActiveOverlay(view);
    }
  };

  const getOverlayTitle = (view: DashboardView | null) => {
    switch (view) {
      case 'inbox':
        return 'Inbox';
      case 'tasks':
        return 'My Tasks';
      case 'notes':
        return 'Notes';
      default:
        return '';
    }
  };

  const renderOverlayContent = (view: DashboardView | null) => {
    switch (view) {
      case 'inbox':
        return (
          <div className="h-full p-6 overflow-y-auto">
            <p className="text-slate-400">Full inbox view coming soon...</p>
          </div>
        );
      case 'tasks':
        return (
          <div className="h-full p-6 overflow-y-auto">
            <p className="text-slate-400">Full tasks view coming soon...</p>
          </div>
        );
      case 'notes':
        return <NotesView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-slate-900">
      <DashboardSidebar
        activeView={activeOverlay || 'hub'}
        onViewChange={handleViewChange}
        onQuickCapture={handleQuickCapture}
      />

      {/* Hub is always visible */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-100">My Hub</h1>
            <p className="text-sm text-slate-400">Your productivity dashboard</p>
          </div>

          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Row 1 */}
            <InboxCard onViewAll={() => setActiveOverlay('inbox')} />
            <CalendarCard />
            <WeatherCard />

            {/* Row 2 */}
            <ActiveTasksCard />
            <PersonalTasksCard onViewAll={() => setActiveOverlay('tasks')} />
            <RecentJobsCard />

            {/* Row 3 */}
            <NotificationsCard />
          </div>
        </div>
      </main>

      {/* View Overlays */}
      <DashboardOverlay
        isOpen={activeOverlay === 'inbox'}
        onClose={() => setActiveOverlay(null)}
        title={getOverlayTitle('inbox')}
      >
        {renderOverlayContent('inbox')}
      </DashboardOverlay>

      <DashboardOverlay
        isOpen={activeOverlay === 'tasks'}
        onClose={() => setActiveOverlay(null)}
        title={getOverlayTitle('tasks')}
      >
        {renderOverlayContent('tasks')}
      </DashboardOverlay>

      <DashboardOverlay
        isOpen={activeOverlay === 'notes'}
        onClose={() => setActiveOverlay(null)}
        title={getOverlayTitle('notes')}
      >
        {renderOverlayContent('notes')}
      </DashboardOverlay>

      {/* Quick Capture Modal */}
      {quickCaptureType && (
        <QuickCaptureModal
          type={quickCaptureType}
          onClose={() => setQuickCaptureType(null)}
        />
      )}
    </div>
  );
}
