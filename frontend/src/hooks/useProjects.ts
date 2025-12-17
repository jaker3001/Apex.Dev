import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = 'http://localhost:8000/api';

// Types
export interface Project {
  id: number;
  job_number: string;
  status: 'lead' | 'pending' | 'active' | 'complete' | 'closed' | 'cancelled';
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  year_built?: number;
  structure_type?: string;
  square_footage?: number;
  num_stories?: number;
  damage_source?: string;
  damage_category?: string;
  damage_class?: string;
  date_of_loss?: string;
  date_contacted?: string;
  inspection_date?: string;
  work_auth_signed_date?: string;
  start_date?: string;
  cos_date?: string;
  completion_date?: string;
  claim_number?: string;
  policy_number?: string;
  deductible?: number;
  client_id?: number;
  insurance_org_id?: number;
  notes_text?: string;
  created_at?: string;
  updated_at?: string;
  // From view (or auto-created on project creation)
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  insurance_carrier?: string;
}

export interface Client {
  id: number;
  name: string;
  client_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Organization {
  id: number;
  name: string;
  org_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  has_msa: boolean;
  msa_signed_date?: string;
  msa_expiration_date?: string;
  trade_category?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
}

export interface ProjectContact {
  id: number;
  organization_id?: number;
  first_name: string;
  last_name: string;
  role?: string;
  phone?: string;
  phone_extension?: string;
  email?: string;
  notes?: string;
  is_active?: number;
  created_at?: string;
  organization_name?: string;
  org_type?: string;
  role_on_project?: string;
  assignment_id?: number;
}

export interface Note {
  id: number;
  project_id: number;
  author_id?: number;
  note_type?: string;
  subject?: string;
  content: string;
  created_at?: string;
  author_name?: string;
}

export interface Estimate {
  id: number;
  project_id: number;
  version: number;
  estimate_type?: string;
  amount?: number;
  original_amount?: number;  // The initial submission amount for reduction tracking
  status: string;
  submitted_date?: string;
  approved_date?: string;
  xactimate_file_path?: string;
  notes?: string;
  created_at?: string;
}

export interface Payment {
  id: number;
  project_id: number;
  estimate_id?: number;
  invoice_number?: string;
  amount: number;
  payment_type?: string;
  payment_method?: string;
  check_number?: string;
  received_date?: string;
  deposited_date?: string;
  notes?: string;
  created_at?: string;
}

export interface Media {
  id: number;
  project_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  caption?: string;
  uploaded_by?: number;
  uploaded_at?: string;
  uploaded_by_name?: string;
}

export interface ProjectFull extends Project {
  client?: Client;
  carrier?: Organization;
  contacts: ProjectContact[];
  notes: Note[];
  estimates: Estimate[];
  payments: Payment[];
  media: Media[];
}

export interface ProjectStats {
  total: number;
  by_status: Record<string, number>;
  active: number;
  lead: number;
  complete: number;
}

export interface ProjectsListResponse {
  projects: Project[];
  total: number;
}

// API functions
async function fetchProjects(status?: string): Promise<ProjectsListResponse> {
  const url = status
    ? `${API_BASE}/projects?status=${status}&limit=100`
    : `${API_BASE}/projects?limit=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

async function fetchProjectStats(): Promise<ProjectStats> {
  const res = await fetch(`${API_BASE}/projects/stats`);
  if (!res.ok) throw new Error('Failed to fetch project stats');
  return res.json();
}

async function fetchProject(id: number): Promise<ProjectFull> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

async function createProject(data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create project');
  }
  return res.json();
}

async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json();
}

async function updateProjectStatus(id: number, status: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}/status?status=${status}`, {
    method: 'PATCH',
  });
  if (!res.ok) throw new Error('Failed to update project status');
}

async function createNote(projectId: number, content: string, noteType?: string, subject?: string): Promise<Note> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, content, note_type: noteType, subject }),
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

// Hooks

export function useProjects(status?: string) {
  return useQuery({
    queryKey: ['projects', status],
    queryFn: () => fetchProjects(status),
  });
}

export function useProjectStats() {
  return useQuery({
    queryKey: ['projectStats'],
    queryFn: fetchProjectStats,
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: id > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projectStats'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) => updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projectStats'] });
    },
  });
}

export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateProjectStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projectStats'] });
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, content, noteType, subject }: { projectId: number; content: string; noteType?: string; subject?: string }) =>
      createNote(projectId, content, noteType, subject),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// =============================================================================
