import { useState } from 'react';
import { useDryingLog } from '@/hooks/useDrying';
import { DryingSetupWizard } from './DryingSetupWizard';
import { DryingDashboard } from './DryingDashboard';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { Droplets, Plus, Loader2 } from 'lucide-react';

interface DryingTabProps {
  projectId: number;
  jobNumber: string;
}

/**
 * Main entry point for the Drying Tracker feature.
 * Shows either:
 * - Empty state with "Start Drying Log" button
 * - Setup wizard (when creating new log)
 * - Dashboard (when log exists)
 */
export function DryingTab({ projectId, jobNumber }: DryingTabProps) {
  const { data: dryingLog, isLoading, refetch } = useDryingLog(projectId);
  const [showWizard, setShowWizard] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show wizard if creating new log
  if (showWizard) {
    return (
      <DryingSetupWizard
        projectId={projectId}
        jobNumber={jobNumber}
        onComplete={() => {
          setShowWizard(false);
          refetch();
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  // Show dashboard if log exists
  if (dryingLog) {
    return (
      <DryingDashboard
        projectId={projectId}
        dryingLog={dryingLog}
        onRefresh={refetch}
      />
    );
  }

  // Empty state - no drying log yet
  return (
    <GlassCard className="text-center py-16">
      <div className="flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Droplets className="h-10 w-10 text-primary" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-2">No Drying Log</h2>
          <p className="text-zinc-400 max-w-md">
            This job doesn't have a structural drying log yet.
            Start one to track moisture readings, equipment, and atmospheric conditions.
          </p>
        </div>

        <GlassButton
          variant="primary"
          size="lg"
          onClick={() => setShowWizard(true)}
          icon={<Plus size={20} />}
        >
          Start Drying Log
        </GlassButton>
      </div>
    </GlassCard>
  );
}
