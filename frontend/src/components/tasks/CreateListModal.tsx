import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, List, Home, Briefcase, Heart, Star, Zap, Target, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateListModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; icon?: string; color?: string }) => void;
  initialData?: { name: string; icon?: string; color?: string };
  isEditing?: boolean;
}

const icons = [
  { id: 'list', Icon: List },
  { id: 'home', Icon: Home },
  { id: 'briefcase', Icon: Briefcase },
  { id: 'heart', Icon: Heart },
  { id: 'star', Icon: Star },
  { id: 'zap', Icon: Zap },
  { id: 'target', Icon: Target },
  { id: 'book', Icon: BookOpen },
];

const colors = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6b7280', // gray
];

export function CreateListModal({
  open,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}: CreateListModalProps) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('list');
  const [selectedColor, setSelectedColor] = useState(colors[0]);

  // Initialize with data when editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setSelectedIcon(initialData.icon || 'list');
      setSelectedColor(initialData.color || colors[0]);
    } else {
      setName('');
      setSelectedIcon('list');
      setSelectedColor(colors[0]);
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });
  };

  const SelectedIconComponent = icons.find((i) => i.id === selectedIcon)?.Icon || List;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-md"
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">
                  {isEditing ? 'Edit list' : 'New list'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Preview */}
                <div className="flex items-center justify-center py-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedColor}20` }}
                  >
                    <SelectedIconComponent
                      className="w-8 h-8"
                      style={{ color: selectedColor }}
                    />
                  </div>
                </div>

                {/* Name input */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter list name"
                    autoFocus
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Icon picker */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {icons.map(({ id, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedIcon(id)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          selectedIcon === id
                            ? 'bg-primary/10 ring-2 ring-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{
                            color: selectedIcon === id ? selectedColor : undefined,
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          'w-8 h-8 rounded-full transition-transform',
                          selectedColor === color && 'ring-2 ring-offset-2 ring-offset-card scale-110'
                        )}
                        style={{
                          backgroundColor: color,
                          // @ts-expect-error - CSS custom property for ring color
                          '--tw-ring-color': color,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEditing ? 'Save changes' : 'Create list'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
