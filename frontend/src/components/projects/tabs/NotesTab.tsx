import { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Note } from '@/hooks/useProjects';

interface NotesTabProps {
  notes: Note[];
  onAddNote?: (content: string, noteType?: string, subject?: string) => void;
  isAddingNote?: boolean;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const noteTypeColors: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700',
  call: 'bg-blue-100 text-blue-700',
  email: 'bg-purple-100 text-purple-700',
  site_visit: 'bg-green-100 text-green-700',
  documentation: 'bg-orange-100 text-orange-700',
};

function NoteCard({ note }: { note: Note }) {
  return (
    <div className="border-l-2 border-primary/30 pl-4 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <span>{formatDate(note.created_at)}</span>
        {note.author_name && <span>- {note.author_name}</span>}
        {note.note_type && (
          <span className={`px-1.5 py-0.5 rounded ${noteTypeColors[note.note_type] || 'bg-muted'}`}>
            {note.note_type.replace('_', ' ')}
          </span>
        )}
      </div>
      {note.subject && <p className="font-medium text-sm mb-1">{note.subject}</p>}
      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
    </div>
  );
}

function AddNoteForm({ onSubmit, onCancel, isSubmitting }: {
  onSubmit: (content: string, noteType?: string, subject?: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [noteType, setNoteType] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content, noteType || undefined, subject || undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-muted/30">
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Subject (optional)"
            className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <select
            className="px-3 py-2 text-sm border rounded-lg bg-background"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value)}
          >
            <option value="">Type...</option>
            <option value="general">General</option>
            <option value="call">Phone Call</option>
            <option value="email">Email</option>
            <option value="site_visit">Site Visit</option>
            <option value="documentation">Documentation</option>
          </select>
        </div>
        <textarea
          placeholder="Enter note content..."
          className="w-full px-3 py-2 text-sm border rounded-lg bg-background min-h-[80px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!content.trim() || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Add Note'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function NotesTab({ notes, onAddNote, isAddingNote }: NotesTabProps) {
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (content: string, noteType?: string, subject?: string) => {
    onAddNote?.(content, noteType, subject);
    setShowForm(false);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Notes</h3>
          <span className="text-sm text-muted-foreground">({notes.length})</span>
        </div>
        {!showForm && (
          <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <AddNoteForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isSubmitting={isAddingNote}
          />
        </div>
      )}

      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No notes yet</p>
          <p className="text-sm">Click "Add Note" to create one</p>
        </div>
      )}
    </div>
  );
}
