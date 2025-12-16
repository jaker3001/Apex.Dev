import { useState, useCallback, useRef, useEffect } from 'react';

// Types for chat messages and events
export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'running' | 'completed' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolUse[];
  isStreaming?: boolean;
  timestamp: Date;
}

interface StreamEvent {
  type: 'init' | 'stream_start' | 'text_delta' | 'tool_use' | 'tool_result' | 'stream_end' | 'error';
  session_id?: string;
  conversation_id?: number;
  content?: string;
  tool?: {
    id: string;
    name: string;
    input?: Record<string, unknown>;
    output?: unknown;
    status: string;
  };
  task_id?: number;
  message?: string;
}

interface UseChatOptions {
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Generate a session ID
  const generateSessionId = useCallback(() => {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const newSessionId = sessionId || generateSessionId();
    setSessionId(newSessionId);

    const wsUrl = `ws://localhost:8000/api/ws/chat/${newSessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      options.onConnect?.();
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnect?.();

      // Attempt to reconnect after a delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = window.setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = () => {
      setError('Connection error');
      options.onError?.('Connection error');
    };

    ws.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);
        handleStreamEvent(data);
      } catch {
        console.error('Failed to parse WebSocket message:', event.data);
      }
    };

    wsRef.current = ws;
  }, [sessionId, generateSessionId, options]);

  // Handle incoming stream events
  const handleStreamEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case 'init':
        // Session initialized
        break;

      case 'stream_start':
        // Start a new assistant message
        setIsStreaming(true);
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: '',
          tools: [],
          isStreaming: true,
          timestamp: new Date(),
        };
        currentMessageRef.current = newMessage;
        setMessages((prev) => [...prev, newMessage]);
        break;

      case 'text_delta':
        // Append text to current message
        if (currentMessageRef.current && event.content) {
          currentMessageRef.current.content += event.content;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentMessageRef.current?.id
                ? { ...msg, content: currentMessageRef.current.content }
                : msg
            )
          );
        }
        break;

      case 'tool_use':
        // Add tool use to current message
        if (currentMessageRef.current && event.tool) {
          const toolUse: ToolUse = {
            id: event.tool.id,
            name: event.tool.name,
            input: event.tool.input || {},
            status: 'running',
          };
          currentMessageRef.current.tools = [
            ...(currentMessageRef.current.tools || []),
            toolUse,
          ];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentMessageRef.current?.id
                ? { ...msg, tools: [...(currentMessageRef.current.tools || [])] }
                : msg
            )
          );
        }
        break;

      case 'tool_result':
        // Update tool result
        if (currentMessageRef.current && event.tool) {
          currentMessageRef.current.tools = (currentMessageRef.current.tools || []).map(
            (tool) =>
              tool.id === event.tool?.id
                ? { ...tool, output: event.tool?.output, status: 'completed' as const }
                : tool
          );
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentMessageRef.current?.id
                ? { ...msg, tools: [...(currentMessageRef.current.tools || [])] }
                : msg
            )
          );
        }
        break;

      case 'stream_end':
        // Finalize the current message
        if (currentMessageRef.current) {
          currentMessageRef.current.isStreaming = false;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentMessageRef.current?.id
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          currentMessageRef.current = null;
        }
        setIsStreaming(false);
        break;

      case 'error':
        setError(event.message || 'Unknown error');
        setIsStreaming(false);
        options.onError?.(event.message || 'Unknown error');
        break;
    }
  }, [options]);

  // Send a message
  const sendMessage = useCallback(
    (content: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError('Not connected');
        return;
      }

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to server
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          content,
        })
      );
    },
    []
  );

  // Cancel current streaming response
  const cancelStream = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cancel' }));
    }
    setIsStreaming(false);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    currentMessageRef.current = null;
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
    setSessionId(null);
  }, []);

  // Start new conversation
  const newConversation = useCallback(() => {
    disconnect();
    clearMessages();
    setSessionId(null);
    // Will reconnect with new session ID on next connect
  }, [disconnect, clearMessages]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    messages,
    isConnected,
    isStreaming,
    sessionId,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
    connect,
    disconnect,
    newConversation,
  };
}
