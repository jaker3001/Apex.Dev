import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/api';

// =============================================================================
// TYPES
// =============================================================================

export interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  organization_id?: number;
  organization_name?: string;
  role?: string;
  phone?: string;
  phone_extension?: string;
  email?: string;
  notes?: string;
  is_active?: number;
  created_at?: string;
}

export interface ContactCreate {
  first_name: string;
  last_name: string;
  organization_id?: number;
  role?: string;
  phone?: string;
  phone_extension?: string;
  email?: string;
  notes?: string;
}

export interface ContactsListResponse {
  contacts: Contact[];
  total: number;
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
  has_msa?: boolean;
  msa_signed_date?: string;
  msa_expiration_date?: string;
  trade_category?: string;
  notes?: string;
  is_active?: number;
  created_at?: string;
}

export interface OrganizationsListResponse {
  organizations: Organization[];
  total: number;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

async function fetchContacts(search?: string): Promise<ContactsListResponse> {
  const url = search
    ? `${API_BASE}/contacts?search=${encodeURIComponent(search)}`
    : `${API_BASE}/contacts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
}

async function fetchContact(id: number): Promise<Contact> {
  const res = await fetch(`${API_BASE}/contacts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch contact');
  return res.json();
}

async function createContact(data: ContactCreate): Promise<Contact> {
  const res = await fetch(`${API_BASE}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create contact');
  }
  return res.json();
}

async function fetchOrganizations(orgType?: string): Promise<OrganizationsListResponse> {
  const url = orgType
    ? `${API_BASE}/organizations?org_type=${encodeURIComponent(orgType)}`
    : `${API_BASE}/organizations`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch organizations');
  return res.json();
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch all contacts, optionally filtered by search query.
 */
export function useContacts(search?: string) {
  return useQuery({
    queryKey: ['contacts', search],
    queryFn: () => fetchContacts(search),
  });
}

/**
 * Fetch a single contact by ID.
 */
export function useContact(id: number) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => fetchContact(id),
    enabled: id > 0,
  });
}

/**
 * Create a new contact.
 */
export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactCreate) => createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

/**
 * Fetch all organizations, optionally filtered by type.
 */
export function useOrganizations(orgType?: string) {
  return useQuery({
    queryKey: ['organizations', orgType],
    queryFn: () => fetchOrganizations(orgType),
  });
}
