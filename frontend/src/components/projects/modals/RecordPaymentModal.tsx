import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreatePayment, type Estimate } from '@/hooks/useProjects';

interface RecordPaymentModalProps {
  projectId: number;
  estimates: Estimate[];
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: 'check', label: 'Check' },
  { value: 'ach', label: 'ACH Transfer' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
];

const PAYMENT_TYPES = [
  { value: 'initial', label: 'Initial Payment' },
  { value: 'progress', label: 'Progress Payment' },
  { value: 'supplement', label: 'Supplement Payment' },
  { value: 'final', label: 'Final Payment' },
  { value: 'deductible', label: 'Deductible' },
];

export function RecordPaymentModal({ projectId, estimates, onClose }: RecordPaymentModalProps) {
  const createPayment = useCreatePayment();

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: '',
    payment_type: '',
    check_number: '',
    received_date: new Date().toISOString().split('T')[0],
    deposited_date: '',
    invoice_number: '',
    estimate_id: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount) return;

    try {
      await createPayment.mutateAsync({
        projectId,
        data: {
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method || undefined,
          payment_type: formData.payment_type || undefined,
          check_number: formData.check_number || undefined,
          received_date: formData.received_date || undefined,
          deposited_date: formData.deposited_date || undefined,
          invoice_number: formData.invoice_number || undefined,
          estimate_id: formData.estimate_id ? parseInt(formData.estimate_id) : undefined,
          notes: formData.notes || undefined,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  return (
    <BaseModal title="Record Payment" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className="w-full pl-7 pr-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select...</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Type</label>
            <select
              name="payment_type"
              value={formData.payment_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select...</option>
              {PAYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formData.payment_method === 'check' && (
          <div>
            <label className="block text-sm font-medium mb-1">Check Number</label>
            <input
              type="text"
              name="check_number"
              value={formData.check_number}
              onChange={handleChange}
              placeholder="Check #"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Received Date</label>
            <input
              type="date"
              name="received_date"
              value={formData.received_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deposited Date</label>
            <input
              type="date"
              name="deposited_date"
              value={formData.deposited_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Invoice Number</label>
            <input
              type="text"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleChange}
              placeholder="INV-001"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Linked Estimate</label>
            <select
              name="estimate_id"
              value={formData.estimate_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {estimates.map((est) => (
                <option key={est.id} value={est.id}>
                  v{est.version} - ${est.amount?.toLocaleString() || '0'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            placeholder="Payment notes..."
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createPayment.isPending || !formData.amount}>
            {createPayment.isPending ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
