import { User, Bot, Zap } from 'lucide-react';
import { ToolUsage } from './ToolUsage';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import type { ChatMessage } from '@/hooks/useChat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        {/* Message content */}
        <div
          className={`inline-block p-4 rounded-2xl text-left ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          }`}
        >
          {message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : message.isStreaming ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : null}
        </div>

        {/* Tool usages (only for assistant messages) */}
        {!isUser && message.tools && message.tools.length > 0 && (
          <div className="mt-2 text-left">
            {message.tools.map((tool) => (
              <ToolUsage key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {/* Model indicator and Timestamp */}
        <div className="flex items-center gap-2 mt-1">
          {/* Show model for assistant messages */}
          {!isUser && message.modelName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              {message.modelName}
            </span>
          )}
          <p className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
