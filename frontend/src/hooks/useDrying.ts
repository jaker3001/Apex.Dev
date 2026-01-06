import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/api';
import type { ConditionLevel, ChamberType } from '../utils/gpp';

// =============================================================================
// TYPES
// =============================================================================

export interface DryingLog {
  id: string;
  job_id: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'complete' | 'on_hold';
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface Chamber {
  id: string;
  drying_log_id: string;
  name: string;
  chamber_type: ChamberType;
  sort_order: number;
  created_at?: string;
  rooms?: Room[];
}

export interface Room {
  id: string;
  drying_log_id: string;
  chamber_id?: string;
  name: string;
  sort_order: number;
  created_at?: string;
  reference_points?: ReferencePoint[];
  equipment?: Equipment[];
}

export interface ReferencePoint {
  id: string;
  room_id: string;
  material: string;
  material_code: string;
  baseline: number;
  saturation?: number;
  sort_order: number;
  created_at?: string;
  latest_reading?: number;
}

export interface MoistureReading {
  id: string;
  reference_point_id: string;
  reading_date: string;
  reading_value?: number;
}

export interface Equipment {
  id: string;
  room_id: string;
  equipment_type: string;
  created_at?: string;
  latest_count?: number;
}

export interface EquipmentCount {
  id: string;
  equipment_id: string;
  count_date: string;
  count: number;
}

/**
 * Previous equipment count with equipment details.
 * Used to pre-populate equipment counts for new visits.
 */
export interface PreviousEquipmentCount {
  equipment_id: string;
  equipment_type: string;
  room_id: string;
  room_name: string;
  count: number;
  count_date: string;
}

export interface DailyLog {
  id: string;
  drying_log_id: string;
  log_date: string;
  notes?: string;
  created_at?: string;
  atmospheric_readings?: AtmosphericReading[];
}

/**
 * Types of atmospheric reading locations.
 */
export type AtmosphericLocationType =
  | 'outside'              // Weather/exterior conditions
  | 'unaffected'           // Inside property, not in drying zone
  | 'chamber_interior'     // Inside a drying chamber (affected area)
  | 'dehumidifier_exhaust'; // Exhaust from specific dehumidifier

export interface AtmosphericReading {
  id: string;
  daily_log_id: string;
  location_type: AtmosphericLocationType;
  chamber_id?: string;
  chamber_name?: string;  // Joined from chambers table
  equipment_id?: string;
  equipment_type?: string;  // Joined from equipment table (e.g., "LGR Dehumidifier")
  equipment_index?: number;  // For numbering (1 for "LGR #1", 2 for "LGR #2")
  temp_f?: number;
  rh_percent?: number;
  gpp?: number;
  condition_level?: ConditionLevel;
  // Legacy field for backwards compatibility
  location?: string;
}

export interface DryingLogFull extends DryingLog {
  chambers: Chamber[];
  rooms: Room[];
  daily_logs: DailyLog[];
  total_rooms: number;
  total_reference_points: number;
  days_active: number;
  latest_visit_date?: string;
}

// Setup Wizard Types
export interface ReferencePointSetup {
  material: string;
  material_code: string;
  baseline?: number;
  saturation?: number;
}

/**
 * Equipment with initial count for setup wizard.
 */
export interface EquipmentSetup {
  equipment_type: string;
  initial_count: number;
}

export interface RoomSetup {
  name: string;
  reference_points: ReferencePointSetup[];
  equipment: EquipmentSetup[];  // Equipment with counts
  equipment_types?: string[];   // Legacy: just equipment type names
}

/**
 * Material baseline preference.
 * Custom baselines that override DEFAULT_BASELINES.
 */
export interface MaterialBaseline {
  material_code: string;
  baseline: number;
  updated_at?: string;
}

export interface ChamberSetup {
  name: string;
  chamber_type: ChamberType;
  room_ids: string[];
}

export interface DryingSetupRequest {
  job_id: number;
  start_date: string;
  rooms: RoomSetup[];
  chambers: ChamberSetup[];
}

export interface DryingSetupResponse {
  drying_log: DryingLog;
  rooms_created: number;
  chambers_created: number;
  reference_points_created: number;
  equipment_types_created: number;
}

// Daily Entry Types
export interface MoistureReadingEntry {
  reference_point_id: string;
  reading_date: string;
  reading_value?: number;
}

export interface EquipmentCountEntry {
  equipment_id: string;
  count_date: string;
  count: number;
}

export interface RoomReadingsEntry {
  room_id: string;
  readings: MoistureReadingEntry[];
  equipment_counts: EquipmentCountEntry[];
}

export interface AtmosphericReadingEntry {
  location_type: AtmosphericLocationType;
  chamber_id?: string;  // Required for chamber_interior, dehumidifier_exhaust
  equipment_id?: string;  // Required for dehumidifier_exhaust only
  temp_f?: number;
  rh_percent?: number;
  gpp?: number;
  // Legacy field for backwards compatibility
  location?: string;
}

export interface DailyEntryRequest {
  log_date: string;
  notes?: string;
  atmospheric_readings: AtmosphericReadingEntry[];
  room_entries: RoomReadingsEntry[];
}

export interface DailyEntryResponse {
  daily_log: DailyLog;
  moisture_readings_saved: number;
  equipment_counts_saved: number;
  atmospheric_readings_saved: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchDryingLog(projectId: number): Promise<DryingLogFull | null> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch drying log');
  return res.json();
}

async function createDryingSetup(
  projectId: number,
  data: Omit<DryingSetupRequest, 'job_id'>
): Promise<DryingSetupResponse> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, job_id: projectId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create drying setup');
  }
  return res.json();
}

