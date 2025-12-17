import { createContext, useContext, useState, type ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type ChatMode = 'task' | 'chat';

interface ChatContextValue {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
  selectedAgentId: number | null;
  setSelectedAgentId: (id: number | null) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  // Mode persisted to localStorage
  const [mode, setMode] = useLocalStorage<ChatMode>('chatSidebar.mode', 'task');

  // Selected agent for Task Mode
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  return (
    <ChatContext.Provider
      value={{
        mode,
        setMode,
        selectedAgentId,
        setSelectedAgentId,
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
