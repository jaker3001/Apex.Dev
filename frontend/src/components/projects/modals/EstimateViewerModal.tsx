import { useState, useRef, useCallback } from 'react';
import { X, Calendar, DollarSign, Tag, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadEstimateFile, useUpdateEstimate, type Estimate } from '@/hooks/useProjects';

interface EstimateViewerModalProps {
  estimate: Estimate;
  onClose: () => void;
}

const API_BASE = 'http://localhost:8000/api';

function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  revision_requested: 'bg-yellow-100 text-yellow-700',
  revision: 'bg-purple-100 text-purple-700',
  denied: 'bg-red-100 text-red-700',
};

export function EstimateViewerModal({ estimate, onClose }: EstimateViewerModalProps) {
  const [pdfPath, setPdfPath] = useState(estimate.xactimate_file_path);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useUploadEstimateFile();
  const updateEstimate = useUpdateEstimate();

  const hasPdf = !!pdfPath;
  const pdfUrl = hasPdf ? `${API_BASE}/files/${pdfPath}` : null;
  const isUploading = uploadFile.isPending || updateEstimate.isPending;

  // Calculate reduction if applicable
  const hasReduction = estimate.original_amount && estimate.amount && estimate.original_amount > estimate.amount;
  const reductionAmount = hasReduction ? (estimate.original_amount! - estimate.amount!) : 0;
  const reductionPercent = hasReduction ? (reductionAmount / estimate.original_amount!) * 100 : 0;

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null);

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF files are allowed');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File must be under 50 MB');
      return;
    }

    try {
      // Upload the file
      const uploadResult = await uploadFile.mutateAsync({
        projectId: estimate.project_id,
        file,
      });

      // Update the estimate with the new file path
      await updateEstimate.mutateAsync({
        projectId: estimate.project_id,
        estimateId: estimate.id,
        data: { xactimate_file_path: uploadResult.file_path },
      });

      // Update local state to show the PDF
      setPdfPath(uploadResult.file_path);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    }
  }, [estimate.project_id, estimate.id, uploadFile, updateEstimate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl w-[95vw] h-[92vh] max-w-[1600px] flex overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 hover:bg-muted shadow-md"
        >
          <X className="h-5 w-5" />
        </button>

        {/* PDF Viewer / Upload Area - Left/Center */}
        <div className="flex-1 bg-muted/30 flex items-center justify-center">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Estimate PDF"
            />
          ) : (
            <div
              className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isDragging ? 'bg-primary/10 border-2 border-dashed border-primary' : 'hover:bg-muted/50'
              }`}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />

              {isUploading ? (
                <div className="text-center">
                  <Loader2 className="h-16 w-16 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-lg font-medium">Uploading PDF...</p>
                </div>
              ) : (
                <div className="text-center p-8">
                  <div className={`mx-auto mb-6 p-6 rounded-full ${isDragging ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Upload className={`h-12 w-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <p className="text-xl font-medium mb-2">
                    {isDragging ? 'Drop PDF here' : 'Upload Estimate PDF'}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop a PDF file here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Maximum file size: 50 MB
                  </p>
                  {uploadError && (
                    <p className="mt-4 text-sm text-red-500 font-medium">{uploadError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes Panel - Right */}
        <div className="w-80 border-l bg-card flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold capitalize">
                {estimate.estimate_type || 'Estimate'}
              </h2>
              <span className="text-sm text-muted-foreground">v{estimate.version}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[estimate.status] || 'bg-gray-100'}`}>
              {estimate.status?.replace('_', ' ')}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Amount</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(estimate.amount)}</p>

              {/* Reduction info */}
              {hasReduction && (
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    Original: {formatCurrency(estimate.original_amount)}
                  </p>
                  <p className="text-red-600 font-medium">
                    Reduction: -{formatCurrency(reductionAmount)} ({reductionPercent.toFixed(1)}%)
                  </p>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Dates</span>
              </div>
              <div className="text-sm space-y-1">
                {estimate.submitted_date && (
                  <p>
                    <span className="text-muted-foreground">Submitted: </span>
                    {formatDate(estimate.submitted_date)}
                  </p>
                )}
                {estimate.approved_date && (
                  <p>
                    <span className="text-muted-foreground">Approved: </span>
                    {formatDate(estimate.approved_date)}
                  </p>
                )}
                {estimate.created_at && (
                  <p>
                    <span className="text-muted-foreground">Created: </span>
                    {formatDate(estimate.created_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Notes</span>
              </div>
              {estimate.notes ? (
                <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                  {estimate.notes}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes for this estimate</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
