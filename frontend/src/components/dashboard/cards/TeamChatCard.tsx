import { MessageSquare, Users, Send, ChevronRight } from 'lucide-react';

interface TeamChatCardProps {
  onViewAll?: () => void;
}

export function TeamChatCard({ onViewAll }: TeamChatCardProps) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Team Chat</h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            disabled
            className="text-sm text-slate-500 flex items-center gap-1 cursor-not-allowed"
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
        <p className="text-slate-400 text-sm font-medium">Coming Soon</p>
        <p className="text-slate-500 text-xs mt-2 max-w-[200px]">
          Real-time team messaging to coordinate with your crew
        </p>

        {/* Preview mockup */}
        <div className="mt-6 w-full space-y-2 opacity-50">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-slate-400">JD</span>
            </div>
            <div className="bg-slate-700/50 rounded-lg rounded-tl-none p-2 max-w-[80%]">
              <p className="text-xs text-slate-400">Finishing up drying at the Murphy job</p>
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
      <div className="px-3 py-2 border-t border-slate-700">
        <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2 opacity-50">
          <input
            type="text"
            placeholder="Message your team..."
            disabled
            className="flex-1 bg-transparent text-sm text-slate-400 placeholder-slate-500 outline-none cursor-not-allowed"
          />
          <button
            disabled
            className="p-1.5 text-slate-500 cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