async function updateDryingLog(
  projectId: number,
  data: Partial<Pick<DryingLog, 'start_date' | 'end_date' | 'status'>>
): Promise<DryingLog> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update drying log');
  return res.json();
}

async function deleteDryingLog(projectId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete drying log');
}

// Chamber operations
async function createChamber(
  projectId: number,
  data: Pick<Chamber, 'name' | 'chamber_type' | 'sort_order'>
): Promise<Chamber> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/chambers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create chamber');
  return res.json();
}

async function updateChamber(
  projectId: number,
  chamberId: string,
  data: Partial<Pick<Chamber, 'name' | 'chamber_type' | 'sort_order'>>
): Promise<Chamber> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/chambers/${chamberId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update chamber');
  return res.json();
}

async function deleteChamber(projectId: number, chamberId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/chambers/${chamberId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete chamber');
}

// Room operations
async function createRoom(
  projectId: number,
  data: Pick<Room, 'name' | 'chamber_id' | 'sort_order'>
): Promise<Room> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

async function updateRoom(
  projectId: number,
  roomId: string,
  data: Partial<Pick<Room, 'name' | 'chamber_id' | 'sort_order'>>
): Promise<Room> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/rooms/${roomId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update room');
  return res.json();
}

async function deleteRoom(projectId: number, roomId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/rooms/${roomId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete room');
}

// Reference Point operations
async function createReferencePoint(
  projectId: number,
  roomId: string,
  data: Omit<ReferencePoint, 'id' | 'room_id' | 'created_at' | 'latest_reading'>
): Promise<ReferencePoint> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/drying/rooms/${roomId}/reference-points`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error('Failed to create reference point');
  return res.json();
}

async function deleteReferencePoint(
  projectId: number,
  roomId: string,
  pointId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/drying/rooms/${roomId}/reference-points/${pointId}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error('Failed to delete reference point');
}

// Equipment operations
async function createEquipment(
  projectId: number,
  roomId: string,
  equipmentType: string
): Promise<Equipment> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/rooms/${roomId}/equipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipment_type: equipmentType }),
  });
  if (!res.ok) throw new Error('Failed to create equipment');
  return res.json();
}

async function deleteEquipment(
  projectId: number,
  roomId: string,
  equipmentId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/drying/rooms/${roomId}/equipment/${equipmentId}`,
    { method: 'DELETE' }
  );
  if (!res.ok) throw new Error('Failed to delete equipment');
}

