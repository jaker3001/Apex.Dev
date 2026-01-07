import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Plus,
  Trash2,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Plug,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversations, type ConversationPreview } from '@/hooks/useConversations';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useChatContext } from '@/contexts/ChatContext';
import { useAgents } from '@/hooks/useAgents';
import { useChatProjects } from '@/hooks/useChatProjects';
import { useMCP } from '@/hooks/useMCP';
import { useSkills } from '@/hooks/useSkills';
import { ProjectModal } from '@/components/chat/ProjectModal';

// Re-export type for external use
export type { ConversationPreview };

interface ConversationItemProps {
  conversation: ConversationPreview;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  isActive?: boolean;
}

function ConversationItem({ conversation, onSelect, onDelete, isActive }: ConversationItemProps) {
  const title = conversation.title || 'New Conversation';
  const timestamp = new Date(conversation.updatedAt);
  const isToday = new Date().toDateString() === timestamp.toDateString();
  const timeDisplay = isToday
    ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
        isActive ? 'bg-primary/15' : 'hover:bg-muted'
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <MessageSquare className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("text-sm truncate flex-1", isActive ? "text-primary font-medium" : "text-foreground")}>{title}</span>
      <span className={cn("text-xs", isActive ? "text-primary/70" : "text-muted-foreground")}>{timeDisplay}</span>
      <button
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-opacity text-muted-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation.id);
        }}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
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
  const { conversations, isLoading, deleteConversation, fetchConversations, updateConversationTitle } = useConversations({
    limit: 20,
    includeInactive: false,
  });

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useLocalStorage('chatSidebar.collapsed', false);

  // Section collapse states
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useLocalStorage('chatSidebar.historyCollapsed', false);
  const [isAgentsCollapsed, setIsAgentsCollapsed] = useLocalStorage('chatSidebar.agentsCollapsed', false);
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useLocalStorage('chatSidebar.projectsCollapsed', false);
  const [isMCPCollapsed, setIsMCPCollapsed] = useLocalStorage('chatSidebar.mcpCollapsed', false);
  const [isSkillsCollapsed, setIsSkillsCollapsed] = useLocalStorage('chatSidebar.skillsCollapsed', false);

  // Agents from API
  const { agents, isLoading: isLoadingAgents } = useAgents({ activeOnly: true });

  // MCP servers from API
  const { servers: mcpServers, isLoading: isLoadingMCP, toggleServer } = useMCP();

  // Skills from API
  const { skills, isLoading: isLoadingSkills } = useSkills();

  // Projects from API
  const { projects, isLoading: isLoadingProjects, createProject } = useChatProjects();

  // Project modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Mode and selection from context
  const { mode, selectedAgentId, setSelectedAgentId, selectedChatProjectId, setSelectedChatProjectId, onTitleUpdate } = useChatContext();

  // Subscribe to title updates
  useEffect(() => {
    const unsubscribe = onTitleUpdate((conversationId, title) => {
      updateConversationTitle(conversationId, title);
    });
    return unsubscribe;
  }, [onTitleUpdate, updateConversationTitle]);

  const handleNewChat = () => {
    onNewChat?.();
    navigate('/');
  };

  const handleSelectConversation = (id: number) => {
    onSelectConversation?.(id);
    navigate(`/?conversation=${id}`);
  };

  const handleDeleteConversation = async (id: number) => {
    if (window.confirm('Delete this conversation?')) {
      await deleteConversation(id);
      fetchConversations();
    }
  };

  const handleCreateProject = async (data: {
    name: string;
    description?: string;
    instructions?: string;
    knowledge_path?: string;
    linked_job_number?: string;
  }) => {
    setIsCreatingProject(true);
    try {
      const newProject = await createProject(data);
      if (newProject) {
        setSelectedChatProjectId(newProject.id);
      }
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <aside className="w-12 h-full bg-background border-r flex flex-col items-center py-3 gap-1">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>

        <button
          onClick={handleNewChat}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="New Chat"
        >
          <Plus className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <button
          className="p-2 rounded-lg hover:bg-muted transition-colors relative"
          title="History"
        >
          <Clock className="h-5 w-5" />
          {conversations.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-muted-foreground text-background text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
              {conversations.length > 9 ? '9+' : conversations.length}
            </span>
          )}
        </button>
      </aside>
    );
  }

  // Expanded view
  return (
    <aside className="w-64 h-full bg-card/50 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <Button
          className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
          variant="outline"
          size="sm"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Mode-specific content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'chat' ? (
          // Chat Mode: Projects
          <div className="p-3 border-b border-border">
            <button
              onClick={() => setIsProjectsCollapsed(!isProjectsCollapsed)}
              className="w-full flex items-center gap-2 mb-2 hover:bg-muted rounded px-1 py-0.5 transition-colors"
            >
              {isProjectsCollapsed ? (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Projects
              </span>
              {projects.length > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">{projects.length}</span>
              )}
            </button>

            {!isProjectsCollapsed && (
              <div className="space-y-0.5">
                {isLoadingProjects ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Loading...</p>
                ) : projects.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">No projects yet</p>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedChatProjectId(selectedChatProjectId === project.id ? null : project.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                        selectedChatProjectId === project.id
                          ? 'bg-primary/15 text-primary'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <FolderOpen className={cn("h-4 w-4 flex-shrink-0", selectedChatProjectId === project.id ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm truncate">{project.name}</span>
                    </button>
                  ))
                )}
                <button
                  onClick={() => setShowProjectModal(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">New Project</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          // Agent Mode: Agents, MCPs, Skills
          <>
            {/* Agents Section */}
            <div className="p-3 border-b border-border">
              <button
                onClick={() => setIsAgentsCollapsed(!isAgentsCollapsed)}
                className="w-full flex items-center gap-2 mb-2 hover:bg-muted rounded px-1 py-0.5 transition-colors"
              >
                {isAgentsCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Agents
                </span>
                {agents.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">{agents.length}</span>
                )}
              </button>

              {!isAgentsCollapsed && (
                <div className="space-y-0.5">
                  {isLoadingAgents ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">Loading...</p>
                  ) : agents.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No agents configured</p>
                  ) : (
                    agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                          selectedAgentId === agent.id
                            ? 'bg-primary/15 text-primary'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Bot className={cn("h-4 w-4 flex-shrink-0", selectedAgentId === agent.id ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm truncate flex-1">{agent.name}</span>
                        {agent.times_used > 0 && (
                          <span className="text-xs text-muted-foreground">{agent.times_used}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* MCP Servers Section */}
            <div className="p-3 border-b border-border">
              <button
                onClick={() => setIsMCPCollapsed(!isMCPCollapsed)}
                className="w-full flex items-center gap-2 mb-2 hover:bg-muted rounded px-1 py-0.5 transition-colors"
              >
                {isMCPCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
                <Plug className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  MCP Servers
                </span>
                {mcpServers.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">{mcpServers.length}</span>
                )}
              </button>

              {!isMCPCollapsed && (
                <div className="space-y-0.5">
                  {isLoadingMCP ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">Loading...</p>
                  ) : mcpServers.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No MCP servers configured</p>
                  ) : (
                    mcpServers.map((server) => (
                      <button
                        key={server.id}
                        onClick={() => toggleServer(server.name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-muted text-foreground transition-colors"
                        title={`Click to ${server.status === 'active' ? 'disable' : 'enable'}`}
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full flex-shrink-0',
                            server.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground/50'
                          )}
                        />
                        <span className="text-sm truncate flex-1">{server.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{server.server_type}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Skills Section */}
            <div className="p-3 border-b border-border">
              <button
                onClick={() => setIsSkillsCollapsed(!isSkillsCollapsed)}
                className="w-full flex items-center gap-2 mb-2 hover:bg-muted rounded px-1 py-0.5 transition-colors"
              >
                {isSkillsCollapsed ? (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Skills
                </span>
                {skills.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">{skills.length}</span>
                )}
              </button>

              {!isSkillsCollapsed && (
                <div className="space-y-0.5">
                  {isLoadingSkills ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">Loading...</p>
                  ) : skills.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No skills configured</p>
                  ) : (
                    skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-muted text-foreground transition-colors"
                      >
                        <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{skill.name}</span>
                        {skill.times_used > 0 && (
                          <span className="text-xs text-muted-foreground">{skill.times_used}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* History Section (always shown) */}
        <div className="p-3">
          <button
            onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
            className="w-full flex items-center gap-2 mb-2 hover:bg-muted rounded px-1 py-0.5 transition-colors"
          >
            {isHistoryCollapsed ? (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent
            </span>
            {conversations.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">{conversations.length}</span>
            )}
          </button>

          {!isHistoryCollapsed && (
            <div className="space-y-0.5">
              {isLoading ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">No conversations yet</p>
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
      </div>

      {/* Project Modal */}
      {showProjectModal && (
        <ProjectModal
          onSave={handleCreateProject}
          onClose={() => setShowProjectModal(false)}
          isLoading={isCreatingProject}
        />
      )}
    </aside>
  );
}
