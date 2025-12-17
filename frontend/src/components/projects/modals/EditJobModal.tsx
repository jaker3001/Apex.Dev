import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useUpdateProject, useAssignContact, useRemoveContact, type ProjectFull } from '@/hooks/useProjects';
import { useOrganizations, useContacts } from '@/hooks/useContacts';
import { Check, X, UserPlus } from 'lucide-react';

interface EditJobModalProps {
  job: ProjectFull;
  onClose: () => void;
}

const DAMAGE_SOURCES = ['water', 'fire', 'smoke', 'mold', 'sewage', 'flood', 'storm', 'other'];
const DAMAGE_CATEGORIES = [
  { value: 'cat1', label: 'Cat 1 - Clean Water' },
  { value: 'cat2', label: 'Cat 2 - Gray Water' },
  { value: 'cat3', label: 'Cat 3 - Black Water' },
];
const DAMAGE_CLASSES = [
  { value: 'class1', label: 'Class 1 - Minimal' },
  { value: 'class2', label: 'Class 2 - Significant' },
  { value: 'class3', label: 'Class 3 - Extensive' },
  { value: 'class4', label: 'Class 4 - Specialty' },
];
const STRUCTURE_TYPES = ['residential', 'commercial', 'multi-family', 'industrial', 'other'];

