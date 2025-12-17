import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { useChatProjects } from '@/hooks/useChatProjects';
import { ChatHeader, ChatInput, MessageList } from '@/components/chat';
import { ProjectSelector } from '@/components/chat/ProjectSelector';
import { useChatContext } from '@/contexts/ChatContext';

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationIdParam = searchParams.get('conversation');

  // Chat mode and project from context
  const { mode, setMode, selectedChatProjectId, setSelectedChatProjectId, notifyTitleUpdate } = useChatContext();

  // Chat projects hook
  const {
    projects,
    isLoading: projectsLoading,
    createProject,
    deleteProject,
  } = useChatProjects();

  const {
    messages,
    isConnected,
    isStreaming,
    sessionId,
    conversationId,
    error,
    currentModel,
    sendMessage,
    updateModel,
    updateChatProjectId,
    cancelStream,
    newConversation,
    resumeConversation,
  } = useChat({
    onError: (err) => console.error('Chat error:', err),
    onModelSwitch: (from, to) => console.log(`[Chat] Model switched from ${from} to ${to}`),
    onResume: (id, history) => console.log(`[Chat] Resumed conversation ${id} with ${history.length} messages`),
    onTitleUpdate: notifyTitleUpdate,
    chatProjectId: selectedChatProjectId,
  });

  // Handle URL-based conversation resumption
  useEffect(() => {
    if (conversationIdParam) {
      const targetId = parseInt(conversationIdParam, 10);
      // Only resume if we're not already on this conversation
      if (!isNaN(targetId) && targetId !== conversationId) {
        resumeConversation(targetId);
      }
    }
  }, [conversationIdParam, conversationId, resumeConversation]);

  // Sync chat project ID when selection changes
  useEffect(() => {
    updateChatProjectId(selectedChatProjectId);
  }, [selectedChatProjectId, updateChatProjectId]);

  // Project selector state
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Project context is now managed in sidebar

  const handleCreateProject = async (projectData: { name: string; description?: string; instructions?: string; linked_job_number?: string }) => {
    const newProject = await createProject(projectData);
    if (newProject) {
      setSelectedChatProjectId(newProject.id);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    const success = await deleteProject(projectId);
    if (success && selectedChatProjectId === projectId) {
      setSelectedChatProjectId(null);
    }
  };

  const handleModeChange = (newMode: 'agent' | 'chat') => {
    setMode(newMode);
    // Clear project when switching to agent mode
    if (newMode === 'agent') {
      setSelectedChatProjectId(null);
    }
  };

  // Handle new chat - clear URL param and start fresh
  const handleNewChat = () => {
    setSearchParams({});
    newConversation();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader
        isConnected={isConnected}
        onNewChat={handleNewChat}
      />

      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onCancel={cancelStream}
        isStreaming={isStreaming}
        disabled={!isConnected}
        sessionId={sessionId}
        model={currentModel}
        onModelChange={updateModel}
        mode={mode}
        onModeChange={handleModeChange}
      />

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <ProjectSelector
          projects={projects}
          currentProjectId={selectedChatProjectId}
          onSelect={setSelectedChatProjectId}
          onCreate={handleCreateProject}
          onDelete={handleDeleteProject}
          onClose={() => setShowProjectSelector(false)}
          isLoading={projectsLoading}
        />
      )}
    </div>
  );
}
