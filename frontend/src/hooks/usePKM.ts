import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeader } from './useAuth';

const API_BASE = import.meta.env.VITE_API_URL || '';

// =============================================================================
// TYPES
// =============================================================================

export interface FileSystemItem {
  type: 'file' | 'folder';
  name: string;
  path: string;
}

export interface NoteMetadata {
  id: number;
  user_id: number;
  file_path: string;
  title: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  links_to: string[];
  linked_from: string[];
  linked_jobs: string[];
  content_preview?: string;
}

export interface NoteContent extends NoteMetadata {
  content: string;
}

export interface FileTreeResponse {
  items: FileSystemItem[];
  total: number;
}

export interface NoteListResponse {
  notes: NoteMetadata[];
  total: number;
}

export interface SearchResponse {
  query: string;
  results: NoteMetadata[];
  total: number;
}

export interface BacklinksResponse {
  file_path: string;
  backlinks: NoteMetadata[];
  total: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchFileTree(): Promise<FileTreeResponse> {
  const res = await fetch(`${API_BASE}/api/pkm/tree`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch file tree');
  return res.json();
}

async function fetchNotes(params?: {
  folder?: string;
  limit?: number;
  offset?: number;
}): Promise<NoteListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.folder) searchParams.set('folder', params.folder);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));

  const queryString = searchParams.toString();
  const url = `${API_BASE}/api/pkm/notes${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

async function fetchNote(filePath: string): Promise<NoteContent> {
  const res = await fetch(`${API_BASE}/api/pkm/notes/${encodeURIComponent(filePath)}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch note');
  return res.json();
}

async function createNote(data: { file_path: string; content: string }): Promise<NoteContent> {
  const res = await fetch(`${API_BASE}/api/pkm/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to create note');
  }
  return res.json();
}

async function updateNote(filePath: string, content: string): Promise<NoteContent> {
  const res = await fetch(`${API_BASE}/api/pkm/notes/${encodeURIComponent(filePath)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update note');
  return res.json();
}

async function deleteNote(filePath: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/pkm/notes/${encodeURIComponent(filePath)}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete note');
}

async function searchNotes(query: string, limit = 20): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/api/pkm/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error('Failed to search notes');
  return res.json();
}

async function fetchBacklinks(filePath: string): Promise<BacklinksResponse> {
  const res = await fetch(`${API_BASE}/api/pkm/backlinks/${encodeURIComponent(filePath)}`, {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch backlinks');
  return res.json();
}

async function createFolder(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/pkm/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error('Failed to create folder');
}

async function deleteFolder(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/pkm/folders/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete folder');
}

async function reindexNotes(): Promise<{ indexed_count: number; message: string }> {
  const res = await fetch(`${API_BASE}/api/pkm/reindex`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to reindex notes');
  return res.json();
}

// =============================================================================
// HOOKS
// =============================================================================

export function useFileTree() {
  return useQuery({
    queryKey: ['pkm', 'tree'],
    queryFn: fetchFileTree,
  });
}

export function useNotes(params?: { folder?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['pkm', 'notes', params],
    queryFn: () => fetchNotes(params),
  });
}

export function useNote(filePath: string | null) {
  return useQuery({
    queryKey: ['pkm', 'note', filePath],
    queryFn: () => fetchNote(filePath!),
    enabled: !!filePath,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkm'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ filePath, content }: { filePath: string; content: string }) =>
      updateNote(filePath, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pkm', 'note', variables.filePath] });
      queryClient.invalidateQueries({ queryKey: ['pkm', 'notes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkm'] });
    },
  });
}

export function useSearchNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ query, limit }: { query: string; limit?: number }) =>
      searchNotes(query, limit),
  });
}

export function useBacklinks(filePath: string | null) {
  return useQuery({
    queryKey: ['pkm', 'backlinks', filePath],
    queryFn: () => fetchBacklinks(filePath!),
    enabled: !!filePath,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkm', 'tree'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkm', 'tree'] });
    },
  });
}

export function useReindexNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reindexNotes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkm'] });
    },
  });
}
