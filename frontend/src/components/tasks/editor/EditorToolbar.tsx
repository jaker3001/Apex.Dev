import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  onInsert: (before: string, after?: string, placeholder?: string) => void;
  disabled?: boolean;
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  before: string;
  after?: string;
  placeholder?: string;
}

const toolbarButtons: ToolbarButton[] = [
  { icon: Bold, label: 'Bold', before: '**', after: '**', placeholder: 'bold text' },
  { icon: Italic, label: 'Italic', before: '*', after: '*', placeholder: 'italic text' },
  { icon: Underline, label: 'Underline', before: '<u>', after: '</u>', placeholder: 'underlined text' },
  { icon: Strikethrough, label: 'Strikethrough', before: '~~', after: '~~', placeholder: 'strikethrough text' },
  { icon: Heading1, label: 'Heading 1', before: '# ', placeholder: 'Heading 1' },
  { icon: Heading2, label: 'Heading 2', before: '## ', placeholder: 'Heading 2' },
  { icon: List, label: 'Bullet List', before: '- ', placeholder: 'list item' },
  { icon: ListOrdered, label: 'Numbered List', before: '1. ', placeholder: 'list item' },
  { icon: Code, label: 'Inline Code', before: '`', after: '`', placeholder: 'code' },
  { icon: Link, label: 'Link', before: '[', after: '](url)', placeholder: 'link text' },
  { icon: Minus, label: 'Horizontal Rule', before: '\n---\n' },
];

export function EditorToolbar({ onInsert, disabled }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1 p-1.5 bg-muted/50 rounded-t-lg border border-b-0 border-border">
      {toolbarButtons.map((button) => {
        const Icon = button.icon;
        return (
          <button
            key={button.label}
            type="button"
            onClick={() => onInsert(button.before, button.after, button.placeholder)}
            disabled={disabled}
            className={cn(
              'p-1.5 rounded hover:bg-muted transition-colors',
              'text-muted-foreground hover:text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={button.label}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
