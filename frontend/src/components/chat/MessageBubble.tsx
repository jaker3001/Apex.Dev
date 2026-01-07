import { Bot, Zap } from 'lucide-react';
import { ToolUsage } from './ToolUsage';
import { FilePreviewList } from './FilePreview';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { ChatMessage } from '@/hooks/useChat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    // User messages: right-aligned, clean text
    return (
      <div className="flex flex-col items-end">
        {/* Attached files */}
        {message.files && message.files.length > 0 && (
          <div className="mb-2 max-w-[85%]">
            <FilePreviewList files={message.files} isCompact />
          </div>
        )}

        {/* Message content */}
        <div className="max-w-[85%] text-right">
          {message.content && (
            <div className="text-foreground">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground/60 mt-1">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    );
  }

  // Assistant messages: left-aligned with subtle bot indicator
  return (
    <div className="flex flex-col items-start">
      {/* Bot indicator + Model */}
      <div className="flex items-center gap-2 mb-1">
        <Bot className="h-4 w-4 text-muted-foreground" />
        {message.modelName && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-500" />
            {message.modelName}
          </span>
        )}
      </div>

      {/* Message content */}
      <div className="w-full">
        {message.content ? (
          <div className="text-foreground">
            <MarkdownRenderer content={message.content} />
          </div>
        ) : message.isStreaming ? (
          <div className="flex items-center gap-1.5 py-2">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : null}
      </div>

      {/* Tool usages */}
      {message.tools && message.tools.length > 0 && (
        <div className="mt-3 w-full">
          {message.tools.map((tool) => (
            <ToolUsage key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground/60 mt-2">
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}
