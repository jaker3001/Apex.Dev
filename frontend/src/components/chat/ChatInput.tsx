import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Paperclip, StopCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilePreviewList } from './FilePreview';
import { ChatToolsMenu } from './ChatToolsMenu';
import type { AttachedFile } from '@/hooks/useChat';

// Allowed file types
const ALLOWED_EXTENSIONS = [
  // Text files
  '.txt', '.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.md', '.csv',
  '.yaml', '.yml', '.xml', '.html', '.css', '.sql', '.sh', '.log',
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  // PDFs
  '.pdf',
];

const ACCEPT_STRING = ALLOWED_EXTENSIONS.join(',');

interface ChatInputProps {
  onSend: (message: string, files?: AttachedFile[]) => void;
  onCancel?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  sessionId?: string | null;
  model: string;
  onModelChange: (model: string) => void;
  mode: 'chat' | 'agent';
  onModeChange: (mode: 'chat' | 'agent') => void;
}

export function ChatInput({
  onSend,
  onCancel,
  isStreaming,
  disabled,
  sessionId,
  model,
  onModelChange,
  mode,
  onModeChange,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmedInput = input.trim();
    if ((trimmedInput || attachedFiles.length > 0) && !isStreaming && !disabled && !isUploading) {
      onSend(trimmedInput, attachedFiles.length > 0 ? attachedFiles : undefined);
      setInput('');
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newFiles: AttachedFile[] = [];

      for (const file of Array.from(files)) {
        // Create local preview
        const localUrl = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined;

        // Determine file type
        let fileType: 'text' | 'image' | 'pdf' = 'text';
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type === 'application/pdf') {
          fileType = 'pdf';
        }

        // If we have a sessionId, upload to server
        if (sessionId) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('session_id', sessionId);

          const response = await fetch('http://localhost:8000/api/chat/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok' && data.file) {
              newFiles.push({
                id: data.file.id,
                name: data.file.name,
                type: data.file.type,
                mimeType: data.file.mime_type,
                size: data.file.size,
                textPreview: data.file.text_preview,
                metadata: data.file.metadata,
                localUrl,
              });
            }
          } else {
            const errorData = await response.json();
            console.error('Upload failed:', errorData.message);
            // Clean up local URL on error
            if (localUrl) URL.revokeObjectURL(localUrl);
          }
        } else {
          // No session yet - store locally with temp ID
          newFiles.push({
            id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            type: fileType,
            mimeType: file.type,
            size: file.size,
            localUrl,
          });
        }
      }

      setAttachedFiles((prev) => [...prev, ...newFiles]);
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      // Revoke local URL if present
      if (file?.localUrl) {
        URL.revokeObjectURL(file.localUrl);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const hasContent = input.trim() || attachedFiles.length > 0;

  return (
    <div className="bg-background p-4">
      <div className="max-w-3xl mx-auto">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3">
            <FilePreviewList
              files={attachedFiles}
              onRemove={handleRemoveFile}
            />
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-muted rounded-2xl p-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_STRING}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Tools menu (model, mode selector) */}
          <ChatToolsMenu
            model={model}
            onModelChange={onModelChange}
            mode={mode}
            onModeChange={onModeChange}
          />

          {/* File attachment button */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-10 w-10 rounded-xl"
            disabled={disabled || isUploading}
            onClick={handleFileSelect}
            title="Attach files"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Apex Assistant..."
            rows={1}
            disabled={disabled}
            className="flex-1 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 py-2.5 px-2 max-h-[200px] text-sm placeholder:text-muted-foreground"
          />

          {/* Send/Cancel button */}
          {isStreaming ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="flex-shrink-0 h-10 w-10 rounded-xl text-destructive hover:text-destructive"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!hasContent || disabled || isUploading}
              className="flex-shrink-0 h-10 w-10 rounded-xl"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Hint text */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
