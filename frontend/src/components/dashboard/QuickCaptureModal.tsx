import { useState, useRef } from 'react';
import { X, FileText, CheckSquare, Image, Mic, File, Upload, Loader2, Link } from 'lucide-react';
import { useCreateInboxItem, useUploadInboxFile } from '@/hooks/useHub';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

export type QuickCaptureType = 'note' | 'task' | 'photo' | 'audio' | 'document' | null;

interface QuickCaptureModalProps {
  type: QuickCaptureType;
  onClose: () => void;
}

const typeConfig: Record<
  NonNullable<QuickCaptureType>,
  {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    placeholder: string;
    acceptFile?: string;
  }
> = {
  note: {
    title: 'Quick Note',
    icon: FileText,
    color: 'text-blue-400',
    placeholder: 'What\'s on your mind?',
  },
  task: {
    title: 'Quick Task',
    icon: CheckSquare,
    color: 'text-amber-400',
    placeholder: 'What needs to be done?',
  },
  photo: {
    title: 'Upload Photo',
    icon: Image,
    color: 'text-green-400',
    placeholder: 'Add a caption (optional)',
    acceptFile: 'image/*',
  },
  audio: {
    title: 'Voice Memo',
    icon: Mic,
    color: 'text-purple-400',
    placeholder: 'Add a note (optional)',
    acceptFile: 'audio/*',
  },
  document: {
    title: 'Upload Document',
    icon: File,
    color: 'text-orange-400',
    placeholder: 'Add a description (optional)',
    acceptFile: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv',
  },
};

export function QuickCaptureModal({ type, onClose }: QuickCaptureModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const createItem = useCreateInboxItem();
  const uploadFile = useUploadInboxFile();
  const { data: projectsData } = useProjects('active');

  if (!type) return null;

  const config = typeConfig[type];
  const Icon = config.icon;
  const isFileType = ['photo', 'audio', 'document'].includes(type);
  const isSubmitting = createItem.isPending || uploadFile.isPending;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name);
      }
    }
  };

  const handleSubmit = async () => {
    if (isFileType && !selectedFile) {
      return;
    }

    if (!isFileType && !content.trim()) {
      return;
    }

    try {
      if (isFileType && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('item_type', type);
        if (title) formData.append('title', title);
        if (content) formData.append('content', content);
        if (selectedProjectId) formData.append('project_id', String(selectedProjectId));

        await uploadFile.mutateAsync(formData);
      } else {
        await createItem.mutateAsync({
          type,
          title: title || undefined,
          content: content || undefined,
          project_id: selectedProjectId,
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to create capture:', error);
    }
  };

  const selectedProject = projectsData?.projects?.find((p) => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl border border-slate-700 w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-5 h-5', config.color)} />
            <h2 className="font-semibold text-white">{config.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* File upload zone for file types */}
          {isFileType && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                selectedFile
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={config.acceptFile}
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Icon className="w-6 h-6 text-green-400" />
                  <span className="text-green-400 font-medium">{selectedFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    Click to select or drag & drop
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {type === 'photo' && 'JPG, PNG, GIF up to 10MB'}
                    {type === 'audio' && 'MP3, WAV, M4A up to 50MB'}
                    {type === 'document' && 'PDF, DOC, XLS up to 25MB'}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'task' ? 'Task title' : 'Title (optional)'}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />

          {/* Content textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={config.placeholder}
            rows={type === 'note' ? 4 : 2}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
          />

          {/* Link to job option */}
          <div>
            <button
              onClick={() => setShowProjectPicker(!showProjectPicker)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Link className="w-4 h-4" />
              {selectedProject ? (
                <span>
                  Linked to <span className="text-blue-400">{selectedProject.job_number}</span>
                </span>
              ) : (
                <span>Link to a job (optional)</span>
              )}
            </button>

            {showProjectPicker && (
              <div className="mt-2 max-h-32 overflow-y-auto bg-slate-700 rounded-lg border border-slate-600">
                <button
                  onClick={() => {
                    setSelectedProjectId(undefined);
                    setShowProjectPicker(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-slate-600 transition-colors',
                    !selectedProjectId ? 'text-blue-400' : 'text-slate-400'
                  )}
                >
                  No job (goes to inbox)
                </button>
                {projectsData?.projects?.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setShowProjectPicker(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm hover:bg-slate-600 transition-colors',
                      selectedProjectId === project.id ? 'text-blue-400' : 'text-white'
                    )}
                  >
                    <span className="font-medium">{project.job_number}</span>
                    {project.address && (
                      <span className="text-slate-400 ml-2">{project.address}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (isFileType && !selectedFile) || (!isFileType && !content.trim())}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
              'bg-blue-600 text-white hover:bg-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
