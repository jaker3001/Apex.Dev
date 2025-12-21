/**
 * Database Type Definitions
 *
 * These types should be generated from the Supabase database schema.
 * For now, we provide manual types based on the existing database schema.
 *
 * To generate types automatically:
 * npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // User Tasks (GTD System)
      user_tasks: {
        Row: {
          id: number;
          user_id: number;
          list_id: number | null;
          parent_id: number | null;
          title: string;
          description: string | null;
          status: 'open' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'none' | 'low' | 'medium' | 'high';
          due_date: string | null;
          due_time: string | null;
          reminder_at: string | null;
          is_important: boolean;
          is_my_day: boolean;
          my_day_date: string | null;
          project_id: number | null;
          recurrence_rule: string | null;
          completed_at: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: number;
          list_id?: number | null;
          parent_id?: number | null;
          title: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'none' | 'low' | 'medium' | 'high';
          due_date?: string | null;
          due_time?: string | null;
          reminder_at?: string | null;
          is_important?: boolean;
          is_my_day?: boolean;
          my_day_date?: string | null;
          project_id?: number | null;
          recurrence_rule?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: number;
          list_id?: number | null;
          parent_id?: number | null;
          title?: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'none' | 'low' | 'medium' | 'high';
          due_date?: string | null;
          due_time?: string | null;
          reminder_at?: string | null;
          is_important?: boolean;
          is_my_day?: boolean;
          my_day_date?: string | null;
          project_id?: number | null;
          recurrence_rule?: string | null;
          completed_at?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Task Lists
      task_lists: {
        Row: {
          id: number;
          user_id: number;
          name: string;
          icon: string | null;
          color: string | null;
          is_system: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: number;
          name: string;
          icon?: string | null;
          color?: string | null;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: number;
          name?: string;
          icon?: string | null;
          color?: string | null;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Chat Projects (PARA Projects)
      chat_projects: {
        Row: {
          id: number;
          user_id: number;
          name: string;
          description: string | null;
          category: 'project' | 'area' | 'resource' | 'archive';
          status: 'active' | 'on_hold' | 'completed' | 'archived';
          parent_id: number | null;
          color: string | null;
          icon: string | null;
          is_favorite: boolean;
          metadata: Json | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: number;
          user_id: number;
          name: string;
          description?: string | null;
          category?: 'project' | 'area' | 'resource' | 'archive';
          status?: 'active' | 'on_hold' | 'completed' | 'archived';
          parent_id?: number | null;
          color?: string | null;
          icon?: string | null;
          is_favorite?: boolean;
          metadata?: Json | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: number;
          name?: string;
          description?: string | null;
          category?: 'project' | 'area' | 'resource' | 'archive';
          status?: 'active' | 'on_hold' | 'completed' | 'archived';
          parent_id?: number | null;
          color?: string | null;
          icon?: string | null;
          is_favorite?: boolean;
          metadata?: Json | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      // PKM Notes
      pkm_notes: {
        Row: {
          id: number;
          user_id: number;
          title: string;
          content: string;
          note_type: 'note' | 'journal' | 'reference' | 'meeting';
          project_id: number | null;
          tags: string[];
          backlinks: number[];
          is_favorite: boolean;
          is_archived: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: number;
          title: string;
          content?: string;
          note_type?: 'note' | 'journal' | 'reference' | 'meeting';
          project_id?: number | null;
          tags?: string[];
          backlinks?: number[];
          is_favorite?: boolean;
          is_archived?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: number;
          title?: string;
          content?: string;
          note_type?: 'note' | 'journal' | 'reference' | 'meeting';
          project_id?: number | null;
          tags?: string[];
          backlinks?: number[];
          is_favorite?: boolean;
          is_archived?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Conversations
      conversations: {
        Row: {
          id: number;
          user_id: number;
          session_id: string;
          title: string | null;
          is_active: boolean;
          last_model_id: string | null;
          message_count: number;
          chat_project_id: number | null;
          timestamp: string;
          summary: string | null;
          related_task_ids: string | null;
        };
        Insert: {
          id?: number;
          user_id: number;
          session_id: string;
          title?: string | null;
          is_active?: boolean;
          last_model_id?: string | null;
          message_count?: number;
          chat_project_id?: number | null;
          timestamp?: string;
          summary?: string | null;
          related_task_ids?: string | null;
        };
        Update: {
          id?: number;
          user_id?: number;
          session_id?: string;
          title?: string | null;
          is_active?: boolean;
          last_model_id?: string | null;
          message_count?: number;
          chat_project_id?: number | null;
          timestamp?: string;
          summary?: string | null;
          related_task_ids?: string | null;
        };
      };
      // Messages
      messages: {
        Row: {
          id: number;
          conversation_id: number;
          role: 'user' | 'assistant';
          content: string;
          model_id: string | null;
          model_name: string | null;
          tools_used: string | null;
          timestamp: string;
        };
        Insert: {
          id?: number;
          conversation_id: number;
          role: 'user' | 'assistant';
          content: string;
          model_id?: string | null;
          model_name?: string | null;
          tools_used?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: number;
          conversation_id?: number;
          role?: 'user' | 'assistant';
          content?: string;
          model_id?: string | null;
          model_name?: string | null;
          tools_used?: string | null;
          timestamp?: string;
        };
      };
      // Users
      users: {
        Row: {
          id: number;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          is_active: boolean;
          created_at: string;
          last_login: string | null;
        };
        Insert: {
          id?: number;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          last_login?: string | null;
        };
        Update: {
          id?: number;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          is_active?: boolean;
          created_at?: string;
          last_login?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      task_status: 'open' | 'in_progress' | 'completed' | 'cancelled';
      task_priority: 'none' | 'low' | 'medium' | 'high';
      project_category: 'project' | 'area' | 'resource' | 'archive';
      project_status: 'active' | 'on_hold' | 'completed' | 'archived';
      note_type: 'note' | 'journal' | 'reference' | 'meeting';
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Specific table types for convenience
export type UserTask = Tables<'user_tasks'>;
export type TaskList = Tables<'task_lists'>;
export type ChatProject = Tables<'chat_projects'>;
export type PKMNote = Tables<'pkm_notes'>;
export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;
export type User = Tables<'users'>;
