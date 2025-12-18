import { Briefcase, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { useProjects, type Project } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  pending: 'bg-amber-500/20 text-amber-400',
  lead: 'bg-blue-500/20 text-blue-400',
  complete: 'bg-slate-500/20 text-slate-400',
  closed: 'bg-slate-600/20 text-slate-500',
  cancelled: 'bg-red-500/20 text-red-400',
};

export function RecentJobsCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useProjects('active');

  // Get the 5 most recent active jobs
  const jobs = data?.projects?.slice(0, 5) || [];

  const handleViewAll = () => {
    navigate('/jobs');
  };

  const handleJobClick = (job: Project) => {
    navigate(`/jobs/${job.id}`);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white">Active Jobs</h3>
          {jobs.length > 0 && (
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
              {data?.total || jobs.length}
            </span>
          )}
        </div>
        <button
          onClick={handleViewAll}
          className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No active jobs</p>
            <p className="text-slate-500 text-xs mt-1">Create a new job to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onClick={() => handleJobClick(job)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({ job, onClick }: { job: Project; onClick: () => void }) {
  const address = job.address
    ? `${job.address}${job.city ? `, ${job.city}` : ''}`
    : job.city || 'No address';

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{job.job_number}</p>
          <span className={cn('text-xs px-1.5 py-0.5 rounded', statusColors[job.status])}>
            {job.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-slate-400 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{address}</span>
          </div>
        </div>
        {job.client_name && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{job.client_name}</p>
        )}
      </div>
      {job.start_date && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          <span>{format(parseISO(job.start_date), 'MMM d')}</span>
        </div>
      )}
    </div>
  );
}
