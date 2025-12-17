import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateLaborEntry, useUpdateLaborEntry, useDeleteLaborEntry, type LaborEntry } from '@/hooks/useProjects';
import { Trash2 } from 'lucide-react';

interface LaborEntryModalProps {
  projectId: number;
  onClose: () => void;
  entry?: LaborEntry; // If provided, modal is in edit mode
}

const WORK_CATEGORIES = [
  { value: 'demo', label: 'Demo / Tear-out' },
  { value: 'drying', label: 'Drying Setup' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'repair', label: 'Repair' },
  { value: 'admin', label: 'Admin / Documentation' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

export function LaborEntryModal({ projectId, onClose, entry }: LaborEntryModalProps) {
  const createLaborEntry = useCreateLaborEntry();
  const updateLaborEntry = useUpdateLaborEntry();
  const deleteLaborEntry = useDeleteLaborEntry();

  const isEditMode = !!entry;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    work_date: entry?.work_date || new Date().toISOString().split('T')[0],
    hours: entry?.hours?.toString() || '',
    hourly_rate: entry?.hourly_rate?.toString() || '',
    work_category: entry?.work_category || '',
    description: entry?.description || '',
    billable: entry?.billable ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hours || !formData.work_date) return;

    const data = {
      work_date: formData.work_date,
      hours: parseFloat(formData.hours),
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
      work_category: formData.work_category || undefined,
      description: formData.description || undefined,
      billable: formData.billable,
    };

    try {
      if (isEditMode && entry) {
        await updateLaborEntry.mutateAsync({
          projectId,
          laborId: entry.id,
          data,
        });
      } else {
        await createLaborEntry.mutateAsync({
          projectId,
          data,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save labor entry:', error);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    try {
      await deleteLaborEntry.mutateAsync({
        projectId,
        laborId: entry.id,
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete labor entry:', error);
    }
  };

  const isSaving = createLaborEntry.isPending || updateLaborEntry.isPending;
  const isDeleting = deleteLaborEntry.isPending;

  const totalCost = formData.hours && formData.hourly_rate
    ? (parseFloat(formData.hours) * parseFloat(formData.hourly_rate)).toFixed(2)
    : '0.00';

  return (
    <BaseModal title={isEditMode ? "Edit Labor Entry" : "Log Labor Hours"} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="work_date"
              value={formData.work_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Hours <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              placeholder="0.0"
              step="0.25"
              min="0"
              max="24"
              required
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Work Category</label>
            <select
              name="work_category"
              value={formData.work_category}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select...</option>
              {WORK_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hourly Rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <input
                type="number"
                name="hourly_rate"
                value={formData.hourly_rate}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-7 pr-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            placeholder="Work performed..."
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="billable"
            id="billable"
            checked={formData.billable}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="billable" className="text-sm">Billable hours</label>
        </div>

        {formData.hours && formData.hourly_rate && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Estimated Cost: </span>
            <span className="font-semibold">${totalCost}</span>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <div>
            {isEditMode && !showDeleteConfirm && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">Delete this entry?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Yes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  No
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !formData.hours}>
              {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Log Hours'}
            </Button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}
