import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Puzzle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SkillWizardProps {
  onClose: () => void;
  onSave: (skill: SkillConfig) => void;
}

export interface SkillConfig {
  name: string;
  description: string;
  inputType: string;
  outputType: string;
  instructions: string;
}

type WizardStep = 'definition' | 'instructions' | 'review';

const INPUT_TYPES = [
  { id: 'text', name: 'Text', description: 'Plain text input' },
  { id: 'file', name: 'File', description: 'A file path or file contents' },
  { id: 'json', name: 'JSON', description: 'Structured JSON data' },
  { id: 'url', name: 'URL', description: 'A web URL' },
];

const OUTPUT_TYPES = [
  { id: 'text', name: 'Text', description: 'Plain text response' },
  { id: 'file', name: 'File', description: 'Creates or modifies a file' },
  { id: 'json', name: 'JSON', description: 'Structured JSON data' },
  { id: 'action', name: 'Action', description: 'Performs an action (no output)' },
];

export function SkillWizard({ onClose, onSave }: SkillWizardProps) {
  const [step, setStep] = useState<WizardStep>('definition');
  const [config, setConfig] = useState<SkillConfig>({
    name: '',
    description: '',
    inputType: 'text',
    outputType: 'text',
    instructions: '',
  });

  const steps: WizardStep[] = ['definition', 'instructions', 'review'];
  const currentIndex = steps.indexOf(step);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Puzzle className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-semibold">Create Skill</h2>
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
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'definition' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Define Your Skill</h3>
              <p className="text-muted-foreground mb-6">
                Skills are reusable capabilities with clear inputs and outputs.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => setConfig({ ...config, name: e.target.value })}
                    placeholder="e.g., Summarize Document"
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={config.description}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    placeholder="What does this skill do?"
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Input Type</label>
                    <div className="space-y-2">
                      {INPUT_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setConfig({ ...config, inputType: type.id })}
                          className={`w-full p-3 text-left border rounded-lg transition-all ${
                            config.inputType === type.id
                              ? 'border-purple-500 bg-purple-500/5'
                              : 'hover:border-purple-500/50'
                          }`}
                        >
                          <p className="font-medium text-sm">{type.name}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Output Type</label>
                    <div className="space-y-2">
                      {OUTPUT_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setConfig({ ...config, outputType: type.id })}
                          className={`w-full p-3 text-left border rounded-lg transition-all ${
                            config.outputType === type.id
                              ? 'border-purple-500 bg-purple-500/5'
                              : 'hover:border-purple-500/50'
                          }`}
                        >
                          <p className="font-medium text-sm">{type.name}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'instructions' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Instructions</h3>
              <p className="text-muted-foreground mb-6">
                Describe what the skill should do in plain English.
              </p>
              <textarea
                value={config.instructions}
                onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                placeholder="When given [input], this skill should...

For example:
- Analyze the document for key themes
- Extract important dates and deadlines
- Summarize the main points in 3-5 bullet points
- Format the output as markdown"
                rows={12}
                className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-sm"
              />
            </div>
          )}

          {step === 'review' && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Review & Create</h3>
              <p className="text-muted-foreground mb-6">
                Review your skill configuration before creating.
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Input</p>
                    <p className="font-medium">
                      {INPUT_TYPES.find((t) => t.id === config.inputType)?.name}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Output</p>
                    <p className="font-medium">
                      {OUTPUT_TYPES.find((t) => t.id === config.outputType)?.name}
                    </p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Instructions</p>
                  <p className="text-sm whitespace-pre-wrap">
                    {config.instructions || '(not set)'}
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
            <Button
              onClick={handleSave}
              disabled={!config.name}
              className="bg-purple-500 hover:bg-purple-600"
            >
              Create Skill
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="bg-purple-500 hover:bg-purple-600"
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
