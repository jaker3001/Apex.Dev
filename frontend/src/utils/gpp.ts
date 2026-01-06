/**
 * GPP (Grains per Pound) Calculator
 *
 * Uses IAPWS formulas for psychrometric calculations.
 * GPP is a key metric for water damage restoration - it indicates
 * the moisture content in the air.
 *
 * Reference levels:
 * - < 40: Low (Good drying conditions)
 * - 40-60: Moderate (Comfortable)
 * - 60-100: High (Active drying needed)
 * - 100-135: Very High (Aggressive drying required)
 * - > 135: Near Saturation (Check for ongoing water intrusion)
 */

export type ConditionLevel = 'good' | 'moderate' | 'high' | 'very_high' | 'critical';

export interface GppResult {
  gpp: number;
  condition: string;
  conditionLevel: ConditionLevel;
}

/**
 * Calculate GPP from temperature and relative humidity.
 *
 * @param tempF - Temperature in Fahrenheit
 * @param rhPercent - Relative humidity as a percentage (0-100)
 * @param pressurePsia - Atmospheric pressure in psia (default: 14.696 at sea level)
 * @returns GPP value rounded to 1 decimal place
 */
export function calculateGPP(
  tempF: number,
  rhPercent: number,
  pressurePsia: number = 14.696
): number {
  // Step 1: Convert temperature to Rankine
  const tempR = tempF + 459.67;

  // Step 2: Calculate saturation vapor pressure (IAPWS formula)
  const lnPws =
    -10440.397 / tempR -
    11.29465 -
    0.027022355 * tempR +
    0.00001289036 * Math.pow(tempR, 2) -
    0.0000000024780681 * Math.pow(tempR, 3) +
    6.5459673 * Math.log(tempR);

  // Convert from natural log to actual pressure
  const pws = Math.exp(lnPws);

  // Step 3: Calculate actual vapor pressure from relative humidity
  const pw = (rhPercent / 100) * pws;

  // Step 4: Calculate humidity ratio
  // Avoid division by zero
  const denominator = pressurePsia - pw;
  const w = 0.62198 * pw / (denominator > 0 ? denominator : 0.001);

  // Step 5: Convert to grains per pound
  const gpp = w * 7000;

  // Round to 1 decimal place
  return Math.round(gpp * 10) / 10;
}

/**
 * Assess moisture condition based on GPP value.
 */
export function assessMoistureCondition(gpp: number): string {
  if (gpp < 40) return 'Low (Good drying)';
  if (gpp < 60) return 'Moderate (Comfortable)';
  if (gpp < 100) return 'High (Active drying needed)';
  if (gpp < 135) return 'Very High (Aggressive drying required)';
  return 'Near Saturation (Check for ongoing water intrusion)';
}

/**
 * Get condition level for UI styling.
 */
export function getConditionLevel(gpp: number): ConditionLevel {
  if (gpp < 40) return 'good';
  if (gpp < 60) return 'moderate';
  if (gpp < 100) return 'high';
  if (gpp < 135) return 'very_high';
  return 'critical';
}

/**
 * Calculate GPP with full assessment.
 */
export function calculateGPPWithAssessment(
  tempF: number,
  rhPercent: number,
  pressurePsia: number = 14.696
): GppResult {
  const gpp = calculateGPP(tempF, rhPercent, pressurePsia);
  return {
    gpp,
    condition: assessMoistureCondition(gpp),
    conditionLevel: getConditionLevel(gpp),
  };
}

/**
 * Validate temperature and humidity inputs.
 * @returns Error message if invalid, null if valid
 */
export function validateInputs(tempF: number, rhPercent: number): string | null {
  if (tempF < 32 || tempF > 120) {
    return `Temperature ${tempF}°F is out of normal range (32-120°F)`;
  }
  if (rhPercent < 0 || rhPercent > 100) {
    return `Relative humidity ${rhPercent}% is out of valid range (0-100%)`;
  }
  return null;
}

/**
 * Get color class for GPP condition level.
 */
export function getConditionColor(level: ConditionLevel): string {
  switch (level) {
    case 'good':
      return 'text-green-400';
    case 'moderate':
      return 'text-yellow-400';
    case 'high':
      return 'text-orange-400';
    case 'very_high':
      return 'text-red-400';
    case 'critical':
      return 'text-red-600';
  }
}

/**
 * Get background color class for GPP condition level.
 */
export function getConditionBgColor(level: ConditionLevel): string {
  switch (level) {
    case 'good':
      return 'bg-green-500/20 border-green-500/30';
    case 'moderate':
      return 'bg-yellow-500/20 border-yellow-500/30';
    case 'high':
      return 'bg-orange-500/20 border-orange-500/30';
    case 'very_high':
      return 'bg-red-500/20 border-red-500/30';
    case 'critical':
      return 'bg-red-600/30 border-red-600/40';
  }
}

/**
 * Material codes used for reference points.
 * Material composition matters more than building component.
 */
export const MATERIAL_CODES = {
  D: 'Drywall/Sheetrock',
  C: 'Carpet',
  CP: 'Carpet Pad',
  HW: 'Hardwood',
  LAM: 'Laminate',
  ENG: 'Engineered Hardwood',
  FRM: 'Framing',
  INS: 'Insulation',
  CAB: 'Cabinet',
  MDF: 'MDF (Medium-Density Fiberboard)',
  OSB: 'OSB (Oriented Strand Board)',
  PLY: 'Plywood',
  CONC: 'Concrete',
  TL: 'Tile',
  OTHER: 'Other',
} as const;

export type MaterialCode = keyof typeof MATERIAL_CODES;

/**
 * Default baselines for different materials.
 */
export const DEFAULT_BASELINES: Record<MaterialCode, number> = {
  D: 10,
  C: 8,
  CP: 8,
  HW: 10,
  LAM: 10,
  ENG: 10,
  FRM: 12,
  INS: 8,
  CAB: 10,
  MDF: 10,
  OSB: 12,
  PLY: 12,
  CONC: 4,
  TL: 10,
  OTHER: 10,
};

/**
 * Equipment types available for drying.
 */
export const EQUIPMENT_TYPES = [
  'LGR Dehumidifier',
  'XL Dehumidifier',
  'Air Mover',
  'Air Scrubber',
  'Heater',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

/**
 * Chamber types for drying zones.
 */
export const CHAMBER_TYPES = ['Containment', 'Open', 'Cavity'] as const;

export type ChamberType = (typeof CHAMBER_TYPES)[number];
