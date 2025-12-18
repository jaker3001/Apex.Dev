import { ClipboardCheck, AlertCircle, ChevronRight } from 'lucide-react';

export function ActiveTasksCard() {
  // This is a placeholder for compliance tasks
  // Will be implemented when the compliance system is built

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Job Tasks</h3>
        </div>
        <button
          disabled
          className="text-sm text-slate-500 flex items-center gap-1 cursor-not-allowed"
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
          <p className="text-slate-400 text-sm font-medium">Coming Soon</p>
          <p className="text-slate-500 text-xs mt-1 max-w-[200px] mx-auto">
            IICRC-compliant job tasks with time tracking and dependencies
          </p>
        </div>

        {/* Preview of what will be shown */}
        <div className="mt-4 space-y-2 opacity-50">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <div className="flex-1">
              <p className="text-xs text-slate-400">Daily moisture readings</p>
              <p className="text-xs text-slate-500">Due in 2 hours</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <div className="flex-1">
              <p className="text-xs text-slate-400">Equipment check</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
