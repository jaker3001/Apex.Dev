import { useState, useEffect } from 'react';
import { X, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatProject } from '@/hooks/useChatProjects';

interface ProjectModalProps {
  project?: ChatProject | null;
  onSave: (data: {
    name: string;
    description?: string;
    instructions?: string;
    knowledge_path?: string;
    linked_job_number?: string;
  }) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function ProjectModal({ project, onSave, onClose, isLoading }: ProjectModalProps) {
  const [name, setName] = useState(project?.name || '');
  const [instructions, setInstructions] = useState(project?.instructions || '');
  const [knowledgePath, setKnowledgePath] = useState(project?.knowledgePath || '');
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!project;

  useEffect(() => {
    if (project) {
      setName(project.name);
      setInstructions(project.instructions || '');
      setKnowledgePath(project.knowledgePath || '');
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        instructions: instructions.trim() || undefined,
        knowledge_path: knowledgePath.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Project' : 'New Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium mb-1.5">
              Name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Research Project"
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="project-instructions" className="block text-sm font-medium mb-1.5">
              Instructions <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="project-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="You are helping me research..."
              rows={4}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Custom instructions added to every conversation in this project.
            </p>
          </div>

          {/* Knowledge Folder */}
          <div>
            <label htmlFor="project-knowledge" className="block text-sm font-medium mb-1.5">
              Knowledge Folder <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                id="project-knowledge"
                type="text"
                value={knowledgePath}
                onChange={(e) => setKnowledgePath(e.target.value)}
                placeholder="C:\Users\Apex\Research\"
                className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                title="Browse folder (coming soon)"
                disabled
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Local folder with files for context. Folder picker coming soon.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
