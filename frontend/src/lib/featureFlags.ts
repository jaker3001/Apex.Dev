/**
 * Feature Flags System
 *
 * Environment-based feature flags for gradual rollout of new features.
 * Allows enabling/disabling features without code changes.
 */

/**
 * Feature flag configuration
 */
export const featureFlags = {
  // Supabase integration
  supabase: {
    enabled: import.meta.env.VITE_FEATURE_SUPABASE_ENABLED === 'true',
    description: 'Enable Supabase client for direct database access',
  },

  // Tasks feature (GTD system)
  tasks: {
    enabled: import.meta.env.VITE_FEATURE_TASKS_ENABLED !== 'false', // Default true
    description: 'Enable Tasks (GTD) feature',
    subroutes: {
      kanban: true,
      calendar: false, // Not yet implemented
    },
  },

  // Projects feature (PARA system)
  projects: {
    enabled: import.meta.env.VITE_FEATURE_PROJECTS_ENABLED !== 'false', // Default true
    description: 'Enable Projects (PARA) feature',
    subroutes: {
      kanban: true,
      timeline: false, // Not yet implemented
    },
  },

  // Notes feature (PKM system)
  notes: {
    enabled: import.meta.env.VITE_FEATURE_NOTES_ENABLED !== 'false', // Default true
    description: 'Enable Notes (PKM) feature',
    subroutes: {
      graph: false, // Not yet implemented
      canvas: false, // Not yet implemented
    },
  },

  // Calendar integration
  calendar: {
    enabled: import.meta.env.VITE_FEATURE_CALENDAR_ENABLED === 'true',
    description: 'Enable Calendar integration',
    googleCalendar: false, // Not yet implemented
  },

  // Real-time features
  realtime: {
    enabled: import.meta.env.VITE_FEATURE_SUPABASE_ENABLED === 'true',
    description: 'Enable real-time subscriptions',
    tasks: true,
    conversations: true,
    notifications: true,
  },

  // AI features
  ai: {
    enabled: true,
    description: 'AI assistant features',
    modelSwitching: true,
    streaming: true,
  },

  // Experimental features
  experimental: {
    commandPalette: false,
    voiceInput: false,
    collaboration: false,
  },
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  const config = featureFlags[feature];
  if ('enabled' in config) {
    return config.enabled;
  }
  return false;
}

/**
 * Check if a sub-feature is enabled
 */
export function isSubFeatureEnabled(
  feature: keyof typeof featureFlags,
  subFeature: string
): boolean {
  const featureConfig = featureFlags[feature];

  if (!('enabled' in featureConfig) || !featureConfig.enabled) {
    return false;
  }

  if ('subroutes' in featureConfig) {
    return (featureConfig.subroutes as Record<string, boolean>)[subFeature] ?? false;
  }

  return false;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(featureFlags)
    .filter(([_, config]) => {
      if ('enabled' in config) {
        return config.enabled;
      }
      return false;
    })
    .map(([key]) => key);
}

/**
 * Development helper: Log feature flags status
 */
export function logFeatureFlags() {
  if (import.meta.env.DEV) {
    console.group('Feature Flags');
    Object.entries(featureFlags).forEach(([key, config]) => {
      if ('enabled' in config && 'description' in config) {
        console.log(`${key}: ${config.enabled ? '✓' : '✗'} - ${config.description}`);
      }
    });
    console.groupEnd();
  }
}

// Log flags in development
if (import.meta.env.DEV) {
  logFeatureFlags();
}
