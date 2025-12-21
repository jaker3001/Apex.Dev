import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  Calendar,
  CheckSquare,
  Briefcase,
  Users,
  FileText,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  collapsed: boolean;
}

function SidebarItem({ icon: Icon, label, to, collapsed }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
          collapsed && "justify-center px-2"
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
    </NavLink>
  );
}

export function UnifiedSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data } = useProjects();
  const projects = data?.projects?.slice(0, 5) ?? []; // Show top 5 projects

  return (
    <aside
      className={cn(
        "h-full bg-background/80 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300 relative z-20",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header / Logo Area */}
      <div className={cn("p-4 flex items-center h-16", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
            Apex Assistant
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-2 space-y-6 px-2">
        {/* Apps Section */}
        <div className="space-y-1">
          {!collapsed && (
            <h3 className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">
              Apps
            </h3>
          )}
          <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" collapsed={collapsed} />
          <SidebarItem icon={Bot} label="Assistant" to="/chat" collapsed={collapsed} />
          <SidebarItem icon={Calendar} label="Calendar" to="/calendar" collapsed={collapsed} />
          <SidebarItem icon={CheckSquare} label="Tasks" to="/tasks" collapsed={collapsed} />
        </div>

        {/* Projects Section - PARA */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Active Projects
              </h3>
              <NavLink to="/jobs" className="text-xs text-primary hover:text-primary/80">View All</NavLink>
            </div>
          )}
          
          {/* Project List */}
          {projects.map((project: any) => (
             <NavLink
             key={project.id}
             to={`/jobs/${project.id}`}
             className={({ isActive }) =>
               cn(
                 "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                 isActive
                   ? "bg-primary/10 text-primary"
                   : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                 collapsed && "justify-center px-2"
               )
             }
             title={collapsed ? project.job_number : undefined}
           >
             <Briefcase className="h-4 w-4 shrink-0" />
             {!collapsed && (
               <div className="flex flex-col overflow-hidden">
                 <span className="text-sm font-medium truncate">{project.job_number}</span>
                 <span className="text-[10px] text-muted-foreground truncate">{project.client_name}</span>
               </div>
             )}
           </NavLink>
          ))}
          
          {projects.length === 0 && !collapsed && (
             <div className="px-3 py-2 text-sm text-muted-foreground/50 italic">No active projects</div>
          )}
        </div>

        {/* Resources Section */}
        <div className="space-y-1">
          {!collapsed && (
            <h3 className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">
              Resources
            </h3>
          )}
          <SidebarItem icon={Inbox} label="Inbox" to="/inbox" collapsed={collapsed} />
          <SidebarItem icon={Users} label="People" to="/people" collapsed={collapsed} />
          <SidebarItem icon={FileText} label="Docs" to="/docs" collapsed={collapsed} />
          <SidebarItem icon={Settings} label="Settings" to="/settings" collapsed={collapsed} />
        </div>
      </div>

      {/* Footer / User Profile (Optional) */}
      <div className="p-4 border-t border-white/5">
          {/* Could go here */}
      </div>
    </aside>
  );
}
