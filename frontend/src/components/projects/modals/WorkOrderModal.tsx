import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder, useUploadWorkOrderFile, type WorkOrder } from '@/hooks/useProjects';
import { Upload, X, Trash2, FileText, Image } from 'lucide-react';

interface WorkOrderModalProps {
  projectId: number;
  onClose: () => void;
  workOrder?: WorkOrder; // If provided, modal is in edit mode
}

const WORK_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
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

export function WorkOrderModal({ projectId, onClose, workOrder }: WorkOrderModalProps) {
  const createWorkOrder = useCreateWorkOrder();
  const updateWorkOrder = useUpdateWorkOrder();
  const deleteWorkOrder = useDeleteWorkOrder();
  const uploadFile = useUploadWorkOrderFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!workOrder;
  const hasExistingFile = !!workOrder?.document_file_path;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    work_order_number: workOrder?.work_order_number || '',
    title: workOrder?.title || '',
    description: workOrder?.description || '',
    budget_amount: workOrder?.budget_amount?.toString() || '',
    status: workOrder?.status || 'draft',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

    if (!formData.title) return;

    // For new work orders, file is required
    if (!isEditMode && !selectedFile) {
      setFileError('Work order document (PDF or image) is required');
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
        work_order_number: formData.work_order_number || undefined,
        title: formData.title,
        description: formData.description || undefined,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : undefined,
        status: formData.status,
        document_file_path: filePath,
      };

      if (isEditMode && workOrder) {
        await updateWorkOrder.mutateAsync({
          projectId,
          workOrderId: workOrder.id,
          data: filePath ? data : { ...data, document_file_path: undefined },
        });
      } else {
        await createWorkOrder.mutateAsync({
          projectId,
          data,
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save work order:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to upload file');
    }
  };

  const handleDelete = async () => {
    if (!workOrder) return;
    try {
      await deleteWorkOrder.mutateAsync({
        projectId,
        workOrderId: workOrder.id,
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete work order:', error);
    }
  };

  const isSaving = createWorkOrder.isPending || updateWorkOrder.isPending || uploadFile.isPending;
  const isDeleting = deleteWorkOrder.isPending;

  // Get file icon based on type
  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-6 w-6 text-muted-foreground" />;
    if (selectedFile.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />;
    }
    return <Image className="h-8 w-8 text-blue-500 flex-shrink-0" />;
  };

  // Extract filename from path for existing files
  const existingFileName = workOrder?.document_file_path?.split('/').pop() || 'Attached file';

  return (
    <BaseModal title={isEditMode ? "Edit Work Order" : "Create Work Order"} onClose={onClose} maxWidth="max-w-md">
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

        {/* File Upload - Required for new work orders */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Document (PDF / Image) {!isEditMode && <span className="text-red-500">*</span>}
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
                {isEditMode && hasExistingFile ? 'Click to replace file' : 'Click to upload document'}
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
                <span className="text-sm text-destructive">Delete this work order?</span>
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
            <Button type="submit" disabled={isSaving || !formData.title}>
              {isSaving
                ? (uploadFile.isPending ? 'Uploading...' : 'Saving...')
                : isEditMode ? 'Save Changes' : 'Create Work Order'}
            </Button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}
