import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Plus, Search, Droplets, Flame, AlertTriangle, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjects, type Project } from '@/hooks/useProjects';

// Status filter options
const STATUS_FILTERS = [
  { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'complete', label: 'Complete', color: 'bg-gray-100 text-gray-600' },
];

// Damage source icons
function getDamageIcon(source?: string) {
  const s = source?.toLowerCase() || '';
  if (s.includes('water') || s.includes('sewage') || s.includes('flood')) {
    return <Droplets className="h-3 w-3 text-blue-500" />;
  }
  if (s.includes('fire') || s.includes('smoke')) {
    return <Flame className="h-3 w-3 text-orange-500" />;
  }
  if (s.includes('mold')) {
    return <AlertTriangle className="h-3 w-3 text-green-600" />;
  }
  return <Building className="h-3 w-3 text-gray-500" />;
}

interface ProjectItemProps {
  project: Project;
  isActive?: boolean;
}

function ProjectItem({ project, isActive }: ProjectItemProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className={cn(
        'block p-2 rounded-lg transition-colors',
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-accent'
      )}
    >
      <div className="flex items-center gap-2">
        {getDamageIcon(project.damage_source)}
        <span className="text-sm font-medium truncate">{project.job_number}</span>
      </div>
      <p className="text-xs text-muted-foreground truncate mt-0.5 pl-5">
        {project.client_name || 'No client'}
      </p>
    </Link>
  );
}

export function ProjectsSidebar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const currentProjectId = id ? parseInt(id) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useProjects();
  const projects = data?.projects ?? [];

  // Filter projects
  const filteredProjects = projects.filter((project: Project) => {
    // Status filter
    if (statusFilter !== 'all' && project.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        project.job_number?.toLowerCase().includes(query) ||
        project.client_name?.toLowerCase().includes(query) ||
        project.address?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  return (
    <aside className="w-64 h-full bg-card border-r flex flex-col">
      {/* Header with New Project button */}
      <div className="p-3 border-b">
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          onClick={() => navigate('/projects')}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Status Filters */}
      <div className="p-3 border-b">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Status
        </p>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                statusFilter === filter.value
                  ? filter.color
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 p-3 overflow-y-auto">
        <p className="px-1 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Projects ({filteredProjects.length})
        </p>
        <div className="space-y-1">
          {isLoading ? (
            <p className="px-2 text-xs text-muted-foreground">Loading...</p>
          ) : filteredProjects.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">No projects found</p>
          ) : (
            filteredProjects.slice(0, 20).map((project: Project) => (
              <ProjectItem
                key={project.id}
                project={project}
                isActive={currentProjectId === project.id}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
