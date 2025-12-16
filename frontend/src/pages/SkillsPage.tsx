import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Puzzle, MoreHorizontal, Play, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { SkillWizard, type SkillConfig } from '@/components/builder/SkillWizard';

// Mock data for demo
const DEMO_SKILLS: (SkillConfig & { id: string; usageCount: number })[] = [
  {
    id: '1',
    name: 'Summarize Document',
    description: 'Extracts key points and creates a concise summary',
    inputType: 'file',
    outputType: 'text',
    instructions: 'Read the document and extract the main themes, key points, and action items.',
    usageCount: 89,
  },
  {
    id: '2',
    name: 'Extract Line Items',
    description: 'Pulls line items from an Xactimate estimate',
    inputType: 'file',
    outputType: 'json',
    instructions: 'Parse the estimate file and extract all line items with quantities and prices.',
    usageCount: 156,
  },
];

const TEMPLATES = [
  { name: 'PDF Extractor', desc: 'Extract data from PDFs', inputType: 'file', outputType: 'json' },
  { name: 'Email Drafter', desc: 'Draft professional emails', inputType: 'text', outputType: 'text' },
  { name: 'Line Item Lookup', desc: 'Look up standard pricing', inputType: 'text', outputType: 'json' },
  { name: 'Web Research', desc: 'Search and summarize info', inputType: 'url', outputType: 'text' },
];

export function SkillsPage() {
  const [showWizard, setShowWizard] = useState(false);
  const [skills, setSkills] = useState(DEMO_SKILLS);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleSaveSkill = (config: SkillConfig) => {
    const newSkill = {
      ...config,
      id: Date.now().toString(),
      usageCount: 0,
    };
    setSkills((prev) => [...prev, newSkill]);
  };

  const handleDeleteSkill = (id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
    setMenuOpen(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Skills</h1>
            <p className="text-muted-foreground">
              Reusable capabilities for agents and chat
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)} className="bg-purple-500 hover:bg-purple-600">
            <Plus className="h-4 w-4 mr-2" />
            New Skill
          </Button>
        </div>

        {/* Templates Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Start from a template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => setShowWizard(true)}
                className="p-4 text-left border rounded-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors group"
              >
                <Puzzle className="h-6 w-6 mb-2 text-purple-500" />
                <p className="font-medium">{template.name}</p>
                <p className="text-sm text-muted-foreground mb-2">{template.desc}</p>
                <div className="flex items-center text-xs text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Use template
                  <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Skills List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your skills</h2>
          {skills.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <Puzzle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Skills are simple, reusable capabilities. They're great for tasks with
                clear inputs and outputs that you do repeatedly.
              </p>
              <Button onClick={() => setShowWizard(true)} className="bg-purple-500 hover:bg-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Create your first skill
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="border rounded-lg p-4 hover:border-purple-500/50 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Puzzle className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setMenuOpen(menuOpen === skill.id ? null : skill.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      {menuOpen === skill.id && (
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
                            onClick={() => handleDeleteSkill(skill.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold mb-1">{skill.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {skill.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-muted rounded">
                        {skill.inputType} → {skill.outputType}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {skill.usageCount} uses
                    </span>
                  </div>

                  <Button variant="outline" size="sm" className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Run Skill
                  </Button>
                </div>
              ))}

              {/* Add New Card */}
              <button
                onClick={() => setShowWizard(true)}
                className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[200px] hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors"
              >
                <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-muted-foreground">Add Skill</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Skill Wizard Modal */}
      {showWizard && (
        <SkillWizard
          onClose={() => setShowWizard(false)}
          onSave={handleSaveSkill}
        />
      )}
    </div>
  );
}
