import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

// Status display order and colors
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-50' },
  pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  lead: { label: 'Lead', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  complete: { label: 'Complete', color: 'text-gray-700', bgColor: 'bg-gray-50' },
  closed: { label: 'Closed', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-50' },
};

const STATUS_ORDER = ['active', 'pending', 'lead', 'complete', 'closed', 'cancelled'];

// Damage source icons
function getDamageIcon(source?: string) {
  const s = source?.toLowerCase() || '';
  if (s.includes('water') || s.includes('sewage') || s.includes('flood')) {
    return <Droplets className="h-4 w-4 text-blue-500" />;
  }
  if (s.includes('fire') || s.includes('smoke')) {
    return <Flame className="h-4 w-4 text-orange-500" />;
  }
  if (s.includes('mold')) {
    return <AlertTriangle className="h-4 w-4 text-green-600" />;
  }
  return <Building className="h-4 w-4 text-gray-500" />;
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
      to={`/projects/${project.id}`}
      className="block border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{project.job_number}</span>
            <span className="text-muted-foreground">-</span>
            <span className="text-sm truncate">{project.client_name || 'No client'}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {project.address ? `${project.address}, ${project.city || ''}` : 'No address'}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {getDamageIcon(project.damage_source)}
              <span>{project.damage_source || 'Unknown'}</span>
            </div>
            {project.insurance_carrier && (
              <span className="px-2 py-0.5 bg-muted rounded">{project.insurance_carrier}</span>
            )}
            {project.start_date && <span>Started: {formatDate(project.start_date)}</span>}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
  const config = STATUS_CONFIG[status] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-50' };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${config.color}`}>
          {config.label}
        </h2>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
        >
          {projects.length}
        </span>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No {config.label.toLowerCase()} projects</p>
      ) : (
        <div className="space-y-2">
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
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
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
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-destructive">Error loading projects: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground">Manage your restoration jobs</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Active"
            value={stats?.active || 0}
            color="bg-gradient-to-br from-green-50 to-transparent"
          />
          <StatCard
            label="Pending"
            value={stats?.by_status?.pending || 0}
            color="bg-gradient-to-br from-yellow-50 to-transparent"
          />
          <StatCard
            label="Leads"
            value={stats?.lead || 0}
            color="bg-gradient-to-br from-blue-50 to-transparent"
          />
          <StatCard
            label="Complete"
            value={stats?.complete || 0}
            color="bg-gradient-to-br from-gray-50 to-transparent"
          />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects by job number, client, address, or claim..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Projects grouped by status */}
        {STATUS_ORDER.map((status) => (
          <StatusSection
            key={status}
            status={status}
            projects={filteredGroups[status] || []}
          />
        ))}
      </div>
    </div>
  );
}
