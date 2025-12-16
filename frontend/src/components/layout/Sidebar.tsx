import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Bot,
  Puzzle,
  Server,
  BarChart3,
  BookOpen,
  Settings,
  Plus,
  Trash2,
  Zap,
  Clock,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversations, type ConversationPreview } from '@/hooks/useConversations';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

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

interface SidebarProps {
  currentConversationId?: number | null;
  onNewChat?: () => void;
  onSelectConversation?: (id: number) => void;
}

export function Sidebar({ currentConversationId, onNewChat, onSelectConversation }: SidebarProps) {
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
    // Navigate to chat with conversation id in URL
    navigate(`/?conversation=${id}`);
  };

  const handleDeleteConversation = async (id: number) => {
    if (window.confirm('Delete this conversation?')) {
      await deleteConversation(id);
      // Refresh the list
      fetchConversations();
    }
  };

  return (
    <aside className="w-64 h-screen bg-card border-r flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-foreground">Apex Assistant</h1>
        <p className="text-xs text-muted-foreground">AI for Apex Restoration</p>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Chat Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chat
          </p>
          <NavItem to="/" icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
        </div>

        {/* Conversation History */}
        {conversations.length > 0 && (
          <div className="mb-4">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              History
            </p>
            <div className="space-y-1">
              {isLoading ? (
                <p className="px-3 text-xs text-muted-foreground">Loading...</p>
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
        )}

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Operations Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Operations
          </p>
          <div className="space-y-1">
            <NavItem to="/projects" icon={<Briefcase className="h-4 w-4" />} label="Projects" />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Build Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Build
          </p>
          <div className="space-y-1">
            <NavItem to="/agents" icon={<Bot className="h-4 w-4" />} label="Agents" />
            <NavItem to="/skills" icon={<Puzzle className="h-4 w-4" />} label="Skills" />
            <NavItem to="/mcp" icon={<Server className="h-4 w-4" />} label="MCP Servers" />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Insights Section */}
        <div className="mb-4">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Insights
          </p>
          <NavItem to="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
        </div>

        {/* Divider */}
        <div className="border-t my-4" />

        {/* Learn Section */}
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Learn
          </p>
          <NavItem to="/learn" icon={<BookOpen className="h-4 w-4" />} label="Documentation" />
        </div>
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t">
        <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
      </div>
    </aside>
  );
}
