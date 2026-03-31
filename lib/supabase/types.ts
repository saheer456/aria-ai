export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; created_at: string };
        Insert: { id: string; email?: string | null; created_at?: string };
        Update: { id?: string; email?: string | null };
      };
      chats: {
        Row: { id: string; user_id: string | null; title: string | null; created_at: string };
        Insert: { id?: string; user_id?: string | null; title?: string | null; created_at?: string };
        Update: { title?: string | null };
      };
      messages: {
        Row: { id: string; chat_id: string; role: string; content: string; model_used: string | null; created_at: string };
        Insert: { id?: string; chat_id: string; role: string; content: string; model_used?: string | null; created_at?: string };
        Update: { content?: string };
      };
      usage: {
        Row: { id: string; user_id: string; model: string; count: number; reset_at: string | null };
        Insert: { id?: string; user_id: string; model: string; count?: number; reset_at?: string | null };
        Update: { count?: number; reset_at?: string | null };
      };
    };
  };
}
