import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type ChatMode = 'agent' | 'chat';

interface ChatContextValue {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  selectedAgentId: number | null;
  setSelectedAgentId: (id: number | null) => void;
  selectedChatProjectId: number | null;
  setSelectedChatProjectId: (id: number | null) => void;
  // Title update notification
  notifyTitleUpdate: (conversationId: number, title: string) => void;
  onTitleUpdate: (callback: (conversationId: number, title: string) => void) => () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  // Mode persisted to localStorage
  const [mode, setMode] = useLocalStorage<ChatMode>('chatSidebar.mode', 'agent');

  // Selected agent for Agent Mode
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  // Selected chat project for Chat Mode (persisted)
  const [selectedChatProjectId, setSelectedChatProjectId] = useLocalStorage<number | null>(
    'chatContext.selectedProjectId',
    null
  );

  // Title update listeners
  const [titleUpdateListeners] = useState<Set<(conversationId: number, title: string) => void>>(
    () => new Set()
  );

  const notifyTitleUpdate = useCallback(
    (conversationId: number, title: string) => {
      titleUpdateListeners.forEach((listener) => listener(conversationId, title));
    },
    [titleUpdateListeners]
  );

  const onTitleUpdate = useCallback(
    (callback: (conversationId: number, title: string) => void) => {
      titleUpdateListeners.add(callback);
      return () => {
        titleUpdateListeners.delete(callback);
      };
    },
    [titleUpdateListeners]
  );

  return (
    <ChatContext.Provider
      value={{
        mode,
        setMode,
        selectedAgentId,
        setSelectedAgentId,
        selectedChatProjectId,
        setSelectedChatProjectId,
        notifyTitleUpdate,
        onTitleUpdate,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
