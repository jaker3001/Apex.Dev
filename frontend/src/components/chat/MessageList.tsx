import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '@/hooks/useChat';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
        <h2 className="text-2xl font-medium text-foreground mb-2">
          How can I help you today?
        </h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Ask me anything about your work, files, or tasks.
        </p>

        {/* Suggested prompts */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-2 max-w-xl">
          {[
            "What's on my schedule today?",
            "Find all TODO comments in the codebase",
            "Create a new project folder structure",
            "Summarize the recent changes in git",
          ].map((prompt) => (
            <button
              key={prompt}
              className="px-4 py-2.5 text-left text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-muted-foreground hover:bg-muted transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-6 bg-background">
      <div className="max-w-3xl mx-auto space-y-8">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
