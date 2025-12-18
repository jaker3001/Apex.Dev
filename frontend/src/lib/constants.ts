/**
 * Centralized constants for job and estimate types.
 * Used throughout the application for consistency.
 */

export const JOB_TYPES = [
  { value: 'mitigation', label: 'Mitigation', acronym: 'MIT' },
  { value: 'reconstruction', label: 'Reconstruction', acronym: 'RPR' },
  { value: 'remodel', label: 'Remodel', acronym: 'RMD' },
  { value: 'abatement', label: 'Abatement', acronym: 'ABT' },
  { value: 'remediation', label: 'Remediation', acronym: 'REM' },
] as const;

// Estimate types match job types
export const ESTIMATE_TYPES = JOB_TYPES;

export type JobTypeValue = (typeof JOB_TYPES)[number]['value'];
export type JobTypeAcronym = (typeof JOB_TYPES)[number]['acronym'];

/**
 * Get the acronym for a job/estimate type value.
 * @param value - The type value (e.g., 'mitigation')
 * @returns The acronym (e.g., 'MIT') or first 3 chars uppercase if not found
 */
export function getTypeAcronym(value: string | null | undefined): string {
  if (!value) return '';
  const type = JOB_TYPES.find((t) => t.value === value);
  return type?.acronym ?? value.toUpperCase().slice(0, 3);
}

/**
 * Get the full label for a job/estimate type value.
 * @param value - The type value (e.g., 'mitigation')
 * @returns The label (e.g., 'Mitigation') or the value capitalized if not found
 */
export function getTypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  const type = JOB_TYPES.find((t) => t.value === value);
  return type?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
}
