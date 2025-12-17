import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateReceipt, useUpdateReceipt, useDeleteReceipt, useUploadReceiptFile, type Receipt } from '@/hooks/useProjects';
import { Upload, X, Trash2, FileText, Image } from 'lucide-react';

interface ReceiptModalProps {
  projectId: number;
  onClose: () => void;
  receipt?: Receipt; // If provided, modal is in edit mode
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

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic'];

export function ReceiptModal({ projectId, onClose, receipt }: ReceiptModalProps) {
  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();
  const deleteReceipt = useDeleteReceipt();
  const uploadFile = useUploadReceiptFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!receipt;
  const hasExistingFile = !!receipt?.receipt_file_path;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    expense_date: receipt?.expense_date || new Date().toISOString().split('T')[0],
    expense_category: receipt?.expense_category || '',
    description: receipt?.description || '',
    amount: receipt?.amount?.toString() || '',
    paid_by: receipt?.paid_by || 'company_card',
    reimbursable: receipt?.reimbursable ?? false,
    vendor_name: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Check file type
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = ALLOWED_FILE_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!isValidType) {
      setFileError('Only PDF and image files (JPG, PNG, WebP, HEIC) are allowed');
      setSelectedFile(null);
      return;
    }

    // Check file size (max 25 MB)
    if (file.size > 25 * 1024 * 1024) {
      setFileError('File must be under 25 MB');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.expense_category || !formData.amount || !formData.description) return;

    // For new receipts, file is required
    if (!isEditMode && !selectedFile) {
      setFileError('Receipt image or PDF is required');
      return;
    }

    try {
      let filePath: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadFile.mutateAsync({
          projectId,
          file: selectedFile,
        });
        filePath = uploadResult.file_path;
      }

      const data = {
        expense_date: formData.expense_date,
        expense_category: formData.expense_category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        paid_by: formData.paid_by || undefined,
        reimbursable: formData.reimbursable,
        receipt_file_path: filePath,
      };

      if (isEditMode && receipt) {
        await updateReceipt.mutateAsync({
          projectId,
          receiptId: receipt.id,
          data: filePath ? data : { ...data, receipt_file_path: undefined },
        });
      } else {
        await createReceipt.mutateAsync({
          projectId,
          data,
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save receipt:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to upload file');
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;
    try {
      await deleteReceipt.mutateAsync({
        projectId,
        receiptId: receipt.id,
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete receipt:', error);
    }
  };

  const isSaving = createReceipt.isPending || updateReceipt.isPending || uploadFile.isPending;
  const isDeleting = deleteReceipt.isPending;

  // Get file icon based on type
  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-6 w-6 text-muted-foreground" />;
    if (selectedFile.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />;
    }
    return <Image className="h-8 w-8 text-blue-500 flex-shrink-0" />;
  };

  // Extract filename from path for existing files
  const existingFileName = receipt?.receipt_file_path?.split('/').pop() || 'Attached file';

  return (
    <BaseModal title={isEditMode ? "Edit Receipt" : "Add Receipt / Expense"} onClose={onClose} maxWidth="max-w-md">
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

        {/* File Upload - Required for new receipts */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Receipt Image / PDF {!isEditMode && <span className="text-red-500">*</span>}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Show existing file in edit mode */}
          {isEditMode && hasExistingFile && !selectedFile && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 mb-2">
              <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{existingFileName}</p>
                <p className="text-xs text-muted-foreground">Current file attached</p>
              </div>
            </div>
          )}

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-4 border-2 border-dashed rounded-lg flex flex-col items-center gap-2 transition-colors ${
                fileError ? 'border-red-300 bg-red-50' : 'border-muted-foreground/25 hover:border-primary hover:bg-muted/50'
              }`}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {isEditMode && hasExistingFile ? 'Click to replace file' : 'Click to upload receipt'}
              </span>
              <span className="text-xs text-muted-foreground">
                PDF or Image (max 25 MB)
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              {getFileIcon()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
          {fileError && (
            <p className="mt-1 text-sm text-red-500">{fileError}</p>
          )}
        </div>

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
                <span className="text-sm text-destructive">Delete this receipt?</span>
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
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !formData.expense_category || !formData.amount || !formData.description}
            >
              {isSaving
                ? (uploadFile.isPending ? 'Uploading...' : 'Saving...')
                : isEditMode ? 'Save Changes' : 'Add Receipt'}
            </Button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}
