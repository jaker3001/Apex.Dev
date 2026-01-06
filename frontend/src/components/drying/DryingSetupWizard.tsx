import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle,
  Droplets,
  Wind,
  Home,
  Ruler,
} from 'lucide-react';
import { GlassCard, GlassCardWithHeader } from './ui/GlassCard';
import { GlassInput, GlassSelect } from './ui/GlassInput';
import { GlassButton } from './ui/GlassButton';
import {
  MATERIAL_CODES,
  DEFAULT_BASELINES,
  EQUIPMENT_TYPES,
  CHAMBER_TYPES,
  type MaterialCode,
  type ChamberType,
} from '@/utils/gpp';
import {
  useCreateDryingSetup,
  useMaterialBaselines,
  useUpdateMaterialBaseline,
  type RoomSetup,
  type ChamberSetup,
  type EquipmentSetup,
} from '@/hooks/useDrying';

/**
 * Equipment count entry for setup.
 */
interface TempEquipment {
  type: string;
  count: number;
}

interface TempRoom {
  id: string;
  name: string;
  chamberId?: string;
  referencePoints: {
    id: string;
    material: string;
    materialCode: string;
    baseline: number;
    saturation?: number;
  }[];
  equipment: TempEquipment[];
}

interface TempChamber {
  id: string;
  name: string;
  chamberType: ChamberType;
}

interface DryingSetupWizardProps {
  projectId: number;
  jobNumber: string;
  onComplete: () => void;
  onCancel: () => void;
}

const COMMON_MATERIALS = Object.entries(MATERIAL_CODES).map(([code, name]) => ({
  code: code as MaterialCode,
  name,
  defaultBaseline: DEFAULT_BASELINES[code as MaterialCode],
}));

