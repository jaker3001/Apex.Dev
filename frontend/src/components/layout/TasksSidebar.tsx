import { useTaskLists } from '@/hooks/useTasks';
import {
  Sun,
  Star,
  Calendar,
  Inbox,
  List,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  isSelected: boolean;
  onClick: () => void;
  color?: string;
}

function SidebarItem({ icon: Icon, label, count, isSelected, onClick, color }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isSelected
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
      )}
    >
      <span style={color ? { color } : undefined}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}

export function TasksSidebar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: listsData } = useTaskLists();

  const lists = listsData?.lists || [];
  const viewParam = searchParams.get('view') || 'my_day';
  const listParam = searchParams.get('list');

  // Determine current selection
  const selectedView = listParam ? `list-${listParam}` : viewParam;

  const handleViewSelect = (view: string) => {
    navigate(`/tasks?view=${view}`);
  };

  const handleListSelect = (listId: number) => {
    navigate(`/tasks?list=${listId}`);
  };

  return (
    <aside className="w-64 h-full bg-background/50 border-r border-white/5 flex flex-col shrink-0">
      {/* Smart Lists */}
      <div className="p-3 space-y-1">
        <SidebarItem
          icon={Sun}
          label="My Day"
          isSelected={selectedView === 'my_day'}
          onClick={() => handleViewSelect('my_day')}
          color="#F59E0B"
        />
        <SidebarItem
          icon={Star}
          label="Important"
          isSelected={selectedView === 'important'}
          onClick={() => handleViewSelect('important')}
          color="#EAB308"
        />
        <SidebarItem
          icon={Calendar}
          label="Planned"
          isSelected={selectedView === 'planned'}
          onClick={() => handleViewSelect('planned')}
          color="#22C55E"
        />
        <SidebarItem
          icon={Inbox}
          label="All"
          isSelected={selectedView === 'all'}
          onClick={() => handleViewSelect('all')}
          color="#3B82F6"
        />
      </div>

      {/* Separator */}
      <div className="mx-3 border-t border-white/5" />

      {/* Custom Lists */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lists</span>
          <button className="p-1 hover:bg-white/5 rounded text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {lists.filter(list => !list.is_system).map(list => (
          <SidebarItem
            key={list.id}
            icon={List}
            label={list.name}
            count={list.task_count}
            isSelected={selectedView === `list-${list.id}`}
            onClick={() => handleListSelect(list.id)}
            color={list.color}
          />
        ))}
      </div>
    </aside>
  );
}
