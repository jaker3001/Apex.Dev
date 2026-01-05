import { useLocation } from 'react-router-dom';
import { SettingsSidebar } from './SettingsSidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { AssistantSidebar } from './AssistantSidebar';
import { JobsSidebar } from './JobsSidebar';
import { TasksSidebar } from './TasksSidebar';
import { CalendarSidebar } from './CalendarSidebar';

export function ContextualSidebar() {
  const location = useLocation();
  const path = location.pathname;

  // Route-based sidebar rendering
  if (path === '/') return <DashboardSidebar />;
  if (path.startsWith('/chat')) return <AssistantSidebar />;
  if (path.startsWith('/jobs')) return <JobsSidebar />;
  if (path.startsWith('/tasks')) return <TasksSidebar />;
  if (path.startsWith('/calendar')) return <CalendarSidebar />;
  if (path.startsWith('/settings')) return <SettingsSidebar />;

  // No sidebar for /inbox, /people, /docs (simple pages)
  return null;
}
