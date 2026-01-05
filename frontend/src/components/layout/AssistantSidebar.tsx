import { ChatSidebar } from './ChatSidebar';

/**
 * AssistantSidebar - Context-specific sidebar for the Assistant/Chat page
 * Wraps ChatSidebar which provides:
 * - New Chat button
 * - Chat mode: Projects list
 * - Agent mode: Agents, MCP servers, Skills
 * - Conversation history
 */
export function AssistantSidebar() {
  // ChatSidebar handles all state internally via hooks
  // (useConversations, useChatContext, useAgents, etc.)
  return <ChatSidebar />;
}
