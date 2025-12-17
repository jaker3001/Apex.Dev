import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversations, type ConversationPreview } from '@/hooks/useConversations';

interface ConversationItemProps {
  conversation: ConversationPreview;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  isActive?: boolean;
}

function ConversationItem({ conversation, onSelect, onDelete, isActive }: ConversationItemProps) {
  const title = conversation.title || 'New Conversation';
  const preview = conversation.preview || 'No messages yet';
  const timestamp = new Date(conversation.updatedAt);
  const isToday = new Date().toDateString() === timestamp.toDateString();
  const timeDisplay = isToday
    ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div
      className={cn(
        'group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors',
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-accent'
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p className="text-sm font-medium truncate text-foreground">
          {title}
        </p>

        {/* Preview */}
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {preview}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-2 mt-1">
          {/* Model badge */}
          {conversation.lastModelName && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-yellow-500" />
              {conversation.lastModelName}
            </span>
          )}

          {/* Timestamp */}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeDisplay}
          </span>

          {/* Message count */}
          {conversation.messageCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {conversation.messageCount} msg{conversation.messageCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Delete button (appears on hover) */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
        title="Delete conversation"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ChatSidebarProps {
  currentConversationId?: number | null;
  onNewChat?: () => void;
  onSelectConversation?: (id: number) => void;
}

export function ChatSidebar({ currentConversationId, onNewChat, onSelectConversation }: ChatSidebarProps) {
  const navigate = useNavigate();
  const { conversations, isLoading, deleteConversation, fetchConversations } = useConversations({
    limit: 20,
    includeInactive: false,
  });

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
    navigate('/');
  };

  const handleSelectConversation = (id: number) => {
    if (onSelectConversation) {
      onSelectConversation(id);
    }
    navigate(`/?conversation=${id}`);
  };

  const handleDeleteConversation = async (id: number) => {
    if (window.confirm('Delete this conversation?')) {
      await deleteConversation(id);
      fetchConversations();
    }
  };

  return (
    <aside className="w-64 h-full bg-card border-r flex flex-col">
      {/* New Chat Button */}
      <div className="p-3 border-b">
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Conversation History */}
      <div className="flex-1 p-3 overflow-y-auto">
        <p className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          History
        </p>
        <div className="space-y-1">
          {isLoading ? (
            <p className="px-2 text-xs text-muted-foreground">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="px-2 text-xs text-muted-foreground">No conversations yet</p>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                onSelect={handleSelectConversation}
                onDelete={handleDeleteConversation}
                isActive={currentConversationId === conversation.id}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
