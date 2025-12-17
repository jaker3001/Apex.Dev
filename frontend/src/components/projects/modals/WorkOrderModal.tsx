import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateWorkOrder } from '@/hooks/useProjects';

interface WorkOrderModalProps {
  projectId: number;
  onClose: () => void;
}

const WORK_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function WorkOrderModal({ projectId, onClose }: WorkOrderModalProps) {
  const createWorkOrder = useCreateWorkOrder();

  const [formData, setFormData] = useState({
    work_order_number: '',
    title: '',
    description: '',
    budget_amount: '',
    status: 'draft',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) return;

    try {
      await createWorkOrder.mutateAsync({
        projectId,
        data: {
          work_order_number: formData.work_order_number || undefined,
          title: formData.title,
          description: formData.description || undefined,
          budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : undefined,
          status: formData.status,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to create work order:', error);
    }
  };

  return (
    <BaseModal title="Create Work Order" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Work Order #</label>
            <input
              type="text"
              name="work_order_number"
              value={formData.work_order_number}
              onChange={handleChange}
              placeholder="WO-001"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {WORK_ORDER_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Work order title"
            required
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Scope of work, materials needed, special instructions..."
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Budget Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="number"
              name="budget_amount"
              value={formData.budget_amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full pl-7 pr-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Optional - set a budget limit for this work order</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createWorkOrder.isPending || !formData.title}>
            {createWorkOrder.isPending ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
