import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Bot, MoreHorizontal, Play, Pencil, Trash2, Loader2 } from 'lucide-react';
import { AgentWizard, type AgentConfig } from '@/components/builder/AgentWizard';
import { useAgents } from '@/hooks/useAgents';

export function AgentsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  // Use the shared hook for fetching agents
  const { agents, isLoading, error, createAgent, deleteAgent, fetchAgents } = useAgents({
    activeOnly: false // Show all agents in admin page
  });

  const handleSaveAgent = async (config: AgentConfig) => {
    await createAgent({
      name: config.name,
      description: config.description,
      capabilities: config.tools,
    });
  };

  const handleDeleteAgent = async (id: number, name: string) => {
    if (window.confirm(`Delete agent "${name}"?`)) {
      await deleteAgent(name);
      await fetchAgents();
    }
    setMenuOpen(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-muted-foreground">
              Create and manage specialized AI agents
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {!isLoading && !error && agents.length === 0 ? (
          /* Empty State */
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Agents are specialized assistants with custom capabilities. Create one to automate
              repetitive tasks or handle specific types of work.
            </p>
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first agent
            </Button>
          </div>
        ) : !isLoading && !error && (
          /* Agent Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setMenuOpen(menuOpen === agent.id ? null : agent.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {menuOpen === agent.id && (
                      <div className="absolute right-0 top-8 bg-background border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        <button
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          onClick={() => setMenuOpen(null)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                          onClick={() => handleDeleteAgent(agent.id, agent.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{agent.name}</h3>
                  {!agent.is_active && (
                    <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities?.slice(0, 3).map((capability) => (
                      <span
                        key={capability}
                        className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                      >
                        {capability}
                      </span>
                    ))}
                    {agent.capabilities && agent.capabilities.length > 3 && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                        +{agent.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {agent.times_used} uses
                  </span>
                </div>

                <Button variant="outline" size="sm" className="w-full mt-4">
                  <Play className="h-4 w-4 mr-2" />
                  Run Agent
                </Button>
              </div>
            ))}

            {/* Add New Card */}
            <button
              onClick={() => setShowWizard(true)}
              className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[200px] hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-muted-foreground">Add Agent</span>
            </button>
          </div>
        )}
      </div>

      {/* Agent Wizard Modal */}
      {showWizard && (
        <AgentWizard
          onClose={() => setShowWizard(false)}
          onSave={handleSaveAgent}
        />
      )}
    </div>
  );
}
