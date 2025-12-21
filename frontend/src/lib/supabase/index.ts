/**
 * Supabase Module Exports
 *
 * Centralized exports for all Supabase-related utilities
 */

// Client
export { supabase, getSession, getUser, signOut, from } from './client';

// Types
export type {
  Database,
  Tables,
  Inserts,
  Updates,
  UserTask,
  TaskList,
  ChatProject,
  PKMNote,
  Conversation,
  Message,
  User,
} from './types';

// Storage
export {
  uploadFile,
  uploadFiles,
  downloadFile,
  deleteFile,
  deleteFiles,
  getPublicUrl,
  getSignedUrl,
  listFiles,
  createBucket,
  moveFile,
  copyFile,
  validateFile,
  generateFilePath,
  getFileExtension,
  formatFileSize,
} from './storage';

export type { UploadProgress, UploadOptions, UploadResult } from './storage';

// Subscriptions
export {
  subscriptionManager,
  useTableSubscription,
  broadcastToTabs,
  listenToTabs,
} from './subscriptions';
