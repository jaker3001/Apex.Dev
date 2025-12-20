import { Plus, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  isConnected: boolean;
  onNewChat: () => void;
}

export function ChatHeader({
  isConnected,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border">
      {/* Left side - connection error only */}
      <div className="flex items-center gap-2">
        {!isConnected && (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-destructive/20 text-destructive">
            <WifiOff className="h-3 w-3" />
            Disconnected
          </span>
        )}
      </div>

      {/* Right side - New Chat */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNewChat}
        className="gap-1.5 text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </Button>
    </header>
  );
}