export function DryingSetupWizard({
  projectId,
  jobNumber,
  onComplete,
  onCancel,
}: DryingSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const createSetup = useCreateDryingSetup();

  // Fetch custom material baselines
  const { data: customBaselines = {} } = useMaterialBaselines();
  const updateBaseline = useUpdateMaterialBaseline();

  // Merged baselines: custom overrides defaults
  const effectiveBaselines = useMemo(() => {
    return { ...DEFAULT_BASELINES, ...customBaselines };
  }, [customBaselines]);

  // Form state
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [rooms, setRooms] = useState<TempRoom[]>([]);
  const [chambers, setChambers] = useState<TempChamber[]>([]);

  // Helpers
  const addRoom = () => {
    setRooms([
      ...rooms,
      {
        id: `temp_${Date.now()}`,
        name: '',
        referencePoints: [],
        equipment: [],
      },
    ]);
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter((r) => r.id !== id));
  };

  const updateRoom = (id: string, updates: Partial<TempRoom>) => {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const addChamber = () => {
    setChambers([
      ...chambers,
      {
        id: `temp_${Date.now()}`,
        name: '',
        chamberType: 'Containment',
      },
    ]);
  };

  const removeChamber = (id: string) => {
    setChambers(chambers.filter((c) => c.id !== id));
    // Unassign rooms from this chamber
    setRooms(rooms.map((r) => (r.chamberId === id ? { ...r, chamberId: undefined } : r)));
  };

  const updateChamber = (id: string, updates: Partial<TempChamber>) => {
    setChambers(chambers.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const addReferencePoint = (roomId: string) => {
    // Use effective baseline (custom or default) for Drywall
    const baseline = effectiveBaselines.D ?? DEFAULT_BASELINES.D;
    setRooms(
      rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              referencePoints: [
                ...r.referencePoints,
                {
                  id: `rp_${Date.now()}`,
                  material: MATERIAL_CODES.D,
                  materialCode: 'D',
                  baseline,
                },
              ],
            }
          : r
      )
    );
  };

  const removeReferencePoint = (roomId: string, pointId: string) => {
    setRooms(
      rooms.map((r) =>
        r.id === roomId
          ? { ...r, referencePoints: r.referencePoints.filter((p) => p.id !== pointId) }
          : r
      )
    );
  };

  /**
   * Update equipment count for a room.
   * If count is 0 or less, removes the equipment entry.
   */
  const updateEquipmentCount = (roomId: string, equipmentType: string, count: number) => {
    setRooms(
      rooms.map((r) => {
        if (r.id !== roomId) return r;
        const existingIdx = r.equipment.findIndex((e) => e.type === equipmentType);

        if (count <= 0) {
          // Remove equipment if count is 0
          return {
            ...r,
            equipment: r.equipment.filter((e) => e.type !== equipmentType),
          };
        }

        if (existingIdx >= 0) {
          // Update existing count
          const newEquipment = [...r.equipment];
          newEquipment[existingIdx] = { type: equipmentType, count };
          return { ...r, equipment: newEquipment };
        }

        // Add new equipment entry
        return {
          ...r,
          equipment: [...r.equipment, { type: equipmentType, count }],
        };
      })
    );
  };

  /**
   * Get equipment count for a room.
   */
  const getEquipmentCount = (room: TempRoom, equipmentType: string): number => {
    return room.equipment.find((e) => e.type === equipmentType)?.count ?? 0;
  };

  // Navigation
  const totalSteps = 4;
  const handleNext = () => setStep(Math.min(step + 1, totalSteps));
  const handleBack = () => setStep(Math.max(step - 1, 1));

  // Submit
  const handleSubmit = async () => {
    // Transform data for API
    const roomsData: RoomSetup[] = rooms.map((r) => ({
      name: r.name,
      reference_points: r.referencePoints.map((rp) => ({
        material: rp.material,
        material_code: rp.materialCode,
        baseline: rp.baseline,
        saturation: rp.saturation,
      })),
      // New format: equipment with counts (only include equipment with count > 0)
      equipment: r.equipment
        .filter((e) => e.count > 0)
        .map((e) => ({
          equipment_type: e.type,
          initial_count: e.count,
        })),
    }));

    const chambersData: ChamberSetup[] = chambers.map((c) => ({
      name: c.name,
      chamber_type: c.chamberType,
      room_ids: rooms.filter((r) => r.chamberId === c.id).map((r) => r.id),
    }));

    setError(null); // Clear previous error
    try {
      await createSetup.mutateAsync({
        projectId,
        data: {
          start_date: startDate,
          rooms: roomsData,
          chambers: chambersData,
        },
      });
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create drying setup';
      console.error('Failed to create drying setup:', err);
      setError(message);
    }
  };

  // Validation
  const canProceedStep1 = rooms.length > 0 && rooms.every((r) => r.name.trim());
  const canProceedStep2 = true; // Chambers are optional
  const canProceedStep3 = true; // Assignments are optional
  const canProceedStep4 = rooms.every(
    (r) => r.referencePoints.length > 0 || r.equipment.some((e) => e.count > 0)
  );

  // Animation variants
  const stepVariants = {
    initial: { x: 20, opacity: 0 },
    enter: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  };

  // Step 1: Rooms
  const renderRooms = () => (
    <motion.div
      key="rooms"
      variants={stepVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Droplets className="text-primary" size={28} />
        <div>
          <h2 className="text-xl font-semibold text-white">Affected Rooms</h2>
          <p className="text-sm text-zinc-400">List all areas affected by water damage</p>
        </div>
      </div>

      <div className="space-y-3">
        {rooms.map((room, idx) => (
          <motion.div
            key={room.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <GlassInput
              containerClassName="flex-1"
              placeholder={`Room ${idx + 1} Name (e.g., Kitchen)`}
              value={room.name}
              onChange={(e) => updateRoom(room.id, { name: e.target.value })}
            />
            <GlassButton
              variant="danger"
              size="icon"
              onClick={() => removeRoom(room.id)}
              icon={<Trash2 size={18} />}
            />
          </motion.div>
        ))}
      </div>

      <GlassButton variant="primary" onClick={addRoom} icon={<Plus size={18} />}>
        Add Room
      </GlassButton>
    </motion.div>
  );

  // Step 2: Chambers
  const renderChambers = () => (
    <motion.div
      key="chambers"
      variants={stepVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Wind className="text-primary" size={28} />
        <div>
          <h2 className="text-xl font-semibold text-white">Drying Chambers</h2>
          <p className="text-sm text-zinc-400">
            Define containment zones (optional - skip if not using chambers)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {chambers.map((chamber) => (
          <motion.div
            key={chamber.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-end"
          >
            <GlassInput
              containerClassName="flex-1"
              placeholder="Chamber Name"
              label="Name"
              value={chamber.name}
              onChange={(e) => updateChamber(chamber.id, { name: e.target.value })}
            />
            <GlassSelect
              containerClassName="w-44"
              label="Type"
              value={chamber.chamberType}
              onChange={(e) =>
                updateChamber(chamber.id, { chamberType: e.target.value as ChamberType })
              }
              options={CHAMBER_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <GlassButton
              variant="danger"
              size="icon"
              onClick={() => removeChamber(chamber.id)}
              icon={<Trash2 size={18} />}
            />
          </motion.div>
        ))}
      </div>

      <GlassButton variant="primary" onClick={addChamber} icon={<Plus size={18} />}>
        Add Chamber
      </GlassButton>

      {chambers.length === 0 && (
        <p className="text-sm text-zinc-500 italic">
          No chambers defined. You can skip this step if you're not using containment zones.
        </p>
      )}
    </motion.div>
  );

  // Step 3: Assignments
  const renderAssignments = () => (
    <motion.div
      key="assignments"
      variants={stepVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Home className="text-primary" size={28} />
        <div>
          <h2 className="text-xl font-semibold text-white">Assign Rooms to Chambers</h2>
          <p className="text-sm text-zinc-400">
            Link each room to its drying zone (optional)
          </p>
        </div>
      </div>

      {chambers.length === 0 ? (
        <p className="text-zinc-500 italic">
          No chambers defined. You can skip this step.
        </p>
      ) : (
        <div className="space-y-2">
          {rooms.map((room, idx) => (
            <div
              key={room.id}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <span className="font-medium text-white">
                {room.name || `Room ${idx + 1}`}
              </span>
              <GlassSelect
                containerClassName="w-52"
                value={room.chamberId || ''}
                onChange={(e) => updateRoom(room.id, { chamberId: e.target.value || undefined })}
                options={[
                  { value: '', label: '-- No Chamber --' },
                  ...chambers.map((c) => ({ value: c.id, label: c.name || 'Unnamed' })),
                ]}
              />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  // Step 4: Room Setup
  const renderRoomSetup = () => (
    <motion.div
      key="room-setup"
      variants={stepVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      className="space-y-8"
    >
      <div className="flex items-center gap-3 mb-2">
        <Ruler className="text-primary" size={28} />
        <div>
          <h2 className="text-xl font-semibold text-white">Room Setup</h2>
          <p className="text-sm text-zinc-400">
            Add reference points and equipment for each room
          </p>
        </div>
      </div>

      {rooms.map((room, roomIdx) => (
        <GlassCard key={room.id} className="relative overflow-hidden">
          {/* Accent strip */}
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />

          <h3 className="font-semibold text-lg text-white mb-6 pl-3">
            {room.name || `Room ${roomIdx + 1}`}
          </h3>

          {/* Reference Points */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Reference Points
            </h4>
            <div className="space-y-2">
              {room.referencePoints.map((rp, rpIdx) => (
                <div
                  key={rp.id}
                  className="flex gap-2 items-center bg-white/5 p-2 rounded-xl"
                >
                  <span className="text-zinc-500 w-6 text-center text-sm">#{rpIdx + 1}</span>
                  <GlassSelect
                    containerClassName="flex-1"
                    value={rp.materialCode}
                    onChange={(e) => {
                      const code = e.target.value as MaterialCode;
                      const material = MATERIAL_CODES[code];
                      // Use effective baseline (custom or default)
                      const baseline = effectiveBaselines[code] ?? DEFAULT_BASELINES[code];
                      setRooms(
                        rooms.map((r) =>
                          r.id === room.id
                            ? {
                                ...r,
                                referencePoints: r.referencePoints.map((p) =>
                                  p.id === rp.id
                                    ? { ...p, materialCode: code, material, baseline }
                                    : p
                                ),
                              }
                            : r
                        )
                      );
                    }}
                    options={COMMON_MATERIALS.map((m) => ({
                      value: m.code,
                      label: m.name,
                    }))}
                    size="sm"
                  />
                  <GlassInput
                    containerClassName="w-20"
                    type="number"
                    placeholder="Baseline"
                    value={rp.baseline}
                    onChange={(e) => {
                      const baseline = Number(e.target.value) || 0;
                      setRooms(
                        rooms.map((r) =>
                          r.id === room.id
                            ? {
                                ...r,
                                referencePoints: r.referencePoints.map((p) =>
                                  p.id === rp.id ? { ...p, baseline } : p
                                ),
                              }
                            : r
                        )
                      );
                    }}
                    onBlur={(e) => {
                      // Save custom baseline when user finishes editing
                      const baseline = Number(e.target.value) || 0;
                      const defaultVal = DEFAULT_BASELINES[rp.materialCode as MaterialCode];
                      // Only save if different from default
                      if (baseline !== defaultVal) {
                        updateBaseline.mutate({
                          materialCode: rp.materialCode,
                          baseline,
                        });
                      }
                    }}
                    size="sm"
                  />
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReferencePoint(room.id, rp.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </GlassButton>
                </div>
              ))}
            </div>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => addReferencePoint(room.id)}
              className="mt-2 text-primary"
              icon={<Plus size={14} />}
            >
              Add Point
            </GlassButton>
          </div>

          {/* Equipment */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Equipment Counts
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {EQUIPMENT_TYPES.map((type) => {
                const count = getEquipmentCount(room, type);
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2"
                  >
                    <span className="flex-1 text-sm text-zinc-300 truncate">{type}</span>
                    <GlassInput
                      containerClassName="w-16"
                      type="number"
                      min={0}
                      value={count || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const newCount = parseInt(e.target.value) || 0;
                        updateEquipmentCount(room.id, type, newCount);
                      }}
                      size="sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>
      ))}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Drying Setup</h1>
          <p className="text-zinc-400">Job #{jobNumber}</p>
        </div>
        <GlassInput
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          containerClassName="w-40"
          size="sm"
        />
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                s < step
                  ? 'bg-primary text-white'
                  : s === step
                    ? 'bg-primary/20 border-2 border-primary text-primary'
                    : 'bg-white/5 border border-white/10 text-zinc-500'
              }`}
            >
              {s < step ? <CheckCircle size={16} /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-12 h-0.5 ${s < step ? 'bg-primary' : 'bg-white/10'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <GlassCard className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 1 && renderRooms()}
          {step === 2 && renderChambers()}
          {step === 3 && renderAssignments()}
          {step === 4 && renderRoomSetup()}
        </AnimatePresence>
      </GlassCard>

      {/* Navigation */}
      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <div>
          {step > 1 ? (
            <GlassButton variant="ghost" onClick={handleBack} icon={<ArrowLeft size={18} />}>
              Back
            </GlassButton>
          ) : (
            <GlassButton variant="ghost" onClick={onCancel}>
              Cancel
            </GlassButton>
          )}
        </div>

        <div>
          {step < totalSteps ? (
            <GlassButton
              variant="primary"
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              icon={<ArrowRight size={18} />}
            >
              Next
            </GlassButton>
          ) : (
            <GlassButton
              variant="primary"
              onClick={handleSubmit}
              disabled={!canProceedStep4}
              loading={createSetup.isPending}
              icon={<CheckCircle size={18} />}
            >
              Create Drying Log
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );
}
