import { useState } from 'react';
import { FolderOpen, Upload, FileText, Image, File, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Media } from '@/hooks/useProjects';
import { useDeleteMedia } from '@/hooks/useProjects';

interface DocumentsTabProps {
  projectId: number;
  media?: Media[];
}

// File type icons
function getFileIcon(fileType?: string) {
  if (!fileType) return <File className="h-5 w-5 text-gray-500" />;
  const type = fileType.toLowerCase();
  if (type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('jpeg')) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  if (type.includes('pdf')) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (type.includes('doc') || type.includes('docx')) {
    return <FileText className="h-5 w-5 text-blue-600" />;
  }
  if (type.includes('xls') || type.includes('xlsx') || type.includes('csv')) {
    return <FileText className="h-5 w-5 text-green-600" />;
  }
  return <File className="h-5 w-5 text-gray-500" />;
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format date
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Single document row
function DocumentRow({
  media,
  projectId: _projectId,
  onDelete,
}: {
  media: Media;
  projectId: number;
  onDelete: (mediaId: number) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        {getFileIcon(media.file_type)}
        <div>
          <p className="font-medium text-sm">{media.file_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {media.file_type && <span className="uppercase">{media.file_type}</span>}
            {media.file_size && <span>{formatFileSize(media.file_size)}</span>}
            {media.uploaded_at && <span>Uploaded {formatDate(media.uploaded_at)}</span>}
            {media.uploaded_by_name && <span>by {media.uploaded_by_name}</span>}
          </div>
          {media.caption && (
            <p className="text-xs text-muted-foreground mt-1 italic">{media.caption}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {media.file_path && (
          <a
            href={media.file_path}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-muted rounded-lg"
            title="Open file"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}
        {showConfirm ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(media.id)}
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive"
            title="Delete file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DocumentsTab({ projectId, media = [] }: DocumentsTabProps) {
  const deleteMedia = useDeleteMedia();

  const handleDelete = (mediaId: number) => {
    deleteMedia.mutate({ projectId, mediaId });
  };

  // Group media by type
  const images = media.filter((m) => {
    const type = m.file_type?.toLowerCase() || '';
    return type.includes('image') || type.includes('jpg') || type.includes('png') || type.includes('jpeg');
  });
  const documents = media.filter((m) => {
    const type = m.file_type?.toLowerCase() || '';
    return !type.includes('image') && !type.includes('jpg') && !type.includes('png') && !type.includes('jpeg');
  });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Documents</h3>
          <span className="text-sm text-muted-foreground">({media.length})</span>
        </div>
        <Button variant="ghost" size="sm" disabled>
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
      </div>

      {media.length > 0 ? (
        <div className="space-y-6">
          {/* Images Section */}
          {images.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Image className="h-4 w-4" />
                Photos ({images.length})
              </h4>
              <div className="space-y-2">
                {images.map((m) => (
                  <DocumentRow
                    key={m.id}
                    media={m}
                    projectId={projectId}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {documents.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Files ({documents.length})
              </h4>
              <div className="space-y-2">
                {documents.map((m) => (
                  <DocumentRow
                    key={m.id}
                    media={m}
                    projectId={projectId}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No Documents Yet</p>
          <p className="text-sm mt-1">Upload photos, work authorizations,</p>
          <p className="text-sm">PDFs, and other job documents</p>
          <p className="text-xs mt-4 text-muted-foreground/60">
            File upload coming soon - for now, records can be added via the API
          </p>
        </div>
      )}
    </div>
  );
}
