import { useState, useEffect, useCallback, useRef, Children, cloneElement, isValidElement } from 'react';
import { Calendar, Cloud, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SlideType = 'calendar' | 'weather' | 'project-tasks';

interface SlideConfig {
  type: SlideType;
  icon: typeof Calendar;
}

const slideConfigs: SlideConfig[] = [
  { type: 'calendar', icon: Calendar },
  { type: 'weather', icon: Cloud },
  { type: 'project-tasks', icon: ClipboardList },
];

interface SlideShowCardProps {
  children: React.ReactNode;
  activeSlide: SlideType;
  onSlideChange: (slide: SlideType) => void;
  onSlideClick?: (slide: SlideType) => void;
  autoRotate?: boolean;
  autoRotateInterval?: number;
}

export function SlideShowCard({
  children,
  activeSlide,
  onSlideChange,
  onSlideClick,
  autoRotate = true,
  autoRotateInterval = 8000,
}: SlideShowCardProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = slideConfigs.findIndex((s) => s.type === activeSlide);

  // Convert children to array for slide management
  const childArray = Children.toArray(children);

  const goToSlide = useCallback((index: number, direction?: 'left' | 'right') => {
    if (isAnimating) return;

    const newDirection = direction || (index > currentIndex ? 'left' : 'right');
    setSlideDirection(newDirection);
    setIsAnimating(true);

    // Small delay to trigger animation
    requestAnimationFrame(() => {
      onSlideChange(slideConfigs[index].type);
    });

    // Reset animation state after transition
    setTimeout(() => setIsAnimating(false), 500);
  }, [currentIndex, onSlideChange, isAnimating]);

  const goToNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % slideConfigs.length;
    goToSlide(nextIndex, 'left');
  }, [currentIndex, goToSlide]);

  // Auto-rotate effect
  useEffect(() => {
    if (!autoRotate || isLocked) return;

    const timer = setInterval(goToNext, autoRotateInterval);
    return () => clearInterval(timer);
  }, [autoRotate, isLocked, autoRotateInterval, goToNext]);

  const handleIconClick = (index: number) => {
    const clickedType = slideConfigs[index].type;

    if (clickedType === activeSlide) {
      // Clicking on current slide toggles lock
      setIsLocked(!isLocked);
    } else {
      // Clicking on different slide switches and locks
      goToSlide(index);
      setIsLocked(true);
    }
  };

  const handleContentClick = () => {
    // Only calendar and weather open overlays
    if (onSlideClick && activeSlide !== 'project-tasks') {
      onSlideClick(activeSlide);
    }
  };

  // Get icon state: 'normal' | 'active' | 'locked'
  const getIconState = (index: number): 'normal' | 'active' | 'locked' => {
    if (index !== currentIndex) return 'normal';
    return isLocked ? 'locked' : 'active';
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-card rounded-xl border border-border overflow-hidden"
    >
      {/* Slide container with animation */}
      <div className="relative min-h-[320px] overflow-hidden">
        {childArray.map((child, index) => {
          const isActive = index === currentIndex;
          const slideConfig = slideConfigs[index];

          if (!isValidElement(child)) return null;

          return (
            <div
              key={slideConfig?.type || index}
              className={cn(
                'absolute inset-0 transition-all duration-500 ease-in-out',
                isActive
                  ? 'translate-x-0 opacity-100 z-10'
                  : slideDirection === 'left'
                    ? '-translate-x-full opacity-0 z-0'
                    : 'translate-x-full opacity-0 z-0'
              )}
              onClick={handleContentClick}
              style={{
                cursor: onSlideClick && slideConfig?.type !== 'project-tasks' ? 'pointer' : 'default'
              }}
            >
              {cloneElement(child as React.ReactElement)}
            </div>
          );
        })}
      </div>

      {/* Icon navigation overlay - bottom center */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-4">
          {slideConfigs.map((config, index) => {
            const Icon = config.icon;
            const state = getIconState(index);

            return (
              <button
                key={config.type}
                onClick={() => handleIconClick(index)}
                className={cn(
                  'transition-all duration-300 ease-out',
                  // Normal state
                  state === 'normal' && 'text-muted-foreground hover:text-foreground scale-100',
                  // Active state (rotating) - yellow
                  state === 'active' && 'text-amber-400 scale-110',
                  // Locked state - green
                  state === 'locked' && 'text-emerald-400 scale-125'
                )}
                title={
                  state === 'locked'
                    ? `Unlock ${config.type}`
                    : state === 'active'
                      ? `Lock on ${config.type}`
                      : `Switch to ${config.type}`
                }
              >
                <Icon
                  className={cn(
                    'transition-all duration-300',
                    state === 'normal' && 'w-5 h-5',
                    state === 'active' && 'w-6 h-6',
                    state === 'locked' && 'w-6 h-6'
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtle gradient overlay for icon visibility */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/40 to-transparent pointer-events-none z-10" />
    </div>
  );
}

// Export a simpler single-view card for hub customization
interface SingleViewCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function SingleViewCard({ children, title, icon, onClick, className }: SingleViewCardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border overflow-hidden',
        onClick && 'cursor-pointer hover:bg-muted transition-colors',
        className
      )}
      onClick={onClick}
    >
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          {icon}
          <h3 className="font-medium text-foreground">{title}</h3>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

// Multi-view card wrapper type for hub customization
export type CardViewMode = 'slideshow' | 'single';

export interface HubCardConfig {
  id: string;
  type: 'calendar' | 'weather' | 'project-tasks' | 'my-day' | 'inbox' | 'team-chat' | 'notes';
  viewMode: CardViewMode;
  position: { row: number; col: number };
  size: { width: number; height: number };
}
