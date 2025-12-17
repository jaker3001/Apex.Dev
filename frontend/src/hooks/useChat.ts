import { useState, useCallback, useRef, useEffect } from 'react';

// Types for chat messages and events
export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'running' | 'completed' | 'error';
}

// File attachment type (matches FilePreview component)
export interface AttachedFile {
  id: string;
  name: string;
  type: 'text' | 'image' | 'pdf';
  mimeType: string;
  size: number;
  textPreview?: string;
  metadata?: {
    width?: number;
    height?: number;
  };
  localUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolUse[];
  files?: AttachedFile[];  // Attached files for this message
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

interface HistoryMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  modelName?: string;
  toolsUsed?: unknown[];
  timestamp: string;
}

interface StreamEvent {
  type: 'init' | 'stream_start' | 'text_delta' | 'tool_use' | 'tool_result' | 'stream_end' | 'error' | 'model_switch' | 'cancelled' | 'title_update';
  session_id?: string;
  conversation_id?: number;
  resumed?: boolean;
  history?: HistoryMessage[];
  chatProjectId?: number;
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
  title?: string;
}

interface UseChatOptions {
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onModelSwitch?: (fromModel: string, toModel: string) => void;
  onResume?: (conversationId: number, history: ChatMessage[]) => void;
  onTitleUpdate?: (conversationId: number, title: string) => void;
  chatProjectId?: number | null;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chatProjectId, setChatProjectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string>('claude-sonnet-4-5');

  const wsRef = useRef<WebSocket | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const modelRef = useRef<string>(currentModel);
  const resumeConversationIdRef = useRef<number | null>(null);
  const chatProjectIdRef = useRef<number | null>(options.chatProjectId ?? null);

  // Exponential backoff constants
  const INITIAL_RECONNECT_DELAY = 1000; // 1 second
  const MAX_RECONNECT_DELAY = 30000; // 30 seconds
  const MAX_RECONNECT_ATTEMPTS = 10;

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

    // Build WebSocket URL with optional conversation_id and chat_project_id
    let wsUrl = `ws://localhost:8000/api/ws/chat/${newSessionId}`;
    const params = new URLSearchParams();
    if (resumeConversationIdRef.current) {
      params.append('conversation_id', String(resumeConversationIdRef.current));
    }
    if (chatProjectIdRef.current) {
      params.append('chat_project_id', String(chatProjectIdRef.current));
    }
    if (params.toString()) {
      wsUrl += `?${params.toString()}`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptRef.current = 0; // Reset on successful connection
      options.onConnect?.();
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnect?.();

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
          MAX_RECONNECT_DELAY
        );
        reconnectAttemptRef.current += 1;

        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connect();
          }
        }, delay);
      } else {
        setError('Connection lost. Please refresh the page.');
      }
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
        if (event.chatProjectId !== undefined) {
          setChatProjectId(event.chatProjectId);
        }

        // If resuming, load history into messages
        if (event.resumed && event.history && event.history.length > 0) {
          const historyMessages: ChatMessage[] = event.history.map((msg) => ({
            id: `history-${msg.id}`,
            role: msg.role,
            content: msg.content || '',
            model: msg.model,
            modelName: msg.modelName,
            tools: msg.toolsUsed as ToolUse[] | undefined,
            isStreaming: false,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(historyMessages);
          options.onResume?.(event.conversation_id!, historyMessages);
        }

        // Clear resume ref after use
        resumeConversationIdRef.current = null;
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

      case 'cancelled':
        // Stream was cancelled by user
        if (currentMessageRef.current) {
          currentMessageRef.current.isStreaming = false;
          currentMessageRef.current.content += ' [Cancelled]';
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === currentMessageRef.current?.id
                ? { ...msg, content: currentMessageRef.current.content, isStreaming: false }
                : msg
            )
          );
          currentMessageRef.current = null;
        }
        setIsStreaming(false);
        break;

      case 'title_update':
        // Conversation title was generated
        if (event.conversation_id && event.title) {
          options.onTitleUpdate?.(event.conversation_id, event.title);
        }
        break;
    }
  }, [options]);

  // Send a message with model and optional files
  const sendMessage = useCallback(
    (content: string, files?: AttachedFile[]) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setError('Not connected');
        return;
      }

      const messageModel = modelRef.current;

      // Build message content including file context
      let fullContent = content;
      if (files && files.length > 0) {
        const fileDescriptions = files.map((file) => {
          let desc = `[Attached file: ${file.name} (${file.type})]`;
          if (file.textPreview) {
            desc += `\nContent preview:\n${file.textPreview}`;
          }
          return desc;
        }).join('\n\n');
        fullContent = fileDescriptions + (content ? '\n\n' + content : '');
      }

      // Add user message immediately (with files for display)
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        files,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to server with model and file info
      const messagePayload: Record<string, unknown> = {
        type: 'message',
        content: fullContent,
        model: messageModel,
      };

      // Include file metadata for server-side processing
      if (files && files.length > 0) {
        messagePayload.files = files.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          mimeType: f.mimeType,
          size: f.size,
        }));
      }

      wsRef.current.send(JSON.stringify(messagePayload));
    },
    []
  );

  // Update model (for mid-conversation switching)
  const updateModel = useCallback((model: string) => {
    setCurrentModel(model);
    modelRef.current = model;
  }, []);

  // Update chat project ID (for Chat Mode projects)
  const updateChatProjectId = useCallback((projectId: number | null) => {
    setChatProjectId(projectId);
    chatProjectIdRef.current = projectId;
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
    resumeConversationIdRef.current = null;
    // Will reconnect with new session ID on next connect
  }, [disconnect, clearMessages]);

  // Resume an existing conversation
  const resumeConversation = useCallback((conversationIdToResume: number) => {
    // Disconnect current session if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear current messages
    setMessages([]);
    currentMessageRef.current = null;

    // Set resume flag and new session
    resumeConversationIdRef.current = conversationIdToResume;
    setSessionId(null); // Force new session ID

    // Connect with resume parameter
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);

    let wsUrl = `ws://localhost:8000/api/ws/chat/${newSessionId}`;
    wsUrl += `?conversation_id=${conversationIdToResume}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptRef.current = 0; // Reset on successful connection
      options.onConnect?.();
    };

    ws.onclose = () => {
      setIsConnected(false);
      options.onDisconnect?.();

      // Attempt to reconnect with exponential backoff
      if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        const delay = Math.min(
          INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
          MAX_RECONNECT_DELAY
        );
        reconnectAttemptRef.current += 1;

        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connect();
          }
        }, delay);
      } else {
        setError('Connection lost. Please refresh the page.');
      }
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
  }, [generateSessionId, connect, handleStreamEvent, options]);

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
    chatProjectId,
    error,
    currentModel,
    sendMessage,
    updateModel,
    updateChatProjectId,
    cancelStream,
    clearMessages,
    connect,
    disconnect,
    newConversation,
    resumeConversation,
  };
}
