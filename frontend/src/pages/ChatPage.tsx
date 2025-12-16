import { useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatHeader, ChatInput, MessageList } from '@/components/chat';
import { ProjectSelector, type Project } from '@/components/chat/ProjectSelector';

// Demo projects
const DEMO_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'State Farm Claims',
    description: 'All State Farm insurance claim communications',
    instructions: 'When drafting emails, use a professional but friendly tone. Reference claim numbers when available.',
    files: [],
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Water Damage Standards',
    description: 'IICRC S500 research and documentation',
    instructions: 'Focus on IICRC S500 standards. Cite specific sections when referencing drying standards.',
    files: ['iicrc-s500-reference.pdf'],
    createdAt: new Date('2024-02-01'),
  },
];

export function ChatPage() {
  const {
    messages,
    isConnected,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    newConversation,
  } = useChat({
    onError: (err) => console.error('Chat error:', err),
  });

  // Chat mode and model state
  const [mode, setMode] = useState<'agent' | 'chat'>('agent');
  const [model, setModel] = useState('claude-sonnet-4-5-20250514');

  // Project state (for Chat Mode)
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleCreateProject = (projectData: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    setProjects((prev) => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
    }
  };

  const handleModeChange = (newMode: 'agent' | 'chat') => {
    setMode(newMode);
    // Clear project when switching to agent mode
    if (newMode === 'agent') {
      setCurrentProjectId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ChatHeader
        isConnected={isConnected}
        onNewChat={newConversation}
        mode={mode}
        onModeChange={handleModeChange}
        model={model}
        onModelChange={setModel}
        currentProject={currentProject?.name || null}
        onProjectSelect={() => setShowProjectSelector(true)}
      />

      {/* Project context banner (Chat Mode with project selected) */}
      {mode === 'chat' && currentProject && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-sm">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <span className="font-medium text-blue-700">Project:</span>
            <span className="text-blue-600">{currentProject.name}</span>
            {currentProject.instructions && (
              <span className="text-blue-500 text-xs ml-2">
                (Custom instructions active)
              </span>
            )}
          </div>
        </div>
      )}

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
      />

      {/* Project Selector Modal */}
      {showProjectSelector && (
        <ProjectSelector
          projects={projects}
          currentProjectId={currentProjectId}
          onSelect={setCurrentProjectId}
          onCreate={handleCreateProject}
          onDelete={handleDeleteProject}
          onClose={() => setShowProjectSelector(false)}
        />
      )}
    </div>
  );
}
