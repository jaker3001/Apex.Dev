import { useState } from 'react';
import { Plus, MoreHorizontal, Wifi, WifiOff, ChevronDown, Zap, Bot, MessageSquare, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  isConnected: boolean;
  onNewChat: () => void;
  mode: 'agent' | 'chat';
  onModeChange: (mode: 'agent' | 'chat') => void;
  model: string;
  onModelChange: (model: string) => void;
  currentProject: string | null;
  onProjectSelect: () => void;
}

const MODELS = [
  { id: 'claude-sonnet-4-5', name: 'Sonnet 4.5', description: 'Fast, smart & balanced', cost: '$$', recommended: true },
  { id: 'claude-opus-4-5', name: 'Opus 4.5', description: 'Most intelligent', cost: '$$$', recommended: false },
  { id: 'claude-sonnet-4-0', name: 'Sonnet 4', description: 'Fast & capable', cost: '$$', recommended: false },
  { id: 'claude-haiku-4-5', name: 'Haiku 4.5', description: 'Quick & cheap', cost: '$', recommended: false },
];

export function ChatHeader({
  isConnected,
  onNewChat,
  mode,
  onModeChange,
  model,
  onModelChange,
  currentProject,
  onProjectSelect,
}: ChatHeaderProps) {
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0];

  return (
    <header className="border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
            >
              {mode === 'agent' ? (
                <>
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="font-medium">Agent Mode</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Chat Mode</span>
                </>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showModeDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 z-20 min-w-[200px]">
                <button
                  onClick={() => {
                    onModeChange('agent');
                    setShowModeDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 ${
                    mode === 'agent' ? 'bg-primary/5' : ''
                  }`}
                >
                  <Bot className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Agent Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Full tools, file ops, sub-agents
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onModeChange('chat');
                    setShowModeDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 ${
                    mode === 'chat' ? 'bg-primary/5' : ''
                  }`}
                >
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Chat Mode</p>
                    <p className="text-xs text-muted-foreground">
                      Simple conversation with projects
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Project Selector (Chat Mode only) */}
          {mode === 'chat' && (
            <button
              onClick={onProjectSelect}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {currentProject || 'No Project'}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          )}

          {/* Connection Status */}
          <span
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              isConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Disconnected
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
            >
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">{currentModel.name}</span>
              <span className="text-xs text-muted-foreground">{currentModel.cost}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showModelDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 z-20 min-w-[220px]">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModelChange(m.id);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between ${
                      model === m.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {m.name}
                          {m.recommended && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              Recommended
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{m.cost}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>

          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
