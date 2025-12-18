import { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { InboxCard } from '@/components/dashboard/cards/InboxCard';
import { CalendarCard } from '@/components/dashboard/cards/CalendarCard';
import { WeatherCard } from '@/components/dashboard/cards/WeatherCard';
import { PersonalTasksCard } from '@/components/dashboard/cards/PersonalTasksCard';
import { RecentJobsCard } from '@/components/dashboard/cards/RecentJobsCard';
import { ActiveTasksCard } from '@/components/dashboard/cards/ActiveTasksCard';
import { NotificationsCard } from '@/components/dashboard/cards/NotificationsCard';
import { QuickCaptureModal } from '@/components/dashboard/QuickCaptureModal';

export type DashboardView = 'hub' | 'inbox' | 'tasks';
export type QuickCaptureType = 'note' | 'task' | 'photo' | 'audio' | 'document' | null;

export function DashboardPage() {
  const [activeView, setActiveView] = useState<DashboardView>('hub');
  const [quickCaptureType, setQuickCaptureType] = useState<QuickCaptureType>(null);

  const handleQuickCapture = (type: QuickCaptureType) => {
    setQuickCaptureType(type);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'inbox':
        // Full inbox view - will implement later
        return (
          <div className="h-full p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold text-slate-100 mb-6">Inbox</h1>
            <p className="text-slate-400">Full inbox view coming soon...</p>
          </div>
        );
      case 'tasks':
        // Full tasks view - will implement later
        return (
          <div className="h-full p-6 overflow-y-auto">
            <h1 className="text-2xl font-bold text-slate-100 mb-6">My Tasks</h1>
            <p className="text-slate-400">Full tasks view coming soon...</p>
          </div>
        );
      case 'hub':
      default:
        return (
          <div className="h-full p-6 overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-100">My Hub</h1>
              <p className="text-sm text-slate-400">Your productivity dashboard</p>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Row 1 */}
              <InboxCard onViewAll={() => setActiveView('inbox')} />
              <CalendarCard />
              <WeatherCard />

              {/* Row 2 */}
              <ActiveTasksCard />
              <PersonalTasksCard onViewAll={() => setActiveView('tasks')} />
              <RecentJobsCard />

              {/* Row 3 */}
              <NotificationsCard />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full bg-slate-900">
      <DashboardSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onQuickCapture={handleQuickCapture}
      />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>

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
