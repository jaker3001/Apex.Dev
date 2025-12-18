import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderPlus,
  FilePlus,
  Search,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Trash2,
  Save,
  Eye,
  Edit3,
  Link2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFileTree,
  useNote,
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useCreateFolder,
  useBacklinks,
  type FileSystemItem,
} from '@/hooks/usePKM';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, ViewUpdate } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

export function NotesView() {
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newItemPath, setNewItemPath] = useState('');

  const { data: treeData, isLoading: treeLoading } = useFileTree();
  const { data: noteData, isLoading: noteLoading } = useNote(selectedNote);
  const { data: notesData } = useNotes({ limit: 50 });
  const { data: backlinksData } = useBacklinks(selectedNote);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const createFolder = useCreateFolder();

  // Editor ref and content
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current || !isEditing || noteLoading) return;

    // Use noteData content if available, otherwise editorContent
    const initialContent = noteData?.content ?? editorContent;

    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        markdown(),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            setEditorContent(newContent);
            setHasUnsavedChanges(true);
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'ui-monospace, monospace' },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [isEditing, selectedNote, noteLoading]);

  // Update editor content when note loads
  useEffect(() => {
    if (noteData?.content) {
      setEditorContent(noteData.content);
      setHasUnsavedChanges(false);

      // Update CodeMirror if it exists
      if (editorViewRef.current) {
        const currentDoc = editorViewRef.current.state.doc.toString();
        if (currentDoc !== noteData.content) {
          editorViewRef.current.dispatch({
            changes: {
              from: 0,
              to: currentDoc.length,
              insert: noteData.content,
            },
          });
        }
      }
    }
  }, [noteData?.content]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges || !selectedNote) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [editorContent, hasUnsavedChanges, selectedNote]);

  const handleSave = useCallback(async () => {
    if (!selectedNote || !hasUnsavedChanges) return;

    try {
      await updateNote.mutateAsync({ filePath: selectedNote, content: editorContent });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }, [selectedNote, editorContent, hasUnsavedChanges, updateNote]);

  const handleCreateNote = async () => {
    if (!newItemPath.trim()) return;

    try {
      const result = await createNote.mutateAsync({
        file_path: newItemPath,
        content: `# ${newItemPath.split('/').pop()?.replace('.md', '') || 'New Note'}\n\n`,
      });
      setSelectedNote(result.file_path);
      setShowNewNoteModal(false);
      setNewItemPath('');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newItemPath.trim()) return;

    try {
      await createFolder.mutateAsync(newItemPath);
      setExpandedFolders((prev) => new Set([...prev, newItemPath]));
      setShowNewFolderModal(false);
      setNewItemPath('');
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await deleteNote.mutateAsync(selectedNote);
      setSelectedNote(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Build folder tree structure
  const buildTree = (items: FileSystemItem[]) => {
    const tree: Record<string, FileSystemItem[]> = { '': [] };

    items.forEach((item) => {
      const parts = item.path.split('/');
      if (parts.length === 1) {
        tree[''].push(item);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        if (!tree[parentPath]) tree[parentPath] = [];
        tree[parentPath].push(item);
      }
    });

    return tree;
  };

  const renderTreeItem = (
    item: FileSystemItem,
    tree: Record<string, FileSystemItem[]>,
    depth: number = 0
  ) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.path);
    const isSelected = selectedNote === item.path;
    const children = tree[item.path] || [];

    return (
      <div key={item.path}>
        <button
          onClick={() => {
            if (isFolder) {
              toggleFolder(item.path);
            } else {
              setSelectedNote(item.path);
            }
          }}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left',
            isSelected
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
            </>
          ) : (
            <>
              <span className="w-4" />
              <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </>
          )}
          <span className="truncate">{item.name.replace('.md', '')}</span>
        </button>
        {isFolder && isExpanded && (
          <div>
            {children.map((child) => renderTreeItem(child, tree, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = treeData?.items ? buildTree(treeData.items) : {};
  const rootItems = tree[''] || [];

  // Filter items by search
  const filteredNotes = searchQuery
    ? notesData?.notes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content_preview?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="flex h-full">
      {/* Sidebar - File Tree */}
      <div className="w-64 border-r border-slate-700 bg-slate-800/50 flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-white">Notes</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="New Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowNewNoteModal(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                title="New Note"
              >
                <FilePlus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* File Tree or Search Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {searchQuery && filteredNotes ? (
            // Search results
            <div className="space-y-1">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note.file_path);
                    setSearchQuery('');
                  }}
                  className={cn(
                    'w-full flex flex-col px-2 py-2 text-sm rounded-md transition-colors text-left',
                    'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  )}
                >
                  <span className="font-medium truncate">{note.title}</span>
                  {note.content_preview && (
                    <span className="text-xs text-slate-500 truncate">
                      {note.content_preview}
                    </span>
                  )}
                </button>
              ))}
              {filteredNotes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No notes found</p>
              )}
            </div>
          ) : treeLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rootItems.length === 0 ? (
            <div className="text-center py-8">
              <File className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No notes yet</p>
              <button
                onClick={() => setShowNewNoteModal(true)}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Create your first note
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {rootItems.map((item) => renderTreeItem(item, tree, 0))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Editor/Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedNote ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-medium text-white truncate">
                  {noteData?.title || selectedNote}
                </h3>
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-400">(unsaved)</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    'p-1.5 rounded',
                    isEditing
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  )}
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className={cn(
                    'p-1.5 rounded',
                    !isEditing
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  )}
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  className={cn(
                    'p-1.5 rounded',
                    hasUnsavedChanges
                      ? 'text-amber-400 hover:bg-slate-700'
                      : 'text-slate-600'
                  )}
                  title="Save"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteNote}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {noteLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : isEditing ? (
                <div ref={editorRef} className="flex-1 overflow-auto" />
              ) : (
                <div className="flex-1 overflow-auto p-6">
                  <div className="max-w-3xl mx-auto prose prose-invert">
                    <MarkdownRenderer content={editorContent} />
                  </div>
                </div>
              )}

              {/* Backlinks Panel */}
              {backlinksData && backlinksData.backlinks.length > 0 && (
                <div className="w-64 border-l border-slate-700 bg-slate-800/30 p-3 overflow-y-auto">
                  <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1">
                    <Link2 className="w-4 h-4" />
                    Backlinks ({backlinksData.total})
                  </h4>
                  <div className="space-y-1">
                    {backlinksData.backlinks.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNote(note.file_path)}
                        className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 rounded"
                      >
                        {note.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <File className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-1">No note selected</h3>
              <p className="text-sm text-slate-500 mb-4">
                Select a note from the sidebar or create a new one
              </p>
              <button
                onClick={() => setShowNewNoteModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create New Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Note Modal */}
      {showNewNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">New Note</h3>
            <input
              type="text"
              placeholder="Note name (e.g., folder/my-note)"
              value={newItemPath}
              onChange={(e) => setNewItemPath(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNote();
                if (e.key === 'Escape') setShowNewNoteModal(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewNoteModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newItemPath.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newItemPath}
              onChange={(e) => setNewItemPath(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolderModal(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newItemPath.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
