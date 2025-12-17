import { useState } from 'react';
import { X, Plus, FolderOpen, FileText, Trash2, Settings, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatProject } from '@/hooks/useChatProjects';

interface ProjectSelectorProps {
  projects: ChatProject[];
  currentProjectId: number | null;
  onSelect: (projectId: number | null) => void;
  onCreate: (project: { name: string; description?: string; instructions?: string; linked_job_number?: string }) => void;
  onDelete: (projectId: number) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ProjectSelector({
  projects,
  currentProjectId,
  onSelect,
  onCreate,
  onDelete,
  onClose,
  isLoading: _isLoading = false,
}: ProjectSelectorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    instructions: '',
    linked_job_number: '',
  });

  const handleCreate = () => {
    if (newProject.name.trim()) {
      onCreate({
        name: newProject.name,
        description: newProject.description || undefined,
        instructions: newProject.instructions || undefined,
        linked_job_number: newProject.linked_job_number || undefined,
      });
      setNewProject({ name: '', description: '', instructions: '', linked_job_number: '' });
      setShowCreate(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold">Projects</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {showCreate ? (
            /* Create Project Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="e.g., State Farm Claims Q4"
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <input
                  type="text"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Brief description of this project"
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Custom Instructions
                  <span className="text-muted-foreground font-normal ml-2">(optional)</span>
                </label>
                <textarea
                  value={newProject.instructions}
                  onChange={(e) => setNewProject({ ...newProject, instructions: e.target.value })}
                  placeholder="Add context or instructions that apply to all conversations in this project..."
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Linked Job Number
                  <span className="text-muted-foreground font-normal ml-2">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newProject.linked_job_number}
                  onChange={(e) => setNewProject({ ...newProject, linked_job_number: e.target.value })}
                  placeholder="e.g., 202501-001-MIT"
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Link to a job in your operations database for automatic context
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!newProject.name.trim()}>
                  Create Project
                </Button>
              </div>
            </div>
          ) : (
            /* Project List */
            <div className="space-y-2">
              {/* No Project Option */}
              <button
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className={`w-full p-4 text-left border rounded-lg transition-colors flex items-center gap-4 ${
                  currentProjectId === null
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">No Project</p>
                  <p className="text-sm text-muted-foreground">
                    General conversation without project context
                  </p>
                </div>
              </button>

              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`w-full p-4 border rounded-lg transition-colors flex items-center gap-4 group ${
                    currentProjectId === project.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelect(project.id);
                      onClose();
                    }}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.description || 'No description'}
                      </p>
                      {project.linkedJobNumber && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Link className="h-3 w-3" />
                          {project.linkedJobNumber}
                        </p>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(project.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {projects.length === 0 && (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No projects yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Projects help you organize conversations with custom context and instructions.
                  </p>
                  <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first project
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
