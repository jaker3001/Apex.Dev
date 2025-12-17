import { useState, useMemo } from 'react';
import { Search, Plus, User, Building, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useContacts, useOrganizations, useCreateContact, type Contact } from '@/hooks/useContacts';
import { useAssignContact } from '@/hooks/useProjects';

interface AddContactModalProps {
  projectId: number;
  existingContactIds: number[];
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'primary_adjuster', label: 'Primary Adjuster' },
  { value: 'field_adjuster', label: 'Field Adjuster' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'technician', label: 'Technician' },
  { value: 'claims_rep', label: 'Claims Rep' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'other', label: 'Other' },
];

type Mode = 'select' | 'create';

export function AddContactModal({ projectId, existingContactIds, onClose }: AddContactModalProps) {
  const [mode, setMode] = useState<Mode>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [roleOnProject, setRoleOnProject] = useState('');

  // Hooks for existing contacts
  const { data: contactsData, isLoading: contactsLoading } = useContacts(searchQuery);
  const assignContact = useAssignContact();

  // Hooks for creating new contact
  const { data: orgsData } = useOrganizations();
  const createContact = useCreateContact();

  // New contact form state
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    organization_id: '',
    role: '',
    phone: '',
    email: '',
    notes: '',
  });

  // Filter out already assigned contacts
  const availableContacts = useMemo(() => {
    if (!contactsData?.contacts) return [];
    return contactsData.contacts.filter((c) => !existingContactIds.includes(c.id));
  }, [contactsData, existingContactIds]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleAssignExisting = async () => {
    if (!selectedContact) return;

    try {
      await assignContact.mutateAsync({
        projectId,
        contactId: selectedContact.id,
        roleOnProject: roleOnProject || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to assign contact:', error);
    }
  };

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newContact.first_name || !newContact.last_name) return;

    try {
      // First create the contact
      const created = await createContact.mutateAsync({
        first_name: newContact.first_name,
        last_name: newContact.last_name,
        organization_id: newContact.organization_id ? parseInt(newContact.organization_id) : undefined,
        role: newContact.role || undefined,
        phone: newContact.phone || undefined,
        email: newContact.email || undefined,
        notes: newContact.notes || undefined,
      });

      // Then assign to project
      await assignContact.mutateAsync({
        projectId,
        contactId: created.id,
        roleOnProject: roleOnProject || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Failed to create and assign contact:', error);
    }
  };

  const handleNewContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewContact((prev) => ({ ...prev, [name]: value }));
  };

  const organizations = orgsData?.organizations || [];
  const isLoading = assignContact.isPending || createContact.isPending;

  return (
    <BaseModal
      title={mode === 'select' ? 'Add Contact to Job' : 'Create New Contact'}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('select')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'select'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Select Existing
        </button>
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'create'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <Plus className="h-4 w-4 inline mr-1" />
          Create New
        </button>
      </div>

      {mode === 'select' ? (
        /* SELECT EXISTING CONTACT MODE */
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Contact List */}
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {contactsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading contacts...</div>
            ) : availableContacts.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? 'No contacts found' : 'No available contacts'}
              </div>
            ) : (
              availableContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 border-b last:border-b-0 transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-primary/10 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{contact.full_name || `${contact.first_name} ${contact.last_name}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.organization_name || contact.role || 'No organization'}
                      </p>
                    </div>
                  </div>
                  {selectedContact?.id === contact.id && (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Selected Contact Details */}
          {selectedContact && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="font-medium">{selectedContact.full_name || `${selectedContact.first_name} ${selectedContact.last_name}`}</p>
              {selectedContact.organization_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {selectedContact.organization_name}
                </p>
              )}
              {selectedContact.phone && <p className="text-sm">{selectedContact.phone}</p>}
              {selectedContact.email && <p className="text-sm">{selectedContact.email}</p>}
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Role on this Job</label>
            <select
              value={roleOnProject}
              onChange={(e) => setRoleOnProject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select role...</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAssignExisting} disabled={!selectedContact || isLoading}>
              {isLoading ? 'Adding...' : 'Add to Job'}
            </Button>
          </div>
        </div>
      ) : (
        /* CREATE NEW CONTACT MODE */
        <form onSubmit={handleCreateAndAssign} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={newContact.first_name}
                onChange={handleNewContactChange}
                required
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={newContact.last_name}
                onChange={handleNewContactChange}
                required
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Organization</label>
            <select
              name="organization_id"
              value={newContact.organization_id}
              onChange={handleNewContactChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.org_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role at Organization</label>
            <input
              type="text"
              name="role"
              value={newContact.role}
              onChange={handleNewContactChange}
              placeholder="e.g., Field Adjuster, Claims Manager"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={newContact.phone}
                onChange={handleNewContactChange}
                placeholder="(801) 555-1234"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={newContact.email}
                onChange={handleNewContactChange}
                placeholder="email@example.com"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role on this Job</label>
            <select
              value={roleOnProject}
              onChange={(e) => setRoleOnProject(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select role...</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={newContact.notes}
              onChange={handleNewContactChange}
              rows={2}
              placeholder="Any notes about this contact..."
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newContact.first_name || !newContact.last_name || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create & Add to Job'}
            </Button>
          </div>
        </form>
      )}
    </BaseModal>
  );
}
