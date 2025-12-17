import { useState } from 'react';
import { Calendar, Pencil } from 'lucide-react';
import type { ProjectFull } from '@/hooks/useProjects';
import { useUpdateProject } from '@/hooks/useProjects';
import { DateTimePickerPopup } from '@/components/ui/DateTimePickerPopup';

interface DatesTabProps {
  project: ProjectFull;
}

// Map display labels to database field names
type DateFieldKey =
  | 'date_of_loss'
  | 'date_contacted'
  | 'inspection_date'
  | 'work_auth_signed_date'
  | 'start_date'
  | 'cos_date'
  | 'completion_date';

interface DateConfig {
  label: string;
  field: DateFieldKey;
  highlight?: boolean;
}

const DATE_FIELDS: DateConfig[] = [
  { label: 'Date of Loss', field: 'date_of_loss', highlight: true },
  { label: 'Contacted', field: 'date_contacted' },
  { label: 'Inspection', field: 'inspection_date' },
  { label: 'Work Auth Signed', field: 'work_auth_signed_date' },
  { label: 'Job Started', field: 'start_date', highlight: true },
  { label: 'COS Signed', field: 'cos_date' },
  { label: 'Completion', field: 'completion_date', highlight: true },
];

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const dateFormatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateFormatted} at ${timeFormatted}`;
}

interface DateFieldProps {
  label: string;
  value?: string;
  highlight?: boolean;
  onClick: () => void;
  isUpdating?: boolean;
}

function DateField({ label, value, highlight, onClick, isUpdating }: DateFieldProps) {
  return (
    <button
      onClick={onClick}
      disabled={isUpdating}
      className={`
        w-full text-left p-3 rounded-lg border transition-colors
        ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-transparent'}
        hover:border-primary/40 hover:bg-primary/10
        disabled:opacity-50 disabled:cursor-not-allowed
        group relative
      `}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className={`font-medium text-sm ${value ? '' : 'text-muted-foreground'}`}>
        {formatDateTime(value)}
      </p>
    </button>
  );
}

export function DatesTab({ project }: DatesTabProps) {
  const [editingField, setEditingField] = useState<DateConfig | null>(null);
  const updateProject = useUpdateProject();

  const handleSaveDate = (newValue: string) => {
    if (!editingField) return;

    updateProject.mutate(
      {
        id: project.id,
        data: { [editingField.field]: newValue },
      },
      {
        onSuccess: () => {
          setEditingField(null);
        },
      }
    );
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">Project Timeline</h3>
        <span className="text-xs text-muted-foreground">(click to edit)</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {DATE_FIELDS.map((dateConfig) => (
          <DateField
            key={dateConfig.field}
            label={dateConfig.label}
            value={project[dateConfig.field]}
            highlight={dateConfig.highlight}
            onClick={() => setEditingField(dateConfig)}
            isUpdating={updateProject.isPending}
          />
        ))}
      </div>

      {/* DateTime Picker Popup */}
      {editingField && (
        <DateTimePickerPopup
          label={editingField.label}
          value={project[editingField.field]}
          onSave={handleSaveDate}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  );
}
