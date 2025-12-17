import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateReceipt } from '@/hooks/useProjects';
import { Upload, X } from 'lucide-react';

interface ReceiptModalProps {
  projectId: number;
  onClose: () => void;
}

const EXPENSE_CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'equipment_rental', label: 'Equipment Rental' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'disposal', label: 'Disposal' },
  { value: 'permit', label: 'Permits' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'company_card', label: 'Company Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'personal_reimbursement', label: 'Personal (Reimbursement)' },
  { value: 'vendor_invoice', label: 'Vendor Invoice' },
];

export function ReceiptModal({ projectId, onClose }: ReceiptModalProps) {
  const createReceipt = useCreateReceipt();

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    expense_category: '',
    description: '',
    amount: '',
    paid_by: 'company_card',
    reimbursable: false,
    vendor_name: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.expense_category || !formData.amount || !formData.description) return;

    try {
      await createReceipt.mutateAsync({
        projectId,
        data: {
          expense_date: formData.expense_date,
          expense_category: formData.expense_category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          paid_by: formData.paid_by || undefined,
          reimbursable: formData.reimbursable,
          // vendor_name is tracked in form but not sent to API
          // Future: add vendor selector to set vendor_id
        },
      });

      // TODO: If file is selected, upload it after receipt creation
      // This would require the receipt ID from the create response

      onClose();
    } catch (error) {
      console.error('Failed to create receipt:', error);
    }
  };

  return (
    <BaseModal title="Add Receipt / Expense" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="expense_date"
              value={formData.expense_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="expense_category"
            value={formData.expense_category}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select category...</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            placeholder="What was purchased..."
            required
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vendor</label>
            <input
              type="text"
              name="vendor_name"
              value={formData.vendor_name}
              onChange={handleChange}
              placeholder="Store or supplier"
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Paid By</label>
            <select
              name="paid_by"
              value={formData.paid_by}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="reimbursable"
            id="reimbursable"
            checked={formData.reimbursable}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="reimbursable" className="text-sm">Reimbursable expense (bill to customer)</label>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">Receipt Image</label>
          {selectedFile ? (
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
              <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload receipt</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
          <p className="text-xs text-muted-foreground mt-1">Optional - attach receipt image or PDF</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createReceipt.isPending || !formData.expense_category || !formData.amount || !formData.description}
          >
            {createReceipt.isPending ? 'Saving...' : 'Add Receipt'}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
