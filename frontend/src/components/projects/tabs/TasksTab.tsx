import { CheckSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TasksTabProps {
  projectId: number;
}

const defaultTasks = [
  { name: 'Equipment Placed', description: 'Dehumidifiers and air movers set up' },
  { name: 'Initial Readings', description: 'Document initial moisture readings' },
  { name: 'Daily Monitoring', description: 'Record daily moisture and equipment checks' },
  { name: 'Final Readings', description: 'Document final moisture readings' },
  { name: 'Equipment Pickup', description: 'Remove all equipment from site' },
  { name: 'COS Signed', description: 'Certificate of Satisfaction obtained' },
];

function TaskRow({ name, description, disabled }: { name: string; description: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 border rounded-lg ${disabled ? 'opacity-50' : 'hover:bg-muted/30'}`}>
      <div className={`w-5 h-5 rounded border-2 ${disabled ? 'border-muted' : 'border-muted-foreground/30'}`} />
      <div className="flex-1">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function TasksTab({ projectId }: TasksTabProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Job Tasks</h3>
        </div>
        <Button variant="ghost" size="sm" disabled>
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <p className="font-medium">Task Tracking Coming Soon</p>
        <p className="text-xs mt-1">Track job workflow completion with checklists</p>
      </div>

      <div className="space-y-2">
        {defaultTasks.map((task) => (
          <TaskRow key={task.name} {...task} disabled />
        ))}
      </div>

      <p className="text-xs text-muted-foreground/60 mt-4 text-center">Project ID: {projectId}</p>
    </div>
  );
}
