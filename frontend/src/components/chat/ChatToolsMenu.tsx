import { useState, useRef, useEffect } from 'react';
import { Settings2, Check, Zap, Bot, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatToolsMenuProps {
  model: string;
  onModelChange: (model: string) => void;
  mode: 'chat' | 'agent';
  onModeChange: (mode: 'chat' | 'agent') => void;
}

const MODELS = [
  { id: 'claude-sonnet-4-5', name: 'Sonnet 4.5', description: 'Fast & balanced', cost: '$$', recommended: true },
  { id: 'claude-opus-4-5', name: 'Opus 4.5', description: 'Most intelligent', cost: '$$$' },
  { id: 'claude-sonnet-4-0', name: 'Sonnet 4', description: 'Fast & capable', cost: '$$' },
  { id: 'claude-haiku-4-5', name: 'Haiku 4.5', description: 'Quick & cheap', cost: '$' },
];

export function ChatToolsMenu({
  model,
  onModelChange,
  mode,
  onModeChange,
}: ChatToolsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Trigger button */}
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 rounded-xl"
        title="Chat options"
      >
        <Settings2 className="h-5 w-5" />
      </Button>

      {/* Menu popover */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 w-64 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50"
        >
          {/* Model Section */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <Zap className="h-3 w-3" />
              Model
            </div>
            <div className="space-y-1">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onModelChange(m.id);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
                    model === m.id
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {model === m.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    {model !== m.id && <div className="w-3.5" />}
                    <span>{m.name}</span>
                    {m.recommended && (
                      <span className="text-[10px] px-1 py-0.5 bg-primary/10 text-primary rounded">
                        default
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{m.cost}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Section */}
          <div className="p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Mode
            </div>
            <div className="space-y-1">
              <button
                onClick={() => onModeChange('chat')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
                  mode === 'chat'
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {mode === 'chat' && <Check className="h-3.5 w-3.5 text-primary" />}
                {mode !== 'chat' && <div className="w-3.5" />}
                <MessageSquare className="h-4 w-4" />
                <div>
                  <span>Chat</span>
                  <span className="block text-xs text-muted-foreground">Simple conversations with projects</span>
                </div>
              </button>
              <button
                onClick={() => onModeChange('agent')}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
                  mode === 'agent'
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {mode === 'agent' && <Check className="h-3.5 w-3.5 text-primary" />}
                {mode !== 'agent' && <div className="w-3.5" />}
                <Bot className="h-4 w-4" />
                <div>
                  <span>Agent</span>
                  <span className="block text-xs text-muted-foreground">Full tools, MCPs, sub-agents</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
