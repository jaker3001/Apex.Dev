import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Available tools that agents can use
const AVAILABLE_TOOLS = [
  { id: 'Read', name: 'Read Files', description: 'Read contents of files' },
  { id: 'Write', name: 'Write Files', description: 'Create and write to files' },
  { id: 'Edit', name: 'Edit Files', description: 'Make targeted edits to files' },
  { id: 'Bash', name: 'Run Commands', description: 'Execute shell commands' },
  { id: 'Glob', name: 'Find Files', description: 'Search for files by pattern' },
  { id: 'Grep', name: 'Search Content', description: 'Search file contents with regex' },
  { id: 'WebSearch', name: 'Web Search', description: 'Search the internet' },
  { id: 'WebFetch', name: 'Fetch URLs', description: 'Retrieve content from URLs' },
  { id: 'Task', name: 'Sub-agents', description: 'Delegate tasks to sub-agents' },
];

// Agent templates for quick start
const TEMPLATES = [
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for best practices, bugs, and improvements',
    tools: ['Read', 'Glob', 'Grep'],
    prompt: 'You are a senior code reviewer. Analyze code for bugs, security issues, performance problems, and adherence to best practices. Provide specific, actionable feedback.',
  },
  {
    id: 'documentation',
    name: 'Documentation Writer',
    description: 'Creates and updates documentation for code',
    tools: ['Read', 'Write', 'Edit', 'Glob'],
    prompt: 'You are a technical writer. Create clear, comprehensive documentation for code. Include examples, explain edge cases, and maintain consistent formatting.',
  },
  {
    id: 'researcher',
    name: 'Research Assistant',
    description: 'Searches the web and summarizes findings',
    tools: ['WebSearch', 'WebFetch', 'Write'],
    prompt: 'You are a research assistant. Search for information on topics, synthesize findings from multiple sources, and provide well-organized summaries with citations.',
  },
  {
    id: 'custom',
    name: 'Custom Agent',
    description: 'Start from scratch with full control',
    tools: [],
    prompt: '',
  },
];

interface AgentWizardProps {
  onClose: () => void;
  onSave: (agent: AgentConfig) => void;
}

export interface AgentConfig {
  name: string;
  description: string;
  tools: string[];
  systemPrompt: string;
  icon?: string;
}

type WizardStep = 'template' | 'basics' | 'tools' | 'prompt' | 'review';

export function AgentWizard({ onClose, onSave }: AgentWizardProps) {
  const [step, setStep] = useState<WizardStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    tools: [],
    systemPrompt: '',
  });

  const steps: WizardStep[] = ['template', 'basics', 'tools', 'prompt', 'review'];
  const currentIndex = steps.indexOf(step);

  const handleTemplateSelect = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      if (templateId !== 'custom') {
        setConfig({
          name: template.name,
          description: template.description,
          tools: template.tools,
          systemPrompt: template.prompt,
        });
      }
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const toggleTool = (toolId: string) => {
    setConfig((prev) => ({
      ...prev,
      tools: prev.tools.includes(toolId)
        ? prev.tools.filter((t) => t !== toolId)
        : [...prev.tools, toolId],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Create Agent</h2>
              <p className="text-sm text-muted-foreground">
                Step {currentIndex + 1} of {steps.length}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'template' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose a template</h3>
              <p className="text-muted-foreground mb-6">
                Start with a template or create a custom agent from scratch.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`p-4 text-left border rounded-lg transition-all ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {template.id === 'custom' ? (
                        <Sparkles className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="w-5 h-5 rounded bg-primary/20" />
                      )}
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'basics' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Basic Information</h3>
              <p className="text-muted-foreground mb-6">
                Give your agent a name and description.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="e.g., Code Reviewer"
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    placeholder="What does this agent do?"
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'tools' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Tools</h3>
              <p className="text-muted-foreground mb-6">
                Choose which tools this agent can use.
              </p>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => toggleTool(tool.id)}
                    className={`w-full p-3 text-left border rounded-lg transition-all flex items-center gap-3 ${
                      config.tools.includes(tool.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        config.tools.includes(tool.id)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {config.tools.includes(tool.id) && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{tool.name}</p>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'prompt' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">System Prompt</h3>
              <p className="text-muted-foreground mb-6">
                Define the agent's behavior and personality.
              </p>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                placeholder="You are a helpful assistant that..."
                rows={10}
                className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
              />
            </div>
          )}

          {step === 'review' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Review & Create</h3>
              <p className="text-muted-foreground mb-6">
                Review your agent configuration before creating.
              </p>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{config.name || '(not set)'}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{config.description || '(not set)'}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Tools ({config.tools.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {config.tools.length > 0 ? (
                      config.tools.map((toolId) => (
                        <span
                          key={toolId}
                          className="px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                        >
                          {AVAILABLE_TOOLS.find((t) => t.id === toolId)?.name || toolId}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">(no tools selected)</span>
                    )}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">System Prompt</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {config.systemPrompt || '(not set)'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step === 'review' ? (
            <Button onClick={handleSave} disabled={!config.name}>
              Create Agent
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={step === 'template' && !selectedTemplate}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
