import { X, FileText, Image as ImageIcon, FileCode, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttachedFile } from '@/hooks/useChat';

// Re-export for convenience
export type { AttachedFile };

interface FilePreviewProps {
  file: AttachedFile;
  onRemove?: () => void;
  isCompact?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image':
      return ImageIcon;
    case 'pdf':
      return FileText;
    case 'text':
      return FileCode;
    default:
      return File;
  }
}

export function FilePreview({ file, onRemove, isCompact = false, className }: FilePreviewProps) {
  const Icon = getFileIcon(file.type);

  if (isCompact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1 bg-muted rounded-lg text-xs',
          className
        )}
      >
        <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="truncate max-w-[120px]">{file.name}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-0.5 hover:bg-background rounded"
            title="Remove file"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-3 bg-muted/50 rounded-lg border',
        className
      )}
    >
      {/* Icon or image preview */}
      <div className="flex-shrink-0">
        {file.type === 'image' && file.localUrl ? (
          <div className="w-16 h-16 rounded overflow-hidden bg-muted">
            <img
              src={file.localUrl}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatFileSize(file.size)}
          {file.metadata?.width && file.metadata?.height && (
            <span className="ml-2">
              {file.metadata.width} x {file.metadata.height}
            </span>
          )}
        </p>
        {file.textPreview && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {file.textPreview}
          </p>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 hover:bg-background rounded transition-colors"
          title="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface FilePreviewListProps {
  files: AttachedFile[];
  onRemove?: (fileId: string) => void;
  isCompact?: boolean;
  className?: string;
}

export function FilePreviewList({ files, onRemove, isCompact = false, className }: FilePreviewListProps) {
  if (files.length === 0) return null;

  if (isCompact) {
    return (
      <div className={cn('flex flex-wrap gap-1', className)}>
        {files.map((file) => (
          <FilePreview
            key={file.id}
            file={file}
            onRemove={onRemove ? () => onRemove(file.id) : undefined}
            isCompact
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {files.map((file) => (
        <FilePreview
          key={file.id}
          file={file}
          onRemove={onRemove ? () => onRemove(file.id) : undefined}
        />
      ))}
    </div>
  );
}