export function EditJobModal({ job, onClose }: EditJobModalProps) {
  const updateProject = useUpdateProject();
  const assignContact = useAssignContact();
  const removeContact = useRemoveContact();
  const { data: orgsData } = useOrganizations('insurance_carrier');
  const { data: contactsData } = useContacts();
  const carriers = orgsData?.organizations || [];
  const allContacts = contactsData?.contacts || [];

  // Track currently assigned contacts (from job.contacts)
  const [assignedContactIds, setAssignedContactIds] = useState<number[]>(
    job.contacts?.map((c) => c.id) || []
  );
  const [contactSearch, setContactSearch] = useState('');

  const [formData, setFormData] = useState({
    job_number: job.job_number || '',
    // Client info (from the client relationship or view)
    client_name: job.client?.name || job.client_name || '',
    client_phone: job.client?.phone || job.client_phone || '',
    client_email: job.client?.email || job.client_email || '',
    // Property address
    address: job.address || '',
    city: job.city || '',
    state: job.state || 'UT',
    zip: job.zip || '',
    // Property details
    year_built: job.year_built?.toString() || '',
    structure_type: job.structure_type || '',
    square_footage: job.square_footage?.toString() || '',
    num_stories: job.num_stories?.toString() || '',
    // Damage info
    damage_source: job.damage_source || '',
    damage_category: job.damage_category || '',
    damage_class: job.damage_class || '',
    date_of_loss: job.date_of_loss || '',
    // Insurance
    insurance_org_id: job.carrier?.id?.toString() || '',
    claim_number: job.claim_number || '',
    policy_number: job.policy_number || '',
    deductible: job.deductible?.toString() || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactToggle = async (contactId: number) => {
    if (assignedContactIds.includes(contactId)) {
      // Remove contact
      try {
        await removeContact.mutateAsync({ projectId: job.id, contactId });
        setAssignedContactIds((prev) => prev.filter((id) => id !== contactId));
      } catch (err) {
        console.error('Failed to remove contact:', err);
      }
    } else {
      // Add contact
      try {
        await assignContact.mutateAsync({ projectId: job.id, contactId });
        setAssignedContactIds((prev) => [...prev, contactId]);
      } catch (err) {
        console.error('Failed to assign contact:', err);
      }
    }
  };

  // Filter contacts based on search
  const filteredContacts = allContacts.filter((contact) => {
    if (!contactSearch) return true;
    const search = contactSearch.toLowerCase();
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const org = contact.organization_name?.toLowerCase() || '';
    return fullName.includes(search) || org.includes(search);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateProject.mutateAsync({
        id: job.id,
        data: {
          job_number: formData.job_number || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
          year_built: formData.year_built ? parseInt(formData.year_built) : undefined,
          structure_type: formData.structure_type || undefined,
          square_footage: formData.square_footage ? parseInt(formData.square_footage) : undefined,
          num_stories: formData.num_stories ? parseInt(formData.num_stories) : undefined,
          damage_source: formData.damage_source || undefined,
          damage_category: formData.damage_category || undefined,
          damage_class: formData.damage_class || undefined,
          date_of_loss: formData.date_of_loss || undefined,
          insurance_org_id: formData.insurance_org_id ? parseInt(formData.insurance_org_id) : undefined,
          claim_number: formData.claim_number || undefined,
          policy_number: formData.policy_number || undefined,
          deductible: formData.deductible ? parseFloat(formData.deductible) : undefined,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to update job:', error);
    }
  };

  return (
    <BaseModal title={`Edit Job: ${job.job_number}`} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
        {/* Job Number */}
        <div>
          <label className="block text-sm font-medium mb-1">Job Number</label>
          <input
            type="text"
            name="job_number"
            value={formData.job_number}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Client Info Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Client Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <input
                type="text"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                placeholder="Property owner name"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled
                title="Client info cannot be edited here. Edit the client directly."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleChange}
                placeholder="(801) 555-1234"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled
                title="Client info cannot be edited here. Edit the client directly."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="client_email"
                value={formData.client_email}
                onChange={handleChange}
                placeholder="client@email.com"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                disabled
                title="Client info cannot be edited here. Edit the client directly."
              />
            </div>
          </div>
          {job.client && (
            <p className="text-xs text-muted-foreground mt-2">
              Client information is linked. Edit the client record directly to update.
            </p>
          )}
        </div>

        {/* Property Address Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Property Address
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-6">
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main St"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                maxLength={2}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">ZIP</label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Property Details Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Property Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Year Built</label>
              <input
                type="number"
                name="year_built"
                value={formData.year_built}
                onChange={handleChange}
                placeholder="2000"
                min="1800"
                max="2100"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Structure Type</label>
              <select
                name="structure_type"
                value={formData.structure_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select...</option>
                {STRUCTURE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sq. Footage</label>
              <input
                type="number"
                name="square_footage"
                value={formData.square_footage}
                onChange={handleChange}
                placeholder="2000"
                min="0"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stories</label>
              <input
                type="number"
                name="num_stories"
                value={formData.num_stories}
                onChange={handleChange}
                placeholder="2"
                min="1"
                max="100"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Damage Info Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Damage Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Damage Source</label>
              <select
                name="damage_source"
                value={formData.damage_source}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select source...</option>
                {DAMAGE_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source.charAt(0).toUpperCase() + source.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Loss</label>
              <input
                type="date"
                name="date_of_loss"
                value={formData.date_of_loss}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Water Category</label>
              <select
                name="damage_category"
                value={formData.damage_category}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select category...</option>
                {DAMAGE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Damage Class</label>
              <select
                name="damage_class"
                value={formData.damage_class}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select class...</option>
                {DAMAGE_CLASSES.map((cls) => (
                  <option key={cls.value} value={cls.value}>
                    {cls.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Insurance Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Insurance Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Insurance Carrier</label>
              <select
                name="insurance_org_id"
                value={formData.insurance_org_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select carrier...</option>
                {carriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Claim Number</label>
              <input
                type="text"
                name="claim_number"
                value={formData.claim_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Policy Number</label>
              <input
                type="text"
                name="policy_number"
                value={formData.policy_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deductible</label>
              <input
                type="number"
                name="deductible"
                value={formData.deductible}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Assigned Contacts Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Assigned Contacts
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Currently Assigned Contacts */}
            {assignedContactIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                {assignedContactIds.map((contactId) => {
                  const contact = allContacts.find((c) => c.id === contactId);
                  if (!contact) return null;
                  return (
                    <span
                      key={contactId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                    >
                      {contact.first_name} {contact.last_name}
                      <button
                        type="button"
                        onClick={() => handleContactToggle(contactId)}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Contact List */}
            <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {filteredContacts.length > 0 ? (
                filteredContacts.slice(0, 20).map((contact) => {
                  const isAssigned = assignedContactIds.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleContactToggle(contact.id)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/50 transition-colors ${
                        isAssigned ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div>
                        <span className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </span>
                        {contact.organization_name && (
                          <span className="text-muted-foreground ml-2">
                            ({contact.organization_name})
                          </span>
                        )}
                      </div>
                      {isAssigned && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No contacts found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateProject.isPending}>
            {updateProject.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
