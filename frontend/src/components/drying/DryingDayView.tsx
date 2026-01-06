import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Save, ChevronDown, ChevronRight, Thermometer, Droplets, Fan, FileText } from 'lucide-react';
import { GlassCard, GlassCardWithHeader } from './ui/GlassCard';
import { GlassInput, GlassTextarea } from './ui/GlassInput';
import { GlassButton } from './ui/GlassButton';
import {
  type DryingLogFull,
  type DailyLog,
  type Room,
  type Equipment,
  type AtmosphericReadingEntry,
  type AtmosphericLocationType,
  type RoomReadingsEntry,
  useSaveDailyEntry,
  usePreviousEquipmentCounts,
  useReadingsForDate,
} from '@/hooks/useDrying';
import {
  calculateGPP,
  getConditionLevel,
  getConditionColor,
  getConditionBgColor,
  MATERIAL_CODES,
} from '@/utils/gpp';
import { cn } from '@/lib/utils';

interface DryingDayViewProps {
  projectId: number;
  dryingLog: DryingLogFull;
  date: string;
  dailyLog?: DailyLog;
  onSave: () => void;
}

/**
 * Key format for atmospheric readings state.
 * Format: `${location_type}:${chamber_id}:${equipment_id}`
 */
type AtmosphericStateKey = string;

interface AtmosphericValues {
  temp_f: string;
  rh_percent: string;
  gpp?: number;
}

interface AtmosphericState {
  [key: AtmosphericStateKey]: AtmosphericValues;
}

interface ReadingsState {
  [referencePointId: string]: string;
}

interface EquipmentCountState {
  [equipmentId: string]: string;
}

/**
 * Generate atmospheric state key from location_type, chamber_id, and equipment_id.
 */
function makeAtmosphericKey(
  locationType: AtmosphericLocationType,
  chamberId?: string,
  equipmentId?: string
): AtmosphericStateKey {
  return `${locationType}:${chamberId || ''}:${equipmentId || ''}`;
}

/**
 * Parse atmospheric state key back to components.
 */
function parseAtmosphericKey(key: AtmosphericStateKey): {
  location_type: AtmosphericLocationType;
  chamber_id?: string;
  equipment_id?: string;
} {
  const [location_type, chamber_id, equipment_id] = key.split(':');
  return {
    location_type: location_type as AtmosphericLocationType,
    chamber_id: chamber_id || undefined,
    equipment_id: equipment_id || undefined,
  };
}

/**
 * Daily data entry view for a specific date.
 * Section order: Moisture Readings -> Atmospheric -> Equipment -> Notes
 */
