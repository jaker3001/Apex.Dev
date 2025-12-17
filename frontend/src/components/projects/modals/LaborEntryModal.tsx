import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateLaborEntry } from '@/hooks/useProjects';

interface LaborEntryModalProps {
  projectId: number;
  onClose: () => void;
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

export function LaborEntryModal({ projectId, onClose }: LaborEntryModalProps) {
  const createLaborEntry = useCreateLaborEntry();

  const [formData, setFormData] = useState({
    work_date: new Date().toISOString().split('T')[0],
    hours: '',
    hourly_rate: '',
    work_category: '',
    description: '',
    billable: true,
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

    try {
      await createLaborEntry.mutateAsync({
        projectId,
        data: {
          work_date: formData.work_date,
          hours: parseFloat(formData.hours),
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
          work_category: formData.work_category || undefined,
          description: formData.description || undefined,
          billable: formData.billable,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to create labor entry:', error);
    }
  };

  const totalCost = formData.hours && formData.hourly_rate
    ? (parseFloat(formData.hours) * parseFloat(formData.hourly_rate)).toFixed(2)
    : '0.00';

  return (
    <BaseModal title="Log Labor Hours" onClose={onClose} maxWidth="max-w-md">
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

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createLaborEntry.isPending || !formData.hours}>
            {createLaborEntry.isPending ? 'Saving...' : 'Log Hours'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
