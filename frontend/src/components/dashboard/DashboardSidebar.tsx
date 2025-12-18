import {
  LayoutGrid,
  Inbox,
  ListTodo,
  FileText,
  CheckSquare,
  Image,
  Mic,
  File,
  Clock,
  Play,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardView, QuickCaptureType } from '@/pages/DashboardPage';
import { useClockStatus, useClockIn, useClockOut, formatDuration } from '@/hooks/useHub';
import { useInbox } from '@/hooks/useHub';

interface DashboardSidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onQuickCapture: (type: QuickCaptureType) => void;
}

export function DashboardSidebar({
  activeView,
  onViewChange,
  onQuickCapture,
}: DashboardSidebarProps) {
  const { data: clockStatus } = useClockStatus();
  const { data: inboxData } = useInbox({ processed: false });
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const isClockedIn = clockStatus?.is_clocked_in || false;
  const todayMinutes = clockStatus?.today_total_minutes || 0;
  const unprocessedCount = inboxData?.unprocessed_count || 0;

  const handleClockToggle = async () => {
    try {
      if (isClockedIn) {
        await clockOut.mutateAsync({});
      } else {
        await clockIn.mutateAsync({});
      }
    } catch (error) {
      console.error('Clock toggle failed:', error);
    }
  };

  const isClockLoading = clockIn.isPending || clockOut.isPending;

  return (
    <aside className="w-56 border-r border-slate-700 bg-slate-800/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-white">My Hub</h2>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2">
          Quick Capture
        </p>
        <div className="space-y-1">
          <QuickActionButton
            icon={FileText}
            label="Note"
            onClick={() => onQuickCapture('note')}
          />
          <QuickActionButton
            icon={CheckSquare}
            label="Task"
            onClick={() => onQuickCapture('task')}
          />
          <QuickActionButton
            icon={Image}
            label="Photo"
            onClick={() => onQuickCapture('photo')}
          />
          <QuickActionButton
            icon={Mic}
            label="Audio"
            onClick={() => onQuickCapture('audio')}
          />
          <QuickActionButton
            icon={File}
            label="Document"
            onClick={() => onQuickCapture('document')}
          />
        </div>
      </div>

      {/* Clock In/Out */}
      <div className="p-3 border-b border-slate-700">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2">
          Time Tracking
        </p>
        <button
          onClick={handleClockToggle}
          disabled={isClockLoading}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            isClockedIn
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-green-500/20 text-green-400 hover:bg-green-500/30',
            isClockLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isClockedIn ? (
            <>
              <Square className="w-4 h-4" />
              <span>Clock Out</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Clock In</span>
            </>
          )}
        </button>
        {todayMinutes > 0 && (
          <div className="flex items-center gap-2 mt-2 px-3 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            <span>Today: {formatDuration(todayMinutes)}</span>
          </div>
        )}
      </div>

      {/* Views Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2">
          Views
        </p>
        <div className="space-y-1">
          <ViewButton
            icon={LayoutGrid}
            label="My Hub"
            isActive={activeView === 'hub'}
            onClick={() => onViewChange('hub')}
          />
          <ViewButton
            icon={Inbox}
            label="Inbox"
            count={unprocessedCount}
            isActive={activeView === 'inbox'}
            onClick={() => onViewChange('inbox')}
          />
          <ViewButton
            icon={ListTodo}
            label="My Tasks"
            isActive={activeView === 'tasks'}
            onClick={() => onViewChange('tasks')}
          />
        </div>
      </nav>
    </aside>
  );
}

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
    >
      <Icon className="w-4 h-4 text-slate-500" />
      <span>{label}</span>
    </button>
  );
}

interface ViewButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

function ViewButton({ icon: Icon, label, count, isActive, onClick }: ViewButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      )}
    >
      <Icon className={cn('w-4 h-4', isActive ? 'text-blue-400' : 'text-slate-500')} />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded-full',
            isActive ? 'bg-blue-600/30' : 'bg-slate-600/50'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
