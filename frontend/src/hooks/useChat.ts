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
  model?: string;      // Model ID (e.g., 'claude-sonnet-4-5-20250514')
  modelName?: string;  // Display name (e.g., 'Sonnet 4.5')
}

// Model switch indicator message
export interface ModelSwitchMessage {
  id: string;
  type: 'model_switch';
  fromModel: string;
  fromModelName: string;
  toModel: string;
  toModelName: string;
  timestamp: Date;
}

interface StreamEvent {
  type: 'init' | 'stream_start' | 'text_delta' | 'tool_use' | 'tool_result' | 'stream_end' | 'error' | 'model_switch';
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
  message_id?: number;
  message?: string;
  model?: string;
  model_name?: string;
  from_model?: string;
  from_model_name?: string;
  to_model?: string;
  to_model_name?: string;
}

interface UseChatOptions {
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onModelSwitch?: (fromModel: string, toModel: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('claude-sonnet-4-20250514');

  const wsRef = useRef<WebSocket | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const modelRef = useRef<string>(currentModel);

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
        if (event.conversation_id) {
          setConversationId(event.conversation_id);
        }
        break;

      case 'model_switch':
        // Model was switched mid-conversation - add visual indicator
        if (event.from_model && event.to_model) {
          options.onModelSwitch?.(event.from_model, event.to_model);
          // Add a divider message to show model switch
          const switchMessage: ChatMessage = {
            id: `switch-${Date.now()}`,
            role: 'assistant',
            content: `─── Switched to ${event.to_model_name} ───`,
            timestamp: new Date(),
            model: event.to_model,
            modelName: event.to_model_name,
          };
          setMessages((prev) => [...prev, switchMessage]);
        }
        break;

      case 'stream_start':
        // Start a new assistant message with model info
        setIsStreaming(true);
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: '',
          tools: [],
          isStreaming: true,
          timestamp: new Date(),
          model: event.model,
          modelName: event.model_name,
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

  // Send a message with model
  const sendMessage = useCallback(
    (content: string, model?: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError('Not connected');
        return;
      }

      const messageModel = model || modelRef.current;

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to server with model
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          content,
          model: messageModel,
        })
      );
    },
    []
  );

  // Update model (for mid-conversation switching)
  const updateModel = useCallback((model: string) => {
    setCurrentModel(model);
    modelRef.current = model;
  }, []);

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
    conversationId,
    error,
    currentModel,
    sendMessage,
    updateModel,
    cancelStream,
    clearMessages,
    connect,
    disconnect,
    newConversation,
  };
}
