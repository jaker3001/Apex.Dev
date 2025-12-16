import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Paperclip, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onCancel, isStreaming, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (trimmedInput && !isStreaming && !disabled) {
      onSend(trimmedInput);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2 bg-muted rounded-2xl p-2">
          {/* File attachment button */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-10 w-10 rounded-xl"
            disabled={disabled}
          >
            <Paperclip className="h-5 w-5" />
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
              disabled={!input.trim() || disabled}
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
