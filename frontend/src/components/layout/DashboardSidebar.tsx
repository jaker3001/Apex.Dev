import { Link } from 'react-router-dom';
import {
  Sun,
  Calendar,
  Clock,
  Activity,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
  badge?: number;
}

function QuickAction({ icon: Icon, label, to, badge }: QuickActionProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
    >
      <Icon className="w-4 h-4" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </Link>
  );
}

export function DashboardSidebar() {
  // TODO: Fetch actual data
  const myDayCount = 3;
  const upcomingCount = 5;

  return (
    <aside className="w-64 h-full bg-background/50 border-r border-white/5 flex flex-col shrink-0">
      {/* Quick Capture */}
      <div className="p-3 border-b border-white/5">
        <Button
          className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Quick Capture
        </Button>
      </div>

      {/* Today Section */}
      <div className="p-3">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Today
        </p>
        <div className="space-y-1">
          <QuickAction
            icon={Sun}
            label="My Day Tasks"
            to="/tasks?view=my_day"
            badge={myDayCount}
          />
          <QuickAction
            icon={Calendar}
            label="Today's Events"
            to="/calendar"
          />
          <QuickAction
            icon={Clock}
            label="Time Tracking"
            to="/time"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-3" />

      {/* Upcoming Section */}
      <div className="p-3">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Upcoming
        </p>
        <div className="space-y-1">
          <QuickAction
            icon={Calendar}
            label="This Week"
            to="/tasks?view=planned"
            badge={upcomingCount}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5 mx-3" />

      {/* Activity Section */}
      <div className="flex-1 p-3">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </p>
        <div className="space-y-2">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            <Activity className="w-4 h-4 inline mr-2 opacity-50" />
            No recent activity
          </div>
        </div>
      </div>
    </aside>
  );
}
