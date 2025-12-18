import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateProject, useGenerateJobNumber, useAssignContact } from '@/hooks/useProjects';
import { useOrganizations, useContacts } from '@/hooks/useContacts';
import { Wand2, Check, X, UserPlus } from 'lucide-react';
import { JOB_TYPES } from '@/lib/constants';

interface NewJobModalProps {
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

export function NewJobModal({ onClose }: NewJobModalProps) {
  const createProject = useCreateProject();
  const generateJobNumber = useGenerateJobNumber();
  const assignContact = useAssignContact();
  const { data: orgsData } = useOrganizations('insurance_carrier');
  const { data: contactsData } = useContacts();
  const carriers = orgsData?.organizations || [];
  const allContacts = contactsData?.contacts || [];

  // Selected job types and their job numbers
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [jobNumbers, setJobNumbers] = useState<Record<string, string>>({});
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  // Selected contacts to assign
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [contactSearch, setContactSearch] = useState('');

  const [formData, setFormData] = useState({
    // Client info
    client_name: '',
    client_phone: '',
    client_email: '',
    // Property address
    address: '',
    city: '',
    state: 'UT',
    zip: '',
    // Damage info
    damage_source: '',
    damage_category: '',
    damage_class: '',
    date_of_loss: '',
    // Insurance
    insurance_org_id: '',
    claim_number: '',
    policy_number: '',
    deductible: '',
    // Adjuster info
    adjuster_name: '',
    adjuster_phone: '',
    adjuster_email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeToggle = (typeValue: string) => {
    setSelectedTypes((prev) => {
      if (prev.includes(typeValue)) {
        const newJobNumbers = { ...jobNumbers };
        delete newJobNumbers[typeValue];
        setJobNumbers(newJobNumbers);
        return prev.filter((t) => t !== typeValue);
      } else {
        return [...prev, typeValue];
      }
    });
    if (errors.job_types) {
      setErrors((prev) => ({ ...prev, job_types: '' }));
    }
  };

  const handleGenerateJobNumber = async (typeValue: string) => {
    setGeneratingType(typeValue);
    try {
      const result = await generateJobNumber.mutateAsync(typeValue);
      setJobNumbers((prev) => ({ ...prev, [typeValue]: result.job_number }));
    } catch (error) {
      console.error('Failed to generate job number:', error);
    } finally {
      setGeneratingType(null);
    }
  };

  const handleJobNumberChange = (typeValue: string, value: string) => {
    setJobNumbers((prev) => ({ ...prev, [typeValue]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleContactToggle = (contactId: number) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Filter contacts based on search
  const filteredContacts = allContacts.filter((contact) => {
    if (!contactSearch) return true;
    const search = contactSearch.toLowerCase();
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const org = contact.organization_name?.toLowerCase() || '';
    return fullName.includes(search) || org.includes(search);
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (selectedTypes.length === 0) {
      newErrors.job_types = 'Select at least one job type';
    }

    for (const typeValue of selectedTypes) {
      if (!jobNumbers[typeValue]?.trim()) {
        newErrors[`job_number_${typeValue}`] = 'Job number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Create a project for each selected job type
      const createdProjectIds: number[] = [];

      for (const typeValue of selectedTypes) {
        const result = await createProject.mutateAsync({
          job_number: jobNumbers[typeValue],
          status: 'lead',
          // Client info - backend will auto-create client if provided
          client_name: formData.client_name || undefined,
          client_phone: formData.client_phone || undefined,
          client_email: formData.client_email || undefined,
          // Property address
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
          // Damage info
          damage_source: formData.damage_source || undefined,
          damage_category: formData.damage_category || undefined,
          damage_class: formData.damage_class || undefined,
          date_of_loss: formData.date_of_loss || undefined,
          // Insurance info
          insurance_org_id: formData.insurance_org_id ? parseInt(formData.insurance_org_id) : undefined,
          claim_number: formData.claim_number || undefined,
          policy_number: formData.policy_number || undefined,
          deductible: formData.deductible ? parseFloat(formData.deductible) : undefined,
        });
        createdProjectIds.push(result.id);
      }

      // Assign selected contacts to all created projects
      for (const projectId of createdProjectIds) {
        for (const contactId of selectedContacts) {
          try {
            await assignContact.mutateAsync({ projectId, contactId });
          } catch (err) {
            console.error('Failed to assign contact:', err);
          }
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to create job(s):', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal title="New Job" onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
        {/* Job Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Job Type(s) <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type.value);
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeToggle(type.value)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50 text-muted-foreground'
                  }`}
                >
                  {isSelected && <Check className="h-4 w-4" />}
                  {type.label}
                  <span className="text-xs opacity-70">({type.acronym})</span>
                </button>
              );
            })}
          </div>
          {errors.job_types && <p className="text-red-500 text-sm mt-1">{errors.job_types}</p>}
        </div>

        {/* Dynamic Job Number Fields */}
        {selectedTypes.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Job Number(s) <span className="text-red-500">*</span>
            </label>
            {selectedTypes.map((typeValue) => {
              const typeInfo = JOB_TYPES.find((t) => t.value === typeValue);
              const isGenerating = generatingType === typeValue;
              return (
                <div key={typeValue} className="flex items-center gap-2">
                  <span className="text-sm font-medium w-32 text-muted-foreground">
                    {typeInfo?.label}:
                  </span>
                  <input
                    type="text"
                    value={jobNumbers[typeValue] || ''}
                    onChange={(e) => handleJobNumberChange(typeValue, e.target.value)}
                    placeholder={`e.g., 202512-001-${typeInfo?.acronym}`}
                    className={`flex-1 px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${
                      errors[`job_number_${typeValue}`] ? 'border-red-500' : ''
                    }`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateJobNumber(typeValue)}
                    disabled={isGenerating}
                  >
                    <Wand2 className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? '...' : 'Generate'}
                  </Button>
                </div>
              );
            })}
            {selectedTypes.some((t) => errors[`job_number_${t}`]) && (
              <p className="text-red-500 text-sm">All job numbers are required</p>
            )}
          </div>
        )}

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
              />
            </div>
          </div>
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
                placeholder="Salt Lake City"
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
                placeholder="84101"
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
                placeholder="Claim #"
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
                placeholder="Policy #"
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

        {/* Adjuster Info Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Adjuster Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Adjuster Name</label>
              <input
                type="text"
                name="adjuster_name"
                value={formData.adjuster_name}
                onChange={handleChange}
                placeholder="John Smith"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adjuster Phone</label>
              <input
                type="tel"
                name="adjuster_phone"
                value={formData.adjuster_phone}
                onChange={handleChange}
                placeholder="(801) 555-1234"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adjuster Email</label>
              <input
                type="email"
                name="adjuster_email"
                value={formData.adjuster_email}
                onChange={handleChange}
                placeholder="adjuster@carrier.com"
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Assigned Contacts Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Assign Contacts to Job
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Selected Contacts */}
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                {selectedContacts.map((contactId) => {
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
                  const isSelected = selectedContacts.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleContactToggle(contact.id)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
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
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
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
          <Button type="submit" disabled={isSubmitting || selectedTypes.length === 0}>
            {isSubmitting
              ? 'Creating...'
              : selectedTypes.length > 1
                ? `Create ${selectedTypes.length} Jobs`
                : 'Create Job'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
