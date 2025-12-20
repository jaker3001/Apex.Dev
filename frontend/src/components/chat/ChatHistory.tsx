import { useEffect } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';
import { MessageSquare, Trash2, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHistoryProps {
  currentId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  className?: string;
}

export function ChatHistory({ currentId, onSelect, onNewChat, className }: ChatHistoryProps) {
  const { conversations, isLoading, fetchConversations, deleteConversation } = useConversations();

  // Refresh when mounting
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background/30 backdrop-blur-md border-r border-white/5", className)}>
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-semibold text-foreground tracking-tight">History</h3>
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={onNewChat} 
            className="h-8 w-8 text-muted-foreground hover:text-primary" 
            title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
            <div className="p-4 text-center text-xs text-muted-foreground">Loading history...</div>
        )}
        
        {!isLoading && conversations.length === 0 && (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <MessageSquare className="h-8 w-8 opacity-20" />
                <span className="text-xs">No conversations yet</span>
            </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
              currentId === conv.id
                ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <MessageSquare className={cn("h-4 w-4 shrink-0", currentId === conv.id ? "text-primary" : "text-muted-foreground/50")} />
            
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="truncate text-sm font-medium">
                    {conv.title || "New Conversation"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {new Date(conv.updatedAt).toLocaleDateString()}
                </div>
            </div>

            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