// Previous Equipment Counts (for defaulting on day 2+)
async function fetchPreviousEquipmentCounts(
  projectId: number,
  date: string
): Promise<PreviousEquipmentCount[]> {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/drying/previous-equipment-counts?date=${date}`
  );
  if (!res.ok) throw new Error('Failed to fetch previous equipment counts');
  return res.json();
}

// Daily Entry operations
async function saveDailyEntry(
  projectId: number,
  data: DailyEntryRequest
): Promise<DailyEntryResponse> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/daily-entry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save daily entry');
  return res.json();
}

async function fetchDailyLog(projectId: number, date: string): Promise<DailyLog | null> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/daily-logs/${date}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch daily log');
  return res.json();
}

// GPP Calculation (client-side fallback or server validation)
async function calculateGPP(
  tempF: number,
  rhPercent: number,
  pressurePsia: number = 14.696
): Promise<{ gpp: number; condition: string; condition_level: ConditionLevel }> {
  const res = await fetch(`${API_BASE}/drying/calculate-gpp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ temp_f: tempF, rh_percent: rhPercent, pressure_psia: pressurePsia }),
  });
  if (!res.ok) throw new Error('Failed to calculate GPP');
  return res.json();
}

// Material Baseline operations
async function fetchMaterialBaselines(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/drying/material-baselines`);
  if (!res.ok) throw new Error('Failed to fetch material baselines');
  const data = await res.json();
  return data.baselines;
}

async function saveMaterialBaseline(
  materialCode: string,
  baseline: number
): Promise<MaterialBaseline> {
  const res = await fetch(`${API_BASE}/drying/material-baselines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ material_code: materialCode, baseline }),
  });
  if (!res.ok) throw new Error('Failed to save material baseline');
  return res.json();
}

// Fetch readings for a specific date
async function fetchReadingsForDate(
  projectId: number,
  date: string
): Promise<Record<string, number | null>> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/readings?date=${date}`);
  if (!res.ok) throw new Error('Failed to fetch readings for date');
  const data = await res.json();
  return data.readings;
}

// Media record type (returned from report generation)
export interface MediaRecord {
  id: number;
  project_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  caption?: string;
  uploaded_at?: string;
}

// Generate drying report PDF
async function generateDryingReport(projectId: number): Promise<MediaRecord> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/drying/report`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to generate report');
  }
  return res.json();
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const dryingKeys = {
  all: ['drying'] as const,
  log: (projectId: number) => [...dryingKeys.all, 'log', projectId] as const,
  dailyLog: (projectId: number, date: string) =>
    [...dryingKeys.all, 'daily', projectId, date] as const,
  previousEquipmentCounts: (projectId: number, date: string) =>
    [...dryingKeys.all, 'previousEquipmentCounts', projectId, date] as const,
  readingsForDate: (projectId: number, date: string) =>
    [...dryingKeys.all, 'readings', projectId, date] as const,
  materialBaselines: () => [...dryingKeys.all, 'materialBaselines'] as const,
};

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch the full drying log for a project.
 */
export function useDryingLog(projectId: number) {
  return useQuery({
    queryKey: dryingKeys.log(projectId),
    queryFn: () => fetchDryingLog(projectId),
    enabled: projectId > 0,
  });
}

/**
 * Create a new drying setup from wizard.
 */
export function useCreateDryingSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: Omit<DryingSetupRequest, 'job_id'>;
    }) => createDryingSetup(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Update drying log settings.
 */
export function useUpdateDryingLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: Partial<Pick<DryingLog, 'start_date' | 'end_date' | 'status'>>;
    }) => updateDryingLog(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Delete drying log and all related data.
 */
export function useDeleteDryingLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) => deleteDryingLog(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Create a new chamber.
 */
export function useCreateChamber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: Pick<Chamber, 'name' | 'chamber_type' | 'sort_order'>;
    }) => createChamber(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Update a chamber.
 */
export function useUpdateChamber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      chamberId,
      data,
    }: {
      projectId: number;
      chamberId: string;
      data: Partial<Pick<Chamber, 'name' | 'chamber_type' | 'sort_order'>>;
    }) => updateChamber(projectId, chamberId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Delete a chamber.
 */
export function useDeleteChamber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, chamberId }: { projectId: number; chamberId: string }) =>
      deleteChamber(projectId, chamberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Create a new room.
 */
export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: Pick<Room, 'name' | 'chamber_id' | 'sort_order'>;
    }) => createRoom(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Update a room.
 */
export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      roomId,
      data,
    }: {
      projectId: number;
      roomId: string;
      data: Partial<Pick<Room, 'name' | 'chamber_id' | 'sort_order'>>;
    }) => updateRoom(projectId, roomId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Delete a room.
 */
export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, roomId }: { projectId: number; roomId: string }) =>
      deleteRoom(projectId, roomId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Create a reference point.
 */
export function useCreateReferencePoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      roomId,
      data,
    }: {
      projectId: number;
      roomId: string;
      data: Omit<ReferencePoint, 'id' | 'room_id' | 'created_at' | 'latest_reading'>;
    }) => createReferencePoint(projectId, roomId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Delete a reference point.
 */
export function useDeleteReferencePoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      roomId,
      pointId,
    }: {
      projectId: number;
      roomId: string;
      pointId: string;
    }) => deleteReferencePoint(projectId, roomId, pointId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Create equipment for a room.
 */
export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      roomId,
      equipmentType,
    }: {
      projectId: number;
      roomId: string;
      equipmentType: string;
    }) => createEquipment(projectId, roomId, equipmentType),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Delete equipment.
 */
