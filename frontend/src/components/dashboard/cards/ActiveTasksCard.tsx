import { ClipboardCheck, AlertCircle, ChevronRight } from 'lucide-react';

export function ActiveTasksCard() {
  // This is a placeholder for compliance tasks
  // Will be implemented when the compliance system is built

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-foreground">Job Tasks</h3>
        </div>
        <button
          disabled
          className="text-sm text-muted-foreground flex items-center gap-1 cursor-not-allowed"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content - Placeholder */}
      <div className="p-4">
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Coming Soon</p>
          <p className="text-muted-foreground/60 text-xs mt-1 max-w-[200px] mx-auto">
            IICRC-compliant job tasks with time tracking and dependencies
          </p>
        </div>

        {/* Preview of what will be shown */}
        <div className="mt-4 space-y-2 opacity-50">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Daily moisture readings</p>
              <p className="text-xs text-muted-foreground/60">Due in 2 hours</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Equipment check</p>
              <p className="text-xs text-muted-foreground/60">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
