import { useRef, useCallback, useState } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write a description...',
  disabled,
  minRows = 4,
  maxRows = 12,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleInsert = useCallback(
    (before: string, after?: string, placeholder?: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.slice(start, end);

      const insertText = selectedText || placeholder || '';
      const newText =
        value.slice(0, start) +
        before +
        insertText +
        (after || '') +
        value.slice(end);

      onChange(newText);

      // Restore focus and set cursor position after the inserted text
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + insertText.length + (after?.length || 0);
        textarea.setSelectionRange(
          selectedText ? newCursorPos : start + before.length,
          selectedText ? newCursorPos : start + before.length + (placeholder?.length || 0)
        );
      }, 0);
    },
    [value, onChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <EditorToolbar onInsert={handleInsert} disabled={disabled} />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={cn(
            'p-1.5 rounded text-sm flex items-center gap-1',
            'text-muted-foreground hover:text-foreground transition-colors'
          )}
          title={showPreview ? 'Hide preview' : 'Show preview'}
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">Hide</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span className="text-xs">Preview</span>
            </>
          )}
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
        className={cn(
          'w-full px-3 py-2 rounded-lg border border-border bg-background',
          'text-sm text-foreground placeholder-muted-foreground',
          'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
          'resize-y',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'font-mono'
        )}
        style={{ maxHeight: `${maxRows * 1.5}rem` }}
      />

      {showPreview && value && (
        <div className="border border-border rounded-lg p-4 bg-muted/30 min-h-[100px]">
          <div className="text-xs text-muted-foreground mb-2 font-medium">Preview</div>
          <MarkdownRenderer content={value} className="text-sm" />
        </div>
      )}
    </div>
  );
}
