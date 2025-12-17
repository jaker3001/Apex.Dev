import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { BaseModal } from './BaseModal';
import { useCreateEstimate, useUploadEstimateFile, type Estimate } from '@/hooks/useProjects';
import { TrendingDown, Upload, FileText, X } from 'lucide-react';
import { ESTIMATE_TYPES } from '@/lib/constants';

interface AddEstimateModalProps {
  projectId: number;
  existingEstimates: Estimate[];
  onClose: () => void;
  revisionOf?: Estimate; // If set, this is a revision of an existing estimate
}

const ESTIMATE_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'revision', label: 'Revision' },
  { value: 'approved', label: 'Approved' },
  { value: 'revision_requested', label: 'Revision Requested' },
  { value: 'denied', label: 'Denied' },
];

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Get reduction color based on percentage
// 1-10%: green (good), 11-15%: yellow (moderate), 16-20%: orange (concerning), 21%+: red (high)
function getReductionColor(percent: number): { bg: string; border: string; text: string; icon: string } {
  if (percent <= 10) {
    return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-500' };
  } else if (percent <= 15) {
    return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-500' };
  } else if (percent <= 20) {
    return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: 'text-orange-500' };
  } else {
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' };
  }
}

export function AddEstimateModal({ projectId, existingEstimates, onClose, revisionOf }: AddEstimateModalProps) {
  const createEstimate = useCreateEstimate();
  const uploadFile = useUploadEstimateFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRevision = !!revisionOf;

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // For revisions, get estimates of the same type to calculate next version
  const estimatesOfSameType = useMemo(() => {
    if (!revisionOf) return existingEstimates;
    return existingEstimates.filter(e => e.estimate_type === revisionOf.estimate_type);
  }, [existingEstimates, revisionOf]);

  // Calculate next version number
  const nextVersion = estimatesOfSameType.length > 0
    ? Math.max(...estimatesOfSameType.map((e) => e.version)) + 1
    : 1;

  // Get original amount for revisions
  const originalAmount = revisionOf?.original_amount || revisionOf?.amount || 0;

  const [formData, setFormData] = useState({
    version: nextVersion.toString(),
    amount: '',
    estimate_type: revisionOf?.estimate_type || 'mitigation',
    status: isRevision ? 'revision' : 'draft',
    submitted_date: isRevision ? new Date().toISOString().split('T')[0] : '',
    approved_date: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Clear irrelevant dates when status changes
      if (name === 'status') {
        if (value === 'draft') {
          updated.submitted_date = '';
          updated.approved_date = '';
        } else if (value !== 'approved') {
          updated.approved_date = '';
        }
      }

      return updated;
    });
  };

  // Determine which date fields to show based on status
  const showSubmittedDate = formData.status !== 'draft';
  const showApprovedDate = formData.status === 'approved';

  // Calculate reduction preview for revisions
  const currentAmount = formData.amount ? parseFloat(formData.amount) : 0;
  const reductionAmount = originalAmount - currentAmount;
  const reductionPercent = originalAmount > 0 ? (reductionAmount / originalAmount) * 100 : 0;
  const hasReduction = isRevision && currentAmount > 0 && reductionAmount > 0;

  // File handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setFileError('Only PDF files are allowed');
      setSelectedFile(null);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setFileError('File must be under 50 MB');
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

    // Validate file is selected
    if (!selectedFile) {
      setFileError('PDF file is required');
      return;
    }

    try {
      // First, upload the file
      const uploadResult = await uploadFile.mutateAsync({
        projectId,
        file: selectedFile,
      });

      // Then create the estimate with the file path
      await createEstimate.mutateAsync({
        projectId,
        data: {
          version: parseInt(formData.version) || nextVersion,
          amount: formData.amount ? parseFloat(formData.amount) : undefined,
          original_amount: isRevision ? originalAmount : (formData.amount ? parseFloat(formData.amount) : undefined),
          estimate_type: formData.estimate_type || undefined,
          status: formData.status,
          submitted_date: formData.submitted_date || undefined,
          approved_date: formData.approved_date || undefined,
          xactimate_file_path: uploadResult.file_path,
          notes: formData.notes || undefined,
        },
      });
      onClose();
    } catch (error) {
      console.error('Failed to create estimate:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to upload file');
    }
  };

  const isSubmitting = uploadFile.isPending || createEstimate.isPending;

  const modalTitle = isRevision
    ? `Add Revision - ${revisionOf?.estimate_type || 'Estimate'}`
    : 'Add Estimate';

  return (
    <BaseModal title={modalTitle} onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Revision Info Banner */}
        {isRevision && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800">
              Creating revision v{nextVersion} of <strong>{revisionOf?.estimate_type}</strong>
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Original amount: {formatCurrency(originalAmount)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Version</label>
            <input
              type="number"
              name="version"
              value={formData.version}
              onChange={handleChange}
              min="1"
              disabled={isRevision}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Estimate Type</label>
            <select
              name="estimate_type"
              value={formData.estimate_type}
              onChange={handleChange}
              disabled={isRevision}
              className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
            >
              {ESTIMATE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            {isRevision ? 'Revised Amount' : 'Amount'}
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
              className="w-full pl-7 pr-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Reduction Preview for Revisions */}
        {hasReduction && (() => {
          const colors = getReductionColor(reductionPercent);
          return (
            <div className={`flex items-center gap-3 p-3 ${colors.bg} border ${colors.border} rounded-lg`}>
              <TrendingDown className={`h-5 w-5 ${colors.icon}`} />
              <div className="text-sm">
                <p className={`font-medium ${colors.text}`}>
                  Reduction: -{formatCurrency(reductionAmount)} ({reductionPercent.toFixed(1)}%)
                </p>
                <p className={`text-xs ${colors.text} opacity-75`}>
                  From {formatCurrency(originalAmount)} → {formatCurrency(currentAmount)}
                </p>
              </div>
            </div>
          );
        })()}

        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ESTIMATE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Conditional date fields based on status */}
        {(showSubmittedDate || showApprovedDate) && (
          <div className={`grid gap-4 ${showSubmittedDate && showApprovedDate ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showSubmittedDate && (
              <div>
                <label className="block text-sm font-medium mb-1">Submitted Date</label>
                <input
                  type="date"
                  name="submitted_date"
                  value={formData.submitted_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
            {showApprovedDate && (
              <div>
                <label className="block text-sm font-medium mb-1">Approved Date</label>
                <input
                  type="date"
                  name="approved_date"
                  value={formData.approved_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>
        )}

        {/* PDF Upload - Required */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Estimate PDF <span className="text-red-500">*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
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
                Click to upload PDF
              </span>
              <span className="text-xs text-muted-foreground">
                Max 50 MB
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
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

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder={isRevision ? "Reason for revision, carrier response, etc..." : "Any additional notes..."}
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? (uploadFile.isPending ? 'Uploading...' : 'Saving...')
              : isRevision
                ? 'Add Revision'
                : 'Add Estimate'
            }
          </Button>
        </div>
      </form>
    </BaseModal>
  );
}
