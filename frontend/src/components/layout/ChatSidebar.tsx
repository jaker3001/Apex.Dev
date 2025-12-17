import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Zap, Clock, PanelLeftClose, PanelLeftOpen, Bot, MessageSquare, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversations, type ConversationPreview } from '@/hooks/useConversations';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useChatContext } from '@/contexts/ChatContext';
import { useAgents, type Agent } from '@/hooks/useAgents';

type PopoverType = 'agents' | 'history' | null;

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

  // Sidebar collapse state (persisted)
  const [isCollapsed, setIsCollapsed] = useLocalStorage('chatSidebar.collapsed', false);

  // History section collapsed state (persisted)
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useLocalStorage('chatSidebar.historyCollapsed', false);

  // Agents section collapsed state (persisted)
  const [isAgentsCollapsed, setIsAgentsCollapsed] = useLocalStorage('chatSidebar.agentsCollapsed', false);

  // Fetch agents from API
  const { agents, isLoading: isLoadingAgents } = useAgents({ activeOnly: true });

  // Mode and selected agent from context
  const { mode, setMode, selectedAgentId, setSelectedAgentId } = useChatContext();

  const toggleMode = () => {
    setMode(mode === 'task' ? 'chat' : 'task');
  };

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

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Popover state for collapsed mode
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }
    if (activePopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activePopover]);

  const handleAgentSelectFromPopover = (agentId: number) => {
    setSelectedAgentId(selectedAgentId === agentId ? null : agentId);
    setActivePopover(null);
  };

  const handleConversationSelectFromPopover = (id: number) => {
    handleSelectConversation(id);
    setActivePopover(null);
  };

  // Collapsed view - mini icon strip
  if (isCollapsed) {
    return (
      <aside
        className="w-12 h-full bg-card border-r flex flex-col items-center py-3 gap-2 transition-all duration-200 relative"
        data-testid="chat-sidebar"
        data-collapsed="true"
      >
        {/* Expand toggle */}
        <button
          onClick={toggleCollapse}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          title="Expand sidebar"
          data-testid="sidebar-toggle"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>

        {/* Mode toggle */}
        <button
          onClick={toggleMode}
          className={cn(
            "p-2 rounded-lg transition-colors",
            mode === 'task' ? "bg-primary/10 text-primary" : "bg-blue-500/10 text-blue-500"
          )}
          title={mode === 'task' ? 'Task Mode (click to switch)' : 'Chat Mode (click to switch)'}
          data-testid="mode-toggle-icon"
        >
          {mode === 'task' ? <Bot className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </button>

        {/* New Chat */}
        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          title="New Chat"
          data-testid="new-chat-icon"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* Agents icon with popover */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === 'agents' ? null : 'agents')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activePopover === 'agents' ? "bg-accent" : "hover:bg-accent"
            )}
            title="Agents"
            data-testid="agents-icon"
          >
            <Bot className="h-5 w-5" />
            {agents.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {agents.length}
              </span>
            )}
          </button>

          {/* Agents Popover */}
          {activePopover === 'agents' && (
            <div
              ref={popoverRef}
              className="absolute left-full ml-2 top-0 bg-card border rounded-lg shadow-lg z-50 w-56"
              data-testid="agents-popover"
            >
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Agents</span>
                <button
                  onClick={() => setActivePopover(null)}
                  className="p-1 rounded hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-1">
                {isLoadingAgents ? (
                  <p className="p-2 text-xs text-muted-foreground">Loading...</p>
                ) : agents.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">No agents configured</p>
                ) : (
                  agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleAgentSelectFromPopover(agent.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded text-left transition-colors",
                        selectedAgentId === agent.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      )}
                      data-testid={`popover-agent-${agent.id}`}
                    >
                      <Bot className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{agent.name}</span>
                      {agent.times_used > 0 && (
                        <span className="text-xs text-muted-foreground">{agent.times_used}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* History icon with popover */}
        <div className="relative mt-auto">
          <button
            onClick={() => setActivePopover(activePopover === 'history' ? null : 'history')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activePopover === 'history' ? "bg-accent" : "hover:bg-accent"
            )}
            title="History"
            data-testid="history-icon"
          >
            <Clock className="h-5 w-5" />
            {conversations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-muted-foreground text-background text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {conversations.length > 9 ? '9+' : conversations.length}
              </span>
            )}
          </button>

          {/* History Popover */}
          {activePopover === 'history' && (
            <div
              ref={popoverRef}
              className="absolute left-full ml-2 bottom-0 bg-card border rounded-lg shadow-lg z-50 w-72"
              data-testid="history-popover"
            >
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Recent Conversations</span>
                <button
                  onClick={() => setActivePopover(null)}
                  className="p-1 rounded hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-1">
                {isLoading ? (
                  <p className="p-2 text-xs text-muted-foreground">Loading...</p>
                ) : conversations.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">No conversations yet</p>
                ) : (
                  conversations.slice(0, 10).map((conversation) => {
                    const title = conversation.title || 'New Conversation';
                    const timestamp = new Date(conversation.updatedAt);
                    const isToday = new Date().toDateString() === timestamp.toDateString();
                    const timeDisplay = isToday
                      ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleConversationSelectFromPopover(conversation.id)}
                        className={cn(
                          "w-full flex items-center gap-2 p-2 rounded text-left transition-colors",
                          currentConversationId === conversation.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent"
                        )}
                        data-testid={`popover-conversation-${conversation.id}`}
                      >
                        <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{title}</p>
                          <p className="text-xs text-muted-foreground">{timeDisplay}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Expanded view
  return (
    <aside
      className="w-64 h-full bg-card border-r flex flex-col transition-all duration-200"
      data-testid="chat-sidebar"
      data-collapsed="false"
    >
      {/* Toggle + Mode + New Chat */}
      <div className="p-3 border-b">
        {/* Header row with toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Collapse sidebar"
            data-testid="sidebar-toggle"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <button
          onClick={toggleMode}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors mb-3",
            mode === 'task'
              ? "bg-primary/5 border-primary/20 text-primary"
              : "bg-blue-500/5 border-blue-500/20 text-blue-500"
          )}
          data-testid="mode-toggle"
        >
          {mode === 'task' ? (
            <>
              <Bot className="h-4 w-4" />
              <span className="font-medium">Task Mode</span>
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Chat Mode</span>
            </>
          )}
        </button>

        {/* New Chat Button */}
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          onClick={handleNewChat}
          data-testid="new-chat-button"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Agents Section */}
      <div className="p-3 border-b">
        {/* Collapsible Agents Header */}
        <button
          onClick={() => setIsAgentsCollapsed(!isAgentsCollapsed)}
          className="w-full flex items-center gap-2 px-2 mb-2 hover:bg-accent rounded transition-colors"
          data-testid="agents-toggle"
        >
          {isAgentsCollapsed ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agents
          </span>
          {agents.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {agents.length}
            </span>
          )}
        </button>

        {/* Agent List (collapsible) */}
        {!isAgentsCollapsed && (
          <div className="space-y-1" data-testid="agents-list">
            {isLoadingAgents ? (
              <p className="px-2 text-xs text-muted-foreground">Loading...</p>
            ) : agents.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">No agents configured</p>
            ) : (
              agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
                    selectedAgentId === agent.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent"
                  )}
                  data-testid={`agent-item-${agent.id}`}
                >
                  <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                  </div>
                  {agent.times_used > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {agent.times_used}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Conversation History */}
      <div className="flex-1 p-3 overflow-y-auto">
        {/* Collapsible History Header */}
        <button
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          className="w-full flex items-center gap-2 px-2 mb-2 hover:bg-accent rounded transition-colors"
          data-testid="history-toggle"
        >
          {isHistoryCollapsed ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            History
          </span>
          {conversations.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {conversations.length}
            </span>
          )}
        </button>

        {/* Conversation List (collapsible) */}
        {!isHistoryCollapsed && (
          <div className="space-y-1" data-testid="conversation-list">
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
        )}
      </div>
    </aside>
  );
}