export function DryingDayView({
  projectId,
  dryingLog,
  date,
  dailyLog,
  onSave,
}: DryingDayViewProps) {
  const saveDailyEntry = useSaveDailyEntry();
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Atmospheric readings state
  const [atmospheric, setAtmospheric] = useState<AtmosphericState>({});

  // Moisture readings state (by reference point ID)
  const [readings, setReadings] = useState<ReadingsState>({});

  // Equipment counts state (by equipment ID)
  const [equipmentCounts, setEquipmentCounts] = useState<EquipmentCountState>({});

  // Track if this is a new visit (no existing daily log)
  const isNewVisit = !dailyLog?.id;

  // Fetch previous equipment counts for new visits
  const { data: previousCounts } = usePreviousEquipmentCounts(
    projectId,
    date,
    isNewVisit
  );

  // Fetch moisture readings for the selected date
  const { data: savedReadings } = useReadingsForDate(projectId, date);

  // Initialize equipment counts from previous day for new visits
  useEffect(() => {
    if (isNewVisit && previousCounts && previousCounts.length > 0) {
      const countState: EquipmentCountState = {};
      previousCounts.forEach((pc) => {
        countState[pc.equipment_id] = pc.count.toString();
      });
      setEquipmentCounts(countState);
    }
  }, [isNewVisit, previousCounts]);

  // Initialize moisture readings from saved data when date changes
  useEffect(() => {
    if (savedReadings) {
      const readingsState: ReadingsState = {};
      for (const [rpId, value] of Object.entries(savedReadings)) {
        if (value !== null && value !== undefined) {
          readingsState[rpId] = value.toString();
        }
      }
      setReadings(readingsState);
    } else {
      setReadings({});
    }
  }, [savedReadings, date]);

  // Initialize state from dailyLog when it changes
  useEffect(() => {
    if (dailyLog) {
      setNotes(dailyLog.notes || '');

      // Initialize atmospheric readings with new key format
      const atmoState: AtmosphericState = {};
      dailyLog.atmospheric_readings?.forEach((ar) => {
        const key = makeAtmosphericKey(
          ar.location_type,
          ar.chamber_id,
          ar.equipment_id
        );
        atmoState[key] = {
          temp_f: ar.temp_f?.toString() || '',
          rh_percent: ar.rh_percent?.toString() || '',
          gpp: ar.gpp,
        };
      });
      setAtmospheric(atmoState);
    } else {
      setNotes('');
      setAtmospheric({});
    }
    setHasChanges(false);
  }, [dailyLog, date]);

  // Get all dehumidifiers by chamber
  const dehumidifiersByChamber = useMemo(() => {
    const result: Record<string, Equipment[]> = {};
    dryingLog.chambers.forEach((chamber) => {
      result[chamber.id] = [];
    });

    // Find dehumidifiers in each room, grouped by chamber
    dryingLog.rooms.forEach((room) => {
      if (room.chamber_id && room.equipment) {
        const dehumidifiers = room.equipment.filter(
          (eq) =>
            eq.equipment_type.toLowerCase().includes('dehumidifier') ||
            eq.equipment_type.toLowerCase().includes('lgr') ||
            eq.equipment_type.toLowerCase().includes('xl')
        );
        if (!result[room.chamber_id]) {
          result[room.chamber_id] = [];
        }
        result[room.chamber_id].push(...dehumidifiers);
      }
    });

    return result;
  }, [dryingLog.rooms, dryingLog.chambers]);

  // Handle atmospheric change
  const handleAtmosphericChange = (
    key: AtmosphericStateKey,
    field: 'temp_f' | 'rh_percent',
    value: string
  ) => {
    setAtmospheric((prev) => {
      const current = prev[key] || { temp_f: '', rh_percent: '' };
      const updated = { ...current, [field]: value };

      // Calculate GPP if both values present
      const temp = parseFloat(updated.temp_f);
      const rh = parseFloat(updated.rh_percent);
      if (!isNaN(temp) && !isNaN(rh) && temp > 0 && rh >= 0) {
        updated.gpp = calculateGPP(temp, rh);
      } else {
        updated.gpp = undefined;
      }

      return { ...prev, [key]: updated };
    });
    setHasChanges(true);
  };

  // Handle moisture reading change
  const handleReadingChange = (pointId: string, value: string) => {
    setReadings((prev) => ({ ...prev, [pointId]: value }));
    setHasChanges(true);
  };

  // Handle equipment count change
  const handleEquipmentCountChange = (equipmentId: string, value: string) => {
    setEquipmentCounts((prev) => ({ ...prev, [equipmentId]: value }));
    setHasChanges(true);
  };

  // Toggle room expansion
  const toggleRoom = (roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  // Expand all rooms by default
  useEffect(() => {
    setExpandedRooms(new Set(dryingLog.rooms.map((r) => r.id)));
  }, [dryingLog.rooms]);

  // Save handler
  const handleSave = async () => {
    // Build atmospheric readings with new structure
    const atmosphericReadings: AtmosphericReadingEntry[] = [];
    for (const [key, values] of Object.entries(atmospheric)) {
      if (values.temp_f || values.rh_percent) {
        const parsed = parseAtmosphericKey(key);
        atmosphericReadings.push({
          location_type: parsed.location_type,
          chamber_id: parsed.chamber_id,
          equipment_id: parsed.equipment_id,
          temp_f: values.temp_f ? parseFloat(values.temp_f) : undefined,
          rh_percent: values.rh_percent ? parseFloat(values.rh_percent) : undefined,
          gpp: values.gpp,
        });
      }
    }

    // Build room entries
    const roomEntries: RoomReadingsEntry[] = [];
    for (const room of dryingLog.rooms) {
      const roomReadings = room.reference_points
        ?.filter((rp) => readings[rp.id])
        .map((rp) => ({
          reference_point_id: rp.id,
          reading_date: date,
          reading_value: parseFloat(readings[rp.id]) || undefined,
        }));

      const roomEquipmentCounts = room.equipment
        ?.filter((eq) => equipmentCounts[eq.id])
        .map((eq) => ({
          equipment_id: eq.id,
          count_date: date,
          count: parseInt(equipmentCounts[eq.id], 10) || 0,
        }));

      if (
        (roomReadings && roomReadings.length > 0) ||
        (roomEquipmentCounts && roomEquipmentCounts.length > 0)
      ) {
        roomEntries.push({
          room_id: room.id,
          readings: roomReadings || [],
          equipment_counts: roomEquipmentCounts || [],
        });
      }
    }

    try {
      await saveDailyEntry.mutateAsync({
        projectId,
        data: {
          log_date: date,
          notes: notes || undefined,
          atmospheric_readings: atmosphericReadings,
          room_entries: roomEntries,
        },
      });
      setHasChanges(false);
      onSave();
    } catch (error) {
      console.error('Failed to save daily entry:', error);
    }
  };

  // Render single atmospheric reading row
  const renderAtmosphericRow = (
    label: string,
    key: AtmosphericStateKey,
    indent: boolean = false
  ) => {
    const atmo = atmospheric[key] || { temp_f: '', rh_percent: '' };
    const gpp = atmo.gpp;
    const level = gpp !== undefined ? getConditionLevel(gpp) : undefined;

    return (
      <div
        key={key}
        className={cn(
          'grid grid-cols-12 gap-3 items-center bg-white/5 p-3 rounded-xl',
          indent && 'ml-4'
        )}
      >
        <div className={cn('font-medium text-white', indent ? 'col-span-3' : 'col-span-3')}>
          {label}
        </div>
        <div className="col-span-3">
          <GlassInput
            type="number"
            placeholder="Temp (°F)"
            value={atmo.temp_f}
            onChange={(e) => handleAtmosphericChange(key, 'temp_f', e.target.value)}
            size="sm"
          />
        </div>
        <div className="col-span-3">
          <GlassInput
            type="number"
            placeholder="RH (%)"
            value={atmo.rh_percent}
            onChange={(e) => handleAtmosphericChange(key, 'rh_percent', e.target.value)}
            size="sm"
          />
        </div>
        <div className="col-span-3">
          {gpp !== undefined && level && (
            <div
              className={cn(
                'px-3 py-1.5 rounded-lg text-center font-bold',
                getConditionBgColor(level)
              )}
            >
              <span className={getConditionColor(level)}>{gpp} GPP</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render atmospheric section with new structure
  const renderAtmospheric = () => (
    <GlassCardWithHeader
      title="Atmospheric Readings"
      icon={<Thermometer size={18} />}
    >
      <div className="space-y-4">
        {/* General Readings: Outside and Unaffected */}
        {renderAtmosphericRow('Outside', makeAtmosphericKey('outside'))}
        {renderAtmosphericRow('Unaffected', makeAtmosphericKey('unaffected'))}

        {/* Per-Chamber Readings */}
        {dryingLog.chambers.map((chamber) => {
          const dehumidifiers = dehumidifiersByChamber[chamber.id] || [];

          return (
            <div key={chamber.id} className="space-y-2">
              {/* Chamber section header */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-zinc-400 mb-2">
                  {chamber.name} Chamber
                </h4>
              </div>

              {/* Chamber Interior */}
              {renderAtmosphericRow(
                'Interior (Affected)',
                makeAtmosphericKey('chamber_interior', chamber.id)
              )}

              {/* Dehumidifier Exhaust Readings */}
              {dehumidifiers.map((dehu, idx) => {
                // Get short name (e.g., "LGR" from "LGR Dehumidifier")
                const shortName = dehu.equipment_type.split(' ')[0] || dehu.equipment_type;
                const label = `${shortName} #${idx + 1} Exhaust`;

                return renderAtmosphericRow(
                  label,
                  makeAtmosphericKey('dehumidifier_exhaust', chamber.id, dehu.id),
                  true
                );
              })}
            </div>
          );
        })}
      </div>
    </GlassCardWithHeader>
  );

  // Render moisture readings for a room (without equipment)
  const renderRoomMoistureReadings = (room: Room) => {
    const isExpanded = expandedRooms.has(room.id);
    const chamberName = dryingLog.chambers.find((c) => c.id === room.chamber_id)?.name;

    return (
      <motion.div key={room.id} layout>
        <GlassCard padding="none" animate={false} className="overflow-hidden">
          {/* Room Header */}
          <button
            onClick={() => toggleRoom(room.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown size={20} className="text-zinc-400" />
              ) : (
                <ChevronRight size={20} className="text-zinc-400" />
              )}
              <Droplets size={18} className="text-primary" />
              <span className="font-medium text-white">{room.name}</span>
              {chamberName && (
                <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                  {chamberName}
                </span>
              )}
            </div>
            <div className="text-sm text-zinc-400">
              {room.reference_points?.length || 0} points
            </div>
          </button>

          {/* Room Content - Moisture Readings Only */}
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="border-t border-white/5"
            >
              <div className="p-4">
                {room.reference_points && room.reference_points.length > 0 ? (
                  <div className="space-y-2">
                    {room.reference_points.map((rp, idx) => {
                      const currentReading = readings[rp.id];
                      const readingValue = currentReading
                        ? parseFloat(currentReading)
                        : rp.latest_reading;
                      const isAtGoal =
                        readingValue !== undefined && readingValue <= rp.baseline;
                      const isHigh =
                        readingValue !== undefined && readingValue > rp.baseline * 1.5;

                      return (
                        <div
                          key={rp.id}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded-lg',
                            isAtGoal
                              ? 'bg-green-500/10 border border-green-500/20'
                              : isHigh
                                ? 'bg-red-500/10 border border-red-500/20'
                                : 'bg-white/5'
                          )}
                        >
                          <span className="w-6 text-center text-zinc-500 text-sm">
                            #{idx + 1}
                          </span>
                          <span className="flex-1 text-sm text-zinc-300">
                            {MATERIAL_CODES[rp.material_code as keyof typeof MATERIAL_CODES] ||
                              rp.material}
                          </span>
                          <span className="text-xs text-zinc-500 w-16">
                            Baseline: {rp.baseline}
                          </span>
                          <GlassInput
                            type="number"
                            placeholder="Reading"
                            value={readings[rp.id] || ''}
                            onChange={(e) => handleReadingChange(rp.id, e.target.value)}
                            containerClassName="w-24"
                            size="sm"
                            className={cn(
                              isAtGoal && 'border-green-500/30 bg-green-500/10',
                              isHigh && 'border-red-500/30 bg-red-500/10'
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">
                    No reference points configured for this room.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    );
  };

  // Render equipment counts section
  const renderEquipmentSection = () => {
    // Flatten all equipment across rooms
    const allEquipment = dryingLog.rooms.flatMap((room) =>
      (room.equipment || []).map((eq) => ({
        ...eq,
        roomName: room.name,
        chamberName: dryingLog.chambers.find((c) => c.id === room.chamber_id)?.name,
      }))
    );

    if (allEquipment.length === 0) {
      return null;
    }

    // Group by room
    const equipmentByRoom = dryingLog.rooms.reduce(
      (acc, room) => {
        if (room.equipment && room.equipment.length > 0) {
          acc[room.id] = {
            roomName: room.name,
            chamberName: dryingLog.chambers.find((c) => c.id === room.chamber_id)?.name,
            equipment: room.equipment,
          };
        }
        return acc;
      },
      {} as Record<
        string,
        { roomName: string; chamberName?: string; equipment: Equipment[] }
      >
    );

    return (
      <GlassCardWithHeader title="Equipment Counts" icon={<Fan size={18} />}>
        <div className="space-y-4">
          {Object.entries(equipmentByRoom).map(([roomId, { roomName, chamberName, equipment }]) => (
            <div key={roomId} className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-zinc-300">{roomName}</h4>
                {chamberName && (
                  <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded">
                    {chamberName}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {equipment.map((eq) => (
                  <div key={eq.id} className="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
                    <span className="text-sm text-zinc-300">{eq.equipment_type}</span>
                    <GlassInput
                      type="number"
                      placeholder="#"
                      value={equipmentCounts[eq.id] || ''}
                      onChange={(e) => handleEquipmentCountChange(eq.id, e.target.value)}
                      containerClassName="w-16"
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GlassCardWithHeader>
    );
  };

  // Render notes section
  const renderNotesSection = () => (
    <GlassCardWithHeader title="Daily Notes" icon={<FileText size={18} />}>
      <GlassTextarea
        placeholder="Enter any observations or notes for this visit..."
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setHasChanges(true);
        }}
        rows={4}
      />
    </GlassCardWithHeader>
  );

  return (
    <div className="space-y-4">
      {/* 1. MOISTURE READINGS (Room Readings) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Droplets size={16} className="text-primary" />
          Moisture Readings
        </h3>
        {dryingLog.rooms.map(renderRoomMoistureReadings)}
      </div>

      {/* 2. ATMOSPHERIC READINGS */}
      {renderAtmospheric()}

      {/* 3. EQUIPMENT COUNTS */}
      {renderEquipmentSection()}

      {/* 4. DAILY NOTES */}
      {renderNotesSection()}

      {/* Floating Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6"
        >
          <GlassButton
            variant="primary"
            size="lg"
            onClick={handleSave}
            loading={saveDailyEntry.isPending}
            icon={<Save size={20} />}
            className="shadow-2xl"
          >
            Save Changes
          </GlassButton>
        </motion.div>
      )}
    </div>
  );
}
