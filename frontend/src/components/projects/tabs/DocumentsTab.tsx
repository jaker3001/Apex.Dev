import { FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentsTabProps {
  projectId: number;
}

export function DocumentsTab({ projectId }: DocumentsTabProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Documents</h3>
        </div>
        <Button variant="ghost" size="sm" disabled>
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
      </div>

      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
        <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Document Management Coming Soon</p>
        <p className="text-sm mt-1">Upload and manage photos, work authorizations,</p>
        <p className="text-sm">PDFs, and other job documents</p>
        <p className="text-xs mt-4 text-muted-foreground/60">Project ID: {projectId}</p>
      </div>
    </div>
  );
}
