import { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardOverlay } from '@/components/dashboard/DashboardOverlay';
import { SlideShowCard, type SlideType } from '@/components/dashboard/SlideShowCard';
import { CalendarSlide } from '@/components/dashboard/slides/CalendarSlide';
import { WeatherSlide } from '@/components/dashboard/slides/WeatherSlide';
import { ProjectTasksSlide } from '@/components/dashboard/slides/ProjectTasksSlide';
import { NotesView } from '@/components/dashboard/views/NotesView';
import { CalendarView } from '@/components/dashboard/views/CalendarView';
import { WeatherView } from '@/components/dashboard/views/WeatherView';
import { InboxCard } from '@/components/dashboard/cards/InboxCard';
import { MyDayCard } from '@/components/dashboard/cards/MyDayCard';
import { TeamChatCard } from '@/components/dashboard/cards/TeamChatCard';
import { QuickCaptureModal } from '@/components/dashboard/QuickCaptureModal';

export type DashboardView = 'hub' | 'inbox' | 'tasks' | 'notes' | 'calendar' | 'weather';
export type QuickCaptureType = 'note' | 'task' | 'photo' | 'audio' | 'document' | null;

export function DashboardPage() {
  const [activeOverlay, setActiveOverlay] = useState<DashboardView | null>(null);
  const [quickCaptureType, setQuickCaptureType] = useState<QuickCaptureType>(null);
  const [activeSlide, setActiveSlide] = useState<SlideType>('calendar');

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

  const handleSlideClick = (slide: SlideType) => {
    // Calendar and Weather slides open overlays
    if (slide === 'calendar') {
      setActiveOverlay('calendar');
    } else if (slide === 'weather') {
      setActiveOverlay('weather');
    }
    // Project tasks slide doesn't open overlay - tasks link to projects directly
  };

  const getOverlayTitle = (view: DashboardView | null) => {
    switch (view) {
      case 'inbox':
        return 'Inbox';
      case 'tasks':
        return 'My Tasks';
      case 'notes':
        return 'Notes';
      case 'calendar':
        return 'Calendar';
      case 'weather':
        return 'Weather';
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
      case 'calendar':
        return <CalendarView />;
      case 'weather':
        return <WeatherView />;
      default:
        return null;
    }
  };

  // All slides must be rendered for animation to work
  // Order must match slideConfigs in SlideShowCard: calendar, weather, project-tasks
  const slides = [
    <CalendarSlide key="calendar" onExpand={() => setActiveOverlay('calendar')} />,
    <WeatherSlide key="weather" onExpand={() => setActiveOverlay('weather')} />,
    <ProjectTasksSlide key="project-tasks" onViewAll={() => setActiveOverlay('tasks')} />,
  ];

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

          {/* Slideshow Card - Full Width */}
          <div className="mb-6">
            <SlideShowCard
              activeSlide={activeSlide}
              onSlideChange={setActiveSlide}
              onSlideClick={handleSlideClick}
              autoRotate={true}
              autoRotateInterval={12000}
            >
              {slides}
            </SlideShowCard>
          </div>

          {/* Bottom Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MyDayCard onViewAll={() => setActiveOverlay('tasks')} />
            <InboxCard onViewAll={() => setActiveOverlay('inbox')} />
            <TeamChatCard />
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

      <DashboardOverlay
        isOpen={activeOverlay === 'calendar'}
        onClose={() => setActiveOverlay(null)}
        title={getOverlayTitle('calendar')}
      >
        {renderOverlayContent('calendar')}
      </DashboardOverlay>

      <DashboardOverlay
        isOpen={activeOverlay === 'weather'}
        onClose={() => setActiveOverlay(null)}
        title={getOverlayTitle('weather')}
      >
        {renderOverlayContent('weather')}
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
