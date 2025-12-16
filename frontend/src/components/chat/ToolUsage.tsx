import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { ToolUse } from '@/hooks/useChat';

interface ToolUsageProps {
  tool: ToolUse;
}

export function ToolUsage({ tool }: ToolUsageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = {
    running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-red-500" />,
  }[tool.status];

  // Format tool input for display
  const formatInput = (input: Record<string, unknown>) => {
    if (!input || Object.keys(input).length === 0) return null;

    // For common tools, show relevant info
    if (tool.name === 'Read' && input.file_path) {
      return String(input.file_path).split(/[\\/]/).pop();
    }
    if (tool.name === 'Bash' && input.command) {
      const cmd = String(input.command);
      return cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd;
    }
    if (tool.name === 'Grep' && input.pattern) {
      return `Pattern: ${input.pattern}`;
    }
    if (tool.name === 'Glob' && input.pattern) {
      return `Pattern: ${input.pattern}`;
    }

    return null;
  };

  // Format output for display
  const formatOutput = (output: unknown) => {
    if (output === undefined || output === null) return null;

    if (typeof output === 'string') {
      // Truncate long outputs
      if (output.length > 500) {
        return output.substring(0, 500) + '... (truncated)';
      }
      return output;
    }

    try {
      return JSON.stringify(output, null, 2);
    } catch {
      return String(output);
    }
  };

  const inputSummary = formatInput(tool.input);

  return (
    <div className="border rounded-lg bg-muted/50 text-sm my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/80 transition-colors rounded-lg"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}

        {statusIcon}

        <span className="font-medium">{tool.name}</span>

        {inputSummary && (
          <span className="text-muted-foreground truncate flex-1">
            {inputSummary}
          </span>
        )}

        {tool.status === 'running' && (
          <span className="text-xs text-blue-500 ml-auto">Running...</span>
        )}
      </button>

      {isExpanded && (
        <div className="border-t px-3 py-2 space-y-2">
          {/* Input */}
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Input:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto max-h-40">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}

          {/* Output */}
          {tool.output !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Output:</p>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto max-h-60 whitespace-pre-wrap">
                {formatOutput(tool.output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
