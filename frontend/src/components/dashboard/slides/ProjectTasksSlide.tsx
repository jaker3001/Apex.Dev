import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Sun, Check, ExternalLink, Clock } from 'lucide-react';
import { useTasks, useAddToMyDay, type Task } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

interface ProjectTasksSlideProps {
  onViewAll?: () => void;
}

export function ProjectTasksSlide({ onViewAll }: ProjectTasksSlideProps) {
  const navigate = useNavigate();

  // Fetch all open/in-progress tasks
  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    status: 'open',
  });

  // Fetch all active projects to get job numbers/names
  const { data: projectsData, isLoading: projectsLoading } = useProjects('active');

  const addToMyDay = useAddToMyDay();

  // Filter to only project-linked tasks and enrich with project info
  const projectTasks = useMemo(() => {
    if (!tasksData?.tasks || !projectsData?.projects) return [];

    const projectMap = new Map(
      projectsData.projects.map((p) => [p.id, p])
    );

    return tasksData.tasks
      .filter((task) => task.project_id && !task.is_my_day)
      .map((task) => ({
        ...task,
        project: projectMap.get(task.project_id!),
      }))
      .sort((a, b) => {
        // Sort by due date (earliest first), then by priority
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (a.due_date) return -1;
        if (b.due_date) return 1;

        const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 8); // Show top 8 tasks
  }, [tasksData, projectsData]);

  const isLoading = tasksLoading || projectsLoading;

  const handleTaskClick = (task: Task & { project?: any }) => {
    if (task.project_id) {
      navigate(`/jobs/${task.project_id}`);
    }
  };

  const handleAddToMyDay = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    try {
      await addToMyDay.mutateAsync(taskId);
    } catch (error) {
      console.error('Failed to add to My Day:', error);
    }
  };

  const getDueDateLabel = (dueDate: string | undefined) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return { label: 'Today', className: 'text-amber-400' };
    if (isTomorrow(date)) return { label: 'Tomorrow', className: 'text-blue-400' };
    if (isPast(date)) return { label: 'Overdue', className: 'text-red-400' };
    return { label: format(date, 'MMM d'), className: 'text-slate-400' };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Active Project Tasks</span>
          {projectTasks.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
              {projectTasks.length}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewAll(); }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            View All
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projectTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center mb-3">
              <Check className="w-7 h-7 text-cyan-400" />
            </div>
            <p className="text-slate-400 text-sm font-medium">All caught up!</p>
            <p className="text-slate-500 text-xs mt-1">No pending project tasks</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projectTasks.map((task) => {
              const dueInfo = getDueDateLabel(task.due_date);
              const project = task.project;

              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="group flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  {/* Priority indicator */}
                  <div className={cn('w-1.5 h-10 rounded-full', getPriorityColor(task.priority))} />

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {project && (
                        <span className="text-xs text-slate-400 truncate max-w-[150px]">
                          {project.job_number || `Job #${project.id}`}
                        </span>
                      )}
                      {dueInfo && (
                        <div className={cn('flex items-center gap-1 text-xs', dueInfo.className)}>
                          <Clock className="w-3 h-3" />
                          {dueInfo.label}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* My Day button */}
                  <button
                    onClick={(e) => handleAddToMyDay(e, task.id)}
                    disabled={addToMyDay.isPending}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                      'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20',
                      'opacity-0 group-hover:opacity-100',
                      addToMyDay.isPending && 'opacity-50 cursor-not-allowed'
                    )}
                    title="Add to My Day"
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">My Day</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {projectTasks.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-700/50 text-center">
          <p className="text-xs text-slate-500">
            Click a task to open the project • Hover for "My Day" button
          </p>
        </div>
      )}
    </div>
  );
}