export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      roomId,
      equipmentId,
    }: {
      projectId: number;
      roomId: string;
      equipmentId: string;
    }) => deleteEquipment(projectId, roomId, equipmentId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
    },
  });
}

/**
 * Save daily entry (readings, counts, atmospheric, notes).
 */
export function useSaveDailyEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: DailyEntryRequest;
    }) => saveDailyEntry(projectId, data),
    onSuccess: (_, { projectId, data }) => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.log(projectId) });
      queryClient.invalidateQueries({ queryKey: dryingKeys.dailyLog(projectId, data.log_date) });
    },
  });
}

/**
 * Fetch daily log for a specific date.
 */
export function useDailyLog(projectId: number, date: string) {
  return useQuery({
    queryKey: dryingKeys.dailyLog(projectId, date),
    queryFn: () => fetchDailyLog(projectId, date),
    enabled: projectId > 0 && !!date,
  });
}

/**
 * Fetch previous day's equipment counts for a given date.
 * Used to pre-populate equipment counts on new visits (day 2+).
 *
 * @param projectId - The project ID
 * @param date - The date for which to get previous counts (YYYY-MM-DD)
 * @param enabled - Whether to enable the query (e.g., only for new visits)
 */
export function usePreviousEquipmentCounts(
  projectId: number,
  date: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: dryingKeys.previousEquipmentCounts(projectId, date),
    queryFn: () => fetchPreviousEquipmentCounts(projectId, date),
    enabled: enabled && projectId > 0 && !!date,
  });
}

/**
 * Fetch moisture readings for a specific date.
 * Returns: {reference_point_id: reading_value, ...}
 */
export function useReadingsForDate(projectId: number, date: string) {
  return useQuery({
    queryKey: dryingKeys.readingsForDate(projectId, date),
    queryFn: () => fetchReadingsForDate(projectId, date),
    enabled: projectId > 0 && !!date,
  });
}

/**
 * Calculate GPP via API.
 */
export function useCalculateGPP() {
  return useMutation({
    mutationFn: ({
      tempF,
      rhPercent,
      pressurePsia,
    }: {
      tempF: number;
      rhPercent: number;
      pressurePsia?: number;
    }) => calculateGPP(tempF, rhPercent, pressurePsia),
  });
}

/**
 * Fetch custom material baselines.
 * Returns a map of material_code -> baseline value.
 */
export function useMaterialBaselines() {
  return useQuery({
    queryKey: dryingKeys.materialBaselines(),
    queryFn: fetchMaterialBaselines,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Save a custom material baseline.
 * When user changes baseline for a material, it saves to DB for future use.
 */
export function useUpdateMaterialBaseline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      materialCode,
      baseline,
    }: {
      materialCode: string;
      baseline: number;
    }) => saveMaterialBaseline(materialCode, baseline),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dryingKeys.materialBaselines() });
    },
  });
}

/**
 * Generate a drying report PDF.
 * Creates a professional report with all drying log data and saves it to media.
 */
export function useGenerateDryingReport(projectId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateDryingReport(projectId),
    onSuccess: () => {
      // Invalidate media cache so Documents tab updates
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'media'] });
    },
  });
}