// ESTIMATE HOOKS
// =============================================================================

async function uploadEstimateFile(
  projectId: number,
  file: File
): Promise<{ file_path: string; file_name: string; file_size: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/projects/${projectId}/estimates/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to upload file');
  }
  return res.json();
}

export function useUploadEstimateFile() {
  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: number; file: File }) =>
      uploadEstimateFile(projectId, file),
  });
}

async function createEstimate(
  projectId: number,
  data: {
    version?: number;
    amount?: number;
    estimate_type?: string;
    status?: string;
    submitted_date?: string;
    approved_date?: string;
    notes?: string;
  }
): Promise<Estimate> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/estimates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create estimate');
  return res.json();
}

export function useCreateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: Partial<Estimate> }) =>
      createEstimate(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

async function updateEstimate(
  projectId: number,
  estimateId: number,
  data: Partial<Estimate>
): Promise<Estimate> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/estimates/${estimateId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update estimate');
  return res.json();
}

export function useUpdateEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, estimateId, data }: { projectId: number; estimateId: number; data: Partial<Estimate> }) =>
      updateEstimate(projectId, estimateId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// =============================================================================
// PAYMENT HOOKS
// =============================================================================

async function createPayment(
  projectId: number,
  data: {
    amount: number;
    payment_method?: string;
    payment_type?: string;
    check_number?: string;
    received_date?: string;
    deposited_date?: string;
    invoice_number?: string;
    estimate_id?: number;
    notes?: string;
  }
): Promise<Payment> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create payment');
  return res.json();
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: { amount: number; payment_method?: string; payment_type?: string; check_number?: string; received_date?: string; deposited_date?: string; invoice_number?: string; estimate_id?: number; notes?: string; } }) =>
      createPayment(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// =============================================================================
// PROJECT CONTACT HOOKS
// =============================================================================

async function assignContact(
  projectId: number,
  contactId: number,
  roleOnProject?: string
): Promise<ProjectContact> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact_id: contactId, role_on_project: roleOnProject }),
  });
  if (!res.ok) throw new Error('Failed to assign contact');
  return res.json();
}

async function removeContact(projectId: number, contactId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/contacts/${contactId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove contact');
}

export function useAssignContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, contactId, roleOnProject }: { projectId: number; contactId: number; roleOnProject?: string }) =>
      assignContact(projectId, contactId, roleOnProject),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, contactId }: { projectId: number; contactId: number }) =>
      removeContact(projectId, contactId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// =============================================================================
// MEDIA HOOKS
// =============================================================================

async function createMedia(
  projectId: number,
  data: {
    file_name: string;
    file_path: string;
    file_type?: string;
    file_size?: number;
    caption?: string;
    uploaded_by?: number;
  }
): Promise<Media> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, ...data }),
  });
  if (!res.ok) throw new Error('Failed to create media');
  return res.json();
}

async function deleteMedia(projectId: number, mediaId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/media/${mediaId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete media');
}

export function useCreateMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: {
        file_name: string;
        file_path: string;
        file_type?: string;
        file_size?: number;
        caption?: string;
      };
    }) => createMedia(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, mediaId }: { projectId: number; mediaId: number }) =>
      deleteMedia(projectId, mediaId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

// =============================================================================
// JOB NUMBER GENERATION
// =============================================================================

export interface GeneratedJobNumber {
  job_number: string;
  job_type: string;
  acronym: string;
}

async function generateJobNumber(jobType: string): Promise<GeneratedJobNumber> {
  const res = await fetch(`${API_BASE}/projects/next-job-number?job_type=${encodeURIComponent(jobType)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to generate job number');
  }
  return res.json();
}

export function useGenerateJobNumber() {
  return useMutation({
    mutationFn: (jobType: string) => generateJobNumber(jobType),
  });
}

// Helper to group projects by status
export function groupProjectsByStatus(projects: Project[]): Record<string, Project[]> {
  const groups: Record<string, Project[]> = {
    active: [],
    pending: [],
    lead: [],
    complete: [],
    closed: [],
    cancelled: [],
  };

  projects.forEach((project) => {
    if (groups[project.status]) {
      groups[project.status].push(project);
    }
  });

  // Sort each group by start_date (newest first)
  Object.keys(groups).forEach((status) => {
    groups[status].sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return dateB - dateA; // Descending (newest first)
    });
  });

  return groups;
}
