/**
 * API client for Apex Assistant backend
 */

const API_BASE = 'http://localhost:8000/api';
const WS_BASE = 'ws://localhost:8000';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// Conversations
export const conversationsApi = {
  list: (params?: { limit?: number; offset?: number; active_only?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.active_only) searchParams.set('active_only', 'true');
    return apiFetch(`/conversations?${searchParams}`);
  },
  get: (id: number) => apiFetch(`/conversations/${id}`),
  resume: (id: number) => apiFetch(`/conversations/${id}/resume`, { method: 'POST' }),
};

// Agents
export const agentsApi = {
  list: (activeOnly = true) => apiFetch(`/agents?active_only=${activeOnly}`),
  get: (name: string) => apiFetch(`/agents/${name}`),
  create: (data: { name: string; description: string; capabilities?: string[] }) =>
    apiFetch('/agents', { method: 'POST', body: JSON.stringify(data) }),
  update: (name: string, data: object) =>
    apiFetch(`/agents/${name}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (name: string) =>
    apiFetch(`/agents/${name}`, { method: 'DELETE' }),
};

// Skills
export const skillsApi = {
  list: () => apiFetch('/skills'),
  templates: () => apiFetch('/skills/templates'),
  get: (id: number) => apiFetch(`/skills/${id}`),
  create: (data: object) =>
    apiFetch('/skills', { method: 'POST', body: JSON.stringify(data) }),
  createFromTemplate: (templateId: string, name?: string) =>
    apiFetch(`/skills/from-template/${templateId}${name ? `?name=${name}` : ''}`, { method: 'POST' }),
  update: (id: number, data: object) =>
    apiFetch(`/skills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch(`/skills/${id}`, { method: 'DELETE' }),
};

// MCP Servers
export const mcpApi = {
  list: (activeOnly = false) => apiFetch(`/mcp?active_only=${activeOnly}`),
  get: (name: string) => apiFetch(`/mcp/${name}`),
  create: (data: object) =>
    apiFetch('/mcp', { method: 'POST', body: JSON.stringify(data) }),
  update: (name: string, data: object) =>
    apiFetch(`/mcp/${name}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (name: string) =>
    apiFetch(`/mcp/${name}`, { method: 'DELETE' }),
  enable: (name: string) =>
    apiFetch(`/mcp/${name}/enable`, { method: 'POST' }),
  disable: (name: string) =>
    apiFetch(`/mcp/${name}/disable`, { method: 'POST' }),
};

// Analytics
export const analyticsApi = {
  overview: () => apiFetch('/analytics/overview'),
  categories: () => apiFetch('/analytics/categories'),
  complexity: () => apiFetch('/analytics/complexity'),
  tools: () => apiFetch('/analytics/tools'),
  automationCandidates: (status?: string, limit = 10) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (status) params.set('status', status);
    return apiFetch(`/analytics/automation-candidates?${params}`);
  },
  timeline: (days = 30) => apiFetch(`/analytics/timeline?days=${days}`),
  agents: () => apiFetch('/analytics/agents'),
};

// WebSocket for chat
export function createChatWebSocket(sessionId: string) {
  return new WebSocket(`${WS_BASE}/ws/chat/${sessionId}`);
}

export { API_BASE, WS_BASE };
