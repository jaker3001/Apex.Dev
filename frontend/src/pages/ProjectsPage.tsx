import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  ChevronRight,
  Droplets,
  Flame,
  AlertTriangle,
  Building,
} from 'lucide-react';
import {
  useProjects,
  useProjectStats,
  groupProjectsByStatus,
  type Project,
} from '@/hooks/useProjects';
import { NewJobModal } from '@/components/projects/modals';

// Status display order and colors
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  active: { label: 'Active', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  pending: { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' },
  lead: { label: 'Lead', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  complete: { label: 'Complete', color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20' },
  closed: { label: 'Closed', color: 'text-slate-500', bgColor: 'bg-slate-600/10', borderColor: 'border-slate-600/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
};

const STATUS_ORDER = ['active', 'pending', 'lead', 'complete', 'closed', 'cancelled'];

// Damage source icons
function getDamageIcon(source?: string) {
  const s = source?.toLowerCase() || '';
  if (s.includes('water') || s.includes('sewage') || s.includes('flood')) {
    return <Droplets className="h-4 w-4 text-blue-400" />;
  }
  if (s.includes('fire') || s.includes('smoke')) {
    return <Flame className="h-4 w-4 text-orange-400" />;
  }
  if (s.includes('mold')) {
    return <AlertTriangle className="h-4 w-4 text-green-400" />;
  }
  return <Building className="h-4 w-4 text-slate-500" />;
}

// Format date for display
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

// Project card component
function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/jobs/${project.id}`}
      className="block glass-card rounded-xl p-4 hover:bg-white/5 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{project.job_number}</span>
            <span className="text-muted-foreground">-</span>
            <span className="text-sm truncate text-foreground/90">{project.client_name || 'No client'}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {project.address ? `${project.address}, ${project.city || ''}` : 'No address'}
          </p>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
              {getDamageIcon(project.damage_source)}
              <span className="capitalize">{project.damage_source || 'Unknown'}</span>
            </div>
            {project.insurance_carrier && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5">{project.insurance_carrier}</span>
            )}
            {project.start_date && <span>Started: {formatDate(project.start_date)}</span>}
          </div>
        </div>
        <div className="p-1 rounded-full bg-white/5 text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
            <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

// Status section component
function StatusSection({
  status,
  projects,
}: {
  status: string;
  projects: Project[];
}) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20' };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-2 w-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
        <h2 className={`text-xs font-bold uppercase tracking-widest text-muted-foreground`}>
          {config.label}
        </h2>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bgColor} ${config.color} border ${config.borderColor}`}
        >
          {projects.length}
        </span>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground/40 italic pl-4">No {config.label.toLowerCase()} jobs</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

// Stats card component
function StatCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className={cn("glass-card rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden group")}>
      <div className={cn("absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20", colorClass)} />
      <p className="text-3xl font-bold text-foreground mb-1 relative z-10">{value}</p>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider relative z-10">{label}</p>
    </div>
  );
}

export function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const { data: projectsData, isLoading, error } = useProjects();
  const { data: stats } = useProjectStats();

  // Group projects by status
  const groupedProjects = useMemo(() => {
    if (!projectsData?.projects) return {};
    return groupProjectsByStatus(projectsData.projects);
  }, [projectsData]);

  // Filter projects by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedProjects;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, Project[]> = {};

    Object.entries(groupedProjects).forEach(([status, projects]) => {
      filtered[status] = projects.filter(
        (p) =>
          p.job_number?.toLowerCase().includes(query) ||
          p.client_name?.toLowerCase().includes(query) ||
          p.address?.toLowerCase().includes(query) ||
          p.claim_number?.toLowerCase().includes(query)
      );
    });

    return filtered;
  }, [groupedProjects, searchQuery]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium mb-1">Error loading jobs</p>
          <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Jobs</h1>
            <p className="text-muted-foreground">Manage your restoration projects</p>
          </div>
          <Button 
            onClick={() => setShowNewJobModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 shadow-lg shadow-orange-900/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active"
            value={stats?.active || 0}
            colorClass="bg-green-500"
          />
          <StatCard
            label="Pending"
            value={stats?.by_status?.pending || 0}
            colorClass="bg-yellow-500"
          />
          <StatCard
            label="Leads"
            value={stats?.lead || 0}
            colorClass="bg-blue-500"
          />
          <StatCard
            label="Complete"
            value={stats?.complete || 0}
            colorClass="bg-slate-500"
          />
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all shadow-sm backdrop-blur-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Projects grouped by status */}
        <div className="space-y-2">
          {STATUS_ORDER.map((status) => (
            <StatusSection
              key={status}
              status={status}
              projects={filteredGroups[status] || []}
            />
          ))}
        </div>
      </div>

      {/* New Job Modal */}
      {showNewJobModal && (
        <NewJobModal onClose={() => setShowNewJobModal(false)} />
      )}
    </div>
  );
}
