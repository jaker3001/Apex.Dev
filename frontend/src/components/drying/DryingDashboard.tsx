import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  Settings,
  FileText,
  Droplets,
  Thermometer,
  Wind,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { GlassCard, GlassCardWithHeader } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { DryingDayView } from './DryingDayView';
import {
  type DryingLogFull,
  type DailyLog,
  useUpdateDryingLog,
  useDeleteDryingLog,
  useGenerateDryingReport,
} from '@/hooks/useDrying';
import {
  getConditionLevel,
  getConditionColor,
  getConditionBgColor,
  type ConditionLevel,
} from '@/utils/gpp';
import { cn } from '@/lib/utils';

interface DryingDashboardProps {
  projectId: number;
  dryingLog: DryingLogFull;
  onRefresh: () => void;
}

/**
 * Main dashboard for an active drying log.
 * Shows date tabs, summary metrics, and daily entry view.
 */
export function DryingDashboard({ projectId, dryingLog, onRefresh }: DryingDashboardProps) {
  const updateLog = useUpdateDryingLog();
  const deleteLog = useDeleteDryingLog();
  const generateReport = useGenerateDryingReport(projectId);

  // Get sorted dates from daily logs
  const visitDates = useMemo(() => {
    const dates = dryingLog.daily_logs.map((dl) => dl.log_date).sort();
    // Always include today if no logs yet
    if (dates.length === 0) {
      dates.push(new Date().toISOString().split('T')[0]);
    }
    return dates;
  }, [dryingLog.daily_logs]);

  const [selectedDate, setSelectedDate] = useState(visitDates[visitDates.length - 1] || '');
  const [showSettings, setShowSettings] = useState(false);

  // Get selected daily log
  const selectedDailyLog = useMemo(
    () => dryingLog.daily_logs.find((dl) => dl.log_date === selectedDate),
    [dryingLog.daily_logs, selectedDate]
  );

  // Summary calculations
  const summaryStats = useMemo(() => {
    const totalRooms = dryingLog.total_rooms;
    const totalPoints = dryingLog.total_reference_points;

    // Calculate rooms at goal
    let roomsAtGoal = 0;
    for (const room of dryingLog.rooms) {
      const allPointsAtGoal = room.reference_points?.every((rp) => {
        const reading = rp.latest_reading;
        return reading !== undefined && reading !== null && reading <= rp.baseline;
      });
      if (allPointsAtGoal && room.reference_points && room.reference_points.length > 0) {
        roomsAtGoal++;
      }
    }

    // Get latest atmospheric readings
    let outsideGpp: number | undefined;
    let unaffectedGpp: number | undefined;
    let chamberReadings: { name: string; gpp: number; level: ConditionLevel }[] = [];

    if (selectedDailyLog?.atmospheric_readings) {
      for (const atmo of selectedDailyLog.atmospheric_readings) {
        if (atmo.location === 'Outside' && atmo.gpp !== undefined) {
          outsideGpp = atmo.gpp;
        } else if (atmo.location === 'Unaffected' && atmo.gpp !== undefined) {
          unaffectedGpp = atmo.gpp;
        } else if (atmo.gpp !== undefined) {
          chamberReadings.push({
            name: atmo.location,
            gpp: atmo.gpp,
            level: getConditionLevel(atmo.gpp),
          });
        }
      }
    }

    return {
      totalRooms,
      totalPoints,
      roomsAtGoal,
      daysActive: dryingLog.days_active,
      outsideGpp,
      unaffectedGpp,
      chamberReadings,
    };
  }, [dryingLog, selectedDailyLog]);

  // Add new visit date (next day after the most recent visit)
  const handleAddVisit = () => {
    // Get the most recent date from existing visits
    const lastDate = visitDates[visitDates.length - 1];
    if (!lastDate) return;

    // Calculate next day
    const nextDate = new Date(lastDate + 'T12:00:00');
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Set selected date to the new date (DryingDayView will create it on save)
    setSelectedDate(nextDateStr);
  };

  // Mark complete
  const handleMarkComplete = async () => {
    if (
      confirm(
        'Mark this drying log as complete? This will set the end date to today.'
      )
    ) {
      await updateLog.mutateAsync({
        projectId,
        data: {
          status: 'complete',
          end_date: new Date().toISOString().split('T')[0],
        },
      });
      onRefresh();
    }
  };

  // Delete log
  const handleDelete = async () => {
    if (
      confirm(
        'Delete this drying log? This will remove all readings, equipment counts, and daily logs. This cannot be undone.'
      )
    ) {
      await deleteLog.mutateAsync(projectId);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-white">Drying Log</h2>
          </div>
          <div
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              dryingLog.status === 'active'
                ? 'bg-green-500/20 text-green-400'
                : dryingLog.status === 'complete'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-yellow-500/20 text-yellow-400'
            )}
          >
            {dryingLog.status === 'active'
              ? 'Active'
              : dryingLog.status === 'complete'
                ? 'Complete'
                : 'On Hold'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => generateReport.mutate()}
            loading={generateReport.isPending}
            icon={<FileText size={16} />}
          >
            Generate Report
          </GlassButton>
          {dryingLog.status === 'active' && (
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleMarkComplete}
              icon={<CheckCircle size={16} />}
            >
              Mark Complete
            </GlassButton>
          )}
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            icon={<Settings size={18} />}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard padding="sm" animate={false}>
          <div className="text-sm text-zinc-400">Rooms</div>
          <div className="text-2xl font-bold text-white">
            {summaryStats.roomsAtGoal}/{summaryStats.totalRooms}
          </div>
          <div className="text-xs text-zinc-500">at baseline</div>
        </GlassCard>

        <GlassCard padding="sm" animate={false}>
          <div className="text-sm text-zinc-400">Reference Points</div>
          <div className="text-2xl font-bold text-white">{summaryStats.totalPoints}</div>
          <div className="text-xs text-zinc-500">being tracked</div>
        </GlassCard>

        <GlassCard padding="sm" animate={false}>
          <div className="text-sm text-zinc-400">Days Active</div>
          <div className="text-2xl font-bold text-white">{summaryStats.daysActive}</div>
          <div className="text-xs text-zinc-500">since {dryingLog.start_date}</div>
        </GlassCard>
      </div>

      {/* Atmospheric Summary */}
      {(summaryStats.outsideGpp !== undefined ||
        summaryStats.unaffectedGpp !== undefined ||
        summaryStats.chamberReadings.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {summaryStats.outsideGpp !== undefined && (
            <div
              className={cn(
                'px-4 py-2 rounded-xl border flex items-center gap-2',
                getConditionBgColor(getConditionLevel(summaryStats.outsideGpp))
              )}
            >
              <Thermometer size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-300">Outside:</span>
              <span
                className={cn(
                  'font-bold',
                  getConditionColor(getConditionLevel(summaryStats.outsideGpp))
                )}
              >
                {summaryStats.outsideGpp} GPP
              </span>
            </div>
          )}

          {summaryStats.unaffectedGpp !== undefined && (
            <div
              className={cn(
                'px-4 py-2 rounded-xl border flex items-center gap-2',
                getConditionBgColor(getConditionLevel(summaryStats.unaffectedGpp))
              )}
            >
              <Wind size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-300">Unaffected:</span>
              <span
                className={cn(
                  'font-bold',
                  getConditionColor(getConditionLevel(summaryStats.unaffectedGpp))
                )}
              >
                {summaryStats.unaffectedGpp} GPP
              </span>
            </div>
          )}

          {summaryStats.chamberReadings.map((cr) => (
            <div
              key={cr.name}
              className={cn(
                'px-4 py-2 rounded-xl border flex items-center gap-2',
                getConditionBgColor(cr.level)
              )}
            >
              <span className="text-sm text-zinc-300">{cr.name}:</span>
              <span className={cn('font-bold', getConditionColor(cr.level))}>
                {cr.gpp} GPP
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Date Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {visitDates.map((date) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              selectedDate === date
                ? 'bg-primary/20 border border-primary/40 text-primary'
                : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10'
            )}
          >
            <Calendar className="inline-block h-4 w-4 mr-2" />
            {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </button>
        ))}

        <GlassButton
          variant="ghost"
          size="sm"
          onClick={handleAddVisit}
          icon={<Plus size={16} />}
        >
          Add Visit
        </GlassButton>
      </div>

      {/* Daily View */}
      <DryingDayView
        projectId={projectId}
        dryingLog={dryingLog}
        date={selectedDate}
        dailyLog={selectedDailyLog}
        onSave={onRefresh}
      />

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <GlassCard>
            <h3 className="font-semibold text-white mb-4">Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">Delete Drying Log</div>
                  <div className="text-xs text-zinc-500">
                    Permanently remove all drying data for this job
                  </div>
                </div>
                <GlassButton variant="danger" size="sm" onClick={handleDelete}>
                  Delete
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
