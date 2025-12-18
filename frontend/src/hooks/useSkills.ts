import { useState, useEffect, useCallback } from 'react';
import { getAuthHeader } from './useAuth';
import { API_BASE } from '../lib/api';

export interface Skill {
  id: number;
  name: string;
  description: string;
  input_type: string;
  output_type: string;
  instructions?: string;
  tools_allowed?: string[];
  created_date: string;
  times_used: number;
}

export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  input_type: string;
  output_type: string;
  instructions: string;
  tools_allowed: string[];
}

interface UseSkillsOptions {
  autoFetch?: boolean;
}

export function useSkills(options: UseSkillsOptions = {}) {
  const { autoFetch = true } = options;

  const [skills, setSkills] = useState<Skill[]>([]);
  const [templates, setTemplates] = useState<SkillTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('${API_BASE}/skills', {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch skills: ${response.statusText}`);
      }

      const data = await response.json();
      setSkills(data.skills || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('${API_BASE}/skills/templates', {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch skill templates: ${response.statusText}`);
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const createSkill = useCallback(async (skill: {
    name: string;
    description: string;
    input_type?: string;
    output_type?: string;
    instructions?: string;
    tools_allowed?: string[];
  }): Promise<Skill | null> => {
    try {
      const response = await fetch('${API_BASE}/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(skill),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create skill: ${response.statusText}`);
      }

      await fetchSkills();
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [fetchSkills]);

  const createFromTemplate = useCallback(async (templateId: string, name?: string): Promise<Skill | null> => {
    try {
      const url = name
        ? `${API_BASE}/skills/from-template/${templateId}?name=${encodeURIComponent(name)}`
        : `${API_BASE}/skills/from-template/${templateId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to create skill: ${response.statusText}`);
      }

      await fetchSkills();
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [fetchSkills]);

  const deleteSkill = useCallback(async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/skills/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete skill: ${response.statusText}`);
      }

      setSkills((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  const getSkill = useCallback((id: number): Skill | undefined => {
    return skills.find((s) => s.id === id);
  }, [skills]);

  useEffect(() => {
    if (autoFetch) {
      fetchSkills();
      fetchTemplates();
    }
  }, [autoFetch, fetchSkills, fetchTemplates]);

  return {
    skills,
    templates,
    isLoading,
    error,
    fetchSkills,
    fetchTemplates,
    createSkill,
    createFromTemplate,
    deleteSkill,
    getSkill,
  };
}
