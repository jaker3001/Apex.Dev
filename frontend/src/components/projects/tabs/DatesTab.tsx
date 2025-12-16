import { Calendar } from 'lucide-react';
import type { ProjectFull } from '@/hooks/useProjects';

interface DatesTabProps {
  project: ProjectFull;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface DateFieldProps {
  label: string;
  value?: string;
  highlight?: boolean;
}

function DateField({ label, value, highlight }: DateFieldProps) {
  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`font-medium ${value ? '' : 'text-muted-foreground'}`}>
        {formatDate(value)}
      </p>
    </div>
  );
}

export function DatesTab({ project }: DatesTabProps) {
  const dates = [
    { label: 'Date of Loss', value: project.date_of_loss, highlight: true },
    { label: 'Contacted', value: project.date_contacted },
    { label: 'Inspection', value: project.inspection_date },
    { label: 'Work Auth Signed', value: project.work_auth_signed_date },
    { label: 'Job Started', value: project.start_date, highlight: true },
    { label: 'COS Signed', value: project.cos_date },
    { label: 'Completion', value: project.completion_date, highlight: true },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">Project Timeline</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {dates.map((date) => (
          <DateField
            key={date.label}
            label={date.label}
            value={date.value}
            highlight={date.highlight}
          />
        ))}
      </div>
    </div>
  );
}
