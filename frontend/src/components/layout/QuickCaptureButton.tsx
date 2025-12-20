import { useState } from 'react';
import { Plus, FileText, CheckSquare, Camera, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function QuickCaptureButton() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const actionButtons = [
    { icon: FileText, label: 'Note', color: 'bg-blue-500' },
    { icon: CheckSquare, label: 'Task', color: 'bg-green-500' },
    { icon: Camera, label: 'Photo', color: 'bg-purple-500' },
    { icon: Mic, label: 'Audio', color: 'bg-red-500' },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
      {/* Expanded Actions */}
      <div className={cn(
        "flex flex-col gap-3 transition-all duration-300 ease-out origin-bottom-right",
        isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-50 translate-y-10 pointer-events-none"
      )}>
        {actionButtons.map((action, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="bg-black/80 text-white text-xs font-medium px-2 py-1 rounded backdrop-blur-md shadow-sm">
              {action.label}
            </span>
            <Button
              size="icon"
              className={cn(
                "rounded-full h-12 w-12 shadow-lg border border-white/10 text-white hover:brightness-110 transition-transform hover:scale-105",
                action.color
              )}
              onClick={() => {
                console.log(`Clicked ${action.label}`);
                setIsOpen(false);
              }}
            >
              <action.icon className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB */}
      <Button
        size="icon"
        onClick={toggleOpen}
        className={cn(
          "h-16 w-16 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95",
          "bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-white/10",
          isOpen ? "rotate-45" : "rotate-0"
        )}
      >
        <Plus className="h-8 w-8" />
      </Button>
    </div>
  );
}
