import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function DashboardOverlay({
  isOpen,
  onClose,
  title,
  children,
}: DashboardOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay to trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'transition-all duration-200 ease-out',
        isAnimating
          ? 'bg-black/60 backdrop-blur-sm'
          : 'bg-black/0 backdrop-blur-0'
      )}
    >
      <div
        className={cn(
          'relative w-full h-[90%] max-w-[95%] bg-slate-800 rounded-2xl shadow-2xl',
          'border border-slate-700 overflow-hidden',
          'transition-all duration-200 ease-out',
          isAnimating
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-65px)] overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
