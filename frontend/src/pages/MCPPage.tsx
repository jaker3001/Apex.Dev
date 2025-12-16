import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Server,
  MoreHorizontal,
  Power,
  PowerOff,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Terminal,
  Globe,
  Radio,
  AlertCircle,
} from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastError?: string;
}

interface BackendMCPServer {
  id: number;
  name: string;
  server_type: string;
  config: {
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
  };
  status: string;  // 'active', 'inactive', 'error'
}

const SERVER_TYPE_INFO = [
  {
    type: 'stdio',
    name: 'stdio',
    icon: Terminal,
    description: 'Local processes like npx commands',
    color: 'text-green-500',
  },
  {
    type: 'sse',
    name: 'SSE',
    icon: Radio,
    description: 'Server-Sent Events streaming',
    color: 'text-blue-500',
  },
  {
    type: 'http',
    name: 'HTTP',
    icon: Globe,
    description: 'Standard HTTP endpoints',
    color: 'text-orange-500',
  },
];

const API_BASE = 'http://localhost:8000/api';

// Transform backend response to frontend format
function transformServer(backend: BackendMCPServer): MCPServer {
  const type = backend.server_type as 'stdio' | 'sse' | 'http';
  return {
    id: backend.id.toString(),
    name: backend.name,
    type,
    command: backend.config.command,
    args: backend.config.args,
    url: backend.config.url,
    enabled: backend.status === 'active',
    status: backend.status === 'active' ? 'connected' :
            backend.status === 'error' ? 'error' : 'disconnected',
  };
}

export function MCPPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [newServer, setNewServer] = useState({
    name: '',
    type: 'stdio' as 'stdio' | 'sse' | 'http',
    command: '',
    args: '',
    url: '',
  });

  // Fetch servers from backend
  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/mcp`);
      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers');
      }
      const data = await response.json();
      const transformed = (data.servers || []).map(transformServer);
      setServers(transformed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleToggleServer = async (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;

    const newEnabled = !server.enabled;
    const endpoint = newEnabled ? 'enable' : 'disable';

    // Optimistic update
    setServers((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, enabled: newEnabled, status: newEnabled ? 'connecting' as const : 'disconnected' as const }
          : s
      )
    );

    try {
      const response = await fetch(`${API_BASE}/mcp/${server.name}/${endpoint}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} server`);
      }

      // Update status after successful toggle
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: newEnabled ? 'connected' as const : 'disconnected' as const } : s
        )
      );
    } catch (err) {
      // Revert on error
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, enabled: !newEnabled, status: 'error' as const, lastError: String(err) } : s
        )
      );
    }
  };

  const handleDeleteServer = async (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;

    try {
      const response = await fetch(`${API_BASE}/mcp/${server.name}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete server');
      }

      setServers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete server');
    }
    setMenuOpen(null);
  };

  const handleTestConnection = async (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;

    setServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'connecting' as const } : s))
    );

    try {
      const response = await fetch(`${API_BASE}/mcp/${server.name}/test`);
      const data = await response.json();

      setServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: data.status === 'active' ? 'connected' as const : 'disconnected' as const }
            : s
        )
      );
    } catch (err) {
      setServers((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: 'error' as const, lastError: String(err) } : s
        )
      );
    }
  };

  const handleAddServer = async () => {
    try {
      const response = await fetch(`${API_BASE}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServer.name,
          server_type: newServer.type,
          command: newServer.type === 'stdio' ? newServer.command : undefined,
          args: newServer.type === 'stdio' ? newServer.args.split(' ').filter(Boolean) : undefined,
          url: newServer.type !== 'stdio' ? newServer.url : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add server');
      }

      // Refresh the list
      await fetchServers();
      setShowAddDialog(false);
      setNewServer({ name: '', type: 'stdio', command: '', args: '', url: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server');
    }
  };

  const getStatusBadge = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </span>
        );
      case 'disconnected':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
            <XCircle className="h-3 w-3" />
            Disconnected
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
            <XCircle className="h-3 w-3" />
            Error
          </span>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">MCP Servers</h1>
            <p className="text-muted-foreground">
              Connect external tools and services
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>

        {/* Server Types Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {SERVER_TYPE_INFO.map((info) => (
            <div key={info.type} className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <info.icon className={`h-4 w-4 ${info.color}`} />
                <h3 className="font-semibold">{info.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{info.description}</p>
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 flex-1">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Loading MCP servers...</h3>
          </div>
        ) : servers.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No MCP servers configured</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              MCP (Model Context Protocol) servers extend the assistant's capabilities
              with external tools like browser automation, file systems, or custom APIs.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Add your first server
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {servers.map((server) => {
              const typeInfo = SERVER_TYPE_INFO.find((t) => t.type === server.type);
              const TypeIcon = typeInfo?.icon || Server;

              return (
                <div
                  key={server.id}
                  className="border rounded-lg p-4 hover:border-orange-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center`}>
                        <TypeIcon className={`h-5 w-5 ${typeInfo?.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{server.name}</h3>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded uppercase">
                            {server.type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {server.type === 'stdio'
                            ? `${server.command} ${server.args?.join(' ')}`
                            : server.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getStatusBadge(server.status)}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(server.id)}
                        disabled={server.status === 'connecting'}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${server.status === 'connecting' ? 'animate-spin' : ''}`} />
                        Test
                      </Button>

                      <Button
                        variant={server.enabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleServer(server.id)}
                        className={server.enabled ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {server.enabled ? (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            Disabled
                          </>
                        )}
                      </Button>

                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMenuOpen(menuOpen === server.id ? null : server.id)}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        {menuOpen === server.id && (
                          <div className="absolute right-0 top-10 bg-background border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                              onClick={() => handleDeleteServer(server.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {server.lastError && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {server.lastError}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Server Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Add MCP Server</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  placeholder="e.g., Playwright, Notion API"
                  className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVER_TYPE_INFO.map((info) => (
                    <button
                      key={info.type}
                      onClick={() => setNewServer({ ...newServer, type: info.type as typeof newServer.type })}
                      className={`p-3 border rounded-lg text-center transition-all ${
                        newServer.type === info.type
                          ? 'border-orange-500 bg-orange-500/5'
                          : 'hover:border-orange-500/50'
                      }`}
                    >
                      <info.icon className={`h-5 w-5 mx-auto mb-1 ${info.color}`} />
                      <span className="text-sm font-medium">{info.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {newServer.type === 'stdio' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Command</label>
                    <input
                      type="text"
                      value={newServer.command}
                      onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                      placeholder="e.g., npx"
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Arguments</label>
                    <input
                      type="text"
                      value={newServer.args}
                      onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
                      placeholder="e.g., @playwright/mcp@latest"
                      className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">URL</label>
                  <input
                    type="text"
                    value={newServer.url}
                    onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                    placeholder="https://api.example.com"
                    className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-muted/30">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddServer}
                disabled={!newServer.name || (newServer.type === 'stdio' ? !newServer.command : !newServer.url)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Add Server
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
