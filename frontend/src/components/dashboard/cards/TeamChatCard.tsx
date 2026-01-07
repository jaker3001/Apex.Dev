import { MessageSquare, Users, Send, ChevronRight } from 'lucide-react';

interface TeamChatCardProps {
  onViewAll?: () => void;
}

export function TeamChatCard({ onViewAll }: TeamChatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-foreground">Team Chat</h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            disabled
            className="text-sm text-muted-foreground flex items-center gap-1 cursor-not-allowed"
          >
            Open
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content - Placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
          <Users className="w-7 h-7 text-indigo-400" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">Coming Soon</p>
        <p className="text-muted-foreground/60 text-xs mt-2 max-w-[200px]">
          Real-time team messaging to coordinate with your crew
        </p>

        {/* Preview mockup */}
        <div className="mt-6 w-full space-y-2 opacity-50">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-muted-foreground">JD</span>
            </div>
            <div className="bg-muted rounded-lg rounded-tl-none p-2 max-w-[80%]">
              <p className="text-xs text-muted-foreground">Finishing up drying at the Murphy job</p>
            </div>
          </div>
          <div className="flex items-start gap-2 justify-end">
            <div className="bg-indigo-500/20 rounded-lg rounded-tr-none p-2 max-w-[80%]">
              <p className="text-xs text-indigo-400">Great, I'll head over after lunch</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white">ME</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input placeholder */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 opacity-50">
          <input
            type="text"
            placeholder="Message your team..."
            disabled
            className="flex-1 bg-transparent text-sm text-muted-foreground placeholder-muted-foreground/60 outline-none cursor-not-allowed"
          />
          <button
            disabled
            className="p-1.5 text-muted-foreground cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
