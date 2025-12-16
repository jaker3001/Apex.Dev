import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Bot, MoreHorizontal, Play, Pencil, Trash2 } from 'lucide-react';
import { AgentWizard, type AgentConfig } from '@/components/builder/AgentWizard';

// Mock data for demo - will be replaced with API calls
const DEMO_AGENTS: (AgentConfig & { id: string; usageCount: number })[] = [
  {
    id: '1',
    name: 'Estimate Reviewer',
    description: 'Reviews restoration estimates for completeness and accuracy',
    tools: ['Read', 'Glob', 'Grep'],
    systemPrompt: 'You are an expert at reviewing water damage restoration estimates...',
    usageCount: 47,
  },
  {
    id: '2',
    name: 'Email Drafter',
    description: 'Drafts professional emails to adjusters and clients',
    tools: ['Read', 'Write'],
    systemPrompt: 'You draft professional, concise emails for insurance communications...',
    usageCount: 123,
  },
];

export function AgentsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [agents, setAgents] = useState(DEMO_AGENTS);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleSaveAgent = (config: AgentConfig) => {
    const newAgent = {
      ...config,
      id: Date.now().toString(),
      usageCount: 0,
    };
    setAgents((prev) => [...prev, newAgent]);
  };

  const handleDeleteAgent = (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
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

        {agents.length === 0 ? (
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
        ) : (
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
                          onClick={() => handleDeleteAgent(agent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold mb-1">{agent.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {agent.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.slice(0, 3).map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                      >
                        {tool}
                      </span>
                    ))}
                    {agent.tools.length > 3 && (
                      <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                        +{agent.tools.length - 3}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {agent.usageCount} uses
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
